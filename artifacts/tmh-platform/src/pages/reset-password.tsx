import { useEffect, useState } from "react"
import { Layout } from "@/components/layout/Layout"
import { Link, useLocation } from "wouter"
import { Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react"
import { usePageTitle } from "@/hooks/use-page-title"

const API_BASE = import.meta.env?.VITE_API_BASE_URL ?? ""

export default function ResetPassword() {
  usePageTitle({ title: "Reset Password — The Tribunal" })
  const [, navigate] = useLocation()

  const [token, setToken] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setToken(params.get("token"))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!token) {
      setError("Reset link is missing or invalid.")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (password !== confirm) {
      setError("Passwords don't match.")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data.error === "invalid_or_expired") {
          setError("That reset link has expired or already been used. Request a new one.")
        } else if (data.error === "password_too_short") {
          setError("Password must be at least 8 characters.")
        } else {
          setError("Something went wrong. Please try again.")
        }
        return
      }
      setDone(true)
      setTimeout(() => navigate("/login"), 2500)
    } finally {
      setSubmitting(false)
    }
  }

  if (!token && typeof window !== "undefined") {
    return (
      <Layout>
        <div className="max-w-md mx-auto px-4 py-24 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-primary mb-6" />
          <h1 className="text-3xl font-serif font-black uppercase tracking-tight mb-2">Invalid link</h1>
          <p className="text-sm text-muted-foreground mb-6">
            This page needs a token. Request a fresh reset link.
          </p>
          <Link
            href="/forgot-password"
            className="inline-block bg-primary text-white font-bold uppercase tracking-widest text-xs px-6 py-3 hover:bg-primary/90 font-serif"
          >
            Request reset link
          </Link>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-serif font-black uppercase tracking-tight">
            New password<span className="text-primary">.</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-3">Pick something strong. You'll be signed out everywhere after this.</p>
        </div>

        {done ? (
          <div className="bg-card border border-border p-6 md:p-10 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 mx-auto text-primary" />
            <p className="font-bold uppercase tracking-widest text-sm">Password reset</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Redirecting you to sign in…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 bg-card border border-border p-6 md:p-10">
            <div>
              <label className="block text-xs uppercase tracking-widest font-bold text-muted-foreground mb-2">
                New password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-background border border-border px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none transition-colors pr-12"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest font-bold text-muted-foreground mb-2">
                Confirm password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full bg-background border border-border px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none transition-colors"
                required
                minLength={8}
              />
            </div>
            {error && (
              <div className="border border-primary/40 bg-primary/10 text-primary text-sm px-4 py-3 font-medium">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary text-white font-bold uppercase tracking-widest text-sm py-3.5 hover:bg-primary/90 transition-colors font-serif disabled:opacity-60"
            >
              {submitting ? "Resetting…" : "Reset password"}
            </button>
          </form>
        )}
      </div>
    </Layout>
  )
}
