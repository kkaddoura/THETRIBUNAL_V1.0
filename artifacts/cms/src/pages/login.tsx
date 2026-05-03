import type React from "react";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";

export default function LoginPage() {
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, pin);
      navigate("/dashboard");
    } catch {
      setError("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 900, fontSize: "1.8rem", letterSpacing: "-0.02em", lineHeight: 1 }}>
            <span className="text-foreground">THE TRIBUNAL</span><span className="text-primary">.</span>
          </h1>
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.25em", color: "hsl(var(--muted-foreground))", marginTop: "0.5rem" }}>
            Content Management System
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-3 py-2 bg-card border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Username"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">PIN</label>
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              className="w-full px-3 py-2 bg-card border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="••••"
              required
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
