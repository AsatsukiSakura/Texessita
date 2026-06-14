import { Player, GameState, GamePhase, PlayerStatus, ActionResult, Card } from '../engine/types'
import { deal } from '../engine/card'

// ============================================================
// 下注轮管理与阶段推进 — 纯函数
// ============================================================

/** 下注轮是否结束 */
export function isBettingRoundComplete(state: GameState, actedThisRound: Set<string>): boolean {
  const activePlayers = state.players.filter(p => p.status === PlayerStatus.Active)
  if (activePlayers.length === 0) return true

  for (const p of activePlayers) {
    if (p.bet !== state.currentBet) return false
    if (!actedThisRound.has(p.id)) return false
  }
  return activePlayers.length > 0
}

/** 推进到下一个活跃玩家 */
export function advanceToNextPlayer(state: GameState): void {
  const n = state.players.length
  for (let i = 1; i <= n; i++) {
    const idx = (state.currentPlayerIndex + i) % n
    if (state.players[idx].status === PlayerStatus.Active) {
      state.currentPlayerIndex = idx
      return
    }
  }
  state.currentPlayerIndex = -1
}

/** 将本轮下注移入底池并重置 */
export function collectBetsIntoPot(state: GameState): void {
  for (const p of state.players) {
    state.pot += p.bet
    p.bet = 0
  }
}

/** 重置下注轮状态 */
export function resetRoundState(state: GameState): void {
  state.currentBet = 0
  state.players.forEach(p => { p.bet = 0 })
}

/** 从 fromIndex（含）之后找第一个 Active/AllIn 玩家 */
export function findNextActive(players: Player[], fromIndex: number): number {
  const n = players.length
  for (let i = 1; i <= n; i++) {
    const idx = (fromIndex + i) % n
    const p = players[idx]
    if (p.status === PlayerStatus.Active || p.status === PlayerStatus.AllIn) return idx
  }
  return -1
}

/** Preflop 第一个行动者 */
export function getFirstToActPreflop(players: Player[], dealerIndex: number, blindIndex2: number): number {
  const activePlayers = players.filter(p => p.status !== PlayerStatus.Out)
  if (activePlayers.length === 2) {
    return findNextActive(players, dealerIndex)  // 单挑：庄=SB 先动
  }
  return findNextActive(players, blindIndex2)     // 常规：BB 之后
}

/** Flop/Turn/River 第一个行动者 */
export function getFirstToActPostflop(players: Player[], dealerIndex: number): number {
  return findNextActive(players, dealerIndex)
}

// --------------------------------------------------
// 盲注
// --------------------------------------------------

/** 收取盲注，返回 BB 位置 */
export function postBlinds(
  state: GameState,
  smallBlind: number,
  bigBlind: number,
  addContribution: (playerId: string, amount: number) => void,
): number {
  const bbIdx = getBlindIndex(state.players, state.dealerIndex, 2)
  const sbIdx = getBlindIndex(state.players, state.dealerIndex, 1)

  const sbPlayer = sbIdx >= 0 ? state.players[sbIdx] : null
  const bbPlayer = bbIdx >= 0 ? state.players[bbIdx] : null

  if (sbPlayer) {
    const sb = Math.min(smallBlind, sbPlayer.chips)
    sbPlayer.chips -= sb
    sbPlayer.bet += sb
    addContribution(sbPlayer.id, sb)
    if (sbPlayer.chips === 0) sbPlayer.status = PlayerStatus.AllIn
  }

  if (bbPlayer) {
    const bb = Math.min(bigBlind, bbPlayer.chips)
    bbPlayer.chips -= bb
    bbPlayer.bet += bb
    addContribution(bbPlayer.id, bb)
    state.currentBet = bb
    if (bbPlayer.chips === 0) bbPlayer.status = PlayerStatus.AllIn
  }

  return bbIdx
}

/** 获取盲注位索引（offset: 1=SB, 2=BB） */
function getBlindIndex(players: Player[], dealerIndex: number, offset: number): number {
  const n = players.length
  const activePlayers = players.filter(p => p.status !== PlayerStatus.Out)

  if (activePlayers.length === 2) {
    return offset === 1 ? dealerIndex : findNextActive(players, dealerIndex)
  }

  let count = 0
  for (let i = 1; i <= n; i++) {
    const idx = (dealerIndex + i) % n
    if (players[idx].status !== PlayerStatus.Out) {
      count++
      if (count === offset) return idx
    }
  }
  return -1
}

// --------------------------------------------------
// 发牌
// --------------------------------------------------

/** 发手牌 */
export function dealHoleCards(players: Player[], deck: Card[]): void {
  for (const p of players) {
    if (p.status !== PlayerStatus.Out) {
      p.hand = deal(deck, 2)
    }
  }
}

/** 发公共牌 */
export function dealCommunityCards(state: GameState, count: number): void {
  state.communityCards.push(...deal(state.deck, count))
}

// --------------------------------------------------
// 阶段推进
// --------------------------------------------------

/** 进入下一阶段，返回 ActionResult */
export function advancePhase(
  state: GameState,
  dealerIndex: number,
  goToShowdown: () => ActionResult,
): ActionResult {
  switch (state.phase) {
    case GamePhase.Preflop:
      dealCommunityCards(state, 3)
      state.phase = GamePhase.Flop
      state.currentPlayerIndex = getFirstToActPostflop(state.players, dealerIndex)
      return { success: true, state: JSON.parse(JSON.stringify(state)) }
    case GamePhase.Flop:
      dealCommunityCards(state, 1)
      state.phase = GamePhase.Turn
      state.currentPlayerIndex = getFirstToActPostflop(state.players, dealerIndex)
      return { success: true, state: JSON.parse(JSON.stringify(state)) }
    case GamePhase.Turn:
      dealCommunityCards(state, 1)
      state.phase = GamePhase.River
      state.currentPlayerIndex = getFirstToActPostflop(state.players, dealerIndex)
      return { success: true, state: JSON.parse(JSON.stringify(state)) }
    case GamePhase.River:
      return goToShowdown()
    default:
      return { success: true, state: JSON.parse(JSON.stringify(state)) }
  }
}

/** 全部 All-In 时补发公共牌到 5 张 */
export function fillCommunityCards(state: GameState): void {
  const remaining = 5 - state.communityCards.length
  if (remaining > 0) {
    dealCommunityCards(state, remaining)
  }
}
