/**
 * Brand-safety linter for newsletter copy. The newsletter is generated without
 * a human editing each word, so this is the deterministic guarantee that no
 * overclaiming phrase reaches a send. Runs server-side before render/send.
 */

const BANNED: string[] = [
  "the region has spoken",
  "the majority of the region believes",
  "poll proves",
  "people in the arab world think",
  "definitive result",
  "scientific result",
  "the region believes",
  "proves that",
  "this week on the tribunal", // banned generic subject
]

export interface LintResult {
  clean: boolean
  hits: string[]
}

/** Case- and whitespace-insensitive scan for banned phrases. */
export function lintCopy(text: string): LintResult {
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim()
  const hits = BANNED.filter((b) => normalized.includes(b))
  return { clean: hits.length === 0, hits }
}

/**
 * Return `text` if clean; otherwise log the hit and return `fallback`.
 * Use to guarantee a safe value reaches the email.
 */
export function sanitize(field: string, text: string, fallback: string): string {
  const { clean, hits } = lintCopy(text)
  if (clean) return text
  console.warn(`[newsletter-lint] '${field}' contained banned phrase(s) [${hits.join(", ")}] — using fallback`)
  return fallback
}
