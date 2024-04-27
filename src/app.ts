import "phaser";
import { BootScene } from "./scenes/BootScene";
import { BattleScene } from "./scenes/BattleScene";
import { BattleUIScene } from "./scenes/BattleUIScene";
import { GameOverScene } from "./scenes/GameOverScene";

export const GAME_WIDTH = 930; // xiaomi mi a3 : 19.5:9 ratio
export const GAME_HEIGHT = 416;

const config = {
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.FIT,
    parent: "game",
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  pixelArt: true,
  backgroundColor: "#000000",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, BattleScene, BattleUIScene, GameOverScene],
};
export class RpgGame extends Phaser.Game {
  constructor(config: Phaser.Types.Core.GameConfig) {
    super(config);
  }
}
window.onload = () => {
  var game = new RpgGame(config);
};
