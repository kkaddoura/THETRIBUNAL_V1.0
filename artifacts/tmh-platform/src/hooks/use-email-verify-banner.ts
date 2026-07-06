import { useEffect, useState } from "react"
import { useMe } from "@/hooks/use-auth"

const DISMISSED_KEY = "tmh_verify_banner_dismissed"
const EVENT = "tmh:verify-banner-changed"

function readDismissed(): boolean {
  if (typeof window === "undefined") return false
  return sessionStorage.getItem(DISMISSED_KEY) === "1"
}

export function dismissEmailVerifyBanner(): void {
  sessionStorage.setItem(DISMISSED_KEY, "1")
  window.dispatchEvent(new CustomEvent(EVENT))
}

// Shared between <Navbar /> (renders the banner) and <Layout /> (sizes the
// top padding under the fixed strip). Kept in sessionStorage so a dismissal
// persists across navigations within the same tab session.
export function useEmailVerifyBanner(): { visible: boolean } {
  const { data: user } = useMe()
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed())

  useEffect(() => {
    const sync = () => setDismissed(readDismissed())
    window.addEventListener(EVENT, sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  const visible = !!user && !user.emailVerified && !dismissed
  return { visible }
}
