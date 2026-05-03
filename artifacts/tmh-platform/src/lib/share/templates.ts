// ──────────────────────────────────────────────────────────────
//  Share text templates — per content-type x platform
//
//  Debate templates are ported 1:1 from the old ShareModal.tsx.
//  Prediction and Pulse templates follow the same brand voice.
// ──────────────────────────────────────────────────────────────

import type { ShareContext } from "./types"

type TextPlatform = "whatsapp" | "linkedin" | "x" | "generic"

// ── Internal helpers ─────────────────────────────────────────

function debateVotePart(ctx: Extract<ShareContext, { contentType: "debate" }>): string {
  return ctx.votedOptionText ? `I voted "${ctx.votedOptionText}"` : "Where do you stand?"
}

function predictionVotePart(ctx: Extract<ShareContext, { contentType: "prediction" }>): string {
  return ctx.votedChoice ? `I predicted "${ctx.votedChoice}"` : "What's your call?"
}

// ── Debate ───────────────────────────────────────────────────

function debateText(ctx: Extract<ShareContext, { contentType: "debate" }>, platform: TextPlatform): string {
  const vp = debateVotePart(ctx)

  switch (platform) {
    case "whatsapp":
      return `\u{1F534} "${ctx.title}"\n\n${vp} on The Tribunal \u2014 MENA's most honest opinion platform.\n\n${ctx.url}`
    case "linkedin":
      return `${vp} on this debate from The Tribunal.\n\n"${ctx.title}"\n\n${ctx.totalVotes.toLocaleString()} voices from across MENA. Add yours: ${ctx.url}`
    case "x":
      return `${getXShareText(ctx)}\n${ctx.url}`
    case "generic":
    default:
      return `"${ctx.title}" \u2014 ${vp} on The Tribunal: ${ctx.url}`
  }
}

// ── Prediction ───────────────────────────────────────────────

function predictionText(ctx: Extract<ShareContext, { contentType: "prediction" }>, platform: TextPlatform): string {
  const vp = predictionVotePart(ctx)

  switch (platform) {
    case "whatsapp":
      return `\u{1F52E} "${ctx.title}"\n\n${vp} on The Tribunal \u2014 MENA's prediction platform.\n\n${ctx.url}`
    case "linkedin":
      return `${vp} on this prediction from The Tribunal.\n\n"${ctx.title}"\n\n${ctx.totalVotes.toLocaleString()} predictions locked in. Add yours: ${ctx.url}`
    case "x":
      return `${getXShareText(ctx)}\n${ctx.url}`
    case "generic":
    default:
      return `"${ctx.title}" \u2014 ${vp} on The Tribunal: ${ctx.url}`
  }
}

// ── Pulse ────────────────────────────────────────────────────

function pulseText(ctx: Extract<ShareContext, { contentType: "pulse" }>, platform: TextPlatform): string {
  switch (platform) {
    case "whatsapp":
      return `\u{1F4CA} ${ctx.title}: ${ctx.stat}\n\nTracked on The Tribunal Pulse \u2014 real-time MENA data.\n\n${ctx.url}`
    case "linkedin":
      return `${ctx.title}: ${ctx.stat} (${ctx.deltaUp ? "\u2191" : "\u2193"} ${ctx.delta})\n\nReal-time MENA data from The Tribunal Pulse: ${ctx.url}`
    case "x":
      return `${getXShareText(ctx)}\n${ctx.url}`
    case "generic":
    default:
      return `${ctx.title}: ${ctx.stat} \u2014 The Tribunal Pulse: ${ctx.url}`
  }
}

// ── Public API ───────────────────────────────────────────────

/**
 * Build the full share text for a given context and platform.
 * The returned string includes the share URL where appropriate.
 */
export function buildShareText(ctx: ShareContext, platform: TextPlatform): string {
  switch (ctx.contentType) {
    case "debate":
      return debateText(ctx, platform)
    case "prediction":
      return predictionText(ctx, platform)
    case "pulse":
      return pulseText(ctx, platform)
  }
}

/**
 * X-specific share text WITHOUT the URL appended (the URL is passed
 * separately via the `url` param in the X intent URL).
 */
export function getXShareText(ctx: ShareContext): string {
  switch (ctx.contentType) {
    case "debate":
      if (ctx.votedOptionText) {
        return `I voted "${ctx.votedOptionText}" on "${ctx.title}" \u2014 where do you stand? \u{1F534} @TMHustle`
      }
      return `"${ctx.title}" \u2014 MENA's most honest opinion debate. Where do you stand? \u{1F534} @TMHustle`

    case "prediction":
      if (ctx.votedChoice) {
        return `I predicted "${ctx.votedChoice}" on "${ctx.title}" \u2014 what's your call? \u{1F52E} @TMHustle`
      }
      return `"${ctx.title}" \u2014 MENA's boldest prediction market. What's your call? \u{1F52E} @TMHustle`

    case "pulse":
      return `${ctx.title}: ${ctx.stat} \u2014 tracked live on The Tribunal Pulse \u{1F4CA} @TMHustle`
  }
}
