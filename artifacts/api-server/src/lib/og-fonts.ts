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

// Playfair Display — refined serif kept registered (under a fixed family name)
// for legacy press-kit cards and any future serif art direction. The current
// Studio styles use the display faces below instead. Loading failures are
// non-fatal: the renderer falls back to the brand sans family.
const SERIF_FAMILY = "Playfair Display"
const SERIF_URLS = {
  semiBold: `${FONTSOURCE}/playfair-display@latest/latin-600-normal.ttf`,
  bold: `${FONTSOURCE}/playfair-display@latest/latin-700-normal.ttf`,
  black: `${FONTSOURCE}/playfair-display@latest/latin-900-normal.ttf`,
} as const

export const SERIF_DISPLAY_FAMILY = SERIF_FAMILY

// ── Display families for the Studio art-direction styles ────────────────────
// Each style commits to a distinct typographic personality. These are the
// characterful display/mono faces those styles opt into via `styleFor()`.
// All are guaranteed static TTFs (Satori cannot rasterize variable fonts).
// Loading is best-effort: any failure degrades to the brand sans, never breaks
// rendering. Single-weight display faces (Anton, Archivo Black, DM Serif
// Display) are registered under 400/700/900 aliases pointing at the same data
// so templates that hard-code a heavy weight still resolve to the right face
// instead of falling back.
export const MONO_FAMILY = "Space Mono"
export const POSTER_FAMILY = "Anton"
export const GROTESK_BLACK_FAMILY = "Archivo Black"
export const DIDONE_FAMILY = "DM Serif Display"

const DISPLAY_URLS = {
  monoRegular: `${GITHUB_FONTS}/spacemono/SpaceMono-Regular.ttf`,
  monoBold: `${GITHUB_FONTS}/spacemono/SpaceMono-Bold.ttf`,
  poster: `${GITHUB_FONTS}/anton/Anton-Regular.ttf`,
  groteskBlack: `${GITHUB_FONTS}/archivoblack/ArchivoBlack-Regular.ttf`,
  didone: `${GITHUB_FONTS}/dmserifdisplay/DMSerifDisplay-Regular.ttf`,
} as const

export interface LoadFontsOptions {
  headingFamily: string
  bodyFamily: string
}

export async function loadFonts(opts: LoadFontsOptions): Promise<CachedFont[]> {
  const key = `${opts.headingFamily}|${opts.bodyFamily}`
  const cached = cache.get(key)
  if (cached) return cached

  const [headingData, bodySemiBoldData, bodyBoldData, serif, display] = await Promise.all([
    fetchTtf(FONT_URLS.headingBlack),
    fetchTtf(FONT_URLS.bodySemiBold),
    fetchTtf(FONT_URLS.bodyBold),
    loadSerif(),
    loadDisplayFonts(),
  ])

  const fonts: CachedFont[] = [
    { name: opts.headingFamily, data: headingData, weight: 900, style: "normal" },
    { name: opts.bodyFamily, data: bodySemiBoldData, weight: 600, style: "normal" },
    { name: opts.bodyFamily, data: bodyBoldData, weight: 700, style: "normal" },
    ...serif,
    ...display,
  ]

  cache.set(key, fonts)
  return fonts
}

/**
 * Best-effort fetch of the characterful Studio display faces (Space Mono,
 * Anton, Archivo Black, DM Serif Display). Mirrors `loadSerif`: any failure
 * degrades to an empty set so core rendering never breaks. Single-weight faces
 * are aliased across 400/700/900 so a template hard-coding `fontWeight: 900`
 * still resolves to the intended face rather than the fallback sans.
 */
async function loadDisplayFonts(): Promise<CachedFont[]> {
  try {
    const [monoReg, monoBold, poster, grotesk, didone] = await Promise.all([
      fetchTtf(DISPLAY_URLS.monoRegular),
      fetchTtf(DISPLAY_URLS.monoBold),
      fetchTtf(DISPLAY_URLS.poster),
      fetchTtf(DISPLAY_URLS.groteskBlack),
      fetchTtf(DISPLAY_URLS.didone),
    ])
    const alias = (name: string, data: ArrayBuffer, weights: number[]): CachedFont[] =>
      weights.map((weight) => ({ name, data, weight, style: "normal" as const }))
    return [
      // Space Mono ships true Regular + Bold.
      { name: MONO_FAMILY, data: monoReg, weight: 400, style: "normal" },
      { name: MONO_FAMILY, data: monoBold, weight: 700, style: "normal" },
      // Single-weight display faces — alias heavy weights to the same data.
      ...alias(POSTER_FAMILY, poster, [400, 700, 900]),
      ...alias(GROTESK_BLACK_FAMILY, grotesk, [400, 700, 900]),
      ...alias(DIDONE_FAMILY, didone, [400, 700, 900]),
    ]
  } catch (err) {
    console.warn("[og-fonts] display fonts load failed, falling back to sans:", err)
    return []
  }
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

/**
 * Pre-warm the font cache at server boot so the first Studio compose isn't
 * blocked on a CDN font fetch (~5–15s cold). Fire-and-forget — any failure
 * is logged and the next request will retry on-demand. Once warmed, fonts
 * stay cached for the process lifetime (no TTL).
 */
export async function warmFonts(opts: LoadFontsOptions): Promise<void> {
  try {
    const start = Date.now()
    const fonts = await loadFonts(opts)
    console.log(
      `[og-fonts] warmed ${fonts.length} fonts in ${Date.now() - start}ms ` +
        `(${opts.headingFamily} / ${opts.bodyFamily}; serif: ${
          fonts.some((f) => f.name === SERIF_FAMILY) ? "yes" : "no"
        })`,
    )
  } catch (err) {
    console.warn("[og-fonts] warm-up failed (compose will retry on first request):", err)
  }
}
