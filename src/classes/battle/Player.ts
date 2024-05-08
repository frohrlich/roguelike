import Phaser from "phaser";
import { Unit } from "./Unit";
import { Spell } from "./Spell";

// playable character in battle
export class Player extends Unit {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame: number,
    indX: number,
    indY: number,
    maxMp: number,
    maxAp: number,
    maxHp: number,
    isAlly: boolean
  ) {
    super(scene, x, y, texture, frame, indX, indY, maxMp, maxAp, maxHp, isAlly);
  }

  // plays at the end of deplacement
  override nextAction(): void {
    this.battleScene.clearAccessibleTiles();
    this.battleScene.refreshAccessibleTiles();
    this.battleScene.highlightAccessibleTiles(this.battleScene.accessibleTiles);
  }

  override endTurn(): void {
    const scene = this.battleScene;
    scene.clearAccessibleTiles();
    scene.clearOverlay();
    scene.clearAoeZone();
    scene.clearPointerEvents();
    scene.spellVisible = false;
    super.endTurn();
  }

  override castSpell(
    spell: Spell,
    targetVec: Phaser.Math.Vector2,
    bonusDamage: number = 0
  ): void {
    super.castSpell(spell, targetVec, bonusDamage);
    // if spell not available anymore : quit spell mode
    if (this.ap < spell.cost || spell.cooldown > 0) {
      this.battleScene.clearSpellRange();
      this.battleScene.refreshAccessibleTiles();
      this.battleScene.highlightAccessibleTiles(
        this.battleScene.accessibleTiles
      );
    }
  }
}
