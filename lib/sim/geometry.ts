import { idx, inBounds, isWalkable, MAP_H, MAP_W } from "./map"
import type { Dir, Tile, Vec } from "./types"

const NEIGHBORS: Vec[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
]

export const manhattan = (a: Vec, b: Vec) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
export const sameTile = (a: Vec, b: Vec) => a.x === b.x && a.y === b.y
export const adjacent = (a: Vec, b: Vec) => manhattan(a, b) === 1

export function neighbors(p: Vec): Vec[] {
  return NEIGHBORS.map((d) => ({ x: p.x + d.x, y: p.y + d.y })).filter((n) => inBounds(n.x, n.y))
}

/** BFS path from `from` to the nearest walkable tile matching `isGoal`, excluding the start tile. */
export function findPath(tiles: Tile[], from: Vec, isGoal: (p: Vec) => boolean): Vec[] | null {
  if (isGoal(from)) return []
  const prev = new Int32Array(MAP_W * MAP_H).fill(-1)
  const start = idx(from.x, from.y)
  prev[start] = start
  const queue: Vec[] = [from]
  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head]
    for (const n of neighbors(cur)) {
      const ni = idx(n.x, n.y)
      if (prev[ni] !== -1 || !isWalkable(tiles, n.x, n.y)) continue
      prev[ni] = idx(cur.x, cur.y)
      if (isGoal(n)) {
        const path: Vec[] = []
        let at = ni
        while (at !== start) {
          path.push({ x: at % MAP_W, y: Math.floor(at / MAP_W) })
          at = prev[at]
        }
        return path.reverse()
      }
      queue.push(n)
    }
  }
  return null
}

/** Walking distance from `from` to every tile; -1 when unreachable. */
export function distanceField(tiles: Tile[], from: Vec): Int16Array {
  const dist = new Int16Array(MAP_W * MAP_H).fill(-1)
  dist[idx(from.x, from.y)] = 0
  const queue: Vec[] = [from]
  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head]
    const d = dist[idx(cur.x, cur.y)]
    for (const n of neighbors(cur)) {
      const ni = idx(n.x, n.y)
      if (dist[ni] !== -1 || !isWalkable(tiles, n.x, n.y)) continue
      dist[ni] = d + 1
      queue.push(n)
    }
  }
  return dist
}

/** Steps to the nearest tile matching `isGoal`, or null when unreachable. */
export function stepsTo(field: Int16Array, isGoal: (p: Vec) => boolean): number | null {
  let best: number | null = null
  for (let i = 0; i < field.length; i++) {
    const d = field[i]
    if (d < 0 || (best !== null && d >= best)) continue
    if (isGoal({ x: i % MAP_W, y: Math.floor(i / MAP_W) })) best = d
  }
  return best
}

export function facingToward(from: Vec, to: Vec): Dir {
  const dx = to.x - from.x
  const dy = to.y - from.y
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "right" : "left"
  return dy >= 0 ? "down" : "up"
}

export function compass(from: Vec, to: Vec): string {
  const dx = to.x - from.x
  const dy = to.y - from.y
  if (dx === 0 && dy === 0) return "right here"
  const angle = (Math.atan2(-dy, dx) * 180) / Math.PI
  const dirs = ["east", "northeast", "north", "northwest", "west", "southwest", "south", "southeast"]
  return dirs[(Math.round(angle / 45) + 8) % 8]
}
