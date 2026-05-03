/**
 * Lazy-load fonts (TTF) for Satori OG image generation.
 *
 * Uses Barlow family from Google Fonts GitHub repo (guaranteed static TTF).
 * Satori does NOT support woff2 or variable fonts — only static TTF/OTF.
 *
 * Heading: Barlow Condensed Black (900)
 * Body:    Barlow SemiBold (600) and Bold (700)
 */

interface CachedFont {
  name: string
  data: ArrayBuffer
  weight: number
  style: "normal"
}

let fontCache: CachedFont[] | null = null

const GITHUB_FONTS = "https://raw.githubusercontent.com/google/fonts/main/ofl"

const FONT_URLS = {
  headingBlack: `${GITHUB_FONTS}/barlowcondensed/BarlowCondensed-Black.ttf`,
  bodySemiBold: `${GITHUB_FONTS}/barlow/Barlow-SemiBold.ttf`,
  bodyBold: `${GITHUB_FONTS}/barlow/Barlow-Bold.ttf`,
} as const

export async function loadFonts(): Promise<CachedFont[]> {
  if (fontCache) return fontCache

  const [headingData, bodySemiBoldData, bodyBoldData] = await Promise.all([
    fetchTtf(FONT_URLS.headingBlack),
    fetchTtf(FONT_URLS.bodySemiBold),
    fetchTtf(FONT_URLS.bodyBold),
  ])

  fontCache = [
    { name: "Barlow Condensed", data: headingData, weight: 900, style: "normal" },
    { name: "Barlow", data: bodySemiBoldData, weight: 600, style: "normal" },
    { name: "Barlow", data: bodyBoldData, weight: 700, style: "normal" },
  ]

  return fontCache
}

async function fetchTtf(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Font fetch failed: ${res.status} ${url}`)
  return res.arrayBuffer()
}
