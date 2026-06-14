import { Card, Suit, Rank } from './types'

// ============================================================
// 牌格式双向转换器
// Card ↔ poker-evaluator 库的字符串格式
// ============================================================

const RANK_TO_CHAR: Record<number, string> = {
  14: 'A', 13: 'K', 12: 'Q', 11: 'J', 10: 'T',
  9: '9', 8: '8', 7: '7', 6: '6', 5: '5', 4: '4', 3: '3', 2: '2',
}

const CHAR_TO_RANK: Record<string, number> = {
  'A': 14, 'K': 13, 'Q': 12, 'J': 11, 'T': 10,
  '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2,
}

const SUIT_TO_CHAR: Record<string, string> = {
  S: 's', H: 'h', D: 'd', C: 'c',
}

const CHAR_TO_SUIT: Record<string, Suit> = {
  's': Suit.Spade, 'h': Suit.Heart, 'd': Suit.Diamond, 'c': Suit.Club,
}

/** Card → 库格式，如 {Suit.Spade, Rank.Ace} → "As" */
export function cardToPokerString(card: Card): string {
  const r = RANK_TO_CHAR[card.rank]
  const s = SUIT_TO_CHAR[card.suit]
  if (!r || !s) {
    throw new Error(`Invalid card: ${JSON.stringify(card)}`)
  }
  return r + s
}

/** 库格式 → Card，如 "As" → { suit: Suit.Spade, rank: Rank.Ace } */
export function pokerStringToCard(s: string): Card {
  if (s.length !== 2) {
    throw new Error(`Invalid poker card string: "${s}"`)
  }
  const rankChar = s[0].toUpperCase()
  const suitChar = s[1].toLowerCase()

  const rank: Rank | undefined = CHAR_TO_RANK[rankChar] as Rank
  const suit: Suit | undefined = CHAR_TO_SUIT[suitChar]

  if (rank === undefined || suit === undefined) {
    throw new Error(`Invalid poker card string: "${s}"`)
  }

  return { rank, suit }
}
