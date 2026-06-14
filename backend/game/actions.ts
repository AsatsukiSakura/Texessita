import { Player, GameState, GameConfig, ActionType, PlayerStatus } from '../engine/types'

// ============================================================
// 行动校验与执行 — 纯函数，不依赖 GameController
// ============================================================

/** 验证行动是否合法，返回错误信息或 null */
export function validateAction(
  state: GameState,
  config: GameConfig,
  playerId: string,
  action: ActionType,
  lastRaiseSize: number,
  amount?: number,
): string | null {
  const player = state.players[state.currentPlayerIndex]
  if (!player || player.id !== playerId) return '不是你的回合'
  if (player.status !== PlayerStatus.Active) return '你不在牌局中'

  switch (action) {
    case ActionType.Fold:
      return null
    case ActionType.Check:
      return player.bet < state.currentBet ? '不能过牌，必须跟注或弃牌' : null
    case ActionType.Call:
      return player.bet >= state.currentBet ? '无需跟注，可以过牌' : null
    case ActionType.Raise: {
      if (amount === undefined) return '请指定加注金额'
      if (amount <= state.currentBet) return '加注必须大于当前下注'
      const minRaise = lastRaiseSize > 0 ? lastRaiseSize : config.bigBlind
      if (amount < state.currentBet + minRaise) return `最小加注为 ${state.currentBet + minRaise}`
      if (amount > player.bet + player.chips) return '筹码不足'
      return null
    }
    case ActionType.AllIn:
      return player.chips <= 0 ? '没有筹码可全下' : null
  }
}

/** 执行跟注 */
export function executeCall(
  player: Player,
  currentBet: number,
  addContribution: (playerId: string, amount: number) => void,
): void {
  const callAmount = Math.min(currentBet - player.bet, player.chips)
  player.chips -= callAmount
  player.bet += callAmount
  addContribution(player.id, callAmount)
  if (player.chips === 0) player.status = PlayerStatus.AllIn
}

/** 执行加注，返回新的 lastRaiseSize */
export function executeRaise(
  player: Player,
  totalBet: number,
  currentBet: number,
  addContribution: (playerId: string, amount: number) => void,
): { lastRaiseSize: number; newCurrentBet: number } {
  const additional = totalBet - player.bet
  player.chips -= additional
  player.bet = totalBet
  addContribution(player.id, additional)
  if (player.chips === 0) player.status = PlayerStatus.AllIn

  return {
    lastRaiseSize: totalBet - currentBet,
    newCurrentBet: totalBet,
  }
}

/** 执行全下，可能提升为 raise */
export function executeAllIn(
  player: Player,
  currentBet: number,
  addContribution: (playerId: string, amount: number) => void,
): { isRaise: boolean; lastRaiseSize: number; newCurrentBet: number } {
  const allInAmount = player.chips
  const totalBet = player.bet + allInAmount

  player.chips = 0
  player.bet = totalBet
  player.status = PlayerStatus.AllIn
  addContribution(player.id, allInAmount)

  if (totalBet > currentBet) {
    return { isRaise: true, lastRaiseSize: totalBet - currentBet, newCurrentBet: totalBet }
  }
  return { isRaise: false, lastRaiseSize: 0, newCurrentBet: currentBet }
}
