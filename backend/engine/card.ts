import { Card, Suit, Rank } from './types'

// ============================================================
// 扑克牌工具函数
// ============================================================

/** 创建一副标准 52 张牌 */
export function createDeck(): Card[] {
  const suits = [Suit.Spade, Suit.Heart, Suit.Diamond, Suit.Club]
  const ranks = [
    Rank.Two, Rank.Three, Rank.Four, Rank.Five,
    Rank.Six, Rank.Seven, Rank.Eight, Rank.Nine,
    Rank.Ten, Rank.Jack, Rank.Queen, Rank.King, Rank.Ace,
  ]
  const deck: Card[] = []
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank })
    }
  }
  return deck
}

/** Fisher-Yates 洗牌，原地修改 */
export function shuffle(deck: Card[]): void {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
}

/** 从牌堆顶部发 n 张牌（会改变原数组长度） */
export function deal(deck: Card[], n: number): Card[] {
  return deck.splice(0, n)
}

/** 牌的字符串表示，如 "A♠" "10♥" */
export function cardToString(card: Card): string {
  const rankStr: Record<number, string> = {
    2: '2', 3: '3', 4: '4', 5: '5', 6: '6',
    7: '7', 8: '8', 9: '9', 10: '10',
    11: 'J', 12: 'Q', 13: 'K', 14: 'A',
  }
  const suitStr: Record<string, string> = {
    S: '♠', H: '♥', D: '♦', C: '♣',
  }
  return `${rankStr[card.rank]}${suitStr[card.suit]}`
}
