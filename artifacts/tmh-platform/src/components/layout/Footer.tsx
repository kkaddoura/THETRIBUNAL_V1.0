import { Link } from "wouter"
import { useI18n } from "@/lib/i18n"
import { useSiteSettings, useDesignTokens, getTokenValue } from "@/hooks/use-cms-data"

const FALLBACK_SOCIALS = [
  { label: "X", href: "https://x.com/tmhustle" },
  { label: "LinkedIn", href: "https://linkedin.com/company/the-middle-east-hustle" },
  { label: "Instagram", href: "https://instagram.com/tmhustle" },
]

const FALLBACK_TAGLINE = "The voice of 541 million. Real people. Real hustle. Real change."
const FALLBACK_COPYRIGHT = "© 2026 The Middle East Hustle. All rights reserved."

export function Footer() {
  const { t } = useI18n()
  const { data: siteSettings } = useSiteSettings()
  const { data: designTokens } = useDesignTokens()

  const footerSettings = siteSettings?.footer
  const voicesEnabled = siteSettings?.featureToggles?.voices?.enabled ?? true
  const majlisEnabled = siteSettings?.featureToggles?.majlis?.enabled ?? false
  const SOCIALS = footerSettings?.socialLinks?.length
    ? footerSettings.socialLinks.map(s => ({ label: s.platform, href: s.url }))
    : designTokens?.items
      ? [
          { label: "X", href: getTokenValue(designTokens.items, "social_x", "https://x.com/tmhustle") },
          { label: "LinkedIn", href: getTokenValue(designTokens.items, "social_linkedin", "https://linkedin.com/company/the-middle-east-hustle") },
          { label: "Instagram", href: getTokenValue(designTokens.items, "social_instagram", "https://instagram.com/tmhustle") },
        ]
      : FALLBACK_SOCIALS

  const tagline = footerSettings?.tagline || FALLBACK_TAGLINE
  const copyright = footerSettings?.copyright || FALLBACK_COPYRIGHT

  const NAV = (footerSettings?.links?.length
    ? footerSettings.links.map(link => ({ label: t(link.label), href: link.href }))
    : [
        { label: t("About"), href: "/about" },
        { label: t("Pulse"), href: "/pulse" },
        { label: t("Debates"), href: "/debates" },
        { label: t("Predictions"), href: "/predictions" },
        ...(voicesEnabled ? [{ label: t("Voices"), href: "/voices" }] : []),
        { label: t("Join The Voices"), href: "/apply" },
      ]
  ).filter(link =>
    (voicesEnabled || !link.href?.startsWith("/voices"))
    && (majlisEnabled || !link.href?.startsWith("/majlis"))
  )

  return (
    <footer className="bg-foreground text-background pt-16 pb-8 border-t-2 border-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between gap-12 mb-12 pb-12 border-b border-background/10">
          <div className="flex-1">
            <Link href="/">
              <span className="font-display font-black text-3xl uppercase tracking-tight text-background leading-none block hover:text-primary transition-colors">
                {siteSettings?.seo?.siteTitle?.split(" by ")?.[0] || "The Tribunal"}<span className="text-primary">.</span>
              </span>
              <span className="text-[10px] font-serif tracking-[0.2em] uppercase text-background/75 mt-1 block">
                {t(siteSettings?.seo?.siteTitle?.includes(" by ") ? `by ${siteSettings.seo.siteTitle.split(" by ")[1]}` : "by The Middle East Hustle")}
              </span>
            </Link>
            <p className="text-background/75 font-sans text-sm mt-4 max-w-xs leading-relaxed">
              {t(tagline)}
            </p>
            <div className="flex items-center gap-4 mt-6">
              {SOCIALS.map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] uppercase tracking-widest font-bold text-background/75 hover:text-background transition-colors font-serif"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <div className="flex flex-col gap-3">
              {NAV.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-[12px] uppercase tracking-[0.15em] font-bold text-background/60 hover:text-background transition-colors font-serif"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="max-w-xs">
            <h4 className="text-[11px] uppercase tracking-[0.3em] font-bold text-background/75 mb-4 font-serif">{t("Stay Informed")}</h4>
            <p className="text-sm text-background/75 font-sans leading-relaxed mb-4">
              {t("The questions no one else asks. The data no one else collects. Straight to your inbox.")}
            </p>
            <Link
              href="/join"
              className="inline-block bg-primary text-white text-[11px] font-bold uppercase tracking-[0.2em] px-5 py-2.5 hover:bg-primary/90 transition-colors font-serif"
            >
              {t("Get Updates")}
            </Link>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] uppercase tracking-widest text-background/75 font-serif">
            {copyright}
          </p>
          <div className="flex items-center gap-6">
            <Link href="/faq" className="text-[12px] uppercase tracking-[0.15em] font-bold text-background/75 hover:text-background transition-colors font-serif">{t("FAQ")}</Link>
            <Link href="/terms" className="text-[12px] uppercase tracking-[0.15em] font-bold text-background/75 hover:text-background transition-colors font-serif">{t("Terms")}</Link>
            <Link href="/contact" className="text-[12px] uppercase tracking-[0.15em] font-bold text-background/75 hover:text-background transition-colors font-serif">{t("Contact")}</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
