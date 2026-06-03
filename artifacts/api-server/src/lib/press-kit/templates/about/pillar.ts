/**
 * Pillar Spotlight — one card per pillar.
 */

import type { BrandTokens } from "../../../design-tokens-cache.js"
import type { SizeKey } from "../../sizes.js"
import { frame, sizeScale, styleFor, type TemplateStyle } from "../styles.js"

export interface PillarData {
  num: string
  title: string
  body: string
  cta?: string
}

export function pillarCard(
  data: PillarData,
  tokens: BrandTokens,
  size: SizeKey,
  style: TemplateStyle = "brutalist-index",
) {
  const spec = styleFor(style, tokens, size)
  const scale = sizeScale(size)
  const isStory = size === "ig_story"

  const dropCap = spec.numberStyle === "drop-cap"
  const body = [
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          alignSelf: "flex-start",
          fontSize: `${scale.hero}px`,
          fontWeight: 900,
          fontFamily: spec.displayFont,
          color: dropCap ? spec.fg : spec.accent,
          lineHeight: 1,
          letterSpacing: "-0.04em",
          marginBottom: isStory ? "44px" : "30px",
          ...(dropCap
            ? {
                width: `${scale.hero * 1.15}px`,
                height: `${scale.hero * 1.15}px`,
                backgroundColor: spec.accent,
                color: spec.bg,
                borderRadius: spec.panelRadius,
              }
            : {}),
        },
        children: data.num,
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
          lineHeight: 1.04,
          letterSpacing: spec.displayTracking,
          textTransform: "uppercase" as const,
          marginBottom: isStory ? "32px" : "24px",
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
          maxWidth: "100%",
        },
        children: data.body,
      },
    },
  ]

  return frame(spec, size, body, {
    eyebrow: "A pillar of TMH",
    footerLeft: data.cta ?? "READ THE CHARTER",
  })
}
