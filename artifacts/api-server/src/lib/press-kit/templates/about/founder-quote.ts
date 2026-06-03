/**
 * Founder Quote — pull-quote treatment from About `founderStatement`.
 * Renders in three styles via the shared style spec.
 */

import type { BrandTokens } from "../../../design-tokens-cache.js"
import type { SizeKey } from "../../sizes.js"
import { frame, sizeScale, styleFor, type TemplateStyle } from "../styles.js"

export interface FounderQuoteData {
  text: string
  author: string
}

export function founderQuote(
  data: FounderQuoteData,
  tokens: BrandTokens,
  size: SizeKey,
  style: TemplateStyle = "brutalist-index",
) {
  const spec = styleFor(style, tokens, size)
  const scale = sizeScale(size)
  const isStory = size === "ig_story"

  const body = [
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                fontSize: `${scale.hero * 1.25}px`,
                fontFamily: spec.displayFont,
                color: spec.accent,
                lineHeight: 0.7,
                marginBottom: "8px",
                fontWeight: 900,
                opacity: spec.numberStyle === "subtle" ? 0.85 : 1,
              },
              children: "“",
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                fontSize: `${isStory ? scale.h1 : scale.h2}px`,
                fontWeight: spec.headingWeight,
                fontFamily: spec.displayFont,
                color: spec.fg,
                lineHeight: 1.18,
                letterSpacing: spec.displayTracking,
              },
              children: data.text,
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
          flexDirection: "column",
          marginTop: isStory ? "48px" : "32px",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                fontSize: `${scale.body}px`,
                fontWeight: 900,
                color: spec.fg,
                textTransform: "uppercase" as const,
                letterSpacing: "1.5px",
              },
              children: data.author,
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
                color: spec.muted,
                letterSpacing: "1.5px",
                textTransform: "uppercase" as const,
                marginTop: "6px",
              },
              children: "Founder · The Tribunal",
            },
          },
        ],
      },
    },
  ]

  return frame(spec, size, body, {
    eyebrow: "From the founder",
    footerLeft: "ABOUT · TMH",
  })
}
