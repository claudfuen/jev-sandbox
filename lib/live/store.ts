import { gunzipSync, gzipSync } from "node:zlib"

import { BlobPreconditionFailedError, get, put } from "@vercel/blob"

import { isCheckpoint, LEASE_MS, type Checkpoint } from "@/lib/sim/checkpoint"

// Server-only. The live world is one private blob, live/<id>.json.gz, holding a
// Checkpoint. Writes are conditional on the ETag the writer last saw, so two tabs
// can never interleave: the first write wins and the other tab becomes a viewer.

/** Decompressed checkpoints larger than this are refused. */
const MAX_BYTES = 40 * 1024 * 1024

const pathOf = (worldId: string) => `live/${worldId}.json.gz`

export type LiveRead = { status: 200; gz: Buffer; etag: string } | { status: 304; etag: string } | null

export async function readLive(worldId: string, ifNoneMatch?: string): Promise<LiveRead> {
  const result = await get(pathOf(worldId), { access: "private", useCache: false, ...(ifNoneMatch ? { ifNoneMatch } : {}) })
  if (!result) return null
  if (result.statusCode === 304) return { status: 304, etag: result.blob.etag }
  if (result.statusCode !== 200 || !result.stream) return null
  return { status: 200, gz: Buffer.from(await new Response(result.stream).arrayBuffer()), etag: result.blob.etag }
}

export function decode(gz: Buffer): Checkpoint {
  const json = gunzipSync(gz, { maxOutputLength: MAX_BYTES }).toString("utf8")
  const parsed: unknown = JSON.parse(json)
  if (!isCheckpoint(parsed)) throw new Error("Not a live-world checkpoint")
  return parsed
}

export class LeaseLost extends Error {}

/**
 * Stamps the lease for `clientId` and writes. `ifMatch` null means "create only".
 * Throws LeaseLost if someone else wrote since the caller's last read.
 */
export async function writeLive(worldId: string, cp: Checkpoint, clientId: string, ifMatch: string | null): Promise<string> {
  cp.lease = { clientId, until: Date.now() + LEASE_MS }
  cp.worldId = worldId
  cp.savedAt = new Date().toISOString()
  try {
    const result = await put(pathOf(worldId), gzipSync(JSON.stringify(cp)), {
      access: "private",
      addRandomSuffix: false,
      contentType: "application/gzip",
      allowOverwrite: ifMatch !== null,
      ...(ifMatch ? { ifMatch } : {}),
    })
    return result.etag
  } catch (error) {
    if (error instanceof BlobPreconditionFailedError) throw new LeaseLost("Another tab wrote the world first")
    // Create-only writes fail this way when the world already exists.
    if (ifMatch === null && /exist/i.test((error as Error).message)) throw new LeaseLost("The world already exists")
    throw error
  }
}

export const leaseHeldByOther = (cp: Checkpoint, clientId: string) =>
  !!cp.lease && cp.lease.clientId !== clientId && cp.lease.until > Date.now()
