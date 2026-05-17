/**
 * Weekly newsletter digest pipeline.
 *
 * Per the plan:
 * - Pull top 3 polls by votes in the past 7 days
 * - Predictions resolving in the next 7 days (top 2 by total votes)
 * - One featured voice (highest viewCount in the period)
 * - AI generates intro paragraph + per-item summary
 * - Build a Beehiiv-ready HTML body
 * - Push as a draft post to Beehiiv (status: "draft")
 *
 * Founder reviews + clicks send in Beehiiv.
 */

import {
  db,
  pollsTable,
  pollOptionsTable,
  votesTable,
  predictionsTable,
  profilesTable,
  newsletterDigestsTable,
} from "@workspace/db"
import { eq, gte, desc, sql } from "drizzle-orm"

const APP_URL = process.env.APP_URL ?? "https://themiddleeasthustle.com"
const APP_HOST = APP_URL.replace(/^https?:\/\//, "").replace(/\/+$/, "")

export interface DigestContent {
  weekStarting: string // YYYY-MM-DD
  topPolls: Array<{
    id: number
    question: string
    category: string
    totalVotes: number
    options: Array<{ text: string; percentage: number; voteCount: number }>
  }>
  resolvingPredictions: Array<{
    id: number
    question: string
    yesPercentage: number
    daysToResolve: number
  }>
  featuredVoice: {
    id: number
    name: string
    role: string | null
    company: string | null
    quote: string | null
    headline: string
    imageUrl: string | null
  } | null
  introText: string
  subjectLine: string
  perItemSummaries: Record<number, string> // pollId → summary
}

export async function selectTopContent(now: Date = new Date()): Promise<DigestContent> {
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const sevenDaysHence = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  // Top 3 polls by vote count in the past week
  const pollVoteCounts = await db
    .select({
      pollId: votesTable.pollId,
      voteCount: sql<number>`count(*)::int`,
    })
    .from(votesTable)
    .where(gte(votesTable.createdAt, sevenDaysAgo))
    .groupBy(votesTable.pollId)
    .orderBy(desc(sql`count(*)`))
    .limit(3)

  const topPolls: DigestContent["topPolls"] = []
  for (const row of pollVoteCounts) {
    const [poll] = await db.select().from(pollsTable).where(eq(pollsTable.id, row.pollId))
    if (!poll) continue
    const options = await db
      .select()
      .from(pollOptionsTable)
      .where(eq(pollOptionsTable.pollId, poll.id))

    const total = options.reduce(
      (s: number, o: typeof pollOptionsTable.$inferSelect) =>
        s + (o.voteCount ?? 0) + (o.dummyVoteCount ?? 0),
      0,
    )
    topPolls.push({
      id: poll.id,
      question: poll.question,
      category: poll.category,
      totalVotes: total,
      options: options.map((o: typeof pollOptionsTable.$inferSelect) => {
        const c = (o.voteCount ?? 0) + (o.dummyVoteCount ?? 0)
        return {
          text: o.text,
          voteCount: c,
          percentage: total > 0 ? Math.round((c / total) * 100) : 0,
        }
      }),
    })
  }

  // Predictions resolving in the next 7 days (top 2 by totalCount).
  // resolvesAt is stored as text — we filter / sort in JS to keep types simple.
  const allPredictions = await db
    .select()
    .from(predictionsTable)
    .orderBy(desc(predictionsTable.totalCount))

  const resolvingPredictions: DigestContent["resolvingPredictions"] = allPredictions
    .map((p: typeof predictionsTable.$inferSelect) => {
      if (!p.resolvesAt) return null
      const resolveDate = new Date(p.resolvesAt)
      if (Number.isNaN(resolveDate.getTime())) return null
      if (resolveDate < now || resolveDate > sevenDaysHence) return null
      return {
        id: p.id,
        question: p.question,
        yesPercentage: p.yesPercentage,
        daysToResolve: Math.max(
          0,
          Math.round((resolveDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        ),
      }
    })
    .filter((p): p is DigestContent["resolvingPredictions"][number] => p !== null)
    .slice(0, 2)

  // Featured voice — highest viewCount
  const [featuredVoiceRow] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.editorialStatus, "approved"))
    .orderBy(desc(profilesTable.viewCount))
    .limit(1)

  const featuredVoice = featuredVoiceRow
    ? {
        id: featuredVoiceRow.id,
        name: featuredVoiceRow.name,
        role: featuredVoiceRow.role,
        company: featuredVoiceRow.company,
        quote: featuredVoiceRow.quote,
        headline: featuredVoiceRow.headline,
        imageUrl: featuredVoiceRow.imageUrl,
      }
    : null

  // AI intro + summaries
  const { introText, perItemSummaries, subjectLine } = await generateAiContent({
    topPolls,
    resolvingPredictions,
    featuredVoice,
  })

  return {
    weekStarting: weekStartingFor(now),
    topPolls,
    resolvingPredictions,
    featuredVoice,
    introText,
    subjectLine,
    perItemSummaries,
  }
}

interface AiPayload {
  topPolls: DigestContent["topPolls"]
  resolvingPredictions: DigestContent["resolvingPredictions"]
  featuredVoice: DigestContent["featuredVoice"]
}

interface AiResponse {
  introText: string
  perItemSummaries: Record<number, string>
  subjectLine: string
}

async function generateAiContent(payload: AiPayload): Promise<AiResponse> {
  const fallback: AiResponse = {
    subjectLine: "This week on The Tribunal",
    introText: payload.topPolls.length
      ? `Here's what the region debated this week — ${payload.topPolls.length} debates worth your attention, predictions resolving soon, and a voice you should know.`
      : "A quieter week — but the conversation continues. Here's what's brewing on The Tribunal.",
    perItemSummaries: Object.fromEntries(
      payload.topPolls.map((p) => {
        const winner = p.options.reduce(
          (best, o) => (o.percentage > (best?.percentage ?? 0) ? o : best),
          undefined as DigestContent["topPolls"][number]["options"][number] | undefined,
        )
        return [
          p.id,
          winner
            ? `${winner.percentage}% of voters chose ${winner.text}.`
            : "A close one — see the full breakdown on The Tribunal.",
        ]
      }),
    ),
  }

  const baseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY
  if (!baseUrl || !apiKey) return fallback

  const systemPrompt = `You are the editor of The Tribunal — a MENA-focused debate, prediction, and voices platform. Voice: sharp, regional, intelligent, no fluff.

Return JSON exactly:
{
  "subjectLine": "<email subject under 60 chars, no emoji>",
  "introText": "<2-3 short sentence intro that hooks the reader, references the data lightly>",
  "perItemSummaries": { "<pollId>": "<one-sentence editorial spin on this poll's result>", ... }
}

Don't invent percentages — use the numbers I give you.`

  const userMsg = JSON.stringify(payload, null, 2)

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
        max_tokens: 800,
      }),
    })
    if (!res.ok) throw new Error(`status_${res.status}`)
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const raw = data.choices?.[0]?.message?.content
    if (!raw) throw new Error("empty_response")
    const parsed = JSON.parse(raw) as Partial<AiResponse>
    return {
      subjectLine: parsed.subjectLine || fallback.subjectLine,
      introText: parsed.introText || fallback.introText,
      perItemSummaries: { ...fallback.perItemSummaries, ...(parsed.perItemSummaries ?? {}) },
    }
  } catch (err) {
    console.warn("[newsletter-digest] AI generation failed:", err)
    return fallback
  }
}

export function buildDigestHtml(content: DigestContent): string {
  const utm = "?utm_source=newsletter&utm_medium=email&utm_campaign=weekly_digest"

  const pollSection = content.topPolls
    .map((p) => {
      const winner = p.options.reduce(
        (best, o) => (o.percentage > (best?.percentage ?? 0) ? o : best),
        undefined as DigestContent["topPolls"][number]["options"][number] | undefined,
      )
      const summary = content.perItemSummaries[p.id] ?? ""
      return `
        <tr><td style="padding: 24px 0; border-bottom: 1px solid #2A2A2A;">
          <p style="margin: 0; color: #9A9690; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 700;">${escapeHtml(p.category)}</p>
          <h3 style="margin: 8px 0; color: #F2EDE4; font-size: 22px; line-height: 1.25; text-transform: uppercase;">${escapeHtml(p.question)}</h3>
          <p style="margin: 8px 0 12px; color: #C3BDB1; font-size: 15px; line-height: 1.5;">${escapeHtml(summary)}</p>
          ${winner ? `<p style="margin: 0; color: #DC143C; font-size: 16px; font-weight: 700;">${winner.percentage}% chose ${escapeHtml(winner.text)}</p>` : ""}
          <p style="margin: 14px 0 0;"><a href="${APP_URL}/debates/${p.id}${utm}" style="color: #F2EDE4; text-decoration: none; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; font-weight: 700; border-bottom: 2px solid #DC143C;">See breakdown</a></p>
        </td></tr>
      `
    })
    .join("")

  const predictionSection = content.resolvingPredictions.length
    ? `<tr><td style="padding: 32px 0 16px;"><h2 style="margin: 0; color: #F2EDE4; font-size: 16px; text-transform: uppercase; letter-spacing: 3px;">Resolving this week<span style="color: #DC143C;">.</span></h2></td></tr>` +
      content.resolvingPredictions
        .map(
          (p) => `
        <tr><td style="padding: 16px 0; border-bottom: 1px solid #2A2A2A;">
          <h3 style="margin: 0; color: #F2EDE4; font-size: 18px; line-height: 1.3;">${escapeHtml(p.question)}</h3>
          <p style="margin: 8px 0 0; color: #9A9690; font-size: 13px;">${p.yesPercentage}% say YES · resolves in ${p.daysToResolve} day${p.daysToResolve === 1 ? "" : "s"}</p>
          <p style="margin: 12px 0 0;"><a href="${APP_URL}/predictions/${p.id}${utm}" style="color: #F2EDE4; text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 700; border-bottom: 1px solid #DC143C;">Make your call</a></p>
        </td></tr>
      `,
        )
        .join("")
    : ""

  const voiceSection = content.featuredVoice
    ? `
      <tr><td style="padding: 32px 0 16px;"><h2 style="margin: 0; color: #F2EDE4; font-size: 16px; text-transform: uppercase; letter-spacing: 3px;">Voice of the week<span style="color: #DC143C;">.</span></h2></td></tr>
      <tr><td style="padding: 16px 0;">
        <h3 style="margin: 0; color: #F2EDE4; font-size: 22px; text-transform: uppercase;">${escapeHtml(content.featuredVoice.name)}</h3>
        <p style="margin: 4px 0 12px; color: #9A9690; font-size: 13px;">${escapeHtml([content.featuredVoice.role, content.featuredVoice.company].filter(Boolean).join(" · "))}</p>
        <blockquote style="margin: 0; padding: 0 0 0 16px; border-left: 3px solid #DC143C; color: #F2EDE4; font-size: 17px; line-height: 1.5; font-style: italic;">${escapeHtml(content.featuredVoice.quote ?? content.featuredVoice.headline)}</blockquote>
        <p style="margin: 14px 0 0;"><a href="${APP_URL}/voices/${content.featuredVoice.id}${utm}" style="color: #F2EDE4; text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 700; border-bottom: 1px solid #DC143C;">Read the full conversation</a></p>
      </td></tr>
    `
    : ""

  return `<!DOCTYPE html>
<html><body style="margin: 0; padding: 0; background: #0A0A0A; font-family: 'Helvetica Neue', Arial, sans-serif; color: #F2EDE4;">
<table width="100%" cellpadding="0" cellspacing="0" style="background: #0A0A0A;"><tr><td>
<table width="100%" style="max-width: 600px; margin: 0 auto;" cellpadding="0" cellspacing="0">
  <tr><td style="padding: 40px 24px 16px;">
    <p style="margin: 0; color: #DC143C; font-size: 12px; text-transform: uppercase; letter-spacing: 4px; font-weight: 700;">The Tribunal · Weekly</p>
    <h1 style="margin: 12px 0 4px; color: #F2EDE4; font-size: 32px; line-height: 1.1; text-transform: uppercase; letter-spacing: 1px;">This week<span style="color: #DC143C;">.</span></h1>
    <p style="margin: 24px 0 0; color: #C3BDB1; font-size: 16px; line-height: 1.5;">${escapeHtml(content.introText)}</p>
  </td></tr>
  <tr><td style="padding: 24px;">
    <h2 style="margin: 0 0 8px; color: #F2EDE4; font-size: 16px; text-transform: uppercase; letter-spacing: 3px;">Top debates<span style="color: #DC143C;">.</span></h2>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${pollSection}
      ${predictionSection}
      ${voiceSection}
    </table>
  </td></tr>
  <tr><td style="padding: 32px 24px; text-align: center; border-top: 1px solid #2A2A2A;">
    <p style="margin: 0; color: #9A9690; font-size: 11px; text-transform: uppercase; letter-spacing: 2px;">${escapeHtml(APP_HOST)} · by The Middle East Hustle</p>
    <p style="margin: 12px 0 0; color: #6A655F; font-size: 11px;">You're receiving this because you signed up for our weekly digest. <a href="{{unsubscribe_link}}" style="color: #6A655F;">Unsubscribe</a></p>
  </td></tr>
</table></td></tr></table></body></html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function weekStartingFor(d: Date): string {
  // Friday-anchored weeks: the digest is for the past week ending Friday.
  const day = d.getUTCDay() // 0 = Sun … 5 = Fri … 6 = Sat
  const offset = (day + 7 - 5) % 7 // days since Friday
  const friday = new Date(d.getTime() - offset * 24 * 60 * 60 * 1000)
  return friday.toISOString().slice(0, 10)
}

export interface BeehiivPushResult {
  ok: boolean
  postId?: string
  error?: string
}

export async function pushToBeehiiv(content: DigestContent): Promise<BeehiivPushResult> {
  const apiKey = process.env.BEEHIIV_API_KEY
  const pubId = process.env.BEEHIIV_PUBLICATION_ID
  if (!apiKey || !pubId) {
    return { ok: false, error: "beehiiv_not_configured" }
  }

  const html = buildDigestHtml(content)

  const res = await fetch(`https://api.beehiiv.com/v2/publications/${pubId}/posts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: content.subjectLine,
      subtitle: "Top debates, predictions resolving, and the voice of the week.",
      status: "draft",
      content_html: html,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    console.error("[newsletter-digest] Beehiiv push failed:", res.status, text)
    return { ok: false, error: `beehiiv_${res.status}` }
  }
  const data = (await res.json()) as { data?: { id?: string } }
  return { ok: true, postId: data.data?.id }
}

export async function generateAndPushDigest(now: Date = new Date()): Promise<{
  digestId: number
  beehiivPostId: string | null
  weekStarting: string
}> {
  const content = await selectTopContent(now)

  // Idempotency: skip if a digest already exists for this week
  const existing = await db
    .select()
    .from(newsletterDigestsTable)
    .where(eq(newsletterDigestsTable.weekStarting, content.weekStarting))
  if (existing.length > 0 && existing[0].status !== "failed") {
    console.log(`[newsletter-digest] Already pushed for ${content.weekStarting} — skipping`)
    return {
      digestId: existing[0].id,
      beehiivPostId: existing[0].beehiivPostId,
      weekStarting: content.weekStarting,
    }
  }

  const html = buildDigestHtml(content)
  const push = await pushToBeehiiv(content)

  const [row] = await db
    .insert(newsletterDigestsTable)
    .values({
      weekStarting: content.weekStarting,
      selectedPollIds: content.topPolls.map((p) => p.id),
      selectedPredictionIds: content.resolvingPredictions.map((p) => p.id),
      featuredVoiceId: content.featuredVoice?.id ?? null,
      introText: content.introText,
      subjectLine: content.subjectLine,
      htmlBody: html,
      status: push.ok ? "pushed" : "failed",
      beehiivPostId: push.postId ?? null,
      pushedAt: push.ok ? new Date() : null,
    })
    .onConflictDoUpdate({
      target: newsletterDigestsTable.weekStarting,
      set: {
        selectedPollIds: content.topPolls.map((p) => p.id),
        selectedPredictionIds: content.resolvingPredictions.map((p) => p.id),
        featuredVoiceId: content.featuredVoice?.id ?? null,
        introText: content.introText,
        subjectLine: content.subjectLine,
        htmlBody: html,
        status: push.ok ? "pushed" : "failed",
        beehiivPostId: push.postId ?? null,
        pushedAt: push.ok ? new Date() : null,
      },
    })
    .returning()

  return {
    digestId: row.id,
    beehiivPostId: push.postId ?? null,
    weekStarting: content.weekStarting,
  }
}
