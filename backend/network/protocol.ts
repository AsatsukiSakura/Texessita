import { ActionType, GameState, WinnerInfo } from '../engine/types.js'

// ============================================================
// WebSocket 消息协议类型定义
// 前后端共享，保证编译期类型安全
// ============================================================

// --------------------------------------------------
// 客户端 → 服务端
// --------------------------------------------------

export interface JoinMsg {
  type: 'join'
  name: string
}

export interface StartHandMsg {
  type: 'start_hand'
}

export interface ActionMsg {
  type: 'action'
  action: ActionType
  amount?: number
}

export interface LeaveMsg {
  type: 'leave'
}

/** 客户端可发送的全部消息 */
export type ClientMessage = JoinMsg | StartHandMsg | ActionMsg | LeaveMsg

// --------------------------------------------------
// 服务端 → 客户端
// --------------------------------------------------

export interface JoinedMsg {
  type: 'joined'
  playerId: string
}

export interface GameStateMsg {
  type: 'game_state'
  state: GameState
}

export interface YourTurnMsg {
  type: 'your_turn'
  timeoutMs: number
  callAmount: number
  minRaise: number
  canCheck: boolean
  canRaise: boolean
  canAllIn: boolean
}

export interface HandOverMsg {
  type: 'hand_over'
  winners: WinnerInfo[]
  state: GameState
}

export interface ErrorMsg {
  type: 'error'
  message: string
}

export interface WaitingMsg {
  type: 'waiting'
  message: string
}

export interface PlayerJoinedMsg {
  type: 'player_joined'
  playerId: string
  playerName: string
}

export interface PlayerLeftMsg {
  type: 'player_left'
  playerId: string
  playerName: string
}

/** 服务端可发送的全部消息 */
export type ServerMessage =
  | JoinedMsg
  | GameStateMsg
  | YourTurnMsg
  | HandOverMsg
  | ErrorMsg
  | WaitingMsg
  | PlayerJoinedMsg
  | PlayerLeftMsg
