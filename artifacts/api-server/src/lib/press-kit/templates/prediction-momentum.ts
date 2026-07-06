/**
 * Prediction-momentum template (Studio "Single" layout, 1:1 square).
 *
 * Renders a prediction as a POSTER version of the live Predictions page chart:
 * a "Confidence over time — YES %" trend area+line chart fills the hero region,
 * with the headline verdict (oversized `NN% say YES/NO`) and resolve countdown
 * beneath it. The framing shell (background, padding, accent rule, eyebrow,
 * footer) comes from the shared `frame()` helper driven by the `TemplateStyle`.
 *
 * Satori cannot execute recharts (it only lays out flexbox + images), so the
 * chart is built as a standalone SVG string and embedded as a base64 data-URI
 * `<img>` — the one reliable way to get vector chart art into a Satori render.
 *
 * Style is the OPTIONAL last param (default "dark") so existing
 * callers in `routes/press-kit.ts` continue to work unchanged.
 */

import type { BrandTokens } from "../../design-tokens-cache.js"
import type { SizeKey } from "../sizes.js"
import { frame, sizeScale, styleFor, type TemplateStyle } from "./styles.js"

interface SatoriElement {
  type: string
  props: Record<string, unknown>
}

export interface PredictionData {
  question: string
  yesPercentage: number
  totalVotes: number
  daysToResolve?: number | null
  /** Confidence-over-time series (YES %). Synthesised if missing/too short. */
  trend?: number[] | null
  /** Used only to seed a deterministic synthetic trend when `trend` is empty. */
  id?: number
}

// ── Trend helpers ───────────────────────────────────────────────────────────
// Mirrors the synthetic-trend logic the public predictions API uses so a
// prediction with no stored history still gets a believable, deterministic
// curve that lands on its real YES %.

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s & 0xffff) / 0xffff
  }
}

function resolveTrend(data: PredictionData): number[] {
  const raw = data.trend
  if (raw && Array.isArray(raw) && raw.length >= 2) {
    return raw.map((n) => Math.max(0, Math.min(100, Math.round(n))))
  }
  const target = Math.round(data.yesPercentage)
  const rng = seededRandom((data.id ?? target) * 31 + 7)
  const pts: number[] = []
  let cur = 50
  for (let i = 0; i < 12; i++) {
    const pull = (target - cur) * 0.15
    const noise = (rng() - 0.5) * 6
    cur = Math.max(5, Math.min(95, cur + pull + noise))
    pts.push(Math.round(cur))
  }
  pts[pts.length - 1] = target
  return pts
}

function hexToRgba(hex: string, a: number): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec((hex ?? "").trim())
  if (!m) return `rgba(127,127,127,${a})`
  const int = parseInt(m[1], 16)
  return `rgba(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}, ${a})`
}

/** Build the trend chart as a base64 SVG data URI. preserveAspectRatio="none"
 * lets it stretch to fill whatever box the poster gives it; we keep the art to
 * area + line + a dashed 50% "tipping point" reference so the stretch is
 * visually clean (no circles to turn into ellipses). */
function chartDataUri(
  trend: number[],
  colors: { line: string; fill: string; ref: string },
): string {
  const W = 1000
  const H = 420
  const padX = 8
  const padY = 20
  const n = trend.length
  const innerW = W - padX * 2
  const innerH = H - padY * 2
  const x = (i: number) => padX + (innerW * i) / (n - 1)
  const y = (v: number) => padY + innerH * (1 - v / 100)

  const linePts = trend.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")
  const baseY = (padY + innerH).toFixed(1)
  const areaPts = `${padX.toFixed(1)},${baseY} ${linePts} ${(padX + innerW).toFixed(1)},${baseY}`
  const refY = y(50).toFixed(1)

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">` +
    `<line x1="${padX}" y1="${refY}" x2="${padX + innerW}" y2="${refY}" stroke="${colors.ref}" stroke-width="2" stroke-dasharray="10 10"/>` +
    `<polygon points="${areaPts}" fill="${colors.fill}"/>` +
    `<polyline points="${linePts}" fill="none" stroke="${colors.line}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>` +
    `</svg>`

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`
}

export function predictionMomentum(
  data: PredictionData,
  tokens: BrandTokens,
  size: SizeKey,
  style: TemplateStyle = "dark",
): SatoriElement {
  const spec = styleFor(style, tokens, size)
  const scale = sizeScale(size)
  const isStory = size === "ig_story"
  const yes = Math.round(data.yesPercentage)
  const no = 100 - yes
  const consensus = yes >= 50 ? "YES" : "NO"
  const consensusPct = yes >= 50 ? yes : no

  const trend = resolveTrend(data)
  const chartUri = chartDataUri(trend, {
    line: spec.accent,
    fill: hexToRgba(spec.accent, 0.18),
    ref: hexToRgba(spec.fg, 0.22),
  })

  const question: SatoriElement = {
    type: "div",
    props: {
      style: {
        display: "flex",
        fontSize: `${isStory ? scale.h1 : scale.h2}px`,
        fontWeight: spec.headingWeight,
        fontFamily: spec.displayFont,
        color: spec.fg,
        lineHeight: 1.1,
        letterSpacing: spec.displayTracking,
        textTransform: "uppercase" as const,
      },
      children: data.question,
    },
  }

  // Hero: the trend chart, growing to fill the space between question + verdict.
  const chart: SatoriElement = {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        justifyContent: "center",
        marginTop: isStory ? "44px" : "30px",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              fontSize: `${scale.caption}px`,
              fontWeight: 700,
              letterSpacing: "2.5px",
              textTransform: "uppercase" as const,
              color: spec.muted,
              fontFamily: spec.bodyFont,
              marginBottom: "16px",
            },
            children: "Confidence over time — YES %",
          },
        },
        {
          type: "img",
          props: {
            src: chartUri,
            style: {
              display: "flex",
              width: "100%",
              height: `${Math.round(scale.hero * (isStory ? 3.0 : 2.6))}px`,
            },
          },
        },
      ],
    },
  }

  const verdict: SatoriElement = {
    type: "div",
    props: {
      style: {
        display: "flex",
        alignItems: "baseline",
        marginTop: isStory ? "48px" : "32px",
        gap: "24px",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              fontSize: `${isStory ? scale.hero * 1.25 : scale.hero}px`,
              fontWeight: 900,
              fontFamily: spec.displayFont,
              color: spec.accent,
              lineHeight: 1,
              letterSpacing: spec.displayTracking,
            },
            children: `${consensusPct}%`,
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    fontSize: `${scale.h2 * 0.6}px`,
                    fontWeight: 900,
                    fontFamily: spec.displayFont,
                    color: spec.fg,
                    letterSpacing: "2px",
                  },
                  children: `say ${consensus}`,
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    fontSize: `${scale.caption}px`,
                    fontWeight: 600,
                    fontFamily: spec.bodyFont,
                    color: spec.muted,
                    letterSpacing: "1.5px",
                    marginTop: "8px",
                    textTransform: "uppercase" as const,
                  },
                  children:
                    data.daysToResolve != null
                      ? `Resolves in ${data.daysToResolve} days`
                      : "Live prediction",
                },
              },
            ],
          },
        },
      ],
    },
  }

  return frame(spec, size, [question, chart, verdict], {
    eyebrow: "PREDICTION",
    footerLeft: `${data.totalVotes.toLocaleString()} FORECASTS`,
  })
}
