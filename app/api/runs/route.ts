import { listRuns } from "@/lib/runs/store"

export async function GET() {
  try {
    return Response.json({ runs: await listRuns() })
  } catch (error) {
    return Response.json({ error: `Could not list runs: ${(error as Error).message}` }, { status: 502 })
  }
}
