import { Player, GameState, HandEvaluation, WinnerInfo, PlayerStatus } from '../engine/types'
import { evaluate } from '../engine/evaluator'

// ============================================================
// 摊牌与边池分配 — 纯函数
// ============================================================

/** 计算边池并判定赢家 */
export function determineWinners(
  allPlayers: Player[],
  communityCards: GameState['communityCards'],
  getContribution: (id: string) => number,
): WinnerInfo[] {
  const contenders = allPlayers.filter(
    p => p.status === PlayerStatus.Active || p.status === PlayerStatus.AllIn
  )
  // 含弃牌者的完整贡献列表（用于计算边池金额）
  const allContributors = allPlayers.filter(p => getContribution(p.id) > 0)
  const sorted = [...allContributors].sort((a, b) => getContribution(a.id) - getContribution(b.id))

  const winners: WinnerInfo[] = []
  let processedAmount = 0

  for (const player of sorted) {
    const contrib = getContribution(player.id)
    const slice = contrib - processedAmount
    if (slice <= 0) continue

    const eligible = contenders.filter(p => getContribution(p.id) >= contrib)
    const sidePot = calcSidePotAmount(sorted, contrib, processedAmount, slice, getContribution)

    if (sidePot > 0 && eligible.length > 0) {
      const bestPlayers = findBestHands(eligible, communityCards)
      const share = Math.floor(sidePot / bestPlayers.length)
      const remainder = sidePot - share * bestPlayers.length

      for (let i = 0; i < bestPlayers.length; i++) {
        const potShare = share + (i === 0 ? remainder : 0)
        if (potShare > 0) {
          winners.push({
            playerId: bestPlayers[i].id,
            playerName: bestPlayers[i].name,
            hand: evaluate(bestPlayers[i].hand, communityCards),
            potShare,
          })
        }
      }
    }
    processedAmount = contrib
  }

  return winners
}

/** 派发筹码 */
export function awardChips(
  players: Player[],
  winners: WinnerInfo[],
): void {
  for (const w of winners) {
    const player = players.find(p => p.id === w.playerId)
    if (player) player.chips += w.potShare
  }
}

// --------------------------------------------------
// 内部
// --------------------------------------------------

function calcSidePotAmount(
  sorted: Player[],
  contrib: number,
  processedAmount: number,
  slice: number,
  getContribution: (id: string) => number,
): number {
  let sidePot = 0
  for (const p of sorted) {
    const c = getContribution(p.id)
    if (c >= contrib) {
      sidePot += slice
    } else if (c > processedAmount) {
      sidePot += c - processedAmount
    }
  }
  return sidePot
}

/** 找出拥有最佳手牌的玩家（可能多人平局） */
function findBestHands(players: Player[], communityCards: GameState['communityCards']): Player[] {
  if (players.length === 1) return players

  let bestValue = -1
  const best: Player[] = []

  for (const p of players) {
    const ev = evaluate(p.hand, communityCards)
    // rank 占 10^10，kicker 依序 10^8 ~ 10^0，避免碰撞
    const value = ev.rank * 10000000000 +
      ev.kickers.reduce((acc, k, i) => acc + k * Math.pow(100, 4 - i), 0)

    if (value > bestValue) {
      bestValue = value
      best.length = 0
      best.push(p)
    } else if (value === bestValue) {
      best.push(p)
    }
  }

  return best
}
