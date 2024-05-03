import Phaser from "phaser";
import { Unit } from "./Unit";
import { Spell } from "./Spell";

// non-player characters in battle
export class Npc extends Unit {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame: number,
    indX: number,
    indY: number,
    maxPm: number,
    maxPa: number,
    maxHp: number,
    isAlly: boolean
  ) {
    super(scene, x, y, texture, frame, indX, indY, maxPm, maxPa, maxHp, isAlly);
  }

  override playTurn() {
    super.playTurn();
    this.playNpcTurn();
  }

  private playNpcTurn() {
    if (!this.isDead() && this.canDoSomething()) {
      // first advance towards nearest foe
      if (this.mp > 0) {
        let { nearestFoe, pathToNearestFoe, distance } = this.findNearestFoe();

        if (nearestFoe) {
          // if foe already at contact no need to move...
          if (distance === 0) {
            this.castFirstSpellOrEndTurn(nearestFoe);
          } else {
            pathToNearestFoe = pathToNearestFoe.slice(0, this.mp);
            this.moveAlong(pathToNearestFoe);
            this.once("endOfDeplacementReached", (unit: Unit) => {
              if (this === unit) {
                // then try to cast spell if there is a target available
                this.castFirstSpellOrEndTurn(nearestFoe);
              }
            });
          }
        }
      }
    } else if (!this.myScene.battleIsFinished() && !this.myScene.gameIsOver()) {
      this.waitBeforeEndTurn();
    }
  }

  private canDoSomething() {
    return this.mp || this.isCastable(this.spells[0]);
  }

  private castFirstSpellOrEndTurn(nearestFoe: Unit) {
    const spell = this.spells[0];
    if (this.isCastable(spell)) {
      this.tryToCastSpell(spell, nearestFoe);
    } else {
      this.endTurn();
    }
  }

  private waitBeforeEndTurn() {
    this.scene.time.addEvent({
      delay: 400,
      callback: this.endTurn,
      callbackScope: this,
    });
  }

  private findNearestFoe() {
    let foes = this.isAlly ? this.myScene.enemies : this.myScene.allies;

    let nearestFoe: Unit = null;
    let distance = 9999;
    let pathToNearestFoe = null;

    foes.forEach((foe: Unit) => {
      // first check for foes already at contact
      if (this.myScene.getManhattanDistance(this, foe) === 1) {
        distance = 0;
        nearestFoe = foe;
        pathToNearestFoe = null;
        return { nearestFoe, pathToNearestFoe, distance };
      }

      const path = this.myScene.getPathBetweenPositions(
        this.indX,
        this.indY,
        foe.indX,
        foe.indY,
        true
      );
      if (path && path.length < distance) {
        distance = path.length;
        nearestFoe = foe;
        pathToNearestFoe = path;
      }
    });
    return { nearestFoe, pathToNearestFoe, distance };
  }

  private isCastable(spell: Spell) {
    return this.ap >= spell.cost && spell.cooldown <= 0;
  }

  private tryToCastSpell(spell: Spell, targetUnit = null) {
    let targetVec: Phaser.Math.Vector2 = null;
    if (targetUnit && this.isUnitTargetableWithSpell(spell, targetUnit)) {
      targetVec = new Phaser.Math.Vector2(targetUnit.indX, targetUnit.indY);
    } else {
      let x: number, y: number;
      let targetTile = this.locateTarget(spell);
      if (targetTile) {
        ({ x, y } = this.locateTarget(spell));
      }
      if (x && y) {
        targetVec = new Phaser.Math.Vector2(x, y);
      }
    }
    if (targetVec) {
      this.castSpell(spell, targetVec);
      // wait till attack animation is finished
      // also verify npc didn't kill itself during spell cast
      // and that battle is not finished
      if (!this.myScene.battleIsFinished() && !this.myScene.gameIsOver()) {
        this.waitBeforeEndTurn();
      }
    } else {
      this.endTurn();
    }
  }

  private isUnitTargetableWithSpell(spell: Spell, targetUnit: any) {
    return this.myScene.isTileAccessibleToSpell(
      this,
      spell,
      this.myScene.backgroundLayer.getTileAt(targetUnit.indX, targetUnit.indY)
    );
  }

  // locates an accessible target for a given spell
  locateTarget(spell: Spell) {
    return this.myScene.backgroundLayer?.findTile(
      (tile) =>
        // if there is a unit there, and it's an enemy, and there is a line of sight
        // then it's a valid target
        this.myScene.isUnitThere(tile.x, tile.y) &&
        this.isFoe(this.myScene.getUnitAtPos(tile.x, tile.y)!) &&
        this.myScene.isTileAccessibleToSpell(this, spell, tile)
    );
  }

  // return true if the given unit is a foe for this npc
  isFoe(unit: Unit) {
    return this.isAlly ? !unit.isAlly : unit.isAlly;
  }
}
