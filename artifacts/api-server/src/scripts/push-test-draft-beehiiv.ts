/**
 * One-off: push the new editorial newsletter as a DRAFT post to Beehiiv via
 * the /posts API, so we can open it in the Beehiiv dashboard and use Beehiiv's
 * own "Send test" to preview the true production rendering.
 *
 * SAFETY: status is hard-coded to "draft". This NEVER sends to subscribers.
 *
 * Run: npx tsx --env-file=.env ./src/scripts/push-test-draft-beehiiv.ts
 */

import { buildNewsletterHtml, type NewsletterContent } from "../services/newsletter-html.js"

const site = "https://thetribunal.me"

const content: NewsletterContent = {
  issueNumber: 1,
  weekOf: "June 2, 2026",
  subjectLine: "The gender equality vote is not as clean as the headline",
  previewText: "Private votes. Public results. This week's signal from The Tribunal.",
  headline: "What people voted privately this week",
  opening: [
    "The Tribunal is not here to prove the region thinks one way.",
    "It shows where people agree, where they split, and what they are willing to say when their names are not attached.",
    "Here are this week's signals.",
  ],
  signal: {
    category: "Women & Society",
    question: "Progress or optics?",
    takeaway:
      "Among current voters, the gender equality question is split between genuine progress, partial progress, and optics — no clear majority. That gap is exactly what The Tribunal is built to capture.",
    options: [
      { text: "Genuine progress, the change is real", percentage: 35 },
      { text: "Some genuine, some optics", percentage: 23 },
      { text: "Mostly optics, the surface changed", percentage: 19 },
      { text: "A talking point with no real policy", percentage: 13 },
    ],
    label: "Early signal",
    totalVotes: 63,
    url: `${site}/debates/gender-equality-progress-or-optics`,
  },
  split: {
    question: "Will your job still exist in five years?",
    takeaway:
      "The anxiety around AI is not abstract anymore. The early signal is mixed — some current voters think they are safe, others think the job survives but the work changes completely. That distinction matters.",
    topResult: "Current split · 81 votes",
    url: `${site}/debates/will-your-job-exist-in-five-years`,
  },
  oneToWatch: {
    kind: "debate",
    question: "The AI governance gap",
    takeaway:
      "One debate is already pointing to a bigger tension: the region is moving fast on AI, but among current voters the rules are not clearly keeping up. This affects work, education, privacy and power.",
    url: `${site}/debates/the-ai-governance-gap`,
  },
  askNextUrl: `${site}/submit-question`,
  siteUrl: site,
}

async function main(): Promise<void> {
  const apiKey = process.env.BEEHIIV_API_KEY
  const pubId = process.env.BEEHIIV_PUBLICATION_ID
  if (!apiKey || !pubId) {
    console.error("[beehiiv-draft] BEEHIIV_API_KEY / BEEHIIV_PUBLICATION_ID missing")
    process.exit(1)
  }

  // Beehiiv supplies its own footer + unsubscribe, so omit ours.
  const html = buildNewsletterHtml(content, { omitFooter: true })
  console.log(`[beehiiv-draft] rendered ${html.length} bytes; pushing DRAFT to publication ${pubId.slice(0, 8)}…`)

  const res = await fetch(`https://api.beehiiv.com/v2/publications/${pubId}/posts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      title: content.subjectLine,
      subtitle: content.previewText,
      status: "draft", // <-- never sends to subscribers
      content_html: html,
    }),
  })

  const bodyText = await res.text().catch(() => "")
  console.log(`[beehiiv-draft] HTTP ${res.status}`)
  console.log(`[beehiiv-draft] body: ${bodyText.slice(0, 800)}`)

  if (!res.ok) {
    console.error("[beehiiv-draft] /posts not available on this plan or request rejected.")
    process.exit(2)
  }

  let postId = "?"
  try {
    postId = (JSON.parse(bodyText) as { data?: { id?: string } })?.data?.id ?? "?"
  } catch {
    /* ignore */
  }
  console.log(`[beehiiv-draft] ✅ Draft created. Post id: ${postId}`)
  console.log("[beehiiv-draft] Next: open it in Beehiiv → Send test → acharjee266@gmail.com")
}

void main().catch((err) => {
  console.error("[beehiiv-draft] failed:", err)
  process.exit(1)
})
