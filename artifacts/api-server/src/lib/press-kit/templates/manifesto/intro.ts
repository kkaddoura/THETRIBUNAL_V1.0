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
  style: TemplateStyle = "dark-editorial",
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
          fontSize: `${scale.brand}px`,
          color: spec.fg,
          backgroundColor: spec.accent,
          fontFamily: spec.bodyFont,
          fontWeight: 900,
          letterSpacing: "3px",
          textTransform: "uppercase" as const,
          padding: "10px 18px",
          borderRadius: spec.radius,
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
                fontWeight: spec.headingWeight,
                fontFamily: spec.displayFont,
                color: spec.fg,
                lineHeight: 1,
                letterSpacing: spec.displayTracking,
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
                fontWeight: spec.headingWeight,
                fontFamily: spec.displayFont,
                color: spec.fg,
                lineHeight: 1,
                letterSpacing: spec.displayTracking,
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
