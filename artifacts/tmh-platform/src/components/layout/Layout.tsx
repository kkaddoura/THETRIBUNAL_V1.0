import { ReactNode, useEffect } from "react"
import { useLocation } from "wouter"
import { Navbar } from "./Navbar"
import { Footer } from "./Footer"
import { ScrollToTop } from "./ScrollToTop"
import { useEmailVerifyBanner } from "@/hooks/use-email-verify-banner"

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation()
  const { visible: verifyBannerVisible } = useEmailVerifyBanner()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [location])

  // The fixed nav strip grows when the verify-email banner is rendered above
  // the nav row. Bump page-content padding so it isn't covered.
  const topPad = verifyBannerVisible ? "md:pt-[88px] pt-[96px]" : "md:pt-14 pt-16"

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className={`flex-1 ${topPad}`}>
        {children}
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  )
}
