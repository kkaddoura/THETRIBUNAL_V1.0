/**
 * Lazy-load fonts (TTF) for Satori OG image generation.
 *
 * Uses Barlow family from Google Fonts GitHub repo (guaranteed static TTF).
 * Satori does NOT support woff2 or variable fonts — only static TTF/OTF.
 *
 * The font cache is keyed by (headingFamily, bodyFamily) so swapping the brand
 * fonts via the design tokens table picks up new fonts on next render.
 *
 * The renderer registers the fetched font data under the family names provided
 * by the brand tokens, so token-driven `fontFamily` styles in og-card resolve
 * correctly without any string coupling between tokens and font URLs.
 */

interface CachedFont {
  name: string
  data: ArrayBuffer
  weight: number
  style: "normal"
}

const cache = new Map<string, CachedFont[]>()

const GITHUB_FONTS = "https://raw.githubusercontent.com/google/fonts/main/ofl"

// Fontsource serves true static TTFs (Google's `ofl/playfairdisplay` only ships
// a variable font, which Satori cannot rasterize).
const FONTSOURCE = "https://cdn.jsdelivr.net/fontsource/fonts"

const FONT_URLS = {
  headingBlack: `${GITHUB_FONTS}/barlowcondensed/BarlowCondensed-Black.ttf`,
  bodySemiBold: `${GITHUB_FONTS}/barlow/Barlow-SemiBold.ttf`,
  bodyBold: `${GITHUB_FONTS}/barlow/Barlow-Bold.ttf`,
} as const

// Playfair Display — refined serif used by the "minimal-serif" / "magazine"
// Studio styles. Registered under a fixed family name so styleFor() can opt in
// via `displayFont` without coupling tokens to URLs. Loading failures are
// non-fatal: the renderer falls back to the brand sans family.
const SERIF_FAMILY = "Playfair Display"
const SERIF_URLS = {
  semiBold: `${FONTSOURCE}/playfair-display@latest/latin-600-normal.ttf`,
  bold: `${FONTSOURCE}/playfair-display@latest/latin-700-normal.ttf`,
  black: `${FONTSOURCE}/playfair-display@latest/latin-900-normal.ttf`,
} as const

export const SERIF_DISPLAY_FAMILY = SERIF_FAMILY

export interface LoadFontsOptions {
  headingFamily: string
  bodyFamily: string
}

export async function loadFonts(opts: LoadFontsOptions): Promise<CachedFont[]> {
  const key = `${opts.headingFamily}|${opts.bodyFamily}`
  const cached = cache.get(key)
  if (cached) return cached

  const [headingData, bodySemiBoldData, bodyBoldData, serif] = await Promise.all([
    fetchTtf(FONT_URLS.headingBlack),
    fetchTtf(FONT_URLS.bodySemiBold),
    fetchTtf(FONT_URLS.bodyBold),
    loadSerif(),
  ])

  const fonts: CachedFont[] = [
    { name: opts.headingFamily, data: headingData, weight: 900, style: "normal" },
    { name: opts.bodyFamily, data: bodySemiBoldData, weight: 600, style: "normal" },
    { name: opts.bodyFamily, data: bodyBoldData, weight: 700, style: "normal" },
    ...serif,
  ]

  cache.set(key, fonts)
  return fonts
}

/**
 * Best-effort fetch of the Playfair Display weights. Any failure (network,
 * CDN outage) degrades gracefully to an empty set so the core sans fonts —
 * and therefore image rendering — never break.
 */
async function loadSerif(): Promise<CachedFont[]> {
  try {
    const [semiBold, bold, black] = await Promise.all([
      fetchTtf(SERIF_URLS.semiBold),
      fetchTtf(SERIF_URLS.bold),
      fetchTtf(SERIF_URLS.black),
    ])
    return [
      { name: SERIF_FAMILY, data: semiBold, weight: 600, style: "normal" },
      { name: SERIF_FAMILY, data: bold, weight: 700, style: "normal" },
      { name: SERIF_FAMILY, data: black, weight: 900, style: "normal" },
    ]
  } catch (err) {
    console.warn("[og-fonts] Playfair Display load failed, falling back to sans:", err)
    return []
  }
}

async function fetchTtf(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Font fetch failed: ${res.status} ${url}`)
  return res.arrayBuffer()
}
