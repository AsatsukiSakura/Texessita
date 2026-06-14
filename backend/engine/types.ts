// ============================================================
// 德州扑克基础类型定义
// ============================================================

// --------------------------------------------------
// 牌的构成
// --------------------------------------------------

/** 花色 */
export enum Suit {
  Spade   = 'S',   // 黑桃 ♠
  Heart   = 'H',   // 红心 ♥
  Diamond = 'D',   // 方块 ♦
  Club    = 'C',   // 梅花 ♣
}

/** 点数：2=2 ... 13=K, 14=A */
export enum Rank {
  Two   = 2,
  Three = 3,
  Four  = 4,
  Five  = 5,
  Six   = 6,
  Seven = 7,
  Eight = 8,
  Nine  = 9,
  Ten   = 10,
  Jack  = 11,
  Queen = 12,
  King  = 13,
  Ace   = 14,
}

/** 一张扑克牌 */
export interface Card {
  suit: Suit
  rank: Rank
}

// --------------------------------------------------
// 牌型评估
// --------------------------------------------------

/** 牌型等级（从高到低） */
export enum HandRank {
  RoyalFlush    = 9,   // 皇家同花顺
  StraightFlush = 8,   // 同花顺
  FourOfAKind   = 7,   // 四条
  FullHouse     = 6,   // 葫芦
  Flush         = 5,   // 同花
  Straight      = 4,   // 顺子
  ThreeOfAKind  = 3,   // 三条
  TwoPair       = 2,   // 两对
  OnePair       = 1,   // 一对
  HighCard      = 0,   // 高牌
}

/** 手牌评估结果 */
export interface HandEvaluation {
  rank: HandRank
  kickers: number[]    // 5 个用于比较同牌型的踢脚，从大到小
  bestFive: Card[]     // 组成最优牌型的 5 张牌
}

/** 两副手牌比较结果 */
export enum CompareResult {
  Win  = 1,
  Lose = -1,
  Tie  = 0,
}

// --------------------------------------------------
// 游戏流程
// --------------------------------------------------

/** 游戏阶段 */
export enum GamePhase {
  Waiting  = 'waiting',
  Preflop  = 'preflop',
  Flop     = 'flop',
  Turn     = 'turn',
  River    = 'river',
  Showdown = 'showdown',
}

/** 玩家可执行的操作 */
export enum ActionType {
  Fold  = 'fold',
  Check = 'check',
  Call  = 'call',
  Raise = 'raise',
  AllIn = 'all-in',
}

/** 玩家座位状态 */
export enum PlayerStatus {
  Active = 'active',       // 仍在牌局中
  Folded = 'folded',       // 已弃牌
  AllIn  = 'all-in',       // 已全下
  Out    = 'out',          // 已出局（筹码耗尽）
}

// --------------------------------------------------
// 数据对象
// --------------------------------------------------

/** 牌桌上的一名玩家 */
export interface Player {
  id: string
  name: string
  chips: number            // 剩余筹码
  bet: number              // 当前轮已下注额（本圈累计）
  hand: Card[]             // 手牌（2 张）
  status: PlayerStatus
  seatIndex: number        // 座位号 0 ~ N-1
  isDealer: boolean        // 是否为庄家（按钮位）
}

/** 一局游戏的完整状态（用于同步给所有客户端） */
export interface GameState {
  players: Player[]
  communityCards: Card[]
  deck: Card[]             // 剩余牌堆
  pot: number
  currentBet: number       // 当前轮最高下注额
  phase: GamePhase
  dealerIndex: number
  currentPlayerIndex: number  // 当前轮到谁行动
}

/** 游戏配置（创建房间时指定） */
export interface GameConfig {
  maxPlayers: number       // 最多玩家数
  startingChips: number    // 每人起始筹码
  smallBlind: number       // 小盲注
  bigBlind: number         // 大盲注
}

// --------------------------------------------------
// 操作结果
// --------------------------------------------------

/** applyAction 的返回值 */
export interface ActionResult {
  success: boolean
  error?: string
  state: GameState
  handOver?: boolean
  winners?: WinnerInfo[]
}

/** 摊牌时每位赢家的信息 */
export interface WinnerInfo {
  playerId: string
  playerName: string
  hand?: HandEvaluation   // 弃牌获胜时无手牌
  potShare: number
}
