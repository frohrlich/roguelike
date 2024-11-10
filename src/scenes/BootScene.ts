import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../app";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({
      key: "BootScene",
    });
  }

  preload(): void {
    this.setupProgressBar();
    this.setupCharacters();
    this.loadFonts();
  }

  private loadFonts() {
    this.load.bitmapFont(
      "dogicapixel",
      "public/assets/fonts/dogicapixel.png",
      "public/assets/fonts/dogicapixel.xml"
    );
    this.load.bitmapFont(
      "dogicapixelbold",
      "public/assets/fonts/dogicapixelbold.png",
      "public/assets/fonts/dogicapixelbold.xml"
    );
  }

  private setupCharacters() {
    // characters and 16x16 icons
    this.load.spritesheet("player", "public/assets/images/RPG_assets.png", {
      frameWidth: 16,
      frameHeight: 16,
    });
  }

  private setupProgressBar() {
    const progressBarHeight = 50;
    const progressBarOffset = 10;
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(
      GAME_WIDTH / 4,
      GAME_HEIGHT / 2 - progressBarHeight / 2,
      GAME_WIDTH / 2,
      progressBarHeight
    );

    this.load.on("progress", function (value: number) {
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(
        GAME_WIDTH / 4 + progressBarOffset,
        GAME_HEIGHT / 2 - progressBarHeight / 2 + progressBarOffset,
        (GAME_WIDTH / 2 - progressBarOffset * 2) * value,
        30
      );
    });
    this.load.on("complete", function () {
      progressBar.destroy();
      progressBox.destroy();
    });
  }

  create(): void {
    this.scene.start("ChooseCardScene", { isStarting: true });
  }
}
