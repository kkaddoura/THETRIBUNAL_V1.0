import { Link } from "wouter"
import { Layout } from "@/components/layout/Layout"
import { useI18n } from "@/lib/i18n"
import { usePageTitle } from "@/hooks/use-page-title"
import { useSiteSettings } from "@/hooks/use-cms-data"

export default function NotFound() {
  usePageTitle({
    title: "Page Not Found",
    description: "This page doesn't exist. Head back to The Tribunal to explore debates, predictions, and voices from across MENA.",
  });
  const { t, isAr } = useI18n()
  const { data: siteSettings } = useSiteSettings()
  const voicesEnabled = siteSettings?.featureToggles?.voices?.enabled ?? true

  return (
    <Layout>
      <div className="bg-foreground text-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.28em", color: "#DC143C", marginBottom: "0.5rem" }}>
            {t("Error 404")}
          </p>
          <h1 style={{ fontFamily: isAr ? "'IBM Plex Sans Arabic', sans-serif" : "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "clamp(2rem, 5vw, 3.5rem)", textTransform: "uppercase", color: "var(--background)", letterSpacing: "-0.01em", lineHeight: 1.05, marginBottom: "0.5rem" }}>
            {t("Page Not Found")}<span style={{ color: "#DC143C" }}>.</span>
          </h1>
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(250,250,250,0.65)" }}>
            {t("We're still building. This page doesn't exist yet.")}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center">
        <p className="font-display text-6xl md:text-8xl font-black text-foreground/5 select-none leading-none mb-6">
          404
        </p>
        <p className="text-xl font-sans text-foreground leading-relaxed mb-4 -mt-8">
          {t("Sorry about that. The page you're looking for doesn't exist or is still being built.")}
        </p>
        <p className="text-base text-muted-foreground font-sans leading-relaxed mb-10">
          {t("The Tribunal is a living platform — new sections are being added all the time. In the meantime, here are some places you can go.")}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link
            href="/"
            className="bg-foreground text-background px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-primary transition-colors font-serif"
          >
            {t("Go to Homepage")}
          </Link>
          <Link
            href="/debates"
            className="border border-foreground text-foreground px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-foreground hover:text-background transition-colors font-serif"
          >
            {t("Enter The Debates")}
          </Link>
          <Link
            href="/about"
            className="border border-primary text-primary px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-primary hover:text-white transition-colors font-serif"
          >
            {t("About The Tribunal")}
          </Link>
        </div>

        <div className="border-t border-border pt-10">
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-primary mb-4 font-serif">
            {t("Explore")}
          </p>
          <div className="flex flex-wrap gap-6 justify-center">
            <Link href="/pulse" className="text-[10px] uppercase tracking-widest font-bold font-serif text-muted-foreground hover:text-foreground transition-colors">
              {t("Pulse")} {isAr ? "←" : "→"}
            </Link>
            <Link href="/predictions" className="text-[10px] uppercase tracking-widest font-bold font-serif text-muted-foreground hover:text-foreground transition-colors">
              {t("Predictions")} {isAr ? "←" : "→"}
            </Link>
            {voicesEnabled && (
              <Link href="/voices" className="text-[10px] uppercase tracking-widest font-bold font-serif text-muted-foreground hover:text-foreground transition-colors">
                {t("Voices")} {isAr ? "←" : "→"}
              </Link>
            )}
            <Link href="/faq" className="text-[10px] uppercase tracking-widest font-bold font-serif text-muted-foreground hover:text-foreground transition-colors">
              {t("FAQ")} {isAr ? "←" : "→"}
            </Link>
            <Link href="/contact" className="text-[10px] uppercase tracking-widest font-bold font-serif text-muted-foreground hover:text-foreground transition-colors">
              {t("Contact")} {isAr ? "←" : "→"}
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  )
}
