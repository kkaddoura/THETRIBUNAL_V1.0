import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Save, Plus, Trash2 } from "lucide-react";

interface TickerItem {
  topic: string;
  votes: string;
}

interface PollsConfig {
  hero: { titleLine1: string; titleLine2: string; subtitle: string };
  punctuations?: string[];
  tickerItems: TickerItem[];
  tickerSource: string;
}

export default function PagePolls() {
  const [config, setConfig] = useState<PollsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getPage("polls").then(setConfig).catch(console.error).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await api.updatePage("polls", config as unknown as Record<string, unknown>);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  if (!config) return <div className="text-center py-12 text-red-500">Failed to load Polls page config</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold uppercase tracking-wide">Polls Page<span className="text-primary">.</span></h1>
        <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-sm hover:bg-primary/90 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      <section className="border border-border rounded-sm p-4 space-y-3">
        <h2 className="font-serif text-lg font-bold uppercase tracking-wide">Hero Section</h2>
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
        <div>
          <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">Subtitle</label>
          <textarea value={config.hero.subtitle} onChange={e => setConfig({ ...config, hero: { ...config.hero, subtitle: e.target.value } })} rows={2} className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
        </div>
      </section>

      <section className="border border-border rounded-sm p-4 space-y-3">
        <h2 className="font-serif text-lg font-bold uppercase tracking-wide">Ticker Source</h2>
        <select value={config.tickerSource} onChange={e => setConfig({ ...config, tickerSource: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="manual">Manual (items below)</option>
          <option value="latest_debates">Auto: Latest Debates</option>
          <option value="trending">Auto: Trending by Votes</option>
        </select>
      </section>

      <section className="border border-border rounded-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold uppercase tracking-wide">Ticker Items</h2>
          <button onClick={() => setConfig({ ...config, tickerItems: [...config.tickerItems, { topic: "", votes: "0" }] })} className="flex items-center gap-1 px-2 py-1 text-xs bg-secondary rounded-sm hover:bg-secondary/80">
            <Plus className="w-3 h-3" /> Add Item
          </button>
        </div>
        {config.tickerItems.map((item, i) => (
          <div key={i} className="flex items-center gap-2 border border-border/50 rounded-sm p-2 bg-card">
            <input value={item.topic} onChange={e => { const items = [...config.tickerItems]; items[i] = { ...item, topic: e.target.value }; setConfig({ ...config, tickerItems: items }); }} placeholder="Topic" className="flex-1 px-2 py-1.5 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            <input value={item.votes} onChange={e => { const items = [...config.tickerItems]; items[i] = { ...item, votes: e.target.value }; setConfig({ ...config, tickerItems: items }); }} placeholder="Votes" className="w-24 px-2 py-1.5 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            <button onClick={() => setConfig({ ...config, tickerItems: config.tickerItems.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-red-500">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
