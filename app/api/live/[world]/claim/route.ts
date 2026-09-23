import { NextResponse } from "next/server"
import { z } from "zod"

import { decode, LeaseLost, leaseHeldByOther, readLive, writeLive } from "@/lib/live/store"
import { LIVE_WORLD } from "@/lib/sim/checkpoint"

// A tab asks to drive the live world. It gets the lease when nobody holds it,
// when it already held it (a reload), or when it forces a takeover. Otherwise it
// watches. The response never carries the world itself: the tab GETs that next.

export const dynamic = "force-dynamic"

const body = z.object({ clientId: z.string().regex(/^[a-z0-9-]{8,64}$/), force: z.boolean().optional() })

export async function POST(req: Request, ctx: RouteContext<"/api/live/[world]/claim">) {
  const { world } = await ctx.params
  if (!LIVE_WORLD.test(world)) return NextResponse.json({ error: "Unknown world" }, { status: 404 })
  const parsed = body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Bad claim" }, { status: 400 })
  const { clientId, force } = parsed.data
  const read = await readLive(world)
  if (!read || read.status !== 200) return NextResponse.json({ role: "driver", etag: null, exists: false })
  const cp = decode(read.gz)
  if (leaseHeldByOther(cp, clientId) && !force) {
    return NextResponse.json({ role: "spectator", etag: read.etag, exists: true, leaseUntil: cp.lease?.until ?? null })
  }
  try {
    const etag = await writeLive(world, cp, clientId, read.etag)
    return NextResponse.json({ role: "driver", etag, exists: true })
  } catch (error) {
    if (error instanceof LeaseLost) return NextResponse.json({ role: "spectator", etag: null, exists: true })
    throw error
  }
}
