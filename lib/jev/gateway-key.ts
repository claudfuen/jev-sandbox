import { execFileSync } from "node:child_process"
import { readFileSync, statSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

// Server-only. Resolves the Vercel AI Gateway key the same way the assistant
// repo's JEV tooling does: env, then macOS Keychain, then an owner-only file.
// On Vercel, the Gateway authenticates with the OIDC token instead.
// The key is never logged or returned to the client.

function fromKeychain(): string | null {
  if (process.platform !== "darwin") return null
  try {
    const key = execFileSync(
      "security",
      ["find-generic-password", "-s", "AI_GATEWAY_API_KEY", "-w"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim()
    return key || null
  } catch {
    return null
  }
}

function fromFile(): string | null {
  const file = join(homedir(), ".config", "assistant", "ai-gateway.key")
  try {
    if ((statSync(file).mode & 0o077) !== 0) return null
    return readFileSync(file, "utf8").trim() || null
  } catch {
    return null
  }
}

export function ensureGatewayKey(): void {
  if (process.env.AI_GATEWAY_API_KEY?.trim() || process.env.VERCEL_OIDC_TOKEN) return
  const key = fromKeychain() ?? fromFile()
  if (!key) {
    throw new Error(
      "No AI Gateway key. Set AI_GATEWAY_API_KEY in .env.local, or store it in the macOS Keychain under service AI_GATEWAY_API_KEY.",
    )
  }
  process.env.AI_GATEWAY_API_KEY = key
}
