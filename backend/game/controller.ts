import {
  GameState, GameConfig, Player, GamePhase,
  ActionType, PlayerStatus, ActionResult,
} from '../engine/types'
import { createDeck, shuffle } from '../engine/card'

import { validateAction, executeCall, executeRaise, executeAllIn } from './actions'
import {
  isBettingRoundComplete, advanceToNextPlayer, collectBetsIntoPot, resetRoundState,
  postBlinds, dealHoleCards, advancePhase, fillCommunityCards,
  getFirstToActPreflop,
} from './round'
import { determineWinners, awardChips } from './showdown'

// ============================================================
// GameController — 编排器
// 组合 round / actions / showdown 三个模块，暴露最小接口
// ============================================================

export class GameController {
  private state: GameState
  private config: GameConfig
  private totalContribution = new Map<string, number>()
  private actedThisRound = new Set<string>()
  private lastRaiseSize = 0

  constructor(config: GameConfig) {
    this.config = { ...config }
    this.state = {
      players: [], communityCards: [], deck: [],
      pot: 0, currentBet: 0, phase: GamePhase.Waiting,
      dealerIndex: -1, currentPlayerIndex: -1,
    }
  }

  // ---- 玩家管理 ----

  addPlayer(id: string, name: string): boolean {
    if (this.state.phase !== GamePhase.Waiting) return false
    if (this.state.players.length >= this.config.maxPlayers) return false
    if (this.state.players.some(p => p.id === id)) return false

    this.state.players.push({
      id, name, chips: this.config.startingChips, bet: 0, hand: [],
      status: PlayerStatus.Active,
      seatIndex: this.state.players.length,
      isDealer: false,
    })
    return true
  }

  removePlayer(id: string): void {
    const idx = this.state.players.findIndex(p => p.id === id)
    if (idx === -1) return
    this.state.players.splice(idx, 1)
    this.state.players.forEach((p, i) => { p.seatIndex = i })
  }

  // ---- 游戏流程 ----

  startHand(): ActionResult {
    const activePlayers = this.state.players.filter(p => p.status !== PlayerStatus.Out)
    if (activePlayers.length < 2) {
      return { success: false, error: '至少需要 2 名玩家', state: this.snapshot() }
    }

    this.resetHand(activePlayers)
    this.moveDealer(activePlayers)

    this.state.deck = createDeck()
    shuffle(this.state.deck)
    dealHoleCards(this.state.players, this.state.deck)

    const bbIdx = postBlinds(this.state, this.config.smallBlind, this.config.bigBlind, this.addC.bind(this))
    this.lastRaiseSize = this.config.bigBlind

    this.state.phase = GamePhase.Preflop
    this.state.currentPlayerIndex = getFirstToActPreflop(this.state.players, this.state.dealerIndex, bbIdx)

    return { success: true, state: this.snapshot() }
  }

  applyAction(playerId: string, action: ActionType, amount?: number): ActionResult {
    const error = validateAction(this.state, this.config, playerId, action, this.lastRaiseSize, amount)
    if (error) return { success: false, error, state: this.snapshot() }

    const player = this.state.players[this.state.currentPlayerIndex]
    this.actedThisRound.add(playerId)

    switch (action) {
      case ActionType.Fold:
        player.status = PlayerStatus.Folded
        break
      case ActionType.Check:
        break
      case ActionType.Call:
        executeCall(player, this.state.currentBet, this.addC.bind(this))
        break
      case ActionType.Raise: {
        const r = executeRaise(player, amount!, this.state.currentBet, this.addC.bind(this))
        this.state.currentBet = r.newCurrentBet
        this.lastRaiseSize = r.lastRaiseSize
        this.actedThisRound.clear()
        this.actedThisRound.add(playerId)
        break
      }
      case ActionType.AllIn: {
        const r = executeAllIn(player, this.state.currentBet, this.addC.bind(this))
        this.state.currentBet = r.newCurrentBet
        if (r.isRaise) {
          this.lastRaiseSize = r.lastRaiseSize
          this.actedThisRound.clear()
          this.actedThisRound.add(playerId)
        }
        break
      }
    }

    // 只剩一人 → 直接获胜
    const remainingActive = this.state.players.filter(p => p.status === PlayerStatus.Active)
    if (remainingActive.length === 1 && this.allOthersFoldedOrAllIn(remainingActive[0])) {
      return this.endByFold(remainingActive[0])
    }

    // 全部 All-In → 直入摊牌
    if (this.state.players.filter(p => p.status === PlayerStatus.Active).length === 0) {
      return this.runShowdown()
    }

    // 下注轮结束 → 推进阶段
    if (isBettingRoundComplete(this.state, this.actedThisRound)) {
      return this.endBettingRound()
    }

    advanceToNextPlayer(this.state)
    return { success: true, state: this.snapshot() }
  }

  getStateSnapshot(): GameState {
    return this.snapshot()
  }

  getLastRaiseSize(): number {
    return this.lastRaiseSize
  }

  /** 牌局结束后清理：将筹码归零的玩家标记为 Out */
  cleanupAfterHand(): void {
    for (const p of this.state.players) {
      if (p.chips === 0) {
        p.status = PlayerStatus.Out
      }
    }
  }

  // ---- 内部 ----

  private snapshot(): GameState {
    return JSON.parse(JSON.stringify(this.state))
  }

  private addC(playerId: string, amount: number): void {
    this.totalContribution.set(playerId, (this.totalContribution.get(playerId) || 0) + amount)
  }

  private getC(playerId: string): number {
    return this.totalContribution.get(playerId) || 0
  }

  private resetHand(activePlayers: Player[]): void {
    this.state.communityCards = []
    this.state.pot = 0
    this.state.currentBet = 0
    this.state.phase = GamePhase.Waiting
    this.state.currentPlayerIndex = -1
    this.totalContribution.clear()
    this.actedThisRound.clear()
    this.lastRaiseSize = 0
    for (const p of activePlayers) {
      p.hand = []
      p.bet = 0
      p.status = PlayerStatus.Active
    }
  }

  private moveDealer(activePlayers: Player[]): void {
    this.state.players.forEach(p => { p.isDealer = false })
    if (this.state.dealerIndex < 0) {
      this.state.dealerIndex = 0
    } else {
      const n = this.state.players.length
      for (let i = 1; i <= n; i++) {
        const idx = (this.state.dealerIndex + i) % n
        if (this.state.players[idx].status !== PlayerStatus.Out) {
          this.state.dealerIndex = idx
          break
        }
      }
    }
    this.state.players[this.state.dealerIndex].isDealer = true
  }

  private endBettingRound(): ActionResult {
    collectBetsIntoPot(this.state)
    resetRoundState(this.state)
    this.lastRaiseSize = 0
    this.actedThisRound.clear()
    return advancePhase(this.state, this.state.dealerIndex, () => this.goShowdown())
  }

  private goShowdown(): ActionResult {
    collectBetsIntoPot(this.state)
    this.state.phase = GamePhase.Showdown
    const winners = determineWinners(this.state.players, this.state.communityCards, this.getC.bind(this))
    awardChips(this.state.players, winners)
    this.state.pot = 0
    return { success: true, state: this.snapshot(), handOver: true, winners }
  }

  private runShowdown(): ActionResult {
    fillCommunityCards(this.state)
    return this.goShowdown()
  }

  private endByFold(winner: Player): ActionResult {
    collectBetsIntoPot(this.state)
    this.state.phase = GamePhase.Showdown
    const wonAmount = this.state.pot
    winner.chips += wonAmount
    this.state.pot = 0
    return {
      success: true, state: this.snapshot(), handOver: true,
      winners: [{ playerId: winner.id, playerName: winner.name, potShare: wonAmount }],
    }
  }

  private allOthersFoldedOrAllIn(winner: Player): boolean {
    return this.state.players.every(p =>
      p.id === winner.id || p.status === PlayerStatus.Folded || p.status === PlayerStatus.AllIn
    )
  }
}
