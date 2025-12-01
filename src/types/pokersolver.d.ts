declare module "pokersolver" {
  export class Hand {
    static solve(cards: string[]): Hand;
    rank: number;
    descr: string;
  }
}