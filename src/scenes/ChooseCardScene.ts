import Phaser from "phaser";
import { Card } from "../classes/cards/Card";
import { BonusData, DeckService } from "../services/DeckService";
import { UnitData, UnitService } from "../services/UnitService";
import { CharacterCard } from "../classes/cards/CharacterCard";
import { BonusCard } from "../classes/cards/BonusCard";
import { MapService } from "../services/MapService";

interface ChooseCardSceneData {
  isStarting: boolean;
}

export class ChooseCardScene extends Phaser.Scene {
  cardMargin = 20;
  cardCount = 3; // number of cards to choose from

  currentCardChoice: string;
  isStarting: boolean;
  cards: Card[];
  chooseText: Phaser.GameObjects.BitmapText;
  chooseButton: Phaser.GameObjects.Rectangle;
  description: Phaser.GameObjects.BitmapText;
  unselectCardOverlay: Phaser.GameObjects.Rectangle;
  cardsToSelectFrom: { [key: string]: any };
  selectedCardTypes: string[];
  isCharacterCards: boolean;

  constructor() {
    super({
      key: "ChooseCardScene",
    });
  }

  preload(): void {
    this.selectCards();
  }

  private selectCards() {
    this.selectedCardTypes = [];
    if (MapService.position === 0) {
      // at each zone beginning, choose a new character card
      this.isCharacterCards = true;
      this.cardsToSelectFrom = { ...UnitService.remainingUnits };
    } else {
      // else choose a bonus card
      this.isCharacterCards = false;
      this.cardsToSelectFrom = { ...DeckService.bonusCardsData };
    }

    for (let i = 0; i < this.cardCount; i++) {
      this.selectCard();
    }
  }

  selectCard() {
    const cardTypes = Object.keys(this.cardsToSelectFrom);
    const randIndex = Phaser.Math.RND.between(0, cardTypes.length - 1);
    const cardType = cardTypes[randIndex];
    this.selectedCardTypes.push(cardType);
    delete this.cardsToSelectFrom[cardType];
    this.loadCardIllustration(cardType);
  }

  create(data: ChooseCardSceneData) {
    this.cards = [];
    this.unselectCardOverlay = null;
    this.isStarting = data.isStarting;
    this.addBackground();
    if (!this.isStarting) {
      this.addDeckButton();
    }
    this.addCards();
    this.addChooseCardButton();
    this.addCharacterDescription();
    this.addCardEvents();
    this.addLegend();
    this.addInfoTip();
  }

  addBackground() {
    this.add
      .rectangle(0, 0, this.game.scale.width, this.game.scale.height, 0x000000)
      .setOrigin(0, 0)
      .setInteractive();
  }

  toggleCardsVisibility = (cards: Card[]) => {
    cards.forEach((card) => {
      card.setVisible(!card.visible);
    });
  };

  toggleChooseFighter = () => {
    const defaultText = this.isStarting
      ? "Choose your \nstarting\ncard !"
      : "Choose a\ncard !";
    if (this.chooseText.text === defaultText) {
      this.chooseText.text = `Choose\nthis card ?`;
      this.chooseButton.setVisible(true);
      this.chooseButton.displayWidth = this.chooseText.displayWidth + 5;
      this.chooseButton.displayHeight = this.chooseText.displayHeight + 5;
    } else {
      this.chooseText.text = defaultText;
      this.chooseButton.setVisible(false);
    }
  };

  private addInfoTip() {
    this.add.bitmapText(
      10,
      10,
      "dogicapixel",
      "Touch a spell icon to see its effects. Tap anywhere on a card to select/unselect it.",
      8
    );
  }

  private addLegend() {
    const legendTopMargin = 10;
    // MP
    const MPLegend = this.add.bitmapText(
      this.chooseText.x,
      legendTopMargin,
      "dogicapixel",
      "Movement points (MP)",
      16
    );
    // HP
    const HPLegend = this.add
      .bitmapText(
        this.chooseText.x,
        MPLegend.getBottomLeft().y,
        "dogicapixel",
        "Health points (HP)",
        16
      )
      .setTint(0xff0000);
    // AP
    this.add
      .bitmapText(
        this.chooseText.x,
        HPLegend.getBottomLeft().y,
        "dogicapixel",
        "Action points (AP)",
        16
      )
      .setTint(0x33c6f7);
  }

  private addCardEvents() {
    this.cards.forEach((card: Card) => {
      card.on("pointerup", () => {
        this.toggleCardSelect(card);
      });
    });
  }

  private toggleCardSelect(card: Card) {
    const cardIndex = this.cards.findIndex((findCard) => findCard === card);
    const otherCards = arrayWithoutElementAtIndex(this.cards, cardIndex);
    this.toggleCardsVisibility(otherCards);
    this.toggleChooseFighter();
    this.currentCardChoice = card.name;
    this.toggleUnselectCardOverlay(card);
    if (this.description.text === card.descriptionText) {
      this.chooseText.setDepth(1);
      this.chooseButton.setDepth(0);
      this.description.text = "";
    } else {
      this.description.text = card.descriptionText;
    }
  }

  /** The card overlay is over the whole scene so that click anywhere unselects currently selected card. */
  private toggleUnselectCardOverlay(card: Card) {
    if (!this.unselectCardOverlay) {
      this.unselectCardOverlay = this.add
        .rectangle(0, 0, this.game.scale.width, this.game.scale.height, 0, 0)
        .setInteractive()
        .setOrigin(0)
        .setDepth(1)
        .once("pointerup", () => {
          this.toggleCardSelect(card);
          card.toggleCardView();
          this.chooseText.setDepth(1);
          this.chooseButton.setDepth(0);
        });
      this.chooseText.setDepth(3);
      this.chooseButton.setDepth(2);
    } else {
      this.unselectCardOverlay.destroy();
      this.unselectCardOverlay = null;
    }
  }

  private addCharacterDescription() {
    this.description = this.add.bitmapText(
      10,
      this.cards[0].getBounds().bottom + 20,
      "dogicapixel",
      "",
      16
    );
  }

  private addChooseCardButton() {
    const buttonText = this.isStarting
      ? "Choose your \nstarting\ncard !"
      : "Choose a\ncard !";
    const chooseTextX =
      this.cards[0].displayWidth * 3 + this.cardMargin * 3 + 14;
    this.chooseText = this.add
      .bitmapText(
        chooseTextX,
        this.game.scale.height / 2,
        "dogicapixelbold",
        buttonText,
        24
      )
      .setDepth(1)
      .setOrigin(0, 0.5);
    const buttonMargin = 3;
    const baseButtonBackgroundColor = 0x007700;
    this.chooseButton = this.add
      .rectangle(
        this.chooseText.x - buttonMargin,
        this.chooseText.y - buttonMargin / 2,
        this.chooseText.displayWidth - 6,
        this.chooseText.displayHeight + buttonMargin * 2,
        baseButtonBackgroundColor
      )
      .setStrokeStyle(2, 0xffffff)
      .setOrigin(0, 0.5)
      .setVisible(false)
      .setInteractive()
      .on("pointerdown", () => {
        this.chooseButton.setFillStyle(0x005500);
      })
      .on("pointerout", () => {
        this.chooseButton.setFillStyle(baseButtonBackgroundColor);
      })
      .on("pointerup", () => {
        this.chooseButton.setFillStyle(baseButtonBackgroundColor);
        this.confirmCardChoice();
      });
  }

  private confirmCardChoice() {
    // remove unit from roster
    delete UnitService.remainingUnits[this.currentCardChoice];
    DeckService.addCard(this.currentCardChoice);
    // transition effect
    const fx = this.cameras.main.postFX.addWipe(0.3, 0, 0);
    this.scene.transition({
      target: "MapScene",
      duration: 1000,
      moveBelow: true,
      onUpdate: (progress: number) => {
        fx.progress = progress;
      },
    });
  }

  private addCards() {
    for (let position = 0; position < this.cardCount; position++) {
      this.addCard(position);
    }
  }

  private addCard(position: number) {
    let card: Card;
    if (this.isCharacterCards) {
      card = new CharacterCard(
        this,
        0,
        this.game.scale.height / 2,
        true,
        UnitService.remainingUnits[this.selectedCardTypes[position]]
      );
    } else {
      card = new BonusCard(
        this,
        0,
        this.game.scale.height / 2,
        true,
        DeckService.bonusCardsData[this.selectedCardTypes[position]]
      );
    }

    card
      .setDepth(4 - position)
      .setX(
        card.displayWidth * (position + 0.5) + this.cardMargin * (1 + position)
      );

    this.cards.push(card);
    this.add.existing(card);
  }

  addDeckButton() {
    const buttonWidth = 130;
    const buttonHeight = 60;
    const margin = 9;
    const deckButtonColor = 0x1f301d;

    this.add
      .graphics()
      .fillStyle(deckButtonColor)
      .lineStyle(4, 0xffffff)
      .fillRoundedRect(
        this.game.scale.width - buttonWidth - margin,
        this.game.scale.height - buttonHeight - margin,
        buttonWidth,
        buttonHeight,
        5
      )
      .strokeRoundedRect(
        this.game.scale.width - buttonWidth - margin,
        this.game.scale.height - buttonHeight - margin,
        buttonWidth,
        buttonHeight,
        5
      );
    // need this to click on button
    // as graphics objects are not interactive
    this.add
      .rectangle(
        this.game.scale.width - buttonWidth - margin,
        this.game.scale.height - buttonHeight - margin,
        buttonWidth,
        buttonHeight
      )
      .setOrigin(0, 0)
      .setInteractive()
      .setDepth(2)
      .on("pointerup", () => this.scene.launch("DeckScene"));

    this.add
      .bitmapText(
        this.game.scale.width - buttonWidth / 2 - margin,
        this.game.scale.height - buttonHeight / 2 - margin,
        "dogicapixel",
        "Deck",
        32
      )
      .setDepth(3)
      .setOrigin(0.5, 0.5);
  }

  private loadCardIllustration(key: string) {
    this.load.image(
      key + "Illus",
      `public/assets/images/cards/${lowercaseFirstLetter(key)}.png`
    );
  }
}

const arrayWithoutElementAtIndex = (cards: Card[], index: number) => {
  return cards.filter((value, arrIndex) => {
    return index !== arrIndex;
  });
};

function lowercaseFirstLetter(val: string) {
  return String(val).charAt(0).toLowerCase() + String(val).slice(1);
}
