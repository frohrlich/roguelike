import Phaser from "phaser";
import { Unit } from "../classes/battle/Unit";
import findPath from "../utils/findPath";
import { Npc } from "../classes/battle/Npc";
import { Player } from "../classes/battle/Player";
import { Spell } from "../classes/battle/Spell";
import { BattleUIScene } from "./BattleUIScene";
import isVisible from "../utils/lineOfSight";
import { UnitData, UnitService } from "../services/UnitService";
import { DeckService } from "../services/DeckService";
import { MapService } from "../services/MapService";
import { SpellService } from "../services/SpellService";

// Store a tile and the path to it
interface TilePath {
  pos: Phaser.Math.Vector2;
  path: Phaser.Math.Vector2[];
}

export class BattleScene extends Phaser.Scene {
  animFramerate = 5;
  enemyCount = 2; // enemies per battle
  static mapsCount = 3; // different battle maps per zone

  static mapNumbers: number[] = [];
  currentPlayer: Player;
  allies: Unit[] = [];
  enemies: Unit[] = [];
  clickedTile: Phaser.Tilemaps.Tile;
  tileWidth: number;
  tileHeight: number;
  map: Phaser.Tilemaps.Tilemap;
  direction: string;
  tileset: Phaser.Tilemaps.Tileset;
  obstaclesLayer: Phaser.Tilemaps.TilemapLayer;
  transparentObstaclesLayer: Phaser.Tilemaps.TilemapLayer;
  backgroundLayer: Phaser.Tilemaps.TilemapLayer;
  timelineIndex: number;
  timeline: Unit[] = [];
  isPlayerTurn: boolean;
  accessibleTiles: TilePath[] = [];
  spellVisible: boolean;
  spellRange: Phaser.Tilemaps.Tile[] = [];
  currentSpell: Spell;
  uiScene: BattleUIScene;
  overlays: Phaser.GameObjects.Rectangle[] = [];
  spellAoeOverlay: Phaser.GameObjects.Rectangle[] = [];
  pathOverlay: Phaser.GameObjects.Rectangle[] = [];
  enemyType: string;
  grid: Phaser.GameObjects.Grid;
  allyStarterTiles: Phaser.Tilemaps.Tile[];
  enemyStarterTiles: Phaser.Tilemaps.Tile[];
  isInPreparationPhase: boolean;

  // bonuses from cards
  rangeBonus = 0;
  damageBonus = 0; // percentage
  mpBonus = 0;
  apBonus = 0;
  hpBonus = 0;
  eotBonus = 0; // effect over time damage multiplier (percentage)

  constructor() {
    super({
      key: "BattleScene",
    });
    BattleScene.refreshBattleMapsNumbers();
  }

  static refreshBattleMapsNumbers() {
    // array containing the number of the battle scenes ([1,2,3] typically)
    for (let i = 1; i <= this.mapsCount; i++) {
      this.mapNumbers.push(i);
    }
  }

  create(data: any): void {
    this.cameras.main.fadeIn(1000, 0, 0, 0);
    // refresh scene to its original state
    this.timelineIndex = 0;
    this.isPlayerTurn = false;
    this.spellVisible = false;
    this.isInPreparationPhase = true;
    this.resetBonuses();

    this.applyCardBonuses();
    this.createTilemap();
    this.addUnitsOnStart(data);

    // camera settings
    const zoom = 2;
    this.setupCamera(zoom);

    // game grid
    this.addGrid(zoom);

    // create the timeline
    this.timeline = createTimeline(this.allies, this.enemies);

    // clean up event listener on Scene shutdown
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off(Phaser.Input.Events.POINTER_UP);
    });

    // start UI
    this.scene.launch("BattleUIScene");
    this.uiScene = this.scene.get("BattleUIScene") as BattleUIScene;

    // and finally, player gets to choose their starter position
    this.displayWholeScreenMessage("Preparation phase", 2000);
    this.chooseStartPosition();
  }

  applyCardBonuses() {
    DeckService.cards.forEach((cardType) => {
      const bonusData = DeckService.bonusCardsData[cardType];
      if (bonusData) {
        switch (bonusData.type) {
          case "RangeBonus":
            this.rangeBonus++;
            break;
          case "DamageBonus":
            this.damageBonus += 20;
            break;
          case "MpBonus":
            this.mpBonus++;
            break;
          case "ApBonus":
            this.apBonus++;
            break;
          case "HpBonus":
            this.hpBonus += 20;
            break;
          case "EotBonus":
            this.eotBonus += 100;
            break;
          default:
            break;
        }
      }
    });
  }

  private resetBonuses() {
    this.rangeBonus = 0;
    this.damageBonus = 0;
    this.mpBonus = 0;
    this.apBonus = 0;
    this.hpBonus = 0;
    this.eotBonus = 0;
  }

  // add event listener for spell unselect when clicking outside spell range
  private addSpellUnselectListener() {
    this.input.on(
      Phaser.Input.Events.POINTER_UP,
      (pointer: Phaser.Input.Pointer) => {
        // continue only if player turn and not already moving
        if (!this.currentPlayer.isMoving && this.isPlayerTurn) {
          const { worldX, worldY } = pointer;

          const targetVec = this.backgroundLayer.worldToTileXY(worldX, worldY);

          // if in spell mode
          if (this.spellVisible) {
            // if cliked outside spell range, unselect spell and go back to movement mode
            if (
              !this.spellRange.some((tile) => {
                return tile.x == targetVec.x && tile.y == targetVec.y;
              })
            ) {
              this.clearSpellRange();
              this.highlightAccessibleTiles(this.accessibleTiles);
            }
          }
        }
      }
    );
  }

  private addGrid(zoom: number) {
    this.grid = this.add.grid(
      0,
      0,
      this.map.widthInPixels * zoom,
      this.map.heightInPixels * zoom,
      this.map.tileWidth,
      this.map.tileHeight,
      0xffffff,
      0,
      0x000000,
      0.1
    );
  }

  private setupCamera(zoom: number) {
    this.cameras.main.setZoom(zoom);
    this.cameras.main.setBounds(
      0,
      0,
      this.map.widthInPixels,
      this.map.heightInPixels
    );
    this.cameras.main.roundPixels = true;
  }

  chooseStartPosition() {
    const playerColor = 0x0000ff;
    const enemyColor = 0xff0000;

    this.allyStarterTiles.forEach((tile) => {
      // overlay the tiles with an interactive transparent rectangle
      let overlay = this.add.rectangle(
        tile.pixelX + 0.5 * tile.width,
        tile.pixelY + 0.5 * tile.height,
        tile.width,
        tile.height,
        playerColor,
        0.4
      );
      overlay.setInteractive();
      this.overlays.push(overlay);

      // on click, teleport to new starter position
      overlay.on("pointerup", () => {
        const grabbedCharacter = this.timeline.find((unit) => unit.isGrabbed);
        if (grabbedCharacter) {
          // if unit already there, swap positions
          const unitToSwap = this.getUnitAtPos(tile.x, tile.y);
          if (unitToSwap) {
            unitToSwap.teleportToPosition(
              grabbedCharacter.indX,
              grabbedCharacter.indY
            );
            unitToSwap.unselectUnit();
          }
          grabbedCharacter.teleportToPosition(tile.x, tile.y);
          grabbedCharacter.ungrabUnit();
        }
      });
      overlay.on("pointerover", () => {
        tile.tint = 0x0000ff;
      });
      overlay.on("pointerout", () => {
        tile.tint = 0xffffff;
      });
    });

    this.allies.forEach((unit) => {
      unit.on("pointerup", () => {
        const grabbedCharacter = this.timeline.find((unit) => unit.isGrabbed);
        if (grabbedCharacter && grabbedCharacter !== unit) {
          // if unit already there, swap positions
          const prevX = unit.indX;
          const prevY = unit.indY;
          unit.teleportToPosition(grabbedCharacter.indX, grabbedCharacter.indY);
          unit.unselectUnit();
          grabbedCharacter.teleportToPosition(prevX, prevY);
          grabbedCharacter.ungrabUnit();
          grabbedCharacter.selectUnit();
        }
      });
    });

    this.enemyStarterTiles.forEach((tile) => {
      // overlay the tile with an interactive transparent rectangle
      let overlay = this.add.rectangle(
        tile.pixelX + 0.5 * tile.width,
        tile.pixelY + 0.5 * tile.height,
        tile.width,
        tile.height,
        enemyColor,
        0.4
      );
      this.overlays.push(overlay);
    });
  }

  private calculatePlayerStarterTiles() {
    this.allyStarterTiles = this.backgroundLayer.filterTiles(
      (tile: Phaser.Tilemaps.Tile) => this.isWalkable(tile.x, tile.y),
      this,
      0,
      0,
      this.map.width / 3,
      this.map.height
    );
  }

  private calculateEnemyStarterTiles() {
    this.enemyStarterTiles = this.backgroundLayer.filterTiles(
      (tile: Phaser.Tilemaps.Tile) => this.isWalkable(tile.x, tile.y),
      this,
      Math.floor((this.map.width * 2) / 3),
      0,
      this.map.width / 3,
      this.map.height
    );
  }

  isWalkable(indX: number, indY: number) {
    return (
      !this.obstaclesLayer.getTileAt(indX, indY) &&
      !this.transparentObstaclesLayer.getTileAt(indX, indY)
    );
  }

  private displayWholeScreenMessage(text: string, delay: number) {
    const screenCenterX = this.cameras.main.displayWidth / 2;
    const screenCenterY = this.cameras.main.displayHeight / 2;
    const displayedText = this.add
      .bitmapText(screenCenterX, screenCenterY, "dogicapixel", text)
      .setOrigin(0.5)
      .setScale(2)
      .setDepth(99999);
    const overlay = this.add
      .rectangle(
        0,
        0,
        this.cameras.main.displayWidth,
        this.cameras.main.displayHeight,
        0x999999,
        0.7
      )
      .setInteractive()
      .setOrigin(0)
      .setDepth(99998);

    this.time.addEvent({
      delay: delay,
      callback: () => {
        displayedText.destroy();
        overlay.destroy();
      },
      callbackScope: this,
    });
  }

  // play this after player chose starter position and pressed start button
  startBattle() {
    this.isInPreparationPhase = false;
    this.ungrabPreviouslyGrabbedUnit();
    this.clearPointerEvents();
    this.clearOverlay();
    this.enemyStarterTiles = [];
    this.allyStarterTiles = [];
    this.displayWholeScreenMessage("The battle begins !", 1000);
    this.addSpellUnselectListener();
    this.highlightCurrentUnitInTimeline();
    this.uiScene.createEndTurnButton();
    const firstCharacter = this.timeline[0];
    if (firstCharacter instanceof Player) {
      this.startPlayerTurn(firstCharacter);
      this.uiScene.refreshSpells();
    }
    firstCharacter.playTurn();
  }

  // end turn after clicking end turn button (for player) or finishing actions (for npcs)
  endTurn = () => {
    this.uiScene.refreshUI();
    // clear previous player highlight on the timeline
    let prevPlayer = this.timeline[this.timelineIndex];
    if (prevPlayer) {
      this.uiScene.uiTimelineBackgrounds[this.timelineIndex].fillColor =
        prevPlayer.isAlly ? 0x0000ff : 0xff0000;
    }

    if (this.isPlayerTurn) {
      this.uiScene.endPlayerTurn();
      this.isPlayerTurn = false;
    }

    this.timelineIndex++;
    if (this.timelineIndex >= this.timeline.length) {
      this.timelineIndex = 0;
    }

    const currentUnit = this.timeline[this.timelineIndex];

    this.highlightCurrentUnitInTimeline();
    currentUnit.playTurn();
    if (currentUnit instanceof Player) {
      this.startPlayerTurn(currentUnit);
    }
  };

  private addUnitsOnStart(data: any) {
    this.calculatePlayerStarterTiles();
    this.calculateEnemyStarterTiles();

    // we retrieve the player characters from the deck list
    DeckService.cards.forEach((card: string) => {
      const playerData = UnitService.units[card];
      if (playerData) {
        let x: number, y: number;
        do {
          const randTile = Phaser.Math.RND.between(
            0,
            this.allyStarterTiles.length - 1
          );
          const tile = this.allyStarterTiles[randTile];
          x = tile.x;
          y = tile.y;
        } while (y < 2 || this.isAllyThere(x, y));
        this.addUnit(playerData, x, y, false, true);
      }
    });

    // enemy
    for (let i = 0; i < this.enemyCount; i++) {
      const enemyData = UnitService.units[data.enemyType];
      let x: number, y: number;
      do {
        const randTile = Phaser.Math.RND.between(
          0,
          this.enemyStarterTiles.length - 1
        );
        const tile = this.enemyStarterTiles[randTile];
        x = tile.x;
        y = tile.y;
      } while (this.isEnemyThere(x, y));
      this.addUnit(enemyData, x, y, true, false);
    }
  }

  clearAllUnits() {
    this.timeline.forEach((unit) => {
      unit.destroyUnit();
    });
    this.timeline = [];
    this.allies = [];
    this.enemies = [];
  }

  private createTilemap() {
    const mapName = MapService.getCurrentZoneName();
    // choose map randomly among a set
    const randomMapIndex = Phaser.Math.RND.between(
      0,
      BattleScene.mapNumbers.length - 1
    );

    this.map = this.make.tilemap({
      key: `${mapName}_battlemap${BattleScene.mapNumbers[randomMapIndex]}`,
    });
    // then remove map from current battle maps so we don't get the same one twice
    BattleScene.mapNumbers.splice(randomMapIndex, 1);

    this.tileWidth = this.map.tileWidth;
    this.tileHeight = this.map.tileHeight;

    // get the tileset
    let tilesetName = MapService.getCurrentZoneName();
    // the forest tileset is common to forest and corrupt_forest zones
    if (tilesetName.includes("forest")) {
      tilesetName = "forest";
    }
    this.tileset = this.map.addTilesetImage(
      `${tilesetName}_tilemap`,
      `${tilesetName}_tiles`
    );

    // create layers
    this.backgroundLayer = this.map.createLayer(
      "background_layer",
      this.tileset,
      0,
      0
    );
    this.obstaclesLayer = this.map.createLayer(
      "obstacles_layer",
      this.tileset,
      0,
      0
    );
    // layer for obstacles that do not block line of sight
    this.transparentObstaclesLayer = this.map.createLayer(
      "transparent_obstacles_layer",
      this.tileset,
      0,
      0
    );
    // layer for tall items appearing on top of the player like trees
    let overPlayer = this.map.createLayer("top_layer", this.tileset, 0, 0);
    // always on top
    overPlayer?.setDepth(9999);
    // transparent to see player beneath tall items
    overPlayer?.setAlpha(0.5);
  }

  private startPlayerTurn(player: Player) {
    this.currentPlayer = player;
    this.uiScene.startPlayerTurn();
    this.isPlayerTurn = true;
    this.refreshAccessibleTiles();
    this.highlightAccessibleTiles(this.accessibleTiles);
  }

  private highlightCurrentUnitInTimeline() {
    this.uiScene.uiTimelineBackgrounds[this.timelineIndex].fillColor = 0xffffff;
  }

  /** Checks if the unit can access this tile with their remaining MPs.
   *  If there is a path, return it. Else return null.
   */
  getPathToPositionWithRemainingMps(
    unitX: number,
    unitY: number,
    x: number,
    y: number,
    pm: number
  ) {
    const path = this.getPathBetweenPositions(unitX, unitY, x, y);
    if (path && path.length <= pm) {
      return path;
    } else {
      return null;
    }
  }

  /** Returns the shortest path between two positions if it exists, or null if it doesn't. */
  getPathBetweenPositions(
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    pathToUnitContact: boolean = false
  ) {
    const startVec = new Phaser.Math.Vector2(startX, startY);
    const targetVec = new Phaser.Math.Vector2(targetX, targetY);

    if (pathToUnitContact) {
      const targetUnit = this.getUnitAtPos(targetVec.x, targetVec.y);
      if (targetUnit) {
        this.removeFromObstacleLayer(targetUnit);
      }
    }
    const path = findPath(
      startVec,
      targetVec,
      this.backgroundLayer,
      this.obstaclesLayer,
      this.transparentObstaclesLayer
    );
    if (pathToUnitContact) {
      if (path) path.pop();
      this.addToObstacleLayer(targetVec);
    }

    if (path && path.length > 0) {
      return path;
    } else {
      return null;
    }
  }

  // highlight tiles accessible to the player
  // and make them interactive
  highlightAccessibleTiles = (positions: TilePath[]) => {
    let baseColor = 0xffffff;
    positions.forEach((tilePos) => {
      let tile = this.backgroundLayer?.getTileAt(tilePos.pos.x, tilePos.pos.y);
      // overlay the tile with an interactive transparent rectangle
      let overlay = this.add.rectangle(
        tile.pixelX + 0.5 * tile.width,
        tile.pixelY + 0.5 * tile.height,
        tile.width,
        tile.height,
        baseColor,
        0.4
      );
      overlay.setInteractive();
      this.overlays.push(overlay);

      // on clicking on a tile, move
      overlay.on("pointerup", () => {
        if (!this.currentPlayer.isMoving) {
          this.currentPlayer.moveAlong(tilePos.path);
          this.uiScene.refreshUI();
        }
      });
      // on hovering over a tile, display path to it
      overlay.on("pointerover", () => {
        if (!this.currentPlayer.isMoving) this.highlightPath(tilePos.path);
      });
      overlay.on("pointerout", () => {
        if (!this.currentPlayer.isMoving) this.clearPathHighlight();
      });
    });
  };

  // highlight tiles on a path
  highlightPath(path: Phaser.Math.Vector2[]) {
    let highlightColor = 0xffffff;
    path.forEach((position) => {
      let pos = this.backgroundLayer.tileToWorldXY(position.x, position.y);
      this.pathOverlay.push(
        this.add.rectangle(
          pos.x + 0.5 * this.tileWidth,
          pos.y + 0.5 * this.tileHeight,
          this.tileWidth,
          this.tileHeight,
          highlightColor,
          0.5
        )
      );
    });
  }

  clearPathHighlight() {
    this.pathOverlay.forEach((overlay) => {
      overlay.destroy(true);
    });
    this.pathOverlay = [];
  }

  // calculate the accessible tiles around a position with a pm radius
  // also store the path to each tile
  calculateAccessibleTiles = (
    pos: Phaser.Math.Vector2,
    pm: number
  ): TilePath[] => {
    const { x, y } = pos;
    let tablePos: TilePath[] = [];
    const tilesAround = this.backgroundLayer?.getTilesWithin(
      x - pm,
      y - pm,
      pm * 2 + 1,
      pm * 2 + 1
    );
    if (tilesAround) {
      tilesAround.forEach((tile) => {
        const isPlayerTile = tile.x == x && tile.y == y;
        const distance = Math.abs(tile.x - pos.x) + Math.abs(tile.y - pos.y);
        let path;
        if (!isPlayerTile && pm >= distance) {
          path = this.getPathToPositionWithRemainingMps(
            x,
            y,
            tile.x,
            tile.y,
            pm
          );
        }
        if (path) {
          let myPos: TilePath = {
            path: path,
            pos: new Phaser.Math.Vector2(tile.x, tile.y),
          };
          tablePos.push(myPos);
        }
      });
    }
    return tablePos;
  };

  // refresh the accessible tiles around the player
  refreshAccessibleTiles() {
    this.accessibleTiles = this.calculateAccessibleTiles(
      new Phaser.Math.Vector2(this.currentPlayer.indX, this.currentPlayer.indY),
      this.currentPlayer.mp
    );
  }

  // clear highlighted tiles
  clearAccessibleTiles = () => {
    this.clearOverlay();
    this.clearPathHighlight();
  };

  // add a unit to the scene
  addUnit(
    unitData: UnitData,
    startX: number,
    startY: number,
    npc: boolean,
    allied: boolean
  ) {
    const bonusMp = allied ? this.mpBonus : 0;
    const bonusAp = allied ? this.apBonus : 0;
    const bonusHp = allied ? this.hpBonus : 0;
    const key = "player";
    let unit: Unit;
    if (npc) {
      unit = new Npc(
        this,
        0,
        0,
        key,
        unitData.frame,
        startX,
        startY,
        unitData.MP,
        unitData.AP,
        unitData.HP,
        allied
      );
    } else {
      unit = new Player(
        this,
        0,
        0,
        key,
        unitData.frame,
        startX,
        startY,
        unitData.MP + bonusMp,
        unitData.AP + bonusAp,
        unitData.HP + bonusHp,
        allied
      );
    }
    unit.type = unitData.type;
    this.add.existing(unit);

    // create unit animations with base sprite and framerate
    if (!this.anims.exists("left" + unitData.type)) {
      this.createAnimations(unitData.frame, this.animFramerate, unitData.type);
    }

    // set player start position
    let initialPlayerX = unit.tilePosToPixelsX(unit.indX);
    let initialPlayerY = unit.tilePosToPixelsY(unit.indY);
    unit.setPosition(initialPlayerX, initialPlayerY);
    const unitScale = 1.5;
    unit.setScale(unitScale);
    if (allied) {
      this.allies.push(unit);
    } else {
      this.enemies.push(unit);
    }
    // add spells
    unit.addSpells.apply(unit, SpellService.decodeSpellString(unitData.spells));
    // unit is now considered as an obstacle for other units
    this.addToObstacleLayer(new Phaser.Math.Vector2(unit.indX, unit.indY));
    // initialize health bar
    unit.updateHealthBar();
    unit.depth = unit.y;
    // create blue or red circle under unit's feet to identify its team
    unit.createTeamIdentifier(unitScale);
    unit.setInteractive();
    return unit;
  }

  /** Creates a set of animations from a framerate and a base sprite. */
  createAnimations = (baseSprite: number, framerate: number, name: string) => {
    // animation for 'left'
    this.anims.create({
      key: "left" + name,
      frames: this.anims.generateFrameNumbers("player", {
        frames: [
          baseSprite + 2,
          baseSprite + 14,
          baseSprite + 2,
          baseSprite + 26,
        ],
      }),
      frameRate: framerate,
      repeat: -1,
    });
    // animation for 'left attack'
    this.anims.create({
      key: "leftAttack" + name,
      frames: this.anims.generateFrameNumbers("player", {
        frames: [baseSprite + 14, baseSprite + 2],
      }),
      frameRate: framerate,
      repeat: 0,
    });
    // animation for 'right'
    this.anims.create({
      key: "right" + name,
      frames: this.anims.generateFrameNumbers("player", {
        frames: [
          baseSprite + 1,
          baseSprite + 13,
          baseSprite + 1,
          baseSprite + 25,
        ],
      }),
      frameRate: framerate,
      repeat: -1,
    });
    // animation for 'right attack'
    this.anims.create({
      key: "rightAttack" + name,
      frames: this.anims.generateFrameNumbers("player", {
        frames: [baseSprite + 13, baseSprite + 1],
      }),
      frameRate: framerate,
      repeat: 0,
    });
    // animation for 'up'
    this.anims.create({
      key: "up" + name,
      frames: this.anims.generateFrameNumbers("player", {
        frames: [
          baseSprite + 3,
          baseSprite + 15,
          baseSprite + 3,
          baseSprite + 27,
        ],
      }),
      frameRate: framerate,
      repeat: -1,
    });
    // animation for 'up attack'
    this.anims.create({
      key: "upAttack" + name,
      frames: this.anims.generateFrameNumbers("player", {
        frames: [baseSprite + 15, baseSprite + 3],
      }),
      frameRate: framerate,
      repeat: 0,
    });
    // animation for 'down'
    this.anims.create({
      key: "down" + name,
      frames: this.anims.generateFrameNumbers("player", {
        frames: [baseSprite, baseSprite + 12, baseSprite, baseSprite + 24],
      }),
      frameRate: framerate,
      repeat: -1,
    });
    // animation for 'down attack'
    this.anims.create({
      key: "downAttack" + name,
      frames: this.anims.generateFrameNumbers("player", {
        frames: [baseSprite + 12, baseSprite],
      }),
      frameRate: framerate,
      repeat: 0,
    });
  };

  // update position of Unit as an obstacle for the others
  updateObstacleLayer(unit: Unit, target: Phaser.Math.Vector2) {
    this.removeFromObstacleLayer(unit);
    this.addToObstacleLayer(target);
  }

  removeFromObstacleLayer(unit: Unit) {
    this.obstaclesLayer.removeTileAt(unit.indX, unit.indY);
  }

  removeUnitFromBattle(unit: Unit) {
    this.removeFromObstacleLayer(unit);
    this.removeUnitFromTimeline(unit);
    this.removeUnitFromTeam(unit);
    this.refreshAccessibleTiles();
    if (this.spellVisible) {
      this.displaySpellRange(this.currentSpell);
    }
  }

  removeUnitFromTeam(unit: Unit) {
    const teamArray = unit.isAlly ? this.allies : this.enemies;
    const index = teamArray.findIndex((unitToDelete) => unitToDelete === unit);
    if (index !== -1) {
      teamArray.splice(index, 1);
    }
  }

  addToObstacleLayer(target: Phaser.Math.Vector2) {
    const targetTile = this.backgroundLayer.getTileAt(target.x, target.y);
    const newObstacle = this.obstaclesLayer.putTileAt(
      targetTile,
      target.x,
      target.y
    );
    newObstacle.setAlpha(0);
  }

  displaySpellRange(spell: Spell) {
    this.clearAccessibleTiles();
    this.clearOverlay();
    this.clearAoeZone();
    this.clearPointerEvents();

    this.spellVisible = true;
    this.currentSpell = spell;
    this.spellRange = this.calculateSpellRange(this.currentPlayer, spell);
    this.createAoeZone(spell);
    let baseColor = 0x000099;
    this.spellRange.forEach((tile) => {
      if (tile) {
        // overlay the tile with an interactive transparent rectangle
        let overlay = this.add.rectangle(
          tile.pixelX + 0.5 * tile.width,
          tile.pixelY + 0.5 * tile.height,
          tile.width,
          tile.height,
          baseColor,
          0.4
        );
        overlay.setInteractive();
        this.overlays.push(overlay);
        const pos = new Phaser.Math.Vector2(tile.x, tile.y);

        // on clicking on a tile, cast spell
        overlay.on("pointerup", () => {
          this.currentPlayer.castSpell(
            this.currentSpell,
            pos,
            this.damageBonus
          );
        });
        //on hovering over a tile, display aoe zone
        overlay.on("pointerover", () => {
          this.updateAoeZone(spell, tile.pixelX, tile.pixelY);
        });
        overlay.on("pointerout", () => {
          this.hideAoeZone();
        });

        // we want hover or click on a unit to have the same effect than hover or click on its tile
        const playerOnThisTile = this.getUnitAtPos(tile.x, tile.y);
        if (playerOnThisTile) {
          playerOnThisTile.on("pointerup", () => {
            this.currentPlayer.castSpell(
              this.currentSpell,
              pos,
              this.damageBonus
            );
          });
          playerOnThisTile.on("pointerover", () => {
            this.updateAoeZone(spell, tile.pixelX, tile.pixelY);
          });
          playerOnThisTile.on("pointerout", () => {
            this.hideAoeZone();
          });
        }
      }
    });
  }

  hideAoeZone() {
    this.spellAoeOverlay.forEach((overlay) => {
      overlay.setVisible(false);
    });
  }

  // create aoe zone but doesn't display it yet
  createAoeZone(spell: Spell) {
    const highlightColor = 0xff0099;
    const alpha = 0.6;
    switch (spell.aoe) {
      case "monoTarget":
        const overlay = this.add.rectangle(
          0,
          0,
          this.tileWidth,
          this.tileHeight,
          highlightColor,
          alpha
        );
        overlay.setVisible(false);
        this.spellAoeOverlay.push(overlay);
        break;
      case "star":
        // for the 'star' aoe, we iterate over the tiles within the 'aoeSize' distance from target
        for (let i = -spell.aoeSize; i <= spell.aoeSize; i++) {
          for (let j = -spell.aoeSize; j <= spell.aoeSize; j++) {
            let distance = Math.abs(i) + Math.abs(j);
            if (distance <= spell.aoeSize) {
              const overlay = this.add.rectangle(
                0,
                0,
                this.tileWidth,
                this.tileHeight,
                highlightColor,
                alpha
              );
              overlay.setVisible(false);
              this.spellAoeOverlay.push(overlay);
            }
          }
        }
        break;
      case "line":
        // this aoe should only be used with spells cast in a straight line
        for (let i = 0; i < spell.aoeSize; i++) {
          const overlay = this.add.rectangle(
            0,
            0,
            this.tileWidth,
            this.tileHeight,
            highlightColor,
            alpha
          );
          overlay.setVisible(false);
          this.spellAoeOverlay.push(overlay);
        }
        break;
      default:
        break;
    }
  }

  // update the position of the aoe zone, when player hovers over tile
  updateAoeZone(spell: Spell, x: number, y: number) {
    switch (spell.aoe) {
      case "monoTarget":
        const overlay = this.spellAoeOverlay[0];
        overlay.x = x + 0.5 * this.tileWidth;
        overlay.y = y + 0.5 * this.tileWidth;
        overlay.setVisible(true);
        break;
      case "star":
        // for the 'star' aoe, we iterate over the tiles within the 'aoeSize' distance from target
        let target = this.backgroundLayer.worldToTileXY(x, y);
        let k = 0;
        for (
          let i = target.x - spell.aoeSize;
          i <= target.x + spell.aoeSize;
          i++
        ) {
          for (
            let j = target.y - spell.aoeSize;
            j <= target.y + spell.aoeSize;
            j++
          ) {
            let distance = Math.abs(target.x - i) + Math.abs(target.y - j);
            if (distance <= spell.aoeSize) {
              let pos = this.backgroundLayer.tileToWorldXY(i, j);
              const overlay = this.spellAoeOverlay[k];
              overlay.x = pos.x + 0.5 * this.tileWidth;
              overlay.y = pos.y + 0.5 * this.tileWidth;
              overlay.setVisible(true);
              k++;
            }
          }
        }
        break;
      case "line":
        // this aoe should only be used with spells cast in a straight line
        target = this.backgroundLayer.worldToTileXY(x, y);
        // true if target is aligned horizontally with player (else we assume it's aligned vertically)
        let isAlignedX = target.y == this.currentPlayer.indY;
        const baseIndex = isAlignedX ? target.x : target.y;
        const isForward = isAlignedX
          ? Math.sign(target.x - this.currentPlayer.indX)
          : Math.sign(target.y - this.currentPlayer.indY);
        for (let i = 0; i < spell.aoeSize; i++) {
          const overlay = this.spellAoeOverlay[i];
          let pos = isAlignedX
            ? this.backgroundLayer.tileToWorldXY(
                baseIndex + i * isForward,
                target.y
              )
            : this.backgroundLayer.tileToWorldXY(
                target.x,
                baseIndex + i * isForward
              );
          overlay.x = pos.x + 0.5 * this.tileWidth;
          overlay.y = pos.y + 0.5 * this.tileWidth;
          overlay.setVisible(true);
        }
        break;

      default:
        break;
    }
  }

  clearAoeZone() {
    this.spellAoeOverlay.forEach((spellAoe) => {
      spellAoe.destroy(true);
    });
    this.spellAoeOverlay = [];
  }

  getUnitsInsideAoe(caster: Unit, indX: number, indY: number, spell: Spell) {
    let units: Unit[] = [];
    switch (spell.aoe) {
      case "monoTarget":
        if (this.isUnitThere(indX, indY)) {
          units.push(this.getUnitAtPos(indX, indY));
        }
        break;
      case "star":
        for (let i = indX - spell.aoeSize; i <= indX + spell.aoeSize; i++) {
          for (let j = indY - spell.aoeSize; j <= indY + spell.aoeSize; j++) {
            let distance = Math.abs(indX - i) + Math.abs(indY - j);
            if (distance <= spell.aoeSize) {
              if (this.isUnitThere(i, j)) {
                units.push(this.getUnitAtPos(i, j));
              }
            }
          }
        }
        break;
      case "line":
        // this aoe should only be used with spells cast in a straight line
        let target = { x: indX, y: indY };
        // true if target is aligned horizontally with caster (else we assume it's aligned vertically)
        let isAlignedX = target.y == caster.indY;
        const baseIndex = isAlignedX ? target.x : target.y;
        const isForward = isAlignedX
          ? Math.sign(target.x - caster.indX)
          : Math.sign(target.y - caster.indY);
        for (let i = 0; i < spell.aoeSize; i++) {
          let pos = isAlignedX
            ? {
                x: baseIndex + i * isForward,
                y: target.y,
              }
            : {
                x: target.x,
                y: baseIndex + i * isForward,
              };
          if (this.isUnitThere(pos.x, pos.y)) {
            units.push(this.getUnitAtPos(pos.x, pos.y));
          }
        }
        break;

      default:
        break;
    }
    return units;
  }

  // calculate spell range
  calculateSpellRange(unit: Unit, spell: Spell) {
    let bonusRange = 0;
    // add bonus range to ranged spells only
    if (spell.maxRange > 1) {
      bonusRange = this.rangeBonus;
    }
    return this.backgroundLayer?.filterTiles(
      (tile: Phaser.Tilemaps.Tile) =>
        this.isTileAccessibleToSpell(unit, spell, tile, bonusRange),
      this,
      unit.indX - spell.maxRange - bonusRange,
      unit.indY - spell.maxRange - bonusRange,
      (spell.maxRange + bonusRange) * 2 + 1,
      (spell.maxRange + bonusRange) * 2 + 1
    );
  }

  /** Returns true if tile is visible for a given unit and spell. */
  isTileAccessibleToSpell(
    unit: Unit,
    spell: Spell,
    tile: Phaser.Tilemaps.Tile,
    bonusRange = 0
  ) {
    let startVec = new Phaser.Math.Vector2(unit.indX, unit.indY);
    let targetVec = new Phaser.Math.Vector2(tile.x, tile.y);
    let distance =
      Math.abs(startVec.x - targetVec.x) + Math.abs(startVec.y - targetVec.y);
    if (
      distance <= spell.maxRange + bonusRange &&
      distance >= spell.minRange &&
      !this.transparentObstaclesLayer.getTileAt(tile.x, tile.y) &&
      (!this.obstaclesLayer.getTileAt(tile.x, tile.y) ||
        this.isUnitThere(tile.x, tile.y))
    ) {
      // if spell doesn't need line of sight we just needed to ensure tile is in range and not an obstacle
      if (!spell.lineOfSight) return true;
      // else we use the line of sight algorithm
      else {
        // case of spells being cast in straight line only
        let isInStraightLine = true;
        if (spell.straightLine) {
          isInStraightLine = unit.indX === tile.x || unit.indY === tile.y;
        }
        return (
          isInStraightLine &&
          isVisible(
            startVec,
            targetVec,
            this.obstaclesLayer,
            this.transparentObstaclesLayer,
            this
          )
        );
      }
    }
    return false;
  }

  // return true if there is a unit at the specified position
  isUnitThere(x: number, y: number): boolean {
    return this.timeline.some((unit) => unit.indX == x && unit.indY == y);
  }

  isAllyThere(x: number, y: number): boolean {
    return this.allies.some((unit) => unit.indX == x && unit.indY == y);
  }

  isEnemyThere(x: number, y: number): boolean {
    return this.enemies.some((unit) => unit.indX == x && unit.indY == y);
  }

  // return unit at the specified position
  getUnitAtPos(x: number, y: number) {
    return this.timeline.find((unit) => unit.indX == x && unit.indY == y);
  }

  removeUnitFromTimeline(unit: Unit) {
    const index = this.timeline.findIndex(
      (timelineUnit) => timelineUnit == unit
    );

    if (index !== -1) {
      this.timeline.splice(index, 1);
      if (index <= this.timelineIndex) this.timelineIndex--;
      if (this.timeline.length > 0) {
        this.uiScene.updateTimeline(this.timeline);
      }
    }
  }

  // add summoned unit after the summoner in the timeline
  addSummonedUnitToTimeline(summoner: Unit, summoned: Unit) {
    const index = this.timeline.findIndex(
      (timelineUnit) => timelineUnit == summoner
    );
    if (index !== -1) {
      this.timeline.splice(index + 1, 0, summoned);
    }
    this.uiScene.updateTimeline(this.timeline);
  }

  clearSpellRange() {
    this.spellVisible = false;
    this.uiScene.clearSpellsHighlight();
    this.clearOverlay();
    this.clearAoeZone();
    this.clearPointerEvents();
    this.clearAccessibleTiles();
  }

  clearPointerEvents() {
    this.timeline.forEach((unit) => {
      unit.off("pointerup");
      unit.off("pointerover");
      unit.off("pointerout");
      unit.addHoverEvents();
    });
  }

  clearOverlay() {
    this.overlays.forEach((overlay) => {
      overlay.destroy(true);
    });
    this.overlays = [];
  }

  gameOver() {
    this.resetScene();
    this.resetGameState();
    this.scene.start("EndScene", { isWin: false });
  }

  winBattle() {
    const delay = 1200;
    this.displayWholeScreenMessage("Victory !", delay);
    this.time.addEvent({
      delay: delay,
      callback: () => {
        this.resetScene();
        MapService.incrementPosition();
        // if you reached the end of the last zone, you win !
        if (MapService.zone >= MapService.zoneCount) {
          this.resetGameState();
          this.scene.start("EndScene", { isWin: true });
        } else {
          this.scene.start("ChooseCardScene", { isStarting: false });
        }
      },
      callbackScope: this,
    });
  }

  private resetGameState() {
    MapService.resetMap();
    DeckService.cards = [];
    UnitService.remainingUnits = Object.fromEntries(
      Object.entries(UnitService.units).filter(
        ([key, value]) => value.isPlayable
      )
    );
  }

  resetScene() {
    this.clearSpellRange();
    this.clearAllUnits();
    this.map.destroy();
    this.grid.destroy();
    this.currentPlayer = null;
    this.scene.stop("BattleUIScene");
  }

  gameIsOver() {
    return this.allies.length === 0;
  }

  battleIsFinished() {
    return this.enemies.length === 0;
  }

  ungrabPreviouslyGrabbedUnit() {
    this.findPreviouslyGrabbedUnit()?.ungrabUnit();
  }

  findPreviouslyGrabbedUnit() {
    return this.timeline.find((unit) => unit.isGrabbed);
  }

  isThereAGrabbedUnitAlready() {
    return this.timeline.some((unit) => unit.isGrabbed);
  }

  getManhattanDistance(unitA: Unit, unitB: Unit) {
    return (
      Math.abs(unitA.indX - unitB.indX) + Math.abs(unitA.indY - unitB.indY)
    );
  }
}

// play order : alternate between allies and enemies
let createTimeline = (allies: Unit[], enemies: Unit[]) => {
  const maxSize = Math.max(allies.length, enemies.length);
  let timeline: Unit[] = [];
  for (let i = 0; i < maxSize; i++) {
    if (allies.length > i) {
      timeline.push(allies[i]);
    }
    if (enemies.length > i) {
      timeline.push(enemies[i]);
    }
  }
  return timeline;
};
