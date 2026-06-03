/**
 * Pulse-stat template (v1 single-item / Studio "Single" layout).
 *
 * Renders one striking statistic: a short title, an oversized number rendered
 * in `spec.displayFont` (Playfair when loaded), and an optional delta chip
 * coloured by direction (accent for down, green for up). The framing shell
 * (background, padding, accent rule, eyebrow, footer) comes from the shared
 * `frame()` helper driven by the selected `TemplateStyle`. The drop-cap
 * style uplifts the number further via `spec.numberStyle === "drop-cap"`.
 *
 * Style is the OPTIONAL last param (default "brutalist-index") so existing
 * callers in `routes/press-kit.ts` continue to work unchanged.
 */

import type { BrandTokens } from "../../design-tokens-cache.js"
import type { SizeKey } from "../sizes.js"
import { frame, sizeScale, styleFor, type TemplateStyle } from "./styles.js"

interface SatoriElement {
  type: string
  props: Record<string, unknown>
}

export interface PulseData {
  title: string
  stat: string
  delta?: string
  deltaUp?: boolean
  source?: string
}

export function pulseStat(
  data: PulseData,
  tokens: BrandTokens,
  size: SizeKey,
  style: TemplateStyle = "brutalist-index",
): SatoriElement {
  const spec = styleFor(style, tokens, size)
  const scale = sizeScale(size)
  const isStory = size === "ig_story"
  const deltaIsDown = data.deltaUp === false
  const deltaColor = deltaIsDown ? spec.accent : "#22C55E"
  const deltaArrow = deltaIsDown ? "▼" : "▲"
  // Slightly oversize the stat when the style asks for "drop-cap" emphasis.
  const statScale = spec.numberStyle === "drop-cap" ? 1.1 : 1

  const title: SatoriElement = {
    type: "div",
    props: {
      style: {
        display: "flex",
        fontSize: `${isStory ? scale.h1 * 0.75 : scale.h2 * 0.78}px`,
        fontWeight: spec.headingWeight,
        fontFamily: spec.displayFont,
        color: spec.fg,
        lineHeight: 1.15,
        letterSpacing: spec.displayTracking,
        textTransform: "uppercase" as const,
        marginBottom: "auto",
        maxWidth: "82%",
      },
      children: data.title,
    },
  }

  const statBlock: SatoriElement = {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        marginTop: "auto",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              fontSize: `${(isStory ? scale.hero * 1.25 : scale.hero) * statScale}px`,
              fontWeight: 900,
              fontFamily: spec.displayFont,
              color: spec.fg,
              lineHeight: 1,
              letterSpacing: spec.displayTracking,
            },
            children: data.stat,
          },
        },
        ...(data.delta
          ? [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    fontSize: `${scale.body * 1.05}px`,
                    fontWeight: 800,
                    fontFamily: spec.bodyFont,
                    color: "#FFFFFF",
                    marginTop: "20px",
                    padding: "10px 18px",
                    borderRadius: spec.radius,
                    backgroundColor: deltaColor,
                    letterSpacing: "1px",
                  },
                  children: `${deltaArrow} ${data.delta}`,
                },
              } as SatoriElement,
            ]
          : []),
      ],
    },
  }

  return frame(spec, size, [title, statBlock], {
    eyebrow: "MENA PULSE",
    footerLeft: data.source ?? "LIVE DATA",
  })
}
