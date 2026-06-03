import { Link } from "wouter"
import { Layout } from "@/components/layout/Layout"
import { useI18n } from "@/lib/i18n"
import { usePageConfig, useSiteSettings } from "@/hooks/use-cms-data"
import { usePageTitle } from "@/hooks/use-page-title"
import { TitlePunctuation } from "@/components/TitlePunctuation"
import { PageIndex } from "@/components/layout/PageIndex"

interface AboutConfig {
  hero?: { titleLine1?: string; titleLine2?: string; tagline?: string; subtitle?: string }
  founderStatement?: { text?: string; author?: string; quote?: string }
  punctuations?: string[]
}

const HOW_IT_WORKS_STEPS = [
  { num: "01", title: "Choose a question.", body: "Debates ask what people believe. Predictions ask what people think will happen." },
  { num: "02", title: "Vote privately.", body: "Your name and email are not shown with your vote." },
  { num: "03", title: "See the result.", body: "Results are shown publicly in aggregate, with country and topic breakdowns where enough data exists." },
  { num: "04", title: "Save your activity.", body: "You can vote without an account. If you sign up, you can view previous votes, track predictions and continue from another device." },
  { num: "05", title: "Go deeper.", body: "Pulse adds sourced public signals. Voices profiles people with a view worth recording. The Majlis creates a private room for serious conversation." },
  { num: "06", title: "Trust the process.", body: "Questions are human reviewed. Results are opinion signals, not scientific polling. No bots. No sponsored sentiment. No fake activity." },
]

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

  const hero = pageConfig?.hero
  const founder = pageConfig?.founderStatement

  const pageSections = [
    { id: "what-is-the-tribunal", label: t("What Is It") },
    { id: "the-sharpest-read", label: t("The Sharpest Read") },
    { id: "how-it-works", label: t("How It Works") },
    { id: "from-the-founder", label: t("From the Founder") },
  ]

  return (
    <Layout>
      <PageIndex sections={pageSections} />

      {/* Hero */}
      <div className="bg-foreground text-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.28em", color: "#DC143C", marginBottom: "0.5rem" }}>
            {t(hero?.tagline || "Est. 2026 · The Tribunal")}
          </p>
          <h1 style={{ fontFamily: isAr ? "'IBM Plex Sans Arabic', sans-serif" : "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "clamp(2rem, 5vw, 3.5rem)", textTransform: "uppercase", color: "hsl(var(--background))", letterSpacing: "-0.01em", lineHeight: 1.05, marginBottom: "0.5rem" }}>
            {t(hero?.titleLine1 || "A place to say what people")}<br />
            {t(hero?.titleLine2 || "usually keep private")}<TitlePunctuation punctuations={pageConfig?.punctuations} />
          </h1>
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "0.90rem", textTransform: "uppercase", letterSpacing: "0.18em" }}>
            {t(hero?.subtitle || "The sharpest read on what the region really thinks.")}
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.83rem", letterSpacing: "0.04em", opacity: 0.6, marginTop: "0.85rem" }}>
            {t("No names attached. No public performance. Just the result.")}
          </p>
        </div>
      </div>

      {/* What is The Tribunal? */}
      <div id="what-is-the-tribunal" className="max-w-3xl mx-auto px-4 py-20 border-b border-border scroll-mt-24">
        <h2 className="font-serif font-black uppercase text-2xl text-foreground mb-8 border-l-4 border-primary pl-4">
          {t("What is The Tribunal?")}
        </h2>
        <p className="text-xl font-sans leading-relaxed text-foreground mb-8">
          {t("The Tribunal is a private voting platform for the Middle East and North Africa.")}
        </p>
        <p className="text-base text-muted-foreground font-sans leading-relaxed mb-6">
          {t("We ask the questions people usually avoid in public. People vote privately. The results are shown publicly.")}
        </p>
        <p className="text-base text-muted-foreground font-sans leading-relaxed mb-2">
          {t("It is not a news site.")}
        </p>
        <p className="text-base text-muted-foreground font-sans leading-relaxed mb-2">
          {t("It is not a think tank.")}
        </p>
        <p className="text-base text-muted-foreground font-sans leading-relaxed mb-6">
          {t("It is not a comment section.")}
        </p>
        <p className="text-base text-muted-foreground font-sans leading-relaxed mb-8">
          {t("It is a sharper way to see what people actually think when their names are not attached.")}
        </p>
        <p className="text-sm font-serif italic text-foreground/70 leading-relaxed border-l-2 border-primary/60 pl-4 mb-6">
          {t("Private does not mean fake. If it is not human, it does not count.")}
        </p>
        <p className="text-sm font-sans text-muted-foreground leading-relaxed">
          {t("You can vote without creating an account. If you sign up, you can save your activity, view previous votes and predictions, and continue from another device.")}
        </p>
      </div>

      {/* The Sharpest Read */}
      <div id="the-sharpest-read" className="bg-secondary/10 border-b border-border scroll-mt-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="font-serif font-black uppercase text-3xl border-b-2 border-foreground pb-4 mb-8 text-foreground">
            {t("The sharpest read on the region.")}
          </h2>
          <div className="max-w-3xl space-y-6 mb-12">
            <p className="text-lg text-foreground font-sans leading-relaxed">
              {t("Public conversations are usually polished.")}
            </p>
            <p className="text-lg text-foreground font-sans leading-relaxed">
              {t("Private conversations are usually honest.")}
            </p>
            <p className="text-lg text-foreground font-sans leading-relaxed font-bold">
              {t("The Tribunal exists to close that gap.")}
            </p>
            <p className="text-base text-muted-foreground font-sans leading-relaxed">
              {t("Every question is designed to surface a clearer signal: what people believe, what they expect, and where the region is shifting.")}
            </p>
            <p className="text-sm font-serif italic text-foreground/70 mt-6">
              {t("19 countries. One regional lens.")}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center bg-foreground text-background py-12 px-4">
            <div>
              <div className="font-display font-black text-4xl md:text-5xl leading-none mb-2">100+</div>
              <div className="text-[12px] uppercase tracking-[0.2em] font-serif text-primary">{t("Live Questions")}</div>
            </div>
            <div>
              <div className="font-display font-black text-4xl md:text-5xl leading-none mb-2">19</div>
              <div className="text-[12px] uppercase tracking-[0.2em] font-serif text-primary">{t("Countries Covered")}</div>
            </div>
            <div>
              <div className="font-display font-black text-2xl md:text-3xl leading-none mb-2 pt-2">{t("Private")}</div>
              <div className="text-[12px] uppercase tracking-[0.2em] font-serif text-primary">{t("Votes")}</div>
            </div>
            <div>
              <div className="font-display font-black text-2xl md:text-3xl leading-none mb-2 pt-2">{t("Public")}</div>
              <div className="text-[12px] uppercase tracking-[0.2em] font-serif text-primary">{t("Results")}</div>
            </div>
          </div>
        </div>
      </div>

      {/* How The Tribunal Works */}
      <div id="how-it-works" className="py-20 bg-secondary/20 border-b border-border scroll-mt-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif font-black uppercase text-3xl border-b-2 border-foreground pb-4 mb-12 text-foreground">
            {t("How The Tribunal Works")}
          </h2>
          <div className="grid md:grid-cols-2 gap-10">
            {HOW_IT_WORKS_STEPS.map(s => (
              <div key={s.num} className="relative">
                <span className="text-6xl font-display font-black text-gray-900/20 dark:text-gray-100/20 leading-none select-none block">{s.num}</span>
                <div className="-mt-3">
                  <h3 className="font-serif font-black uppercase text-lg border-b border-border pb-2 mb-3 text-foreground tracking-wide">
                    {t(s.title)}
                  </h3>
                  <p className="text-sm text-muted-foreground font-sans leading-relaxed">{t(s.body)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* From the Founder */}
      <div id="from-the-founder" className="max-w-3xl mx-auto px-4 py-20 border-b border-border scroll-mt-24">
        <h2 className="font-serif font-black uppercase text-2xl text-foreground mb-8 border-l-4 border-primary pl-4">
          {t("From the Founder")}
        </h2>
        {(founder?.text || "").split("\n\n").filter(Boolean).length > 0 ? (
          founder!.text!.split("\n\n").filter(Boolean).map((para, i) => (
            <p key={i} className={`text-${i === 0 ? 'xl' : 'base'} ${i === 0 ? 'text-foreground' : 'text-muted-foreground'} font-sans leading-relaxed mb-6`}>
              {t(para)}
            </p>
          ))
        ) : (
          <>
            <p className="text-xl font-sans leading-relaxed text-foreground mb-6">
              {t("This started with a question I kept asking in private rooms:")}
            </p>
            <p className="text-xl font-sans leading-relaxed text-foreground italic mb-8">
              {t("What does the region actually think?")}
            </p>
            <p className="text-base text-muted-foreground font-sans leading-relaxed mb-2">
              {t("Not what people say in public.")}
            </p>
            <p className="text-base text-muted-foreground font-sans leading-relaxed mb-2">
              {t("Not what people post for approval.")}
            </p>
            <p className="text-base text-muted-foreground font-sans leading-relaxed mb-2">
              {t("Not what leaders claim.")}
            </p>
            <p className="text-base text-muted-foreground font-sans leading-relaxed mb-6">
              {t("Not what outsiders assume.")}
            </p>
            <p className="text-base text-foreground font-sans leading-relaxed font-bold mb-6">
              {t("What people actually think.")}
            </p>
            <p className="text-base text-muted-foreground font-sans leading-relaxed mb-6">
              {t("The Tribunal does not speak for the region. It records what people say when they can answer honestly.")}
            </p>
          </>
        )}

        <blockquote className="font-display text-2xl md:text-3xl border-l-4 border-primary pl-6 py-4 my-12 text-foreground leading-snug">
          {t(founder?.quote || "\"People do not lack opinions. They lack a place to say them honestly.\"")}
        </blockquote>

        <p className="text-base font-sans leading-relaxed text-foreground font-bold">
          {t(founder?.author ? `— ${founder.author}` : "— Kareem Kaddoura, Founder")}
        </p>
      </div>

      {/* Final CTA */}
      <div className="py-20 border-t border-border">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="font-serif font-black uppercase text-3xl text-foreground mb-4">
            {t("See where you stand.")}
          </h2>
          <p className="text-base text-muted-foreground font-sans mb-12">
            {t("Vote privately. See the result publicly.")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
            <Link
              href="/debates"
              className="bg-foreground text-background px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-primary transition-colors font-serif"
            >
              {t("Cast Your Vote")}
            </Link>
            <Link
              href="/predictions"
              className="border border-foreground text-foreground px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-foreground hover:text-background transition-colors font-serif"
            >
              {t("Make a Prediction")}
            </Link>
            {pulseEnabled && (
              <Link
                href="/pulse"
                className="border border-foreground text-foreground px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-foreground hover:text-background transition-colors font-serif"
              >
                {t("Read The Pulse")}
              </Link>
            )}
            {voicesEnabled && (
              <Link
                href="/voices"
                className="border border-primary text-primary px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-primary hover:text-white transition-colors font-serif"
              >
                {t("Explore Voices")}
              </Link>
            )}
            {majlisEnabled && (
              <Link
                href="/majlis"
                className="border border-primary text-primary px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-primary hover:text-white transition-colors font-serif"
              >
                {t("Enter The Majlis")}
              </Link>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
