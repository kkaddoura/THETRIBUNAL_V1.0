/**
 * Visual styles for Studio v2 templates.
 *
 * Each style is a fully distinct ART DIRECTION — its own palette, typeface,
 * composition, and signature motif — not a recolouring of one shared layout.
 * `styleFor()` supplies the tokens (fonts/colours) that flow into every
 * template's headline/body; `frame()` dispatches on `spec.layout` to one of
 * five bespoke layout builders that arrange the eyebrow / body / footer and
 * draw the style's scaffolding (frames, bands, brackets, hard-shadow cards…).
 *
 * The five directions:
 *  - "brutalist-index"  Newsprint dossier. Paper ground, heavy Archivo Black
 *      headline, Space Mono metadata, a thick black rule frame and an index
 *      number. Raw, Swiss-brutalist, "leaked document".
 *  - "acid-poster"      Rave flyer. Near-black ground, acid-lime oversized
 *      Anton headline bleeding the frame, a full-bleed lime footer band. Loud.
 *  - "atelier"          Fashion editorial. Warm ivory, deep-forest ink, antique
 *      gold hairlines, a high-contrast DM Serif Display (Didone) headline,
 *      centred and airy. Refined luxury.
 *  - "neo-pop"          Sticker pop. Off-white ground, a white card with a 3px
 *      black outline and a hard offset shadow, cobalt + sunshine accents,
 *      Archivo Black. Playful neo-brutalism.
 *  - "noir-terminal"    Trading terminal. Blue-black ground, neon-mint Space
 *      Mono, corner brackets, a status ticker and glowing hairlines. Cinematic
 *      data-room.
 *
 * Rendering target is Satori → Resvg: flexbox only, linear/radial-gradient
 * backgrounds, borderRadius, box-shadow (incl. hard offset + colour glow),
 * solid/transparent colours. No CSS grid, no filters, no animation, no
 * transforms. Display faces (Anton, Archivo Black, DM Serif Display, Space
 * Mono) are registered best-effort in og-fonts.ts; Satori falls back to the
 * brand sans automatically if a face fails to load.
 */

import type { BrandTokens } from "../../design-tokens-cache.js"
import {
  MONO_FAMILY,
  POSTER_FAMILY,
  GROTESK_BLACK_FAMILY,
  DIDONE_FAMILY,
} from "../../og-fonts.js"
import type { SizeKey } from "../sizes.js"

export type TemplateStyle =
  | "brutalist-index"
  | "acid-poster"
  | "atelier"
  | "neo-pop"
  | "noir-terminal"

export const TEMPLATE_STYLES: TemplateStyle[] = [
  "brutalist-index",
  "acid-poster",
  "atelier",
  "neo-pop",
  "noir-terminal",
]

/** Human-readable labels for the CMS style picker, keyed by style name. */
export const TEMPLATE_STYLE_LABELS: Record<TemplateStyle, string> = {
  "brutalist-index": "Brutalist Index",
  "acid-poster": "Acid Poster",
  atelier: "Atelier",
  "neo-pop": "Neo-Pop",
  "noir-terminal": "Noir Terminal",
}

/** Default style — generated first, before the user restyles. */
export const DEFAULT_TEMPLATE_STYLE: TemplateStyle = "brutalist-index"

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

  /** Display family for big headlines (varies per art direction). */
  displayFont: string
  /** Corner radius for accent chips / small inner blocks, e.g. "14px". */
  radius: string
  /** Corner radius for the large framed content panel, e.g. "28px". */
  panelRadius: string
  /** Drop / hard-offset / glow shadow for the content panel. */
  shadow: string
  /** Optional secondary gradient for accent blocks / chips. */
  accentGradient?: string
  /** Colour for the small uppercase tracked eyebrow label. */
  eyebrowColor: string
  /** Background of inner content panel ("transparent" = no panel). */
  panelBg: string
  /** Subtle overlay drawn over the bg for depth (optional). */
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
  const padding = isStory ? "104px 80px" : "72px"

  if (style === "acid-poster") {
    // Rave flyer — acid-lime oversized Anton on near-black, full-bleed footer
    // band. Padding 0 so the band and headline can bleed to the edges.
    return {
      layout: "acid-poster",
      bg: "#0B0B0B",
      fg: "#D7FF2E", // acid lime — the headline IS the poster
      accent: "#D7FF2E",
      muted: "#9B9B90",
      border: "rgba(215,255,46,0.30)",
      headingFont: POSTER_FAMILY,
      bodyFont: tokens.bodyFont,
      headingWeight: 400, // Anton is a single heavy weight
      padding: "0",
      showWatermark: true,
      showRule: false,
      ruleColor: "#D7FF2E",
      bgGradient: "linear-gradient(155deg, #141414 0%, #0B0B0B 55%, #050505 100%)",
      displayFont: POSTER_FAMILY,
      radius: "0px",
      panelRadius: "0px",
      shadow: "none",
      accentGradient: "linear-gradient(135deg, #E6FF3D 0%, #B6E000 100%)",
      eyebrowColor: "#0B0B0B",
      panelBg: "transparent",
      ruleWeight: 0,
      ruleWidth: "0px",
      ruleGradient: false,
      numberStyle: "bold",
      displayTracking: "0.005em",
      panelPadding: isStory ? "104px 80px 0" : "72px 72px 0",
    }
  }

  if (style === "atelier") {
    // Fashion editorial — Didone on ivory, antique-gold hairlines, centred.
    return {
      layout: "atelier",
      bg: "#F4EFE6",
      fg: "#16241D", // deep forest ink
      accent: "#9A7B33", // antique gold
      muted: "#73695A",
      border: "rgba(22,36,29,0.16)",
      headingFont: DIDONE_FAMILY,
      bodyFont: tokens.bodyFont,
      headingWeight: 400,
      padding: isStory ? "120px 96px" : "84px 88px",
      showWatermark: true,
      showRule: true,
      ruleColor: "#9A7B33",
      bgGradient: "linear-gradient(180deg, #F8F3EA 0%, #F4EFE6 50%, #ECE4D6 100%)",
      displayFont: DIDONE_FAMILY,
      radius: "2px",
      panelRadius: "2px",
      shadow: "none",
      accentGradient: "linear-gradient(135deg, #B8923D 0%, #8A6C28 100%)",
      eyebrowColor: "#9A7B33",
      panelBg: "transparent",
      ruleWeight: 1,
      ruleWidth: "64px",
      ruleGradient: false,
      numberStyle: "drop-cap",
      displayTracking: "0em",
      panelPadding: isStory ? "0" : "0",
    }
  }

  if (style === "neo-pop") {
    // Sticker pop — white card, 3px black outline, hard offset shadow, cobalt +
    // sunshine accents, chunky Archivo Black.
    return {
      layout: "neo-pop",
      bg: "#FFD23F", // sunshine ground
      fg: "#141414",
      accent: "#2D5BFF", // cobalt
      muted: "#5B5B53",
      border: "#141414",
      headingFont: GROTESK_BLACK_FAMILY,
      bodyFont: MONO_FAMILY,
      headingWeight: 400,
      padding: isStory ? "84px 64px" : "60px",
      showWatermark: true,
      showRule: false,
      ruleColor: "#141414",
      bgGradient: "linear-gradient(135deg, #FFD84F 0%, #FFC400 100%)",
      displayFont: GROTESK_BLACK_FAMILY,
      radius: "999px", // pill chips
      panelRadius: "22px",
      shadow: "14px 14px 0 #141414", // hard offset, no blur
      accentGradient: "linear-gradient(135deg, #3A66FF 0%, #1F46DB 100%)",
      eyebrowColor: "#FFFFFF",
      panelBg: "#FFFFFF",
      ruleWeight: 0,
      ruleWidth: "0px",
      ruleGradient: false,
      numberStyle: "bold",
      displayTracking: "-0.01em",
      panelPadding: isStory ? "64px 56px" : "52px 56px",
    }
  }

  if (style === "noir-terminal") {
    // Trading terminal — neon-mint Space Mono on blue-black, corner brackets,
    // status ticker, glowing hairlines.
    return {
      layout: "noir-terminal",
      bg: "#06090D",
      fg: "#D8E6E2",
      accent: "#2BF5C8", // neon mint
      muted: "#5E706C",
      border: "rgba(43,245,200,0.22)",
      headingFont: MONO_FAMILY,
      bodyFont: MONO_FAMILY,
      headingWeight: 700,
      padding,
      showWatermark: true,
      showRule: true,
      ruleColor: "rgba(43,245,200,0.22)",
      bgGradient: "linear-gradient(165deg, #0A1016 0%, #06090D 55%, #04060A 100%)",
      displayFont: MONO_FAMILY,
      radius: "4px",
      panelRadius: "6px",
      shadow: "0 0 28px rgba(43,245,200,0.18)",
      accentGradient: "linear-gradient(135deg, #2BF5C8 0%, #14C4A0 100%)",
      eyebrowColor: "#2BF5C8",
      panelBg: "rgba(43,245,200,0.04)",
      vignette:
        "radial-gradient(120% 90% at 50% 0%, rgba(43,245,200,0.08) 0%, rgba(6,9,13,0) 55%)",
      ruleWeight: 1,
      ruleWidth: "100%",
      ruleGradient: false,
      numberStyle: "bold",
      displayTracking: "0.01em",
      panelPadding: isStory ? "64px 56px" : "48px 52px",
    }
  }

  // brutalist-index (default) — newsprint dossier: heavy Archivo Black headline,
  // Space Mono metadata, thick black rule frame, index numeral.
  return {
    layout: "brutalist-index",
    bg: "#EDEAE3", // newsprint paper
    fg: "#0A0A0A",
    accent: "#E5240E", // signal red
    muted: "#6B6862",
    border: "#0A0A0A",
    headingFont: GROTESK_BLACK_FAMILY,
    bodyFont: MONO_FAMILY,
    headingWeight: 400,
    padding,
    showWatermark: true,
    showRule: true,
    ruleColor: "#0A0A0A",
    bgGradient: "linear-gradient(180deg, #F1EEE7 0%, #EDEAE3 60%, #E4E0D7 100%)",
    displayFont: GROTESK_BLACK_FAMILY,
    radius: "0px",
    panelRadius: "0px",
    shadow: "none",
    accentGradient: "linear-gradient(135deg, #F0340E 0%, #C41A06 100%)",
    eyebrowColor: "#0A0A0A",
    panelBg: "transparent",
    ruleWeight: 3,
    ruleWidth: "100%",
    ruleGradient: false,
    numberStyle: "bold",
    displayTracking: "-0.015em",
    panelPadding: isStory ? "48px" : "44px",
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

// ── Shared bits ─────────────────────────────────────────────────────────────

type FrameOpts = { eyebrow?: string; footerLeft?: string; footerRight?: string }

const div = (style: Record<string, unknown>, children?: any) => ({
  type: "div",
  props: children === undefined ? { style } : { style, children },
})

/** "THE TRIBUNAL" + a coloured typographic period on one baseline-aligned row. */
function wordmark(
  text: string,
  opts: {
    fontFamily: string
    fontWeight: number
    fontSize: number
    color: string
    accent: string
    letterSpacing: string
  },
): any {
  if (!text) return div({ display: "flex" })
  return div(
    {
      display: "flex",
      alignItems: "baseline",
      fontFamily: opts.fontFamily,
      fontWeight: opts.fontWeight,
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

/** Background layer: gradient (or solid) + optional overlay vignette. */
function backgroundLayers(spec: StyleSpec): any[] {
  return spec.vignette
    ? [
        div({
          display: "flex",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: spec.vignette,
        }),
      ]
    : []
}

// ── frame(): dispatch to the per-style layout builder ───────────────────────

/**
 * Wraps a template's body in the selected art direction. Signature is
 * unchanged from the original shared frame so all templates keep working; the
 * body element/array is positioned and scaffolded differently per style.
 */
export function frame(spec: StyleSpec, size: SizeKey, body: any, opts: FrameOpts = {}): any {
  switch (spec.layout) {
    case "acid-poster":
      return layoutAcidPoster(spec, size, body, opts)
    case "atelier":
      return layoutAtelier(spec, size, body, opts)
    case "neo-pop":
      return layoutNeoPop(spec, size, body, opts)
    case "noir-terminal":
      return layoutNoirTerminal(spec, size, body, opts)
    case "brutalist-index":
    default:
      return layoutBrutalist(spec, size, body, opts)
  }
}

const bodySlot = (body: any, extra: Record<string, unknown> = {}) =>
  div(
    { display: "flex", flexDirection: "column", flex: 1, minHeight: 0, ...extra },
    body,
  )

// ── Layout: brutalist-index ─────────────────────────────────────────────────
function layoutBrutalist(spec: StyleSpec, size: SizeKey, body: any, opts: FrameOpts): any {
  const scale = sizeScale(size)
  const isStory = size === "ig_story"
  const meta = {
    fontFamily: spec.bodyFont,
    fontSize: `${scale.brand}px`,
    fontWeight: 700,
    letterSpacing: "0.18em",
    textTransform: "uppercase" as const,
  }

  const header = div(
    {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      ...meta,
      color: spec.fg,
      paddingBottom: isStory ? "22px" : "16px",
      borderBottom: `${spec.ruleWeight}px solid ${spec.border}`,
    },
    [
      div({ display: "flex", color: spec.accent }, opts.eyebrow ?? "DISPATCH"),
      div({ display: "flex", color: spec.fg }, "Nº 01"),
    ],
  )

  const footer = div(
    {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: isStory ? "34px" : "26px",
      paddingTop: isStory ? "22px" : "16px",
      borderTop: `${spec.ruleWeight}px solid ${spec.border}`,
      ...meta,
      color: spec.muted,
    },
    [
      div({ display: "flex" }, opts.footerLeft ?? "themiddleeasthustle.com"),
      wordmark(wordmarkText(spec, opts), {
        fontFamily: spec.bodyFont,
        fontWeight: 700,
        fontSize: scale.brand,
        color: spec.fg,
        accent: spec.accent,
        letterSpacing: "0.16em",
      }),
    ],
  )

  const innerFrame = div(
    {
      display: "flex",
      flexDirection: "column",
      flex: 1,
      minHeight: 0,
      border: `3px solid ${spec.border}`,
      padding: spec.panelPadding,
    },
    [header, bodySlot(body, { justifyContent: "center", paddingTop: isStory ? "40px" : "30px", paddingBottom: isStory ? "40px" : "30px" }), footer],
  )

  return div(
    {
      display: "flex",
      flexDirection: "column",
      width: "100%",
      height: "100%",
      backgroundImage: spec.bgGradient,
      fontFamily: spec.displayFont,
      color: spec.fg,
      padding: spec.padding,
    },
    [innerFrame],
  )
}

// ── Layout: acid-poster ─────────────────────────────────────────────────────
function layoutAcidPoster(spec: StyleSpec, size: SizeKey, body: any, opts: FrameOpts): any {
  const scale = sizeScale(size)
  const isStory = size === "ig_story"

  const eyebrow = opts.eyebrow
    ? div(
        {
          display: "flex",
          alignSelf: "flex-start",
          backgroundImage: spec.accentGradient,
          color: spec.eyebrowColor,
          fontFamily: spec.bodyFont,
          fontWeight: 800,
          fontSize: `${scale.brand}px`,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          padding: isStory ? "12px 22px" : "9px 18px",
          marginBottom: isStory ? "40px" : "30px",
        },
        opts.eyebrow,
      )
    : null

  const content = div(
    {
      display: "flex",
      flexDirection: "column",
      flex: 1,
      minHeight: 0,
      padding: spec.panelPadding,
    },
    [eyebrow, bodySlot(body, { justifyContent: "center" })].filter(Boolean),
  )

  // Full-bleed acid footer band.
  const band = div(
    {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundImage: spec.accentGradient,
      padding: isStory ? "30px 80px" : "26px 72px",
      fontFamily: spec.bodyFont,
      fontSize: `${scale.brand}px`,
      fontWeight: 800,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color: "#0B0B0B",
    },
    [
      div({ display: "flex" }, opts.footerLeft ?? "themiddleeasthustle.com"),
      wordmark(wordmarkText(spec, opts), {
        fontFamily: POSTER_FAMILY,
        fontWeight: 400,
        fontSize: scale.brand * 1.15,
        color: "#0B0B0B",
        accent: "#0B0B0B",
        letterSpacing: "0.04em",
      }),
    ],
  )

  return div(
    {
      display: "flex",
      flexDirection: "column",
      width: "100%",
      height: "100%",
      backgroundImage: spec.bgGradient,
      fontFamily: spec.displayFont,
      color: spec.fg,
    },
    [content, band],
  )
}

// ── Layout: atelier ─────────────────────────────────────────────────────────
function layoutAtelier(spec: StyleSpec, size: SizeKey, body: any, opts: FrameOpts): any {
  const scale = sizeScale(size)
  const isStory = size === "ig_story"

  const hairline = div({
    display: "flex",
    width: spec.ruleWidth,
    height: `${spec.ruleWeight}px`,
    backgroundColor: spec.accent,
  })

  const eyebrow = opts.eyebrow
    ? div(
        {
          display: "flex",
          color: spec.eyebrowColor,
          fontFamily: spec.bodyFont,
          fontWeight: 700,
          fontSize: `${scale.brand}px`,
          letterSpacing: "0.42em",
          textTransform: "uppercase",
          marginTop: isStory ? "26px" : "20px",
        },
        opts.eyebrow,
      )
    : null

  const head = div(
    {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    },
    [hairline, eyebrow].filter(Boolean),
  )

  const footer = div(
    {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      marginTop: isStory ? "36px" : "28px",
    },
    [
      hairline,
      div({ display: "flex", marginTop: isStory ? "22px" : "16px" }, [
        wordmark(wordmarkText(spec, opts), {
          fontFamily: spec.displayFont,
          fontWeight: 400,
          fontSize: scale.brand * 1.3,
          color: spec.fg,
          accent: spec.accent,
          letterSpacing: "0.02em",
        }),
      ]),
      opts.footerLeft
        ? div(
            {
              display: "flex",
              color: spec.muted,
              fontFamily: spec.bodyFont,
              fontSize: `${scale.brand}px`,
              fontWeight: 600,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              marginTop: "10px",
            },
            opts.footerLeft,
          )
        : null,
    ].filter(Boolean),
  )

  return div(
    {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      width: "100%",
      height: "100%",
      backgroundImage: spec.bgGradient,
      fontFamily: spec.displayFont,
      color: spec.fg,
      padding: spec.padding,
    },
    [
      head,
      bodySlot(body, { alignItems: "center", justifyContent: "center", textAlign: "center" }),
      footer,
    ],
  )
}

// ── Layout: neo-pop ─────────────────────────────────────────────────────────
function layoutNeoPop(spec: StyleSpec, size: SizeKey, body: any, opts: FrameOpts): any {
  const scale = sizeScale(size)
  const isStory = size === "ig_story"

  const eyebrow = opts.eyebrow
    ? div(
        {
          display: "flex",
          alignSelf: "flex-start",
          backgroundImage: spec.accentGradient,
          color: spec.eyebrowColor,
          border: `2px solid ${spec.border}`,
          borderRadius: spec.radius,
          fontFamily: spec.bodyFont,
          fontWeight: 700,
          fontSize: `${scale.brand}px`,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          padding: isStory ? "10px 22px" : "8px 18px",
          marginBottom: isStory ? "34px" : "26px",
        },
        opts.eyebrow,
      )
    : null

  const footer = div(
    {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: isStory ? "34px" : "26px",
      fontFamily: spec.bodyFont,
      fontSize: `${scale.brand}px`,
      fontWeight: 700,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: spec.muted,
    },
    [
      div({ display: "flex" }, opts.footerLeft ?? "themiddleeasthustle.com"),
      div(
        {
          display: "flex",
          backgroundColor: spec.bg,
          padding: "4px 10px",
          borderRadius: "6px",
        },
        [
          wordmark(wordmarkText(spec, opts), {
            fontFamily: spec.displayFont,
            fontWeight: 400,
            fontSize: scale.brand,
            color: spec.fg,
            accent: spec.accent,
            letterSpacing: "-0.01em",
          }),
        ],
      ),
    ],
  )

  const card = div(
    {
      display: "flex",
      flexDirection: "column",
      flex: 1,
      minHeight: 0,
      backgroundColor: spec.panelBg,
      border: `3px solid ${spec.border}`,
      borderRadius: spec.panelRadius,
      boxShadow: spec.shadow,
      padding: spec.panelPadding,
    },
    [eyebrow, bodySlot(body, { justifyContent: "center" }), footer].filter(Boolean),
  )

  return div(
    {
      display: "flex",
      flexDirection: "column",
      width: "100%",
      height: "100%",
      backgroundImage: spec.bgGradient,
      fontFamily: spec.displayFont,
      color: spec.fg,
      padding: spec.padding,
    },
    [card],
  )
}

// ── Layout: noir-terminal ───────────────────────────────────────────────────
function layoutNoirTerminal(spec: StyleSpec, size: SizeKey, body: any, opts: FrameOpts): any {
  const scale = sizeScale(size)
  const isStory = size === "ig_story"
  const bracket = 40
  const glow = "0 0 16px rgba(43,245,200,0.55)"

  // Four neon corner brackets.
  const corner = (pos: Record<string, unknown>, borders: Record<string, unknown>) =>
    div({
      display: "flex",
      position: "absolute",
      width: `${bracket}px`,
      height: `${bracket}px`,
      boxShadow: glow,
      ...pos,
      ...borders,
    })
  const off = isStory ? 52 : 40
  const brackets = [
    corner(
      { top: off, left: off },
      { borderTop: `2px solid ${spec.accent}`, borderLeft: `2px solid ${spec.accent}` },
    ),
    corner(
      { top: off, right: off },
      { borderTop: `2px solid ${spec.accent}`, borderRight: `2px solid ${spec.accent}` },
    ),
    corner(
      { bottom: off, left: off },
      { borderBottom: `2px solid ${spec.accent}`, borderLeft: `2px solid ${spec.accent}` },
    ),
    corner(
      { bottom: off, right: off },
      { borderBottom: `2px solid ${spec.accent}`, borderRight: `2px solid ${spec.accent}` },
    ),
  ]

  const meta = {
    fontFamily: spec.bodyFont,
    fontSize: `${scale.brand}px`,
    fontWeight: 700,
    letterSpacing: "0.22em",
    textTransform: "uppercase" as const,
  }

  const ticker = div(
    {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      ...meta,
      paddingBottom: isStory ? "20px" : "15px",
      borderBottom: `1px solid ${spec.border}`,
      boxShadow: "0 1px 0 rgba(43,245,200,0.25)",
    },
    [
      // Drawn neon status dot (Space Mono has no ● glyph) + label.
      div({ display: "flex", alignItems: "center", color: spec.accent }, [
        div({
          display: "flex",
          width: `${Math.round(scale.brand * 0.5)}px`,
          height: `${Math.round(scale.brand * 0.5)}px`,
          borderRadius: "999px",
          backgroundColor: spec.accent,
          boxShadow: glow,
          marginRight: "10px",
        }),
        div({ display: "flex" }, opts.eyebrow ?? "LIVE"),
      ]),
      div({ display: "flex", color: spec.muted }, "THE TRIBUNAL // MENA"),
    ],
  )

  const footer = div(
    {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: isStory ? "30px" : "22px",
      paddingTop: isStory ? "20px" : "15px",
      borderTop: `1px solid ${spec.border}`,
      ...meta,
      color: spec.muted,
    },
    [
      div({ display: "flex" }, opts.footerLeft ?? "themiddleeasthustle.com"),
      wordmark(wordmarkText(spec, opts), {
        fontFamily: spec.bodyFont,
        fontWeight: 700,
        fontSize: scale.brand,
        color: spec.fg,
        accent: spec.accent,
        letterSpacing: "0.14em",
      }),
    ],
  )

  const inner = div(
    {
      display: "flex",
      flexDirection: "column",
      flex: 1,
      minHeight: 0,
      padding: spec.panelPadding,
    },
    [ticker, bodySlot(body, { justifyContent: "center", paddingTop: isStory ? "32px" : "24px", paddingBottom: isStory ? "32px" : "24px" }), footer],
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
    [...backgroundLayers(spec), ...brackets, inner],
  )
}
