import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../app";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({
      key: "BootScene",
    });
  }

  preload(): void {
    // progress bar
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
    // this.load.on("fileprogress", function (file) {
    //   console.log(`Loading : ${file.src}`);
    // });
    this.load.on("complete", function () {
      progressBar.destroy();
      progressBox.destroy();
    });

    // map tiles
    this.load.image("forest_tiles", "public/assets/map/forest_spritesheet.png");
    this.load.image(
      "dungeon_tiles",
      "public/assets/map/dungeon_spritesheet.png"
    );

    // maps in json format

    // forest
    this.load.tilemapTiledJSON(
      "forest_battlemap1",
      "public/assets/map/forest_battlemap1.json"
    );
    this.load.tilemapTiledJSON(
      "forest_battlemap2",
      "public/assets/map/forest_battlemap2.json"
    );
    this.load.tilemapTiledJSON(
      "forest_battlemap3",
      "public/assets/map/forest_battlemap3.json"
    );
    // corrupt forest
    this.load.tilemapTiledJSON(
      "corrupt_forest_battlemap1",
      "public/assets/map/corrupt_forest_battlemap1.json"
    );
    this.load.tilemapTiledJSON(
      "corrupt_forest_battlemap2",
      "public/assets/map/corrupt_forest_battlemap2.json"
    );
    this.load.tilemapTiledJSON(
      "corrupt_forest_battlemap3",
      "public/assets/map/corrupt_forest_battlemap3.json"
    );
    // dungeon
    this.load.tilemapTiledJSON(
      "dungeon_battlemap1",
      "public/assets/map/dungeon_battlemap1.json"
    );
    this.load.tilemapTiledJSON(
      "dungeon_battlemap2",
      "public/assets/map/dungeon_battlemap2.json"
    );
    this.load.tilemapTiledJSON(
      "dungeon_battlemap3",
      "public/assets/map/dungeon_battlemap3.json"
    );

    // characters and 16x16 icons
    this.load.spritesheet("player", "public/assets/images/RPG_assets.png", {
      frameWidth: 16,
      frameHeight: 16,
    });

    // character cards illustrations
    this.load.image("AmazonIllus", "public/assets/images/amazon.png");
    this.load.image("RenegadeIllus", "public/assets/images/renegade.png");
    this.load.image("StrangerIllus", "public/assets/images/stranger.png");
    this.load.image("ArcherIllus", "public/assets/images/archer.png");
    this.load.image("DogIllus", "public/assets/images/dog.png");
    this.load.image("MageIllus", "public/assets/images/mage.png");
    // bonus cards illustrations
    this.load.image("RangeBonusIllus", "public/assets/images/range_bonus.png");
    this.load.image(
      "DamageBonusIllus",
      "public/assets/images/damage_bonus.png"
    );
    this.load.image("MpBonusIllus", "public/assets/images/mp_bonus.png");
    this.load.image("ApBonusIllus", "public/assets/images/ap_bonus.png");
    this.load.image("HpBonusIllus", "public/assets/images/hp_bonus.png");
    this.load.image("EotBonusIllus", "public/assets/images/eot_bonus.png");
    // backgrounds
    this.load.image(
      "forest_background",
      "public/assets/images/forest_background.png"
    );
    this.load.image(
      "corrupt_forest_background",
      "public/assets/images/corrupt_forest_background.png"
    );
    this.load.image(
      "dungeon_background",
      "public/assets/images/dungeon_background.png"
    );
    this.load.image("win_image", "public/assets/images/win_image.png");
    this.load.image(
      "gameover_image",
      "public/assets/images/gameover_image.png"
    );

    // fonts
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

  create(): void {
    this.scene.start("ChooseCardScene", { isStarting: true });
  }
}
