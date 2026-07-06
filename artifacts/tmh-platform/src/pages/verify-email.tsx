import { useEffect, useState } from "react"
import { Layout } from "@/components/layout/Layout"
import { Link } from "wouter"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { usePageTitle } from "@/hooks/use-page-title"
import { useQueryClient } from "@tanstack/react-query"
import { track } from "@/lib/analytics"

const API_BASE = import.meta.env?.VITE_API_BASE_URL ?? ""

export default function VerifyEmail() {
  usePageTitle({ title: "Verify Email — The Tribunal" })
  const qc = useQueryClient()
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading")
  const [signedUpAt, setSignedUpAt] = useState<number | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get("token")
    if (!token) {
      setStatus("error")
      return
    }

    // Capture how long after signup verification happened.
    const meQuery = qc.getQueryData<{ createdAt?: string } | null>(["auth", "me"])
    if (meQuery?.createdAt) {
      setSignedUpAt(new Date(meQuery.createdAt).getTime())
    }

    fetch(`${API_BASE}/api/auth/verify-email/${encodeURIComponent(token)}`, {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error("verify_failed")
        return res.json()
      })
      .then(() => {
        setStatus("ok")
        track("email_verification_completed", {
          hoursSinceSignup: signedUpAt ? (Date.now() - signedUpAt) / 3_600_000 : null,
        })
        qc.invalidateQueries({ queryKey: ["auth", "me"] })
      })
      .catch(() => setStatus("error"))
  }, [qc, signedUpAt])

  return (
    <Layout>
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        {status === "loading" && (
          <>
            <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary mb-6" />
            <p className="text-sm text-muted-foreground">Verifying your email…</p>
          </>
        )}
        {status === "ok" && (
          <>
            <CheckCircle2 className="w-12 h-12 mx-auto text-primary mb-6" />
            <h1 className="text-3xl font-serif font-black uppercase tracking-tight mb-2">
              Verified<span className="text-primary">.</span>
            </h1>
            <p className="text-sm text-muted-foreground mb-6">Your email is confirmed. You're all set.</p>
            <Link
              href="/"
              className="inline-block bg-primary text-white font-bold uppercase tracking-widest text-xs px-6 py-3 hover:bg-primary/90 font-serif"
            >
              Back to The Tribunal
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="w-12 h-12 mx-auto text-primary mb-6" />
            <h1 className="text-3xl font-serif font-black uppercase tracking-tight mb-2">
              Couldn't verify
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              The link is invalid or already used. Sign in and resend the verification from your account.
            </p>
            <Link
              href="/account"
              className="inline-block bg-primary text-white font-bold uppercase tracking-widest text-xs px-6 py-3 hover:bg-primary/90 font-serif"
            >
              Go to your account
            </Link>
          </>
        )}
      </div>
    </Layout>
  )
}
