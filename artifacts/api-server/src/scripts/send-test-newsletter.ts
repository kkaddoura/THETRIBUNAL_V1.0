/**
 * One-off: render the new editorial newsletter template with representative
 * sample data and send it via Resend to a test inbox.
 *
 * Run:  pnpm --filter @workspace/api-server exec tsx --env-file=.env ./src/scripts/send-test-newsletter.ts <email>
 *
 * Uses the REAL production renderer (services/newsletter-html.ts), so the
 * received email is exactly what the live newsletter will look like. Sample
 * data mirrors the brief's examples (gender equality / AI jobs / AI governance)
 * with hedged, non-overclaiming copy.
 */

import { sendEmail } from "../lib/email.js"
import { buildNewsletterHtml, type NewsletterContent } from "../services/newsletter-html.js"

const to = process.argv[2] || "acharjee266@gmail.com"
// The Tribunal's live domain is thetribunal.me (confirmed). All debate links resolve here.
const site = (process.env.TRIBUNAL_URL || "https://thetribunal.me").replace(/\/+$/, "")

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
  const html = buildNewsletterHtml(content)
  console.log(`[test-newsletter] rendered ${html.length} bytes of HTML`)

  // themiddleeasthustle.com is not yet verified in Resend, so for the test send
  // we use Resend's onboarding sender (delivers to the account owner's inbox).
  // In production the verified-domain DEFAULT_FROM ("The Tribunal <…>") is used.
  const from = process.env.TEST_FROM || "The Tribunal <onboarding@resend.dev>"

  const result = await sendEmail({
    label: "test-newsletter",
    to,
    from,
    subject: content.subjectLine,
    html,
    text: `${content.headline}\n\n${content.opening.join("\n\n")}\n\nView this week's issue at ${site}`,
    listUnsubscribeUrl: `${site}/api/newsletter/unsubscribe?token=test`,
  })

  console.log(`[test-newsletter] send result:`, JSON.stringify(result))
  if (!result.ok) process.exit(1)
  if (result.via === "dev-file") {
    console.log(`[test-newsletter] No RESEND_API_KEY — wrote preview to ${result.devFilePath}`)
  } else {
    console.log(`[test-newsletter] Sent to ${to} via ${result.via}.`)
  }
}

void main().catch((err) => {
  console.error("[test-newsletter] failed:", err)
  process.exit(1)
})
