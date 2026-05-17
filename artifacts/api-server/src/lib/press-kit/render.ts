/**
 * Studio rendering pipeline. Takes a Satori element + size, produces a
 * PNG buffer. Two output modes: persist (upload to R2 and return key+url) or
 * stream (return raw buffer directly to caller for download).
 */

import { loadFonts } from "../og-fonts.js"
import { getBrandTokens } from "../design-tokens-cache.js"
import { uploadBuffer, R2_PUBLIC_URL, isR2Available } from "../../utils/r2.js"
import { SIZES, type SizeKey } from "./sizes.js"
import { putAsset } from "./asset-store.js"

interface SatoriElement {
  type: string
  props: Record<string, unknown>
}

let satoriPromise: Promise<(element: any, options: any) => Promise<string>> | null = null
let resvgPromise: Promise<new (svg: string, options: any) => { render(): { asPng(): Uint8Array } }> | null = null

function getSatori() {
  if (!satoriPromise) {
    satoriPromise = import("satori").then((mod) => mod.default)
  }
  return satoriPromise
}

function getResvg() {
  if (!resvgPromise) {
    resvgPromise = import("@resvg/resvg-js").then((mod) => mod.Resvg as unknown as new (svg: string, options: any) => { render(): { asPng(): Uint8Array } })
  }
  return resvgPromise
}

export async function renderToPng(element: SatoriElement, size: SizeKey): Promise<Buffer> {
  const tokens = await getBrandTokens()
  const [satori, Resvg, fonts] = await Promise.all([
    getSatori(),
    getResvg(),
    loadFonts({ headingFamily: tokens.headingFont, bodyFamily: tokens.bodyFont }),
  ])
  const spec = SIZES[size]

  const svg = await satori(element as any, {
    width: spec.width,
    height: spec.height,
    fonts: fonts.map((f) => ({
      name: f.name,
      data: f.data,
      weight: f.weight as 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900,
      style: f.style,
    })),
  })

  const resvg = new Resvg(svg, { fitTo: { mode: "width" as const, value: spec.width } })
  const png = resvg.render().asPng()
  return Buffer.from(png)
}

export interface UploadResult {
  r2Key: string
  publicUrl: string
}

export async function uploadAsset(
  buffer: Buffer,
  contentType: string,
  contentId: number,
  template: string,
  size: SizeKey,
  slideIndex = 0,
): Promise<UploadResult> {
  const slideSuffix = slideIndex > 0 ? `-slide-${slideIndex}` : ""
  const r2Key = `press-kit/${contentType}/${contentId}/${template}-${size}${slideSuffix}.png`

  // R2 not configured (typically local dev) — fall back to in-memory store.
  // The download endpoint recognizes mem:* keys and serves from RAM.
  if (!isR2Available) {
    const { key } = putAsset(buffer, "image/png")
    return { r2Key: key, publicUrl: "" }
  }

  await uploadBuffer(r2Key, buffer, "image/png")
  const publicUrl = R2_PUBLIC_URL ? `${R2_PUBLIC_URL.replace(/\/$/, "")}/${r2Key}` : r2Key
  return { r2Key, publicUrl }
}

/**
 * Render a batch of (element, size) pairs in parallel. Failures per item are
 * captured separately so one bad render doesn't block the others.
 */
export async function renderBatch<T extends { element: SatoriElement; size: SizeKey; key: string }>(
  items: T[],
): Promise<Array<{ key: string; buffer?: Buffer; error?: string }>> {
  return Promise.all(
    items.map(async (item) => {
      try {
        const buffer = await renderToPng(item.element, item.size)
        return { key: item.key, buffer }
      } catch (err) {
        return {
          key: item.key,
          error: err instanceof Error ? err.message : String(err),
        }
      }
    }),
  )
}
