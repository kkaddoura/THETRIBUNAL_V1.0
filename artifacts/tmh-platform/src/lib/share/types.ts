// ──────────────────────────────────────────────────────────────
//  Share system — discriminated union types
// ──────────────────────────────────────────────────────────────

export type SharePlatform =
  | "whatsapp"
  | "linkedin"
  | "x"
  | "instagram"
  | "copy"
  | "majlis"
  | "native"
  | "download"

export type ShareContentType = "debate" | "prediction" | "pulse"

export type CardFormat = "og" | "story"

// ── Base context shared by all content types ─────────────────

interface ShareContextBase {
  contentType: ShareContentType
  url: string
  title: string
  category?: string
  cta?: string
}

// ── Debate ───────────────────────────────────────────────────

export interface DebateShareContext extends ShareContextBase {
  contentType: "debate"
  pollId: number
  totalVotes: number
  votedOptionText?: string
  votedPct?: number
  options: Array<{ text: string; percentage: number }>
}

// ── Prediction ───────────────────────────────────────────────

export interface PredictionShareContext extends ShareContextBase {
  contentType: "prediction"
  predictionId: number
  totalVotes: number
  votedChoice?: string
  yesPercentage?: number
  noPercentage?: number
  options?: Array<{ text: string; percentage: number }>
  momentum?: number
  momentumDirection?: "up" | "down"
  resolvesAt?: string | null
}

// ── Pulse ────────────────────────────────────────────────────

export interface PulseShareContext extends ShareContextBase {
  contentType: "pulse"
  topicId: string
  stat: string
  delta: string
  deltaUp: boolean
  source?: string
}

// ── Discriminated union ──────────────────────────────────────

export type ShareContext =
  | DebateShareContext
  | PredictionShareContext
  | PulseShareContext

// ── Result ───────────────────────────────────────────────────

export interface ShareResult {
  platform: SharePlatform
  outcome:
    | "shared"
    | "downloaded"
    | "copied"
    | "opened"
    | "sent"
    | "cancelled"
    | "failed"
  error?: string
}
