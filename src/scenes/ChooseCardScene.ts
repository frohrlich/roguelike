import Phaser from "phaser";
import { Card } from "../classes/cards/Card";
import { DeckService } from "../services/DeckService";
import { UnitService } from "../services/UnitService";
import { CharacterCard } from "../classes/cards/CharacterCard";
import { BonusCard } from "../classes/cards/BonusCard";

export class ChooseCardScene extends Phaser.Scene {
  cardMargin = 20;

  currentCardChoice: string;
  isStarting: boolean;
  cards: Card[];
  chooseText: Phaser.GameObjects.BitmapText;
  chooseButton: Phaser.GameObjects.Rectangle;
  description: Phaser.GameObjects.BitmapText;
  unselectCardOverlay: Phaser.GameObjects.Rectangle;

  constructor() {
    super({
      key: "ChooseCardScene",
    });
  }

  create(data: any) {
    this.cards = [];
    this.unselectCardOverlay = null;
    this.isStarting = data.isStarting;
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

  toggleCardsVisibility = (cards: Card[]) => {
    cards.forEach((card) => {
      card.setVisible(!card.visible);
    });
  };

  toggleChooseFighter = (type: string) => {
    const defaultText = this.isStarting
      ? "Choose your \nstarting\ncard !"
      : "Choose a\ncard !";
    if (this.chooseText.text === defaultText) {
      this.chooseText.text = `Choose\nthis card ?`;
      this.chooseText.tint = 0x00ff00;
      this.chooseButton.setVisible(true);
      this.chooseButton.displayWidth = this.chooseText.displayWidth + 5;
      this.chooseButton.displayHeight = this.chooseText.displayHeight + 5;
    } else {
      this.chooseText.text = defaultText;
      this.chooseText.tint = 0xffffff;
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
      "Movement points",
      16
    );
    // HP
    const HPLegend = this.add
      .bitmapText(
        this.chooseText.x,
        MPLegend.getBottomLeft().y,
        "dogicapixel",
        "Health points",
        16
      )
      .setTint(0xff0000);
    // AP
    this.add
      .bitmapText(
        this.chooseText.x,
        HPLegend.getBottomLeft().y,
        "dogicapixel",
        "Action points",
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
    this.toggleChooseFighter(card.name);
    this.currentCardChoice = card.name;
    this.toggleUnselectCardOverlay(card);
    if (this.description.text === card.descriptionText) {
      this.description.text = "";
    } else {
      this.description.text = card.descriptionText;
    }
  }

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
    this.chooseButton = this.add
      .rectangle(
        this.chooseText.x - buttonMargin,
        this.chooseText.y - buttonMargin / 2,
        this.chooseText.displayWidth - 6,
        this.chooseText.displayHeight + buttonMargin * 2,
        0x003700
      )
      .setStrokeStyle(2, 0xffffff)
      .setOrigin(0, 0.5)
      .setVisible(false)
      .setInteractive()
      .on("pointerup", () => {
        DeckService.addCard(this.currentCardChoice);
        this.scene.start("MapScene");
      });
  }

  private addCards() {
    const card1 = new CharacterCard(
      this,
      0,
      this.game.scale.height / 2,
      false,
      true,
      UnitService.units["Amazon"]
    ).setDepth(4);
    card1.x = card1.displayWidth / 2 + this.cardMargin;
    // const card2 = new CharacterCard(
    //   this,
    //   card1.displayWidth * 1.5 + this.cardMargin * 2,
    //   this.game.scale.height / 2,
    //   false,
    //   true,
    //   UnitService.units["Renegade"]
    // ).setDepth(3);
    // const card3 = new CharacterCard(
    //   this,
    //   card1.displayWidth * 2.5 + this.cardMargin * 3,
    //   this.game.scale.height / 2,
    //   true,
    //   true,
    //   UnitService.units["Stranger"]
    // ).setDepth(2);
    const card2 = new BonusCard(
      this,
      card1.displayWidth * 1.5 + this.cardMargin * 2,
      this.game.scale.height / 2,
      false,
      true,
      DeckService.bonusCardsData["HpBonus"]
    ).setDepth(3);
    const card3 = new BonusCard(
      this,
      card1.displayWidth * 2.5 + this.cardMargin * 3,
      this.game.scale.height / 2,
      true,
      true,
      DeckService.bonusCardsData["EotBonus"]
    ).setDepth(2);
    this.cards.push(card1, card2, card3);
    this.add.existing(card1);
    this.add.existing(card2);
    this.add.existing(card3);
  }

  addDeckButton() {
    const buttonWidth = 130;
    const buttonHeight = 60;
    const margin = 9;

    this.add
      .graphics()
      .fillStyle(0x1f301d)
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
}

const arrayWithoutElementAtIndex = (cards: Card[], index: number) => {
  return cards.filter((value, arrIndex) => {
    return index !== arrIndex;
  });
};
