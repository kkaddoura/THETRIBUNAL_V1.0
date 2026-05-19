/**
 * Dismissible bottom-right banner that fires after the user has cast 3
 * anonymous votes in the session. Disappears when:
 *   - the user dismisses it (snoozed for 7 days via localStorage)
 *   - the user signs up / logs in (via useMe query)
 */

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Link } from "wouter"
import { X, ArrowRight } from "lucide-react"
import { useVoter } from "@/hooks/use-voter"
import { useMe } from "@/hooks/use-auth"
import { track } from "@/lib/analytics"

const DISMISS_KEY = "tmh_login_prompt_dismissed_at"
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const TRIGGER_AT = 3

function isSnoozed(): boolean {
  if (typeof window === "undefined") return true
  const raw = localStorage.getItem(DISMISS_KEY)
  if (!raw) return false
  const ts = Number(raw)
  if (!Number.isFinite(ts)) return false
  return Date.now() - ts < SNOOZE_MS
}

export function LoginPromptBanner() {
  const { totalVotesAllTime } = useVoter()
  const { data: user, isLoading: meLoading } = useMe()
  const [visible, setVisible] = useState(false)
  const [shownThisSession, setShownThisSession] = useState(false)

  useEffect(() => {
    // Don't fire while we're still figuring out whether the user is logged in
    // (otherwise authed users may briefly see the banner during page load).
    if (meLoading) return
    if (user) return
    if (shownThisSession) return
    if (isSnoozed()) return
    if (totalVotesAllTime < TRIGGER_AT) return

    const t = setTimeout(() => {
      setVisible(true)
      setShownThisSession(true)
      track("login_prompt_shown", { trigger: "post_3_votes", voteCount: totalVotesAllTime })
    }, 800)
    return () => clearTimeout(t)
  }, [totalVotesAllTime, user, shownThisSession, meLoading])

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setVisible(false)
    track("login_prompt_clicked", { action: "dismiss" })
  }

  if (meLoading || user) return null

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-4 left-4 right-4 z-[300] md:left-auto md:right-6 md:bottom-6 md:max-w-sm"
        >
          <div className="bg-card border border-primary/40 shadow-2xl p-5 relative">
            <button
              type="button"
              onClick={dismiss}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
            <p className="font-serif font-black uppercase text-sm text-foreground tracking-tight mb-2">
              Save your journey<span className="text-primary">.</span>
            </p>
            <p className="text-[14px] text-muted-foreground font-sans leading-relaxed mb-4">
              You've cast {totalVotesAllTime} votes. Sign up to keep them, build your profile, and pick up where you left off — on any device.
            </p>
            <div className="flex gap-2">
              <Link
                href={`/signup?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                onClick={() => track("login_prompt_clicked", { action: "signup" })}
                className="flex-1 bg-primary text-white font-bold uppercase tracking-widest text-[12px] px-4 py-2.5 hover:bg-primary/90 transition-colors font-serif inline-flex items-center justify-center gap-1.5"
              >
                Sign up
                <ArrowRight className="w-3 h-3" />
              </Link>
              <Link
                href={`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                onClick={() => track("login_prompt_clicked", { action: "login" })}
                className="flex-1 border border-border text-foreground font-bold uppercase tracking-widest text-[12px] px-4 py-2.5 hover:bg-secondary transition-colors font-serif inline-flex items-center justify-center"
              >
                Sign in
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
