import { useState, useEffect } from "react"
import {
  Linkedin,
  CheckCircle2,
  Download,
  Loader2,
  Hash,
  Mail,
  Send,
  ArrowLeft,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { ShareContext, SharePlatform, ShareResult } from "@/lib/share"
import { executeShare, canGenerateCard, buildShareText } from "@/lib/share"

// ── Channel type for Majlis ────────────────────────────────────

interface Channel {
  id: number
  name: string
  type: string
  displayName: string
  isDefault: boolean
}

// ── Props ──────────────────────────────────────────────────────

interface ShareModalProps {
  context: ShareContext
  onClose: () => void
  showEmailGate?: boolean
  onUnlock?: () => void
}

// ── Helpers ────────────────────────────────────────────────────

function getShareBody(): string {
  return "Copy the link and paste it on your favourite platform \u2014 it auto-renders a full preview with text and image."
}

// ── Component ──────────────────────────────────────────────────

export function ShareModal({
  context,
  onClose,
  showEmailGate,
  onUnlock,
}: ShareModalProps) {
  const [generating, setGenerating] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [view, setView] = useState<"share" | "majlis">("share")

  // Email gate state
  const [email, setEmail] = useState("")
  const [emailSubmitted, setEmailSubmitted] = useState(false)
  const [newsletterOptIn, setNewsletterOptIn] = useState(true)

  // Majlis state
  const [channels, setChannels] = useState<Channel[]>([])
  const [channelsLoading, setChannelsLoading] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [majlisMessage, setMajlisMessage] = useState("")
  const [majlisSent, setMajlisSent] = useState<string | null>(null)

  const { toast } = useToast()

  const hasEmail =
    typeof window !== "undefined" &&
    !!localStorage.getItem("tmh_email_submitted")

  const displayHeading =
    showEmailGate && !hasEmail
      ? "Share to Unlock Full Results"
      : "Share This"

  const displayBody =
    showEmailGate && !hasEmail
      ? "We keep The Tribunal free by making opinion data shareable. Share this to see the full breakdown."
      : getShareBody()

  const isMobile =
    typeof navigator !== "undefined" && navigator.maxTouchPoints > 0

  const majlisToken =
    typeof window !== "undefined"
      ? localStorage.getItem("majlis_token")
      : null

  const isGeneratingAny = generating !== null

  // ── Fetch Majlis channels when entering Majlis view ────────

  useEffect(() => {
    if (view !== "majlis" || !majlisToken) return
    setChannelsLoading(true)
    const baseUrl = (import.meta as any).env?.VITE_API_BASE_URL ?? ""
    fetch(`${baseUrl}/api/majlis/channels`, {
      headers: {
        "Content-Type": "application/json",
        "x-majlis-token": majlisToken,
      },
    })
      .then((r) => r.json())
      .then((data) => setChannels(data.channels ?? []))
      .catch(() => {})
      .finally(() => setChannelsLoading(false))
  }, [view, majlisToken])

  // ── Toast helper ───────────────────────────────────────────

  function showResultToast(platform: SharePlatform, result: ShareResult) {
    const o = result.outcome

    if (o === "shared") {
      toast({
        title: "Shared!",
        description: "Thanks for spreading the word.",
      })
      return
    }

    switch (platform) {
      case "whatsapp":
        if (o === "opened")
          toast({
            title: "Opening WhatsApp...",
            description:
              "Your branded card will appear in the chat automatically.",
          })
        break

      case "linkedin":
        if (o === "copied")
          toast({
            title: "Text copied!",
            description:
              "Paste the text in your post \u2014 the link preview shows your card.",
          })
        break

      case "x":
        // Intent URL opens directly — no toast needed
        break

      case "instagram":
        if (o === "copied")
          toast({
            title: "Link copied!",
            description:
              "Paste the link \u2014 or save the card below to share as an image.",
          })
        break

      case "copy":
        if (o === "copied")
          toast({
            title: "Copied!",
            description: "Full post text + link copied to clipboard.",
          })
        break

      case "download":
        if (o === "downloaded")
          toast({
            title: "Card saved!",
            description: "Share it anywhere.",
          })
        break

      case "native":
        // "shared" already handled above
        break

      case "majlis":
        if (o === "sent")
          toast({
            title: "Shared to Majlis!",
            description: "Your message has been sent.",
          })
        break
    }
  }

  // ── Platform handler ───────────────────────────────────────

  const handlePlatform = async (platform: SharePlatform) => {
    // Only "download" (Save Card) needs a loading state — it generates
    // a client-side card image. All other platforms are instant.
    if (platform === "download") {
      setGenerating("download")
      try {
        const result = await executeShare(context, platform)
        showResultToast(platform, result)
      } catch {
        // Silently fail
      }
      setGenerating(null)
      return
    }

    // All other platforms: open intent URL / copy — no image generation
    try {
      const result = await executeShare(context, platform)
      showResultToast(platform, result)

      if (
        showEmailGate &&
        onUnlock &&
        result.outcome !== "failed" &&
        result.outcome !== "cancelled"
      ) {
        onUnlock()
      }
    } catch {
      // Silently fail
    }

    if (platform === "copy") {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2500)
    } else {
      setTimeout(onClose, 400)
    }
  }

  // ── Majlis send handler ────────────────────────────────────

  const handleMajlisSend = async () => {
    if (!selectedChannel || !majlisToken) return
    setGenerating("majlis")
    try {
      const shareText = buildShareText(context, "generic")
      const content = majlisMessage.trim()
        ? `${majlisMessage.trim()} ${shareText}`
        : shareText

      const result = await executeShare(context, "majlis", {
        majlisChannelId: selectedChannel.id,
        majlisToken,
        majlisMessage: content,
      })
      showResultToast("majlis", result)
      if (result.outcome === "sent") {
        setMajlisSent(selectedChannel.displayName)
        if (
          showEmailGate &&
          onUnlock
        ) {
          onUnlock()
        }
        setTimeout(onClose, 1500)
      }
    } catch {
      // Silently fail
    }
    setGenerating(null)
  }

  // ── Email submit handler ───────────────────────────────────

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setEmailSubmitted(true)
    localStorage.setItem("tmh_email_submitted", "true")
    const baseUrl = (import.meta as any).env?.VITE_API_BASE_URL ?? ""
    fetch(`${baseUrl}/api/newsletter/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        source: "share_modal",
        newsletterOptIn,
      }),
    }).catch(() => {})
    if (onUnlock) onUnlock()
    setTimeout(onClose, 800)
  }

  // ── Majlis sub-view ────────────────────────────────────────

  const renderMajlisView = () => {
    if (majlisSent) {
      return (
        <div className="flex items-center gap-2 text-sm text-green-400 py-4 justify-center">
          <CheckCircle2 className="w-4 h-4" />
          Shared to {majlisSent}
        </div>
      )
    }

    if (channelsLoading) {
      return (
        <p className="text-sm text-muted-foreground text-center py-4">
          Loading channels...
        </p>
      )
    }

    if (channels.length === 0) {
      return (
        <p className="text-sm text-muted-foreground text-center py-4">
          No channels found
        </p>
      )
    }

    if (selectedChannel) {
      return (
        <div className="space-y-3">
          <button
            onClick={() => setSelectedChannel(null)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {selectedChannel.displayName}
          </button>
          <textarea
            value={majlisMessage}
            onChange={(e) => setMajlisMessage(e.target.value)}
            placeholder="Add a message (optional)"
            rows={2}
            maxLength={500}
            className="w-full bg-muted/20 border border-border text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 resize-none focus:outline-none focus:border-muted-foreground rounded-sm"
          />
          <button
            onClick={handleMajlisSend}
            disabled={isGeneratingAny}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer rounded-sm"
          >
            {generating === "majlis" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            {generating === "majlis" ? "Sending..." : "Send"}
          </button>
        </div>
      )
    }

    return (
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {channels.map((ch) => (
          <button
            key={ch.id}
            onClick={() => setSelectedChannel(ch)}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/30 transition-colors cursor-pointer rounded-sm"
          >
            {ch.type === "dm" ? (
              <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            ) : (
              <Hash className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            )}
            <span className="text-sm text-foreground truncate flex-1">
              {ch.displayName}
            </span>
            <Send className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        ))}
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center p-4"
      style={{
        background: "rgba(10,10,10,0.88)",
        backdropFilter: "blur(14px)",
      }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-[14px] p-8 sm:p-10 space-y-5 bg-background border border-primary/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close / Skip button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground font-serif cursor-pointer"
        >
          Skip &rarr;
        </button>

        {/* Heading + Body */}
        <div>
          <p
            className="font-serif font-black uppercase text-2xl tracking-tight text-foreground"
            style={{ fontSize: "2.1rem", lineHeight: 1.05 }}
          >
            {displayHeading}
          </p>
          <p className="text-[13px] text-muted-foreground font-sans mt-2 leading-relaxed">
            {displayBody}
          </p>
        </div>

        {/* Majlis sub-view */}
        {view === "majlis" ? (
          <div className="space-y-3">
            <button
              onClick={() => {
                setView("share")
                setSelectedChannel(null)
                setMajlisSent(null)
                setMajlisMessage("")
              }}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to share options
            </button>
            {renderMajlisView()}
          </div>
        ) : (
          <>
            {isMobile ? (
              <>
                {/* Mobile: social platform icons (no text) */}
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => handlePlatform("whatsapp")}
                    disabled={isGeneratingAny}
                    className="p-2 hover:opacity-70 transition-opacity cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-5 h-5 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handlePlatform("linkedin")}
                    disabled={isGeneratingAny}
                    className="p-2 hover:opacity-70 transition-opacity cursor-pointer disabled:opacity-50"
                  >
                    <Linkedin className="w-5 h-5 text-[#0A66C2]" />
                  </button>
                  <button
                    onClick={() => handlePlatform("x")}
                    disabled={isGeneratingAny}
                    className="p-2 hover:opacity-70 transition-opacity cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-5 h-5 text-foreground" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.732-8.853L2.16 2.25H8.08l4.213 5.567zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handlePlatform("instagram")}
                    disabled={isGeneratingAny}
                    className="p-2 hover:opacity-70 transition-opacity cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-5 h-5 text-[#E4405F]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 1 0 0-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 1 1-2.88 0 1.441 1.441 0 0 1 2.88 0z" />
                    </svg>
                  </button>
                </div>

                {/* Copy + Download as secondary options on mobile */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handlePlatform("copy")}
                    disabled={isGeneratingAny}
                    className="flex flex-col items-center gap-1.5 px-2 py-3 border border-border hover:border-primary/40 hover:bg-primary/5 transition-all duration-150 rounded-sm cursor-pointer disabled:opacity-50"
                  >
                    {linkCopied ? (
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    ) : (
                      <svg
                        className="w-4 h-4 text-muted-foreground"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                      </svg>
                    )}
                    <span className="text-[9px] uppercase tracking-[0.1em] font-bold text-muted-foreground font-serif">
                      {linkCopied ? "Copied!" : "Copy Link"}
                    </span>
                  </button>

                  {canGenerateCard(context) && (
                    <button
                      onClick={() => handlePlatform("download")}
                      disabled={isGeneratingAny}
                      className="flex flex-col items-center gap-1.5 px-2 py-3 border border-border hover:border-primary/40 hover:bg-primary/5 transition-all duration-150 rounded-sm cursor-pointer disabled:opacity-50"
                    >
                      {generating === "download" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="text-[9px] uppercase tracking-[0.1em] font-bold text-muted-foreground font-serif">
                        Save Card
                      </span>
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Desktop: explicit platform buttons */}
                <button
                  onClick={() => handlePlatform("whatsapp")}
                  disabled={isGeneratingAny}
                  className="w-full flex items-center justify-center gap-3 px-5 py-4 font-black uppercase tracking-[0.15em] text-[11px] transition-colors duration-150 rounded-sm bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] cursor-pointer hover:bg-[#25D366]/20 disabled:opacity-50"
                >
                  <svg
                    className="w-4 h-4 flex-shrink-0"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Share on WhatsApp
                </button>

                <div className="grid grid-cols-4 gap-2">
                  {[
                    {
                      label: "LinkedIn",
                      key: "linkedin" as SharePlatform,
                      icon: <Linkedin className="w-4 h-4 text-[#0A66C2]" />,
                    },
                    {
                      label: "X",
                      key: "x" as SharePlatform,
                      icon: (
                        <svg
                          className="w-4 h-4 text-foreground"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.732-8.853L2.16 2.25H8.08l4.213 5.567zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                      ),
                    },
                    {
                      label: "Instagram",
                      key: "instagram" as SharePlatform,
                      icon: (
                        <svg
                          className="w-4 h-4 text-[#E4405F]"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 1 0 0-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 1 1-2.88 0 1.441 1.441 0 0 1 2.88 0z" />
                        </svg>
                      ),
                    },
                    {
                      label: linkCopied ? "Copied!" : "Copy",
                      key: "copy" as SharePlatform,
                      icon: linkCopied ? (
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      ) : (
                        <svg
                          className="w-4 h-4 text-muted-foreground"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                        </svg>
                      ),
                    },
                  ].map((btn) => (
                    <button
                      key={btn.key}
                      onClick={() => handlePlatform(btn.key)}
                      disabled={isGeneratingAny}
                      className="flex flex-col items-center gap-1.5 px-2 py-3 border border-border hover:border-primary/40 hover:bg-primary/5 transition-all duration-150 rounded-sm cursor-pointer disabled:opacity-50"
                    >
                      {btn.icon}
                      <span className="text-[9px] uppercase tracking-[0.1em] font-bold text-muted-foreground font-serif">
                        {btn.label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Download card button — desktop only */}
                {canGenerateCard(context) && (
                  <button
                    onClick={() => handlePlatform("download")}
                    disabled={isGeneratingAny}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-[10px] uppercase tracking-widest font-bold font-serif border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors rounded-sm cursor-pointer disabled:opacity-50"
                  >
                    {generating === "download" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    Download Share Card
                  </button>
                )}
              </>
            )}

            {/* Share to Majlis — available on both mobile and desktop */}
            {majlisToken && (
              <button
                onClick={() => setView("majlis")}
                disabled={isGeneratingAny}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-[10px] uppercase tracking-widest font-bold font-serif border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors rounded-sm cursor-pointer disabled:opacity-50"
              >
                <Hash className="w-3.5 h-3.5" />
                Share to Majlis
              </button>
            )}

            {/* Email gate section */}
            {showEmailGate && !hasEmail && (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold font-serif">
                    or
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {emailSubmitted ? (
                  <div className="flex items-center gap-2 text-[11px] font-bold text-primary uppercase tracking-widest">
                    <CheckCircle2 className="w-4 h-4" />
                    Thanks!
                  </div>
                ) : (
                  <form onSubmit={handleEmailSubmit} className="flex gap-2">
                    <input
                      type="email"
                      required
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1 px-4 py-3 text-foreground text-sm font-sans focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground rounded-sm bg-secondary border border-border"
                    />
                    <button
                      type="submit"
                      className="px-5 py-3 text-white font-black uppercase tracking-[0.1em] text-[11px] hover:opacity-90 transition-opacity whitespace-nowrap rounded-sm font-serif bg-primary cursor-pointer"
                    >
                      Unlock Results
                    </button>
                  </form>
                )}

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newsletterOptIn}
                    onChange={(e) => setNewsletterOptIn(e.target.checked)}
                    className="w-3.5 h-3.5 rounded-sm accent-primary cursor-pointer"
                  />
                  <span className="text-[10px] text-muted-foreground font-sans">
                    Send me The Tribunal newsletter with insights &amp; results
                  </span>
                </label>
                <p className="text-[10px] text-muted-foreground font-sans">
                  No spam. Unsubscribe anytime.
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
