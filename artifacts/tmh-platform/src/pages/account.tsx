import { useState, useEffect } from "react"
import { Layout } from "@/components/layout/Layout"
import { useLocation } from "wouter"
import { LogOut } from "lucide-react"
import { usePageTitle } from "@/hooks/use-page-title"
import { useMe, useLogout, useMyStats } from "@/hooks/use-auth"
import { track } from "@/lib/analytics"

const API_BASE = import.meta.env?.VITE_API_BASE_URL ?? ""

export default function Account() {
  usePageTitle({ title: "Your Account — The Tribunal" })
  const [, navigate] = useLocation()
  const { data: user, isLoading } = useMe()
  const { data: stats } = useMyStats(!!user)
  const logout = useLogout()

  const [resending, setResending] = useState(false)
  const [resendOk, setResendOk] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login?redirect=/account")
    }
  }, [user, isLoading, navigate])

  if (isLoading || !user) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="h-6 w-48 bg-secondary animate-pulse" />
        </div>
      </Layout>
    )
  }

  const resendVerification = async () => {
    setResending(true)
    setResendOk(false)
    try {
      const res = await fetch(`${API_BASE}/api/auth/resend-verification`, {
        method: "POST",
        credentials: "include",
      })
      if (res.ok) {
        setResendOk(true)
        track("email_verification_sent", { source: "resend" })
      }
    } finally {
      setResending(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-serif font-black uppercase tracking-tight mb-8">
          Your Account<span className="text-primary">.</span>
        </h1>

        <div className="space-y-8 bg-card border border-border p-6 md:p-10">
          <div className="flex items-center gap-5">
            <div>
              <p className="font-serif font-black text-xl uppercase tracking-tight">
                @{user.username}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{user.email}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Joined {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {!user.emailVerified && (
            <div className="border border-primary/40 bg-primary/5 px-4 py-3">
              <p className="text-xs text-foreground mb-2 font-medium">Verify your email to keep your account secure.</p>
              <button
                type="button"
                onClick={resendVerification}
                disabled={resending}
                className="text-xs text-primary hover:underline font-bold uppercase tracking-widest disabled:opacity-60"
              >
                {resending ? "Sending…" : resendOk ? "Sent — check your inbox" : "Resend verification"}
              </button>
            </div>
          )}

          <div>
            <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-3">
              Your activity
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-border px-4 py-3">
                <p className="font-serif font-black text-2xl tracking-tight">
                  {stats ? stats.pollVotes : "—"}
                </p>
                <p className="text-[12px] uppercase tracking-widest text-muted-foreground mt-1">
                  Debate votes
                </p>
              </div>
              <div className="border border-border px-4 py-3">
                <p className="font-serif font-black text-2xl tracking-tight">
                  {stats ? stats.predictionVotes : "—"}
                </p>
                <p className="text-[12px] uppercase tracking-widest text-muted-foreground mt-1">
                  Predictions
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <span
                className={`text-[12px] uppercase tracking-widest font-bold px-2 py-1 border ${user.emailVerified ? "border-primary/40 text-primary" : "border-border text-muted-foreground"}`}
              >
                Email {user.emailVerified ? "verified" : "unverified"}
              </span>
              <span
                className={`text-[12px] uppercase tracking-widest font-bold px-2 py-1 border ${user.newsletterOptIn ? "border-primary/40 text-primary" : "border-border text-muted-foreground"}`}
              >
                Newsletter {user.newsletterOptIn ? "subscribed" : "off"}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <button
              type="button"
              onClick={async () => {
                await logout.mutateAsync()
                navigate("/")
              }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary font-bold uppercase tracking-widest"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
