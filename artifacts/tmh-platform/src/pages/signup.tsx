import { useState, useEffect } from "react"
import { Layout } from "@/components/layout/Layout"
import { useLocation, Link } from "wouter"
import { Eye, EyeOff, Vote, ShieldCheck, Mail, Sparkles, ArrowRight } from "lucide-react"
import { usePageTitle } from "@/hooks/use-page-title"
import { useSignup } from "@/hooks/use-auth"
import { track } from "@/lib/analytics"

export default function Signup() {
  usePageTitle({
    title: "Sign Up — The Tribunal",
    description:
      "Create your account on The Tribunal. Build a journey of polls, predictions, and your voice in MENA's data-driven debate platform.",
  })
  const [, navigate] = useLocation()
  const signup = useSignup()

  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [newsletterOptIn, setNewsletterOptIn] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    track("signup_started", {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!username.trim() || !email.trim() || !password) {
      setError("All fields are required.")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    try {
      await signup.mutateAsync({
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
        newsletterOptIn,
      })
      const params = new URLSearchParams(window.location.search)
      const redirect = params.get("redirect") ?? "/"
      navigate(redirect)
    } catch (err) {
      const e = err as Error & { reason?: string }
      const map: Record<string, string> = {
        username_invalid:
          e.reason === "reserved"
            ? "That username is reserved."
            : "Username must be 3–20 lowercase letters, numbers, or underscores.",
        username_taken: "Username is taken. Try another.",
        email_taken: "An account with that email already exists.",
        email_invalid: "Enter a valid email address.",
        password_too_short: "Password must be at least 8 characters.",
      }
      setError(map[e.message] ?? "Sign up failed. Please try again.")
    }
  }

  return (
    <Layout>
      <div className="min-h-[calc(100vh-4rem)] grid lg:grid-cols-2">
        {/* ── Left: editorial pitch — always dark, theme-independent ─── */}
        <aside
          className="relative overflow-hidden hidden lg:flex flex-col justify-between p-10 xl:p-16"
          style={{ backgroundColor: "#0A0A0A", color: "#F2EDE4" }}
        >
          {/* Subtle backdrop accent */}
          <div
            aria-hidden="true"
            className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full bg-primary/10 blur-3xl pointer-events-none"
          />
          <div
            aria-hidden="true"
            className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
          />

          <div className="relative">
            <p className="text-[12px] uppercase tracking-[0.3em] font-bold text-primary mb-5 font-serif">
              By the Middle East Hustle
            </p>
            <h1
              className="font-display font-black uppercase tracking-tight leading-[0.95] text-5xl xl:text-6xl mb-6"
              style={{ color: "#F2EDE4" }}
            >
              Where the region<br />
              actually speaks<span className="text-primary">.</span>
            </h1>
            <p className="text-base xl:text-lg leading-relaxed max-w-md" style={{ color: "rgba(242,237,228,0.7)" }}>
              Anonymous votes, weekly predictions, and the founders, operators, and voices shaping MENA. Your account makes it yours.
            </p>
          </div>

          {/* Value props */}
          <ul className="relative space-y-5 my-10 max-w-md">
            <li className="flex items-start gap-4">
              <div
                className="flex-shrink-0 w-9 h-9 flex items-center justify-center"
                style={{ borderWidth: 1, borderColor: "rgba(242,237,228,0.25)" }}
              >
                <Vote className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-bold uppercase text-sm tracking-tight" style={{ color: "#F2EDE4" }}>
                  A journey, not a session.
                </p>
                <p className="text-xs leading-relaxed mt-0.5" style={{ color: "rgba(242,237,228,0.6)" }}>
                  Every vote, prediction, and streak follows you across devices.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div
                className="flex-shrink-0 w-9 h-9 flex items-center justify-center"
                style={{ borderWidth: 1, borderColor: "rgba(242,237,228,0.25)" }}
              >
                <ShieldCheck className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-bold uppercase text-sm tracking-tight" style={{ color: "#F2EDE4" }}>
                  Hybrid privacy.
                </p>
                <p className="text-xs leading-relaxed mt-0.5" style={{ color: "rgba(242,237,228,0.6)" }}>
                  Public sees your totals and badges. Your individual votes stay private.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div
                className="flex-shrink-0 w-9 h-9 flex items-center justify-center"
                style={{ borderWidth: 1, borderColor: "rgba(242,237,228,0.25)" }}
              >
                <Mail className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-bold uppercase text-sm tracking-tight" style={{ color: "#F2EDE4" }}>
                  Friday digest, on the house.
                </p>
                <p className="text-xs leading-relaxed mt-0.5" style={{ color: "rgba(242,237,228,0.6)" }}>
                  Top debates, predictions resolving, and the voice of the week. Auto-included, unsubscribe anytime.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div
                className="flex-shrink-0 w-9 h-9 flex items-center justify-center"
                style={{ borderWidth: 1, borderColor: "rgba(242,237,228,0.25)" }}
              >
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-bold uppercase text-sm tracking-tight" style={{ color: "#F2EDE4" }}>
                  First-come, first-served.
                </p>
                <p className="text-xs leading-relaxed mt-0.5" style={{ color: "rgba(242,237,228,0.6)" }}>
                  Pick your handle before someone else does. There's only one @khalid_92.
                </p>
              </div>
            </li>
          </ul>

          {/* Pull quote */}
          <figure className="relative border-l-2 border-primary pl-5 max-w-md">
            <blockquote
              className="text-base xl:text-lg leading-relaxed font-serif italic"
              style={{ color: "rgba(242,237,228,0.92)" }}
            >
              "The questions you can't ask out loud — collected anonymously, at scale."
            </blockquote>
            <figcaption
              className="text-[12px] uppercase tracking-[0.25em] font-bold mt-3 font-serif"
              style={{ color: "rgba(242,237,228,0.5)" }}
            >
              — The Tribunal, on the record
            </figcaption>
          </figure>
        </aside>

        {/* ── Right: form ─────────────────────────────────────────────── */}
        <main className="flex items-center justify-center bg-background py-10 px-4 sm:px-6 md:py-16">
          <div className="w-full max-w-md">
            {/* Mobile-only headline (the left aside is desktop-only) */}
            <div className="lg:hidden text-center mb-8">
              <p className="text-[12px] uppercase tracking-[0.3em] font-bold text-primary mb-3 font-serif">
                Join The Tribunal
              </p>
              <h1 className="font-display font-black uppercase tracking-tight text-4xl leading-[0.95]">
                Where the region<br />
                actually speaks<span className="text-primary">.</span>
              </h1>
            </div>

            <div className="bg-card border border-border p-6 md:p-8">
              <p className="text-[12px] uppercase tracking-[0.25em] font-bold text-primary mb-2 font-serif">
                Create account · 60 seconds
              </p>
              <h2 className="font-display font-black uppercase tracking-tight text-2xl md:text-3xl mb-6">
                Vote with a name<span className="text-primary">.</span>
              </h2>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-[12px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-1.5">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onBlur={(e) => {
                      if (e.target.value.trim()) track("signup_field_completed", { field: "username" })
                    }}
                    autoCapitalize="none"
                    placeholder="khalid_92"
                    className="w-full bg-background border border-border px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none transition-colors"
                    required
                  />
                  <p className="text-[12px] text-muted-foreground/70 mt-1.5 leading-relaxed">
                    3–20 chars · lowercase, numbers, underscores · first-come, first-served
                  </p>
                </div>

                <div>
                  <label className="block text-[12px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={(e) => {
                      if (e.target.value.trim()) track("signup_field_completed", { field: "email" })
                    }}
                    autoCapitalize="none"
                    placeholder="you@example.com"
                    className="w-full bg-background border border-border px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[12px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={(e) => {
                        if (e.target.value.length >= 8)
                          track("signup_field_completed", { field: "password" })
                      }}
                      placeholder="At least 8 characters"
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

                <label className="flex items-start gap-2.5 text-[13px] text-muted-foreground cursor-pointer leading-relaxed pt-1">
                  <input
                    type="checkbox"
                    checked={newsletterOptIn}
                    onChange={(e) => setNewsletterOptIn(e.target.checked)}
                    className="mt-0.5 accent-primary"
                  />
                  <span>
                    Send me the Friday digest with top debates and the voice of the week. <span className="text-muted-foreground/60">Unsubscribe anytime.</span>
                  </span>
                </label>

                {error && (
                  <div className="border border-primary/40 bg-primary/10 text-primary text-sm px-4 py-3 font-medium">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={signup.isPending}
                  className="w-full bg-primary text-white font-bold uppercase tracking-widest text-sm py-3.5 hover:bg-primary/90 transition-colors font-serif disabled:opacity-60 inline-flex items-center justify-center gap-2"
                >
                  {signup.isPending ? "Creating account…" : (
                    <>Create account <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>

                <p className="text-center text-xs text-muted-foreground pt-1">
                  Already a member?{" "}
                  <Link href="/login" className="text-foreground hover:text-primary font-bold">
                    Sign in
                  </Link>
                </p>
              </form>
            </div>

            {/* Trust strip */}
            <div className="mt-6 flex items-center justify-center gap-5 text-[12px] uppercase tracking-[0.2em] font-bold text-muted-foreground/70 font-serif">
              <span>Anonymous votes</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <span>Free forever</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <span>No spam</span>
            </div>
          </div>
        </main>
      </div>
    </Layout>
  )
}
