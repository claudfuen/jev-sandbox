import { loadRun } from "@/lib/runs/store"

export async function GET(_req: Request, ctx: RouteContext<"/api/runs/[id]">) {
  const { id } = await ctx.params
  const run = await loadRun(id).catch(() => null)
  if (!run) return Response.json({ error: "Run not found" }, { status: 404 })
  return Response.json(run, { headers: { "cache-control": "public, max-age=300, s-maxage=86400, immutable" } })
}
