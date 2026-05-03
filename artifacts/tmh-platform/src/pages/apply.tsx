import { useState, useMemo, useRef, useEffect } from "react"
import { Layout } from "@/components/layout/Layout"
import { CheckCircle2, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePageConfig } from "@/hooks/use-cms-data"
import { usePageTitle } from "@/hooks/use-page-title"
import { TitlePunctuation } from "@/components/TitlePunctuation"

const FALLBACK_CRITERIA = [
  "Real, verifiable impact — named outcomes, not just job titles",
  "Based in MENA or with a deep, ongoing connection to the region",
  "A unique story — pivots, failures, non-linear journeys",
  "Built, led, or founded something tangible",
  "An original quote — specific to your experience, not a LinkedIn cliché",
  "A public profile verifiable on LinkedIn or in the press",
]

const FALLBACK_COUNTRIES = [
  "Algeria", "Bahrain", "Djibouti", "Egypt", "Iran", "Iraq",
  "Jordan", "Kuwait", "Lebanon", "Libya", "Mauritania", "Morocco",
  "Oman", "Palestine", "Qatar", "Saudi Arabia", "Somalia", "Sudan",
  "Syria", "Tunisia", "Turkey", "UAE", "Yemen", "Diaspora"
]

const FALLBACK_SECTORS = [
  "Technology / AI", "Fintech", "Startups & VC", "Media & Creative",
  "Healthcare / MedTech", "Education", "Real Estate", "Consulting",
  "Social Enterprise", "Government / Policy", "Arts & Culture", "Other"
]

interface ApplyConfig {
  hero?: { titleLine1?: string; titleLine2?: string; tagline?: string; subtitle?: string }
  criteria?: string[]
  countries?: string[]
  sectors?: string[]
  successMessage?: { title?: string; subtitle?: string; cta?: string }
  disclaimer?: string
  punctuations?: string[]
}

type Status = "idle" | "submitting" | "success" | "error"

export default function Apply() {
  usePageTitle({
    title: "Join The Voices",
    description: "Apply to become a featured voice on The Tribunal. Share your perspective with 541 million people across MENA.",
  });
  const [status, setStatus] = useState<Status>("idle")
  const [refNumber, setRefNumber] = useState("")
  const [wantsMajlis, setWantsMajlis] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get("ref") === "majlis"
  })
  const [form, setForm] = useState({
    name: "", email: "", title: "", company: "",
    city: "", country: "", sector: "",
    bio: "", quote: "", linkedin: "", impact: "",
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [countrySearch, setCountrySearch] = useState("")
  const [countryOpen, setCountryOpen] = useState(false)
  const [isOtherCountry, setIsOtherCountry] = useState(false)
  const countryRef = useRef<HTMLDivElement>(null)
  const { data: pageConfig } = usePageConfig<ApplyConfig>("apply")

  const hero = pageConfig?.hero
  const criteria = useMemo(() => pageConfig?.criteria?.length ? pageConfig.criteria : FALLBACK_CRITERIA, [pageConfig])
  const countries = useMemo(() => pageConfig?.countries?.length ? pageConfig.countries : FALLBACK_COUNTRIES, [pageConfig])
  const sectors = useMemo(() => pageConfig?.sectors?.length ? pageConfig.sectors : FALLBACK_SECTORS, [pageConfig])
  const successMsg = pageConfig?.successMessage
  const disclaimer = pageConfig?.disclaimer

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setCountryOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return countries
    return countries.filter(c => c.toLowerCase().includes(countrySearch.toLowerCase()))
  }, [countries, countrySearch])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [k]: e.target.value }))
    if (fieldErrors[k]) setFieldErrors(prev => { const next = { ...prev }; delete next[k]; return next })
  }

  const validate = (): Record<string, string> => {
    const errors: Record<string, string> = {}
    if (!form.name.trim()) errors.name = "Name is required"
    if (!form.email.trim()) errors.email = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Please enter a valid email"
    if (!form.title.trim()) errors.title = "Title is required"
    if (!form.company.trim()) errors.company = "Company is required"
    if (!form.country) errors.country = "Country is required"
    if (!form.sector) errors.sector = "Sector is required"
    if (!form.bio.trim()) errors.bio = "Tagline is required"
    if (!form.quote.trim()) errors.quote = "Quote is required"
    if (!form.impact.trim()) errors.impact = "Impact statement is required"
    if (!form.linkedin.trim()) errors.linkedin = "LinkedIn URL is required"
    else if (!/^https?:\/\/.+/.test(form.linkedin)) errors.linkedin = "Please enter a valid URL"
    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return
    setStatus("submitting")
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, wantsMajlis }),
      })
      if (!res.ok) throw new Error("Server error")
      const data = await res.json()
      localStorage.setItem("tmh_applied", "1")
      if (data.referenceNumber) setRefNumber(data.referenceNumber)
      setStatus("success")
    } catch {
      setStatus("error")
    }
  }

  return (
    <Layout>
      {/* Hero */}
      <div className="bg-foreground text-background py-16 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-primary mb-4 font-serif">{hero?.tagline || "The Voices"}</p>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "clamp(2rem, 5vw, 3.5rem)", textTransform: "uppercase", color: "var(--background)", letterSpacing: "-0.01em", lineHeight: 1.05, marginBottom: "0.5rem" }}>
            {hero?.titleLine1 || "Think You Belong"}<br />
            {hero?.titleLine2 || "In The Voices?"}<TitlePunctuation punctuations={pageConfig?.punctuations} />
          </h1>
          <p className="text-background/75 font-sans text-base mt-4 max-w-xl">
            {hero?.subtitle || "We're building the most credible founder directory in the Middle East. Not everyone makes the cut. The bar is high — because our audience is discerning."}
          </p>
        </div>
      </div>

      {/* Criteria */}
      <div className="border-b border-border bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
          <h2 className="font-serif font-black uppercase text-xl tracking-widest text-foreground mb-8 border-l-4 border-primary pl-4">
            The Bar
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {criteria.map((c, i) => (
              <div key={i} className="flex items-start gap-3 p-4 border border-border bg-card">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm font-sans text-foreground/80 leading-relaxed">{c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form or Success */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        {status === "success" ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 border-2 border-primary mb-8">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-display font-black text-4xl uppercase tracking-tight text-foreground mb-4">
              {successMsg?.title || "Application Received."}
            </h2>
            {refNumber && (
              <p className="text-xs uppercase tracking-[0.2em] font-bold text-primary font-serif mb-4">
                Reference: {refNumber}
              </p>
            )}
            <p className="text-lg text-muted-foreground font-sans max-w-md mx-auto mb-2">
              {successMsg?.subtitle || "We are reviewing your application. You'll hear back within 48 hours."}
            </p>
            <p className="text-sm text-muted-foreground font-sans">
              In the meantime — go vote on something that matters.
            </p>
            <a
              href="/join"
              className="inline-flex items-center gap-2 mt-8 bg-primary text-white font-bold uppercase tracking-widest text-xs px-8 py-3 hover:bg-primary/90 transition-colors"
            >
              {successMsg?.cta || "Join The Tribunal"} <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-10">
            <div>
              <h2 className="font-serif font-black uppercase text-xl tracking-widest text-foreground mb-8 border-l-4 border-primary pl-4">
                Your Details
              </h2>
              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Full Name *">
                  <input type="text" placeholder="Your full name" value={form.name} onChange={set("name")}
                    className={cn(inputCn, fieldErrors.name && inputErrorCn)} />
                  {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
                </Field>
                <Field label="Email *">
                  <input type="text" placeholder="you@company.com" value={form.email} onChange={set("email")}
                    className={cn(inputCn, fieldErrors.email && inputErrorCn)} />
                  {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
                </Field>
                <Field label="Title / Role *">
                  <input type="text" placeholder="Your title" value={form.title} onChange={set("title")}
                    className={cn(inputCn, fieldErrors.title && inputErrorCn)} />
                  {fieldErrors.title && <p className="text-xs text-red-500 mt-1">{fieldErrors.title}</p>}
                </Field>
                <Field label="Company / Organisation *">
                  <input type="text" placeholder="Your company" value={form.company} onChange={set("company")}
                    className={cn(inputCn, fieldErrors.company && inputErrorCn)} />
                  {fieldErrors.company && <p className="text-xs text-red-500 mt-1">{fieldErrors.company}</p>}
                </Field>
                <Field label="City">
                  <input type="text" placeholder="Your city" value={form.city} onChange={set("city")}
                    className={inputCn} />
                </Field>
                <Field label="Country *">
                  <div ref={countryRef} className="relative">
                    {isOtherCountry ? (
                      <>
                        <div
                          onClick={() => { setIsOtherCountry(false); setForm(prev => ({ ...prev, country: "" })); setCountrySearch(""); }}
                          className={cn(inputCn, "cursor-pointer text-primary font-bold flex items-center justify-between")}
                        >
                          Other
                          <span className="text-xs text-muted-foreground font-normal">click to change</span>
                        </div>
                        <input
                          type="text"
                          placeholder="Type your country…"
                          value={form.country}
                          onChange={set("country")}
                          className={cn(inputCn, "mt-2")}
                          autoFocus
                        />
                      </>
                    ) : (
                      <>
                        <input
                          type="text"
                          placeholder="Search country…"
                          value={countrySearch}
                          onChange={(e) => {
                            setCountrySearch(e.target.value)
                            setCountryOpen(true)
                            setForm(prev => ({ ...prev, country: "" }))
                          }}
                          onFocus={() => setCountryOpen(true)}
                          className={inputCn}
                        />
                        {countryOpen && (
                          <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-background border border-border">
                            {filteredCountries.map(c => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => {
                                  setForm(prev => ({ ...prev, country: c }))
                                  setCountrySearch(c)
                                  setCountryOpen(false)
                                }}
                                className="w-full text-left px-4 py-2 text-sm font-sans text-foreground hover:bg-primary/10 transition-colors"
                              >
                                {c}
                              </button>
                            ))}
                            {filteredCountries.length === 0 && countrySearch.trim() && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsOtherCountry(true)
                                  setCountryOpen(false)
                                  setForm(prev => ({ ...prev, country: "" }))
                                }}
                                className="w-full text-left px-4 py-2 text-sm font-sans text-primary font-bold hover:bg-primary/10 transition-colors"
                              >
                                Other — type your country
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  {fieldErrors.country && <p className="text-xs text-primary mt-1">{fieldErrors.country}</p>}
                </Field>
                <Field label="Sector *" required className="sm:col-span-2">
                  <select required value={form.sector} onChange={set("sector")} className={inputCn}>
                    <option value="">Select sector…</option>
                    {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {fieldErrors.sector && <p className="text-xs text-primary mt-1">{fieldErrors.sector}</p>}
                </Field>
              </div>
            </div>

            <div>
              <h2 className="font-serif font-black uppercase text-xl tracking-widest text-foreground mb-8 border-l-4 border-primary pl-4">
                Your Story
              </h2>
              <div className="space-y-5">
                <Field label="One-Line Tagline *" required hint="Max 50 words. Think: 'Built X, scaled it to Y, now building Z.' Specific. Punchy. No LinkedIn clichés.">
                  <textarea required rows={3} value={form.bio} onChange={set("bio")}
                    placeholder="e.g. 'Co-founded MUNCH:ON (2017), scaled to 50,000 corporate users across the Gulf, sold to Careem in 2022. Now building the next one.'"
                    className={cn(inputCn, "resize-none")} />
                  {fieldErrors.bio && <p className="text-xs text-primary mt-1">{fieldErrors.bio}</p>}
                </Field>
                <Field label="Signature Quote *" required hint="One sentence. First person. Specific to your experience. Not a motivational poster.">
                  <input required type="text" value={form.quote} onChange={set("quote")}
                    placeholder='"The best time to build in the Middle East was 10 years ago. The second best time is now." — make it yours.'
                    className={inputCn} />
                  {fieldErrors.quote && <p className="text-xs text-primary mt-1">{fieldErrors.quote}</p>}
                </Field>
                <Field label="Impact Statement *" required hint="What is the one most impressive thing you have built, led, or achieved?">
                  <textarea required rows={3} value={form.impact} onChange={set("impact")}
                    placeholder="Named outcomes: revenue generated, users reached, employees hired, exits completed, publications, awards."
                    className={cn(inputCn, "resize-none")} />
                  {fieldErrors.impact && <p className="text-xs text-primary mt-1">{fieldErrors.impact}</p>}
                </Field>
              </div>
            </div>

            <div>
              <h2 className="font-serif font-black uppercase text-xl tracking-widest text-foreground mb-8 border-l-4 border-primary pl-4">
                Verification
              </h2>
              <Field label="LinkedIn Profile URL *" required hint="Must match your name and current role.">
                <input required type="url" placeholder="https://linkedin.com/in/yourprofile" value={form.linkedin} onChange={set("linkedin")}
                  className={inputCn} />
                {fieldErrors.linkedin && <p className="text-xs text-primary mt-1">{fieldErrors.linkedin}</p>}
              </Field>
            </div>

            <div className="border border-border bg-card p-5">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={wantsMajlis}
                  onChange={e => setWantsMajlis(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-primary flex-shrink-0"
                />
                <div>
                  <span className="text-sm font-bold text-foreground">Join The Majlis</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Get access to our private chat room for verified voices across MENA. If approved, you'll receive an invite via email.
                  </p>
                </div>
              </label>
            </div>

            <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-6">
              <p className="text-xs text-muted-foreground font-sans leading-relaxed max-w-sm">
                {disclaimer || "By submitting you agree to The Tribunal's editorial standards. Applications are reviewed by our AI scoring system within minutes, then by our editorial team within 48 hours."}
              </p>
              <button
                type="submit"
                disabled={status === "submitting"}
                className={cn(
                  "flex items-center gap-3 bg-primary text-white font-black uppercase tracking-[0.2em] text-sm px-10 py-4 transition-colors",
                  status === "submitting" ? "opacity-60 cursor-not-allowed" : "hover:bg-primary/90"
                )}
              >
                {status === "submitting" ? "Submitting…" : (
                  <>Submit Application <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>

            {status === "error" && (
              <p className="text-sm text-primary font-sans">Something went wrong. Please try again or email us directly.</p>
            )}
          </form>
        )}
      </div>
    </Layout>
  )
}

const inputCn = "w-full px-4 py-3 bg-background border border-border focus:outline-none focus:border-primary text-foreground text-sm font-sans transition-colors placeholder:text-muted-foreground/60 appearance-none"
const inputErrorCn = "border-red-500 focus:border-red-500"

function Field({ label, required, hint, children, className }: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-foreground font-serif">
        {label}
      </label>
      {hint && <p className="text-[11px] text-muted-foreground font-sans mb-1">{hint}</p>}
      {children}
    </div>
  )
}
