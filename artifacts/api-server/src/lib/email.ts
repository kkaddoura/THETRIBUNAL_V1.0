import { promises as fs } from "node:fs"
import path from "node:path"

const RESEND_ENDPOINT = "https://api.resend.com/emails"

export const DEFAULT_FROM = "The Tribunal <noreply@themiddleeasthustle.com>"

export interface SendEmailInput {
  /** Short label used for logs + dev-fallback filenames (e.g. "verification", "welcome", "apply-passed"). */
  label: string
  to: string
  subject: string
  html?: string
  text?: string
  from?: string
  /** RFC 8058 one-click unsubscribe URL. When set, also emits `List-Unsubscribe-Post: List-Unsubscribe=One-Click`. */
  listUnsubscribeUrl?: string
}

export interface SendEmailResult {
  ok: boolean
  /** "resend" when sent via the API; "dev-file" when written to disk; "skipped" when neither key nor dev mode applies. */
  via: "resend" | "dev-file" | "skipped"
  devFilePath?: string
  error?: string
}

/**
 * Send one transactional email. Single source of truth for FROM, error logging,
 * and the dev-mode fallback that writes rendered HTML to disk when no Resend
 * key is set — so signup flows are visibly verifiable locally.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = input.from ?? DEFAULT_FROM

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      console.warn(`[email] RESEND_API_KEY missing in production — ${input.label} to ${maskEmail(input.to)} not sent`)
      return { ok: false, via: "skipped", error: "no_api_key" }
    }
    const file = await writeDevEmail(input)
    console.log(`[email-dev] ${input.label} → ${maskEmail(input.to)} (no key; wrote ${file})`)
    return { ok: true, via: "dev-file", devFilePath: file }
  }

  const headers: Record<string, string> = {}
  if (input.listUnsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${input.listUnsubscribeUrl}>`
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(Object.keys(headers).length ? { headers } : {}),
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      console.error(`[email] ${input.label} failed (${res.status}):`, body.slice(0, 500))
      return { ok: false, via: "resend", error: `resend_${res.status}` }
    }
    console.log(`[email] ${input.label} sent to ${maskEmail(input.to)}`)
    return { ok: true, via: "resend" }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[email] ${input.label} request error:`, msg)
    return { ok: false, via: "resend", error: msg }
  }
}

async function writeDevEmail(input: SendEmailInput): Promise<string> {
  const dir = path.join(process.env.UPLOADS_DIR || "uploads", "dev-emails")
  await fs.mkdir(dir, { recursive: true })
  const ts = new Date().toISOString().replace(/[:.]/g, "-")
  const slug = input.to.replace(/[^a-z0-9]+/gi, "_").slice(0, 40)
  const file = path.join(dir, `${ts}-${input.label}-${slug}.html`)
  const meta = `<!--
TO: ${input.to}
SUBJECT: ${input.subject}
LABEL: ${input.label}
LIST-UNSUBSCRIBE: ${input.listUnsubscribeUrl ?? ""}
-->`
  const body = input.html ?? `<pre>${escapeHtml(input.text ?? "")}</pre>`
  await fs.writeFile(file, `${meta}\n${body}`, "utf8")
  return file
}

function maskEmail(e: string): string {
  return e.slice(0, 3) + "***"
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}
