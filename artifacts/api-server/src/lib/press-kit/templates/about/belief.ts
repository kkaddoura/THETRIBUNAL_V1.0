/**
 * Belief Card — punchy editorial belief from the About `beliefs[]` list.
 */

import type { BrandTokens } from "../../../design-tokens-cache.js"
import type { SizeKey } from "../../sizes.js"
import { frame, sizeScale, styleFor, type TemplateStyle } from "../styles.js"

export interface BeliefData {
  num: string
  title: string
  body: string
}

export function beliefCard(
  data: BeliefData,
  tokens: BrandTokens,
  size: SizeKey,
  style: TemplateStyle = "minimal-serif",
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
          alignSelf: "flex-start",
          fontSize: `${scale.caption}px`,
          fontWeight: 900,
          fontFamily: spec.bodyFont,
          color: spec.fg,
          backgroundColor: spec.accent,
          letterSpacing: "3px",
          textTransform: "uppercase" as const,
          padding: "9px 16px",
          borderRadius: spec.radius,
          marginBottom: isStory ? "32px" : "20px",
        },
        children: `BELIEF · ${data.num}`,
      },
    },
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          flex: 1,
          flexDirection: "column",
          justifyContent: "center",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                fontSize: `${isStory ? scale.h1 : scale.h2}px`,
                fontWeight: spec.headingWeight,
                fontFamily: spec.displayFont,
                color: spec.fg,
                lineHeight: 1.08,
                letterSpacing: spec.displayTracking,
                marginBottom: isStory ? "32px" : "20px",
              },
              children: data.title,
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                fontSize: `${scale.body}px`,
                fontWeight: 400,
                fontFamily: spec.bodyFont,
                color: spec.muted,
                lineHeight: 1.4,
              },
              children: data.body,
            },
          },
        ],
      },
    },
  ]

  return frame(spec, size, body, { footerLeft: "WHAT WE BELIEVE" })
}
