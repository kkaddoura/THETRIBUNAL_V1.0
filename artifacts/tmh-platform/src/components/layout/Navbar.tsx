import { Link, useLocation } from "wouter"
import { Menu, X, Moon, Sun, Lock } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useTheme } from "@/hooks/use-theme"
import { cn } from "@/lib/utils"
import { useI18n, LangToggle } from "@/lib/i18n"
import { useSiteSettings } from "@/hooks/use-cms-data"

export function Navbar() {
  const [location] = useLocation()
  const { isDark, toggleTheme } = useTheme()
  const { t } = useI18n()
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isHidden, setIsHidden] = useState(false)
  const lastScrollY = useRef(0)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { data: settings, isLoading: settingsLoading } = useSiteSettings()

  useEffect(() => {
    const clearIdleTimer = () => {
      if (idleTimer.current) {
        clearTimeout(idleTimer.current)
        idleTimer.current = null
      }
    }

    const startIdleTimer = () => {
      clearIdleTimer()
      idleTimer.current = setTimeout(() => {
        setIsHidden(false)
      }, 3500)
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      setIsScrolled(currentScrollY > 20)

      if (currentScrollY <= 80) {
        setIsHidden(false)
        clearIdleTimer()
      } else if (currentScrollY > lastScrollY.current + 5) {
        if (!mobileMenuOpen) {
          setIsHidden(true)
          startIdleTimer()
        }
      } else if (currentScrollY < lastScrollY.current - 5) {
        setIsHidden(false)
        clearIdleTimer()
      }

      lastScrollY.current = currentScrollY
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", handleScroll)
      clearIdleTimer()
    }
  }, [mobileMenuOpen])

  const majlisEnabled = settings?.featureToggles?.majlis?.enabled ?? false
  const voicesEnabled = settings?.featureToggles?.voices?.enabled ?? true

  const defaultLinks = [
    { label: t("About"), href: "/about" },
    { label: t("Pulse"), href: "/pulse" },
    { label: t("Debates"), href: "/debates" },
    { label: t("Predictions"), href: "/predictions" },
    ...(voicesEnabled ? [{ label: t("Voices"), href: "/voices" }] : []),
    ...(majlisEnabled ? [{ label: t("The Majlis"), href: "/majlis", icon: "lock" }] : []),
  ]

  const cmsLinks = settings?.navigation?.links?.filter(link => link.enabled !== false
    && (majlisEnabled || !link.href?.startsWith("/majlis"))
    && (voicesEnabled || !link.href?.startsWith("/voices")))
  const navLinks = (cmsLinks?.length ? cmsLinks : defaultLinks).map(link => ({
    ...link,
    icon: link.icon === "lock" ? Lock : undefined,
  }))

  const rawCtaButton = settings?.navigation?.ctaButton
  const ctaButton = rawCtaButton?.enabled !== false
    ? (rawCtaButton || { label: t("Join The Voices"), href: "/apply" })
    : null

  const seoSettings = settings?.seo
  const brandName = seoSettings?.siteTitle?.split(" by ")?.[0] || "The Tribunal"
  const brandSub = seoSettings?.siteTitle?.includes(" by ")
    ? `by ${seoSettings.siteTitle.split(" by ")[1]}`
    : "by The Middle East Hustle"

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b",
        isScrolled
          ? "bg-background/95 backdrop-blur-md border-border shadow-sm"
          : "bg-background border-border",
        isHidden ? "-translate-y-full" : "translate-y-0"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex flex-col leading-none group">
              <span className="font-display font-black text-lg uppercase tracking-tight text-foreground leading-none group-hover:text-primary transition-colors">
                {brandName}<span className="text-primary">.</span>
              </span>
              <span className="text-[9px] font-serif tracking-[0.2em] uppercase text-muted-foreground leading-none mt-1.5">
                {brandSub}
              </span>
            </Link>

          </div>

          <nav className={cn("hidden md:flex items-center gap-3 lg:gap-8 transition-opacity duration-300", settingsLoading ? "opacity-0" : "opacity-100")}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-[10px] lg:text-[11.5px] uppercase tracking-[0.15em] lg:tracking-[0.2em] font-bold transition-all font-serif flex items-center gap-1",
                  location === link.href || (link.href === "/majlis" && location.startsWith("/majlis"))
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.icon && <link.icon className="w-3 h-3" />}
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {ctaButton && !settingsLoading && (
            <Link
              href={ctaButton.href}
              className="hidden lg:flex items-center gap-2 bg-primary text-white text-[11px] font-bold uppercase tracking-[0.15em] px-4 py-2 hover:bg-primary/90 transition-colors font-serif"
            >
              {ctaButton.label}
            </Link>
            )}

            <button
              onClick={toggleTheme}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              className="md:hidden p-2 text-foreground"
              onClick={() => {
                const opening = !mobileMenuOpen
                setMobileMenuOpen(opening)
                if (opening) setIsHidden(false)
              }}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && !settingsLoading && (
        <div className="md:hidden absolute top-full left-0 w-full bg-background border-b border-border shadow-xl z-50">
          <div className="px-6 py-6 flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "py-3 border-b border-border font-serif font-bold uppercase tracking-wider text-base transition-colors flex items-center gap-2",
                  location === link.href ? "text-primary" : "text-foreground"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.icon && <link.icon className="w-4 h-4" />}
                {link.label}
              </Link>
            ))}
            {ctaButton && (
            <div className="pt-4">
              <Link
                href={ctaButton.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center bg-primary text-white font-bold uppercase tracking-[0.2em] text-sm py-3 font-serif hover:bg-primary/90 transition-colors"
              >
                {ctaButton.label}
              </Link>
            </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
