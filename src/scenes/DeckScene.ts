import Phaser from "phaser";
import { Card } from "../classes/cards/Card";
import { findUnitDataByType } from "../data/UnitData";
import { DeckService } from "../services/DeckService";

export class DeckScene extends Phaser.Scene {
  marginY = 10;
  marginX = 21.5;
  columnCount = 6;

  constructor() {
    super({
      key: "DeckScene",
    });
  }

  create() {
    this.addBackground();
    this.addCards();
    this.addGoBackButton();
  }

  addBackground() {
    this.add
      .rectangle(0, 0, this.game.scale.width, this.game.scale.height, 0x000000)
      .setOrigin(0, 0);
  }

  addGoBackButton() {
    const buttonWidth = 160;
    const buttonHeight = 60;
    const margin = 9;

    this.add
      .graphics()
      .fillStyle(0x1f301d)
      .lineStyle(4, 0x00ff00)
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
      .on("pointerup", () => this.scene.stop("DeckScene"));

    this.add
      .bitmapText(
        this.game.scale.width - buttonWidth / 2 - margin,
        this.game.scale.height - buttonHeight / 2 - margin,
        "dogicapixel",
        "Go back",
        24
      )
      .setOrigin(0.5, 0.5);
  }

  private addCards() {
    for (let i = 0; i < DeckService.cards.length; i++) {
      const cardName = DeckService.cards[i];
      const card = new Card(
        this,
        0,
        0,
        findUnitDataByType(cardName),
        false,
        false
      ).setScale(0.65);
      this.add.existing(card);
      card.x =
        this.marginX / 2 +
        (card.displayWidth + this.marginX) * ((i % this.columnCount) + 0.5);
      card.y =
        card.displayHeight / 2 +
        this.marginY * 0.8 +
        Math.floor(i / this.columnCount) * (card.displayHeight + this.marginY);
    }
  }
}
