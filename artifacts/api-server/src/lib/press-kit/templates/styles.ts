/**
 * Shared style helpers for Studio v2 templates. Each template can render in
 * one of five finalized, on-brand visual styles. Style controls layout
 * density, palette, surface, and typographic register; the underlying brand
 * tokens (colors, fonts) come from `BrandTokens`.
 *
 * Every style is a variation WITHIN the brand (derived from the live site:
 * index.css palette + home.tsx / Navbar / Footer motifs). They all keep
 * Playfair Display Black uppercase headlines (the one registered black serif
 * weight), Barlow Condensed wide-tracked uppercase labels, #DC143C as the only
 * chromatic accent, sharp ~2px corners, the crimson typographic period, and
 * the edition-band / left-bar rule grammar:
 *
 *  - "dark-editorial"    — flagship near-black newsroom-at-night. Large
 *     Playfair Black headline, twin crimson hairline edition-band, single
 *     crimson period accent. (The masthead double-rule signature.)
 *  - "warm-broadsheet"   — light parchment print edition. Black-ink Playfair
 *     Black headline on warm paper, hairline column rules, left crimson
 *     section bar, ghost-curve paper texture.
 *  - "crimson-manifesto" — full-bleed crimson agitprop poster. Oversized white
 *     Playfair Black headline, inverted black kicker block, white edition
 *     hairlines — for launch numbers and big reveals.
 *  - "luxe-pull-quote"   — restrained authoritative quote card. Large upright
 *     Playfair on near-black, single left crimson rule, Barlow Condensed
 *     attribution, heavy white space.
 *  - "terminal-ledger"   — Bloomberg-for-MENA data card. Ticker-black surface,
 *     Barlow Condensed uppercase labels, large tabular figure, functional
 *     crimson/green/blue triad, hairline strips.
 *
 * Rendering target is Satori → Resvg: flexbox only, linear-gradient
 * backgrounds, borderRadius, box-shadow, solid/transparent colors. No CSS
 * animation. The serif `displayFont` resolves to Playfair Display when its
 * TTF loaded (see og-fonts.ts); Satori falls back to the brand sans family
 * automatically if it did not. Only Playfair 600/700/900-normal, Barlow
 * Condensed 900, and Barlow 600/700 are registered — no italic, no
 * condensed-light, and no bundled mono (Menlo is best-effort / falls back).
 */

import type { BrandTokens } from "../../design-tokens-cache.js"
import { SERIF_DISPLAY_FAMILY } from "../../og-fonts.js"
import type { SizeKey } from "../sizes.js"

export type TemplateStyle =
  | "dark-editorial"
  | "warm-broadsheet"
  | "crimson-manifesto"
  | "luxe-pull-quote"
  | "terminal-ledger"

export const TEMPLATE_STYLES: TemplateStyle[] = [
  "dark-editorial",
  "warm-broadsheet",
  "crimson-manifesto",
  "luxe-pull-quote",
  "terminal-ledger",
]

/** Human-readable labels for the CMS style picker, keyed by style name. */
export const TEMPLATE_STYLE_LABELS: Record<TemplateStyle, string> = {
  "dark-editorial": "Dark Editorial",
  "warm-broadsheet": "Warm Broadsheet",
  "crimson-manifesto": "Crimson Manifesto",
  "luxe-pull-quote": "Luxe Pull-Quote",
  "terminal-ledger": "Terminal Ledger",
}

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

  if (style === "warm-broadsheet") {
    // Light parchment print edition — black-ink Playfair Black on warm paper,
    // hairline column rules, left crimson section bar, ghost-curve texture.
    return {
      bg: "#F5F0EB",
      fg: "#1A1A1A",
      accent: "#DC143C",
      muted: "#5C5C5C",
      border: "#D4CFC9",
      headingFont: serif,
      bodyFont: tokens.bodyFont,
      headingWeight: 900,
      padding,
      showWatermark: true,
      showRule: true,
      // Left crimson section bar (border-l-4 border-primary motif).
      ruleColor: "#DC143C",
      bgGradient: "linear-gradient(165deg, #FBF7EF 0%, #F5F0EB 46%, #EDE6DC 100%)",
      displayFont: serif,
      radius: "2px",
      panelRadius: "2px",
      shadow: "inset 0 0 0 1px rgba(0,0,0,0.04)",
      accentGradient: `linear-gradient(135deg, #DC143C 0%, #A60C28 100%)`,
      eyebrowColor: "#DC143C",
      panelBg: "transparent",
      vignette:
        "radial-gradient(140% 110% at 0% 0%, rgba(220,20,60,0.05) 0%, rgba(0,0,0,0) 50%)",
      ruleWeight: 4,
      ruleWidth: "4px",
      ruleGradient: false,
      numberStyle: "drop-cap",
      displayTracking: "-0.012em",
      panelPadding: isStory ? "76px 64px" : "60px 64px",
    }
  }

  if (style === "crimson-manifesto") {
    // Full-bleed crimson agitprop poster — oversized white Playfair Black,
    // inverted black kicker block, color-flipped white edition hairlines.
    return {
      bg: "#DC143C",
      fg: "#FFFFFF",
      accent: "#0A0A0A",
      muted: "rgba(255,255,255,0.80)",
      border: "rgba(255,255,255,0.32)",
      headingFont: serif,
      bodyFont: tokens.bodyFont,
      headingWeight: 900,
      padding,
      showWatermark: true,
      showRule: true,
      // Color-flipped edition band — white 2px hairline top AND bottom.
      ruleColor: "rgba(255,255,255,0.40)",
      bgGradient: "linear-gradient(150deg, #F11D45 0%, #DC143C 40%, #A60C28 100%)",
      displayFont: serif,
      radius: "2px",
      panelRadius: "2px",
      shadow: "none",
      // Inverted near-black kicker block (bg-foreground inversion motif).
      accentGradient: "linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%)",
      eyebrowColor: "#FFFFFF",
      panelBg: "transparent",
      vignette:
        "radial-gradient(110% 80% at 78% 6%, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 52%)",
      ruleWeight: 2,
      ruleWidth: "100%",
      ruleGradient: false,
      numberStyle: "bold",
      displayTracking: "-0.028em",
      panelPadding: isStory ? "74px 64px" : "58px 60px",
    }
  }

  if (style === "luxe-pull-quote") {
    // Restrained authoritative quote card — large upright Playfair on
    // near-black, single tall left crimson rule, Barlow Condensed attribution,
    // heavy white space. (Playfair italic is NOT registered; use upright 700.)
    return {
      bg: "#0A0A0A",
      fg: "#F0EDE9",
      accent: "#DC143C",
      muted: "#A1A1A1",
      border: "rgba(255,255,255,0.08)",
      headingFont: serif,
      bodyFont: tokens.bodyFont,
      headingWeight: 700,
      padding,
      showWatermark: true,
      showRule: true,
      // Single tall left crimson bar (blockquote border-l-4 border-primary).
      ruleColor: "#DC143C",
      bgGradient: "linear-gradient(180deg, #101010 0%, #0A0A0A 60%, #070707 100%)",
      displayFont: serif,
      radius: "2px",
      panelRadius: "2px",
      shadow: "none",
      eyebrowColor: "#DC143C",
      panelBg: "transparent",
      ruleWeight: 4,
      ruleWidth: "4px",
      ruleGradient: false,
      numberStyle: "subtle",
      displayTracking: "-0.005em",
      panelPadding: isStory ? "96px 80px" : "72px 80px",
    }
  }

  if (style === "terminal-ledger") {
    // Bloomberg-for-MENA data card — ticker-black surface, Barlow Condensed
    // uppercase labels, large tabular figure, functional triad, hairline
    // strips. This style DOES use a subtle panel (the card surface).
    return {
      bg: "#0D0D0D",
      fg: "#F0EDE9",
      // Crimson reserved for the negative / 'No' signal; green is the LIVE
      // eyebrow. (Functional triad: crimson #DC143C, green #10B981, blue
      // #3B82F6 — green carried via eyebrowColor, crimson via accent.)
      accent: "#DC143C",
      muted: "#A1A1A1",
      border: "rgba(255,255,255,0.06)",
      headingFont: tokens.headingFont,
      bodyFont: tokens.bodyFont,
      headingWeight: 900,
      padding,
      showWatermark: true,
      showRule: true,
      // Full-width top hairline strips (border-t border-border/60 grid motif).
      ruleColor: "rgba(255,255,255,0.06)",
      bgGradient: "linear-gradient(180deg, #121212 0%, #0D0D0D 55%, #080808 100%)",
      displayFont: serif,
      radius: "2px",
      panelRadius: "2px",
      shadow: "0 1px 0 rgba(255,255,255,0.04), 0 24px 60px rgba(0,0,0,0.5)",
      // Category chip = solid bg-foreground inversion (white chip, dark text).
      accentGradient: "linear-gradient(135deg, #F0EDE9 0%, #FFFFFF 100%)",
      eyebrowColor: "#10B981",
      panelBg: "#121212",
      ruleWeight: 1,
      ruleWidth: "100%",
      ruleGradient: false,
      numberStyle: "bold",
      // Labels are WIDE-tracked uppercase Barlow Condensed (positive tracking).
      displayTracking: "0.02em",
      panelPadding: isStory ? "64px 56px" : "48px 52px",
    }
  }

  // dark-editorial (default) — flagship near-black newsroom-at-night. Large
  // Playfair Black headline, twin crimson hairline edition-band, single
  // crimson period accent. (The masthead double-rule signature.)
  return {
    bg: "#0A0A0A",
    fg: "#F0EDE9",
    accent: "#DC143C",
    muted: "#A1A1A1",
    border: "rgba(255,255,255,0.10)",
    headingFont: serif,
    bodyFont: tokens.bodyFont,
    headingWeight: 900,
    padding,
    showWatermark: true,
    showRule: true,
    // The double crimson edition band (masthead signature).
    ruleColor: "#DC143C",
    bgGradient: "linear-gradient(168deg, #131313 0%, #0A0A0A 48%, #050505 100%)",
    displayFont: serif,
    radius: "2px",
    panelRadius: "2px",
    shadow: "0 1px 0 rgba(255,255,255,0.04)",
    accentGradient: `linear-gradient(90deg, #DC143C 0%, #8E0C24 100%)`,
    eyebrowColor: "#DC143C",
    panelBg: "transparent",
    vignette:
      "radial-gradient(120% 90% at 50% 8%, rgba(220,20,60,0.07) 0%, rgba(0,0,0,0) 55%)",
    ruleWeight: 2,
    ruleWidth: "100%",
    ruleGradient: false,
    numberStyle: "subtle",
    displayTracking: "-0.02em",
    panelPadding: isStory ? "72px 64px" : "56px 60px",
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

  // Footer wordmark — "THE TRIBUNAL" + a real crimson typographic period,
  // both in Playfair Display Black (registered at weight 900), uppercase, on a
  // single baseline-aligned flex row. Reproduces the Navbar / home masthead
  // signature. NOT a drawn circle. If Playfair failed to load, Satori degrades
  // to the brand sans automatically — no extra fallback needed.
  //
  // The period uses `spec.accent`: crimson #DC143C on every dark/light style,
  // and the inverted near-black #0A0A0A on crimson-manifesto (where the surface
  // is crimson and `spec.accent` is already #0A0A0A) so it stays visible.
  const wordmarkText = opts.footerRight ?? (spec.showWatermark ? "The Tribunal" : "")
  const wordmark = wordmarkText
    ? {
        type: "div",
        props: {
          style: {
            display: "flex",
            alignItems: "baseline",
            gap: "0px",
            fontFamily: SERIF_DISPLAY_FAMILY,
            fontWeight: 900,
            fontSize: `${scale.brand}px`,
            textTransform: "uppercase" as const,
            letterSpacing: "0.04em",
          },
          children: [
            {
              type: "div",
              props: {
                style: { color: spec.fg, fontWeight: 900 },
                children: wordmarkText,
              },
            },
            {
              type: "div",
              props: {
                style: { color: spec.accent, fontWeight: 900 },
                children: ".",
              },
            },
          ],
        },
      }
    : { type: "div", props: { children: "" } }

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
        wordmark,
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
