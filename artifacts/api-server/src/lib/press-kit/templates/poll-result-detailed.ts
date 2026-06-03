/**
 * Poll-result-detailed template — the "Detailed" Studio poster, replicating the
 * newsletter "Split card": question + full ranked option breakdown (up to 4)
 * with proportional bars, an auto-generated hedged editorial takeaway, a vote
 * label (Early signal · N votes), and the "Vote privately…" line.
 *
 * Unlike `poll-result-split` (binary, two cards), this shows every option as a
 * labelled bar. It is theme-aware: all colours/fonts come from `styleFor()` via
 * the shared `frame()` shell, so dark / light / gilded all apply.
 *
 * Takeaway + label are derived from the poll's real numbers (no overclaiming),
 * mirroring the newsletter logic. Callers may override `takeaway`/`label`.
 */

import type { BrandTokens } from "../../design-tokens-cache.js"
import type { SizeKey } from "../sizes.js"
import { frame, sizeScale, styleFor, type TemplateStyle } from "./styles.js"

interface SatoriElement {
  type: string
  props: Record<string, unknown>
}

export interface DetailedPollData {
  question: string
  category?: string
  totalVotes: number
  options: { text: string; percentage: number }[]
  /** Optional overrides; auto-derived from the data when omitted. */
  takeaway?: string
  label?: string
}

/** Honest vote label by volume (mirrors the newsletter thresholds). */
function deriveLabel(totalVotes: number, options: { percentage: number }[]): string {
  const divided = !options.some((o) => o.percentage > 45)
  if (totalVotes < 50) return "Early signal"
  if (totalVotes <= 150) return divided ? "Current split" : "Live debate"
  return "Live debate"
}

/** Hedged, non-overclaiming editorial read derived from the leading options. */
function deriveTakeaway(options: { text: string; percentage: number }[]): string {
  const sorted = [...options].sort((a, b) => b.percentage - a.percentage)
  const [top, second] = sorted
  if (!top) return ""
  const divided = !options.some((o) => o.percentage > 45)
  if (divided && second) {
    return `Among current voters there's no clear majority — the leading answer, "${top.text}", sits at ${top.percentage}%, with "${second.text}" close behind at ${second.percentage}%. That gap is the signal.`
  }
  return `So far, the leading answer among current voters is "${top.text}" at ${top.percentage}% — but the field is split across ${options.length} options, so the picture is less settled than the headline suggests.`
}

export function pollResultDetailed(
  data: DetailedPollData,
  tokens: BrandTokens,
  size: SizeKey,
  style: TemplateStyle = "dark",
): SatoriElement {
  const spec = styleFor(style, tokens, size)
  const scale = sizeScale(size)
  const isStory = size === "ig_story"

  const options = [...data.options].sort((a, b) => b.percentage - a.percentage).slice(0, 4)
  const leadPct = options.length ? options[0].percentage : 0
  const label = data.label ?? deriveLabel(data.totalVotes, options)
  const takeaway = data.takeaway ?? deriveTakeaway(options)

  // Question — large editorial display headline.
  const question: SatoriElement = {
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
      },
      children: data.question,
    },
  }

  // Option rows — label + percentage, then a proportional track. Leader uses accent.
  const bars: SatoriElement = {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        width: "100%",
        gap: `${isStory ? 26 : 20}px`,
        marginTop: `${isStory ? 48 : 34}px`,
      },
      children: options.map((opt) => {
        const isLead = opt.percentage === leadPct && leadPct > 0
        const fill = isLead
          ? spec.accentGradient
            ? undefined
            : spec.accent
          : spec.muted
        const pct = Math.max(0, Math.min(100, Math.round(opt.percentage)))
        return {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column", width: "100%" },
            children: [
              {
                type: "div",
                props: {
                  style: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", width: "100%" },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          fontSize: `${scale.body}px`,
                          fontFamily: spec.bodyFont,
                          color: spec.fg,
                          maxWidth: "82%",
                          lineHeight: 1.2,
                        },
                        children: opt.text,
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          fontSize: `${scale.body}px`,
                          fontWeight: 800,
                          fontFamily: spec.bodyFont,
                          color: isLead ? spec.accent : spec.fg,
                        },
                        children: `${pct}%`,
                      },
                    },
                  ],
                },
              },
              // track
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    width: "100%",
                    height: `${isStory ? 12 : 9}px`,
                    marginTop: `${isStory ? 12 : 9}px`,
                    backgroundColor: spec.layout === "light" ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.10)",
                    borderRadius: "999px",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          width: `${pct}%`,
                          height: "100%",
                          borderRadius: "999px",
                          ...(isLead && spec.accentGradient
                            ? { backgroundImage: spec.accentGradient }
                            : { backgroundColor: fill }),
                        },
                        children: [],
                      },
                    },
                  ],
                },
              },
            ],
          },
        }
      }),
    },
  }

  // Editorial takeaway — italic, muted.
  const read: SatoriElement = {
    type: "div",
    props: {
      style: {
        display: "flex",
        marginTop: `${isStory ? 48 : 34}px`,
        fontSize: `${scale.body}px`,
        fontFamily: spec.bodyFont,
        fontStyle: "italic",
        color: spec.muted,
        lineHeight: 1.45,
      },
      children: takeaway,
    },
  }

  // "Vote privately…" closing line.
  const closer: SatoriElement = {
    type: "div",
    props: {
      style: {
        display: "flex",
        marginTop: `${isStory ? 28 : 20}px`,
        fontSize: `${scale.caption}px`,
        fontFamily: spec.bodyFont,
        letterSpacing: "0.04em",
        color: spec.fg,
      },
      children: "Vote privately. See the result publicly.",
    },
  }

  return frame(spec, size, [question, bars, read, closer], {
    eyebrow: data.category ?? "THE WEEK'S SIGNAL",
    footerLeft: `${label.toUpperCase()} · ${data.totalVotes.toLocaleString()} VOTES`,
  })
}
