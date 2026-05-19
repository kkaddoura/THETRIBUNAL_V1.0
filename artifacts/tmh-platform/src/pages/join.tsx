import { useEffect, useState } from "react"
import { Layout } from "@/components/layout/Layout"
import { Link, useLocation } from "wouter"
import { ArrowRight, CheckCircle2, Mail, ShieldCheck, Vote } from "lucide-react"
import { usePageTitle } from "@/hooks/use-page-title"
import { useMe } from "@/hooks/use-auth"
import { track } from "@/lib/analytics"

const API_BASE = import.meta.env?.VITE_API_BASE_URL ?? ""

/**
 * Conversion page. Two paths in:
 *  1. Create an account (recommended — primary CTA)
 *  2. Newsletter-only (for QR / footer / apply-page traffic that's not ready
 *     to make an account)
 *
 * Auto-redirects to home if the user is already logged in.
 *
 * The previous version of this page had:
 *   - A bespoke top bar (broke the site nav)
 *   - A featured poll (off-topic for a join page)
 *   - QR-code landing copy ("you've unlocked something real")
 * All replaced with a coherent join surface that uses the standard Layout
 * and funnels into the new auth flow.
 */
export default function Join() {
  usePageTitle({
    title: "Join The Tribunal",
    description:
      "Join The Tribunal — anonymous votes, predictions, and voices on the topics shaping the Middle East. Free.",
  })

  const [, navigate] = useLocation()
  const { data: me, isLoading: meLoading } = useMe()
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [joined, setJoined] = useState(
    () => typeof window !== "undefined" && !!localStorage.getItem("tmh_cta_joined"),
  )

  // If already logged in, this page has nothing to offer — send them home.
  useEffect(() => {
    if (!meLoading && me) {
      navigate("/")
    }
  }, [me, meLoading, navigate])

  const handleNewsletterJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitting(true)
    try {
      await fetch(`${API_BASE}/api/newsletter/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), source: "join_page" }),
      })
      localStorage.setItem("tmh_cta_joined", email.trim().toLowerCase())
      track("newsletter_subscribed", { source: "join_page", optedIn: true })
      setJoined(true)
    } finally {
      setSubmitting(false)
    }
  }

  // Don't flash content for already-authed users mid-redirect
  if (meLoading || me) {
    return (
      <Layout>
        <div className="min-h-[60vh]" />
      </Layout>
    )
  }

  return (
    <Layout>
      {/* Hero */}
      <section className="bg-foreground text-background px-5 py-20 md:py-28 text-center">
        <p className="text-[12px] uppercase tracking-[0.3em] font-bold text-primary mb-4 font-serif">
          By the Middle East Hustle
        </p>
        <h1 className="font-display text-primary text-4xl md:text-6xl uppercase tracking-tight leading-none mb-5 max-w-3xl mx-auto">
          Where the region<br />
          actually speaks<span className="text-primary">.</span>
        </h1>
        <p className="text-background/75 font-sans text-base md:text-lg max-w-xl mx-auto leading-relaxed">
          Anonymous votes, weekly predictions, and the founders, operators, and voices
          shaping MENA. Free, on the record, no spin.
        </p>
      </section>

      {/* Primary CTA — create account */}
      <section className="max-w-2xl mx-auto w-full px-4 py-12 md:py-16">
        <div className="border-2 border-foreground bg-card p-6 md:p-10">
          <p className="text-[12px] uppercase tracking-[0.25em] font-bold text-primary mb-3 font-serif">
            Create an account
          </p>
          <h2 className="font-display font-black uppercase text-3xl md:text-4xl tracking-tight text-foreground mb-3">
            Vote with a name<span className="text-primary">.</span>
          </h2>
          <p className="text-sm md:text-base text-muted-foreground font-sans mb-6 leading-relaxed">
            Build a journey on The Tribunal. Your votes, predictions, and history follow you across devices. We keep your individual votes private — your public profile shows totals only.
          </p>

          <ul className="space-y-2.5 mb-7">
            <li className="flex items-start gap-2.5 text-sm">
              <Vote className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-foreground">Keep every vote, prediction, and streak across devices</span>
            </li>
            <li className="flex items-start gap-2.5 text-sm">
              <ShieldCheck className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-foreground">Hybrid privacy — public totals, private per-poll history</span>
            </li>
            <li className="flex items-start gap-2.5 text-sm">
              <Mail className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-foreground">Friday weekly digest, auto-included (unsubscribe anytime)</span>
            </li>
          </ul>

          <Link
            href="/signup"
            className="w-full bg-primary text-white font-bold uppercase tracking-widest text-sm py-3.5 hover:bg-primary/90 transition-colors font-serif inline-flex items-center justify-center gap-2"
          >
            Create my account
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-center text-xs text-muted-foreground mt-3">
            Already have one?{" "}
            <Link href="/login" className="text-foreground hover:text-primary font-bold">
              Sign in
            </Link>
          </p>
        </div>
      </section>

      {/* Secondary — newsletter only */}
      <section className="max-w-2xl mx-auto w-full px-4 pb-16 md:pb-24">
        <div className="border border-border bg-background p-6 md:p-8">
          <p className="text-[12px] uppercase tracking-[0.25em] font-bold text-muted-foreground mb-2 font-serif">
            Or just the digest
          </p>
          <h3 className="font-display font-black uppercase text-xl md:text-2xl tracking-tight text-foreground mb-2">
            Join the Weekly Pulse<span className="text-primary">.</span>
          </h3>
          <p className="text-xs md:text-sm text-muted-foreground font-sans mb-5 leading-relaxed">
            Every Friday morning: top debates, predictions resolving soon, and the voice of the week. No spam, unsubscribe anytime.
          </p>
          {joined ? (
            <div className="flex items-center gap-3 px-4 py-3 border border-primary/40 bg-primary/5">
              <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
              <div>
                <p className="font-bold uppercase text-sm tracking-tight text-foreground">You're in.</p>
                <p className="text-xs text-muted-foreground">Watch your inbox Friday morning Gulf time.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleNewsletterJoin} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-3 bg-card border border-border text-foreground text-sm font-sans focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/60"
              />
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-foreground text-background font-bold uppercase tracking-[0.15em] text-[13px] hover:bg-foreground/90 transition-colors whitespace-nowrap disabled:opacity-60"
              >
                {submitting ? "Subscribing…" : "Get the digest"}
              </button>
            </form>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/debates"
            className="text-[12px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground transition-colors font-serif"
          >
            Browse debates first →
          </Link>
        </div>
      </section>
    </Layout>
  )
}
