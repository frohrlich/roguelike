import Phaser from "phaser";
import { Card } from "./Card";
import { UnitData } from "../../services/UnitService";
import { SpellService } from "../../services/SpellService";
import { CardUISpell } from "./CardUISpell";

export class CharacterCard extends Card {
  unitData: UnitData;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    isOnRight: boolean,
    isInChooseCardScene: boolean,
    unitData: UnitData
  ) {
    super(scene, x, y, isOnRight, isInChooseCardScene);
    this.unitData = unitData;
    this.descriptionText = unitData.description;
    this.name = unitData.type;
    this.illustrationName = unitData.type;

    this.makeIllustration();
    this.makeName(this.name);
    this.makeCharacteristics();
    this.makeCharacterIcon();
    this.makeCardOutline();
    this.makeSpellIcons();
  }

  makeSpellIcons() {
    const spells = SpellService.decodeSpellString(this.unitData.spells);
    for (let i = 0; i < spells.length; i++) {
      const spell = spells[i];
      this.add(
        new CardUISpell(
          this.scene,
          (this.cardWidth * (i - 1)) / 3.2,
          this.cardHeight / 6,
          spell,
          this.isInChooseCardScene
        ).setName("toggle")
      );
    }
  }

  makeCharacterIcon() {
    this.add(
      new Phaser.GameObjects.Image(
        this.scene,
        0,
        -this.cardHeight / 8,
        "player",
        this.unitData.frame
      )
        .setScale(4)
        .setAlpha(0.7)
        .setName("toggle")
    );
  }

  makeCharacteristics() {
    const margin = 10;
    // MP
    this.add(
      new Phaser.GameObjects.BitmapText(
        this.scene,
        -this.cardWidth / 2 + margin,
        this.cardHeight / 2 - this.caracFontSize - margin,
        "dogicapixel",
        this.unitData.MP.toString(),
        this.caracFontSize
      ).setName("toggle")
    );
    // AP
    this.add(
      new Phaser.GameObjects.BitmapText(
        this.scene,
        this.cardWidth / 2 - this.caracFontSize - margin,
        this.cardHeight / 2 - this.caracFontSize - margin,
        "dogicapixel",
        this.unitData.AP.toString(),
        this.caracFontSize
      )
        .setTint(0x33c6f7)
        .setName("toggle")
    );
    // HP
    this.add(
      new Phaser.GameObjects.BitmapText(
        this.scene,
        0,
        this.cardHeight / 2 - this.caracFontSize - margin,
        "dogicapixel",
        this.unitData.HP.toString(),
        this.caracFontSize
      )
        .setTint(0xff0000)
        .setOrigin(0.5, 0)
        .setName("toggle")
    );
  }
}
