import Phaser from "phaser";
import { UIElement } from "./UIElement";
import { Spell } from "../battle/Spell";
import { BattleScene } from "../../scenes/BattleScene";

export class UISpell extends UIElement {
  iconScale = 1.1;
  highlightFrameFrame = 45;

  spell: Spell;
  icon: Phaser.GameObjects.Image;
  highlightIcon: Phaser.GameObjects.Image;
  battleScene: BattleScene;
  isHighlighted: boolean = false;

  infoRectangle: Phaser.GameObjects.Rectangle;
  infoText: Phaser.GameObjects.BitmapText;
  spellNameInfoText: Phaser.GameObjects.BitmapText;
  outlineRectangle: Phaser.GameObjects.Rectangle;

  spellCooldown: Phaser.GameObjects.BitmapText;
  disabled: boolean;

  constructor(scene: Phaser.Scene, tab: number, posX: number, spell: Spell) {
    super(scene, tab, posX);
    this.spell = spell;
    this.battleScene = this.myScene.battleScene;
    this.addRegularIcon();
    this.addHighlightFrame();
    this.addInfoText();
    this.createSpellCooldown();
    this.disabled = false;
  }

  private showInfo(show: boolean) {
    this.infoRectangle.visible = show;
    this.outlineRectangle.visible = show;
    this.infoText.visible = show;
    this.spellNameInfoText.visible = show;
  }

  addIcon(highlight: boolean) {
    const scale = this.myScene.uiScale;
    const iconFrame = highlight ? this.highlightFrameFrame : this.spell.frame;

    const icon = this.myScene.add
      .image(this.x, this.y, "player", iconFrame)
      .setScale(scale * this.iconScale)
      .setDepth(50000)
      .setVisible(!highlight)
      .setInteractive()
      .on("pointerup", () => {
        this.toggleSpellMode();
      })
      .on("pointerover", () => {
        this.showInfo(true);
      })
      .on("pointerout", () => {
        this.showInfo(false);
      });
    icon.y += icon.displayHeight / 2 - 2;

    if (highlight) {
      this.highlightIcon = icon;
    } else {
      this.icon = icon;
    }
  }

  addRegularIcon() {
    this.addIcon(false);
  }

  addHighlightFrame() {
    this.addIcon(true);
  }

  private toggleSpellMode() {
    if (
      this.battleScene.isPlayerTurn &&
      !this.battleScene.currentPlayer.isMoving
    ) {
      if (!this.isInaccessible()) {
        this.activateSpell();
      }
    }
  }

  private activateSpell() {
    this.battleScene.clearSpellRange();
    this.myScene.clearSpellsHighlight();
    this.isHighlighted = true;
    this.refresh();
    this.battleScene.displaySpellRange(this.spell);
  }

  /** Defines spell info text and draws it. */
  addInfoText() {
    const infoOffset = this.icon.displayWidth / 2;
    const lineHeight = this.fontSize + 1;

    // spell name text in bold
    const spellNameText = `${this.spell.name}`;
    // spell cost
    let text = `\ncost: ${this.spell.cost} AP`;
    // spell range
    text += `\n${this.spell.minRange}-${this.spell.maxRange} range`;
    // spell max cooldown
    // if (this.spell.maxCooldown > 0) {
    //   text += `\ncooldown: ${this.spell.maxCooldown}`;
    // }
    // spell damage
    if (this.spell.damage > 0) {
      text += `\ndamage : ${this.getCalculatedDamage(this.spell)}`;
    }
    // spell heal
    if (this.spell.heal > 0) {
      text += `\nheal : ${this.spell.heal}`;
    }
    // spell malus AP
    if (this.spell.malusAP > 0) {
      text += `\n-${this.spell.malusAP} AP`;
    }
    // spell bonus AP
    if (this.spell.bonusAP > 0) {
      text += `\n+${this.spell.bonusAP} AP`;
    }
    // spell malus MP
    if (this.spell.malusMP > 0) {
      text += `\n-${this.spell.malusMP} MP`;
    }
    // spell bonus MP
    if (this.spell.bonusMP > 0) {
      text += `\n+${this.spell.bonusMP} MP`;
    }
    // spell effect over time
    if (this.spell.effectOverTime) {
      text += `\neffect : ${this.spell.effectOverTime.name}(${this.spell.effectOverTime.duration})`;
    }
    // spell summoned unit
    if (this.spell.summons) {
      text += `\nsummons : ${this.spell.summons.type}`;
    }
    // spell push/pull
    if (this.spell.moveTargetBy) {
      const pushOrPull = this.spell.moveTargetBy > 0 ? "push" : "pull";
      text += `\n${pushOrPull} (${Math.abs(this.spell.moveTargetBy)})`;
    }

    this.displayInfoText(spellNameText, this.fontSize, text);
    this.displayInfoTextOutline(infoOffset, this.myScene.uiScale, lineHeight);
  }

  private displayInfoText(
    spellNameText: string,
    fontSize: number,
    text: string
  ) {
    this.spellNameInfoText = this.myScene.add.bitmapText(
      0,
      0,
      "dogicapixelbold",
      spellNameText,
      fontSize
    );
    this.spellNameInfoText.depth = 20001;
    this.spellNameInfoText.visible = false;
    this.spellNameInfoText.alpha = 0.95;

    this.infoText = this.myScene.add.bitmapText(
      0,
      0,
      "dogicapixel",
      text,
      fontSize
    );
    this.infoText.depth = 20001;
    this.infoText.visible = false;
    this.infoText.alpha = 0.95;
  }

  private displayInfoTextOutline(
    infoOffset: number,
    lineWidth: number,
    lineHeight: number
  ) {
    const spellTitleLeftMargin = 2;
    const spellTitleTopMargin = 3;
    const infoTextLeftMargin = 4;
    const infoTextTopMargin = lineHeight / 2;

    const width = Math.max(
      this.infoText.displayWidth,
      this.spellNameInfoText.displayWidth
    );
    const height =
      this.infoText.displayHeight + this.spellNameInfoText.displayHeight - 9;

    const xPos = this.x - width / 2 - infoOffset;
    const yPos = this.y - height / 2 - infoOffset;

    this.infoRectangle = this.myScene.add.rectangle(
      xPos,
      yPos,
      width + infoTextLeftMargin * 2,
      height,
      0x31593b
    );
    this.infoRectangle.depth = 20000;
    this.infoRectangle.alpha = 0.95;
    this.infoRectangle.visible = false;

    this.outlineRectangle = this.myScene.add.rectangle(
      xPos,
      yPos,
      width + infoTextLeftMargin * 2 + lineWidth,
      height + lineWidth
    );
    this.outlineRectangle.setStrokeStyle(lineWidth + 0.5, 0xffffff);
    this.outlineRectangle.alpha = 0.95;
    this.outlineRectangle.visible = false;

    this.spellNameInfoText.setPosition(
      this.infoRectangle.x -
        this.infoRectangle.displayWidth / 2 +
        spellTitleLeftMargin,
      this.infoRectangle.y -
        this.infoRectangle.displayHeight / 2 +
        spellTitleTopMargin
    );
    this.infoText.setPosition(
      this.infoRectangle.x -
        this.infoRectangle.displayWidth / 2 +
        infoTextLeftMargin,
      this.infoRectangle.y -
        this.infoRectangle.displayHeight / 2 +
        infoTextTopMargin
    );
  }

  /** Disable spell visually if player cannot cast it. */
  hideIfInaccessible() {
    if (this.isInaccessible()) {
      this.icon.tint = 0x00a025;
    } else {
      this.icon.tint = 0xffffff;
    }
  }

  /** True if unit cannot currently cast this spell. */
  isInaccessible() {
    if (!this.battleScene.currentPlayer) return null;
    return (
      this.disabled ||
      this.battleScene.currentPlayer.ap < this.spell.cost ||
      this.spell.cooldown > 0
    );
  }

  override refresh(): void {
    this.createSpellCooldown();
    this.highlightIcon.visible = this.isHighlighted;
    this.hideIfInaccessible();

    if (this.spell.cooldown > 0) {
      this.showSpellCooldown(true);
    } else {
      this.showSpellCooldown(false);
    }
  }

  showSpellCooldown(isVisible: boolean) {
    this.spellCooldown.visible = isVisible;
  }

  createSpellCooldown() {
    this.spellCooldown?.destroy();

    this.spellCooldown = this.myScene.add.bitmapText(
      this.icon.x,
      this.icon.y + 2,
      "dogicapixel",
      this.spell.cooldown.toString(),
      this.fontSize * 1.8
    );
    this.spellCooldown.setOrigin(0.5);
    this.spellCooldown.depth = 50001;
    this.spellCooldown.visible = false;
  }

  destroy() {
    this.highlightIcon.destroy();
    this.icon.destroy();
    this.infoRectangle.destroy();
    this.infoText.destroy();
    this.spellNameInfoText.destroy();
    this.outlineRectangle.destroy();
    this.spellCooldown.destroy();
  }

  getCalculatedDamage(spell: Spell) {
    return spell.damage * (1 + this.battleScene.damageBonus * 0.01);
  }
}
