import Phaser from "phaser";
import { BattleScene } from "../../scenes/BattleScene";
import { Spell } from "./Spell";
import { UITimelineSlot } from "../UI/UITimelineSlot";
import { EffectOverTime } from "./EffectOverTime";

interface DisplayedEffect {
  value: number;
  type: string;
  isBlink?: boolean;
  isPositive?: boolean;
}

export class Unit extends Phaser.GameObjects.Sprite {
  // use these to manipulate sprite positions around units (healthbar, effect icons etc)
  healthBarOverUnitOffset = 7;
  healthBarUnderUnitOffset = 32;
  effectIconOverUnitOffset = 19;
  effectIconUnderUnitOffset = 53;
  healthBarScale = 1.2;

  selectedTint = 0x777777;
  grabbedTint = 0x6666ff;
  allyColor = 0x0000ff;
  enemyColor = 0xff0000;
  identifierFrame = 44;

  battleScene: BattleScene;
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
  healthBar: Phaser.GameObjects.Graphics;
  // team identifier under unit's feet (blue ally, red enemy)
  identifier: Phaser.GameObjects.Image;
  spells: Spell[] = [];
  timelineSlot: UITimelineSlot;
  effectsOverTime: EffectOverTime[] = [];
  effectIcons: Phaser.GameObjects.Container;
  summonedUnits: Unit[] = [];
  isSelected: boolean;
  isGrabbed = false;

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
    this.battleScene = this.scene as BattleScene;
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
      this.isMoving = true;
    };
    this.moveChain.onComplete = this.stopMovement;
    this.moveChain.tweens = [];

    this.addHoverEvents();

    if (this.isAlly) {
      this.addClickEvents();
    }
  }

  addHoverEvents() {
    this.on("pointerover", () => {
      this.selectUnit();
    });
    this.on("pointerout", () => {
      this.unselectUnit();
    });
  }

  addClickEvents() {
    this.on("pointerup", () => {
      const prevGrab = this.battleScene.findPreviouslyGrabbedUnit();
      if (!prevGrab) {
        this.grabUnit();
      } else if (prevGrab === this) {
        // ungrab unit if it's already grabbed
        this.ungrabUnit();
      }
    });
  }

  ungrabUnit() {
    this.isGrabbed = false;
    this.identifier.tint = this.isAlly ? this.allyColor : this.enemyColor;
    if (this.isSelected) {
      this.tint = this.selectedTint;
      this.timelineSlot.tint = this.selectedTint;
    } else {
      this.tint = 0xffffff;
      this.timelineSlot.tint = 0xffffff;
    }
  }

  grabUnit() {
    this.isGrabbed = true;
    this.identifier.tint = 0xffffff;
    this.tint = this.grabbedTint;
    this.timelineSlot.tint = this.grabbedTint;
  }

  /** On select, highlight unit, show healthbar and effect icon, and show unit stats in UI. */
  selectUnit() {
    this.isSelected = true;
    if (!this.isGrabbed) {
      this.tint = this.selectedTint;
      this.timelineSlot.tint = this.selectedTint;
    }
    if (!this.battleScene.isInPreparationPhase) this.healthBar.setVisible(true);
    this.effectIcons?.setVisible(true);
    this.battleScene.uiScene.changeStatsUnit(this);
  }

  unselectUnit() {
    this.isSelected = false;
    if (!this.isGrabbed) {
      this.tint = 0xffffff;
      this.timelineSlot.tint = 0xffffff;
    }
    this.healthBar.setVisible(false);
    this.effectIcons?.setVisible(false);
    this.battleScene.uiScene.changeStatsUnit(this.battleScene.currentPlayer);
  }

  /** Refills movement and action points at turn beginning. */
  refillPoints() {
    this.mp = this.maxMp;
    this.ap = this.maxAp;
  }

  // move along a path
  moveAlong(path: Phaser.Math.Vector2[]) {
    this.battleScene.removeFromObstacleLayer(this.indX, this.indY);

    if (!path || path.length <= 0) {
      if (this.isMoving) {
        // when end of path is reached, start the chain of movement tweens
        this.scene.tweens.chain(this.moveChain);
      }
      return;
    }

    this.movePath = path;
    this.moveTo(this.movePath.shift());
  }

  /** Check next direction to take
   *   and call move function that adds the actual movement to the tween chain.
   */
  moveTo(target: Phaser.Math.Vector2) {
    this.isMoving = true;

    const targetIndX = target.x;
    const targetIndY = target.y;

    if (this.indX - targetIndX > 0) {
      this.direction = "left";
    } else if (this.indX - targetIndX < 0) {
      this.direction = "right";
    } else if (this.indY - targetIndY < 0) {
      this.direction = "down";
    } else if (this.indY - targetIndY > 0) {
      this.direction = "up";
    } else {
      this.direction = "down"; // just in case, to avoid missing animations warning
    }

    this.move(targetIndX, targetIndY, this.direction);

    this.mp--;
    this.indX = targetIndX;
    this.indY = targetIndY;

    this.moveAlong(this.movePath);
  }

  private move(targetIndX: number, targetIndY: number, direction: string) {
    this.moveChain.tweens.push({
      x: this.tilePosToPixelsX(targetIndX),
      y: this.tilePosToPixelsY(targetIndY),
      ease: "Linear",
      onStart: () => {
        this.startMovingAnim(direction);
      },
      onUpdate: () => {
        this.moveUnitAttributes();
        this.depth = this.y;
      },
      duration: 300,
      repeat: 0,
      yoyo: false,
    });
  }

  private moveUnitAttributes() {
    this.moveHealthBarToPlayerPosition();
    this.moveTeamIdentifier();
    if (this.effectIcons) this.moveEffectIconsToPlayerPosition();
  }

  moveTeamIdentifier() {
    this.identifier.x = this.x;
    this.identifier.y = this.y;
  }

  /**
   * Stop unit movement and their animations, and trigger additional actions if needed.
   */
  stopMovement = () => {
    this.battleScene.addToObstacleLayer(
      new Phaser.Math.Vector2(this.indX, this.indY)
    );
    this.anims.stop();
    this.changeDirection(this.direction);
    this.direction = "";
    this.moveChain.tweens = [];
    this.isMoving = false;
    this.refreshUI();
    this.nextAction();
    this.emit("endOfDeplacementReached", this);
  };

  /** Converts a X tile position (index) to actual unit pixel position. */
  tilePosToPixelsX(indX: number) {
    return this.battleScene.tileWidth * indX + this.width / 2;
  }

  /** Converts a Y tile position (index) to actual unit pixel position. */
  tilePosToPixelsY(indY: number) {
    return this.battleScene.tileHeight * indY + this.height / 6;
  }

  startMovingAnim = (direction: string) => {
    // i.e. if unit has type 'Amazon', animation for left has key 'leftAmazon'
    this.play(direction + this.type, true);
  };

  startSpellCastAnimation = (direction: string) => {
    this.play(direction + "Attack" + this.type, true);
  };

  playTurn() {
    this.identifier.tint = 0xffffff;
    this.undergoEffectsOverTime();
  }

  nextAction() {}

  endTurn() {
    this.identifier.tint = this.isAlly ? this.allyColor : this.enemyColor;
    this.decrementSpellCooldowns();
    this.refillPoints();
    this.battleScene.endTurn();
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
  castSpell(
    spell: Spell,
    targetVec: Phaser.Math.Vector2,
    bonusDamage: number = 0
  ) {
    this.ap -= spell.cost;
    spell.cooldown = spell.maxCooldown;
    this.lookAtTile(targetVec);
    this.startSpellCastAnimation(this.direction);
    const affectedUnits = this.battleScene.getUnitsInsideAoe(
      this,
      targetVec.x,
      targetVec.y,
      spell
    );
    affectedUnits.forEach((unit) => {
      unit.off("spellDisplayFinished");
      unit.undergoSpell(spell, bonusDamage);
      // for spells that push or pull
      if (!unit.isDead() && spell.moveTargetBy) {
        this.moveUnitBySpell(targetVec, unit, spell);
        if (this.battleScene.currentPlayer) {
          this.battleScene.refreshAccessibleTiles();
        }
        if (this.battleScene.spellVisible) {
          this.battleScene.displaySpellRange(this.battleScene.currentSpell);
        }
      }
    });
    // if spell summons a unit AND targeted tile is free, summon the unit
    if (
      spell.summons &&
      !this.battleScene.obstaclesLayer.getTileAt(targetVec.x, targetVec.y)
    ) {
      const summonedUnit = this.battleScene.addUnit(
        spell.summons,
        targetVec.x,
        targetVec.y,
        false,
        this.isAlly
      );
      this.battleScene.addSummonedUnitToTimeline(this, summonedUnit);
      this.summonedUnits.push(summonedUnit);
    }
    this.refreshUI();
  }

  private moveUnitBySpell(
    targetVec: Phaser.Math.Vector2,
    unit: Unit,
    spell: Spell
  ) {
    const isAlignedX = targetVec.y === this.indY;
    const isForward = isAlignedX
      ? Math.sign(targetVec.x - this.indX)
      : Math.sign(targetVec.y - this.indY);
    unit.moveDirectlyToNewPosition(spell.moveTargetBy, isAlignedX, isForward);
  }

  undergoSpell(spell: Spell, bonusDamage: number = 0) {
    const calculatedDamage = spell.damage * (1 + bonusDamage * 0.01);
    this.hp -= calculatedDamage;
    this.hp += spell.heal;
    this.mp -= spell.malusMP;
    this.mp += spell.bonusMP;
    this.ap -= spell.malusAP;
    this.ap += spell.bonusAP;

    this.hp = Math.max(this.hp, 0);
    this.hp = Math.min(this.hp, this.maxHp);
    this.mp = Math.max(this.mp, 0);
    this.ap = Math.max(this.ap, 0);

    if (spell.effectOverTime) {
      this.addEffectOverTime(spell.effectOverTime);
    }
    this.updateHealthBar();
    this.displaySpellOrEffectOverTimeEffects(
      calculatedDamage,
      spell.malusMP,
      spell.malusAP,
      spell.heal,
      spell.bonusMP,
      spell.bonusAP
    );
    this.refreshUI();
    this.checkDead();
  }

  /** Move function for push/pull spells. */
  moveDirectlyToNewPosition(
    value: number,
    isAlignedX: boolean,
    isForward: number
  ) {
    // represents the remaining tiles you ought to be pushed/pull through if there weren't an obstacle
    // we use it to calculate the push/pull damage
    let remainingValue = 0;
    this.battleScene.removeFromObstacleLayer(this.indX, this.indY);
    if (isAlignedX) {
      let deltaX = value * isForward;
      let direction = Math.sign(deltaX);
      // stop when there is an obstacle or edge of map
      for (let i = 0; Math.abs(i) < Math.abs(deltaX); i += direction) {
        let nextTileX = this.indX + i + direction;
        if (
          !this.battleScene.backgroundLayer.getTileAt(nextTileX, this.indY) ||
          !this.battleScene.isWalkable(nextTileX, this.indY) ||
          nextTileX < 0
        ) {
          deltaX = i;
          break;
        }
      }
      remainingValue = Math.abs(value - deltaX);
      if (deltaX) {
        this.battleScene.tweens.add({
          targets: this,
          x: this.tilePosToPixelsX(this.indX + deltaX),
          ease: "Linear",
          onUpdate: () => {
            this.moveUnitAttributes();
          },
          onComplete: () => {
            this.endPushMovement(remainingValue);
          },
          duration: 66 * Math.abs(deltaX),
          repeat: 0,
          yoyo: false,
        });
        this.indX += deltaX;
      } else {
        // if we're directly against obstacle, wait till spell damage animation has ended
        // to show push/pull damage
        this.once("spellDisplayFinished", () => {
          this.endPushMovement(remainingValue);
        });
      }
    } else {
      let deltaY = value * isForward;
      let direction = Math.sign(deltaY);
      // stop when there is an obstacle or edge of map
      for (let i = 0; Math.abs(i) < Math.abs(deltaY); i += direction) {
        let nextTileY = this.indY + i + direction;
        if (
          !this.battleScene.backgroundLayer.getTileAt(this.indX, nextTileY) ||
          !this.battleScene.isWalkable(this.indX, nextTileY) ||
          nextTileY < 0
        ) {
          deltaY = i;
          break;
        }
      }
      remainingValue = Math.abs(value - deltaY);
      if (deltaY) {
        this.battleScene.tweens.add({
          targets: this,
          y: this.tilePosToPixelsY(this.indY + deltaY),
          ease: "Linear",
          onUpdate: () => {
            this.moveUnitAttributes();
            this.depth = this.y;
          },
          onComplete: () => {
            this.endPushMovement(remainingValue);
          },
          duration: 66 * Math.abs(deltaY),
          repeat: 0,
          yoyo: false,
        });
        this.indY += deltaY;
      } else {
        // if we're directly against obstacle, wait till spell damage animation has ended
        // to show push/pull damage
        this.once("spellDisplayFinished", () => {
          this.endPushMovement(remainingValue);
        });
      }
    }
  }

  private endPushMovement(remainingValue: number) {
    this.moveUnitAttributes();
    this.receivePushDamage(remainingValue);
    if (!this.isDead()) {
      this.battleScene.addToObstacleLayer(
        new Phaser.Math.Vector2(this.indX, this.indY)
      );
    }
  }

  receivePushDamage(value: number) {
    const pushDamageMultiplier = 5;
    const damage = value * pushDamageMultiplier;
    this.hp = Math.max(this.hp - damage, 0);

    this.displaySpellOrEffectOverTimeEffects(damage, 0, 0, 0, 0, 0);

    this.updateHealthBar();
    this.refreshUI();
    this.checkDead();
  }

  undergoEffectsOverTime() {
    let damage = 0;
    let heal = 0;
    let malusAP = 0;
    let bonusAP = 0;
    let malusMP = 0;
    let bonusMP = 0;
    for (let i = 0; i < this.effectsOverTime.length; i++) {
      const eot = this.effectsOverTime[i];
      if (eot && eot.duration > 0) {
        // damage multiplier on enemies only
        const eotDamageMultiplier = this.isAlly ? 0 : this.battleScene.eotBonus;
        const calculatedDamage = eot.damage * (1 + eotDamageMultiplier * 0.01);

        damage += calculatedDamage;
        heal += eot.heal;
        malusAP += eot.malusAP;
        bonusAP += eot.bonusAP;
        malusMP += eot.malusMP;
        bonusMP += eot.bonusMP;

        eot.duration--;

        if (eot.duration <= 0) {
          this.effectsOverTime.splice(i, 1);
          i--;
        }
      }
    }

    this.updateEffectOverTimeIcons();

    this.hp -= damage;
    this.hp += heal;
    this.ap -= malusAP;
    this.ap += bonusAP;
    this.mp -= malusMP;
    this.mp += bonusMP;

    this.hp = Math.max(this.hp, 0);
    this.hp = Math.min(this.hp, this.maxHp);
    this.mp = Math.max(this.mp, 0);
    this.ap = Math.max(this.ap, 0);

    this.displaySpellOrEffectOverTimeEffects(
      damage,
      malusMP,
      malusAP,
      heal,
      bonusMP,
      bonusAP
    );

    this.updateHealthBar();
    this.refreshUI();
    this.checkDead();
  }

  displaySpellOrEffectOverTimeEffects(
    damage: number,
    malusMP: number,
    malusAP: number,
    heal: number,
    bonusMP: number,
    bonusAP: number
  ) {
    const delayBetweenEffects = 400;
    const effects: DisplayedEffect[] = [];

    if (damage > 0) {
      // display damage with unit blinking red
      effects.push({ value: damage, type: "damage", isBlink: true });
    }
    if (heal > 0) {
      effects.push({ value: heal, type: "heal", isPositive: true });
    }
    if (malusMP > 0) {
      effects.push({ value: malusMP, type: "mp" });
    }
    if (bonusMP > 0) {
      effects.push({ value: bonusMP, type: "mp", isPositive: true });
    }
    if (malusAP > 0) {
      effects.push({ value: malusAP, type: "ap" });
    }
    if (bonusAP > 0) {
      effects.push({ value: bonusAP, type: "ap", isPositive: true });
    }
    // delay between each effect display
    for (let i = 0; i < effects.length; i++) {
      const effect = effects[i];
      ((i) => {
        setTimeout(() => {
          this.displayEffect(
            effect.value,
            effect.type,
            effect.isBlink,
            effect.isPositive
          );
        }, delayBetweenEffects * i);
      })(i);
      if (this.isDead()) {
        return;
      }
    }
    // this event is used for delayed push damage display when already against obstacle
    // so that regular damage and push damage are not displayed simultaneously
    this.scene.time.delayedCall(delayBetweenEffects * effects.length, () => {
      this.emit("spellDisplayFinished");
    });
  }

  displayEffect(
    value: number,
    type: string,
    blink: boolean = false,
    positive: boolean = false
  ) {
    let color: number;
    const fontSize = 16;
    if (blink && !this.isDead()) this.tint = 0xff0000;
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
    let malus = this.scene.add
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
    this.scene.time.delayedCall(
      300,
      () => {
        malus.destroy();
        if (blink && !this.isDead()) this.tint = 0xffffff;
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
    this.disableInteractive();
    this.battleScene.removeUnitFromBattle(this);

    if (
      this.battleScene.isPlayerTurn &&
      this === this.battleScene.currentPlayer
    ) {
      this.battleScene.clearSpellRange();
    }

    // turn black before dying...
    this.tint = 0x000000;
    this.scene.time.delayedCall(
      400,
      () => {
        if (this.battleScene.gameIsOver()) {
          this.battleScene.gameOver();
        } else if (this.battleScene.battleIsFinished()) {
          this.battleScene.winBattle();
        } else if (
          this.battleScene.isPlayerTurn &&
          this === this.battleScene.currentPlayer
        ) {
          this.battleScene.endTurn();
        }
        this.destroyUnit();
      },
      undefined,
      this
    );
  }

  destroyUnit() {
    this.healthBar.destroy();
    this.identifier.destroy();
    this.timelineSlot.destroy();
    this.effectIcons?.destroy();
    this.destroy();
  }

  // look at a position (change player direction)
  lookAtTile(targetVec: Phaser.Math.Vector2) {
    let direction = "";
    // on self
    if (targetVec.x === this.indX && targetVec.y === this.indY) {
      direction = "down";
    }
    // upper right corner
    else if (targetVec.x >= this.indX && targetVec.y <= this.indY) {
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

  /** Refresh UI infos like player stats. */
  refreshUI() {
    this.battleScene.uiScene.refreshUI();
  }

  /** Create team identifier (blue/red circle under unit's feet) */
  createTeamIdentifier(scale: number) {
    // identifier frame on the spritesheet (red circle or blue circle)
    const color = this.isAlly ? this.allyColor : this.enemyColor;
    this.identifier = this.scene.add
      .image(this.x, this.y, "player", this.identifierFrame)
      .setTint(color)
      .setScale(scale);
  }

  setBarValue(bar: Phaser.GameObjects.Graphics, percentage: number) {
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

  addSpells(...spells: Spell[]) {
    const copySpells = [];
    // each unit must have its own copy of each spell to manage cooldowns separately
    spells.forEach((spell) => {
      copySpells.push({ ...spell });
    });
    this.spells = this.spells.concat(copySpells);
  }

  /** Links unit to its timeline slot on the UI. */
  addTimelineSlot(slot: UITimelineSlot) {
    this.timelineSlot = slot;
  }

  addEffectOverTime(effectOverTime: EffectOverTime) {
    if (effectOverTime) {
      // if this effect is already applied on the unit, we just reset the duration
      // (effects of the same kind don't stack)
      const alreadyExistingEffect = this.effectsOverTime.find(
        (eot) => eot.name === effectOverTime.name
      );
      if (alreadyExistingEffect) {
        alreadyExistingEffect.duration = effectOverTime.duration;
      } else {
        this.effectsOverTime.push({ ...effectOverTime });
      }
      this.updateEffectOverTimeIcons();
    }
  }

  updateEffectOverTimeIcons() {
    this.effectIcons?.destroy();
    this.effectIcons = this.scene.add.container().setDepth(9999);
    const eotMargin = 2;
    for (let i = 0; i < this.effectsOverTime.length; i++) {
      const effectOverTime = this.effectsOverTime[i];
      this.effectIcons.add(
        new Phaser.GameObjects.Image(
          this.battleScene,
          (this.battleScene.tileWidth + eotMargin) *
            (i + 0.5 * (1 - this.effectsOverTime.length)),
          0,
          "player",
          effectOverTime.frame
        )
      );
    }
    if (!this.isSelected) this.effectIcons.setVisible(false);
    this.moveEffectIconsToPlayerPosition();
  }

  moveEffectIconsToPlayerPosition() {
    this.effectIcons.x = this.x;
    this.effectIcons.y = this.isOnTop()
      ? this.y + this.effectIconUnderUnitOffset
      : this.y - this.displayHeight - this.effectIconOverUnitOffset;
  }

  private isOnTop() {
    return this.y < this.battleScene.tileHeight * 3;
  }

  teleportToPosition(indX: number, indY: number) {
    this.battleScene.removeFromObstacleLayer(this.indX, this.indY);
    this.indX = indX;
    this.indY = indY;
    this.battleScene.addToObstacleLayer(new Phaser.Math.Vector2(indX, indY));
    this.x = this.tilePosToPixelsX(indX);
    this.y = this.tilePosToPixelsY(indY);
    this.depth = this.y;
    this.moveUnitAttributes();
  }
}
