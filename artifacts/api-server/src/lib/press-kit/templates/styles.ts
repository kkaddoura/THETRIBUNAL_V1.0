/**
 * Shared style helpers for Studio v2 templates. Each template can render in
 * three style variants. Style controls layout density, palette intensity,
 * and typography weight; the underlying brand tokens (colors, fonts) come
 * from `BrandTokens`.
 */

import type { BrandTokens } from "../../design-tokens-cache.js"
import type { SizeKey } from "../sizes.js"

export type TemplateStyle = "minimal-serif" | "bold-crimson" | "magazine"

export const TEMPLATE_STYLES: TemplateStyle[] = ["minimal-serif", "bold-crimson", "magazine"]

export interface StyleSpec {
  bg: string
  fg: string
  accent: string
  muted: string
  border: string
  headingFont: string
  bodyFont: string
  headingWeight: number
  padding: string
  showWatermark: boolean
  showRule: boolean
  ruleColor: string
  bgGradient?: string
}

export function styleFor(style: TemplateStyle, tokens: BrandTokens, size: SizeKey): StyleSpec {
  const isStory = size === "ig_story"
  const padding = isStory ? "120px 80px" : "80px"

  if (style === "minimal-serif") {
    return {
      bg: tokens.bg,
      fg: tokens.fg,
      accent: tokens.accent,
      muted: tokens.muted,
      border: tokens.border,
      headingFont: tokens.headingFont,
      bodyFont: tokens.bodyFont,
      headingWeight: 700,
      padding,
      showWatermark: true,
      showRule: true,
      ruleColor: tokens.muted,
    }
  }

  if (style === "bold-crimson") {
    return {
      bg: tokens.accent,
      fg: tokens.fg,
      accent: tokens.bg,
      muted: "rgba(255,255,255,0.7)",
      border: "rgba(255,255,255,0.2)",
      headingFont: tokens.headingFont,
      bodyFont: tokens.bodyFont,
      headingWeight: 900,
      padding,
      showWatermark: true,
      showRule: false,
      ruleColor: "rgba(255,255,255,0.4)",
      bgGradient: `linear-gradient(135deg, ${tokens.accent} 0%, #B30E2F 100%)`,
    }
  }

  // magazine
  return {
    bg: tokens.fg,
    fg: tokens.bg,
    accent: tokens.accent,
    muted: "#5A5651",
    border: "#D8D2C7",
    headingFont: tokens.headingFont,
    bodyFont: tokens.bodyFont,
    headingWeight: 800,
    padding,
    showWatermark: true,
    showRule: true,
    ruleColor: tokens.accent,
    bgGradient: `linear-gradient(180deg, ${tokens.fg} 0%, #EAE3D6 100%)`,
  }
}

export function sizeScale(size: SizeKey): {
  hero: number
  h1: number
  h2: number
  body: number
  caption: number
  brand: number
} {
  if (size === "ig_story") {
    return { hero: 140, h1: 88, h2: 56, body: 36, caption: 22, brand: 18 }
  }
  if (size === "ig_square") {
    return { hero: 120, h1: 72, h2: 48, body: 30, caption: 20, brand: 16 }
  }
  if (size === "x_landscape") {
    return { hero: 96, h1: 60, h2: 40, body: 26, caption: 18, brand: 14 }
  }
  // linkedin
  return { hero: 88, h1: 56, h2: 40, body: 24, caption: 18, brand: 14 }
}

/**
 * Standard brand strip + footer wrapper used by most templates.
 */
export function frame(
  spec: StyleSpec,
  size: SizeKey,
  body: any,
  opts: { eyebrow?: string; footerLeft?: string; footerRight?: string } = {},
): any {
  const scale = sizeScale(size)
  const isStory = size === "ig_story"

  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        ...(spec.bgGradient
          ? { backgroundImage: spec.bgGradient }
          : { backgroundColor: spec.bg }),
        fontFamily: spec.headingFont,
        padding: spec.padding,
        color: spec.fg,
        position: "relative",
      },
      children: [
        // Eyebrow strip (top accent rule)
        ...(spec.showRule
          ? [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    height: "5px",
                    width: "80px",
                    backgroundColor: spec.accent,
                    marginBottom: isStory ? "32px" : "24px",
                  },
                },
              },
            ]
          : []),
        ...(opts.eyebrow
          ? [
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
                  children: opts.eyebrow,
                },
              },
            ]
          : []),
        // Body slot
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minHeight: 0,
            },
            children: body,
          },
        },
        // Footer
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              justifyContent: "space-between",
              marginTop: isStory ? "60px" : "40px",
              paddingTop: isStory ? "28px" : "20px",
              borderTop: `1px solid ${spec.ruleColor}`,
              color: spec.muted,
              fontSize: `${scale.brand}px`,
              fontWeight: 700,
              fontFamily: spec.bodyFont,
              letterSpacing: "2px",
              textTransform: "uppercase" as const,
            },
            children: [
              {
                type: "div",
                props: { children: opts.footerLeft ?? "" },
              },
              {
                type: "div",
                props: {
                  style: { color: spec.fg, fontWeight: 900 },
                  children: opts.footerRight ?? (spec.showWatermark ? "TRIBUNAL.COM" : ""),
                },
              },
            ],
          },
        },
      ],
    },
  }
}
