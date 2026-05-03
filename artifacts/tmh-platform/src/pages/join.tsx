import { useState } from "react"
import { useGetFeaturedPoll } from "@workspace/api-client-react"
import { PollCard } from "@/components/poll/PollCard"
import { Layout } from "@/components/layout/Layout"
import { Link } from "wouter"
import { usePageTitle } from "@/hooks/use-page-title"
import { useSiteSettings } from "@/hooks/use-cms-data"

export default function Join() {
  usePageTitle({
    title: "Join",
    description: "Join The Tribunal -- the anonymous platform for MENA's most important debates, predictions, and voices.",
  });
  const { data: poll, isLoading } = useGetFeaturedPoll()
  const { data: siteSettings } = useSiteSettings()
  const voicesEnabled = siteSettings?.featureToggles?.voices?.enabled ?? true
  const [email, setEmail] = useState("")
  const [joined, setJoined] = useState(() => !!localStorage.getItem("tmh_cta_joined"))

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    localStorage.setItem("tmh_cta_joined", email)
    fetch("/api/newsletter/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, source: "qr_join" }),
    }).catch((err) => {
      console.error("Subscribe failed:", err)
    })
    setJoined(true)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Minimal top bar — no full navbar on mobile per PRD */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border md:hidden">
        <Link href="/">
          <span className="font-display font-black text-2xl uppercase tracking-tight text-foreground">
            TMH<span className="text-primary">.</span>
          </span>
        </Link>
        <span className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground font-serif">
          The Tribunal
        </span>
      </div>

      {/* Desktop full navbar replacement */}
      <div className="hidden md:flex items-center justify-between px-8 py-4 border-b border-border">
        <Link href="/">
          <span className="font-display font-black text-3xl uppercase tracking-tight text-foreground hover:text-primary transition-colors">
            TMH<span className="text-primary">.</span>
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/debates" className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground font-serif">Debates</Link>
          {voicesEnabled && (
            <Link href="/voices" className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground font-serif">Voices</Link>
          )}
          <Link href="/about" className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground font-serif">About</Link>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-foreground text-background px-5 py-12 text-center">
        <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-primary mb-4 font-serif">
          You've just unlocked something real.
        </div>
        <h1 className="font-display font-black text-4xl md:text-6xl uppercase tracking-tight leading-none mb-4">
          Welcome to<br />The Tribunal<span className="text-primary">.</span>
        </h1>
        <p className="text-background/75 font-sans text-base max-w-md mx-auto">
          The most honest conversation in the Middle East. Join the founders, operators, and change-makers already voting.
        </p>
      </div>

      {/* Featured Poll */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
        <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-primary mb-4 flex items-center gap-2 font-serif">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          Today's Debate — Cast Your Vote
        </div>

        {isLoading ? (
          <div className="h-80 bg-secondary animate-pulse border border-border" />
        ) : poll ? (
          <PollCard poll={poll} />
        ) : (
          <div className="h-48 border border-border flex items-center justify-center text-muted-foreground text-sm font-sans">
            Loading today's debate…
          </div>
        )}

        {/* Email priority CTA */}
        <div className="mt-8 border-2 border-foreground p-6 md:p-8">
          <h2 className="font-display font-black uppercase text-2xl tracking-tight text-foreground mb-1">
            Join the Weekly Pulse.
          </h2>
          <p className="text-sm text-muted-foreground font-sans mb-5 leading-relaxed">
            Every Tuesday: one debate breakdown, one country split, one Voice you need to know. Free.
          </p>
          {joined ? (
            <div className="text-center py-6">
              <p className="font-display font-black text-3xl text-foreground uppercase">You're In<span className="text-primary">.</span></p>
              <p className="text-xs text-muted-foreground mt-1 font-serif uppercase tracking-widest">Watch your inbox Tuesday.</p>
            </div>
          ) : (
            <form onSubmit={handleJoin} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                autoFocus
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="flex-1 px-4 py-3 bg-background border border-border text-foreground text-sm font-sans focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/60"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-primary text-white font-black uppercase tracking-[0.15em] text-[11px] hover:bg-primary/90 transition-colors whitespace-nowrap"
              >
                Join The Tribunal
              </button>
            </form>
          )}
          <p className="text-[9px] text-muted-foreground font-sans mt-3">No spam. Unsubscribe anytime.</p>
        </div>

        <div className="mt-6 text-center border-t border-border pt-6">
          <Link href="/debates" className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground transition-colors font-serif">
            Browse All Debates →
          </Link>
        </div>
      </div>
    </div>
  )
}
