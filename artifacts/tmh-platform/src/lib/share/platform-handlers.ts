// ──────────────────────────────────────────────────────────────
//  Platform handler dispatch — single entry-point for executing
//  a share action on any supported platform.
//
//  Platforms open their intent URLs with the share link. OG tags
//  on the shared page handle preview cards automatically — no
//  client-side image generation needed during the share flow.
//
//  The "download" handler is the exception: it still uses
//  client-side canvas to let users save a card image locally.
// ──────────────────────────────────────────────────────────────

import type {
  ShareContext,
  SharePlatform,
  ShareResult,
} from "./types"
import { copyToClipboard } from "./clipboard"
import {
  getWhatsAppShareUrl,
  getLinkedInShareUrl,
  getXShareUrl,
} from "./url-builders"
import { buildShareText } from "./templates"
import { generateCard } from "./card-generator"

// ── Options ─────────────────────────────────────────────────

export interface ExecuteShareOptions {
  /** Majlis channel ID to post to. */
  majlisChannelId?: number
  /** Auth token for the Majlis API. */
  majlisToken?: string
  /** Pre-formatted message body for Majlis. */
  majlisMessage?: string
}

// ── Helpers ─────────────────────────────────────────────────

function canGenerateCard(ctx: ShareContext): boolean {
  switch (ctx.contentType) {
    case "debate":
      return ctx.totalVotes > 0 || !!ctx.votedOptionText || ctx.options.length > 0
    case "prediction":
      return true
    case "pulse":
      return !!ctx.stat
  }
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function openTab(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer")
}

// ── Per-platform handlers ───────────────────────────────────

/**
 * WhatsApp: open wa.me intent with share text (URL embedded).
 * The shared page's OG tags provide the preview card automatically.
 */
async function handleWhatsApp(ctx: ShareContext): Promise<ShareResult> {
  openTab(getWhatsAppShareUrl(ctx.url))
  return { platform: "whatsapp", outcome: "opened" }
}

/**
 * LinkedIn: copy share text to clipboard, open LinkedIn share URL.
 * LinkedIn fetches OG tags from the URL to build the preview card.
 */
async function handleLinkedIn(ctx: ShareContext): Promise<ShareResult> {
  await copyToClipboard(ctx.url)
  openTab(getLinkedInShareUrl(ctx.url))
  return { platform: "linkedin", outcome: "copied" }
}

/**
 * X/Twitter: open tweet intent URL with text + url params.
 * X renders the OG card from the shared URL automatically.
 */
async function handleX(ctx: ShareContext): Promise<ShareResult> {
  openTab(getXShareUrl("", ctx.url))
  return { platform: "x", outcome: "opened" }
}

/**
 * Instagram: copy URL to clipboard and open Instagram.
 * User pastes the link — or saves the card below to share as an image.
 */
async function handleInstagram(ctx: ShareContext): Promise<ShareResult> {
  await copyToClipboard(ctx.url)
  openTab("https://www.instagram.com/")
  return { platform: "instagram", outcome: "copied" }
}

async function handleCopy(ctx: ShareContext): Promise<ShareResult> {
  const ok = await copyToClipboard(ctx.url)
  return {
    platform: "copy",
    outcome: ok ? "copied" : "failed",
    error: ok ? undefined : "Clipboard write failed",
  }
}

/**
 * Download / "Save Card": still uses client-side canvas generation
 * so users can save the branded card image locally.
 */
async function handleDownload(ctx: ShareContext): Promise<ShareResult> {
  try {
    if (!canGenerateCard(ctx)) {
      return {
        platform: "download",
        outcome: "failed",
        error: "Card generation not available for this content",
      }
    }
    const blob = await generateCard(ctx, "og")
    if (blob) {
      const slug = ctx.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60)
      downloadBlob(blob, `tribunal-${slug}.png`)
      return { platform: "download", outcome: "downloaded" }
    }
    return {
      platform: "download",
      outcome: "failed",
      error: "Card generation returned null",
    }
  } catch (err) {
    return {
      platform: "download",
      outcome: "failed",
      error: err instanceof Error ? err.message : "Card generation failed",
    }
  }
}

/**
 * Native share (mobile "Share" button):
 *
 * Shares text + URL only — NO files. When files are included in
 * navigator.share, most mobile browsers/apps drop the text and url
 * fields. Users can grab the card image via the "Save Card" button.
 */
async function handleNative(ctx: ShareContext): Promise<ShareResult> {
  if (typeof navigator === "undefined" || !navigator.share) {
    return {
      platform: "native",
      outcome: "failed",
      error: "Web Share API not supported",
    }
  }

  try {
    await navigator.share({
      title: ctx.title,
      url: ctx.url,
    })
    return { platform: "native", outcome: "shared" }
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { platform: "native", outcome: "cancelled" }
    }
    return {
      platform: "native",
      outcome: "failed",
      error: err instanceof Error ? err.message : "Native share failed",
    }
  }
}

async function handleMajlis(
  ctx: ShareContext,
  options: ExecuteShareOptions,
): Promise<ShareResult> {
  const { majlisChannelId, majlisToken, majlisMessage } = options

  if (!majlisChannelId || !majlisToken) {
    return {
      platform: "majlis",
      outcome: "failed",
      error: "Missing Majlis channel ID or auth token",
    }
  }

  const content = majlisMessage ?? buildShareText(ctx, "generic")
  const baseUrl = import.meta.env?.VITE_API_BASE_URL ?? ""

  try {
    const res = await fetch(
      `${baseUrl}/api/majlis/channels/${majlisChannelId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-majlis-token": majlisToken,
        },
        body: JSON.stringify({ content }),
      },
    )

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return {
        platform: "majlis",
        outcome: "failed",
        error: (body as { error?: string }).error ?? `HTTP ${res.status}`,
      }
    }

    return { platform: "majlis", outcome: "sent" }
  } catch (err) {
    return {
      platform: "majlis",
      outcome: "failed",
      error: err instanceof Error ? err.message : "Network request failed",
    }
  }
}

// ── Main dispatcher ─────────────────────────────────────────

/**
 * Execute a share action for the given platform.
 *
 * Most handlers simply open an intent URL — the shared page's
 * OG tags handle preview cards. Only "download" generates a
 * client-side card image, and "majlis" makes an API call.
 */
export async function executeShare(
  ctx: ShareContext,
  platform: SharePlatform,
  options: ExecuteShareOptions = {},
): Promise<ShareResult> {
  switch (platform) {
    case "whatsapp":
      return handleWhatsApp(ctx)
    case "linkedin":
      return handleLinkedIn(ctx)
    case "x":
      return handleX(ctx)
    case "instagram":
      return handleInstagram(ctx)
    case "copy":
      return handleCopy(ctx)
    case "download":
      return handleDownload(ctx)
    case "native":
      return handleNative(ctx)
    case "majlis":
      return handleMajlis(ctx, options)
    default: {
      const _exhaustive: never = platform
      return {
        platform: _exhaustive,
        outcome: "failed",
        error: `Unknown platform: ${platform}`,
      }
    }
  }
}

export { canGenerateCard }
