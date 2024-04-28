export class DeckService {
  static cards: string[] = [];

  static addCard(cardName: string) {
    this.cards.push(cardName);
  }
}
