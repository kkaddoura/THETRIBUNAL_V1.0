/**
 * Full-bleed AI-image card. Used for every atom type when useAiImage=true:
 * the Nano-Banana image fills the frame (B&W + halftone, applied upstream),
 * a dark gradient anchors the bottom, and the atom's headline/attribution is
 * overlaid in white. Keeps the whole kit visually coherent regardless of atom.
 */

import type { BrandTokens } from "../../design-tokens-cache.js"
import type { SizeKey } from "../sizes.js"

interface SatoriElement {
  type: string
  props: Record<string, unknown>
}

export interface AiCardData {
  imageUrl: string
  eyebrow: string // e.g. "PREDICTION", "VOICE"
  headline: string // the quote / question / stat
  attribution?: string // e.g. "— Sara Dweik, Founder" or "RESOLVES 2032"
}

export function aiBackgroundCard(
  data: AiCardData,
  tokens: BrandTokens,
  size: SizeKey,
): SatoriElement {
  const isStory = size === "ig_story"
  const isWide = size === "x_landscape" || size === "linkedin"
  const headlineSize = isStory ? 56 : isWide ? 46 : 52

  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        position: "relative",
        width: "100%",
        height: "100%",
        backgroundColor: tokens.bg,
      },
      children: [
        // Full-bleed image
        {
          type: "img",
          props: {
            src: data.imageUrl,
            width: "100%",
            height: "100%",
            style: {
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "grayscale(100%) contrast(1.05)",
            },
          },
        },
        // Bottom gradient for legibility
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              bottom: 0,
              left: 0,
              width: "100%",
              height: "62%",
              display: "flex",
              backgroundImage:
                "linear-gradient(to bottom, rgba(10,10,10,0) 0%, rgba(10,10,10,0.55) 45%, rgba(10,10,10,0.92) 100%)",
            },
          },
        },
        // Text overlay
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              bottom: 0,
              left: 0,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              padding: isStory ? "0 80px 130px" : "0 70px 70px",
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
                    marginBottom: "18px",
                  },
                  children: data.eyebrow,
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    fontSize: `${headlineSize}px`,
                    fontFamily: tokens.headingFont,
                    fontWeight: 800,
                    color: "#FFFFFF",
                    lineHeight: 1.18,
                  },
                  children: data.headline,
                },
              },
              ...(data.attribution
                ? [
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          fontSize: "20px",
                          fontFamily: tokens.bodyFont,
                          fontWeight: 600,
                          color: tokens.fg,
                          letterSpacing: "1px",
                          marginTop: "22px",
                        },
                        children: data.attribution,
                      },
                    },
                  ]
                : []),
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    fontSize: "13px",
                    fontFamily: tokens.bodyFont,
                    fontWeight: 700,
                    color: tokens.muted,
                    letterSpacing: "2px",
                    textTransform: "uppercase" as const,
                    marginTop: "26px",
                  },
                  children: "THETRIBUNAL.COM",
                },
              },
            ],
          },
        },
      ],
    },
  }
}
