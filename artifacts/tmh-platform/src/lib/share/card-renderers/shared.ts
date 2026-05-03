// ──────────────────────────────────────────────────────────────
//  Shared constants & utilities for canvas card renderers
// ──────────────────────────────────────────────────────────────

import type { CardFormat } from "../types"

// ── Brand palette ───────────────────────────────────────────

export const BLACK = "#0A0A0A"
export const CARD = "#111111"
export const WHITE = "#F2EDE4"
export const RED = "#DC143C"
export const MUTED = "#9A9690"
export const BORDER = "#2A2A2A"
export const GREEN = "#10B981"

// ── Font stacks ─────────────────────────────────────────────

export const BARLOW = '"Barlow Condensed", "Arial Narrow", Arial, sans-serif'
export const DM_SANS = '"DM Sans", Arial, sans-serif'

// ── Font preload ────────────────────────────────────────────

export async function waitForFonts(): Promise<void> {
  await Promise.race([
    document.fonts.ready,
    new Promise<void>(resolve => setTimeout(resolve, 2000)),
  ])
}

// ── Word-wrap with ellipsis truncation ──────────────────────

export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 4,
): number {
  const words = text.split(" ")
  let line = ""
  let currentY = y
  let lineCount = 0

  for (let i = 0; i < words.length; i++) {
    const test = line + words[i] + " "
    if (ctx.measureText(test).width > maxWidth && i > 0) {
      if (lineCount >= maxLines - 1) {
        // truncate with ellipsis on final line
        let truncated = line.trim()
        while (ctx.measureText(truncated + "…").width > maxWidth && truncated.length > 0) {
          truncated = truncated.slice(0, -1)
        }
        ctx.fillText(truncated + "…", x, currentY)
        return currentY
      }
      ctx.fillText(line.trim(), x, currentY)
      line = words[i] + " "
      currentY += lineHeight
      lineCount++
    } else {
      line = test
    }
  }

  ctx.fillText(line.trim(), x, currentY)
  return currentY
}

// ── Brand header ("THE TRIBUNAL." + tagline) ────────────────

export function drawBrandHeader(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
): void {
  // Red bar mark
  ctx.fillStyle = RED
  ctx.fillRect(x, y - 6 * scale, 44 * scale, 4 * scale)

  // "THE TRIBUNAL"
  ctx.fillStyle = WHITE
  ctx.font = `900 ${28 * scale}px ${BARLOW}`
  ctx.textAlign = "left"
  ctx.fillText("THE TRIBUNAL", x, y + 26 * scale)

  // Red period after brand name
  const brandWidth = ctx.measureText("THE TRIBUNAL").width
  ctx.fillStyle = RED
  ctx.fillText(".", x + brandWidth, y + 26 * scale)

  // Tagline
  ctx.font = `600 ${11 * scale}px ${DM_SANS}`
  ctx.fillStyle = MUTED
  ctx.fillText("BY THE MIDDLE EAST HUSTLE", x, y + 44 * scale)
}

// ── Results bars (up to 4 options with percentage fill) ─────

export function drawResultsBars(
  ctx: CanvasRenderingContext2D,
  options: Array<{ text: string; percentage: number }>,
  x: number,
  y: number,
  width: number,
  votedOptionText?: string,
): void {
  const rowHeight = 52
  const barHeight = 10

  options.slice(0, 4).forEach((opt, i) => {
    const rowY = y + i * rowHeight
    const isVoted = opt.text === votedOptionText
    const color = isVoted ? RED : WHITE

    // Label
    ctx.fillStyle = isVoted ? RED : WHITE
    ctx.font = `700 18px ${DM_SANS}`
    ctx.textAlign = "left"
    const label = opt.text.length > 38 ? opt.text.slice(0, 35) + "…" : opt.text
    ctx.fillText(label, x, rowY)

    // Percentage
    ctx.font = `900 22px ${BARLOW}`
    ctx.textAlign = "right"
    ctx.fillStyle = color
    ctx.fillText(`${Math.round(opt.percentage)}%`, x + width, rowY)

    // Bar background
    ctx.fillStyle = BORDER
    ctx.fillRect(x, rowY + 12, width, barHeight)

    // Bar fill
    ctx.fillStyle = color
    const fillW = Math.round(width * (Math.max(opt.percentage, 0) / 100))
    ctx.fillRect(x, rowY + 12, fillW, barHeight)
  })

  ctx.textAlign = "left"
}

// ── Category badge (red pill with white text) ───────────────

export function drawCategoryBadge(
  ctx: CanvasRenderingContext2D,
  category: string,
  x: number,
  y: number,
  fontSize: number,
  height: number,
  paddingH: number,
  align: "left" | "right" = "left",
): void {
  const catText = category.toUpperCase()
  ctx.font = `800 ${fontSize}px ${DM_SANS}`
  const catWidth = ctx.measureText(catText).width + paddingH * 2

  const drawX = align === "right" ? x - catWidth : x
  ctx.fillStyle = RED
  ctx.fillRect(drawX, y, catWidth, height)

  ctx.fillStyle = WHITE
  ctx.textAlign = "center"
  ctx.fillText(catText, drawX + catWidth / 2, y + height - (height - fontSize) / 2 - 2)
  ctx.textAlign = "left"
}

// ── Background ──────────────────────────────────────────────

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  format: CardFormat,
): void {
  if (format === "og") {
    // Horizontal gradient
    const gradient = ctx.createLinearGradient(0, 0, W, H)
    gradient.addColorStop(0, BLACK)
    gradient.addColorStop(1, "#121212")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, W, H)

    // Subtle diagonal accent stripe in bottom-right corner
    ctx.save()
    ctx.fillStyle = "rgba(220,20,60,0.07)"
    ctx.beginPath()
    ctx.moveTo(W, H - 180)
    ctx.lineTo(W, H)
    ctx.lineTo(W - 180, H)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    // Top border accent
    ctx.fillStyle = RED
    ctx.fillRect(0, 0, W, 5)
  } else {
    // Story: vertical gradient with midpoint
    const gradient = ctx.createLinearGradient(0, 0, 0, H)
    gradient.addColorStop(0, BLACK)
    gradient.addColorStop(0.5, "#0F0F0F")
    gradient.addColorStop(1, BLACK)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, W, H)

    // Top red band (slightly thicker for story)
    ctx.fillStyle = RED
    ctx.fillRect(0, 0, W, 8)
  }
}

// ── Footer ──────────────────────────────────────────────────

export function drawFooter(
  ctx: CanvasRenderingContext2D,
  footerText: string,
  ctaText: string,
  W: number,
  H: number,
  PAD: number,
  format: CardFormat,
): void {
  if (format === "og") {
    const footerY = H - PAD

    // Divider line
    ctx.fillStyle = BORDER
    ctx.fillRect(PAD, footerY - 32, W - PAD * 2, 1)

    // Footer text (left)
    ctx.font = `700 13px ${DM_SANS}`
    ctx.fillStyle = MUTED
    ctx.textAlign = "left"
    ctx.fillText(footerText, PAD, footerY - 8)

    // TRIBUNAL.COM (right)
    ctx.fillStyle = WHITE
    ctx.font = `800 13px ${DM_SANS}`
    ctx.textAlign = "right"
    ctx.fillText("TRIBUNAL.COM", W - PAD, footerY - 8)
    ctx.textAlign = "left"
  } else {
    // Story CTA block
    const ctaY = H - 240
    ctx.fillStyle = RED
    ctx.fillRect(PAD, ctaY, W - PAD * 2, 130)

    ctx.fillStyle = WHITE
    ctx.font = `900 44px ${BARLOW}`
    ctx.textAlign = "center"
    ctx.fillText(ctaText, W / 2, ctaY + 58)

    ctx.font = `700 22px ${DM_SANS}`
    ctx.fillStyle = "rgba(255,255,255,0.85)"
    ctx.fillText("TRIBUNAL.COM", W / 2, ctaY + 96)
    ctx.textAlign = "left"
  }
}
