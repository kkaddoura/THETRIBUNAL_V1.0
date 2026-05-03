/**
 * Satori element-tree templates for OG image cards.
 *
 * Satori requires React.createElement-compatible object trees, NOT JSX.
 * Each element is { type: string, props: { style, children } }.
 *
 * All containers use display: "flex" (Satori flexbox-only layout engine).
 */

// --- Brand constants ---
const BLACK = "#0A0A0A"
const WHITE = "#F2EDE4"
const RED = "#DC143C"
const MUTED = "#9A9690"
const BORDER = "#2A2A2A"

const HEADING_FONT = "Barlow Condensed"
const BODY_FONT = "Barlow"

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

function cardShell(children: (SatoriElement | string)[]): SatoriElement {
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: BLACK,
        fontFamily: HEADING_FONT,
        position: "relative",
        overflow: "hidden",
      },
      children: [
        // Red accent bar
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              width: "100%",
              height: "5px",
              backgroundColor: RED,
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

function brandHeader(category?: string): SatoriElement {
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
                    color: WHITE,
                    letterSpacing: "2px",
                    textTransform: "uppercase" as const,
                  },
                  children: [
                    { type: "span", props: { children: "THE TRIBUNAL" } },
                    { type: "span", props: { style: { color: RED }, children: "." } },
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
                    fontFamily: BODY_FONT,
                    color: MUTED,
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
                    backgroundColor: RED,
                    color: WHITE,
                    fontSize: "13px",
                    fontWeight: 700,
                    fontFamily: BODY_FONT,
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

function footer(leftText: string, rightText: string = "TRIBUNAL.COM"): SatoriElement {
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        borderTop: `1px solid ${BORDER}`,
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
              fontFamily: BODY_FONT,
              color: MUTED,
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
              fontFamily: BODY_FONT,
              color: MUTED,
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

function questionText(text: string, maxFontSize = 42): SatoriElement {
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
        color: WHITE,
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

function resultBar(label: string, percentage: number, highlight = false): SatoriElement {
  const pct = Math.max(0, Math.min(100, Math.round(percentage)))
  const barColor = highlight ? RED : BORDER

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
                    fontFamily: BODY_FONT,
                    color: WHITE,
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
                    color: highlight ? RED : WHITE,
                    fontFamily: HEADING_FONT,
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

export function debateCard(data: DebateCardData): SatoriElement {
  const topOptions = data.options.slice(0, 4) // max 4 options
  const maxPct = Math.max(...topOptions.map((o) => o.percentage), 0)

  return cardShell([
    brandHeader(data.category),

    // Question
    {
      type: "div",
      props: {
        style: { display: "flex", flexDirection: "column", marginTop: "20px" },
        children: [questionText(data.question)],
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
        children: topOptions.map((opt) => resultBar(opt.text, opt.percentage, opt.percentage === maxPct && maxPct > 0)),
      },
    },

    footer(
      data.totalVotes > 0 ? `${data.totalVotes.toLocaleString()} votes` : "Vote now",
    ),
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

export function predictionCard(data: PredictionCardData): SatoriElement {
  // Build result bars: use options if available, otherwise fall back to yes/no
  let bars: SatoriElement[]
  if (data.options && data.options.length > 0) {
    const maxPct = Math.max(...data.options.map((o) => o.percentage), 0)
    bars = data.options
      .slice(0, 4)
      .map((opt) => resultBar(opt.text, opt.percentage, opt.percentage === maxPct && maxPct > 0))
  } else {
    const yesPct = data.yesPercentage ?? 50
    const noPct = data.noPercentage ?? 100 - yesPct
    bars = [
      resultBar("Yes", yesPct, yesPct >= noPct),
      resultBar("No", noPct, noPct > yesPct),
    ]
  }

  return cardShell([
    brandHeader(data.category ?? "PREDICTION"),

    // Question
    {
      type: "div",
      props: {
        style: { display: "flex", flexDirection: "column", marginTop: "20px" },
        children: [questionText(data.question)],
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

    footer(
      data.totalVotes > 0 ? `${data.totalVotes.toLocaleString()} predictions` : "Predict now",
    ),
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

export function pulseCard(data: PulseCardData): SatoriElement {
  const deltaColor = data.deltaUp ? "#22C55E" : RED
  const deltaArrow = data.deltaUp ? "\u25B2" : "\u25BC"

  return cardShell([
    brandHeader(data.category ?? "MENA PULSE"),

    // Title
    {
      type: "div",
      props: {
        style: { display: "flex", flexDirection: "column", marginTop: "24px" },
        children: [questionText(data.title, 38)],
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
                      color: WHITE,
                      lineHeight: 1,
                      fontFamily: HEADING_FONT,
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
                      fontFamily: BODY_FONT,
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

    footer(
      data.source ? `Source: ${data.source}` : "Live data",
    ),
  ])
}
