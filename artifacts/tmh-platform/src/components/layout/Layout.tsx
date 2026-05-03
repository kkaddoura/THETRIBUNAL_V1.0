import { ReactNode, useEffect } from "react"
import { useLocation } from "wouter"
import { Navbar } from "./Navbar"
import { Footer } from "./Footer"
import { ScrollToTop } from "./ScrollToTop"

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [location])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 md:pt-14 pt-16">
        {children}
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  )
}
