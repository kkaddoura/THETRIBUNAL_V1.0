// ──────────────────────────────────────────────────────────────
//  Clipboard helper — extracted from ShareModal.tsx
//  Uses the async Clipboard API with a textarea fallback for
//  older browsers / non-HTTPS contexts.
// ──────────────────────────────────────────────────────────────

export async function copyToClipboard(text: string): Promise<boolean> {
  // Modern path — async Clipboard API
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Clipboard API can throw in restrictive iframes — fall through
    }
  }

  // Legacy fallback — hidden textarea + execCommand
  try {
    const ta = document.createElement("textarea")
    ta.value = text
    ta.style.cssText = "position:fixed;top:-9999px;opacity:0"
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand("copy")
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
