/**
 * Satori element-tree templates for OG image cards.
 *
 * Satori requires React.createElement-compatible object trees, NOT JSX.
 * Each element is { type: string, props: { style, children } }.
 *
 * All containers use display: "flex" (Satori flexbox-only layout engine).
 *
 * Templates accept a `tokens` argument so that brand colors and font families
 * are sourced from the CMS `designTokensTable` (resolved via design-tokens-cache).
 */

import type { BrandTokens } from "./design-tokens-cache.js"

// --- Satori element type ---
interface SatoriElement {
  type: string
  props: {
    style?: Record<string, unknown>
    children?: SatoriElement | SatoriElement[] | string | (SatoriElement | string)[]
    [key: string]: unknown
  }
}

// ─── Shared layout helpers ──────────────────────────────────────────

function cardShell(tokens: BrandTokens, children: (SatoriElement | string)[]): SatoriElement {
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: tokens.bg,
        fontFamily: tokens.headingFont,
        position: "relative",
        overflow: "hidden",
      },
      children: [
        // Accent bar
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              width: "100%",
              height: "5px",
              backgroundColor: tokens.accent,
              flexShrink: 0,
            },
            children: [],
          },
        },
        // Content area
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              flex: 1,
              padding: "40px 60px 36px 60px",
              justifyContent: "space-between",
            },
            children,
          },
        },
      ],
    },
  }
}

function brandHeader(tokens: BrandTokens, category?: string): SatoriElement {
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        width: "100%",
      },
      children: [
        // Brand lockup
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column" },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    fontSize: "30px",
                    fontWeight: 900,
                    color: tokens.fg,
                    letterSpacing: "2px",
                    textTransform: "uppercase" as const,
                  },
                  children: [
                    { type: "span", props: { children: "THE TRIBUNAL" } },
                    { type: "span", props: { style: { color: tokens.accent }, children: "." } },
                  ],
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    fontSize: "12px",
                    fontWeight: 600,
                    fontFamily: tokens.bodyFont,
                    color: tokens.muted,
                    letterSpacing: "3px",
                    textTransform: "uppercase" as const,
                    marginTop: "4px",
                  },
                  children: "BY THE MIDDLE EAST HUSTLE",
                },
              },
            ],
          },
        },
        // Category badge (only if provided)
        ...(category
          ? [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    backgroundColor: tokens.accent,
                    color: tokens.fg,
                    fontSize: "13px",
                    fontWeight: 700,
                    fontFamily: tokens.bodyFont,
                    padding: "6px 16px",
                    borderRadius: "4px",
                    textTransform: "uppercase" as const,
                    letterSpacing: "1.5px",
                  },
                  children: category,
                },
              } as SatoriElement,
            ]
          : []),
      ],
    },
  }
}

function footer(tokens: BrandTokens, leftText: string, rightText: string = "TRIBUNAL.COM"): SatoriElement {
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        borderTop: `1px solid ${tokens.border}`,
        paddingTop: "20px",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              fontSize: "14px",
              fontWeight: 600,
              fontFamily: tokens.bodyFont,
              color: tokens.muted,
              letterSpacing: "1px",
              textTransform: "uppercase" as const,
            },
            children: leftText,
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              fontSize: "14px",
              fontWeight: 700,
              fontFamily: tokens.bodyFont,
              color: tokens.muted,
              letterSpacing: "2px",
              textTransform: "uppercase" as const,
            },
            children: rightText,
          },
        },
      ],
    },
  }
}

function questionText(tokens: BrandTokens, text: string, maxFontSize = 42): SatoriElement {
  // Adjust font size based on text length for readability
  const len = text.length
  let fontSize = maxFontSize
  if (len > 120) fontSize = 30
  else if (len > 80) fontSize = 34
  else if (len > 50) fontSize = 38

  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        fontSize: `${fontSize}px`,
        fontWeight: 900,
        color: tokens.fg,
        textTransform: "uppercase" as const,
        lineHeight: 1.15,
        letterSpacing: "0.5px",
        maxWidth: "100%",
      },
      children: text,
    },
  }
}

// ─── Result bar (used for debate + prediction options) ──────────────

function resultBar(tokens: BrandTokens, label: string, percentage: number, highlight = false): SatoriElement {
  const pct = Math.max(0, Math.min(100, Math.round(percentage)))
  const barColor = highlight ? tokens.accent : tokens.border

  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        width: "100%",
        marginBottom: "8px",
      },
      children: [
        // Label row
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "6px",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    fontSize: "16px",
                    fontWeight: 700,
                    fontFamily: tokens.bodyFont,
                    color: tokens.fg,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.5px",
                  },
                  children: label.length > 50 ? label.slice(0, 47) + "..." : label,
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    fontSize: "18px",
                    fontWeight: 900,
                    color: highlight ? tokens.accent : tokens.fg,
                    fontFamily: tokens.headingFont,
                  },
                  children: `${pct}%`,
                },
              },
            ],
          },
        },
        // Bar background
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              width: "100%",
              height: "8px",
              backgroundColor: "#1A1A1A",
              borderRadius: "4px",
              overflow: "hidden",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    width: `${pct}%`,
                    height: "100%",
                    backgroundColor: barColor,
                    borderRadius: "4px",
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
}

// ─── Public template functions ───────────────────────────────────────

export interface DebateCardData {
  question: string
  category?: string
  totalVotes: number
  options: { text: string; percentage: number }[]
}

export function debateCard(data: DebateCardData, tokens: BrandTokens): SatoriElement {
  const topOptions = data.options.slice(0, 4) // max 4 options
  const maxPct = Math.max(...topOptions.map((o) => o.percentage), 0)

  return cardShell(tokens, [
    brandHeader(tokens, data.category),

    // Question
    {
      type: "div",
      props: {
        style: { display: "flex", flexDirection: "column", marginTop: "20px" },
        children: [questionText(tokens, data.question)],
      },
    },

    // Result bars
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          marginTop: "auto",
          marginBottom: "16px",
          width: "100%",
        },
        children: topOptions.map((opt) => resultBar(tokens, opt.text, opt.percentage, opt.percentage === maxPct && maxPct > 0)),
      },
    },

    footer(tokens, data.totalVotes > 0 ? `${data.totalVotes.toLocaleString()} votes` : "Vote now"),
  ])
}

export interface PredictionCardData {
  question: string
  category?: string
  totalVotes: number
  yesPercentage?: number
  noPercentage?: number
  options?: { text: string; percentage: number }[]
}

export function predictionCard(data: PredictionCardData, tokens: BrandTokens): SatoriElement {
  // Build result bars: use options if available, otherwise fall back to yes/no
  let bars: SatoriElement[]
  if (data.options && data.options.length > 0) {
    const maxPct = Math.max(...data.options.map((o) => o.percentage), 0)
    bars = data.options
      .slice(0, 4)
      .map((opt) => resultBar(tokens, opt.text, opt.percentage, opt.percentage === maxPct && maxPct > 0))
  } else {
    const yesPct = data.yesPercentage ?? 50
    const noPct = data.noPercentage ?? 100 - yesPct
    bars = [
      resultBar(tokens, "Yes", yesPct, yesPct >= noPct),
      resultBar(tokens, "No", noPct, noPct > yesPct),
    ]
  }

  return cardShell(tokens, [
    brandHeader(tokens, data.category ?? "PREDICTION"),

    // Question
    {
      type: "div",
      props: {
        style: { display: "flex", flexDirection: "column", marginTop: "20px" },
        children: [questionText(tokens, data.question)],
      },
    },

    // Result bars
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          marginTop: "auto",
          marginBottom: "16px",
          width: "100%",
        },
        children: bars,
      },
    },

    footer(tokens, data.totalVotes > 0 ? `${data.totalVotes.toLocaleString()} predictions` : "Predict now"),
  ])
}

export interface PulseCardData {
  title: string
  category?: string
  stat: string
  delta: string
  deltaUp: boolean
  source?: string
}

export function pulseCard(data: PulseCardData, tokens: BrandTokens): SatoriElement {
  const deltaColor = data.deltaUp ? "#22C55E" : tokens.accent
  const deltaArrow = data.deltaUp ? "▲" : "▼"

  return cardShell(tokens, [
    brandHeader(tokens, data.category ?? "MENA PULSE"),

    // Title
    {
      type: "div",
      props: {
        style: { display: "flex", flexDirection: "column", marginTop: "24px" },
        children: [questionText(tokens, data.title, 38)],
      },
    },

    // Large stat display
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          alignItems: "baseline",
          marginTop: "auto",
          marginBottom: "16px",
        },
        children: [
          // Main stat
          ...(data.stat
            ? [
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      fontSize: "80px",
                      fontWeight: 900,
                      color: tokens.fg,
                      lineHeight: 1,
                      fontFamily: tokens.headingFont,
                    },
                    children: data.stat,
                  },
                } as SatoriElement,
              ]
            : []),
          // Delta
          ...(data.delta
            ? [
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      fontSize: "28px",
                      fontWeight: 700,
                      fontFamily: tokens.bodyFont,
                      color: deltaColor,
                      marginLeft: "20px",
                    },
                    children: `${deltaArrow} ${data.delta}`,
                  },
                } as SatoriElement,
              ]
            : []),
        ],
      },
    },

    footer(tokens, data.source ? `Source: ${data.source}` : "Live data"),
  ])
}
