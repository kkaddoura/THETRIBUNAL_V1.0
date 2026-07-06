/**
 * AI-generated captions per platform via the Anthropic Messages API.
 *
 * Studio v2: each call returns three variants per platform. Optional toneHint
 * shifts voice (punchy / analytical / warm). Optional `platforms` lets the
 * caller regenerate just one platform.
 */

const MODEL = "claude-sonnet-4-6"

interface AnthropicMessagesResponse {
  content?: Array<{ type?: string; text?: string }>
}

function stripJsonFences(s: string): string {
  const trimmed = s.trim()
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/)
  return fence ? fence[1].trim() : trimmed
}

async function chatCompletion(systemPrompt: string, userPrompt: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1400,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  })
  if (!res.ok) {
    console.warn("[press-kit/captions] LLM HTTP error:", res.status, await res.text().catch(() => ""))
    return null
  }
  const data = (await res.json()) as AnthropicMessagesResponse
  const text = data.content?.find((b) => b.type === "text")?.text
  return text ? stripJsonFences(text) : null
}

export type Platform = "x" | "ig" | "linkedin"
export type ToneHint = "punchy" | "analytical" | "warm" | null | undefined

export interface CaptionInput {
  contentType:
    | "poll"
    | "prediction"
    | "voice"
    | "pulse"
    | "about-founder"
    | "about-pillar"
    | "about-belief"
    | "about-region"
    | "manifesto"
    | "carousel-pillars"
    | "carousel-debate"
    | "carousel-pulse-trio"
    | "recap-weekly"
  contentId: number
  question?: string
  quote?: string
  stat?: string
  category?: string
  voicesName?: string
  winningOption?: string
  winningPercentage?: number
  founderText?: string
  founderAuthor?: string
  pillarTitle?: string
  pillarBody?: string
  beliefTitle?: string
  beliefBody?: string
  regionCount?: number
  manifestoTitle?: string
  manifestoSubtitle?: string
  recapItems?: Array<{ kind: string; title: string }>
}

export interface CaptionVariants {
  /** Single platform-agnostic caption set (Studio 2026-05-31). Primary source. */
  neutral?: string[]
  x: string[]
  ig: string[]
  linkedin: string[]
}

const TONE_LINES: Record<NonNullable<ToneHint>, string> = {
  punchy:
    "VOICE = PUNCHY. Short, declarative sentences (max ~8 words). Lead with the number or the verdict. No hedging, no qualifiers, no 'perhaps'. End lines on a hard stop. Confident, almost provocative.",
  analytical:
    "VOICE = ANALYTICAL. Calm and measured. Open by framing the question, then weigh both sides ('advocates… / skeptics…'). Always cite the supplied number and what it implies. Longer, complete sentences. No hype, no emoji.",
  warm:
    "VOICE = WARM. Human and conversational, first-person plural ('we asked, you answered'). Invite the reader in, acknowledge the shared stakes. Gentle, inclusive, a little reflective. No jargon.",
}

function systemPromptFor(tone: ToneHint, platforms: Platform[]): string {
  const platformShape = platforms
    .map((p) => {
      if (p === "x") return `"x": ["<v1>", "<v2>", "<v3>"]   (each one-line tweet under 240 chars, ends with 1-2 short hashtags)`
      if (p === "ig") return `"ig": ["<v1>", "<v2>", "<v3>"]  (each 2-3 lines, hook + insight + CTA, ends with 4-6 hashtags including #MENA)`
      return `"linkedin": ["<v1>", "<v2>", "<v3>"]  (each 2-3 short paragraphs, professional tone, ends with one question)`
    })
    .join(",\n  ")

  const toneLine = tone ? TONE_LINES[tone] : "Voice: sharp, regional, intelligent. No fluff, no clichés."

  return `You write social media captions for The Tribunal — a MENA-focused debate, prediction, and voices platform. ${toneLine}

For each platform, return JSON with exactly three distinct variants in this shape:
{
  ${platformShape}
}

The three variants should be meaningfully different (different angles or hooks), not paraphrases. Always preserve the data: never invent percentages or quotes that weren't supplied. Always include the canonical link with UTM at the end of the caption text — use {{LINK}} as a placeholder; the caller substitutes it.`
}

const ALL_PLATFORMS: Platform[] = ["x", "ig", "linkedin"]

export interface GenerateOptions {
  toneHint?: ToneHint
  platforms?: Platform[]
}

export async function generateCaptionVariants(
  input: CaptionInput,
  baseUrl: string,
  opts: GenerateOptions = {},
): Promise<CaptionVariants> {
  const platforms = opts.platforms?.length ? opts.platforms : ALL_PLATFORMS

  const utmBase = `?utm_source=press_kit&utm_medium=social&utm_content=${input.contentType}_${input.contentId}`
  const linkPath = pathFor(input.contentType, input.contentId)
  const link = `${baseUrl}${linkPath}${utmBase}`

  const systemPrompt = systemPromptFor(opts.toneHint, platforms)
  const userMsg = JSON.stringify(input, null, 2)

  let parsed: Partial<CaptionVariants> | null = null
  try {
    const raw = await chatCompletion(systemPrompt, userMsg)
    if (raw) {
      const obj = JSON.parse(raw) as Partial<CaptionVariants>
      parsed = obj
    }
  } catch (err) {
    console.warn("[press-kit/captions] AI generation failed, using fallback:", err)
  }

  const fallback = buildFallbackVariants(input, link)

  const result: CaptionVariants = {
    x: platforms.includes("x")
      ? sanitizeVariants(parsed?.x ?? fallback.x, link, 240)
      : fallback.x,
    ig: platforms.includes("ig")
      ? sanitizeVariants(parsed?.ig ?? fallback.ig, link, 2200)
      : fallback.ig,
    linkedin: platforms.includes("linkedin")
      ? sanitizeVariants(parsed?.linkedin ?? fallback.linkedin, link, 3000)
      : fallback.linkedin,
  }
  return result
}

// ── Neutral single-caption API (Studio 2026-05-31) ────────────────────────
// Studio dropped the per-platform tabs in favour of one platform-agnostic
// caption with three distinct variants. This always returns three non-empty,
// distinct variants — even with no API key — so the captions pane is never
// blank (the old per-platform fallback could repeat the same string 3×).

function neutralSystemPrompt(tone: ToneHint): string {
  const toneLine = tone ? TONE_LINES[tone] : "Voice: sharp, regional, intelligent. No fluff, no clichés."
  return `You write social media captions for The Tribunal — a MENA-focused debate, prediction, and voices platform. ${toneLine}

Return JSON with exactly three distinct caption variants that read well on ANY platform (Instagram, X, LinkedIn):
{
  "variants": ["<v1>", "<v2>", "<v3>"]
}

Each variant: a strong hook, 2-4 short lines, medium length (roughly 200-500 characters), ending with one or two relevant hashtags (always include #MENA). The three variants must take meaningfully different angles — not paraphrases. Never invent percentages or quotes that weren't supplied. End each variant with the canonical link — use {{LINK}} as a placeholder; the caller substitutes it.`
}

/** The core subject line for a piece of content, used to build tone-aware
 * fallback captions when the AI is unavailable. */
function subjectOf(input: CaptionInput): string {
  switch (input.contentType) {
    case "poll":
    case "prediction":
    case "carousel-debate":
      return input.question ?? "A new MENA debate"
    case "voice":
      return input.quote ? `"${input.quote}"${input.voicesName ? ` — ${input.voicesName}` : ""}` : (input.voicesName ?? "A new voice")
    case "pulse":
    case "carousel-pulse-trio":
      return input.stat ?? "The numbers shaping MENA"
    case "about-founder":
      return input.founderText ? `"${input.founderText}"${input.founderAuthor ? ` — ${input.founderAuthor}` : ""}` : "A note from the founder"
    case "about-pillar":
      return input.pillarTitle ?? "A pillar of The Tribunal"
    case "about-belief":
      return input.beliefTitle ?? "What we believe"
    case "about-region":
      return `${input.regionCount ?? 19} countries, one regional lens`
    case "manifesto":
      return input.manifestoTitle ?? "The region, on record"
    case "carousel-pillars":
      return "The four pillars of The Tribunal"
    case "recap-weekly":
      return "This week on The Tribunal"
    default:
      return "The region, on record"
  }
}

/** The supplied data point (e.g. the winning split), or "" when none. */
function dataOf(input: CaptionInput): string {
  if (input.winningPercentage != null && input.winningOption) {
    return `${Math.round(input.winningPercentage)}% chose ${input.winningOption}.`
  }
  if (input.stat) return input.stat
  return ""
}

/** Three fallback caption variants whose voice changes with the tone hint, so
 * regenerating with a different tone always yields different text even when the
 * AI is unavailable. Each variant ends with the {{LINK}} placeholder. */
function buildNeutralFallback(input: CaptionInput, tone: ToneHint): string[] {
  const s = subjectOf(input)
  const d = dataOf(input)
  const dataLine = d ? `${d} ` : ""

  const frames: Record<NonNullable<ToneHint> | "auto", (s: string) => string[]> = {
    punchy: () => [
      `${dataLine}${s}\nThe region voted. Now it's your turn.\n{{LINK}} #MENA`,
      `${s}\n${dataLine}No hedging. Where do you stand?\n{{LINK}} #MENA #Tribunal`,
      `${dataLine}${s}\nThe debate is live. Cast your vote.\n{{LINK}} #MENA`,
    ],
    analytical: () => [
      `${s}\n${dataLine}The Tribunal breaks down the split by country and sector.\nWhere do you land?\n{{LINK}} #MENA`,
      `${s}\nAdvocates and skeptics both have a case. ${dataLine}See the full picture.\n{{LINK}} #MENA #Tribunal`,
      `${dataLine}${s}\nThe data is in — the interpretation is up for debate.\n{{LINK}} #MENA`,
    ],
    warm: () => [
      `We asked, you answered. ${dataLine}${s}\nJoin the conversation — your view matters.\n{{LINK}} #MENA`,
      `${s}\n${dataLine}Whatever you believe, there's room for your voice here.\n{{LINK}} #MENA #Tribunal`,
      `${s}\nWe're working it out together. ${dataLine}Come weigh in.\n{{LINK}} #MENA`,
    ],
    auto: () => {
      const fb = buildFallbackVariants(input, "{{LINK}}")
      return [fb.x[0], fb.ig[0], fb.linkedin[0]]
    },
  }

  return (frames[tone ?? "auto"])(s)
}

export async function generateNeutralCaptions(
  input: CaptionInput,
  baseUrl: string,
  opts: { toneHint?: ToneHint } = {},
): Promise<string[]> {
  const utmBase = `?utm_source=press_kit&utm_medium=social&utm_content=${input.contentType}_${input.contentId}`
  const link = `${baseUrl}${pathFor(input.contentType, input.contentId)}${utmBase}`

  let parsed: string[] | null = null
  try {
    const raw = await chatCompletion(neutralSystemPrompt(opts.toneHint), JSON.stringify(input, null, 2))
    if (raw) {
      const obj = JSON.parse(raw) as { variants?: string[] }
      if (Array.isArray(obj.variants) && obj.variants.filter(Boolean).length) parsed = obj.variants
    }
  } catch (err) {
    console.warn("[press-kit/captions] neutral AI generation failed, using fallback:", err)
  }

  // Guarantee three distinct, non-empty variants regardless of AI availability.
  const fallback = buildNeutralFallback(input, opts.toneHint)
  const ai = parsed ?? []
  const base = [0, 1, 2].map((i) => ai[i] || fallback[i] || fallback[0])
  return sanitizeVariants(base, link, 600)
}

function pathFor(contentType: CaptionInput["contentType"], contentId: number): string {
  if (contentType === "poll") return `/debates/${contentId}`
  if (contentType === "prediction") return `/predictions/${contentId}`
  if (contentType === "voice") return `/voices/${contentId}`
  if (contentType === "pulse") return "/pulse"
  if (contentType.startsWith("about") || contentType === "manifesto") return "/about"
  if (contentType === "carousel-debate") return `/debates/${contentId}`
  if (contentType === "carousel-pulse-trio") return "/pulse"
  if (contentType === "carousel-pillars") return "/about"
  if (contentType === "recap-weekly") return "/"
  return "/"
}

function sanitizeVariants(variants: string[], link: string, maxBeforeLink: number): string[] {
  const out: string[] = []
  for (const v of variants.slice(0, 3)) {
    const withLink = substituteLink(v, link)
    out.push(trimWithLink(withLink, link, maxBeforeLink))
  }
  while (out.length < 3) out.push(out[0] ?? "")
  return out
}

function trimWithLink(text: string, link: string, maxBeforeLink: number): string {
  const idx = text.lastIndexOf(link)
  if (idx === -1) return text.length > maxBeforeLink + link.length + 4 ? text.slice(0, maxBeforeLink) + "…" : text
  const before = text.slice(0, idx).trimEnd()
  if (before.length <= maxBeforeLink) return text
  const trimmed = before.slice(0, maxBeforeLink - 1).trimEnd() + "…"
  return `${trimmed}\n\n${link}`
}

function substituteLink(s: string, link: string): string {
  if (s.includes("{{LINK}}")) return s.replace(/\{\{LINK\}\}/g, link)
  return `${s.trim()}\n\n${link}`
}

function buildFallbackVariants(input: CaptionInput, link: string): CaptionVariants {
  if (input.contentType === "poll") return fallbackPoll(input, link)
  if (input.contentType === "prediction") return fallbackPrediction(input, link)
  if (input.contentType === "voice") return fallbackVoice(input, link)
  if (input.contentType === "pulse") return fallbackPulse(input, link)
  if (input.contentType === "about-founder") return fallbackFounder(input, link)
  if (input.contentType === "about-pillar") return fallbackPillar(input, link)
  if (input.contentType === "about-belief") return fallbackBelief(input, link)
  if (input.contentType === "about-region") return fallbackRegion(input, link)
  if (input.contentType === "manifesto") return fallbackManifesto(input, link)
  if (input.contentType === "carousel-pillars") return fallbackPillarsCarousel(input, link)
  if (input.contentType === "carousel-debate") return fallbackDebateCarousel(input, link)
  if (input.contentType === "carousel-pulse-trio") return fallbackPulseTrio(input, link)
  return fallbackRecap(input, link)
}

function rep(s: string): string[] {
  return [s, s, s]
}

function fallbackPoll(input: CaptionInput, link: string): CaptionVariants {
  const q = input.question ?? "MENA debate"
  const stat = input.winningPercentage != null && input.winningOption
    ? ` ${Math.round(input.winningPercentage)}% chose ${input.winningOption}.`
    : ""
  return {
    x: rep(`${q}${stat} Vote on The Tribunal. ${link} #MENA #Debate`),
    ig: rep(`${q}${stat}\n\nWhere do you stand? Vote at the link in bio.\n\n#MENA #Debate #MiddleEast #Tribunal #Voices\n${link}`),
    linkedin: rep(`New on The Tribunal: ${q}${stat}\n\nThe full breakdown by country and sector is live.\n\nWhich way are you leaning?\n${link}`),
  }
}

function fallbackPrediction(input: CaptionInput, link: string): CaptionVariants {
  const q = input.question ?? "MENA prediction"
  return {
    x: rep(`${q} See where the region stands. ${link} #MENA #Prediction`),
    ig: rep(`${q}\n\nWhat do you think happens?\n\n#MENA #Prediction #MiddleEast #Tribunal\n${link}`),
    linkedin: rep(`Live prediction on The Tribunal: ${q}\n\nWhat's your call?\n${link}`),
  }
}

function fallbackVoice(input: CaptionInput, link: string): CaptionVariants {
  const quote = input.quote ?? ""
  const name = input.voicesName ?? "A new voice"
  return {
    x: rep(`"${quote}" — ${name}. New on The Tribunal. ${link}`),
    ig: rep(`"${quote}"\n— ${name}\n\nNew voice on The Tribunal.\n\n#MENA #Voices #MiddleEast\n${link}`),
    linkedin: rep(`New voice spotlighted on The Tribunal: ${name}.\n\n"${quote}"\n\nRead the full conversation at ${link}`),
  }
}

function fallbackPulse(input: CaptionInput, link: string): CaptionVariants {
  const stat = input.stat ?? ""
  return {
    x: rep(`${stat} via The Tribunal. ${link} #MENA #Pulse`),
    ig: rep(`${stat}\n\nMENA Pulse — the numbers shaping the region.\n\n#MENA #Pulse #MiddleEast\n${link}`),
    linkedin: rep(`MENA Pulse: ${stat}\n\nFull context on The Tribunal: ${link}`),
  }
}

function fallbackFounder(input: CaptionInput, link: string): CaptionVariants {
  const text = input.founderText ?? "What we stand for."
  const author = input.founderAuthor ?? "The Tribunal"
  const short = text.length > 180 ? text.slice(0, 177) + "…" : text
  return {
    x: rep(`"${short}" — ${author}. ${link}`),
    ig: rep(`"${short}"\n— ${author}\n\n#MENA #Tribunal #Founder\n${link}`),
    linkedin: rep(`A note from the founder of The Tribunal:\n\n"${text}"\n\n— ${author}\n${link}`),
  }
}

function fallbackPillar(input: CaptionInput, link: string): CaptionVariants {
  const t = input.pillarTitle ?? "A pillar of The Tribunal"
  const b = input.pillarBody ?? ""
  return {
    x: rep(`${t} — one of the four pillars of The Tribunal. ${link} #MENA`),
    ig: rep(`${t}.\n\n${b}\n\n#MENA #Tribunal #Pillars\n${link}`),
    linkedin: rep(`${t} — one of the four pillars that define The Tribunal.\n\n${b}\n\nRead the full charter: ${link}`),
  }
}

function fallbackBelief(input: CaptionInput, link: string): CaptionVariants {
  const t = input.beliefTitle ?? "What we believe"
  const b = input.beliefBody ?? ""
  return {
    x: rep(`${t}. ${link} #MENA #Tribunal`),
    ig: rep(`${t}.\n\n${b}\n\n#MENA #Tribunal #Beliefs\n${link}`),
    linkedin: rep(`We believe: ${t}.\n\n${b}\n\nMore on what shapes The Tribunal: ${link}`),
  }
}

function fallbackRegion(input: CaptionInput, link: string): CaptionVariants {
  const n = input.regionCount ?? 19
  return {
    x: rep(`${n} countries. One regional lens. The Tribunal. ${link}`),
    ig: rep(`${n} countries.\nOne regional lens.\n\n#Tribunal\n${link}`),
    linkedin: rep(`The Tribunal covers ${n} countries across the Middle East and North Africa.\n\n${link}`),
  }
}

function fallbackManifesto(input: CaptionInput, link: string): CaptionVariants {
  const t = input.manifestoTitle ?? "The region, on record"
  const s = input.manifestoSubtitle ?? "Private voting on what the region really thinks."
  return {
    x: rep(`${t}. ${s} ${link}`),
    ig: rep(`${t}\n\n${s}\n\n#Tribunal\n${link}`),
    linkedin: rep(`${t}.\n\n${s}\n\nLearn more: ${link}`),
  }
}

function fallbackPillarsCarousel(input: CaptionInput, link: string): CaptionVariants {
  return {
    x: rep(`The four pillars of The Tribunal. ${link} #MENA`),
    ig: rep(`The four pillars of The Tribunal — swipe to read each one.\n\n#MENA #Tribunal #Pillars\n${link}`),
    linkedin: rep(`The four pillars that define The Tribunal — a carousel summary.\n\nRead the full charter: ${link}`),
  }
}

function fallbackDebateCarousel(input: CaptionInput, link: string): CaptionVariants {
  const q = input.question ?? "MENA debate"
  return {
    x: rep(`${q} Swipe for the full breakdown. ${link} #MENA #Debate`),
    ig: rep(`${q}\n\nSwipe for the hook, the context, and the vote split. Then weigh in.\n\n#MENA #Debate #Tribunal\n${link}`),
    linkedin: rep(`A carousel breakdown on The Tribunal: ${q}\n\nSwipe through the hook, the context, and how the region is voting. Where do you land?\n${link}`),
  }
}

function fallbackPulseTrio(input: CaptionInput, link: string): CaptionVariants {
  return {
    x: rep(`Three numbers shaping MENA this week. ${link} #MENA #Pulse`),
    ig: rep(`Three numbers shaping MENA this week — swipe.\n\n#MENA #Pulse #Tribunal\n${link}`),
    linkedin: rep(`Three numbers shaping the region this week, from The Tribunal's MENA Pulse.\n\nWhich one surprised you?\n${link}`),
  }
}

function fallbackRecap(input: CaptionInput, link: string): CaptionVariants {
  const items = (input.recapItems ?? []).map((i) => `• ${i.title}`).join("\n")
  return {
    x: rep(`This week on The Tribunal. ${link} #MENA`),
    ig: rep(`This week on The Tribunal:\n\n${items}\n\n#MENA #Tribunal #ThisWeek\n${link}`),
    linkedin: rep(`This week on The Tribunal:\n\n${items}\n\nFull coverage: ${link}`),
  }
}

// ── Backwards-compat single-caption API used by the legacy press-kit route ─

export interface CaptionSet {
  x: string
  ig: string
  linkedin: string
}

export async function generateCaptions(input: CaptionInput, baseUrl: string): Promise<CaptionSet> {
  const variants = await generateCaptionVariants(input, baseUrl)
  return {
    x: variants.x[0] ?? "",
    ig: variants.ig[0] ?? "",
    linkedin: variants.linkedin[0] ?? "",
  }
}
