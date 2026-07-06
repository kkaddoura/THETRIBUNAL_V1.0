/**
 * Slim header strip nudging logged-in users with unverified email to verify.
 * Nag-only: doesn't gate any action. Hidden once they verify or dismiss.
 *
 * Mounted INSIDE Navbar's fixed wrapper so it stacks visually with the nav
 * row instead of being hidden behind it. Dismissal goes through the shared
 * `useEmailVerifyBanner` hook so Layout's top padding updates in lockstep.
 */

import { Link } from "wouter"
import { X } from "lucide-react"
import { useMe } from "@/hooks/use-auth"
import { dismissEmailVerifyBanner, useEmailVerifyBanner } from "@/hooks/use-email-verify-banner"

export function EmailUnverifiedBanner() {
  const { data: user } = useMe()
  const { visible } = useEmailVerifyBanner()

  if (!visible || !user) return null

  return (
    <div className="bg-primary/95 text-white text-xs px-4 py-2.5 flex items-center justify-center gap-3 relative">
      <span>
        <span className="font-bold uppercase tracking-widest mr-2">Verify your email</span>
        We sent a link to {user.email}.{" "}
        <Link href="/account" className="underline font-bold">
          Resend
        </Link>
      </span>
      <button
        type="button"
        onClick={dismissEmailVerifyBanner}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
