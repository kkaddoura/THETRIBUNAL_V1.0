import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Save, Plus, Trash2, GripVertical } from "lucide-react";
interface TermsSection {
  id: string;
  title: string;
  content: string;
}

interface TermsConfig {
  titleLine1: string;
  titleLine2: string;
  lastUpdated: string;
  sections: TermsSection[];
  punctuations?: string[];
}

export default function PageTerms() {
  const [config, setConfig] = useState<TermsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getPage("terms").then((data: any) => {
      setConfig({
        titleLine1: data?.titleLine1 ?? "Terms &",
        titleLine2: data?.titleLine2 ?? "Conditions",
        lastUpdated: data?.lastUpdated ?? "",
        sections: data?.sections ?? [],
        punctuations: data?.punctuations ?? ["."],
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await api.updatePage("terms", config as unknown as Record<string, unknown>);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  if (!config) return <div className="text-center py-12 text-red-500">Failed to load Terms config</div>;

  const updateSection = (i: number, updates: Partial<TermsSection>) => {
    const sections = [...config.sections];
    sections[i] = { ...sections[i], ...updates };
    setConfig({ ...config, sections });
  };

  const addSection = () => {
    const num = config.sections.length + 1;
    setConfig({
      ...config,
      sections: [...config.sections, { id: `section-${Date.now()}`, title: `${num}. New Section`, content: "" }],
    });
  };

  const deleteSection = (i: number) => {
    if (!confirm("Delete this section?")) return;
    setConfig({ ...config, sections: config.sections.filter((_, j) => j !== i) });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold uppercase text-primary tracking-wide">Terms & Conditions<span className="text-primary">.</span></h1>
          <p className="text-xs text-muted-foreground mt-1">{config.sections.length} sections</p>
        </div>
        <div className="flex gap-2">
          <button onClick={addSection} className="flex items-center gap-1 px-3 py-2 bg-secondary text-secondary-foreground rounded-sm text-sm hover:bg-secondary/80">
            <Plus className="w-3.5 h-3.5" /> Add Section
          </button>
          <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-sm hover:bg-primary/90 disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="border border-border rounded-sm p-4 space-y-3">
        <div>
          <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">Title Line 1</label>
          <input value={config.titleLine1} onChange={e => setConfig({ ...config, titleLine1: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">Title Line 2</label>
          <div className="flex items-center gap-2">
            <input value={config.titleLine2} onChange={e => setConfig({ ...config, titleLine2: e.target.value })} className="flex-1 px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            <input value={(config.punctuations ?? ["."]).join("")} onChange={e => setConfig({ ...config, punctuations: e.target.value ? e.target.value.split("") : [] })} placeholder="." className="w-16 px-2 py-2 bg-background border border-border rounded-sm text-sm text-primary font-bold text-center focus:outline-none focus:ring-1 focus:ring-primary" title="Punctuation (renders in primary color)" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">Last Updated</label>
          <input type="date" value={config.lastUpdated} onChange={e => setConfig({ ...config, lastUpdated: e.target.value })} className="px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
      </div>

      {config.sections.map((section, i) => (
        <section key={section.id} className="border border-border rounded-sm p-4 space-y-3 bg-card">
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-muted-foreground/40" />
            <input value={section.title} onChange={e => updateSection(i, { title: e.target.value })} className="flex-1 px-2 py-1.5 bg-background border border-border rounded-sm text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary" />
            <button onClick={() => deleteSection(i)} className="text-muted-foreground hover:text-red-500">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <textarea value={section.content} onChange={e => updateSection(i, { content: e.target.value })} rows={4} className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
        </section>
      ))}
    </div>
  );
}
