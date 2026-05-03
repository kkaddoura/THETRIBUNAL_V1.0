import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useLocation } from "wouter";
import { MessageSquare, TrendingUp, Users, Clock, ArrowRight, Zap } from "lucide-react";

interface VoteCounts {
  debates: { real: number; dummy: number };
  predictions: { real: number; dummy: number };
}

interface Stats {
  debates: { total: number; drafts: number; live: number; flagged: number; inReview: number; archived: number };
  predictions: { total: number; drafts: number; live: number; flagged: number; inReview: number; archived: number };
  voices: { total: number; drafts: number; live: number; flagged: number; inReview: number; archived: number };
  recentActivity: Array<{ type: string; id: number; title: string; status: string; updatedAt: string }>;
  voteCounts?: VoteCounts;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-yellow-500/20 text-yellow-400",
  in_review: "bg-blue-500/20 text-blue-400",
  approved: "bg-green-500/20 text-green-400",
  rejected: "bg-red-500/20 text-red-400",
  revision: "bg-orange-500/20 text-orange-400",
  flagged: "bg-red-500/20 text-red-400",
  archived: "bg-gray-500/20 text-gray-400",
};

interface BoostCategory {
  name: string;
  count: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [boostCategories, setBoostCategories] = useState<BoostCategory[]>([]);
  const [boosting, setBoosting] = useState(false);
  const [boostMessage, setBoostMessage] = useState<string | null>(null);
  const [, navigate] = useLocation();

  const loadStats = () => {
    api.getStats().then(setStats).catch(console.error);
  };

  useEffect(() => {
    loadStats();
    api.getBoostCategories().then((r: { categories: BoostCategory[] }) => setBoostCategories(r.categories)).catch(console.error);
  }, []);

  const handleBoost = async (scope: "all" | "category", category?: string) => {
    if (boosting) return;
    setBoosting(true);
    setBoostMessage(null);
    try {
      const result = await api.boostVotes({ scope, category });
      setBoostMessage(`Boosted ${result.boostedPolls} debates and ${result.boostedPredictions} predictions`);
      loadStats();
    } catch (err) {
      setBoostMessage("Boost failed");
      console.error(err);
    } finally {
      setBoosting(false);
      setTimeout(() => setBoostMessage(null), 4000);
    }
  };

  if (!stats) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div>;
  }

  const sections = [
    { key: "debates", label: "Debates", icon: MessageSquare, stats: stats.debates, path: "/debates" },
    { key: "predictions", label: "Predictions", icon: TrendingUp, stats: stats.predictions, path: "/predictions" },
    { key: "voices", label: "Voices", icon: Users, stats: stats.voices, path: "/voices" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-bold uppercase tracking-wide">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Content overview and quick actions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sections.map(s => (
          <button
            key={s.key}
            onClick={() => navigate(s.path)}
            className="bg-card border border-border rounded-lg p-5 text-left hover:border-primary/50 transition-colors group"
          >
            <div className="flex items-center justify-between mb-4">
              <s.icon className="w-5 h-5 text-primary" />
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="font-serif text-lg font-bold">{s.label}</p>
            <p className="text-3xl font-bold mt-1">{s.stats.total}</p>
            <div className="flex flex-wrap gap-3 mt-3 text-xs">
              <span className="text-green-400">{s.stats.live} live</span>
              <span className="text-yellow-400">{s.stats.drafts} drafts</span>
              {s.stats.inReview > 0 && <span className="text-blue-400">{s.stats.inReview} in review</span>}
              {s.stats.flagged > 0 && <span className="text-red-400">{s.stats.flagged} flagged</span>}
              {s.stats.archived > 0 && <span className="text-gray-400">{s.stats.archived} archived</span>}
            </div>
          </button>
        ))}
      </div>

      {/* Vote Counts: Real vs Dummy */}
      {stats.voteCounts && (
        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="font-serif text-lg font-bold mb-4">Vote Counts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-border rounded p-4">
              <p className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Debates</p>
              <div className="flex gap-6">
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Real</p>
                  <p className="text-2xl font-bold text-green-400">{stats.voteCounts.debates.real.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Dummy</p>
                  <p className="text-2xl font-bold text-orange-400">{stats.voteCounts.debates.dummy.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{(stats.voteCounts.debates.real + stats.voteCounts.debates.dummy).toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="border border-border rounded p-4">
              <p className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Predictions</p>
              <div className="flex gap-6">
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Real</p>
                  <p className="text-2xl font-bold text-green-400">{stats.voteCounts.predictions.real.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Dummy</p>
                  <p className="text-2xl font-bold text-orange-400">{stats.voteCounts.predictions.dummy.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{(stats.voteCounts.predictions.real + stats.voteCounts.predictions.dummy).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Boost Votes */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-orange-400" />
            <h2 className="font-serif text-lg font-bold">Boost Votes</h2>
          </div>
          {boostMessage && <span className="text-xs text-green-400">{boostMessage}</span>}
        </div>
        <p className="text-xs text-muted-foreground mb-4">Adds 2-10% random increment to dummy vote counts.</p>
        <div className="space-y-3">
          <button
            onClick={() => handleBoost("all")}
            disabled={boosting}
            className="w-full bg-primary text-primary-foreground font-bold text-sm py-2 px-4 rounded hover:opacity-90 disabled:opacity-50"
          >
            {boosting ? "Boosting..." : "Boost All"}
          </button>
          {boostCategories.length > 0 && (
            <div>
              <p className="text-xs uppercase text-muted-foreground mb-2">Boost by Category</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {boostCategories.map(cat => (
                  <button
                    key={cat.name}
                    onClick={() => handleBoost("category", cat.name)}
                    disabled={boosting}
                    className="text-left text-xs bg-secondary hover:bg-secondary/80 px-3 py-2 rounded border border-border disabled:opacity-50"
                  >
                    <span className="font-bold">{cat.name}</span>
                    <span className="text-muted-foreground ml-1">({cat.count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-serif text-lg font-bold">Recent Activity</h2>
        </div>
        {stats.recentActivity.length === 0 ? (
          <p className="text-muted-foreground text-sm">No recent activity</p>
        ) : (
          <div className="space-y-2">
            {stats.recentActivity.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-muted-foreground uppercase w-20 shrink-0">{item.type}</span>
                  <span className="text-sm truncate">{item.title}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[item.status] || "bg-gray-500/20 text-gray-400"}`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
