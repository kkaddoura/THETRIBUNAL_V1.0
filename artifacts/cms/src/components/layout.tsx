import type React from "react";
import { useAuth } from "@/lib/auth";
import { useLocation, Link } from "wouter";
import { LayoutDashboard, MessageSquare, TrendingUp, Users, LogOut, Home, Mail, FileText, BarChart3, Activity, Info, HelpCircle, ScrollText, Phone, Shield, Palette, Sparkles, Lightbulb, Settings, Vote, UserPlus, Tags } from "lucide-react";

const NAV_SECTIONS = [
  {
    label: "OVERVIEW",
    items: [
      { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { path: "/analytics", label: "Analytics", icon: BarChart3 },
      { path: "/homepage", label: "Homepage", icon: Home },
    ],
  },
  {
    label: "CONTENT",
    items: [
      { path: "/debates", label: "Debates", icon: MessageSquare },
      { path: "/predictions", label: "Predictions", icon: TrendingUp },
      { path: "/pulse", label: "Pulse", icon: Activity },
      { path: "/voices", label: "Voices", icon: Users },
      { path: "/ideation", label: "Ideation Engine", icon: Lightbulb },
      { path: "/design-tokens", label: "Design Tokens", icon: Palette },
    ],
  },
  {
    label: "PAGES",
    items: [
      { path: "/pages/about", label: "About", icon: Info },
      { path: "/pages/faq", label: "FAQ", icon: HelpCircle },
      { path: "/pages/terms", label: "Terms", icon: ScrollText },
      { path: "/pages/contact", label: "Contact", icon: Phone },
      { path: "/pages/debates", label: "Debates Page", icon: MessageSquare },
      { path: "/pages/predictions", label: "Predictions Page", icon: TrendingUp },
      { path: "/pages/voices", label: "Voices Page", icon: Users },
      { path: "/pages/polls", label: "Polls Page", icon: Vote },
      { path: "/pages/apply", label: "Apply Page", icon: UserPlus },
    ],
  },
  {
    label: "DISTRIBUTION",
    items: [
      { path: "/studio", label: "Social Studio", icon: Sparkles },
      { path: "/newsletter", label: "Weekly Digest", icon: Mail },
    ],
  },
  {
    label: "SETTINGS",
    items: [
      { path: "/site-settings", label: "Site Settings", icon: Settings },
      { path: "/categories", label: "Categories", icon: Tags },
    ],
  },
  {
    label: "COMMUNITY",
    items: [
      { path: "/majlis", label: "The Majlis", icon: Shield },
    ],
  },
  {
    label: "AUDIENCE",
    items: [
      { path: "/subscribers", label: "Subscribers", icon: Mail },
      { path: "/applications", label: "Applications", icon: FileText },
    ],
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { logout, username } = useAuth();
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-56 border-r border-border bg-card flex flex-col shrink-0">
        <div className="p-4 border-b border-border">
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 900, fontSize: "1rem", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            <span className="text-foreground">THE TRIBUNAL</span><span className="text-primary">.</span>
          </h1>
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "0.5rem", textTransform: "uppercase", letterSpacing: "0.2em", color: "hsl(var(--muted-foreground))", marginTop: "0.15rem" }}>
            CMS
          </p>
        </div>
        <nav className="flex-1 p-2 space-y-3 overflow-auto">
          {NAV_SECTIONS.map(section => (
            <div key={section.label}>
              <p className="px-3 py-1 text-[0.6rem] font-bold text-muted-foreground uppercase tracking-widest" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const isActive = location === item.path || (item.path !== "/dashboard" && location.startsWith(item.path));
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={`flex items-center gap-2.5 px-3 py-1.5 text-sm transition-colors ${
                        isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      <item.icon className="w-3.5 h-3.5" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{username}</span>
            <button onClick={logout} className="text-muted-foreground hover:text-foreground transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
