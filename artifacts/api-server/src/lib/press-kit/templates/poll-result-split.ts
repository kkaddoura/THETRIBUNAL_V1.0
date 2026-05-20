/**
 * Poll-result-split template (v1 single-item / Studio "Single" layout).
 *
 * Renders a binary debate result: two side-by-side cards with each option's
 * text + percentage; the winner card is filled with the accent gradient and
 * lifted with a shadow. The framing shell (background, padding, accent rule,
 * eyebrow, footer, optional vignette) comes from the shared `frame()` helper
 * driven by the selected `TemplateStyle`, so switching styles re-skins the
 * card while preserving its poll-bar identity.
 *
 * Style is the OPTIONAL last param (default "minimal-serif") so existing
 * callers in `routes/press-kit.ts` continue to work unchanged.
 */

import type { BrandTokens } from "../../design-tokens-cache.js"
import type { SizeKey } from "../sizes.js"
import { frame, sizeScale, styleFor, type TemplateStyle } from "./styles.js"

interface SatoriElement {
  type: string
  props: Record<string, unknown>
}

export interface PollData {
  question: string
  category?: string
  totalVotes: number
  options: { text: string; percentage: number }[]
}

export function pollResultSplit(
  data: PollData,
  tokens: BrandTokens,
  size: SizeKey,
  style: TemplateStyle = "minimal-serif",
): SatoriElement {
  const spec = styleFor(style, tokens, size)
  const scale = sizeScale(size)
  const isStory = size === "ig_story"
  const top = data.options.slice(0, 2) // binary
  const winner = top.reduce((a, b) => (a.percentage >= b.percentage ? a : b), top[0])

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
        marginBottom: "auto",
      },
      children: data.question,
    },
  }

  const bars: SatoriElement = {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: isStory ? "column" : "row",
        width: "100%",
        gap: "20px",
        marginTop: isStory ? "40px" : "32px",
      },
      children: top.map((opt) => {
        const isWinner = opt === winner && winner.percentage > 0
        return {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              flex: 1,
              padding: "28px",
              borderRadius: spec.radius,
              border: `2px solid ${isWinner ? spec.accent : spec.border}`,
              ...(isWinner
                ? {
                    ...(spec.accentGradient
                      ? { backgroundImage: spec.accentGradient }
                      : { backgroundColor: spec.accent }),
                    ...(spec.shadow ? { boxShadow: spec.shadow } : {}),
                  }
                : { backgroundColor: spec.panelBg }),
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    fontSize: `${scale.caption}px`,
                    fontWeight: 700,
                    fontFamily: spec.bodyFont,
                    color: isWinner ? "#FFFFFF" : spec.muted,
                    textTransform: "uppercase" as const,
                    letterSpacing: "1.5px",
                    marginBottom: "10px",
                  },
                  children: opt.text,
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    fontSize: `${isStory ? scale.hero : scale.h1}px`,
                    fontWeight: 900,
                    fontFamily: spec.displayFont,
                    color: isWinner ? "#FFFFFF" : spec.fg,
                    lineHeight: 1,
                    letterSpacing: spec.displayTracking,
                  },
                  children: `${Math.round(opt.percentage)}%`,
                },
              },
            ],
          },
        }
      }),
    },
  }

  return frame(spec, size, [question, bars], {
    eyebrow: data.category ?? "DEBATE",
    footerLeft: `${data.totalVotes.toLocaleString()} VOTES`,
  })
}
