import { useEffect, useState } from "react"

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return true
    return localStorage.getItem("tmh_theme") !== "light"
  })

  useEffect(() => {
    const stored = localStorage.getItem("tmh_theme")
    const isDarkMode = stored !== "light"

    setIsDark(isDarkMode)
    if (isDarkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = !isDark
    setIsDark(newTheme)
    localStorage.setItem("tmh_theme", newTheme ? "dark" : "light")
    
    if (newTheme) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }

  return { isDark, toggleTheme }
}
