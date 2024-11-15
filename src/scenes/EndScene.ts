import Phaser from "phaser";

interface EndSceneData {
  isWin: boolean;
}

export class EndScene extends Phaser.Scene {
  constructor() {
    super({
      key: "EndScene",
    });
  }

  preload() {
    this.loadBackgroundImage("win_image");
    this.loadBackgroundImage("gameover_image");
  }

  create(data: EndSceneData): void {
    this.createBackground(data.isWin);
    this.createText(data.isWin);
    this.createPlayAgainButton();
  }

  createPlayAgainButton() {
    const posX = this.game.scale.width / 2;
    const text = this.add
      .bitmapText(
        posX,
        (this.game.scale.height * 3) / 4,
        "dogicapixelbold",
        "Play again",
        32
      )
      .setDepth(1)
      .setOrigin(0.5, 0.5);
    const buttonMargin = 12;
    const startButton = this.add
      .rectangle(
        text.x,
        text.y - buttonMargin / 2,
        text.displayWidth + buttonMargin * 2,
        text.displayHeight + buttonMargin * 2,
        0x00aa00
      )
      .setStrokeStyle(2, 0xffffff)
      .setOrigin(0.5, 0.5)
      .setInteractive()
      .on("pointerdown", () => {
        startButton.setFillStyle(0x007c00);
      })
      .on("pointerout", () => {
        startButton.setFillStyle(0x00aa00);
      })
      .on("pointerup", () => {
        startButton.setFillStyle(0x00aa00);
        this.scene.start("ChooseCardScene", { isStarting: true });
      });
  }

  private createText(isWin: boolean) {
    const text = isWin ? "Congratulations, you win !" : "Game over...";
    const gameWidth = this.game.config.width as number;
    const gameHeight = this.game.config.height as number;
    const myText = this.add.bitmapText(
      gameWidth / 2,
      gameHeight / 2,
      "dogicapixel",
      text.toUpperCase(),
      40
    );
    myText.setOrigin(0.5, 0.5);
  }

  private createBackground(isWin: boolean) {
    const imageKey = isWin ? "win_image" : "gameover_image";
    this.add.image(0, 0, imageKey).setOrigin(0, 0).setTint(0x555555);
  }

  private loadBackgroundImage(key: string) {
    this.load.image(key, `public/assets/images/backgrounds/${key}.png`);
  }
}
