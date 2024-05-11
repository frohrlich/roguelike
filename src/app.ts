import "phaser";
import { BootScene } from "./scenes/BootScene";
import { BattleScene } from "./scenes/BattleScene";
import { BattleUIScene } from "./scenes/BattleUIScene";
import { EndScene } from "./scenes/EndScene";
import { ChooseCardScene } from "./scenes/ChooseCardScene";
import { MapScene } from "./scenes/MapScene";
import screenfull from "screenfull";
import { UAParser } from "ua-parser-js";
import { DeckScene } from "./scenes/DeckScene";

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
  scene: [
    BootScene,
    ChooseCardScene,
    MapScene,
    DeckScene,
    BattleScene,
    BattleUIScene,
    EndScene,
  ],
};
export class RpgGame extends Phaser.Game {
  constructor(config: Phaser.Types.Core.GameConfig) {
    super(config);
  }
}
window.onload = () => {
  const parser = new UAParser();
  const isNotDesktop =
    parser.getDevice().type === "mobile" ||
    parser.getDevice().type === "tablet";

  const gameDiv = document.getElementById("game");
  const fullscreenButton = document.getElementById("fullscreen-button");
  const rotateScreenTip = document.getElementById("rotateScreenTip");
  const fullscreenButtonDiv = document.getElementById("fullscreenButton-div");

  if (isNotDesktop) rotateScreenTip.hidden = false;

  fullscreenButton.addEventListener("click", () => {
    gameDiv.hidden = false;
    fullscreenButton.hidden = true;
    fullscreenButtonDiv.style.display = "none";
    if (isNotDesktop) {
      if (screenfull.isEnabled) {
        screenfull.request(gameDiv);
        window.screen.orientation["lock"]("landscape");
      } else {
        alert("Error ! Please refresh your navigator.");
      }
    }
  });

  // gameDiv.hidden = false;
  // fullscreenButton.hidden = true;
  // fullscreenButtonDiv.style.display = "none";

  var game = new RpgGame(config);
};
