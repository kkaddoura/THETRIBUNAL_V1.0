/**
 * Prediction-momentum template (v1 single-item / Studio "Single" layout).
 *
 * Renders a prediction's consensus reading: oversized percentage (rendered in
 * the style's `displayFont`), the "say YES" / "say NO" verdict, and either
 * the resolve-by countdown or a "Live prediction" tag. The framing shell
 * (background, padding, accent rule, eyebrow, footer) comes from the shared
 * `frame()` helper driven by the selected `TemplateStyle`.
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

export interface PredictionData {
  question: string
  yesPercentage: number
  totalVotes: number
  daysToResolve?: number | null
}

export function predictionMomentum(
  data: PredictionData,
  tokens: BrandTokens,
  size: SizeKey,
  style: TemplateStyle = "minimal-serif",
): SatoriElement {
  const spec = styleFor(style, tokens, size)
  const scale = sizeScale(size)
  const isStory = size === "ig_story"
  const yes = Math.round(data.yesPercentage)
  const no = 100 - yes
  const consensus = yes >= 50 ? "YES" : "NO"
  const consensusPct = yes >= 50 ? yes : no

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

  const verdict: SatoriElement = {
    type: "div",
    props: {
      style: {
        display: "flex",
        alignItems: "baseline",
        marginTop: isStory ? "60px" : "40px",
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

  return frame(spec, size, [question, verdict], {
    eyebrow: "PREDICTION",
    footerLeft: `${data.totalVotes.toLocaleString()} FORECASTS`,
  })
}
