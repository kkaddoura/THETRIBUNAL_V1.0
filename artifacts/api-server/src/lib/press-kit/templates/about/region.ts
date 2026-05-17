/**
 * Region Coverage — composite card showing the MENA countries TMH covers.
 * Lays the country flags + names in a flex grid (responsive to size).
 */

import type { BrandTokens } from "../../../design-tokens-cache.js"
import type { SizeKey } from "../../sizes.js"
import { frame, sizeScale, styleFor, type TemplateStyle } from "../styles.js"

export interface RegionCountry {
  name: string
  flag: string
  population: string
}

export interface RegionData {
  countries: RegionCountry[]
  totalPopulation?: string
}

export function regionCard(
  data: RegionData,
  tokens: BrandTokens,
  size: SizeKey,
  style: TemplateStyle = "minimal-serif",
) {
  const spec = styleFor(style, tokens, size)
  const scale = sizeScale(size)
  const isStory = size === "ig_story"
  const cols = isStory ? 3 : size === "ig_square" ? 4 : 5

  const visible = data.countries.slice(0, isStory ? 18 : 19)
  const totalPop = data.totalPopulation ?? "541M"

  const body = [
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          marginBottom: isStory ? "48px" : "32px",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                fontSize: `${scale.hero}px`,
                fontWeight: 900,
                color: spec.accent,
                lineHeight: 1,
                letterSpacing: "-0.04em",
              },
              children: String(visible.length),
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                fontSize: `${scale.body}px`,
                fontWeight: 700,
                fontFamily: spec.bodyFont,
                color: spec.fg,
                letterSpacing: "1.5px",
                textTransform: "uppercase" as const,
                marginTop: "8px",
              },
              children: `Countries · ${totalPop} people · One conversation`,
            },
          },
        ],
      },
    },
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          flexWrap: "wrap" as const,
          gap: isStory ? "24px" : "20px",
        },
        children: visible.map((c) => ({
          type: "div",
          props: {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "12px",
              width: `${100 / cols - 4}%`,
              padding: "8px 0",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    fontSize: `${scale.h2 * 0.7}px`,
                    lineHeight: 1,
                  },
                  children: c.flag || "·",
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    fontSize: `${scale.caption}px`,
                    fontWeight: 700,
                    fontFamily: spec.bodyFont,
                    color: spec.fg,
                    letterSpacing: "1px",
                    textTransform: "uppercase" as const,
                  },
                  children: c.name,
                },
              },
            ],
          },
        })),
      },
    },
  ]

  return frame(spec, size, body, {
    eyebrow: "Region coverage",
    footerLeft: "MENA · 2026",
  })
}
