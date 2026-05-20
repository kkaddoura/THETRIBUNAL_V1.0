/**
 * Voice-quote template (v1 single-item / Studio "Single" layout).
 *
 * Renders a pull-quote treatment with optional grayscale portrait. The
 * portrait (if provided) sits as a strip above the quote card; the card
 * itself is rendered via the shared `frame()` helper so the background,
 * padding, accent rule, eyebrow, and footer all respond to the selected
 * `TemplateStyle`. The oversized opening quotation mark and the quote body
 * use `spec.displayFont` (Playfair Display when loaded) for the focal
 * editorial feel; attribution stays in the body sans.
 *
 * Style is the OPTIONAL last param (default "minimal-serif") so existing
 * callers in `routes/press-kit.ts` continue to work unchanged.
 */

import type { BrandTokens } from "../../design-tokens-cache.js"
import type { SizeKey } from "../sizes.js"
import { frame, sizeScale, styleFor, type TemplateStyle } from "./styles.js"

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

export function voiceQuote(
  data: VoiceData,
  tokens: BrandTokens,
  size: SizeKey,
  style: TemplateStyle = "minimal-serif",
): SatoriElement {
  const spec = styleFor(style, tokens, size)
  const scale = sizeScale(size)
  const isStory = size === "ig_story"
  const hasPortrait = !!data.imageUrl

  const quoteMark: SatoriElement = {
    type: "div",
    props: {
      style: {
        display: "flex",
        fontSize: `${isStory ? scale.hero : scale.h1}px`,
        fontFamily: spec.displayFont,
        color: spec.accent,
        lineHeight: 0.6,
        marginBottom: "16px",
      },
      children: "“",
    },
  }

  const quoteText: SatoriElement = {
    type: "div",
    props: {
      style: {
        display: "flex",
        fontSize: `${
          isStory
            ? scale.h1 * 0.7
            : hasPortrait
              ? scale.h2 * 0.85
              : scale.h2
        }px`,
        fontWeight: spec.headingWeight,
        fontFamily: spec.displayFont,
        color: spec.fg,
        lineHeight: 1.22,
        letterSpacing: spec.displayTracking,
      },
      children: data.quote,
    },
  }

  const attribution: SatoriElement = {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        marginTop: isStory ? "40px" : "28px",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              fontSize: `${scale.body}px`,
              fontWeight: 900,
              fontFamily: spec.bodyFont,
              color: spec.fg,
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
              fontSize: `${scale.caption}px`,
              fontWeight: 600,
              fontFamily: spec.bodyFont,
              color: spec.muted,
              letterSpacing: "1.5px",
              textTransform: "uppercase" as const,
              marginTop: "6px",
            },
            children: data.company ? `${data.role} · ${data.company}` : data.role,
          },
        },
      ],
    },
  }

  const quoteBody: SatoriElement = {
    type: "div",
    props: {
      style: {
        display: "flex",
        flex: 1,
        flexDirection: "column",
        justifyContent: "center",
      },
      children: [quoteMark, quoteText],
    },
  }

  const card = frame(spec, size, [quoteBody, attribution], {
    eyebrow: "VOICE",
  })

  if (!hasPortrait) return card

  // Portrait + framed quote card stacked.
  const portraitBlock: SatoriElement = {
    type: "div",
    props: {
      style: {
        display: "flex",
        width: "100%",
        height: isStory ? "44%" : "40%",
        backgroundColor: spec.bg,
        overflow: "hidden",
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

  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: spec.bg,
      },
      children: [
        portraitBlock,
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minHeight: 0,
            },
            children: card,
          },
        },
      ],
    },
  }
}
