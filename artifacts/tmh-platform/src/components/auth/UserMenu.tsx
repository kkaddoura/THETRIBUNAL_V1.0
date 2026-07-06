/**
 * Header right-side widget. Shows "Sign in" when logged out, the user's
 * avatar + dropdown when logged in.
 */

import { useState } from "react"
import { Link, useLocation } from "wouter"
import { LogOut, User as UserIcon, ChevronDown } from "lucide-react"
import { useMe, useLogout } from "@/hooks/use-auth"

export function UserMenu() {
  const { data: user, isLoading } = useMe()
  const logout = useLogout()
  const [, navigate] = useLocation()
  const [open, setOpen] = useState(false)

  if (isLoading) return null

  if (!user) {
    return (
      <Link
        href="/login"
        className="group inline-flex items-center gap-1.5 border border-border hover:border-foreground bg-background hover:bg-foreground text-foreground hover:text-background text-[13px] font-bold uppercase tracking-[0.15em] px-3 py-1.5 transition-colors font-serif"
      >
        <UserIcon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Sign in</span>
      </Link>
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="text-xs uppercase tracking-widest font-bold hidden sm:inline">
          @{user.username}
        </span>
        <ChevronDown className="w-3 h-3 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-[200]"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            role="menu"
            className="absolute right-0 mt-2 w-48 bg-card border border-border shadow-2xl z-[201] py-1"
          >
            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-xs uppercase tracking-widest font-bold text-foreground hover:bg-secondary transition-colors"
            >
              <UserIcon className="w-3.5 h-3.5" />
              Your account
            </Link>
            <button
              type="button"
              onClick={async () => {
                setOpen(false)
                await logout.mutateAsync()
                navigate("/")
              }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs uppercase tracking-widest font-bold text-foreground hover:bg-secondary transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}
