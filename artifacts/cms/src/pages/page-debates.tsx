import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Save } from "lucide-react";

interface DebatesPageConfig {
  hero: { titleLine1: string; titleLine2: string; subtitle: string };
  punctuations?: string[];
  ticker: { enabled: boolean; source: string };
  sortLabels: { latest: string; trending: string; ending_soon: string };
  emptyState: { title: string; body: string };
}

export default function PageDebates() {
  const [config, setConfig] = useState<DebatesPageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getPage("debates_page").then(setConfig).catch(console.error).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await api.updatePage("debates_page", config as unknown as Record<string, unknown>);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  if (!config) return <div className="text-center py-12 text-red-500">Failed to load debates page config</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold uppercase tracking-wide">Debates Page Config<span className="text-primary">.</span></h1>
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
            <option value="latest_debates">Latest Debates</option>
            <option value="trending_debates">Trending Debates</option>
            <option value="featured_debates">Featured Debates</option>
          </select>
        </div>
      </section>

      <section className="border border-border rounded-sm p-4 space-y-3">
        <h2 className="font-serif text-lg font-bold uppercase tracking-wide">Sort Labels</h2>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(config.sortLabels).map(([key, val]) => (
            <div key={key}>
              <label className="block text-[0.6rem] text-muted-foreground uppercase mb-0.5">{key}</label>
              <input value={val} onChange={e => setConfig({ ...config, sortLabels: { ...config.sortLabels, [key]: e.target.value } })} className="w-full px-2 py-1.5 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          ))}
        </div>
      </section>

      <section className="border border-border rounded-sm p-4 space-y-3">
        <h2 className="font-serif text-lg font-bold uppercase tracking-wide">Empty State</h2>
        <input value={config.emptyState.title} onChange={e => setConfig({ ...config, emptyState: { ...config.emptyState, title: e.target.value } })} placeholder="Title" className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
        <textarea value={config.emptyState.body} onChange={e => setConfig({ ...config, emptyState: { ...config.emptyState, body: e.target.value } })} rows={2} placeholder="Body" className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
      </section>
    </div>
  );
}
