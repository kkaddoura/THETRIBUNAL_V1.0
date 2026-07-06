import { useState } from "react"
import { Layout } from "@/components/layout/Layout"
import { Link } from "wouter"
import { CheckCircle2 } from "lucide-react"
import { usePageTitle } from "@/hooks/use-page-title"

const API_BASE = import.meta.env?.VITE_API_BASE_URL ?? ""

export default function ForgotPassword() {
  usePageTitle({ title: "Forgot Password — The Tribunal" })

  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      // Server always returns 200 to avoid revealing whether the email exists.
      await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
    } finally {
      setSubmitting(false)
      setDone(true)
    }
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-serif font-black uppercase tracking-tight">
            Forgot password<span className="text-primary">.</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-3">
            Enter your email — if an account exists, we'll send a reset link.
          </p>
        </div>

        {done ? (
          <div className="bg-card border border-border p-6 md:p-10 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 mx-auto text-primary" />
            <p className="font-bold uppercase tracking-widest text-sm">Check your inbox</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              If an account with that email exists, you'll receive a reset link within a minute. The link is valid for one hour.
            </p>
            <Link href="/login" className="inline-block mt-2 text-xs uppercase tracking-widest font-bold text-primary hover:underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 bg-card border border-border p-6 md:p-10">
            <div>
              <label className="block text-xs uppercase tracking-widest font-bold text-muted-foreground mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoCapitalize="none"
                required
                className="w-full bg-background border border-border px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary text-white font-bold uppercase tracking-widest text-sm py-3.5 hover:bg-primary/90 transition-colors font-serif disabled:opacity-60"
            >
              {submitting ? "Sending…" : "Send reset link"}
            </button>
            <p className="text-center text-xs text-muted-foreground">
              Remembered it?{" "}
              <Link href="/login" className="text-foreground hover:text-primary font-bold">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </Layout>
  )
}
