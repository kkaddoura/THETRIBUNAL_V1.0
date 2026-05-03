import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Save, X, Plus } from "lucide-react";

interface PredictionsPageConfig {
  hero: { titleLine1: string; titleLine2: string; subtitle: string };
  punctuations?: string[];
  ticker: { enabled: boolean; source: string };
  categories: string[];
}

const DEFAULT_CATEGORIES = [
  "Economy & Finance", "Technology & AI", "Energy & Climate", "Culture & Society",
  "Business & Startups", "Geopolitics & Governance", "Education & Workforce",
  "Infrastructure & Cities", "Sports & Entertainment", "Health & Demographics",
];

export default function PagePredictions() {
  const [config, setConfig] = useState<PredictionsPageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newCat, setNewCat] = useState("");

  useEffect(() => {
    api.getPage("predictions_page").then(data => {
      const { featuredIds, ...rest } = data as Record<string, unknown>;
      void featuredIds;
      setConfig(rest as unknown as PredictionsPageConfig);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await api.updatePage("predictions_page", config as unknown as Record<string, unknown>);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  const addCategory = (cat: string) => {
    if (!config || !cat.trim() || config.categories.includes(cat.trim())) return;
    setConfig({ ...config, categories: [...config.categories, cat.trim()] });
    setNewCat("");
  };

  const removeCategory = (index: number) => {
    if (!config) return;
    setConfig({ ...config, categories: config.categories.filter((_, i) => i !== index) });
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  if (!config) return <div className="text-center py-12 text-red-500">Failed to load predictions page config</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold uppercase tracking-wide">Predictions Page Config<span className="text-primary">.</span></h1>
        <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-sm hover:bg-primary/90 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      <section className="border border-border rounded-sm p-4 space-y-3">
        <h2 className="font-serif text-lg font-bold uppercase tracking-wide">Hero</h2>
        <div>
          <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">Title Line 1</label>
          <input value={config.hero.titleLine1} onChange={e => setConfig({ ...config, hero: { ...config.hero, titleLine1: e.target.value } })} placeholder="Line 1" className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">Title Line 2</label>
          <div className="flex items-center gap-2">
            <input value={config.hero.titleLine2} onChange={e => setConfig({ ...config, hero: { ...config.hero, titleLine2: e.target.value } })} placeholder="Line 2" className="flex-1 px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            <input value={(config.punctuations ?? ["."]).join("")} onChange={e => setConfig({ ...config, punctuations: e.target.value ? e.target.value.split("") : [] })} placeholder="." className="w-16 px-2 py-2 bg-background border border-border rounded-sm text-sm text-primary font-bold text-center focus:outline-none focus:ring-1 focus:ring-primary" title="Punctuation (renders in primary color)" />
          </div>
        </div>
        <textarea value={config.hero.subtitle} onChange={e => setConfig({ ...config, hero: { ...config.hero, subtitle: e.target.value } })} rows={2} placeholder="Subtitle" className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
      </section>

      <section className="border border-border rounded-sm p-4 space-y-3">
        <h2 className="font-serif text-lg font-bold uppercase tracking-wide">Ticker</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={config.ticker.enabled} onChange={e => setConfig({ ...config, ticker: { ...config.ticker, enabled: e.target.checked } })} className="rounded" />
          Ticker Enabled
        </label>
        <div>
          <label className="block text-[0.6rem] text-muted-foreground uppercase mb-0.5">Source</label>
          <select value={config.ticker.source} onChange={e => setConfig({ ...config, ticker: { ...config.ticker, source: e.target.value } })} className="w-full px-2 py-1.5 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary">
            <option value="latest_predictions">Latest Predictions</option>
            <option value="trending_predictions">Trending Predictions</option>
            <option value="featured_predictions">Featured Predictions</option>
          </select>
        </div>
      </section>

      <section className="border border-border rounded-sm p-4 space-y-3">
        <h2 className="font-serif text-lg font-bold uppercase tracking-wide">Categories</h2>
        <div className="flex flex-wrap gap-1.5">
          {config.categories.map((cat, i) => (
            <span key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary text-secondary-foreground rounded-sm text-xs">
              {cat}
              <button onClick={() => removeCategory(i)} className="hover:text-red-500 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newCat}
            onChange={e => setNewCat(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCategory(newCat); } }}
            placeholder="Add category..."
            className="flex-1 px-2 py-1.5 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button onClick={() => addCategory(newCat)} className="flex items-center gap-1 px-2 py-1.5 bg-secondary rounded-sm text-xs hover:bg-secondary/80">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          {DEFAULT_CATEGORIES.filter(c => !config.categories.includes(c)).map(c => (
            <button key={c} onClick={() => addCategory(c)} className="px-1.5 py-0.5 text-[0.6rem] border border-border/50 rounded-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors">
              + {c}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
