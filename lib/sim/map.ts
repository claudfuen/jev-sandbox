// The world is Fernhollow (lib/sim/town-map.ts). This module is the stable facade
// the engine, geometry and renderer import, so they do not depend on the layout.

import type { Tile } from "./types"
import { buildTownMap, isTownWalkable, TOWN_H, TOWN_W } from "./town-map"

export const MAP_W = TOWN_W
export const MAP_H = TOWN_H
export const TILE = 16

export const idx = (x: number, y: number) => y * MAP_W + x
export const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H

export function tileAt(tiles: Tile[], x: number, y: number): Tile {
  return inBounds(x, y) ? tiles[idx(x, y)] : "tree"
}

export function isWalkable(tiles: Tile[], x: number, y: number): boolean {
  return isTownWalkable(tiles, x, y)
}

export { buildTownMap }
