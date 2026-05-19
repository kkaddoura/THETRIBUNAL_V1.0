/**
 * Weekly popularity query — picks the top debate, top prediction, and top
 * pulse topic from the last 7 days for the Weekly Recap composite.
 *
 * Top debate = poll with the most total votes (real + dummy) created in window.
 * Top prediction = prediction with the most participants (totalCount + dummy)
 * created in window.
 * Top pulse = newest approved pulse topic in window (Pulse rows are typically
 * curated per-week so latest is freshest).
 */

import {
  db,
  pollsTable,
  pollOptionsTable,
  predictionsTable,
  pulseTopicsTable,
} from "@workspace/db"
import { and, desc, eq, gte, sql } from "drizzle-orm"

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export interface TopDebate {
  id: number
  question: string
  category: string | null
  winningOption: string | null
  winningPercentage: number | null
  totalVotes: number
}

export interface TopPrediction {
  id: number
  question: string
  yesPercentage: number
  totalCount: number
}

export interface TopPulse {
  id: number
  title: string
  stat: string
  delta: string | null
  deltaUp: boolean
  source: string | null
}

export async function topDebateThisWeek(): Promise<TopDebate | null> {
  const since = new Date(Date.now() - SEVEN_DAYS_MS)

  const run = (windowed: boolean) =>
    db
      .select({
        id: pollsTable.id,
        question: pollsTable.question,
        category: pollsTable.category,
        totalVotes:
          sql<number>`COALESCE(SUM(${pollOptionsTable.voteCount} + COALESCE(${pollOptionsTable.dummyVoteCount}, 0)), 0)`.as(
            "total_votes",
          ),
      })
      .from(pollsTable)
      .leftJoin(pollOptionsTable, eq(pollOptionsTable.pollId, pollsTable.id))
      .where(
        windowed
          ? and(gte(pollsTable.createdAt, since), eq(pollsTable.editorialStatus, "approved"))
          : eq(pollsTable.editorialStatus, "approved"),
      )
      .groupBy(pollsTable.id, pollsTable.question, pollsTable.category)
      .orderBy(desc(sql`total_votes`))
      .limit(1)

  // Prefer the last 7 days; fall back to the all-time top approved poll so
  // the Weekly Recap still composes at handover / in low-volume periods.
  let polls = await run(true)
  if (polls.length === 0) polls = await run(false)

  if (polls.length === 0) return null
  const top = polls[0]

  const opts = await db
    .select()
    .from(pollOptionsTable)
    .where(eq(pollOptionsTable.pollId, top.id))

  let winner: { text: string; count: number } | null = null
  let total = 0
  for (const o of opts) {
    const c = (o.voteCount ?? 0) + (o.dummyVoteCount ?? 0)
    total += c
    if (!winner || c > winner.count) winner = { text: o.text, count: c }
  }
  const winningPercentage = winner && total > 0 ? (winner.count / total) * 100 : null

  return {
    id: top.id,
    question: top.question,
    category: top.category ?? null,
    winningOption: winner?.text ?? null,
    winningPercentage,
    totalVotes: Number(top.totalVotes ?? 0),
  }
}

export async function topPredictionThisWeek(): Promise<TopPrediction | null> {
  const since = new Date(Date.now() - SEVEN_DAYS_MS)

  const run = (windowed: boolean) =>
    db
      .select({
        id: predictionsTable.id,
        question: predictionsTable.question,
        yesPercentage: predictionsTable.yesPercentage,
        totalCount: predictionsTable.totalCount,
        dummyTotalCount: predictionsTable.dummyTotalCount,
      })
      .from(predictionsTable)
      .where(
        windowed
          ? and(gte(predictionsTable.createdAt, since), eq(predictionsTable.editorialStatus, "approved"))
          : eq(predictionsTable.editorialStatus, "approved"),
      )
      .orderBy(desc(sql`${predictionsTable.totalCount} + COALESCE(${predictionsTable.dummyTotalCount}, 0)`))
      .limit(1)

  // Prefer the last 7 days; fall back to the all-time top approved
  // prediction so the Weekly Recap still composes when none are recent.
  let rows = await run(true)
  if (rows.length === 0) rows = await run(false)

  if (rows.length === 0) return null
  const r = rows[0]
  return {
    id: r.id,
    question: r.question,
    yesPercentage: r.yesPercentage,
    totalCount: (r.totalCount ?? 0) + (r.dummyTotalCount ?? 0),
  }
}

export async function topPulseThisWeek(): Promise<TopPulse | null> {
  const since = new Date(Date.now() - SEVEN_DAYS_MS)

  const run = (windowed: boolean) =>
    db
      .select()
      .from(pulseTopicsTable)
      .where(
        windowed
          ? and(gte(pulseTopicsTable.createdAt, since), eq(pulseTopicsTable.editorialStatus, "approved"))
          : eq(pulseTopicsTable.editorialStatus, "approved"),
      )
      .orderBy(desc(pulseTopicsTable.createdAt))
      .limit(1)

  // Prefer the last 7 days; fall back to the newest approved pulse so the
  // Weekly Recap still composes when none are within the window.
  let rows = await run(true)
  if (rows.length === 0) rows = await run(false)

  if (rows.length === 0) return null
  const r = rows[0]
  return {
    id: r.id,
    title: r.title,
    stat: r.stat,
    delta: r.delta ?? null,
    deltaUp: r.deltaUp,
    source: r.source ?? null,
  }
}

export interface WeeklyTops {
  topDebate: TopDebate | null
  topPrediction: TopPrediction | null
  topPulse: TopPulse | null
  weekLabel: string
}

export async function loadWeeklyTops(): Promise<WeeklyTops> {
  const [topDebate, topPrediction, topPulse] = await Promise.all([
    topDebateThisWeek(),
    topPredictionThisWeek(),
    topPulseThisWeek(),
  ])
  return { topDebate, topPrediction, topPulse, weekLabel: weekLabelNow() }
}

function weekLabelNow(): string {
  const now = new Date()
  const start = new Date(now.getTime() - SEVEN_DAYS_MS)
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  return `${fmt(start)} – ${fmt(now)}`
}
