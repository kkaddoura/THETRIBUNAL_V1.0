/**
 * 12 shared avatars for general users.
 *
 * Sourced from DiceBear bottts (CC0) with stable seeds. URLs point to the
 * DiceBear public CDN for v1 — these can be swapped to R2-hosted PNGs later
 * via a one-time pre-render script (see scripts/src/render-avatars.ts).
 *
 * Avatars are *shared*: multiple users can pick the same one. The avatar_id
 * is the stable identifier we store in the users.avatar_id column; the URL
 * is derived for display.
 */

const SEEDS = [
  "tribunal-falcon",
  "tribunal-dhow",
  "tribunal-oud",
  "tribunal-palm",
  "tribunal-arch",
  "tribunal-star",
  "tribunal-lantern",
  "tribunal-camel",
  "tribunal-script",
  "tribunal-mosaic",
  "tribunal-compass",
  "tribunal-key",
] as const

export interface Avatar {
  id: string
  url: string
}

const dicebearUrl = (seed: string) =>
  `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(seed)}&backgroundColor=transparent&radius=10`

export const AVATARS: readonly Avatar[] = SEEDS.map((seed, i) => ({
  id: `avatar-${String(i + 1).padStart(2, "0")}`,
  url: dicebearUrl(seed),
}))

const AVATAR_IDS = new Set(AVATARS.map((a) => a.id))

export function isValidAvatarId(id: string): boolean {
  return AVATAR_IDS.has(id)
}

/** Pick a random valid avatar id — used when none is supplied at signup. */
export function randomAvatarId(): string {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)].id
}

export function getAvatarUrl(id: string): string | null {
  const found = AVATARS.find((a) => a.id === id)
  return found?.url ?? null
}
