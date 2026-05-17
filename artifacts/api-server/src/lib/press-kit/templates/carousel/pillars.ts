/**
 * Pillars carousel — one slide per pillar (1080×1080 IG square).
 * Returns an array of Satori elements (one per slide).
 */

import type { BrandTokens } from "../../../design-tokens-cache.js"
import type { SizeKey } from "../../sizes.js"
import { pillarCard, type PillarData } from "../about/pillar.js"
import type { TemplateStyle } from "../styles.js"

export interface PillarsCarouselData {
  pillars: PillarData[]
}

export function pillarsCarousel(
  data: PillarsCarouselData,
  tokens: BrandTokens,
  size: SizeKey,
  style: TemplateStyle = "minimal-serif",
) {
  return data.pillars.map((p) => pillarCard(p, tokens, size, style))
}
