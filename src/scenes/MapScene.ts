import Phaser from "phaser";
import { MapService } from "../services/MapService";

export class MapScene extends Phaser.Scene {
  locationCount = 3;
  locationSize = 60;
  discoveredLocationColor = 0x00ff00;
  undiscoveredLocationColor = 0x999999;
  locationFontSize = 16;
  innerRectangleLineWidth = 7;
  iconsPosYFactor = 2.2;

  locationNames: string[] = [];

  constructor() {
    super({
      key: "MapScene",
    });
  }

  create() {
    if (MapService.position === 0) {
      this.locationNames = [];
      this.initializeLocationNames();
    }
    this.createBackground();
    this.createWorldDescription();
    this.drawDottedLine();
    this.createLocationIcons();
    this.createStartButton();
  }

  initializeLocationNames() {
    for (let i = 0; i < this.locationCount; i++) {
      this.locationNames.push(MapService.getRandomForestName());
    }
  }

  createBackground() {
    this.add.image(0, 0, "forest_background").setOrigin(0, 0).setTint(0x555555);
  }

  createStartButton() {
    const posX = (this.game.scale.width / 6) * (1 + 2 * MapService.position);
    const chooseText = this.add
      .bitmapText(
        posX,
        (this.game.scale.height * 2) / 3,
        "dogicapixelbold",
        "Start !",
        32
      )
      .setDepth(1)
      .setOrigin(0.5, 0.5);
    const buttonMargin = 12;
    this.add
      .rectangle(
        chooseText.x,
        chooseText.y - buttonMargin / 2,
        chooseText.displayWidth + buttonMargin * 2,
        chooseText.displayHeight + buttonMargin * 2,
        0x00aa00
      )
      .setStrokeStyle(2, 0xffffff)
      .setOrigin(0.5, 0.5)
      .setInteractive()
      .on("pointerup", () => {
        this.scene.start("BattleScene", {
          enemyType: "Pig",
        });
      });
  }

  private createLocationIcons() {
    for (let i = 0; i < this.locationCount; i++) {
      this.createLocation(
        i,
        i <= MapService.position ? this.locationNames[i] : "??",
        i < MapService.position
      );
    }
  }

  private createLocation(pos: number, name: string, isDiscovered: boolean) {
    const posX = (this.game.scale.width / 6) * (1 + 2 * pos);
    const posY = this.game.scale.height / this.iconsPosYFactor;
    const color = isDiscovered
      ? this.discoveredLocationColor
      : this.undiscoveredLocationColor;
    this.add.rectangle(posX, posY, this.locationSize, this.locationSize, color);
    this.add
      .rectangle(posX, posY, this.locationSize / 2, this.locationSize / 2)
      .setStrokeStyle(this.innerRectangleLineWidth, 0xffffff);
    this.add
      .bitmapText(
        posX,
        posY - this.locationSize,
        "dogicapixelbold",
        name,
        this.locationFontSize
      )
      .setOrigin(0.5, 0.5);
  }

  drawDottedLine() {
    const posY = this.game.scale.height / 2.2;
    let graphics = this.add.graphics();
    graphics.lineStyle(4, 0x666666, 1);
    graphics.beginPath();
    let dash_length = 15;
    let gap_length = 15;
    let x = this.game.scale.width / 6;
    let y = posY;
    graphics.moveTo(x, y);
    while (x < this.game.scale.width) {
      x += dash_length;
      graphics.lineTo(x, y);
      x += gap_length;
      graphics.moveTo(x, y);
      graphics.closePath();
      graphics.strokePath();
    }
  }

  private createWorldDescription() {
    const fontSize = 24;
    const bottomMargin = fontSize / 2;
    this.add
      .bitmapText(
        this.game.scale.width / 2,
        this.game.scale.height - bottomMargin,
        "dogicapixel",
        "Your journey begins in a beautiful forest...",
        fontSize
      )
      .setOrigin(0.5, 1);
  }
}
