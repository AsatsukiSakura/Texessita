import { WebSocketServer, WebSocket } from 'ws'
import { GameController } from '../game/controller.js'
import { GameConfig, ActionType, PlayerStatus, GameState, ActionResult } from '../engine/types.js'
import type { ClientMessage, ServerMessage, GameStateMsg, HandOverMsg, ErrorMsg, WaitingMsg, PlayerJoinedMsg, PlayerLeftMsg, YourTurnMsg } from './protocol.js'

// ============================================================
// 德州扑克 WebSocket 服务器
// ============================================================

export interface ServerOptions {
  config: GameConfig
  port: number
  actionTimeoutMs?: number     // 行动超时（毫秒），默认 30s
  heartbeatIntervalMs?: number // 心跳间隔（毫秒），默认 15s
}

export function createServer(options: ServerOptions) {
  const {
    config,
    port,
    actionTimeoutMs = 30_000,
    heartbeatIntervalMs = 15_000,
  } = options

  const game = new GameController(config)

  const playerWs = new Map<string, WebSocket>()
  const wsPlayer = new Map<WebSocket, string>()
  let nextPlayerId = 0
  let autoStartTimer: ReturnType<typeof setTimeout> | null = null
  let actionTimer: ReturnType<typeof setTimeout> | null = null
  let actionTimerPlayerId: string | null = null

  // ============================================================
  // WebSocket 服务
  // ============================================================

  const wss = new WebSocketServer({ port })

  // 心跳检测
  const heartbeatInterval = setInterval(() => {
    for (const [, ws] of playerWs) {
      if ((ws as any)._alive === false) {
        ws.terminate()
        continue
      }
      ;(ws as any)._alive = false
      ws.ping()
    }
  }, heartbeatIntervalMs)

  wss.on('connection', (ws: WebSocket) => {
    ;(ws as any)._alive = true

    ws.on('pong', () => { (ws as any)._alive = true })

    ws.on('message', (raw) => {
      let msg: any
      try { msg = JSON.parse(raw.toString()) } catch {
        send(ws, { type: 'error', message: '消息格式错误' })
        return
      }
      route(ws, msg)
    })

    ws.on('close', () => onDisconnect(ws))
    ws.on('error', (err) => console.error('[错误] WebSocket:', err.message))
  })

  // ============================================================
  // 消息路由
  // ============================================================

  function route(ws: WebSocket, msg: ClientMessage) {
    switch (msg.type) {
      case 'join':       handleJoin(ws, msg.name);                       break
      case 'start_hand': handleStartHand(ws);                             break
      case 'action':     handleAction(ws, msg.action, msg.amount);        break
      case 'leave':      handleLeave(ws);                                 break
      default:
        send(ws, { type: 'error', message: '未知消息类型' })
    }
  }

  // ============================================================
  // 加入 / 离开
  // ============================================================

  function handleJoin(ws: WebSocket, name: string) {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      send(ws, { type: 'error', message: '请输入昵称' })
      return
    }

    const playerId = `p${++nextPlayerId}`
    const added = game.addPlayer(playerId, name.trim())
    if (!added) {
      send(ws, { type: 'error', message: '加入失败（房间已满或牌局进行中，请等待）' })
      return
    }

    playerWs.set(playerId, ws)
    wsPlayer.set(ws, playerId)

    console.log(`[加入] ${name.trim()} (${playerId})`)
    send(ws, { type: 'joined', playerId })
    broadcast({ type: 'player_joined', playerId, playerName: name.trim() })
    broadcastGameState()
  }

  function handleLeave(ws: WebSocket) {
    const playerId = wsPlayer.get(ws)
    if (!playerId) return
    removePlayer(playerId, ws, false)
  }

  function onDisconnect(ws: WebSocket) {
    const playerId = wsPlayer.get(ws)
    if (!playerId) return
    removePlayer(playerId, ws, true)
  }

  /** 统一的玩家移除逻辑 */
  function removePlayer(playerId: string, ws: WebSocket, isDisconnect: boolean) {
    const snapshot = game.getStateSnapshot()
    const player = snapshot.players.find(p => p.id === playerId)
    const playerName = player?.name ?? playerId

    if (isDisconnect) {
      console.log(`[断开] ${playerName} 离开`)
    }

    if (player && player.status === PlayerStatus.Active) {
      stopActionTimer()
      const result = game.applyAction(playerId, ActionType.Fold)
      playerWs.delete(playerId)
      wsPlayer.delete(ws)
      game.removePlayer(playerId)

      broadcast({ type: 'player_left', playerId, playerName })
      if (result.success && result.handOver) {
        finishHand(result)
      } else {
        broadcastGameState(result)
      }
      return
    }

    game.removePlayer(playerId)
    playerWs.delete(playerId)
    wsPlayer.delete(ws)
    broadcast({ type: 'player_left', playerId, playerName })
    broadcastGameState()
  }

  // ============================================================
  // 开始一局
  // ============================================================

  function handleStartHand(ws: WebSocket) {
    const result = game.startHand()
    if (!result.success) {
      send(ws, { type: 'error', message: result.error ?? '' })
      return
    }
    console.log('[游戏] 新一局开始')
    broadcastGameState(result)
    notifyCurrentPlayer()
  }

  // ============================================================
  // 行动处理
  // ============================================================

  function handleAction(ws: WebSocket, action: ActionType, amount?: number) {
    const playerId = wsPlayer.get(ws)
    if (!playerId) {
      send(ws, { type: 'error', message: '请先加入游戏' })
      return
    }

    const result = game.applyAction(playerId, action, amount)
    if (!result.success) {
      send(ws, { type: 'error', message: result.error ?? '' })
      return
    }

    stopActionTimer()

    if (result.handOver) {
      finishHand(result)
      return
    }

    broadcastGameState(result)
    notifyCurrentPlayer()
  }

  // ============================================================
  // 牌局结束
  // ============================================================

  function finishHand(result: ActionResult) {
    game.cleanupAfterHand()
    broadcast({ type: 'hand_over', winners: result.winners ?? [], state: result.state })
    console.log('[游戏] 本局结束')
    if (autoStartTimer) clearTimeout(autoStartTimer)
    autoStartTimer = setTimeout(autoNextHand, 3000)
  }

  function autoNextHand() {
    const result = game.startHand()
    if (result.success) {
      console.log('[游戏] 自动开始新一局')
      broadcastGameState(result)
      notifyCurrentPlayer()
    } else {
      broadcast({ type: 'waiting', message: '等待更多玩家加入...' })
    }
  }

  // ============================================================
  // 行动超时
  // ============================================================

  function startActionTimer(playerId: string) {
    stopActionTimer()
    actionTimerPlayerId = playerId
    actionTimer = setTimeout(() => {
      console.log(`[超时] ${playerId} 未行动，自动弃牌`)
      const result = game.applyAction(playerId, ActionType.Fold)
      // 超时弃牌后该玩家可能已被移除，需要从映射中获取 ws
      const ws = playerWs.get(playerId)
      if (ws) {
        playerWs.delete(playerId)
        wsPlayer.delete(ws)
      }
      game.removePlayer(playerId)

      if (result.success && result.handOver) {
        finishHand(result)
      } else {
        broadcastGameState(result)
      }
      actionTimer = null
      actionTimerPlayerId = null
    }, actionTimeoutMs)
  }

  function stopActionTimer() {
    if (actionTimer) {
      clearTimeout(actionTimer)
      actionTimer = null
      actionTimerPlayerId = null
    }
  }

  // ============================================================
  // 通知工具
  // ============================================================

  function notifyCurrentPlayer() {
    const state = game.getStateSnapshot()
    if (state.currentPlayerIndex < 0) return
    const player = state.players[state.currentPlayerIndex]
    const ws = playerWs.get(player.id)
    if (!ws) return

    const callAmount = Math.max(0, state.currentBet - player.bet)
    const minRaise = state.currentBet + (game.getLastRaiseSize() || config.bigBlind)

    send(ws, {
      type: 'your_turn',
      timeoutMs: actionTimeoutMs,
      callAmount,
      minRaise,
      canCheck: callAmount === 0,
      canRaise: player.chips + player.bet >= minRaise,
      canAllIn: player.chips > 0,
    })
    startActionTimer(player.id)
  }

  function broadcastGameState(result?: { state: GameState }) {
    const state = result ? result.state : game.getStateSnapshot()
    broadcast({ type: 'game_state', state })
  }

  function broadcast(msg: ServerMessage) {
    const data = JSON.stringify(msg)
    for (const [, ws] of playerWs) {
      if (ws.readyState === WebSocket.OPEN) ws.send(data)
    }
  }

  function send(ws: WebSocket, msg: ServerMessage) {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
  }

  // ============================================================
  // 返回
  // ============================================================

  return {
    wss,
    getGame: () => game,
    /** 清理定时器（关闭服务器时调用） */
    destroy: () => {
      stopActionTimer()
      if (autoStartTimer) clearTimeout(autoStartTimer)
      clearInterval(heartbeatInterval)
      wss.close()
    },
  }
}
