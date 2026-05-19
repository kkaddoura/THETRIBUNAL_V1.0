/**
 * Shared style helpers for Studio v2 templates. Each template can render in
 * three style variants. Style controls layout density, palette intensity,
 * and typography weight; the underlying brand tokens (colors, fonts) come
 * from `BrandTokens`.
 *
 * The three styles are deliberately, unmistakably different so the CMS style
 * picker previews the final look:
 *  - "minimal-serif" — refined editorial dark. Near-black vignette, large
 *     Playfair serif display, hairline crimson rule, generous negative space.
 *  - "bold-crimson"  — high-impact full-bleed. Rich multi-stop crimson
 *     gradient, oversized condensed black headline, dark accent block,
 *     dramatic shadow, strong corner radius. Poster energy.
 *  - "magazine"      — cream print editorial. Warm paper gradient, thick
 *     crimson rule + accent block, drop-cap numeral, serif headline,
 *     footnote-style metadata row.
 *
 * Rendering target is Satori → Resvg: flexbox only, linear-gradient
 * backgrounds, borderRadius, box-shadow, solid/transparent colors. No CSS
 * animation. The serif `displayFont` resolves to Playfair Display when its
 * TTF loaded (see og-fonts.ts); Satori falls back to the brand sans family
 * automatically if it did not.
 */

import type { BrandTokens } from "../../design-tokens-cache.js"
import { SERIF_DISPLAY_FAMILY } from "../../og-fonts.js"
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

  // ── Added (additive — older templates ignore these and still render) ──

  /** Serif/display family for big editorial headlines (Playfair Display). */
  displayFont: string
  /** Corner radius for accent chips / small inner blocks, e.g. "14px". */
  radius: string
  /** Corner radius for the large framed content panel, e.g. "28px". */
  panelRadius: string
  /** Layered drop shadow for the content panel (depth). */
  shadow: string
  /** Optional secondary gradient for accent blocks / chips. */
  accentGradient?: string
  /** Colour for the small uppercase tracked eyebrow label. */
  eyebrowColor: string
  /** Background of the inner content panel ("transparent" = no panel). */
  panelBg: string
  /** Subtle radial overlay drawn over the bg for depth (optional). */
  vignette?: string
  /** Thickness of the top accent rule in px. */
  ruleWeight: number
  /** Width of the top accent rule, e.g. "96px". */
  ruleWidth: string
  /** Whether the top rule uses the accent gradient instead of a flat fill. */
  ruleGradient: boolean
  /** How big numerals/quotation motifs render: subtle | bold | drop-cap. */
  numberStyle: "subtle" | "bold" | "drop-cap"
  /** Letter-spacing applied to display headlines. */
  displayTracking: string
  /** Inner padding for the content panel, e.g. "0" or "56px". */
  panelPadding: string
}

export function styleFor(style: TemplateStyle, tokens: BrandTokens, size: SizeKey): StyleSpec {
  const isStory = size === "ig_story"
  const padding = isStory ? "110px 80px" : "76px"
  const serif = SERIF_DISPLAY_FAMILY

  if (style === "minimal-serif") {
    // Refined editorial dark — deep near-black with a soft vignette, elegant
    // serif display, hairline crimson rule, lots of air, gentle panel lift.
    const panel = "rgba(255,255,255,0.028)"
    return {
      bg: tokens.bg,
      fg: tokens.fg,
      accent: tokens.accent,
      muted: tokens.muted,
      border: "rgba(255,255,255,0.10)",
      headingFont: serif,
      bodyFont: tokens.bodyFont,
      headingWeight: 700,
      padding,
      showWatermark: true,
      showRule: true,
      ruleColor: "rgba(255,255,255,0.12)",
      bgGradient: `linear-gradient(160deg, #141414 0%, ${tokens.bg} 46%, #050505 100%)`,
      displayFont: serif,
      radius: "12px",
      panelRadius: "26px",
      shadow: "0 30px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
      accentGradient: `linear-gradient(90deg, ${tokens.accent} 0%, #8E0C24 100%)`,
      eyebrowColor: tokens.accent,
      panelBg: panel,
      vignette:
        "radial-gradient(120% 90% at 50% 12%, rgba(220,20,60,0.10) 0%, rgba(0,0,0,0) 55%)",
      ruleWeight: 3,
      ruleWidth: "72px",
      ruleGradient: true,
      numberStyle: "subtle",
      displayTracking: "-0.018em",
      panelPadding: isStory ? "64px 56px" : "52px 56px",
    }
  }

  if (style === "bold-crimson") {
    // High-impact full-bleed — rich multi-stop crimson, oversized condensed
    // black headline, dark accent block, dramatic shadow, strong radius.
    return {
      bg: tokens.accent,
      fg: "#FFFFFF",
      accent: tokens.bg,
      muted: "rgba(255,255,255,0.78)",
      border: "rgba(255,255,255,0.26)",
      headingFont: tokens.headingFont,
      bodyFont: tokens.bodyFont,
      headingWeight: 900,
      padding,
      showWatermark: true,
      showRule: true,
      ruleColor: "rgba(255,255,255,0.34)",
      bgGradient: `linear-gradient(150deg, #F11D45 0%, ${tokens.accent} 38%, #A60C28 100%)`,
      displayFont: tokens.headingFont,
      radius: "18px",
      panelRadius: "32px",
      shadow:
        "0 36px 90px rgba(120,0,20,0.55), 0 4px 0 rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.16)",
      accentGradient: `linear-gradient(135deg, ${tokens.bg} 0%, #1A1A1A 100%)`,
      eyebrowColor: "#FFFFFF",
      panelBg: "rgba(255,255,255,0.07)",
      vignette:
        "radial-gradient(110% 80% at 78% 8%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 52%)",
      ruleWeight: 8,
      ruleWidth: "120px",
      ruleGradient: false,
      numberStyle: "bold",
      displayTracking: "-0.03em",
      panelPadding: isStory ? "68px 56px" : "54px 56px",
    }
  }

  // magazine — cream print editorial.
  return {
    bg: tokens.fg,
    fg: tokens.bg,
    accent: tokens.accent,
    muted: "#6B6760",
    border: "#D8D0C2",
    headingFont: SERIF_DISPLAY_FAMILY,
    bodyFont: tokens.bodyFont,
    headingWeight: 800,
    padding,
    showWatermark: true,
    showRule: true,
    ruleColor: tokens.accent,
    bgGradient: `linear-gradient(165deg, #FBF7EF 0%, ${tokens.fg} 44%, #E6DDCB 100%)`,
    displayFont: SERIF_DISPLAY_FAMILY,
    radius: "8px",
    panelRadius: "10px",
    shadow: "0 22px 50px rgba(120,100,70,0.16), inset 0 0 0 1px rgba(0,0,0,0.04)",
    accentGradient: `linear-gradient(135deg, ${tokens.accent} 0%, #A60C28 100%)`,
    eyebrowColor: tokens.accent,
    panelBg: "rgba(255,255,255,0.42)",
    vignette:
      "radial-gradient(100% 70% at 0% 0%, rgba(220,20,60,0.05) 0%, rgba(255,255,255,0) 48%)",
    ruleWeight: 6,
    ruleWidth: "100%",
    ruleGradient: false,
    numberStyle: "drop-cap",
    displayTracking: "-0.012em",
    panelPadding: isStory ? "62px 54px" : "48px 54px",
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
    return { hero: 148, h1: 92, h2: 58, body: 36, caption: 22, brand: 18 }
  }
  if (size === "ig_square") {
    return { hero: 126, h1: 74, h2: 49, body: 30, caption: 20, brand: 16 }
  }
  if (size === "x_landscape") {
    return { hero: 100, h1: 62, h2: 41, body: 26, caption: 18, brand: 14 }
  }
  // linkedin
  return { hero: 92, h1: 58, h2: 41, body: 24, caption: 18, brand: 14 }
}

/**
 * Standard brand strip + footer wrapper used by most templates.
 *
 * Renders three stacked layers:
 *  1. full-bleed gradient/solid background
 *  2. an optional radial vignette overlay (absolute) for depth
 *  3. a rounded, softly-shadowed content panel holding rule + eyebrow +
 *     body + footer
 *
 * Signature and option shape are unchanged; every new behaviour is driven by
 * the additive StyleSpec fields and degrades sensibly if they are absent.
 */
export function frame(
  spec: StyleSpec,
  size: SizeKey,
  body: any,
  opts: { eyebrow?: string; footerLeft?: string; footerRight?: string } = {},
): any {
  const scale = sizeScale(size)
  const isStory = size === "ig_story"

  // Backward-compatible fallbacks for any caller still passing a legacy spec.
  const panelBg = spec.panelBg ?? "transparent"
  const hasPanel = panelBg !== "transparent"
  const panelRadius = spec.panelRadius ?? "0px"
  const panelPadding = spec.panelPadding ?? "0px"
  const shadow = spec.shadow
  const eyebrowColor = spec.eyebrowColor ?? spec.muted
  const ruleWeight = spec.ruleWeight ?? 5
  const ruleWidth = spec.ruleWidth ?? "80px"
  const ruleGradient = spec.ruleGradient ?? false
  const displayFont = spec.displayFont ?? spec.headingFont

  const rule = spec.showRule
    ? {
        type: "div",
        props: {
          style: {
            display: "flex",
            height: `${ruleWeight}px`,
            width: ruleWidth,
            borderRadius: `${ruleWeight}px`,
            ...(ruleGradient && spec.accentGradient
              ? { backgroundImage: spec.accentGradient }
              : { backgroundColor: spec.accent }),
            marginBottom: isStory ? "30px" : "22px",
          },
        },
      }
    : null

  const eyebrow = opts.eyebrow
    ? {
        type: "div",
        props: {
          style: {
            display: "flex",
            alignSelf: "flex-start",
            fontSize: `${scale.brand}px`,
            color: eyebrowColor,
            fontFamily: spec.bodyFont,
            fontWeight: 700,
            letterSpacing: "4px",
            textTransform: "uppercase" as const,
            paddingBottom: "10px",
            borderBottom: `1px solid ${spec.border}`,
            marginBottom: isStory ? "44px" : "30px",
          },
          children: opts.eyebrow,
        },
      }
    : null

  const bodySlot = {
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
  }

  const footer = {
    type: "div",
    props: {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: isStory ? "56px" : "38px",
        paddingTop: isStory ? "26px" : "20px",
        borderTop: `1px solid ${spec.ruleColor}`,
        color: spec.muted,
        fontSize: `${scale.brand}px`,
        fontWeight: 700,
        fontFamily: spec.bodyFont,
        letterSpacing: "2.5px",
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
            style: {
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: spec.fg,
              fontWeight: 900,
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    width: "8px",
                    height: "8px",
                    borderRadius: "8px",
                    backgroundColor: spec.accent,
                  },
                },
              },
              {
                type: "div",
                props: {
                  children:
                    opts.footerRight ?? (spec.showWatermark ? "TRIBUNAL.COM" : ""),
                },
              },
            ],
          },
        },
      ],
    },
  }

  const panelChildren = [rule, eyebrow, bodySlot, footer].filter(Boolean)

  const panel = {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        ...(hasPanel
          ? {
              backgroundColor: panelBg,
              borderRadius: panelRadius,
              padding: panelPadding,
              border: `1px solid ${spec.border}`,
              ...(shadow ? { boxShadow: shadow } : {}),
            }
          : {}),
      },
      children: panelChildren,
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
        ...(spec.bgGradient
          ? { backgroundImage: spec.bgGradient }
          : { backgroundColor: spec.bg }),
        fontFamily: displayFont,
        padding: spec.padding,
        color: spec.fg,
        position: "relative",
      },
      children: [
        ...(spec.vignette
          ? [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundImage: spec.vignette,
                  },
                },
              },
            ]
          : []),
        panel,
      ],
    },
  }
}
