import Phaser from "phaser";
import { BattleScene } from "../../scenes/BattleScene";
import { Spell } from "./Spell";
import { UITimelineSlot } from "../UI/UITimelineSlot";
import { EffectOverTime } from "./EffectOverTime";

export class Unit extends Phaser.GameObjects.Sprite {
  // use these to manipulate sprite positions around units (healthbar, effect icons etc)
  healthBarOverUnitOffset = 7;
  healthBarUnderUnitOffset = 32;
  effectIconOverUnitOffset = 19;
  effectIconUnderUnitOffset = 53;
  healthBarScale = 1.2;

  selectedTint = 0x777777;

  myScene: BattleScene;
  // position on the grid
  indX: number;
  indY: number;
  // movement points
  maxMp: number;
  mp: number;
  // action points
  maxAp: number;
  ap: number;
  // health points
  maxHp: number;
  hp: number;
  // pathfinding
  movePath: Phaser.Math.Vector2[] = [];

  // name representing the apparence of the unit
  textureStr: string;
  direction: string;
  isMoving: boolean;
  // chain of tweens containing the successive moving tweens in path from tile A to tile B
  moveChain: any = {};
  frameNumber: number;
  isAlly: boolean;
  healthBar!: Phaser.GameObjects.Graphics;
  // team identifier under unit's feet (blue ally, red enemy)
  identifier!: Phaser.GameObjects.Image;
  spells: Spell[] = [];
  timelineSlot!: UITimelineSlot;
  effectOverTime: EffectOverTime = null;
  effectIcon: Phaser.GameObjects.Image;
  summonedUnits: Unit[] = [];
  isSelected: boolean;

  private readonly blueTeamIdentifierFrame = 45;

  private readonly redTeamIdentifierFrame = 44;

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
    super(scene, x, y, texture, frame);
    this.myScene = this.scene as BattleScene;
    this.indX = indX;
    this.indY = indY;
    this.textureStr = texture;
    this.maxMp = maxMp;
    this.maxAp = maxAp;
    this.ap = maxAp;
    this.mp = maxMp;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.direction = "";
    this.isMoving = false;
    this.frameNumber = frame;
    this.isAlly = isAlly;

    // tween move chain setup
    this.moveChain.targets = this;
    this.moveChain.onStart = () => {
      // depth is same as y
      // so units lower on the screen appear on top
      this.depth = this.y;
      this.isMoving = true;
    };
    this.moveChain.onComplete = this.stopMovement;
    this.moveChain.tweens = [];

    this.addHoverEvents();
  }

  addHoverEvents() {
    this.on("pointerover", () => {
      this.selectUnit();
    });
    this.on("pointerout", () => {
      this.unselectUnit();
    });
  }

  /** On select, highlight unit, show healthbar and effect icon, and show unit stats in UI. */
  selectUnit() {
    this.isSelected = true;
    this.tint = this.selectedTint;
    this.timelineSlot.tint = this.selectedTint;
    this.healthBar.setVisible(true);
    if (this.effectIcon) this.effectIcon.setVisible(true);
    this.myScene.uiScene.changeStatsUnit(this);
  }

  unselectUnit() {
    this.isSelected = false;
    this.tint = 0xffffff;
    this.timelineSlot.tint = 0xffffff;
    this.healthBar.setVisible(false);
    if (this.effectIcon) this.effectIcon.setVisible(false);
    this.myScene.uiScene.changeStatsUnit(this.myScene.currentPlayer);
  }

  // refills movement points at turn beginning
  refillPoints() {
    this.mp = this.maxMp;
    this.ap = this.maxAp;
  }

  // move along a path
  moveAlong(path: Phaser.Math.Vector2[]) {
    if (!path || path.length <= 0 || path.length > this.mp) {
      if (this.isMoving) {
        // when end of path is reached, start the chain of movement tweens
        this.scene.tweens.chain(this.moveChain);
      }
      return;
    }

    this.movePath = path;
    this.moveTo(this.movePath.shift()!);
  }

  // check next direction to take, update tile position and mp,
  // and call move function that adds the actual movement to the tween chain
  moveTo(target: Phaser.Math.Vector2) {
    this.myScene.removeFromObstacleLayer(this);
    let { x, y } = target;
    // left
    if (this.indX - x == 1) {
      this.direction = "left";
      this.move(this.direction);
      this.indX--;
      this.mp--;
    }
    // right
    else if (this.indX - x == -1) {
      this.direction = "right";
      this.move(this.direction);
      this.indX++;
      this.mp--;
      // down
    } else if (this.indY - y == -1) {
      this.direction = "down";
      this.move(this.direction);
      this.indY++;
      this.mp--;
      // up
    } else if (this.indY - y == 1) {
      this.direction = "up";
      this.move(this.direction);
      this.indY--;
      this.mp--;
    }
    this.myScene.addToObstacleLayer(
      new Phaser.Math.Vector2(this.indX, this.indY)
    );
    this.moveAlong(this.movePath);
  }

  // actual moving of the player
  // via tweens
  move(direction: string) {
    this.isMoving = true;
    if (direction === "left" || direction === "right") {
      const deltaX = direction === "left" ? -1 : 1;
      this.moveChain.tweens.push({
        x: this.tilePosToPixelsX(deltaX),
        ease: "Linear",
        onStart: () => {
          this.startMovingAnim(direction);
          this.depth = this.y;
        },
        onUpdate: () => {
          this.moveUnitAttributes();
        },
        duration: 300,
        repeat: 0,
        yoyo: false,
      });
    } else {
      const deltaY = direction === "up" ? -1 : 1;
      this.moveChain.tweens.push({
        y: this.tilePosToPixelsY(deltaY),
        ease: "Linear",
        onStart: () => {
          this.startMovingAnim(direction);
          this.depth = this.y;
        },
        onUpdate: () => {
          this.moveUnitAttributes();
        },
        duration: 300,
        repeat: 0,
        yoyo: false,
      });
    }
  }

  private moveUnitAttributes() {
    this.moveHealthBarToPlayerPosition();
    this.moveTeamIdentifier();
    if (this.effectIcon) this.moveEffectIconToPlayerPosition();
  }

  moveTeamIdentifier() {
    this.identifier.x = this.x;
    this.identifier.y = this.y;
  }

  // stop player movement
  // and their animations too
  stopMovement = () => {
    this.myScene.addToObstacleLayer(
      new Phaser.Math.Vector2(this.indX, this.indY)
    );
    this.anims.stop();
    this.changeDirection(this.direction);
    this.direction = "";
    this.moveChain.tweens = [];
    this.isMoving = false;
    this.refreshUI();
    this.nextAction();
  };

  // convert the tile position (index) of the unit to actual pixel position
  // with optional delta
  tilePosToPixelsX(delta: number = 0) {
    return this.myScene.tileWidth * (this.indX + delta) + this.width / 2;
  }

  tilePosToPixelsY(delta: number = 0) {
    return this.myScene.tileHeight * (this.indY + delta) + this.height / 6;
  }

  startMovingAnim = (direction: string) => {
    // i.e. if unit has type 'Amazon', animation for left has key 'leftAmazon'
    this.play(direction + this.type, true);
  };

  startSpellCastAnimation = (direction: string) => {
    this.play(direction + "Attack" + this.type, true);
  };

  // these three methods are redefined by subclasses
  playTurn() {
    this.undergoEffectOverTime();
  }

  nextAction() {}

  endTurn() {
    this.decrementSpellCooldowns();
    this.refillPoints();
    this.myScene.endTurn();
  }

  private decrementSpellCooldowns() {
    this.spells.forEach((spell) => {
      spell.cooldown--;
    });
  }

  isDead(): boolean {
    return this.hp <= 0;
  }

  // cast a spell at specified position
  castSpell(spell: Spell, targetVec: Phaser.Math.Vector2) {
    this.ap -= spell.cost;
    spell.cooldown = spell.maxCooldown;
    this.lookAtTile(targetVec);
    this.startSpellCastAnimation(this.direction);
    const affectedUnits = this.myScene.getUnitsInsideAoe(
      this,
      targetVec.x,
      targetVec.y,
      spell
    );
    affectedUnits.forEach((unit) => {
      unit.undergoSpell(spell);
      if (!unit.isDead() && spell.moveTargetBy) {
        // check alignment for spells that push or pull
        const isAlignedX = targetVec.y == this.indY;
        const isForward = isAlignedX
          ? Math.sign(targetVec.x - this.indX)
          : Math.sign(targetVec.y - this.indY);
        unit.isMovedToNewPosition(spell.moveTargetBy, isAlignedX, isForward);

        this.myScene.refreshAccessibleTiles();
        if (this.myScene.spellVisible) {
          this.myScene.displaySpellRange(this.myScene.currentSpell);
        }
      }
    });
    // if spell summons a unit AND targeted tile is free, summon the unit
    if (
      spell.summons &&
      !this.myScene.obstaclesLayer.getTileAt(targetVec.x, targetVec.y)
    ) {
      const summonedUnit = this.myScene.addUnit(
        spell.summons,
        targetVec.x,
        targetVec.y,
        false,
        this.isAlly
      );
      this.myScene.addSummonedUnitToTimeline(this, summonedUnit);
      this.summonedUnits.push(summonedUnit);
    }
    this.refreshUI();
  }

  undergoSpell(spell: Spell) {
    this.hp -= spell.damage;
    this.hp = Math.min(this.hp + spell.heal, this.maxHp);
    this.mp -= spell.malusMP;
    this.mp += spell.bonusMP;
    this.ap -= spell.malusAP;
    this.ap += spell.bonusAP;
    if (spell.effectOverTime) {
      this.addEffectOverTime(spell.effectOverTime);
    }
    this.updateHealthBar();
    this.displaySpellEffect(
      spell.damage,
      spell.malusMP,
      spell.malusAP,
      spell.heal,
      spell.bonusMP,
      spell.bonusAP
    );
    this.refreshUI();
    this.checkDead();
  }

  // move function without animations used for push/pull spells
  isMovedToNewPosition(value: number, isAlignedX: boolean, isForward: number) {
    this.myScene.removeFromObstacleLayer(this);
    if (isAlignedX) {
      let deltaX = value * isForward;
      let direction = Math.sign(deltaX);
      // stop when there is an obstacle or edge of map
      for (let i = 0; Math.abs(i) < Math.abs(deltaX); i += direction) {
        let nextTileX = this.indX + i + direction;
        if (
          !this.myScene.backgroundLayer.getTileAt(nextTileX, this.indY) ||
          !this.myScene.isWalkable(nextTileX, this.indY) ||
          nextTileX < 0
        ) {
          deltaX = i;
          break;
        }
      }
      if (deltaX) {
        this.myScene.tweens.add({
          targets: this,
          x: this.tilePosToPixelsX(deltaX),
          ease: "Linear",
          onUpdate: () => {
            this.moveUnitAttributes();
          },
          duration: 66 * Math.abs(deltaX),
          repeat: 0,
          yoyo: false,
        });
        this.indX += deltaX;
      }
    } else {
      let deltaY = value * isForward;
      let direction = Math.sign(deltaY);
      // stop when there is an obstacle or edge of map
      for (let i = 0; Math.abs(i) < Math.abs(deltaY); i += direction) {
        let nextTileY = this.indY + i + direction;
        if (
          !this.myScene.backgroundLayer.getTileAt(this.indX, nextTileY) ||
          !this.myScene.isWalkable(this.indX, nextTileY) ||
          nextTileY < 0
        ) {
          deltaY = i;
          break;
        }
      }
      if (deltaY) {
        this.myScene.tweens.add({
          targets: this,
          y: this.tilePosToPixelsY(deltaY),
          ease: "Linear",
          onUpdate: () => {
            this.moveUnitAttributes();
            this.depth = this.y;
          },
          duration: 66 * Math.abs(deltaY),
          repeat: 0,
          yoyo: false,
        });
        this.indY += deltaY;
      }
    }
    this.moveUnitAttributes();
    this.myScene.addToObstacleLayer(
      new Phaser.Math.Vector2(this.indX, this.indY)
    );
  }

  undergoEffectOverTime() {
    const eot = this.effectOverTime;
    if (eot && eot.duration > 0) {
      this.hp -= eot.damage;
      // no healing over max hp
      this.hp = Math.min(this.hp + eot.heal, this.maxHp);
      this.ap -= eot.malusAP;
      this.ap += eot.bonusAP;
      this.mp -= eot.malusMP;
      this.mp += eot.bonusMP;
      this.updateHealthBar();
      eot.duration--;
      this.displaySpellEffect(
        eot.damage,
        eot.malusMP,
        eot.malusAP,
        eot.heal,
        eot.bonusMP,
        eot.bonusAP
      );
      this.refreshUI();
      if (eot.duration <= 0) {
        this.effectOverTime = null;
        this.effectIcon.destroy();
      }
      this.checkDead();
    }
  }

  // display damage animation when unit is hit
  displaySpellEffect(
    damage: number,
    malusMP: number,
    malusAP: number,
    heal: number,
    bonusMP: number,
    bonusAP: number
  ) {
    let dmgDelay = 0;
    const scene = this.scene;
    if (damage > 0) {
      // display damage with unit blinking red
      this.displayEffect(scene, damage, "damage", true);
      dmgDelay = 400;
    }
    if (!this.isDead()) {
      scene.time.delayedCall(dmgDelay, () => {
        let healDelay = 0;
        // display heal in green (no blinking)
        if (heal > 0) {
          this.displayEffect(scene, heal, "heal", false, true);
          healDelay = 400;
        }
        scene.time.delayedCall(healDelay, () => {
          let mpDelay = 0;
          // display MP malus in white
          if (malusMP > 0) {
            this.displayEffect(scene, malusMP, "mp");
            mpDelay = 400;
          }
          scene.time.delayedCall(mpDelay, () => {
            let bonusMpDelay = 0;
            // display MP bonus in white
            if (bonusMP > 0) {
              this.displayEffect(scene, bonusMP, "mp", false, true);
              bonusMpDelay = 400;
            }
            scene.time.delayedCall(bonusMpDelay, () => {
              let apDelay = 0;
              // display AP malus in blue
              if (malusAP > 0) {
                this.displayEffect(scene, malusAP, "ap");
                apDelay = 400;
              }
              scene.time.delayedCall(apDelay, () => {
                // display AP bonus in blue
                if (bonusAP > 0) {
                  this.displayEffect(scene, bonusAP, "ap", false, true);
                }
              });
            });
          });
        });
      });
    }
  }

  displayEffect(
    scene: Phaser.Scene,
    value: number,
    type: string,
    blink: boolean = false,
    positive: boolean = false
  ) {
    let color: number;
    const fontSize = 16;
    if (blink) this.tint = 0xff0000;
    switch (type) {
      case "damage":
        color = 0xff0000;
        break;
      case "heal":
        color = 0x00dd00;
        break;
      case "mp":
        color = 0xffffff;
        break;
      case "ap":
        color = 0x33c6f7;
        break;
      default:
        break;
    }
    let isOnTop = this.indY < 2;
    let malus = scene.add
      .bitmapText(
        this.x - 2,
        isOnTop ? this.y + 20 : this.y - this.displayHeight + 5,
        "dogicapixel",
        (positive ? "+" : "-") + value.toString(),
        fontSize
      )
      .setTint(color);
    malus.setDepth(10001);
    malus.setOrigin(0.5, 0.5);
    // disappears after short time
    scene.time.delayedCall(
      300,
      () => {
        malus.destroy();
        if (blink) this.tint = 0xffffff;
      },
      undefined,
      malus
    );
  }

  checkDead() {
    if (this.isDead()) {
      this.die();
    }
  }

  private die() {
    this.summonedUnits.forEach((unit) => {
      if (!unit.isDead()) unit.die();
    });
    this.unselectUnit();
    this.myScene.removeUnitFromBattle(this);
    // turn black before dying...
    this.tint = 0x000000;
    this.scene.time.delayedCall(
      400,
      () => {
        if (this.myScene.gameIsOver()) {
          this.myScene.gameOver();
        }
        this.destroyUnit();
        if (this.myScene.battleIsFinished()) {
          this.myScene.endBattle();
        }
      },
      undefined,
      this
    );
  }

  destroyUnit() {
    this.healthBar.destroy();
    this.identifier.destroy();
    this.timelineSlot.destroy();
    if (this.effectIcon) this.effectIcon.destroy();
    this.destroy();
  }

  // look at a position (change player direction)
  lookAtTile(targetVec: Phaser.Math.Vector2) {
    let direction = "";
    // upper right corner
    if (targetVec.x >= this.indX && targetVec.y <= this.indY) {
      if (targetVec.x + targetVec.y < this.indX + this.indY) {
        direction = "up";
      } else {
        direction = "right";
      }
      // lower right corner
    } else if (targetVec.x >= this.indX && targetVec.y > this.indY) {
      if (targetVec.x - targetVec.y < this.indX - this.indY) {
        direction = "down";
      } else {
        direction = "right";
      }
      // lower left corner
    } else if (targetVec.x < this.indX && targetVec.y >= this.indY) {
      if (targetVec.x + targetVec.y < this.indX + this.indY) {
        direction = "left";
      } else {
        direction = "down";
      }
      // upper left corner
    } else if (targetVec.x < this.indX && targetVec.y < this.indY) {
      if (targetVec.x - targetVec.y < this.indX - this.indY) {
        direction = "left";
      } else {
        direction = "up";
      }
    }
    this.changeDirection(direction);
  }

  changeDirection(direction: string) {
    switch (direction) {
      case "left":
        this.setTexture("player", this.frameNumber + 2);
        break;
      case "right":
        this.setTexture("player", this.frameNumber + 1);
        break;
      case "up":
        this.setTexture("player", this.frameNumber + 3);
        break;
      case "down":
        this.setTexture("player", this.frameNumber);
        break;
      default:
        break;
    }
    this.direction = direction;
  }

  // refresh UI infos like player stats
  refreshUI() {
    this.myScene.uiScene.refreshUI();
  }

  /** Create team identifier (blue/red circle under unit's feet) */
  createTeamIdentifier(scale: number) {
    // identifier frame on the spritesheet (red circle or blue circle)
    let identifierFrame = this.isAlly
      ? this.blueTeamIdentifierFrame
      : this.redTeamIdentifierFrame;
    this.identifier = this.scene.add.image(
      this.x,
      this.y,
      "player",
      identifierFrame
    );
    this.identifier.setScale(scale);
  }

  setBarValue(bar: Phaser.GameObjects.Graphics, percentage: number) {
    //scale the bar
    bar.scaleX = percentage / 100;
  }

  updateHealthBar() {
    if (this.healthBar) this.healthBar.destroy();

    // draw the bar
    this.healthBar = this.scene.add.graphics();
    const hpPercentage = Math.max(this.hp / this.maxHp, 0) * 100;
    this.setBarValue(this.healthBar, hpPercentage + 2);
    const barWidth = this.displayWidth * 1.2;
    const barAlpha = 0.8;
    if (hpPercentage <= 25) {
      this.healthBar.fillStyle(0xff0000, barAlpha);
    } else if (hpPercentage <= 50) {
      this.healthBar.fillStyle(0xffc802, barAlpha);
    } else {
      this.healthBar.fillStyle(0x2ecc71, barAlpha);
    }
    this.healthBar.fillRect(0, 0, barWidth, 8);

    this.healthBar.setDepth(10000);
    if (!this.isSelected) this.healthBar.setVisible(false);
    this.moveHealthBarToPlayerPosition();
  }

  moveHealthBarToPlayerPosition() {
    const barWidth = this.displayWidth * 1.2;
    this.healthBar.x = this.x - barWidth / 2;
    // if unit is on top of screen health bar must be below it
    this.healthBar.y = this.isOnTop()
      ? this.y + this.healthBarUnderUnitOffset
      : this.y - this.displayHeight - this.healthBarOverUnitOffset;
  }

  // add spells to a unit
  addSpells(...spells: Spell[]) {
    const copySpells = [];
    // each unit must have its own copy of each spell to manage cooldowns separately
    spells.forEach((spell) => {
      copySpells.push({ ...spell });
    });
    this.spells = this.spells.concat(copySpells);
  }

  // links unit to its timeline slot on the UI
  addTimelineSlot(slot: UITimelineSlot) {
    this.timelineSlot = slot;
  }

  addEffectOverTime(effectOverTime: EffectOverTime) {
    if (effectOverTime) {
      this.effectOverTime = { ...effectOverTime };
      if (this.effectIcon) this.effectIcon.destroy();
      this.makeEffectOverTimeIcon(effectOverTime);
    }
  }

  makeEffectOverTimeIcon(effectOverTime: EffectOverTime) {
    this.effectIcon = this.scene.add
      .image(0, 0, "player", effectOverTime.frame)
      .setScale(1)
      .setDepth(9999);
    if (!this.isSelected) this.effectIcon.setVisible(false);
    this.moveEffectIconToPlayerPosition();
  }

  moveEffectIconToPlayerPosition() {
    this.effectIcon.x = this.x;
    this.effectIcon.y = this.isOnTop()
      ? this.y + this.effectIconUnderUnitOffset
      : this.y - this.displayHeight - this.effectIconOverUnitOffset;
  }

  private isOnTop() {
    return this.y < this.myScene.tileHeight * 3;
  }

  teleportToPosition(indX: number, indY: number) {
    this.myScene.removeFromObstacleLayer(this);
    this.indX = indX;
    this.indY = indY;
    this.myScene.addToObstacleLayer(new Phaser.Math.Vector2(indX, indY));
    this.x = this.tilePosToPixelsX();
    this.y = this.tilePosToPixelsY();
    this.depth = this.y;
    this.moveUnitAttributes();
  }
}
