import Phaser from "phaser";

export class MapScene extends Phaser.Scene {
  currentCharacterChoice: string;
  constructor() {
    super({
      key: "MapScene",
    });
  }

  create(data: any) {
    this.createBackground();
    this.currentCharacterChoice = data.playerType;
    this.createWorldDescription();
    this.drawDottedLine();
    this.createLocationIcons();
    this.createStartButton();
  }

  createBackground() {
    this.add.image(0, 0, "forest_background").setOrigin(0, 0).setTint(0x555555);
  }

  createStartButton() {
    const chooseText = this.add
      .bitmapText(
        this.game.scale.width / 6,
        (this.game.scale.height * 2) / 3,
        "dogicapixelbold",
        "Start !",
        32
      )
      .setDepth(1)
      .setOrigin(0.5, 0.5);
    const buttonMargin = 12;
    const chooseButton = this.add
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
          playerType: this.currentCharacterChoice,
          enemyType: "Dude",
        });
      });
  }

  private createLocationIcons() {
    const size = 60;
    const color = 0x00ff00;
    const greyedColor = 0x999999;
    const fontSize = 16;
    const innerRectangleLineWidth = 7;
    const posY = this.game.scale.height / 2.2;
    this.add.rectangle(this.game.scale.width / 6, posY, size, size, color);
    this.add
      .rectangle(this.game.scale.width / 6, posY, size / 2, size / 2)
      .setStrokeStyle(innerRectangleLineWidth, 0xffffff);
    this.add
      .bitmapText(
        this.game.scale.width / 6,
        posY - size,
        "dogicapixelbold",
        "Healthy forest",
        fontSize
      )
      .setOrigin(0.5, 0.5);
    this.add.rectangle(
      this.game.scale.width / 2,
      posY,
      size,
      size,
      greyedColor
    );
    this.add
      .rectangle(this.game.scale.width / 2, posY, size / 2, size / 2)
      .setStrokeStyle(innerRectangleLineWidth, 0x666666);
    this.add
      .bitmapText(
        this.game.scale.width / 2,
        posY - size,
        "dogicapixelbold",
        "??",
        fontSize
      )
      .setOrigin(0.5, 0.5);
    this.add.rectangle(
      (this.game.scale.width * 5) / 6,
      posY,
      size,
      size,
      greyedColor
    );
    this.add
      .rectangle((this.game.scale.width * 5) / 6, posY, size / 2, size / 2)
      .setStrokeStyle(innerRectangleLineWidth, 0x666666);
    this.add
      .bitmapText(
        (this.game.scale.width * 5) / 6,
        posY - size,
        "dogicapixelbold",
        "??",
        fontSize
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
