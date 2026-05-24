import { useState } from "react"
import { Layout } from "@/components/layout/Layout"
import { useLocation, Link } from "wouter"
import { Eye, EyeOff, ArrowRight, Vote } from "lucide-react"
import { usePageTitle } from "@/hooks/use-page-title"
import { useLogin } from "@/hooks/use-auth"

export default function Login() {
  usePageTitle({
    title: "Sign In — The Tribunal",
    description:
      "Sign in to The Tribunal to view your saved votes, predictions, and continue from any device.",
  })
  const [, navigate] = useLocation()
  const login = useLogin()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!username.trim() || !password) {
      setError("Username/email and password are required.")
      return
    }
    try {
      await login.mutateAsync({ username: username.trim(), password })
      const params = new URLSearchParams(window.location.search)
      const redirect = params.get("redirect") ?? "/"
      navigate(redirect)
    } catch {
      setError("Invalid username or password.")
    }
  }

  return (
    <Layout>
      <div className="min-h-[calc(100vh-4rem)] grid lg:grid-cols-2">
        {/* ── Left: welcome-back panel — always dark, theme-independent ─ */}
        <aside
          className="relative overflow-hidden hidden lg:flex flex-col justify-between p-10 xl:p-16"
          style={{ backgroundColor: "#0A0A0A", color: "#F2EDE4" }}
        >
          <div
            aria-hidden="true"
            className="absolute -bottom-32 -left-32 w-[480px] h-[480px] rounded-full bg-primary/10 blur-3xl pointer-events-none"
          />
          <div
            aria-hidden="true"
            className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
          />

          <div className="relative">
            <p className="text-[12px] uppercase tracking-[0.3em] font-bold text-primary mb-5 font-serif">
              Welcome back
            </p>
            <h1
              className="font-display font-black uppercase tracking-tight leading-[0.95] text-5xl xl:text-6xl mb-6"
              style={{ color: "#F2EDE4" }}
            >
              Welcome<br />
              back<span className="text-primary">.</span>
            </h1>
            <p
              className="text-base xl:text-lg leading-relaxed max-w-md"
              style={{ color: "rgba(242,237,228,0.7)" }}
            >
              Sign in to view your previous votes and predictions, and continue from any device.
            </p>
          </div>

          <div className="relative space-y-6 max-w-md">
            <div
              className="flex items-center gap-3 backdrop-blur-sm px-4 py-3"
              style={{
                borderWidth: 1,
                borderColor: "rgba(242,237,228,0.15)",
                backgroundColor: "rgba(242,237,228,0.04)",
              }}
            >
              <Vote className="w-4 h-4 text-primary flex-shrink-0" />
              <p className="text-xs leading-relaxed" style={{ color: "rgba(242,237,228,0.85)" }}>
                Your vote is private. Your account helps you save your activity.
              </p>
            </div>

            <p
              className="text-[12px] uppercase tracking-[0.25em] font-bold font-serif"
              style={{ color: "rgba(242,237,228,0.45)" }}
            >
              The Tribunal
            </p>
          </div>
        </aside>

        {/* ── Right: login form ────────────────────────────────────────── */}
        <main className="flex items-center justify-center bg-background py-10 px-4 sm:px-6 md:py-16">
          <div className="w-full max-w-md">
            <div className="lg:hidden text-center mb-8">
              <p className="text-[12px] uppercase tracking-[0.3em] font-bold text-primary mb-3 font-serif">
                Welcome back
              </p>
              <h1 className="font-display font-black uppercase tracking-tight text-4xl leading-[0.95]">
                Welcome<br />
                back<span className="text-primary">.</span>
              </h1>
            </div>

            <div className="bg-card border border-border p-6 md:p-8">
              <p className="text-[12px] uppercase tracking-[0.25em] font-bold text-primary mb-2 font-serif">
                Sign in
              </p>
              <h2 className="font-display font-black uppercase tracking-tight text-2xl md:text-3xl mb-6">
                Save your votes<span className="text-primary">.</span>
              </h2>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-[12px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-1.5">
                    Username or email
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoCapitalize="none"
                    className="w-full bg-background border border-border px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none transition-colors"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[12px] uppercase tracking-[0.2em] font-bold text-muted-foreground">
                      Password
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-[12px] uppercase tracking-[0.15em] font-bold text-muted-foreground hover:text-primary transition-colors"
                    >
                      Forgot?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-background border border-border px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none transition-colors pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="border border-primary/40 bg-primary/10 text-primary text-sm px-4 py-3 font-medium">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={login.isPending}
                  className="w-full bg-primary text-white font-bold uppercase tracking-widest text-sm py-3.5 hover:bg-primary/90 transition-colors font-serif disabled:opacity-60 inline-flex items-center justify-center gap-2"
                >
                  {login.isPending ? "Signing in…" : (
                    <>Sign in <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>

                <p className="text-center text-xs text-muted-foreground pt-1">
                  New here?{" "}
                  <Link href="/signup" className="text-foreground hover:text-primary font-bold">
                    Create an account
                  </Link>
                </p>
              </form>
            </div>

            <div className="mt-6 flex items-center justify-center gap-5 text-[12px] uppercase tracking-[0.2em] font-bold text-muted-foreground/70 font-serif">
              <span>Secure session</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <span>30-day login</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <span>No tracking</span>
            </div>
          </div>
        </main>
      </div>
    </Layout>
  )
}
