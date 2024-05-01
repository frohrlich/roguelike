export class DeckService {
  static cards: string[] = [];

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
