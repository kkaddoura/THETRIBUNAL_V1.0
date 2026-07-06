/**
 * Visual styles for Studio v2 templates.
 *
 * Three on-brand art directions — all unmistakably The Tribunal (crimson
 * #DC143C accent, Playfair Display headlines, Barlow body, the edition-band /
 * crimson-period masthead grammar). They differ by SURFACE and by SPACING /
 * SIZING / rule treatment, not by typeface or colour world:
 *
 *  - "dark"    Flagship near-black editorial. Off-white Playfair headline
 *      bracketed by twin crimson edition hairlines. The default.
 *  - "light"   Parchment broadsheet. Black-ink Playfair on warm paper with a
 *      heavy crimson masthead bar — print-edition feel, more open rhythm.
 *  - "gilded"  Special / collector's edition. Near-black with antique-gold
 *      hairlines + gold eyebrow and the crimson period — for feature posts
 *      and big moments.
 *
 * `styleFor()` supplies tokens that flow into every template's headline/body;
 * `frame()` dispatches on `spec.layout` to a shared editorial layout tuned per
 * style. Composition is anchored (eyebrow pinned top under a rule, body filling
 * the centre at a generous type scale, footer pinned bottom above a rule) so
 * the frame reads full and intentional rather than floating in empty space.
 *
 * Rendering target is Satori → Resvg: flexbox only, linear/radial-gradient
 * backgrounds, borderRadius, box-shadow, solid/transparent colours. No CSS
 * grid, filters, animation, or transforms. `displayFont` resolves to Playfair
 * Display when its TTF loaded (og-fonts.ts); Satori falls back to the brand
 * sans automatically if it did not.
 */

import type { BrandTokens } from "../../design-tokens-cache.js"
import { SERIF_DISPLAY_FAMILY } from "../../og-fonts.js"
import type { SizeKey } from "../sizes.js"

export type TemplateStyle = "dark" | "light" | "gilded"

export const TEMPLATE_STYLES: TemplateStyle[] = ["dark", "light", "gilded"]

/** Human-readable labels for the CMS style picker, keyed by style name. */
export const TEMPLATE_STYLE_LABELS: Record<TemplateStyle, string> = {
  dark: "Editorial Dark",
  light: "Editorial Light",
  gilded: "Gilded Edition",
}

/** Default style — generated first, before the user restyles. */
export const DEFAULT_TEMPLATE_STYLE: TemplateStyle = "dark"

const CRIMSON = "#DC143C"
const GOLD = "#C9A227"

export interface StyleSpec {
  /** Which layout builder `frame()` dispatches to. */
  layout: TemplateStyle

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
  const serif = SERIF_DISPLAY_FAMILY

  if (style === "light") {
    // Parchment broadsheet — black-ink Playfair on warm paper, heavy crimson
    // masthead bar, more open print rhythm.
    return {
      layout: "light",
      bg: "#F6F1E8",
      fg: "#1A1A1A",
      accent: CRIMSON,
      muted: "#5C574E",
      border: "#D9D3C7",
      headingFont: serif,
      bodyFont: tokens.bodyFont,
      headingWeight: 900,
      padding: isStory ? "96px 76px" : "64px 64px",
      showWatermark: true,
      showRule: true,
      ruleColor: CRIMSON,
      bgGradient: "linear-gradient(170deg, #FBF7EF 0%, #F6F1E8 52%, #EEE7D9 100%)",
      displayFont: serif,
      radius: "2px",
      panelRadius: "0px",
      shadow: "none",
      accentGradient: "linear-gradient(135deg, #DC143C 0%, #A60C28 100%)",
      eyebrowColor: CRIMSON,
      panelBg: "transparent",
      vignette: "radial-gradient(130% 100% at 0% 0%, rgba(220,20,60,0.045) 0%, rgba(0,0,0,0) 48%)",
      ruleWeight: 7,
      ruleWidth: "100%",
      ruleGradient: false,
      numberStyle: "drop-cap",
      displayTracking: "-0.012em",
      panelPadding: "0px",
    }
  }

  if (style === "gilded") {
    // Special / collector's edition — near-black with antique-gold hairlines &
    // eyebrow, crimson period. Premium feature treatment, a touch more air.
    return {
      layout: "gilded",
      bg: "#0A0A0A",
      fg: "#F4EFE6",
      accent: CRIMSON, // templates keep crimson marks; frame rules go gold
      muted: "#9C948A",
      border: "rgba(201,162,39,0.30)",
      headingFont: serif,
      bodyFont: tokens.bodyFont,
      headingWeight: 900,
      padding: isStory ? "104px 80px" : "70px 68px",
      showWatermark: true,
      showRule: true,
      ruleColor: GOLD,
      bgGradient: "linear-gradient(165deg, #161310 0%, #0A0A0A 52%, #050505 100%)",
      displayFont: serif,
      radius: "2px",
      panelRadius: "0px",
      shadow: "none",
      accentGradient: "linear-gradient(135deg, #D8B24A 0%, #A8821E 100%)",
      eyebrowColor: GOLD,
      panelBg: "transparent",
      vignette: "radial-gradient(120% 95% at 50% 0%, rgba(201,162,39,0.10) 0%, rgba(0,0,0,0) 55%)",
      ruleWeight: 1,
      ruleWidth: "100%",
      ruleGradient: false,
      numberStyle: "bold",
      displayTracking: "-0.018em",
      panelPadding: "0px",
    }
  }

  // dark (default) — flagship near-black editorial, twin crimson edition band.
  return {
    layout: "dark",
    bg: "#0A0A0A",
    fg: "#F0EDE9",
    accent: CRIMSON,
    muted: "#A1A1A1",
    border: "rgba(255,255,255,0.12)",
    headingFont: serif,
    bodyFont: tokens.bodyFont,
    headingWeight: 900,
    padding: isStory ? "100px 78px" : "60px 62px",
    showWatermark: true,
    showRule: true,
    ruleColor: CRIMSON,
    bgGradient: "linear-gradient(168deg, #151515 0%, #0A0A0A 50%, #050505 100%)",
    displayFont: serif,
    radius: "2px",
    panelRadius: "0px",
    shadow: "none",
    accentGradient: "linear-gradient(90deg, #DC143C 0%, #8E0C24 100%)",
    eyebrowColor: CRIMSON,
    panelBg: "transparent",
    vignette: "radial-gradient(120% 90% at 50% 6%, rgba(220,20,60,0.08) 0%, rgba(0,0,0,0) 55%)",
    ruleWeight: 2,
    ruleWidth: "100%",
    ruleGradient: false,
    numberStyle: "subtle",
    displayTracking: "-0.02em",
    panelPadding: "0px",
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
  // Generous scale so headlines fill the frame (less empty space).
  if (size === "ig_story") {
    return { hero: 158, h1: 104, h2: 72, body: 38, caption: 23, brand: 18 }
  }
  if (size === "ig_square") {
    return { hero: 134, h1: 86, h2: 60, body: 32, caption: 21, brand: 16 }
  }
  if (size === "x_landscape") {
    return { hero: 106, h1: 68, h2: 47, body: 27, caption: 18, brand: 14 }
  }
  // linkedin
  return { hero: 96, h1: 64, h2: 46, body: 25, caption: 18, brand: 14 }
}

// ── Shared bits ─────────────────────────────────────────────────────────────

type FrameOpts = { eyebrow?: string; footerLeft?: string; footerRight?: string }

const div = (style: Record<string, unknown>, children?: any) => ({
  type: "div",
  props: children === undefined ? { style } : { style, children },
})

/** "THE TRIBUNAL" + a coloured typographic period on one baseline-aligned row. */
function wordmark(
  text: string,
  opts: { fontFamily: string; fontSize: number; color: string; accent: string; letterSpacing: string },
): any {
  if (!text) return div({ display: "flex" })
  return div(
    {
      display: "flex",
      alignItems: "baseline",
      fontFamily: opts.fontFamily,
      fontWeight: 900,
      fontSize: `${opts.fontSize}px`,
      textTransform: "uppercase",
      letterSpacing: opts.letterSpacing,
    },
    [
      div({ display: "flex", color: opts.color }, text),
      div({ display: "flex", color: opts.accent }, "."),
    ],
  )
}

function wordmarkText(spec: StyleSpec, opts: FrameOpts): string {
  return opts.footerRight ?? (spec.showWatermark ? "The Tribunal" : "")
}

const bodySlot = (body: any, extra: Record<string, unknown> = {}) =>
  div({ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, ...extra }, body)

/** A full-width rule, optionally doubled (two hairlines stacked). */
function ruleStack(weight: number, color: string, double: boolean, gap: number): any {
  const line = (h: number) => div({ display: "flex", width: "100%", height: `${h}px`, backgroundColor: color })
  if (!double) return line(weight)
  return div({ display: "flex", flexDirection: "column", width: "100%" }, [
    line(weight),
    div({ display: "flex", height: `${gap}px` }),
    line(weight),
  ])
}

interface FrameCfg {
  topRuleWeight: number
  topRuleDouble: boolean
  bottomRuleWeight: number
  /** Draw a small filled accent mark before the eyebrow (gilded). */
  eyebrowMark: boolean
  /** Vertical gap under the top rule before the eyebrow. */
  headGap: number
}

/**
 * Shared anchored editorial layout. Top rule + eyebrow pinned to the top, body
 * filling the centre, footer + rule pinned to the bottom. Colours/spacing come
 * from `spec`; per-style differences (rule weights, doubled rule, eyebrow mark)
 * come from `cfg`.
 */
function editorialFrame(spec: StyleSpec, size: SizeKey, body: any, opts: FrameOpts, cfg: FrameCfg): any {
  const scale = sizeScale(size)
  const isStory = size === "ig_story"
  const ruleColor = spec.ruleColor

  const eyebrow = opts.eyebrow
    ? div(
        {
          display: "flex",
          alignItems: "center",
          alignSelf: "flex-start",
          marginTop: `${cfg.headGap}px`,
          color: spec.eyebrowColor,
          fontFamily: spec.bodyFont,
          fontWeight: 700,
          fontSize: `${scale.brand}px`,
          letterSpacing: "0.32em",
          textTransform: "uppercase",
        },
        [
          cfg.eyebrowMark
            ? div({
                display: "flex",
                width: `${Math.round(scale.brand * 0.55)}px`,
                height: `${Math.round(scale.brand * 0.55)}px`,
                backgroundColor: spec.eyebrowColor,
                marginRight: "12px",
              })
            : null,
          div({ display: "flex" }, opts.eyebrow),
        ].filter(Boolean),
      )
    : null

  const head = div({ display: "flex", flexDirection: "column" }, [
    ruleStack(cfg.topRuleWeight, ruleColor, cfg.topRuleDouble, Math.max(3, Math.round(cfg.topRuleWeight))),
    eyebrow,
  ].filter(Boolean))

  const footer = div(
    {
      display: "flex",
      flexDirection: "column",
      marginTop: isStory ? "44px" : "32px",
    },
    [
      ruleStack(cfg.bottomRuleWeight, ruleColor, false, 0),
      div(
        {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: isStory ? "24px" : "18px",
          color: spec.muted,
          fontFamily: spec.bodyFont,
          fontSize: `${scale.brand}px`,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        },
        [
          div({ display: "flex" }, opts.footerLeft ?? "themiddleeasthustle.com"),
          wordmark(wordmarkText(spec, opts), {
            fontFamily: spec.displayFont,
            fontSize: scale.brand * 1.15,
            color: spec.fg,
            accent: spec.accent,
            letterSpacing: "0.02em",
          }),
        ],
      ),
    ],
  )

  return div(
    {
      display: "flex",
      flexDirection: "column",
      width: "100%",
      height: "100%",
      position: "relative",
      backgroundImage: spec.bgGradient,
      fontFamily: spec.displayFont,
      color: spec.fg,
      padding: spec.padding,
    },
    [
      ...(spec.vignette
        ? [div({ display: "flex", position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundImage: spec.vignette })]
        : []),
      div({ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }, [
        head,
        bodySlot(body, { justifyContent: "center", paddingTop: isStory ? "20px" : "14px", paddingBottom: isStory ? "20px" : "14px" }),
        footer,
      ]),
    ],
  )
}

// ── frame(): dispatch to the per-style layout ───────────────────────────────

/**
 * Wraps a template's body in the selected on-brand art direction. Signature is
 * unchanged from the original shared frame so all templates keep working.
 */
export function frame(spec: StyleSpec, size: SizeKey, body: any, opts: FrameOpts = {}): any {
  switch (spec.layout) {
    case "light":
      // Heavy crimson masthead bar, single thin bottom rule, open rhythm.
      return editorialFrame(spec, size, body, opts, {
        topRuleWeight: spec.ruleWeight,
        topRuleDouble: false,
        bottomRuleWeight: 1,
        eyebrowMark: false,
        headGap: size === "ig_story" ? 34 : 24,
      })
    case "gilded":
      // Twin gold hairlines top, gold eyebrow mark, single gold rule bottom.
      return editorialFrame(spec, size, body, opts, {
        topRuleWeight: spec.ruleWeight,
        topRuleDouble: true,
        bottomRuleWeight: 1,
        eyebrowMark: true,
        headGap: size === "ig_story" ? 30 : 22,
      })
    case "dark":
    default:
      // Twin crimson edition band (top + bottom 2px hairlines).
      return editorialFrame(spec, size, body, opts, {
        topRuleWeight: spec.ruleWeight,
        topRuleDouble: false,
        bottomRuleWeight: spec.ruleWeight,
        eyebrowMark: false,
        headGap: size === "ig_story" ? 28 : 20,
      })
  }
}
