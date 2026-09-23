import { gunzipSync } from "node:zlib"

import { NextResponse } from "next/server"

import { decode, LeaseLost, readLive, writeLive } from "@/lib/live/store"
import { LIVE_WORLD } from "@/lib/sim/checkpoint"

// GET streams the stored checkpoint (gzip passthrough, ETag for cheap polling).
// PUT replaces it, only for the tab holding the lease and only on top of the
// version that tab last saw.

export const dynamic = "force-dynamic"

export async function GET(req: Request, ctx: RouteContext<"/api/live/[world]">) {
  const { world } = await ctx.params
  if (!LIVE_WORLD.test(world)) return NextResponse.json({ error: "Unknown world" }, { status: 404 })
  const read = await readLive(world, req.headers.get("if-none-match") ?? undefined)
  if (!read) return NextResponse.json({ error: "No live world yet" }, { status: 404 })
  if (read.status === 304) return new Response(null, { status: 304, headers: { etag: read.etag } })
  const accepts = /\bgzip\b/.test(req.headers.get("accept-encoding") ?? "")
  const headers = { etag: read.etag, "cache-control": "no-store", "content-type": "application/json" }
  if (accepts) return new Response(new Uint8Array(read.gz), { headers: { ...headers, "content-encoding": "gzip" } })
  return new Response(gunzipSync(read.gz), { headers })
}

export async function PUT(req: Request, ctx: RouteContext<"/api/live/[world]">) {
  const { world } = await ctx.params
  if (!LIVE_WORLD.test(world)) return NextResponse.json({ error: "Unknown world" }, { status: 404 })
  const clientId = req.headers.get("x-client-id") ?? ""
  if (!/^[a-z0-9-]{8,64}$/.test(clientId)) return NextResponse.json({ error: "Missing client id" }, { status: 400 })
  const ifMatch = req.headers.get("if-match")
  let cp
  try {
    cp = decode(Buffer.from(await req.arrayBuffer()))
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
  try {
    const etag = await writeLive(world, cp, clientId, ifMatch && ifMatch !== "*" ? ifMatch : null)
    return NextResponse.json({ etag })
  } catch (error) {
    if (error instanceof LeaseLost) return NextResponse.json({ error: error.message }, { status: 409 })
    throw error
  }
}
