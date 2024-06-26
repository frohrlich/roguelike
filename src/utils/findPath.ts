import Phaser from "phaser";
import { PriorityQueue } from "./PriorityQueue";

export interface TilePosition {
  x: number;
  y: number;
}

interface CostValues {
  [key: string]: number;
}

const toKey = (x: number, y: number) => `${x}x${y}`;

/** A* path finding algorithm.
 * @see {@link https://blog.ourcade.co/posts/2020/phaser-3-point-click-pathfinding-movement-tilemap/}
 * @see {@link https://www.youtube.com/watch?v=nFAvgeYPwZc}
 */
const findPath = (
  start: Phaser.Math.Vector2,
  target: Phaser.Math.Vector2,
  groundLayer: Phaser.Tilemaps.TilemapLayer,
  wallsLayer: Phaser.Tilemaps.TilemapLayer,
  transparentWallsLayer: Phaser.Tilemaps.TilemapLayer
) => {
  // no path if select invalid tile
  if (!groundLayer.getTileAt(target.x, target.y)) {
    return [];
  }

  // no path if select a wall
  if (
    wallsLayer.getTileAt(target.x, target.y) ||
    transparentWallsLayer.getTileAt(target.x, target.y)
  ) {
    return [];
  }

  const queue = new PriorityQueue();
  const parentForKey: {
    [key: string]: { key: string; position: TilePosition };
  } = {};
  const costFromStart: CostValues = {};
  const costToTarget: CostValues = {};
  const startKey = toKey(start.x, start.y);
  const targetKey = toKey(target.x, target.y);

  parentForKey[startKey] = {
    key: "",
    position: { x: -1, y: -1 },
  };
  costFromStart[startKey] = 0;

  queue.enqueue(start, 0);

  while (!queue.isEmpty()) {
    const { x, y } = queue.dequeue()!.element;
    const currentKey = toKey(x, y);

    if (currentKey === targetKey) {
      break;
    }

    const neighbors = [
      { x, y: y - 1 }, // top
      { x: x + 1, y }, // right
      { x, y: y + 1 }, // bottom
      { x: x - 1, y }, // left
    ];

    for (let i = 0; i < neighbors.length; ++i) {
      const neighbor = neighbors[i];
      const tile = groundLayer.getTileAt(neighbor.x, neighbor.y);

      if (!tile) {
        continue;
      }

      if (
        wallsLayer.getTileAt(neighbor.x, neighbor.y) ||
        transparentWallsLayer.getTileAt(neighbor.x, neighbor.y)
      ) {
        continue;
      }

      const key = toKey(neighbor.x, neighbor.y);

      // replace '1' with cost from the movement costs grid
      // if you want to implement one...
      const cost = costFromStart[currentKey] + 1;

      if (!(key in costFromStart) || cost < costFromStart[key]) {
        parentForKey[key] = {
          key: currentKey,
          position: { x, y },
        };

        costFromStart[key] = cost;

        // y distance (manhattan distance)
        const dr = Math.abs(target.y - neighbor.y);
        // x distance
        const dc = Math.abs(target.x - neighbor.x);

        const distance = dr + dc;
        const totalCost = cost + distance;

        costToTarget[key] = totalCost;

        queue.enqueue(neighbor, totalCost);
      }
    }
  }

  const path: Phaser.Math.Vector2[] = [];

  let currentKey = targetKey;
  const parent = parentForKey[targetKey];
  if (parent === undefined) return null;
  let currentPos = parent.position;

  while (currentKey !== startKey) {
    const pos = new Phaser.Math.Vector2(currentPos.x, currentPos.y);

    path.push(pos);
    const { key, position } = parentForKey[currentKey];
    currentKey = key;
    currentPos = position;
  }

  const pathReturn = path.reverse();
  pathReturn.pop();
  pathReturn.push(target);
  return pathReturn;
};

export default findPath;
