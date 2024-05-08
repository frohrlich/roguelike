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
      onCardDescription: "Add range to\nyour spells.",
    },
    DamageBonus: {
      type: "DamageBonus",
      name: "Dumbbell",
      description: "Obliterate them.",
      onCardDescription: "Increase your\ndirect damage.",
    },
    MpBonus: {
      type: "MpBonus",
      name: "Sandals",
      description: "Those are nice sandals.",
      onCardDescription: "Increase your\nmobility.",
    },
    ApBonus: {
      type: "ApBonus",
      name: "Beer",
      description: "Here we go again.",
      onCardDescription: "Increase your\naction points.",
    },
    HpBonus: {
      type: "HpBonus",
      name: "Armor",
      description: "Protect yourself.",
      onCardDescription: "Increase your\nresistance.",
    },
    EotBonus: {
      type: "EotBonus",
      name: "Poison vial",
      description: "A vial of mandrake's liquor. Or something.",
      onCardDescription: "Increase your\ndamage over\ntime.",
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
