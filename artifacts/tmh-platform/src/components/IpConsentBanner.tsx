import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { X } from "lucide-react"
import { useSiteSettings } from "@/hooks/use-cms-data"

const CONSENT_KEY = "tmh_ip_consent"

export function getIpConsent(): "accepted" | "rejected" | null {
  if (typeof window === "undefined") return null
  const val = localStorage.getItem(CONSENT_KEY)
  if (val === "accepted" || val === "rejected") return val
  return null
}

export function IpConsentBanner() {
  const { data: settings } = useSiteSettings()
  const ipConsentEnabled = settings?.featureToggles?.ipConsent?.enabled ?? false
  const [consent, setConsent] = useState<"accepted" | "rejected" | null>(() => getIpConsent())
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (ipConsentEnabled && consent === null) {
      // Delay showing the banner slightly so it doesn't flash on first paint
      const timer = setTimeout(() => setVisible(true), 600)
      return () => clearTimeout(timer)
    }
    setVisible(false)
    return undefined
  }, [ipConsentEnabled, consent])

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted")
    setConsent("accepted")
    setVisible(false)
  }

  const reject = () => {
    localStorage.setItem(CONSENT_KEY, "rejected")
    setConsent("rejected")
    setVisible(false)
  }

  if (!ipConsentEnabled) return null

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-4 left-4 right-4 z-[400] md:left-auto md:right-6 md:bottom-6 md:max-w-md"
        >
          <div className="bg-card border border-primary/30 shadow-2xl p-5 rounded-sm relative">
            <button
              onClick={reject}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
            <p className="font-serif font-black uppercase text-sm text-foreground tracking-tight mb-2">
              Location-Aware Results<span className="text-primary">.</span>
            </p>
            <p className="text-[12px] text-muted-foreground font-sans leading-relaxed mb-4">
              We use your IP address to determine your country so you can see how voters from your region compare.
              Your vote is still anonymous — we don't store personal data.
            </p>
            <div className="flex gap-2">
              <button
                onClick={accept}
                className="flex-1 bg-primary text-white font-bold uppercase tracking-widest text-[10px] px-4 py-2.5 hover:bg-primary/90 transition-colors font-serif"
              >
                Accept
              </button>
              <button
                onClick={reject}
                className="flex-1 border border-border text-foreground font-bold uppercase tracking-widest text-[10px] px-4 py-2.5 hover:bg-secondary transition-colors font-serif"
              >
                No Thanks
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
