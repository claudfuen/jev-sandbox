import { execFileSync } from "node:child_process"
import { readFileSync, statSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

// Server-only. Resolves the Vercel AI Gateway key: env (on Vercel this is the
// project's budgeted jev-sandbox key), then macOS Keychain, then an owner-only
// file, then the project's OIDC token. The key is never logged or returned.

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
  if (process.env.AI_GATEWAY_API_KEY?.trim()) return
  const key = fromKeychain() ?? fromFile()
  if (key) {
    process.env.AI_GATEWAY_API_KEY = key
    return
  }
  // On Vercel, or locally after `vercel env pull`, the Gateway authenticates with OIDC.
  if (process.env.VERCEL || process.env.VERCEL_OIDC_TOKEN) return
  throw new Error(
    "No AI Gateway key. Set AI_GATEWAY_API_KEY, store it in the macOS Keychain under service AI_GATEWAY_API_KEY, or run `vercel env pull`.",
  )
}
