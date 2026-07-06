/**
 * In-memory asset store — used as a fallback when R2 isn't configured (e.g.
 * local dev without Cloudflare creds). Assets live for the process lifetime
 * and get evicted after a TTL to avoid unbounded memory growth.
 *
 * Keys returned look like `mem:<uuid>` so callers can recognize them and
 * route through this store instead of R2.
 */

import { randomUUID } from "node:crypto"

interface StoredAsset {
  buffer: Buffer
  contentType: string
  storedAt: number
}

const TTL_MS = 60 * 60 * 1000 // 1 hour
const MAX_ENTRIES = 500
const store = new Map<string, StoredAsset>()

function evictExpired(): void {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (now - entry.storedAt > TTL_MS) store.delete(key)
  }
  // Hard cap on entries — drop oldest first
  if (store.size > MAX_ENTRIES) {
    const sorted = [...store.entries()].sort((a, b) => a[1].storedAt - b[1].storedAt)
    const drop = sorted.slice(0, store.size - MAX_ENTRIES)
    for (const [key] of drop) store.delete(key)
  }
}

export function memKeyFromId(id: string): string {
  return `mem:${id}`
}

export function isMemKey(key: string): boolean {
  return typeof key === "string" && key.startsWith("mem:")
}

export function putAsset(buffer: Buffer, contentType: string): { key: string } {
  evictExpired()
  const id = randomUUID()
  const key = memKeyFromId(id)
  store.set(key, { buffer, contentType, storedAt: Date.now() })
  return { key }
}

export function getAsset(key: string): StoredAsset | undefined {
  return store.get(key)
}
