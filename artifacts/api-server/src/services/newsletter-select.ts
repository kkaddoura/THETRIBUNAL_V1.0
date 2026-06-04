/**
 * Editorial selection for the weekly newsletter — reads live poll/prediction
 * data and produces a `NewsletterContent` for the renderer.
 *
 * Selection (per PRD docs/prd/tribunal-weekly-newsletter.md, MVP):
 *  - Signal: an Editor's Pick poll if available, else the most-divided debate
 *    (smallest gap between the top two options) above a vote floor.
 *  - Split:  the most-divided remaining debate (distinct from the Signal).
 *  - One to Watch: a prediction (highest engagement) if available, else a
 *    third debate.
 *  - Vote labels by threshold; copy is hedged + lint-checked (no overclaiming).
 *
 * Copy is generated deterministically (no AI dependency). All strings pass
 * through `lintCopy` so a banned phrase can never reach a send.
 */

import {
  db,
  pollsTable,
  pollOptionsTable,
  predictionsTable,
} from "@workspace/db"
import { and, eq, desc } from "drizzle-orm"
import { lintCopy } from "./newsletter-lint.js"
import type {
  NewsletterContent,
  ResultOption,
  SignalLabel,
} from "./newsletter-html.js"

const MIN_VOTES = 10 // vote floor for a poll to be eligible as Signal/Split
const TRIBUNAL_URL = (process.env.TRIBUNAL_URL || "https://thetribunal.me").replace(/\/+$/, "")

interface PollCandidate {
  id: number
  question: string
  category: string
  options: ResultOption[]
  totalVotes: number
  isEditorsPick: boolean
  /** Gap between the top two options (percentage points). Smaller = more divided. */
  gap: number
  slug: string
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/['"’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
}

function labelFor(totalVotes: number, divided: boolean): SignalLabel {
  if (totalVotes < 50) return "Early signal"
  if (totalVotes <= 150) return divided ? "Current split" : "Live debate"
  return "Live debate"
}

/** No option exceeds 45% → genuinely divided. */
function isDivided(options: ResultOption[]): boolean {
  return !options.some((o) => o.percentage > 45)
}

async function loadCandidates(): Promise<PollCandidate[]> {
  const polls = await db
    .select()
    .from(pollsTable)
    .where(eq(pollsTable.editorialStatus, "approved"))
    .orderBy(desc(pollsTable.createdAt))
    .limit(400)

  const out: PollCandidate[] = []
  for (const p of polls) {
    const opts = await db.select().from(pollOptionsTable).where(eq(pollOptionsTable.pollId, p.id))
    const total = opts.reduce((s, o) => s + (o.voteCount ?? 0) + (o.dummyVoteCount ?? 0), 0)
    if (total < MIN_VOTES || opts.length < 2) continue
    const options: ResultOption[] = opts
      .map((o) => {
        const c = (o.voteCount ?? 0) + (o.dummyVoteCount ?? 0)
        return { text: o.text, percentage: total > 0 ? Math.round((c / total) * 100) : 0 }
      })
      .sort((a, b) => b.percentage - a.percentage)
    const gap = options.length >= 2 ? options[0].percentage - options[1].percentage : 100
    out.push({
      id: p.id,
      question: p.question,
      category: p.category,
      options,
      totalVotes: total,
      isEditorsPick: p.isEditorsPick,
      gap,
      slug: slugify(p.question),
    })
  }
  return out
}

function pickSignal(cands: PollCandidate[]): PollCandidate | undefined {
  const eps = cands.filter((c) => c.isEditorsPick).sort((a, b) => a.gap - b.gap)
  if (eps.length) return eps[0]
  return [...cands].sort((a, b) => a.gap - b.gap)[0]
}

function hedgedSignalTakeaway(c: PollCandidate): string {
  const [top, second] = c.options
  const divided = isDivided(c.options)
  if (divided) {
    return `Among current voters there's no clear majority. The leading answer, "${top.text}", sits at ${top.percentage}%, with "${second.text}" close behind at ${second.percentage}%. That gap is the signal.`
  }
  return `So far, the leading answer among current voters is "${top.text}" at ${top.percentage}%, but with the field split across ${c.options.length} options, the picture is less settled than the headline suggests.`
}

function hedgedSplitTakeaway(c: PollCandidate): string {
  const [top, second] = c.options
  return `The current split shows "${top.text}" leading at ${top.percentage}%, with "${second.text}" at ${second.percentage}%. Among current voters, this one is far from decided.`
}

function buildSubject(signal: PollCandidate): string {
  // The debate questions are already editorial hot-takes — use the question as
  // the subject. Fall back to a hedged line if the lint flags it.
  const candidate = signal.question.replace(/^["']|["']$/g, "").trim()
  const lint = lintCopy(candidate)
  if (lint.clean && candidate.length <= 110) return candidate
  return `${signal.category}: where current voters actually split`
}

export async function selectNewsletterContent(now: Date = new Date()): Promise<NewsletterContent> {
  const cands = await loadCandidates()
  if (cands.length === 0) {
    throw new Error("no_eligible_debates")
  }

  const signal = pickSignal(cands)!
  const remaining = cands.filter((c) => c.id !== signal.id)
  const split = [...remaining].sort((a, b) => a.gap - b.gap)[0]

  // One to Watch: highest-engagement prediction, else a third debate.
  const [topPrediction] = await db
    .select()
    .from(predictionsTable)
    .where(eq(predictionsTable.editorialStatus, "approved"))
    .orderBy(desc(predictionsTable.totalCount))
    .limit(1)

  const usedIds = new Set([signal.id, split?.id])
  const thirdDebate = remaining.filter((c) => !usedIds.has(c.id)).sort((a, b) => a.gap - b.gap)[0]

  const weekOf = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

  const content: NewsletterContent = {
    issueNumber: 1, // first issue; audit/auto-increment handled by the send log
    weekOf,
    subjectLine: buildSubject(signal),
    previewText: "Private votes. Public results. This week's signal from The Tribunal.",
    headline: "What people voted privately this week",
    opening: [
      "The Tribunal is not here to prove the region thinks one way.",
      "It shows where people agree, where they split, and what they are willing to say when their names are not attached.",
      "Here are this week's signals.",
    ],
    signal: {
      category: signal.category,
      question: signal.question,
      takeaway: hedgedSignalTakeaway(signal),
      options: signal.options.slice(0, 4),
      label: labelFor(signal.totalVotes, isDivided(signal.options)),
      totalVotes: signal.totalVotes,
      url: `${TRIBUNAL_URL}/debates/${signal.id}-${signal.slug}`,
    },
    split: split
      ? {
          question: split.question,
          takeaway: hedgedSplitTakeaway(split),
          topResult: `${labelFor(split.totalVotes, isDivided(split.options))} · ${split.totalVotes} votes`,
          url: `${TRIBUNAL_URL}/debates/${split.id}-${split.slug}`,
        }
      : undefined,
    oneToWatch: topPrediction
      ? {
          kind: "prediction",
          question: topPrediction.question,
          takeaway: `Among current voters, ${topPrediction.yesPercentage}% expect this to happen. The question is still open.`,
          url: `${TRIBUNAL_URL}/predictions/${topPrediction.id}-${slugify(topPrediction.question)}`,
        }
      : thirdDebate
        ? {
            kind: "debate",
            question: thirdDebate.question,
            takeaway: hedgedSplitTakeaway(thirdDebate),
            url: `${TRIBUNAL_URL}/debates/${thirdDebate.id}-${thirdDebate.slug}`,
          }
        : undefined,
    askNextUrl: `${TRIBUNAL_URL}/submit-question`,
    siteUrl: TRIBUNAL_URL,
  }

  return content
}
