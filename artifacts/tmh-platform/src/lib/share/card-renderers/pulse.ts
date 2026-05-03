// ──────────────────────────────────────────────────────────────
//  Pulse card renderer — OG (1200×630) & Story (1080×1920)
// ──────────────────────────────────────────────────────────────

import type { PulseShareContext } from "../types"
import {
  WHITE,
  RED,
  GREEN,
  MUTED,
  BARLOW,
  DM_SANS,
  wrapText,
  drawBrandHeader,
} from "./shared"

// ── OG card content (1200×630) ──────────────────────────────

export function drawPulseOG(
  ctx: CanvasRenderingContext2D,
  context: PulseShareContext,
  W: number,
  H: number,
  PAD: number,
): void {
  // Brand header
  drawBrandHeader(ctx, PAD, PAD, 1)

  // Category badge (top-right)
  if (context.category) {
    const catText = context.category.toUpperCase()
    ctx.font = `800 12px ${DM_SANS}`
    const catWidth = ctx.measureText(catText).width + 24
    ctx.fillStyle = RED
    ctx.fillRect(W - PAD - catWidth, PAD, catWidth, 28)
    ctx.fillStyle = WHITE
    ctx.textAlign = "center"
    ctx.fillText(catText, W - PAD - catWidth / 2, PAD + 19)
    ctx.textAlign = "left"
  }

  // Title (topic name)
  ctx.fillStyle = WHITE
  ctx.font = `900 36px ${BARLOW}`
  wrapText(ctx, context.title.toUpperCase(), PAD, PAD + 130, W - PAD * 2, 44, 2)

  // Large stat number — visual anchor, centered vertically
  ctx.fillStyle = RED
  ctx.font = `900 100px ${BARLOW}`
  ctx.textAlign = "left"
  const statY = PAD + 290
  ctx.fillText(context.stat, PAD, statY)

  // Delta indicator
  const arrow = context.deltaUp ? "▲" : "▼"
  const deltaColor = context.deltaUp ? GREEN : RED
  ctx.fillStyle = deltaColor
  ctx.font = `800 24px ${DM_SANS}`
  ctx.fillText(`${arrow} ${context.delta}`, PAD, statY + 40)

  // Source attribution
  if (context.source) {
    ctx.fillStyle = MUTED
    ctx.font = `700 13px ${DM_SANS}`
    ctx.textAlign = "left"
    ctx.fillText(`SOURCE: ${context.source.toUpperCase()}`, PAD, H - PAD - 50)
  }
}

// ── Story card content (1080×1920) ──────────────────────────

export function drawPulseStory(
  ctx: CanvasRenderingContext2D,
  context: PulseShareContext,
  W: number,
  _H: number,
  PAD: number,
): void {
  // Brand header (scale=2)
  drawBrandHeader(ctx, PAD, 210, 2)

  // Title
  ctx.fillStyle = WHITE
  ctx.font = `900 64px ${BARLOW}`
  wrapText(ctx, context.title.toUpperCase(), PAD, 440, W - PAD * 2, 76, 3)

  // Massive stat — visual anchor
  ctx.fillStyle = RED
  ctx.font = `900 160px ${BARLOW}`
  ctx.textAlign = "center"
  ctx.fillText(context.stat, W / 2, 950)
  ctx.textAlign = "left"

  // Delta arrow + text
  const arrow = context.deltaUp ? "▲" : "▼"
  const deltaColor = context.deltaUp ? GREEN : RED
  ctx.fillStyle = deltaColor
  ctx.font = `800 36px ${DM_SANS}`
  ctx.textAlign = "center"
  ctx.fillText(`${arrow} ${context.delta}`, W / 2, 1020)
  ctx.textAlign = "left"

  // Source attribution
  if (context.source) {
    ctx.fillStyle = MUTED
    ctx.font = `700 20px ${DM_SANS}`
    ctx.textAlign = "left"
    ctx.fillText(`SOURCE: ${context.source.toUpperCase()}`, PAD, 1500)
  }
}
