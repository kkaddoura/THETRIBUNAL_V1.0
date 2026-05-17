/**
 * Voice-quote template. Pull-quote treatment with author attribution.
 */

import type { BrandTokens } from "../../design-tokens-cache.js"
import type { SizeKey } from "../sizes.js"

interface SatoriElement {
  type: string
  props: Record<string, unknown>
}

export interface VoiceData {
  name: string
  role: string
  company?: string
  quote: string
  imageUrl?: string
}

export function voiceQuote(data: VoiceData, tokens: BrandTokens, size: SizeKey): SatoriElement {
  const isStory = size === "ig_story"
  const hasPortrait = !!data.imageUrl

  const portraitBlock: SatoriElement | null = hasPortrait
    ? {
        type: "div",
        props: {
          style: {
            display: "flex",
            width: "100%",
            height: isStory ? "55%" : "48%",
            backgroundColor: tokens.bg,
            overflow: "hidden",
            position: "relative",
          },
          children: [
            {
              type: "img",
              props: {
                src: data.imageUrl,
                width: "100%",
                height: "100%",
                style: {
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: "grayscale(100%) contrast(1.05)",
                },
              },
            },
          ],
        },
      }
    : null

  const textColumn: SatoriElement = {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        flex: 1,
        backgroundColor: tokens.bg,
        fontFamily: tokens.headingFont,
        padding: isStory ? "70px 70px 120px" : "60px 70px 70px",
        justifyContent: "space-between",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              fontSize: "16px",
              color: tokens.accent,
              fontFamily: tokens.bodyFont,
              fontWeight: 700,
              letterSpacing: "3px",
              textTransform: "uppercase" as const,
            },
            children: "VOICE",
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              flex: 1,
              justifyContent: "center",
              paddingTop: "16px",
              paddingBottom: "16px",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    fontSize: isStory ? "100px" : hasPortrait ? "72px" : "100px",
                    color: tokens.accent,
                    lineHeight: 0.6,
                    marginBottom: "16px",
                  },
                  children: "“",
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    fontSize: isStory ? "44px" : hasPortrait ? "32px" : "38px",
                    fontWeight: 700,
                    fontFamily: tokens.bodyFont,
                    color: tokens.fg,
                    lineHeight: 1.25,
                  },
                  children: data.quote,
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
              borderTop: `1px solid ${tokens.border}`,
              paddingTop: "20px",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    fontSize: "24px",
                    fontWeight: 900,
                    color: tokens.fg,
                    textTransform: "uppercase" as const,
                    letterSpacing: "1px",
                  },
                  children: data.name,
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    fontSize: "14px",
                    fontWeight: 600,
                    fontFamily: tokens.bodyFont,
                    color: tokens.muted,
                    letterSpacing: "1.5px",
                    textTransform: "uppercase" as const,
                    marginTop: "4px",
                  },
                  children: data.company ? `${data.role} · ${data.company}` : data.role,
                },
              },
            ],
          },
        },
      ],
    },
  }

  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: tokens.bg,
      },
      children: portraitBlock ? [portraitBlock, textColumn] : [textColumn],
    },
  }
}
