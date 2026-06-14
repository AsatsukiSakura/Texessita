declare module 'poker-evaluator' {
  export type HandName =
    | 'straight flush'
    | 'four of a kind'
    | 'full house'
    | 'flush'
    | 'straight'
    | 'three of a kind'
    | 'two pairs'
    | 'one pair'
    | 'high card'

  export interface EvaluatedHand {
    handType: number
    handRank: number
    value: number
    handName: HandName
  }

  export function evalHand(cards: string[]): EvaluatedHand
}
