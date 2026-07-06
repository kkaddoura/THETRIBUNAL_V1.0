/**
 * Output size variants for press-kit assets. Each template renders into all
 * four sizes via responsive Satori layout (size is passed as a prop).
 */

export interface SizeSpec {
  width: number
  height: number
}

export const SIZES: Record<string, SizeSpec> = {
  x_landscape: { width: 1200, height: 675 }, // X / Twitter
  ig_square: { width: 1080, height: 1080 }, // IG feed
  ig_story: { width: 1080, height: 1920 }, // IG / TikTok story
  linkedin: { width: 1200, height: 627 }, // LinkedIn
}

export type SizeKey = keyof typeof SIZES

export const ALL_SIZE_KEYS: SizeKey[] = Object.keys(SIZES) as SizeKey[]

export function isValidSize(key: string): key is SizeKey {
  return key in SIZES
}
