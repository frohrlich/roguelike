import Phaser from "phaser";
import { Card } from "./Card";
import { BonusData } from "../../services/DeckService";

export class BonusCard extends Card {
  descFontSize = 16;

  bonusData: BonusData;
  onCardDescriptionText: string;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    isOnRight: boolean,
    isInChooseCardScene: boolean,
    bonusData: BonusData
  ) {
    super(scene, x, y, isOnRight, isInChooseCardScene);
    this.bonusData = bonusData;
    this.descriptionText = bonusData.description;
    this.onCardDescriptionText = bonusData.onCardDescription;
    this.name = bonusData.type;
    this.illustrationName = bonusData.type;

    this.makeIllustration();
    this.makeName(bonusData.name);
    this.makeOnCardDescription();
    this.makeCardOutline();
  }

  makeOnCardDescription() {
    this.add(
      new Phaser.GameObjects.BitmapText(
        this.scene,
        0,
        0,
        "dogicapixel",
        this.onCardDescriptionText,
        this.descFontSize,
        Phaser.GameObjects.BitmapText.ALIGN_CENTER
      )
        .setOrigin(0.5, 0.5)
        .setName("toggle")
    );
  }
}
