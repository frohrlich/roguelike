import Phaser from "phaser";
import { Card } from "../classes/cards/Card";
import { findUnitDataByType } from "../data/UnitData";
import { DeckService } from "../services/DeckService";

export class ChooseCardScene extends Phaser.Scene {
  cardMargin = 20;

  currentCardChoice: string;
  isStarting: boolean;

  constructor() {
    super({
      key: "ChooseCardScene",
    });
  }

  create(data: any) {
    this.isStarting = data.isStarting;
    if (!this.isStarting) {
      this.addDeckButton();
    }
    const { card1, card2, card3 } = this.addCards();
    const { chooseText, chooseButton, chooseTextX } =
      this.addChooseCardButton(card1);
    const characterDescription = this.addCharacterDescription(card1);
    this.addCardEvents(
      card1,
      card2,
      card3,
      chooseText,
      chooseButton,
      characterDescription
    );
    this.addLegend(chooseTextX);
    this.addInfoTip();
  }

  toggleCardsVisibility = (...cards: Card[]) => {
    cards.forEach((card) => {
      card.setVisible(!card.visible);
    });
  };

  toggleChooseFighter = (
    chooseText: Phaser.GameObjects.BitmapText,
    chooseButton: Phaser.GameObjects.Rectangle,
    type: string
  ) => {
    const defaultText = this.isStarting
      ? "Choose your \nstarting\ncard !"
      : "Choose a\ncard !";
    if (chooseText.text === defaultText) {
      chooseText.text = `Choose\n${type} ?`;
      chooseText.tint = 0x00ff00;
      chooseButton.setVisible(true);
      chooseButton.displayWidth = chooseText.displayWidth + 5;
    } else {
      chooseText.text = defaultText;
      chooseText.tint = 0xffffff;
      chooseButton.setVisible(false);
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

  private addLegend(chooseTextX: number) {
    const legendTopMargin = 10;
    // MP
    const MPLegend = this.add.bitmapText(
      chooseTextX,
      legendTopMargin,
      "dogicapixel",
      "Movement points",
      16
    );
    // HP
    const HPLegend = this.add
      .bitmapText(
        chooseTextX,
        MPLegend.getBottomLeft().y,
        "dogicapixel",
        "Health points",
        16
      )
      .setTint(0xff0000);
    // AP
    const APLegend = this.add
      .bitmapText(
        chooseTextX,
        HPLegend.getBottomLeft().y,
        "dogicapixel",
        "Action points",
        16
      )
      .setTint(0x33c6f7);
  }

  private addCardEvents(
    card1: Card,
    card2: Card,
    card3: Card,
    chooseText: Phaser.GameObjects.BitmapText,
    chooseButton: Phaser.GameObjects.Rectangle,
    characterDescription: Phaser.GameObjects.BitmapText
  ) {
    card1.on("pointerup", () => {
      this.toggleCardsVisibility(card2, card3);
      this.toggleChooseFighter(chooseText, chooseButton, card1.unitData.type);
      this.currentCardChoice = card1.unitData.type;
      if (characterDescription.text === card1.unitData.description) {
        characterDescription.text = "";
      } else {
        characterDescription.text = card1.unitData.description;
      }
    });
    card2.on("pointerup", () => {
      this.toggleCardsVisibility(card1, card3);
      this.toggleChooseFighter(chooseText, chooseButton, card2.unitData.type);
      this.currentCardChoice = card2.unitData.type;
      if (characterDescription.text === card2.unitData.description) {
        characterDescription.text = "";
      } else {
        characterDescription.text = card2.unitData.description;
      }
    });
    card3.on("pointerup", () => {
      this.toggleCardsVisibility(card1, card2);
      this.toggleChooseFighter(chooseText, chooseButton, card3.unitData.type);
      this.currentCardChoice = card3.unitData.type;
      if (characterDescription.text === card3.unitData.description) {
        characterDescription.text = "";
      } else {
        characterDescription.text = card3.unitData.description;
      }
    });
  }

  private addCharacterDescription(card1: Card) {
    return this.add.bitmapText(
      10,
      card1.getBounds().bottom + 20,
      "dogicapixel",
      "",
      16
    );
  }

  private addChooseCardButton(card1: Card) {
    const buttonText = this.isStarting
      ? "Choose your \nstarting\ncard !"
      : "Choose a\ncard !";
    const chooseTextX = card1.displayWidth * 3 + this.cardMargin * 3 + 14;
    const chooseText = this.add
      .bitmapText(
        chooseTextX,
        this.game.scale.height / 2,
        "dogicapixelbold",
        buttonText,
        24
      )
      .setDepth(-1)
      .setOrigin(0, 0.5);
    const buttonMargin = 3;
    const chooseButton = this.add
      .rectangle(
        chooseText.x - buttonMargin,
        chooseText.y - buttonMargin / 2,
        chooseText.displayWidth - 6,
        chooseText.displayHeight + buttonMargin * 2,
        0x003700
      )
      .setStrokeStyle(2, 0xffffff)
      .setDepth(-2)
      .setOrigin(0, 0.5)
      .setVisible(false)
      .setInteractive()
      .on("pointerup", () => {
        DeckService.addCard(this.currentCardChoice);
        this.scene.start("MapScene");
      });
    return { chooseText, chooseButton, chooseTextX };
  }

  private addCards() {
    const card1 = new Card(
      this,
      0,
      this.game.scale.height / 2,
      findUnitDataByType("Amazon")
    ).setDepth(2);
    const card2 = new Card(
      this,
      card1.displayWidth * 1.5 + this.cardMargin * 2,
      this.game.scale.height / 2,
      findUnitDataByType("Renegade")
    ).setDepth(1);
    const card3 = new Card(
      this,
      card1.displayWidth * 2.5 + this.cardMargin * 3,
      this.game.scale.height / 2,
      findUnitDataByType("Stranger"),
      true
    );
    card1.x = card1.displayWidth / 2 + this.cardMargin;
    this.add.existing(card1);
    this.add.existing(card2);
    this.add.existing(card3);
    return { card1, card2, card3 };
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

    // need this to click on chat button
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
      .on("pointerup", () => this.scene.launch("DeckScene"));

    this.add
      .bitmapText(
        this.game.scale.width - buttonWidth / 2 - margin,
        this.game.scale.height - buttonHeight / 2 - margin,
        "dogicapixel",
        "Deck",
        32
      )
      .setOrigin(0.5, 0.5);
  }
}
