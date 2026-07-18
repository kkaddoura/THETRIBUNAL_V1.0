import { Link } from "wouter"
import { Layout } from "@/components/layout/Layout"
import { useI18n } from "@/lib/i18n"
import { usePageConfig, useSiteSettings } from "@/hooks/use-cms-data"
import { usePageTitle } from "@/hooks/use-page-title"
import { TitlePunctuation } from "@/components/TitlePunctuation"
import { PageIndex } from "@/components/layout/PageIndex"

interface AboutStat { value: string; label: string }
interface AboutStep { num: string; title: string; body: string }

export type AboutSectionType = "text" | "stats" | "steps" | "quote" | "cta"
export interface AboutSection {
  id: string
  type: AboutSectionType
  enabled?: boolean
  heading?: string
  // text
  lead?: string
  body?: string
  note?: string
  // stats
  paragraphs?: string
  regionLine?: string
  stats?: AboutStat[]
  // steps
  steps?: AboutStep[]
  // quote
  quote?: string
  author?: string
  // cta
  subcopy?: string
  primaryLabel?: string
  primaryHref?: string
  secondaryLabel?: string
  secondaryHref?: string
}

interface AboutConfig {
  hero?: { tagline?: string; titleLine1?: string; titleLine2?: string; subtitle?: string; microcopy?: string }
  punctuations?: string[]
  sections?: AboutSection[]
  // legacy (pre section-builder) keys — normalized below for back-compat
  whatIsIt?: { heading?: string; lead?: string; body?: string; negations?: string[]; note?: string; accountNote?: string }
  sharpestRead?: { heading?: string; paragraphs?: string; regionLine?: string; stats?: AboutStat[] }
  howItWorks?: { heading?: string; steps?: AboutStep[] }
  founderStatement?: { heading?: string; text?: string; author?: string; quote?: string }
  finalCta?: { heading?: string; subcopy?: string; primaryLabel?: string; primaryHref?: string; secondaryLabel?: string; secondaryHref?: string }
}

const HERO_DEFAULTS = {
  tagline: "Est. 2026 · The Tribunal",
  titleLine1: "A place to say what people",
  titleLine2: "usually keep private",
  subtitle: "The sharpest read on what the region really thinks.",
  microcopy: "No names attached. No public performance. Just the result.",
}

// Default body, as the dynamic section list. The client can add/reorder/remove
// these from the CMS. Kept identical to the previous fixed layout.
export const DEFAULT_ABOUT_SECTIONS: AboutSection[] = [
  {
    id: "what-is-it",
    type: "text",
    enabled: true,
    heading: "What is The Tribunal?",
    lead: "The Tribunal is a private voting platform for the Middle East and North Africa.",
    body: "We ask the questions people usually avoid in public. People vote privately. The results are shown publicly.\n\nIt is a sharper way to see what people actually think when their names are not attached.\n\nIt is not a news site.\n\nIt is not a think tank.\n\nIt is not a comment section.\n\nYou can vote without creating an account. If you sign up, you can save your activity, view previous votes and predictions, and continue from another device.",
    note: "Private does not mean fake. If it is not human, it does not count.",
  },
  {
    id: "the-sharpest-read",
    type: "stats",
    enabled: true,
    heading: "The sharpest read on the region.",
    paragraphs: "Public conversations are usually polished.\n\nPrivate conversations are usually honest.\n\nThe Tribunal exists to close that gap.\n\nEvery question is designed to surface a clearer signal: what people believe, what they expect, and where the region is shifting.",
    regionLine: "19 countries. One regional lens.",
    stats: [
      { value: "100+", label: "Live Questions" },
      { value: "19", label: "Countries Covered" },
      { value: "Private", label: "Votes" },
      { value: "Public", label: "Results" },
    ],
  },
  {
    id: "how-it-works",
    type: "steps",
    enabled: true,
    heading: "How The Tribunal Works",
    steps: [
      { num: "01", title: "Choose a question.", body: "Debates ask what people believe. Predictions ask what people think will happen." },
      { num: "02", title: "Vote privately.", body: "Your name and email are not shown with your vote." },
      { num: "03", title: "See the result.", body: "Results are shown publicly in aggregate, with country and topic breakdowns where enough data exists." },
      { num: "04", title: "Save your activity.", body: "You can vote without an account. If you sign up, you can view previous votes, track predictions and continue from another device." },
      { num: "05", title: "Go deeper.", body: "Pulse adds sourced public signals. Voices profiles people with a view worth recording. The Gallery creates a private room for serious conversation." },
      { num: "06", title: "Trust the process.", body: "Questions are human reviewed. Results are opinion signals, not scientific polling. No bots. No sponsored sentiment. No fake activity." },
    ],
  },
  {
    id: "from-the-founder",
    type: "quote",
    enabled: true,
    heading: "From the Founder",
    body: "This started with a question I kept asking in private rooms:\n\nWhat does the region actually think?\n\nNot what people say in public. Not what people post for approval. Not what leaders claim. Not what outsiders assume.\n\nWhat people actually think.\n\nThe Tribunal does not speak for the region. It records what people say when they can answer honestly.",
    quote: "\"People do not lack opinions. They lack a place to say them honestly.\"",
    author: "Kareem Kaddoura, Founder",
  },
  {
    id: "final-cta",
    type: "cta",
    enabled: true,
    heading: "See where you stand.",
    subcopy: "Vote privately. See the result publicly.",
    primaryLabel: "Cast Your Vote",
    primaryHref: "/debates",
    secondaryLabel: "Make a Prediction",
    secondaryHref: "/predictions",
  },
]

/**
 * Accept either the new `sections` array or the legacy fixed-key shape and
 * always return a section list, so old saved configs keep rendering identically.
 */
export function resolveAboutSections(cfg?: AboutConfig | null): AboutSection[] {
  if (cfg?.sections?.length) return cfg.sections
  if (!cfg) return DEFAULT_ABOUT_SECTIONS
  const hasLegacy = cfg.whatIsIt || cfg.sharpestRead || cfg.howItWorks || cfg.founderStatement || cfg.finalCta
  if (!hasLegacy) return DEFAULT_ABOUT_SECTIONS
  const out: AboutSection[] = []
  if (cfg.whatIsIt) {
    const w = cfg.whatIsIt
    const bodyParts = [w.body, ...(w.negations ?? []), w.accountNote].filter(Boolean) as string[]
    out.push({ id: "what-is-it", type: "text", enabled: true, heading: w.heading, lead: w.lead, body: bodyParts.join("\n\n"), note: w.note })
  }
  if (cfg.sharpestRead) {
    const s = cfg.sharpestRead
    out.push({ id: "the-sharpest-read", type: "stats", enabled: true, heading: s.heading, paragraphs: s.paragraphs, regionLine: s.regionLine, stats: s.stats })
  }
  if (cfg.howItWorks) {
    out.push({ id: "how-it-works", type: "steps", enabled: true, heading: cfg.howItWorks.heading, steps: cfg.howItWorks.steps })
  }
  if (cfg.founderStatement) {
    const f = cfg.founderStatement
    out.push({ id: "from-the-founder", type: "quote", enabled: true, heading: f.heading, body: f.text, quote: f.quote, author: f.author })
  }
  if (cfg.finalCta) {
    const c = cfg.finalCta
    out.push({ id: "final-cta", type: "cta", enabled: true, heading: c.heading, subcopy: c.subcopy, primaryLabel: c.primaryLabel, primaryHref: c.primaryHref, secondaryLabel: c.secondaryLabel, secondaryHref: c.secondaryHref })
  }
  return out.length ? out : DEFAULT_ABOUT_SECTIONS
}

const paras = (s?: string) => (s || "").split("\n\n").map((p) => p.trim()).filter(Boolean)

export default function About() {
  usePageTitle({
    title: "About",
    description: "The Tribunal is a private voting platform for the Middle East and North Africa. People vote privately. Results are shown publicly.",
  });
  const { t, isAr } = useI18n()
  const { data: pageConfig } = usePageConfig<AboutConfig>("about")
  const { data: siteSettings } = useSiteSettings()
  const voicesEnabled = siteSettings?.featureToggles?.voices?.enabled ?? false
  const majlisEnabled = siteSettings?.featureToggles?.majlis?.enabled ?? false
  const pulseEnabled = siteSettings?.featureToggles?.pulse?.enabled ?? false

  const hero = { ...HERO_DEFAULTS, ...pageConfig?.hero }
  const sections = resolveAboutSections(pageConfig).filter((s) => s.enabled !== false)

  // The "on this page" index is derived from whatever sections exist (with a heading).
  const pageSections = sections
    .filter((s) => s.heading?.trim())
    .map((s) => ({ id: s.id, label: t(s.heading as string) }))

  return (
    <Layout>
      {pageSections.length > 0 && <PageIndex sections={pageSections} />}

      {/* Hero (fixed masthead) */}
      <div className="bg-foreground text-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.28em", color: "#DC143C", marginBottom: "0.5rem" }}>
            {t(hero.tagline)}
          </p>
          <h1 style={{ fontFamily: isAr ? "'IBM Plex Sans Arabic', sans-serif" : "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "clamp(2rem, 5vw, 3.5rem)", textTransform: "uppercase", color: "hsl(var(--background))", letterSpacing: "-0.01em", lineHeight: 1.05, marginBottom: "0.5rem" }}>
            {t(hero.titleLine1)}<br />
            {t(hero.titleLine2)}<TitlePunctuation punctuations={pageConfig?.punctuations} />
          </h1>
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "0.90rem", textTransform: "uppercase", letterSpacing: "0.18em" }}>
            {t(hero.subtitle)}
          </p>
          {hero.microcopy?.trim() && (
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.83rem", letterSpacing: "0.04em", opacity: 0.6, marginTop: "0.85rem" }}>
              {t(hero.microcopy)}
            </p>
          )}
        </div>
      </div>

      {/* Dynamic, CMS-managed sections */}
      {sections.map((section) => (
        <AboutSectionView
          key={section.id}
          section={section}
          t={t}
          pulseEnabled={pulseEnabled}
          voicesEnabled={voicesEnabled}
          majlisEnabled={majlisEnabled}
        />
      ))}
    </Layout>
  )
}

function AboutSectionView({
  section, t, pulseEnabled, voicesEnabled, majlisEnabled,
}: {
  section: AboutSection
  t: (s: string) => string
  pulseEnabled: boolean
  voicesEnabled: boolean
  majlisEnabled: boolean
}) {
  if (section.type === "text") {
    return (
      <div id={section.id} className="max-w-3xl mx-auto px-4 py-20 border-b border-border scroll-mt-24">
        {section.heading?.trim() && (
          <h2 className="font-serif font-black uppercase text-2xl text-foreground mb-8 border-l-4 border-primary pl-4">{t(section.heading)}</h2>
        )}
        {section.lead?.trim() && (
          <p className="text-xl font-sans leading-relaxed text-foreground mb-8">{t(section.lead)}</p>
        )}
        {paras(section.body).map((p, i) => (
          <p key={i} className="text-base text-muted-foreground font-sans leading-relaxed mb-6">{t(p)}</p>
        ))}
        {section.note?.trim() && (
          <p className="text-sm font-serif italic text-foreground/70 leading-relaxed border-l-2 border-primary/60 pl-4 mt-6">{t(section.note)}</p>
        )}
      </div>
    )
  }

  if (section.type === "stats") {
    const ps = paras(section.paragraphs)
    const stats = section.stats?.length ? section.stats : []
    return (
      <div id={section.id} className="bg-secondary/10 border-b border-border scroll-mt-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          {section.heading?.trim() && (
            <h2 className="font-serif font-black uppercase text-3xl border-b-2 border-foreground pb-4 mb-8 text-foreground">{t(section.heading)}</h2>
          )}
          <div className="max-w-3xl space-y-6 mb-12">
            {ps.map((p, i) => (
              <p key={i} className={`text-lg text-foreground font-sans leading-relaxed${i === 2 ? " font-bold" : ""}`}>{t(p)}</p>
            ))}
            {section.regionLine?.trim() && (
              <p className="text-sm font-serif italic text-foreground/70 mt-6">{t(section.regionLine)}</p>
            )}
          </div>
          {stats.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center bg-foreground text-background py-12 px-4">
              {stats.map((stat, i) => {
                const isNumeric = /[0-9]/.test(stat.value)
                return (
                  <div key={i}>
                    <div className={`font-serif font-black leading-none mb-2 ${isNumeric ? "text-4xl md:text-5xl" : "text-2xl md:text-3xl pt-2"}`}>
                      {isNumeric ? stat.value : t(stat.value)}
                    </div>
                    <div className="text-[12px] uppercase tracking-[0.2em] font-serif text-primary">{t(stat.label)}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (section.type === "steps") {
    const steps = section.steps?.length ? section.steps : []
    return (
      <div id={section.id} className="py-20 bg-secondary/20 border-b border-border scroll-mt-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {section.heading?.trim() && (
            <h2 className="font-serif font-black uppercase text-3xl border-b-2 border-foreground pb-4 mb-12 text-foreground">{t(section.heading)}</h2>
          )}
          <div className="grid md:grid-cols-2 gap-10">
            {steps.map((s, i) => (
              <div key={i} className="relative">
                <span className="text-6xl font-serif font-black text-gray-900/20 dark:text-gray-100/20 leading-none select-none block">{s.num}</span>
                <div className="-mt-3">
                  <h3 className="font-serif font-black uppercase text-lg border-b border-border pb-2 mb-3 text-foreground tracking-wide">{t(s.title)}</h3>
                  <p className="text-sm text-muted-foreground font-sans leading-relaxed">{t(s.body)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (section.type === "quote") {
    return (
      <div id={section.id} className="max-w-3xl mx-auto px-4 py-20 border-b border-border scroll-mt-24">
        {section.heading?.trim() && (
          <h2 className="font-serif font-black uppercase text-2xl text-foreground mb-8 border-l-4 border-primary pl-4">{t(section.heading)}</h2>
        )}
        {paras(section.body).map((p, i) => (
          <p key={i} className={`text-${i === 0 ? "xl" : "base"} ${i === 0 ? "text-foreground" : "text-muted-foreground"} font-sans leading-relaxed mb-6`}>{t(p)}</p>
        ))}
        {section.quote?.trim() && (
          <blockquote className="font-serif text-2xl md:text-3xl border-l-4 border-primary pl-6 py-4 my-12 text-foreground leading-snug">{t(section.quote)}</blockquote>
        )}
        {section.author?.trim() && (
          <p className="text-base font-sans leading-relaxed text-foreground font-bold">{t(`— ${section.author}`)}</p>
        )}
      </div>
    )
  }

  // cta
  return (
    <div id={section.id} className="py-20 border-t border-border">
      <div className="max-w-2xl mx-auto px-4 text-center">
        {section.heading?.trim() && (
          <h2 className="font-serif font-black uppercase text-3xl text-foreground mb-4">{t(section.heading)}</h2>
        )}
        {section.subcopy?.trim() && (
          <p className="text-base text-muted-foreground font-sans mb-12">{t(section.subcopy)}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
          {section.primaryLabel?.trim() && (
            <Link href={section.primaryHref || "/debates"} className="bg-foreground text-background px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-primary transition-colors font-serif">
              {t(section.primaryLabel)}
            </Link>
          )}
          {section.secondaryLabel?.trim() && (
            <Link href={section.secondaryHref || "/predictions"} className="border border-foreground text-foreground px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-foreground hover:text-background transition-colors font-serif">
              {t(section.secondaryLabel)}
            </Link>
          )}
          {pulseEnabled && (
            <Link href="/pulse" className="border border-foreground text-foreground px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-foreground hover:text-background transition-colors font-serif">{t("Read The Pulse")}</Link>
          )}
          {voicesEnabled && (
            <Link href="/voices" className="border border-primary text-primary px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-primary hover:text-white transition-colors font-serif">{t("Explore Voices")}</Link>
          )}
          {majlisEnabled && (
            <Link href="/majlis" className="border border-primary text-primary px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-primary hover:text-white transition-colors font-serif">{t("Enter The Gallery")}</Link>
          )}
        </div>
      </div>
    </div>
  )
}
