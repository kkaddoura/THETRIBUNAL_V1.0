/**
 * Debate-as-carousel: 3 slides for one debate.
 *  Slide 1 — Hook (the question, big, one line)
 *  Slide 2 — Context (category + setup)
 *  Slide 3 — Vote split (binary % bars)
 */

import type { BrandTokens } from "../../../design-tokens-cache.js"
import type { SizeKey } from "../../sizes.js"
import { frame, sizeScale, styleFor, type TemplateStyle } from "../styles.js"

export interface DebateCarouselData {
  question: string
  category?: string
  context?: string
  totalVotes: number
  options: { text: string; percentage: number }[]
}

function hookSlide(d: DebateCarouselData, tokens: BrandTokens, size: SizeKey, style: TemplateStyle) {
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
                fontSize: `${isStory ? scale.hero : scale.h1}px`,
                fontWeight: spec.headingWeight,
                color: spec.fg,
                lineHeight: 1.05,
                letterSpacing: "-0.015em",
                textTransform: "uppercase" as const,
              },
              children: d.question,
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
          marginTop: "24px",
          fontSize: `${scale.caption}px`,
          fontWeight: 700,
          fontFamily: spec.bodyFont,
          color: spec.accent,
          letterSpacing: "2px",
          textTransform: "uppercase" as const,
        },
        children: "Swipe →",
      },
    },
  ]
  return frame(spec, size, body, { eyebrow: d.category ?? "DEBATE", footerLeft: "1 / 3" })
}

function contextSlide(d: DebateCarouselData, tokens: BrandTokens, size: SizeKey, style: TemplateStyle) {
  const spec = styleFor(style, tokens, size)
  const scale = sizeScale(size)
  const isStory = size === "ig_story"
  const ctx = d.context ?? `A live debate on The Tribunal across ${d.category ?? "MENA"}. Votes from across the region are coming in.`
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
                color: spec.accent,
                letterSpacing: "2px",
                textTransform: "uppercase" as const,
                marginBottom: isStory ? "24px" : "16px",
              },
              children: "CONTEXT",
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                fontSize: `${isStory ? scale.h2 : scale.h2 * 0.85}px`,
                fontWeight: spec.headingWeight,
                color: spec.fg,
                lineHeight: 1.25,
                letterSpacing: "-0.01em",
              },
              children: ctx,
            },
          },
        ],
      },
    },
  ]
  return frame(spec, size, body, { eyebrow: d.category ?? "DEBATE", footerLeft: "2 / 3" })
}

function voteSplitSlide(d: DebateCarouselData, tokens: BrandTokens, size: SizeKey, style: TemplateStyle) {
  const spec = styleFor(style, tokens, size)
  const scale = sizeScale(size)
  const isStory = size === "ig_story"
  const top = d.options.slice(0, 2)
  const winner = top.reduce((a, b) => (a.percentage >= b.percentage ? a : b), top[0])

  const body = [
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          fontSize: `${scale.body}px`,
          fontWeight: 700,
          fontFamily: spec.bodyFont,
          color: spec.accent,
          letterSpacing: "2px",
          textTransform: "uppercase" as const,
          marginBottom: isStory ? "32px" : "20px",
        },
        children: "VOTE SPLIT",
      },
    },
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          flexDirection: isStory ? "column" : "row",
          flex: 1,
          gap: "20px",
          alignItems: "stretch",
        },
        children: top.map((opt) => {
          const isWinner = opt === winner && (winner?.percentage ?? 0) > 0
          return {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                flex: 1,
                padding: "32px",
                border: `2px solid ${isWinner ? spec.accent : spec.border}`,
                backgroundColor: isWinner ? spec.accent : "transparent",
                justifyContent: "space-between",
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
                      color: isWinner ? spec.fg : spec.muted,
                      textTransform: "uppercase" as const,
                      letterSpacing: "1.5px",
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
                      color: isWinner ? spec.fg : spec.fg,
                      lineHeight: 1,
                    },
                    children: `${Math.round(opt.percentage)}%`,
                  },
                },
              ],
            },
          }
        }),
      },
    },
  ]
  return frame(spec, size, body, {
    eyebrow: `${d.totalVotes.toLocaleString()} VOTES`,
    footerLeft: "3 / 3",
  })
}

export function debateCarousel(
  d: DebateCarouselData,
  tokens: BrandTokens,
  size: SizeKey,
  style: TemplateStyle = "minimal-serif",
) {
  return [hookSlide(d, tokens, size, style), contextSlide(d, tokens, size, style), voteSplitSlide(d, tokens, size, style)]
}
