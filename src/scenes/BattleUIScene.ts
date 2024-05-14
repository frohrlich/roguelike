import Phaser from "phaser";
import { BattleScene } from "./BattleScene";
import { Spell } from "../classes/battle/Spell";
import { UISpell } from "../classes/UI/UISpell";
import { Unit } from "../classes/battle/Unit";
import { UnitStatDisplay } from "../classes/UI/UnitStatDisplay";
import { UITimelineSlot } from "../classes/UI/UITimelineSlot";
import { UIText } from "../classes/UI/UIText";

/** Battle UI. */
export class BattleUIScene extends Phaser.Scene {
  graphics: Phaser.GameObjects.Graphics;
  battleScene: BattleScene;
  uiTabWidth: number;
  // global scale for the UI (change it when changing game resolution)
  uiScale: number = 2.5;
  uiFontColor = 0x00ff40;
  buttonTextFontSize = 32;
  offset = 2;

  leftX: number;
  uiTabHeight: number;
  uiSpells: UISpell[] = [];
  uiTimeline: UITimelineSlot[] = [];
  uiTimelineBackgrounds: Phaser.GameObjects.Rectangle[] = [];
  handle: Phaser.GameObjects.Rectangle;
  unitStats: UnitStatDisplay;
  startButtonText: Phaser.GameObjects.BitmapText;
  startButton: Phaser.GameObjects.Rectangle;
  mapWidth: number;
  height: number;

  private readonly baseStartButtonColor = 0x293154;
  private readonly onClickStartButtonColor = 0x181f33;

  constructor() {
    super({
      key: "BattleUIScene",
    });
  }

  create(): void {
    this.cameras.main.fadeIn(1000, 0, 0, 0);
    this.battleScene = this.scene.get("BattleScene") as BattleScene;
    this.unitStats = null;
    this.uiSpells = [];
    this.mapWidth = this.battleScene.map.widthInPixels;
    this.drawOutline();
    this.createStartButton();
    this.addDeckButton();
    this.updateTimeline(this.battleScene.timeline, true);
    new UIText(this, 1, 0, "Spells");
  }

  disableSpells(isDisabled: boolean) {
    this.uiSpells.forEach((uiSpell) => {
      uiSpell.disabled = isDisabled;
      uiSpell.hideIfInaccessible();
    });
  }

  addSpell(tab: number, posX: number, spell: Spell) {
    this.uiSpells.push(new UISpell(this, tab, posX, spell));
  }

  addStats(tab: number, posY: number, unit: Unit) {
    const myStats = new UnitStatDisplay(this, tab * 4, posY, unit);
    return myStats;
  }

  changeStatsUnit(unit: Unit) {
    if (!this.unitStats) {
      this.unitStats = this.addStats(0, 0, unit);
    } else {
      this.unitStats.changeUnit(unit);
    }
  }

  createStartButton() {
    const textTopMargin = 2;
    const yPos = this.uiTabHeight * 2.33 + 1;
    const xPos = this.leftX + this.uiTabWidth * 0.5;

    this.startButton = this.add
      .rectangle(xPos, yPos, this.uiTabWidth * 0.85, this.uiTabHeight * 0.56)
      .setStrokeStyle(2, 0xcccccc)
      .setInteractive();
    let fontSize = this.buttonTextFontSize;
    this.startButtonText = this.add
      .bitmapText(
        xPos,
        yPos + textTopMargin,
        "dogicapixel",
        "Fight !",
        fontSize
      )
      .setOrigin(0.5, 0.5)
      .setCenterAlign();
    this.activateEndTurnButton(true);
  }

  /** Changes start button to end turn button for the main phase of the battle. */
  createEndTurnButton() {
    this.deactivateEndTurnButton();
    this.startButtonText.text = "End\nturn";
  }

  deactivateEndTurnButton() {
    this.startButton.setFillStyle(0x15192b);
    this.startButtonText.setTint(0x00701c);
    this.startButton.off("pointerup");
    this.startButton.off("pointerdown");
    this.startButton.off("pointerout");
  }

  activateEndTurnButton(isStart: boolean = false) {
    this.startButtonText.setTint(this.uiFontColor);
    this.startButton
      .setFillStyle(this.baseStartButtonColor)
      .on("pointerdown", () => {
        this.startButton.setFillStyle(this.onClickStartButtonColor);
      })
      .on("pointerout", () => {
        this.startButton.setFillStyle(this.baseStartButtonColor);
      })
      .on("pointerup", () => {
        this.startButton.setFillStyle(this.baseStartButtonColor);
        if (isStart) {
          this.battleScene.startBattle();
        } else if (
          this.battleScene.isPlayerTurn &&
          !this.battleScene.currentPlayer.isMoving
        ) {
          this.battleScene.currentPlayer.endTurn();
        }
      });
  }

  updateTimeline(timeline: Unit[], isPreparationPhase = false) {
    // scale factor for the timeline
    const topMargin = 10;
    const leftMargin = 10;
    // first add handle on the left of the timeline
    const handleWidth = this.uiScale * 6;
    const unitHeight = timeline[0].height;
    const unitWidth = timeline[0].width;
    // we get the handle current position if it's already initialized
    let offsetX = 0;
    let offsetY = 0;
    if (this.handle) {
      // the offset corresponding to the position of the timeline once user dragged it
      // substracting initial position of the handle
      offsetX = this.handle.x - leftMargin - handleWidth / 2;
      offsetY = this.handle.y - (unitHeight * this.uiScale) / 2 - topMargin;
    }
    this.uiTimeline.forEach((slot) => {
      slot.destroy();
    });
    this.uiTimelineBackgrounds.forEach((border) => {
      border.destroy();
    });
    this.handle?.destroy();
    this.uiTimelineBackgrounds = [];
    this.uiTimeline = [];
    this.handle = this.add.rectangle(
      offsetX + leftMargin + handleWidth / 2,
      offsetY + (unitHeight * this.uiScale) / 2 + topMargin,
      handleWidth,
      unitHeight * this.uiScale,
      0x888888
    );
    for (let i = 0; i < timeline.length; i++) {
      const unit = timeline[i];
      // each slot represents a tiny unit portrait in the timeline
      let slot = new UITimelineSlot(
        this,
        offsetX +
          handleWidth +
          leftMargin +
          (i + 0.5) * unitWidth * this.uiScale,
        offsetY + (unitHeight * this.uiScale) / 2 + topMargin,
        unit,
        this.uiScale
      );
      slot.tint = unit.isSelected ? unit.selectedTint : 0xffffff;
      // on hover, highlight the timeline slot and its corresponding unit
      slot.setInteractive();
      slot.on("pointerover", () => {
        slot.unit.selectUnit();
      });
      slot.on("pointerout", () => {
        slot.unit.unselectUnit();
      });
      // add background color to identify team
      let background = this.add.rectangle(
        offsetX +
          handleWidth +
          leftMargin +
          (i + 0.5) * unitWidth * this.uiScale,
        offsetY + (unitHeight * this.uiScale) / 2 + topMargin,
        unitWidth * this.uiScale,
        unitHeight * this.uiScale,
        unit.isAlly ? 0x0000ff : 0xff0000,
        0.3
      );
      this.uiTimelineBackgrounds.push(background);
      this.uiTimeline.push(slot);
      this.add.existing(slot);
    }

    // move the timeline around by grabbing the handle
    this.makeTimelineHandleDraggable(unitWidth, handleWidth);

    if (!isPreparationPhase) this.highlightCurrentUnitInTimeline(timeline);
  }

  private highlightCurrentUnitInTimeline(timeline: Unit[]) {
    let fillIndex = 0;
    if (this.battleScene.timelineIndex < timeline.length) {
      fillIndex = this.battleScene.timelineIndex;
    }
    const currentBackground = this.uiTimelineBackgrounds[fillIndex];
    if (currentBackground) currentBackground.fillColor = 0xffffff;
  }

  private makeTimelineHandleDraggable(unitWidth: number, handleWidth: number) {
    this.handle.setInteractive({ draggable: true });
    this.handle.on(
      "drag",
      (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        this.handle.setPosition(dragX, dragY);
        for (let i = 0; i < this.uiTimeline.length; i++) {
          const slot = this.uiTimeline[i];
          const background = this.uiTimelineBackgrounds[i];
          let posX =
            (i + 0.5) * unitWidth * this.uiScale + handleWidth / 2 + dragX;
          slot.setPosition(posX, dragY);
          background.setPosition(posX, dragY);
        }
      }
    );
  }

  drawOutline() {
    const bounds = this.battleScene.cameras.main.getBounds();
    const zoom = this.battleScene.cameras.main.zoom;
    this.leftX = this.mapWidth * zoom;
    this.height = bounds.height * zoom;
    const uiTabHeight = (this.height - this.offset * 2) / 3;
    const uiWidth = this.game.canvas.width - this.leftX - this.offset;

    this.graphics = this.add.graphics();
    this.graphics.lineStyle(4, 0x79ae55);
    this.graphics.fillStyle(0x1d233c, 1);
    this.graphics.strokeRect(this.leftX, this.offset, uiWidth, uiTabHeight);
    this.graphics.fillRect(this.leftX, this.offset, uiWidth, uiTabHeight);
    this.graphics.strokeRect(
      this.leftX,
      uiTabHeight + this.offset,
      uiWidth,
      uiTabHeight
    );
    this.graphics.fillRect(
      this.leftX,
      uiTabHeight + this.offset,
      uiWidth,
      uiTabHeight
    );
    this.graphics.strokeRect(
      this.leftX,
      uiTabHeight * 2 + this.offset,
      uiWidth,
      uiTabHeight
    );
    this.graphics.fillRect(
      this.leftX,
      uiTabHeight * 2 + this.offset,
      uiWidth,
      uiTabHeight
    );

    this.uiTabHeight = uiTabHeight;
    this.uiTabWidth = uiWidth;
  }

  endPlayerTurn() {
    this.clearSpellsHighlight();
    this.refreshSpells();
    this.disableSpells(true);
    this.deactivateEndTurnButton();
  }

  startPlayerTurn() {
    this.activateEndTurnButton();
    this.changeStatsUnit(this.battleScene.currentPlayer);
    this.refreshSpells();
    this.disableSpells(false);
    this.refreshUI();
  }

  refreshUI() {
    this.uiSpells?.forEach((uiSpell) => {
      uiSpell.refresh();
    });
    this.unitStats?.refresh();
  }

  /** Displays unit spells on the spell slots of the UI. */
  displaySpells(unit: Unit) {
    for (let i = 0; i < unit.spells.length; i++) {
      const spell = unit.spells[i];
      this.addSpell(1.15, 0.14 + 0.33 * i, spell);
    }
  }

  refreshSpells() {
    this.uiSpells.forEach((uiSpell) => {
      uiSpell.destroy();
    });
    this.uiSpells = [];
    this.displaySpells(this.battleScene.currentPlayer);
  }

  clearSpellsHighlight() {
    this.uiSpells.forEach((uiSpell) => {
      uiSpell.isHighlighted = false;
      uiSpell.refresh();
    });
  }

  addDeckButton() {
    const buttonWidth = 70;
    const buttonHeight = 40;
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
      .on("pointerup", () =>
        this.scene.launch("DeckScene").bringToTop("DeckScene")
      );

    this.add
      .bitmapText(
        this.game.scale.width - buttonWidth / 2 - margin,
        this.game.scale.height - buttonHeight / 2 - margin,
        "dogicapixel",
        "Deck",
        16
      )
      .setOrigin(0.5, 0.5);
  }
}
