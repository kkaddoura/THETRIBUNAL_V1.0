import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Save, Plus, Trash2 } from "lucide-react";

interface ImpactStatement {
  company: string;
  statement: string;
}

interface StatBar {
  label: string;
  value: string;
}

interface VoicesPageConfig {
  hero: { titleLine1: string; titleLine2: string; subtitle: string };
  punctuations?: string[];
  impactStatements: ImpactStatement[];
  statsBar: StatBar[];
  filterLabels: { sector: string; country: string; featured: string; verified: string };
}

export default function PageVoices() {
  const [config, setConfig] = useState<VoicesPageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getPage("voices_page").then(setConfig).catch(console.error).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await api.updatePage("voices_page", config as unknown as Record<string, unknown>);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  if (!config) return <div className="text-center py-12 text-red-500">Failed to load voices page config</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold uppercase tracking-wide">Voices Page Config<span className="text-primary">.</span></h1>
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
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold uppercase tracking-wide">Impact Statements</h2>
          <button onClick={() => setConfig({ ...config, impactStatements: [...config.impactStatements, { company: "", statement: "" }] })} className="flex items-center gap-1 px-2 py-1 text-xs bg-secondary rounded-sm hover:bg-secondary/80">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
        {config.impactStatements.map((item, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input value={item.company} onChange={e => { const arr = [...config.impactStatements]; arr[i] = { ...item, company: e.target.value }; setConfig({ ...config, impactStatements: arr }); }} placeholder="Company" className="flex-1 px-2 py-1.5 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            <input value={item.statement} onChange={e => { const arr = [...config.impactStatements]; arr[i] = { ...item, statement: e.target.value }; setConfig({ ...config, impactStatements: arr }); }} placeholder="Statement" className="flex-[2] px-2 py-1.5 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            <button onClick={() => setConfig({ ...config, impactStatements: config.impactStatements.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </section>

      <section className="border border-border rounded-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold uppercase tracking-wide">Stats Bar</h2>
          <button onClick={() => setConfig({ ...config, statsBar: [...config.statsBar, { label: "", value: "" }] })} className="flex items-center gap-1 px-2 py-1 text-xs bg-secondary rounded-sm hover:bg-secondary/80">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {config.statsBar.map((item, i) => (
            <div key={i} className="flex gap-2 items-center p-2 border border-border/50 rounded-sm">
              <input value={item.label} onChange={e => { const arr = [...config.statsBar]; arr[i] = { ...item, label: e.target.value }; setConfig({ ...config, statsBar: arr }); }} placeholder="Label" className="flex-1 px-2 py-1 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              <input value={item.value} onChange={e => { const arr = [...config.statsBar]; arr[i] = { ...item, value: e.target.value }; setConfig({ ...config, statsBar: arr }); }} placeholder="Value" className="w-20 px-2 py-1 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              <button onClick={() => setConfig({ ...config, statsBar: config.statsBar.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      </section>

      <section className="border border-border rounded-sm p-4 space-y-3">
        <h2 className="font-serif text-lg font-bold uppercase tracking-wide">Filter Labels</h2>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(config.filterLabels).map(([key, val]) => (
            <div key={key}>
              <label className="block text-[0.6rem] text-muted-foreground uppercase mb-0.5">{key}</label>
              <input value={val} onChange={e => setConfig({ ...config, filterLabels: { ...config.filterLabels, [key]: e.target.value } })} className="w-full px-2 py-1.5 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
