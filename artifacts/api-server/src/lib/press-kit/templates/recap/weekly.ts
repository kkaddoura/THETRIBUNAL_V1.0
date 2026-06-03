/**
 * Weekly Recap — composite carousel summarizing the past 7 days.
 * Slide 1 — Cover ("This week on TMH")
 * Slide 2 — Top debate
 * Slide 3 — Top prediction
 * Slide 4 — Top pulse stat
 */

import type { BrandTokens } from "../../../design-tokens-cache.js"
import type { SizeKey } from "../../sizes.js"
import { frame, sizeScale, styleFor, type TemplateStyle } from "../styles.js"

export interface RecapData {
  weekLabel: string
  topDebate: { question: string; category?: string; winningOption?: string; winningPercentage?: number }
  topPrediction: { question: string; yesPercentage?: number }
  topPulse: { title: string; stat: string; delta?: string; deltaUp?: boolean }
}

function coverSlide(d: RecapData, tokens: BrandTokens, size: SizeKey, style: TemplateStyle) {
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
                fontFamily: spec.displayFont,
                color: spec.fg,
                lineHeight: 1,
                letterSpacing: spec.displayTracking,
                textTransform: "uppercase" as const,
              },
              children: "This week",
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
              },
              children: [
                { type: "span", props: { children: "on TMH" } },
                { type: "span", props: { style: { color: spec.accent }, children: "." } },
              ],
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
                color: spec.muted,
                marginTop: isStory ? "48px" : "32px",
                letterSpacing: "2px",
                textTransform: "uppercase" as const,
              },
              children: d.weekLabel,
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                marginTop: isStory ? "32px" : "20px",
                fontSize: `${scale.caption}px`,
                fontWeight: 700,
                fontFamily: spec.bodyFont,
                color: spec.accent,
                letterSpacing: "2px",
                textTransform: "uppercase" as const,
              },
              children: "Swipe → debate · prediction · pulse",
            },
          },
        ],
      },
    },
  ]
  return frame(spec, size, body, { eyebrow: "WEEKLY RECAP", footerLeft: "1 / 4" })
}

function debateSlide(d: RecapData, tokens: BrandTokens, size: SizeKey, style: TemplateStyle) {
  const spec = styleFor(style, tokens, size)
  const scale = sizeScale(size)
  const isStory = size === "ig_story"
  const winnerLine =
    d.topDebate.winningOption && d.topDebate.winningPercentage != null
      ? `${Math.round(d.topDebate.winningPercentage)}% chose ${d.topDebate.winningOption}`
      : ""
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
                marginBottom: isStory ? "32px" : "20px",
              },
              children: `TOP DEBATE${d.topDebate.category ? ` · ${d.topDebate.category}` : ""}`,
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
                lineHeight: 1.08,
                letterSpacing: spec.displayTracking,
                marginBottom: isStory ? "32px" : "20px",
              },
              children: d.topDebate.question,
            },
          },
          ...(winnerLine
            ? [
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      fontSize: `${scale.body}px`,
                      fontWeight: 700,
                      fontFamily: spec.bodyFont,
                      color: spec.muted,
                    },
                    children: winnerLine,
                  },
                },
              ]
            : []),
        ],
      },
    },
  ]
  return frame(spec, size, body, { eyebrow: "WEEKLY RECAP", footerLeft: "2 / 4" })
}

function predictionSlide(d: RecapData, tokens: BrandTokens, size: SizeKey, style: TemplateStyle) {
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
                color: spec.accent,
                letterSpacing: "2px",
                textTransform: "uppercase" as const,
                marginBottom: isStory ? "32px" : "20px",
              },
              children: "TOP PREDICTION",
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
                lineHeight: 1.08,
                letterSpacing: spec.displayTracking,
                marginBottom: isStory ? "32px" : "20px",
              },
              children: d.topPrediction.question,
            },
          },
          ...(d.topPrediction.yesPercentage != null
            ? [
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      fontSize: `${isStory ? scale.hero : scale.h1}px`,
                      fontWeight: 900,
                      fontFamily: spec.displayFont,
                      color: spec.accent,
                      lineHeight: 1,
                    },
                    children: `${Math.round(d.topPrediction.yesPercentage)}% YES`,
                  },
                },
              ]
            : []),
        ],
      },
    },
  ]
  return frame(spec, size, body, { eyebrow: "WEEKLY RECAP", footerLeft: "3 / 4" })
}

function pulseSlide(d: RecapData, tokens: BrandTokens, size: SizeKey, style: TemplateStyle) {
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
                color: spec.accent,
                letterSpacing: "2px",
                textTransform: "uppercase" as const,
                marginBottom: isStory ? "32px" : "20px",
              },
              children: "TOP PULSE",
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                fontSize: `${scale.h2}px`,
                fontWeight: 700,
                fontFamily: spec.bodyFont,
                color: spec.muted,
                lineHeight: 1.2,
                marginBottom: isStory ? "32px" : "16px",
              },
              children: d.topPulse.title,
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                fontSize: `${isStory ? scale.hero * 1.1 : scale.hero}px`,
                fontWeight: 900,
                fontFamily: spec.displayFont,
                color: spec.fg,
                lineHeight: 1,
                letterSpacing: "-0.03em",
              },
              children: d.topPulse.stat,
            },
          },
          ...(d.topPulse.delta
            ? [
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      marginTop: isStory ? "32px" : "20px",
                      fontSize: `${scale.h2}px`,
                      fontWeight: 900,
                      color: d.topPulse.deltaUp ? spec.accent : spec.muted,
                    },
                    children: d.topPulse.delta,
                  },
                },
              ]
            : []),
        ],
      },
    },
  ]
  return frame(spec, size, body, { eyebrow: "WEEKLY RECAP", footerLeft: "4 / 4" })
}

export function weeklyRecap(d: RecapData, tokens: BrandTokens, size: SizeKey, style: TemplateStyle = "dark") {
  return [coverSlide(d, tokens, size, style), debateSlide(d, tokens, size, style), predictionSlide(d, tokens, size, style), pulseSlide(d, tokens, size, style)]
}
