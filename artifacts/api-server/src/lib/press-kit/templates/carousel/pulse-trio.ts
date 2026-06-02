/**
 * Pulse Trio carousel — three trending pulse stats, one per slide.
 */

import type { BrandTokens } from "../../../design-tokens-cache.js"
import type { SizeKey } from "../../sizes.js"
import { frame, sizeScale, styleFor, type TemplateStyle } from "../styles.js"

export interface PulseItem {
  title: string
  stat: string
  delta?: string
  deltaUp?: boolean
  source?: string
}

export interface PulseTrioData {
  items: PulseItem[]
}

function pulseSlide(item: PulseItem, tokens: BrandTokens, size: SizeKey, style: TemplateStyle, index: number, total: number) {
  const spec = styleFor(style, tokens, size)
  const scale = sizeScale(size)
  const isStory = size === "ig_story"

  const body = [
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
                fontSize: `${scale.body}px`,
                fontWeight: 700,
                fontFamily: spec.bodyFont,
                color: spec.muted,
                letterSpacing: "2px",
                textTransform: "uppercase" as const,
                marginBottom: isStory ? "32px" : "20px",
              },
              children: item.title,
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                fontSize: `${isStory ? scale.hero * 1.2 : scale.hero}px`,
                fontWeight: 900,
                fontFamily: spec.displayFont,
                color: spec.fg,
                lineHeight: 0.92,
                letterSpacing: "-0.03em",
              },
              children: item.stat,
            },
          },
          ...(item.delta
            ? [
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      alignSelf: "flex-start",
                      marginTop: isStory ? "32px" : "20px",
                      padding: "8px 18px",
                      borderRadius: spec.radius,
                      fontSize: `${scale.h2 * 0.78}px`,
                      fontWeight: 900,
                      color: item.deltaUp ? "#FFFFFF" : spec.muted,
                      backgroundColor: item.deltaUp ? spec.accent : spec.panelBg,
                      letterSpacing: "-0.01em",
                    },
                    children: `${item.deltaUp ? "▲" : "▼"} ${item.delta}`,
                  },
                },
              ]
            : []),
          ...(item.source
            ? [
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      marginTop: isStory ? "48px" : "32px",
                      fontSize: `${scale.caption}px`,
                      fontWeight: 700,
                      fontFamily: spec.bodyFont,
                      color: spec.muted,
                      letterSpacing: "1.5px",
                      textTransform: "uppercase" as const,
                    },
                    children: `Source · ${item.source}`,
                  },
                },
              ]
            : []),
        ],
      },
    },
  ]
  return frame(spec, size, body, { eyebrow: "MENA PULSE", footerLeft: `${index + 1} / ${total}` })
}

export function pulseTrio(
  d: PulseTrioData,
  tokens: BrandTokens,
  size: SizeKey,
  style: TemplateStyle = "dark-editorial",
) {
  const items = d.items.slice(0, 3)
  return items.map((it, i) => pulseSlide(it, tokens, size, style, i, items.length))
}
