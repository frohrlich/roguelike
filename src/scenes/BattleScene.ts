import Phaser from "phaser";
import { Unit } from "../classes/battle/Unit";
import findPath from "../utils/findPath";
import { Npc } from "../classes/battle/Npc";
import { Player } from "../classes/battle/Player";
import { Spell } from "../classes/battle/Spell";
import { BattleUIScene } from "./BattleUIScene";
import isVisible from "../utils/lineOfSight";
import { UnitData, findUnitDataByType } from "../data/UnitData";
import { decodeSpellString } from "../data/SpellData";
import { DeckService } from "../services/DeckService";
import { MapService } from "../services/MapService";

// Store a tile and the path to it
interface TilePath {
  pos: Phaser.Math.Vector2;
  path: Phaser.Math.Vector2[];
}

export class BattleScene extends Phaser.Scene {
  animFramerate: number = 5;
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
  playerStarterTiles: Phaser.Tilemaps.Tile[];
  enemyStarterTiles: Phaser.Tilemaps.Tile[];
  isInPreparationPhase: boolean;

  constructor() {
    super({
      key: "BattleScene",
    });
  }

  preload(): void {}

  create(data: any): void {
    // refresh scene to its original state
    this.timelineIndex = 0;
    this.isPlayerTurn = false;
    this.spellVisible = false;
    this.isInPreparationPhase = true;

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
    this.scene.run("BattleUIScene");
    this.uiScene = this.scene.get("BattleUIScene") as BattleUIScene;

    // and finally, player gets to choose their starter position
    this.chooseStartPosition();
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

    this.playerStarterTiles.forEach((tile) => {
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
          if (this.isUnitThere(tile.x, tile.y)) {
            this.getUnitAtPos(tile.x, tile.y).teleportToPosition(
              grabbedCharacter.indX,
              grabbedCharacter.indY
            );
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
    this.playerStarterTiles = this.backgroundLayer.filterTiles(
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

  displayBattleStartScreen() {
    const screenCenterX = this.cameras.main.displayWidth / 2;
    const screenCenterY = this.cameras.main.displayHeight / 2;
    const battleStartText = "The battle begins !";
    const battleStart = this.add
      .bitmapText(screenCenterX, screenCenterY, "dogicapixel", battleStartText)
      .setOrigin(0.5)
      .setScale(2)
      .setDepth(99999);
    const battleStartOverlay = this.add
      .rectangle(
        0,
        0,
        this.cameras.main.displayWidth,
        this.cameras.main.displayHeight,
        0x999999,
        0.7
      )
      .setOrigin(0)
      .setDepth(99998);

    this.time.addEvent({
      delay: 1500,
      callback: () => {
        battleStart.destroy();
        battleStartOverlay.destroy();
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
    this.playerStarterTiles = [];
    this.displayBattleStartScreen();
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
      const playerData = findUnitDataByType(card);
      if (playerData) {
        let x: number, y: number;
        do {
          const randTile = Phaser.Math.RND.between(
            0,
            this.playerStarterTiles.length - 1
          );
          const tile = this.playerStarterTiles[randTile];
          x = tile.x;
          y = tile.y;
        } while (this.isUnitThere(x, y));
        this.addUnit(playerData, x, y, false, true);
      } else {
        throw new Error("Error : unit not found");
      }
    });

    // enemy
    const enemyData = findUnitDataByType(data.enemyType);
    if (enemyData) {
      const randTile = Phaser.Math.RND.between(
        0,
        this.enemyStarterTiles.length - 1
      );
      const { x, y } = this.enemyStarterTiles[randTile];
      this.addUnit(enemyData, x, y, true, false);
    } else {
      throw new Error("Error : unit not found");
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
    // choose map randomly among a set
    const mapCount = 3;
    const randomMapIndex = Phaser.Math.RND.between(1, mapCount);
    this.map = this.make.tilemap({ key: `forest_battlemap${randomMapIndex}` });
    this.tileWidth = this.map.tileWidth;
    this.tileHeight = this.map.tileHeight;

    // get the tileset
    this.tileset = this.map.addTilesetImage("forest_tilemap", "tiles");

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
   *  If there is a path, return it.
   */
  getPathToPosition(
    x: number,
    y: number,
    unitX: number,
    unitY: number,
    pm: number
  ) {
    const startVec = new Phaser.Math.Vector2(unitX, unitY);
    const targetVec = new Phaser.Math.Vector2(x, y);

    const path = findPath(
      startVec,
      targetVec,
      this.backgroundLayer,
      this.obstaclesLayer,
      this.transparentObstaclesLayer
    );
    if (path && path.length > 0 && path.length <= pm) {
      return path;
    } else {
      return false;
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
          path = this.getPathToPosition(tile.x, tile.y, x, y, pm);
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
        unitData.MP,
        unitData.AP,
        unitData.HP,
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
    let initialPlayerX = unit.tilePosToPixelsX();
    let initialPlayerY = unit.tilePosToPixelsY();
    unit.setPosition(initialPlayerX, initialPlayerY);
    const unitScale = 1.5;
    unit.setScale(unitScale);
    if (allied) {
      this.allies.push(unit);
    } else {
      this.enemies.push(unit);
    }
    // add spells
    unit.addSpells.apply(unit, decodeSpellString(unitData.spells));
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
    const index = teamArray.findIndex((unit) => unit == unit);
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

        // on clicking on a tile, launch spell
        overlay.on("pointerup", () => {
          this.currentPlayer.castSpell(this.currentSpell, pos);
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
            this.currentPlayer.castSpell(this.currentSpell, pos);
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
    return this.backgroundLayer?.filterTiles(
      (tile: Phaser.Tilemaps.Tile) =>
        this.isTileAccessibleToSpell(unit, spell, tile),
      this,
      unit.indX - spell.maxRange,
      unit.indY - spell.maxRange,
      spell.maxRange * 2 + 1,
      spell.maxRange * 2 + 1
    );
  }

  /** Returns true if tile is visible for a given unit and spell. */
  isTileAccessibleToSpell(
    unit: Unit,
    spell: Spell,
    tile: Phaser.Tilemaps.Tile
  ) {
    let startVec = new Phaser.Math.Vector2(unit.indX, unit.indY);
    let targetVec = new Phaser.Math.Vector2(tile.x, tile.y);
    let distance =
      Math.abs(startVec.x - targetVec.x) + Math.abs(startVec.y - targetVec.y);
    if (
      distance <= spell.maxRange &&
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
    this.scene.start("BootScene");
  }

  winBattle() {
    this.resetScene();
    MapService.incrementPosition();
    this.scene.start("ChooseCardScene", { isStarting: false });
  }

  private resetGameState() {
    MapService.position = 0;
    DeckService.cards = [];
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
}

// play order : alternate between allies and enemies
let createTimeline = (allies: Unit[], enemies: Unit[]) => {
  const maxSize = Math.max(allies.length, enemies.length);
  let timeline: Unit[] = [];
  for (let i = 0; i < maxSize; i++) {
    if (enemies.length > i) {
      timeline.push(enemies[i]);
    }
    if (allies.length > i) {
      timeline.push(allies[i]);
    }
  }
  return timeline;
};
