// ──────────────────────────────────────────────────────────────
//  URL builders — generalised from the old debate-only helpers
//  in shareCard.ts to support any ShareContext content type.
// ──────────────────────────────────────────────────────────────

import type { ShareContext } from "./types"

/**
 * Canonical page URL for a piece of shareable content.
 */
export function getContentUrl(ctx: ShareContext): string {
  const origin = typeof window !== "undefined" ? window.location.origin : ""
  switch (ctx.contentType) {
    case "debate":
      return `${origin}/debates/${ctx.pollId}`
    case "prediction":
      return `${origin}/predictions/${ctx.predictionId}`
    case "pulse":
      return `${origin}/pulse?topic=${ctx.topicId}`
  }
}

/**
 * WhatsApp deep-link with pre-filled message text.
 */
export function getWhatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

/**
 * LinkedIn share-offsite URL.
 */
export function getLinkedInShareUrl(url: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
}

/**
 * X (Twitter) intent URL with separate text + url params.
 */
export function getXShareUrl(text: string, url: string): string {
  return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
}
