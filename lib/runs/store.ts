import { gunzipSync, gzipSync } from "node:zlib"

import { get, list, put } from "@vercel/blob"

import type { RunMeta, RunRecord } from "@/lib/sim/session"

// Server-only. Runs live in the private Blob store `jev-sandbox-runs`:
//   runs/<id>.json.gz   the full record
//   runs/<id>.meta.json a small summary for the gallery
// Writes happen only from the owner's lab runner (it holds BLOB_READ_WRITE_TOKEN);
// the public app only reads.

export const RUN_ID = /^[a-z0-9][a-z0-9-]{2,80}$/

async function readBlob(pathname: string, useCache = true): Promise<Buffer | null> {
  const result = await get(pathname, { access: "private", useCache })
  if (!result || result.statusCode !== 200 || !result.stream) return null
  return Buffer.from(await new Response(result.stream).arrayBuffer())
}

export async function saveRun(record: RunRecord): Promise<void> {
  const { id } = record.meta
  if (!RUN_ID.test(id)) throw new Error(`Invalid run id: ${id}`)
  const opts = { access: "private" as const, addRandomSuffix: false, allowOverwrite: true }
  await put(`runs/${id}.json.gz`, gzipSync(JSON.stringify(record)), { ...opts, contentType: "application/gzip" })
  await put(`runs/${id}.meta.json`, JSON.stringify(record.meta), { ...opts, contentType: "application/json" })
}

export async function listRuns(): Promise<RunMeta[]> {
  const metas: string[] = []
  let cursor: string | undefined
  do {
    const page = await list({ prefix: "runs/", cursor, limit: 1000 })
    metas.push(...page.blobs.filter((b) => b.pathname.endsWith(".meta.json")).map((b) => b.pathname))
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)
  const loaded = await Promise.all(
    metas.map(async (pathname) => {
      // Summaries are small and can be rewritten, so read them fresh from origin.
      const buf = await readBlob(pathname, false)
      return buf ? (JSON.parse(buf.toString("utf8")) as RunMeta) : null
    }),
  )
  return loaded.filter((m): m is RunMeta => !!m).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function loadRun(id: string): Promise<RunRecord | null> {
  if (!RUN_ID.test(id)) return null
  const buf = await readBlob(`runs/${id}.json.gz`)
  return buf ? (JSON.parse(gunzipSync(buf).toString("utf8")) as RunRecord) : null
}
