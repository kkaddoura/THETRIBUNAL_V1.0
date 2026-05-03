import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Save, Plus, Trash2 } from "lucide-react";
interface ApplyConfig {
  hero: { tagline: string; titleLine1: string; titleLine2: string; subtitle: string };
  criteria: string[];
  criteriaHeading: string;
  countries: string[];
  sectors: string[];
  successMessage: { title: string; subtitle: string; cta: string };
  disclaimer: string;
  punctuations?: string[];
}

export default function PageApply() {
  const [config, setConfig] = useState<ApplyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getPage("apply").then((data: any) => {
      setConfig({
        hero: { tagline: "The Voices", titleLine1: "Think You Belong", titleLine2: "In The Voices?", subtitle: "We're building the most credible founder directory in the Middle East. Not everyone makes the cut. The bar is high — because our audience is discerning.", ...data?.hero },
        criteria: data?.criteria ?? [],
        criteriaHeading: data?.criteriaHeading ?? "",
        countries: data?.countries ?? [],
        sectors: data?.sectors ?? [],
        successMessage: { title: "", subtitle: "", cta: "", ...data?.successMessage },
        disclaimer: data?.disclaimer ?? "",
        punctuations: data?.punctuations ?? ["."],
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await api.updatePage("apply", config as unknown as Record<string, unknown>);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  if (!config) return <div className="text-center py-12 text-red-500">Failed to load Apply page config</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold uppercase tracking-wide">Apply Page<span className="text-primary">.</span></h1>
        <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-sm hover:bg-primary/90 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      <section className="border border-border rounded-sm p-4 space-y-3">
        <h2 className="font-serif text-lg font-bold uppercase tracking-wide">Hero Section</h2>
        <div>
          <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">Tagline</label>
          <input value={config.hero.tagline} onChange={e => setConfig({ ...config, hero: { ...config.hero, tagline: e.target.value } })} className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">Title Line 1</label>
          <input value={config.hero.titleLine1} onChange={e => setConfig({ ...config, hero: { ...config.hero, titleLine1: e.target.value } })} className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">Title Line 2</label>
          <div className="flex items-center gap-2">
            <input value={config.hero.titleLine2} onChange={e => setConfig({ ...config, hero: { ...config.hero, titleLine2: e.target.value } })} className="flex-1 px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            <input value={(config.punctuations ?? ["."]).join("")} onChange={e => setConfig({ ...config, punctuations: e.target.value ? e.target.value.split("") : [] })} placeholder="." className="w-16 px-2 py-2 bg-background border border-border rounded-sm text-sm text-primary font-bold text-center focus:outline-none focus:ring-1 focus:ring-primary" title="Punctuation (renders in primary color)" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">Subtitle</label>
          <textarea value={config.hero.subtitle} onChange={e => setConfig({ ...config, hero: { ...config.hero, subtitle: e.target.value } })} rows={3} className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
        </div>
      </section>

      <section className="border border-border rounded-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg font-bold uppercase tracking-wide">Criteria</h2>
            <div className="mt-1">
              <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">Section Heading</label>
              <input value={config.criteriaHeading} onChange={e => setConfig({ ...config, criteriaHeading: e.target.value })} className="w-48 px-2 py-1 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>
          <button onClick={() => setConfig({ ...config, criteria: [...config.criteria, ""] })} className="flex items-center gap-1 px-2 py-1 text-xs bg-secondary rounded-sm hover:bg-secondary/80">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
        {config.criteria.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={c} onChange={e => { const criteria = [...config.criteria]; criteria[i] = e.target.value; setConfig({ ...config, criteria }); }} className="flex-1 px-3 py-1.5 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            <button onClick={() => setConfig({ ...config, criteria: config.criteria.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-red-500">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-2 gap-4">
        <section className="border border-border rounded-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold uppercase tracking-wide">Countries</h2>
            <button onClick={() => setConfig({ ...config, countries: [...config.countries, ""] })} className="flex items-center gap-1 px-2 py-1 text-xs bg-secondary rounded-sm hover:bg-secondary/80">
              <Plus className="w-3 h-3" />
            </button>
          </div>
          {config.countries.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={c} onChange={e => { const countries = [...config.countries]; countries[i] = e.target.value; setConfig({ ...config, countries }); }} className="flex-1 px-2 py-1.5 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              <button onClick={() => setConfig({ ...config, countries: config.countries.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-red-500">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </section>

        <section className="border border-border rounded-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold uppercase tracking-wide">Sectors</h2>
            <button onClick={() => setConfig({ ...config, sectors: [...config.sectors, ""] })} className="flex items-center gap-1 px-2 py-1 text-xs bg-secondary rounded-sm hover:bg-secondary/80">
              <Plus className="w-3 h-3" />
            </button>
          </div>
          {config.sectors.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={s} onChange={e => { const sectors = [...config.sectors]; sectors[i] = e.target.value; setConfig({ ...config, sectors }); }} className="flex-1 px-2 py-1.5 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              <button onClick={() => setConfig({ ...config, sectors: config.sectors.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-red-500">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </section>
      </div>

      <section className="border border-border rounded-sm p-4 space-y-3">
        <h2 className="font-serif text-lg font-bold uppercase tracking-wide">Success Message</h2>
        <div>
          <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">Title</label>
          <input value={config.successMessage.title} onChange={e => setConfig({ ...config, successMessage: { ...config.successMessage, title: e.target.value } })} className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">Subtitle</label>
          <textarea value={config.successMessage.subtitle} onChange={e => setConfig({ ...config, successMessage: { ...config.successMessage, subtitle: e.target.value } })} rows={2} className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">CTA Text</label>
          <input value={config.successMessage.cta} onChange={e => setConfig({ ...config, successMessage: { ...config.successMessage, cta: e.target.value } })} className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
      </section>

      <section className="border border-border rounded-sm p-4 space-y-3">
        <h2 className="font-serif text-lg font-bold uppercase tracking-wide">Disclaimer</h2>
        <textarea value={config.disclaimer} onChange={e => setConfig({ ...config, disclaimer: e.target.value })} rows={3} className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
      </section>
    </div>
  );
}
