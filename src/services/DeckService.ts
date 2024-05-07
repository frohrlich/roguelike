export interface BonusData {
  type: string;
  name: string;
  description: string;
  onCardDescription: string;
}

export class DeckService {
  static cards: string[] = [];

  static bonusCardsData: { [key: string]: BonusData } = {
    RangeBonus: {
      type: "RangeBonus",
      name: "Telescope",
      description: "See further.",
      onCardDescription: "Adds range to\n your attacks.",
    },
  };

  static addCard(cardName: string) {
    this.cards.push(cardName);
  }
}

/*
export class Deck {
  cards: string[] = []
  addCard (cardName: string) { ... }
}

export default DeckService {
  decks: { [key: number]: Deck } = {}

  createDeck (entityId: number) {
    this.decks[entityId] = new Deck
  }

  getDeck (entityId: number) {
    return this.decks[entityId]
  }
}
*/
