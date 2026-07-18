/**
 * Tribunal weekly editorial newsletter — HTML renderer.
 *
 * Pure, dependency-free (no DB, no network) so it can be unit-tested and
 * rendered in isolation. The digest pipeline (newsletter-digest.ts) builds a
 * `NewsletterContent` from real data and passes it here; the same renderer is
 * used for test sends.
 *
 * Design constraints (per PRD docs/prd/tribunal-weekly-newsletter.md):
 *  - Editorial structure: Header → Issue → Headline → Opening → [Signal card]
 *    → The Week's Signal → The Split → One to Watch → Ask Next → Footer.
 *  - Real buttons (bulletproof table anchors), never raw URLs.
 *  - Dark-mode + mobile safe, table-based layout, inline styles only.
 *  - The "Split card" infographic is rendered as an HTML/CSS block (renders in
 *    every client, needs no image hosting). When a hosted PNG URL is supplied
 *    (R2 configured), it is used instead with the HTML card as the alt/fallback.
 */

// ── Brand tokens ─────────────────────────────────────────────
const BG = "#0A0A0A"
const PANEL = "#121212"
const BORDER = "#262626"
const FG = "#F2EDE4"
const MUTED = "#9A9690"
const SOFT = "#C3BDB1"
const ACCENT = "#DC143C"

export type SignalLabel = "Early signal" | "Current split" | "Live debate"

export interface ResultOption {
  text: string
  percentage: number
}

export interface SignalSection {
  category: string
  question: string
  /** Editorial read — hedged language only. */
  takeaway: string
  options: ResultOption[]
  label: SignalLabel
  totalVotes: number
  url: string
  /** Optional hosted PNG (R2). When absent, the HTML card is used. */
  infographicUrl?: string
}

export interface DebateSection {
  question: string
  takeaway: string
  topResult?: string
  url: string
}

export interface WatchSection {
  /** "prediction" | "debate" — drives the kicker only. */
  kind: "prediction" | "debate"
  question: string
  takeaway: string
  url: string
}

export interface NewsletterContent {
  issueNumber: number
  weekOf: string // human label, e.g. "June 2, 2026"
  subjectLine: string
  previewText: string
  headline: string
  opening: string[] // paragraphs
  signal: SignalSection
  split?: DebateSection
  oneToWatch?: WatchSection
  askNextUrl: string
  siteUrl: string
}

const UTM = "?utm_source=newsletter&utm_medium=email&utm_campaign=weekly_brief"

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function withUtm(url: string): string {
  if (!url) return "#"
  return url.includes("?") ? `${url}&${UTM.slice(1)}` : `${url}${UTM}`
}

/** Bulletproof (Outlook-safe) button rendered as a bordered table anchor. */
function button(label: string, url: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 0;">
    <tr>
      <td align="center" bgcolor="${ACCENT}" style="border-radius:2px;">
        <a href="${esc(withUtm(url))}" target="_blank"
           style="display:inline-block;padding:13px 26px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#FFFFFF;text-decoration:none;border-radius:2px;">
          ${esc(label)} &rsaquo;
        </a>
      </td>
    </tr>
  </table>`
}

/** Section kicker (e.g. "THE WEEK'S SIGNAL"). */
function kicker(text: string): string {
  return `<p style="margin:0 0 10px;color:${ACCENT};font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">${esc(text)}</p>`
}

/** A single result row with a proportional bar (renders in Gmail via nested tables). */
function resultRow(opt: ResultOption, isLead: boolean): string {
  const pct = Math.max(0, Math.min(100, Math.round(opt.percentage)))
  const fillColor = isLead ? ACCENT : "#5A5650"
  return `
  <tr>
    <td style="padding:9px 0 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;color:${FG};padding:0 0 5px;">${esc(opt.text)}</td>
          <td align="right" style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;font-weight:700;color:${isLead ? ACCENT : SOFT};padding:0 0 5px;white-space:nowrap;">${pct}%</td>
        </tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1E1E1E;border-radius:2px;">
        <tr>
          <td width="${pct}%" style="background:${fillColor};height:6px;line-height:6px;font-size:0;border-radius:2px;">&nbsp;</td>
          <td style="font-size:0;line-height:6px;">&nbsp;</td>
        </tr>
      </table>
    </td>
  </tr>`
}

/** The "Split card" infographic, rendered as an on-brand HTML block. */
function signalCard(s: SignalSection): string {
  // If a hosted PNG is available (R2 configured), prefer it; HTML card is the fallback.
  if (s.infographicUrl) {
    const alt = `The Week's Signal, ${s.category}: ${s.question} (${s.label} · ${s.totalVotes} votes)`
    return `
    <tr><td style="padding:8px 0 28px;">
      <img src="${esc(s.infographicUrl)}" alt="${esc(alt)}" width="100%"
           style="display:block;width:100%;max-width:552px;border:1px solid ${BORDER};border-radius:6px;" />
    </td></tr>`
  }

  const lead = s.options.reduce((a, b) => (b.percentage > a.percentage ? b : a), s.options[0])
  const rows = s.options.map((o) => resultRow(o, o === lead)).join("")

  return `
  <tr><td style="padding:8px 0 28px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background:${BG};border:1px solid ${ACCENT};border-radius:6px;">
      <tr><td style="padding:26px 24px 22px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${FG};">THE TRIBUNAL</td>
            <td align="right" style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${ACCENT};">The Week's Signal</td>
          </tr>
        </table>
        <p style="margin:18px 0 4px;color:${MUTED};font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">${esc(s.category)}</p>
        <p style="margin:0 0 16px;color:${FG};font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.2;">${esc(s.question)}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${rows}
        </table>
        <p style="margin:20px 0 0;color:${SOFT};font-size:14px;line-height:1.5;font-style:italic;">${esc(s.takeaway)}</p>
        <p style="margin:16px 0 0;color:${MUTED};font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">${esc(s.label)} &middot; ${s.totalVotes} votes</p>
        <p style="margin:14px 0 0;color:${FG};font-size:12px;letter-spacing:1px;">Vote privately. See the result publicly.</p>
      </td></tr>
    </table>
  </td></tr>`
}

function editorialSection(opts: {
  kicker: string
  question: string
  paragraphs: string[]
  meta?: string
  buttonLabel: string
  url: string
}): string {
  const body = opts.paragraphs
    .map((p) => `<p style="margin:0 0 12px;color:${SOFT};font-size:16px;line-height:1.6;">${esc(p)}</p>`)
    .join("")
  return `
  <tr><td style="padding:30px 0 6px;border-top:1px solid ${BORDER};">
    ${kicker(opts.kicker)}
    <h2 style="margin:0 0 14px;color:${FG};font-family:Georgia,'Times New Roman',serif;font-size:23px;line-height:1.25;">${esc(opts.question)}</h2>
    ${body}
    ${opts.meta ? `<p style="margin:6px 0 0;color:${MUTED};font-size:13px;">${esc(opts.meta)}</p>` : ""}
    ${button(opts.buttonLabel, opts.url)}
  </td></tr>`
}

export interface RenderOptions {
  /**
   * When true, omit the template's own footer + {{unsubscribe_link}}. Use for
   * Beehiiv sends, where Beehiiv injects its own compliant footer + unsubscribe
   * (avoids a double footer). Resend/standalone sends keep the footer (false).
   */
  omitFooter?: boolean
}

export function buildNewsletterHtml(c: NewsletterContent, opts: RenderOptions = {}): string {
  const issueNo = String(c.issueNumber).padStart(3, "0")

  const opening = c.opening
    .map((p) => `<p style="margin:0 0 14px;color:${SOFT};font-size:16px;line-height:1.6;">${esc(p)}</p>`)
    .join("")

  const splitHtml = c.split
    ? editorialSection({
        kicker: "The Split",
        question: c.split.question,
        paragraphs: [c.split.takeaway],
        meta: c.split.topResult,
        buttonLabel: "Cast your vote",
        url: c.split.url,
      })
    : ""

  const watchHtml = c.oneToWatch
    ? editorialSection({
        kicker: "One to Watch",
        question: c.oneToWatch.question,
        paragraphs: [c.oneToWatch.takeaway],
        buttonLabel: c.oneToWatch.kind === "prediction" ? "Make your call" : "Vote now",
        url: c.oneToWatch.url,
      })
    : ""

  return `<!DOCTYPE html>
<html lang="en" style="margin:0;padding:0;">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="dark light" />
<meta name="supported-color-schemes" content="dark light" />
<meta name="x-apple-disable-message-reformatting" />
<title>${esc(c.subjectLine)}</title>
<style>
  /* Preview text hidden in body */
  .preheader { display:none !important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden; mso-hide:all; }
  @media only screen and (max-width:600px) {
    .container { width:100% !important; }
    .px { padding-left:20px !important; padding-right:20px !important; }
    .h1 { font-size:30px !important; }
  }
  :root { color-scheme: dark light; supported-color-schemes: dark light; }
</style>
</head>
<body style="margin:0;padding:0;background:${BG};">
<div class="preheader">${esc(c.previewText)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};">
<tr><td align="center" style="padding:0;">
<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:${BG};">

  <!-- HEADER -->
  <tr><td class="px" style="padding:38px 24px 0;">
    <p style="margin:0;color:${FG};font-size:18px;font-weight:700;letter-spacing:5px;text-transform:uppercase;">THE TRIBUNAL</p>
    <p style="margin:6px 0 0;color:${ACCENT};font-size:13px;letter-spacing:1px;">The region, on record.</p>
  </td></tr>

  <!-- ISSUE LINE -->
  <tr><td class="px" style="padding:22px 24px 0;">
    <p style="margin:0;color:${MUTED};font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Issue ${issueNo} &middot; Week of ${esc(c.weekOf)}</p>
  </td></tr>

  <!-- HEADLINE + OPENING -->
  <tr><td class="px" style="padding:14px 24px 0;">
    <h1 class="h1" style="margin:0 0 18px;color:${FG};font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:1.12;">${esc(c.headline)}</h1>
    ${opening}
  </td></tr>

  <!-- SIGNAL CARD + SECTIONS -->
  <tr><td class="px" style="padding:18px 24px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${signalCard(c.signal)}
      ${editorialSection({
        kicker: "The Week's Signal",
        question: c.signal.question,
        paragraphs: [c.signal.takeaway],
        meta: `${c.signal.label} · ${c.signal.totalVotes} votes`,
        buttonLabel: "View the debate",
        url: c.signal.url,
      })}
      ${splitHtml}
      ${watchHtml}

      <!-- ASK NEXT -->
      <tr><td style="padding:30px 0 6px;border-top:1px solid ${BORDER};">
        ${kicker("What should we ask next?")}
        <p style="margin:0 0 12px;color:${SOFT};font-size:16px;line-height:1.6;">We are building the next set of questions across power, identity, money, class, work, media, culture and the future.</p>
        ${button("Send a question", c.askNextUrl)}
      </td></tr>
    </table>
  </td></tr>

  <!-- FOOTER -->
  ${
    opts.omitFooter
      ? `<tr><td class="px" style="padding:30px 24px 8px;border-top:1px solid ${BORDER};text-align:center;">
    <p style="margin:0;color:${FG};font-size:13px;letter-spacing:1px;">Vote privately. See the result publicly.</p>
    <p style="margin:14px 0 0;color:${MUTED};font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">The Tribunal</p>
  </td></tr>`
      : `<tr><td class="px" style="padding:36px 24px 40px;border-top:1px solid ${BORDER};text-align:center;">
    <p style="margin:0;color:${FG};font-size:13px;letter-spacing:1px;">Vote privately. See the result publicly.</p>
    <p style="margin:14px 0 0;color:${MUTED};font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">The Tribunal</p>
    <p style="margin:14px 0 0;color:#6A655F;font-size:11px;line-height:1.5;">
      You're receiving this because you subscribed at ${esc(c.siteUrl.replace(/^https?:\/\//, ""))}.<br/>
      <a href="{{unsubscribe_link}}" style="color:#6A655F;text-decoration:underline;">Unsubscribe</a>
    </p>
  </td></tr>`
  }

</table>
</td></tr>
</table>
</body>
</html>`
}
