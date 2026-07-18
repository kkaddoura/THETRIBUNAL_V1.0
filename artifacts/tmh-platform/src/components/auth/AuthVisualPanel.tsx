import { useEffect, useState } from "react"

type AuthVisualPanelProps = {
  title: string
  body: string
}

const NIGHT_IMAGE = "/images/auth-editorial-panel.png"
const DAY_IMAGE = "/images/auth-editorial-panel-day.png"

function isDarkTheme() {
  if (typeof document === "undefined") return true
  return document.documentElement.classList.contains("dark")
}

export function AuthVisualPanel({ title, body }: AuthVisualPanelProps) {
  const [isDark, setIsDark] = useState(isDarkTheme)

  useEffect(() => {
    setIsDark(isDarkTheme())

    const observer = new MutationObserver(() => {
      setIsDark(isDarkTheme())
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => observer.disconnect()
  }, [])

  return (
    <aside className="relative hidden min-h-[calc(100vh-4rem)] overflow-hidden lg:flex lg:min-h-[calc(100vh-3.5rem)]">
      <img
        src={DAY_IMAGE}
        alt=""
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
          isDark ? "opacity-0" : "opacity-100"
        }`}
      />
      <img
        src={NIGHT_IMAGE}
        alt=""
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
          isDark ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/25 to-black/70"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/20"
      />
      <div className="relative z-10 flex h-full w-full flex-col justify-between p-10 text-[#F2EDE4] xl:p-16">
        <div className="max-w-md pt-6 xl:pt-10">
          <h1
            className="font-serif text-5xl font-black uppercase leading-[0.95] tracking-tight text-white drop-shadow-[0_3px_18px_rgba(0,0,0,0.65)] xl:text-6xl"
          >
            {title}
            <span className="text-primary">.</span>
          </h1>
          <p className="mt-6 max-w-sm text-base font-medium leading-relaxed text-white/95 drop-shadow-[0_2px_12px_rgba(0,0,0,0.75)] xl:text-lg">
            {body}
          </p>
        </div>

        <div className="flex justify-end border-t border-[#F2EDE4]/20 pt-5 font-serif text-[12px] font-bold uppercase tracking-[0.25em]">
          <span className="text-primary">Member access</span>
        </div>
      </div>
    </aside>
  )
}
