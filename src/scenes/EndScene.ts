import Phaser from "phaser";

export class EndScene extends Phaser.Scene {
  constructor() {
    super({
      key: "EndScene",
    });
  }

  create(data: any): void {
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
    this.add
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
      .on("pointerup", () => {
        this.scene.start("ChooseCardScene", { isStarting: true });
      });
  }

  private createText(isWin: boolean) {
    let text = isWin ? "Congratulations, you win !" : "Game over...";
    let gameWidth = this.game.config.width as number;
    let gameHeight = this.game.config.height as number;
    let myText = this.add.bitmapText(
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
}
