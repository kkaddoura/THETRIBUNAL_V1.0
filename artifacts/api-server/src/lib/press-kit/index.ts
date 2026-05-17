/**
 * Press-kit / Studio module — entry point for renderers, captions, and the size catalog.
 */

export { SIZES, ALL_SIZE_KEYS, isValidSize, type SizeKey } from "./sizes.js"
export { renderToPng, renderBatch, uploadAsset, type UploadResult } from "./render.js"
export {
  generateCaptions,
  generateCaptionVariants,
  type CaptionSet,
  type CaptionInput,
  type CaptionVariants,
  type GenerateOptions,
  type Platform,
  type ToneHint,
} from "./captions.js"

// v1 templates (per-item)
export { pollResultSplit, type PollData } from "./templates/poll-result-split.js"
export { voiceQuote, type VoiceData } from "./templates/voice-quote.js"
export { predictionMomentum, type PredictionData } from "./templates/prediction-momentum.js"
export { pulseStat, type PulseData } from "./templates/pulse-stat.js"

// v2 styles + templates
export { TEMPLATE_STYLES, type TemplateStyle, styleFor, sizeScale, frame } from "./templates/styles.js"
export { founderQuote, type FounderQuoteData } from "./templates/about/founder-quote.js"
export { pillarCard, type PillarData } from "./templates/about/pillar.js"
export { beliefCard, type BeliefData } from "./templates/about/belief.js"
export { regionCard, type RegionCountry, type RegionData } from "./templates/about/region.js"
export { manifestoCard, type ManifestoData } from "./templates/manifesto/intro.js"
export { pillarsCarousel, type PillarsCarouselData } from "./templates/carousel/pillars.js"
export { debateCarousel, type DebateCarouselData } from "./templates/carousel/debate.js"
export { pulseTrio, type PulseItem, type PulseTrioData } from "./templates/carousel/pulse-trio.js"
export { weeklyRecap, type RecapData } from "./templates/recap/weekly.js"
export { aiBackgroundCard, type AiCardData } from "./templates/ai-background.js"

export {
  loadWeeklyTops,
  topDebateThisWeek,
  topPredictionThisWeek,
  topPulseThisWeek,
  type WeeklyTops,
  type TopDebate,
  type TopPrediction,
  type TopPulse,
} from "./popularity.js"

export const TEMPLATES = {
  "poll-result-split": "poll",
  "voice-quote": "voice",
  "prediction-momentum": "prediction",
  "pulse-stat": "pulse",
} as const

export type TemplateKey = keyof typeof TEMPLATES

/** Studio v2 post types — registry mapping a postType to its template family. */
export const POST_TYPE_FAMILIES = {
  // per-item (v1, kept for compat)
  "item-poll": "item",
  "item-prediction": "item",
  "item-voice": "item",
  "item-pulse": "item",
  // about-page
  "about-founder": "about",
  "about-pillar": "about",
  "about-belief": "about",
  "about-region": "about",
  // manifesto
  manifesto: "manifesto",
  // carousels
  "carousel-pillars": "carousel",
  "carousel-debate": "carousel",
  "carousel-pulse-trio": "carousel",
  // recap
  "recap-weekly": "recap",
} as const

export type PostType = keyof typeof POST_TYPE_FAMILIES
