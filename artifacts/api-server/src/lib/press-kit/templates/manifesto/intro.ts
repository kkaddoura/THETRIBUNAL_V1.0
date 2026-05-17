/**
 * Manifesto / About-summary intro card.
 */

import type { BrandTokens } from "../../../design-tokens-cache.js"
import type { SizeKey } from "../../sizes.js"
import { frame, sizeScale, styleFor, type TemplateStyle } from "../styles.js"

export interface ManifestoData {
  tagline: string
  titleLine1: string
  titleLine2: string
  punctuation?: string
  subtitle: string
}

export function manifestoCard(
  data: ManifestoData,
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
          fontSize: `${scale.brand}px`,
          color: spec.muted,
          fontFamily: spec.bodyFont,
          fontWeight: 700,
          letterSpacing: "3px",
          textTransform: "uppercase" as const,
          marginBottom: isStory ? "48px" : "32px",
        },
        children: data.tagline,
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
                fontSize: `${isStory ? scale.hero : scale.h1}px`,
                fontWeight: 900,
                fontFamily: spec.headingFont,
                color: spec.fg,
                lineHeight: 1,
                letterSpacing: "-0.025em",
                textTransform: "uppercase" as const,
              },
              children: data.titleLine1,
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                fontSize: `${isStory ? scale.hero : scale.h1}px`,
                fontWeight: 900,
                fontFamily: spec.headingFont,
                color: spec.fg,
                lineHeight: 1,
                letterSpacing: "-0.025em",
                textTransform: "uppercase" as const,
                marginTop: "4px",
              },
              children: [
                {
                  type: "span",
                  props: { children: data.titleLine2 },
                },
                {
                  type: "span",
                  props: {
                    style: { color: spec.accent },
                    children: data.punctuation ?? ".",
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
                fontSize: `${scale.body}px`,
                fontWeight: 400,
                fontFamily: spec.bodyFont,
                color: spec.muted,
                lineHeight: 1.4,
                marginTop: isStory ? "48px" : "32px",
                maxWidth: "85%",
              },
              children: data.subtitle,
            },
          },
        ],
      },
    },
  ]

  return frame(spec, size, body, { footerLeft: "EST. 2026" })
}
