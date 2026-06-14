import { Card, HandRank, HandEvaluation, CompareResult } from './types'
import { cardToPokerString } from './converter'
import { evalHand, EvaluatedHand } from 'poker-evaluator'

// ============================================================
// 手牌评估器 — 基于 poker-evaluator 库
// 输入 2 张手牌 + 3~5 张公共牌 → 输出最优 5 张评估结果
// ============================================================

/**
 * 评估 7 张牌中的最优 5 张组合
 * @param holeCards 2 张手牌
 * @param communityCards 3~5 张公共牌
 */
export function evaluate(holeCards: Card[], communityCards: Card[]): HandEvaluation {
  const allCards = [...holeCards, ...communityCards]

  // 全 7 张一起评估，取 poker-evaluator 的 value
  const allStrings = allCards.map(cardToPokerString)
  const result = evalHand(allStrings)

  // 枚举所有 C(7,5) 组合，找 value 最高的那个 → bestFive
  const combos = combinations(allCards, 5)
  let bestFive: Card[] = combos[0]
  let bestValue = -1

  for (const five of combos) {
    const fiveStrings = five.map(cardToPokerString)
    const { value } = evalHand(fiveStrings)
    if (value > bestValue) {
      bestValue = value
      bestFive = five
    }
  }

  const handRank = mapToHandRank(result)
  const kickers = bestFive.map(c => c.rank).sort((a, b) => b - a)

  return { rank: handRank, kickers, bestFive }
}

/** 比较两副手牌，返回胜负 */
export function compareHands(a: HandEvaluation, b: HandEvaluation): CompareResult {
  const aValue = evaluateToValue(a)
  const bValue = evaluateToValue(b)
  if (aValue > bValue) return CompareResult.Win
  if (aValue < bValue) return CompareResult.Lose
  return CompareResult.Tie
}

// --------------------------------------------------
// 内部工具
// --------------------------------------------------

/** 将 poker-evaluator 结果映射到我们的 HandRank */
function mapToHandRank(result: EvaluatedHand): HandRank {
  const { handType, handRank } = result
  switch (handType) {
    case 9: return handRank === 10 ? HandRank.RoyalFlush : HandRank.StraightFlush
    case 8: return HandRank.FourOfAKind
    case 7: return HandRank.FullHouse
    case 6: return HandRank.Flush
    case 5: return HandRank.Straight
    case 4: return HandRank.ThreeOfAKind
    case 3: return HandRank.TwoPair
    case 2: return HandRank.OnePair
    case 1: return HandRank.HighCard
    default: return HandRank.HighCard
  }
}

/** 将 HandEvaluation 转换回 poker-evaluator 可用于比大小的数值 */
function evaluateToValue(hand: HandEvaluation): number {
  const strings = hand.bestFive.map(cardToPokerString)
  return evalHand(strings).value
}

/** 生成 C(n, k) 所有组合 */
function combinations<T>(arr: T[], k: number): T[][] {
  const result: T[][] = []
  function helper(start: number, chosen: T[]): void {
    if (chosen.length === k) {
      result.push([...chosen])
      return
    }
    for (let i = start; i < arr.length; i++) {
      chosen.push(arr[i])
      helper(i + 1, chosen)
      chosen.pop()
    }
  }
  helper(0, [])
  return result
}
