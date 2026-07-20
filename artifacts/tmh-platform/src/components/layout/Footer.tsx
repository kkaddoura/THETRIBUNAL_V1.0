import { useState } from "react"
import { Link } from "wouter"
import { useI18n } from "@/lib/i18n"
import { useSiteSettings, useDesignTokens, getTokenValue } from "@/hooks/use-cms-data"
import { track } from "@/lib/analytics"

const FALLBACK_SOCIALS = [
  { label: "X", href: "https://x.com/tmhustle" },
  { label: "LinkedIn", href: "https://linkedin.com/company/the-middle-east-hustle" },
  { label: "Instagram", href: "https://instagram.com/tmhustle" },
]

const FALLBACK_TAGLINE = "The region, on record."
const FALLBACK_COPYRIGHT = "© 2026 The Tribunal. All rights reserved."

export function Footer() {
  const { t } = useI18n()
  const { data: siteSettings } = useSiteSettings()
  const { data: designTokens } = useDesignTokens()
  const [email, setEmail] = useState("")
  const [joined, setJoined] = useState(() =>
    typeof window !== "undefined" && !!localStorage.getItem("tmh_cta_joined")
  )

  const handleNewsletterSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const cleaned = email.trim().toLowerCase()
    if (!cleaned) return
    localStorage.setItem("tmh_cta_joined", cleaned)
    setJoined(true)
    const baseUrl = import.meta.env?.VITE_API_BASE_URL ?? ""
    fetch(`${baseUrl}/api/newsletter/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: cleaned, source: "footer", newsletterOptIn: true }),
    }).catch(() => {})
    track("newsletter_subscribed", { source: "footer", optedIn: true })
  }

  const footerSettings = siteSettings?.footer
  const voicesEnabled = siteSettings?.featureToggles?.voices?.enabled ?? false
  const majlisEnabled = siteSettings?.featureToggles?.majlis?.enabled ?? false
  const pulseEnabled = siteSettings?.featureToggles?.pulse?.enabled ?? false
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
  const copyright = footerSettings?.copyright?.includes("Middle East Hustle")
    ? FALLBACK_COPYRIGHT
    : footerSettings?.copyright || FALLBACK_COPYRIGHT
  const footerWordmark = (siteSettings?.seo?.siteTitle?.split(" by ")?.[0] || "The Tribunal")
    .replace(/\.+$/, "")

  const NAV = (footerSettings?.links?.length
    ? footerSettings.links.map(link => ({
        label: link.href?.startsWith("/majlis") ? t("The Gallery") : t(link.label),
        href: link.href,
      }))
    : [
        { label: t("Debates"), href: "/debates" },
        { label: t("Predictions"), href: "/predictions" },
        { label: t("Pulse"), href: "/pulse" },
        { label: t("Voices"), href: "/voices" },
        { label: t("The Gallery"), href: "/majlis" },
        { label: t("About"), href: "/about" },
        { label: t("FAQ"), href: "/faq" },
        { label: t("Terms"), href: "/terms" },
        { label: t("Contact"), href: "/contact" },
      ]
  ).filter(link =>
    (voicesEnabled || (!link.href?.startsWith("/voices") && !link.href?.startsWith("/apply")))
    && (majlisEnabled || !link.href?.startsWith("/majlis"))
    && (pulseEnabled || !link.href?.startsWith("/pulse"))
  )

  return (
    <footer className="bg-foreground text-background pt-16 pb-8 border-t-2 border-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between gap-12 mb-12 pb-12 border-b border-background/10">
          <div className="flex-1">
            <Link href="/" className="group">
              <span className="block font-wordmark text-3xl font-black uppercase leading-none tracking-tight text-background transition-colors group-hover:text-background/80">
                {footerWordmark}<span className="text-primary">.</span>
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
                  className="text-[13px] uppercase tracking-widest font-bold text-background/75 hover:text-background transition-colors font-serif"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          <nav aria-label="Footer navigation">
            <div className="flex flex-col gap-3">
              {NAV.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-[14px] uppercase tracking-[0.15em] font-bold text-background/60 hover:text-background transition-colors font-serif"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>

          <div className="max-w-xs">
            <h4 className="text-[13px] uppercase tracking-[0.3em] font-bold text-background/75 mb-4 font-serif">
              {t("Stay Informed")}
            </h4>
            <p className="text-sm text-background/75 font-sans leading-relaxed mb-4">
              {t("Get the sharpest questions, results and prediction shifts from The Tribunal.")}
            </p>
            {joined ? (
              <p className="border-l-2 border-primary pl-3 text-[12px] uppercase tracking-widest font-bold text-background font-serif" role="status">
                {t("You're subscribed")}
              </p>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="flex w-full" aria-label="Newsletter signup">
                <label htmlFor="footer-newsletter-email" className="sr-only">
                  {t("Email address")}
                </label>
                <input
                  id="footer-newsletter-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="your@email.com"
                  className="min-w-0 flex-1 border border-background/30 bg-transparent px-3 py-2.5 font-sans text-sm text-background outline-none placeholder:text-background/40 focus:border-primary"
                />
                <button
                  type="submit"
                  className="bg-primary px-4 py-2.5 font-serif text-[10px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background"
                >
                  {t("Subscribe")}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <p className="text-[13px] uppercase tracking-widest text-background/75 font-serif">
            {copyright}
          </p>
        </div>
      </div>
    </footer>
  )
}
