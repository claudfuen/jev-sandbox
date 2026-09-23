import { runJev } from "@/lib/jev/call"
import { jevRequestSchema } from "@/lib/jev/schema"

// Accepts only typed, validated perceptions (never free-form prompts), builds
// the JEV state server-side, and returns normalized answers.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = jevRequestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Invalid JEV request" }, { status: 400 })
  }
  try {
    return Response.json(await runJev(parsed.data))
  } catch (error) {
    return Response.json({ error: `JEV call failed: ${(error as Error).message}` }, { status: 502 })
  }
}
