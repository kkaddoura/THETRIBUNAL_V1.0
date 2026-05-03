import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useLocation } from "wouter";
import { Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";

const API_BASE = import.meta.env?.VITE_API_BASE_URL ?? "";

export default function MajlisLogin() {
  usePageTitle({
    title: "The Majlis",
    description: "Log in to The Majlis -- a private community for MENA's sharpest voices.",
  });
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "register" && !inviteToken.trim()) {
        setError("A valid invite code is required to register");
        setLoading(false);
        return;
      }
      if (!email.trim() || !password.trim()) {
        setError("Email and password are required");
        setLoading(false);
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError("Please enter a valid email address");
        setLoading(false);
        return;
      }

      const endpoint =
        mode === "login"
          ? `${API_BASE}/api/majlis/auth/login`
          : `${API_BASE}/api/majlis/auth/register`;

      const body: Record<string, string> = { email: email.trim(), password };
      if (mode === "register") {
        body.inviteToken = inviteToken.trim();
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Authentication failed");
        setLoading(false);
        return;
      }

      localStorage.setItem("majlis_token", data.token);
      localStorage.setItem("majlis_user", JSON.stringify(data.user));
      navigate("/majlis");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-primary" />
              <span className="text-[10px] font-serif font-bold uppercase tracking-[0.3em] text-primary">
                Private Forum
              </span>
            </div>
            <h1 className="font-display text-4xl font-black uppercase tracking-tight text-foreground leading-none">
              The Majlis<span className="text-primary">.</span>
            </h1>
            <p className="text-[10px] font-serif uppercase tracking-[0.2em] text-muted-foreground mt-2">
              المجلس — For Verified Voices Only
            </p>
          </div>

          <div className="border border-border bg-card p-8">
            <div className="flex mb-6 border-b border-border">
              <button
                onClick={() => {
                  setMode("login");
                  setError("");
                  setEmail("");
                  setPassword("");
                  setInviteToken("");
                }}
                className={`flex-1 pb-3 text-xs font-serif font-bold uppercase tracking-[0.2em] transition-colors border-b-2 ${
                  mode === "login"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setMode("register");
                  setError("");
                  setEmail("");
                  setPassword("");
                  setInviteToken("");
                }}
                className={`flex-1 pb-3 text-xs font-serif font-bold uppercase tracking-[0.2em] transition-colors border-b-2 ${
                  mode === "register"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
              {mode === "register" && (
                <div>
                  <label className="text-[10px] font-serif font-bold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
                    Invitation Code
                  </label>
                  <input
                    type="text"
                    value={inviteToken}
                    onChange={(e) => setInviteToken(e.target.value)}
                    required
                    placeholder="Paste your invite code"
                    className="w-full bg-background border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none transition-colors font-mono"
                  />
                  <p className="text-[9px] text-muted-foreground mt-1 font-serif">
                    Invitation codes are issued by admins to verified Voices
                    only.
                  </p>
                </div>
              )}

              <div>
                <label className="text-[10px] font-serif font-bold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  name="majlis-email"
                  autoComplete="off"
                  placeholder="your@email.com"
                  className="w-full bg-background border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-serif font-bold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    name={mode === "register" ? "majlis-new-password" : "majlis-password"}
                    autoComplete={mode === "register" ? "new-password" : "off"}
                    placeholder="••••••••"
                    className="w-full bg-background border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none transition-colors pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {mode === "login" && (
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Forgot your password?{" "}
                    <a href="mailto:hello@themiddleeasthustle.com" className="text-primary underline">
                      Contact admin
                    </a>
                  </p>
                )}
              </div>

              {error && (
                <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 px-4 py-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white font-serif font-bold uppercase tracking-[0.2em] text-xs py-3.5 hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  "Authenticating..."
                ) : (
                  <>
                    {mode === "login" ? "Enter The Majlis" : "Register & Enter"}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-[9px] text-muted-foreground mt-4 font-serif uppercase tracking-wider">
            A private space for MENA's founders, operators & change-makers
          </p>
        </div>
      </div>
    </Layout>
  );
}
