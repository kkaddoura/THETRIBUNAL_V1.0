import { useState, useEffect, useRef, useCallback } from "react"
import { ChevronsUp } from "lucide-react"
import { cn } from "@/lib/utils"

export function ScrollToTop() {
  const [visible, setVisible] = useState(false)
  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  const handleScroll = useCallback(() => {
    if (ticking.current) return
    ticking.current = true

    requestAnimationFrame(() => {
      const currentY = window.scrollY
      const scrollingUp = currentY < lastScrollY.current
      const pastThreshold = currentY > 400

      setVisible(scrollingUp && pastThreshold)
      lastScrollY.current = currentY
      ticking.current = false
    })
  }, [])

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <button
      onClick={scrollToTop}
      aria-label="Scroll to top"
      className={cn(
        "fixed bottom-6 right-5 z-50 md:hidden",
        "flex items-center justify-center w-10 h-10 rounded-full",
        "bg-primary/80 text-primary-foreground backdrop-blur-sm",
        "shadow-lg shadow-primary/20",
        "transition-all duration-300 ease-out",
        visible
          ? "translate-y-0 opacity-100 scale-100"
          : "translate-y-4 opacity-0 scale-90 pointer-events-none"
      )}
    >
      <ChevronsUp className="w-5 h-5" strokeWidth={2.5} />
    </button>
  )
}
