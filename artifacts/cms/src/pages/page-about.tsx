import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Save, Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";

interface AboutStat { value: string; label: string }
interface AboutStep { num: string; title: string; body: string }
type AboutSectionType = "text" | "stats" | "steps" | "quote" | "cta";

interface AboutSection {
  id: string;
  type: AboutSectionType;
  enabled?: boolean;
  heading?: string;
  lead?: string;
  body?: string;
  note?: string;
  paragraphs?: string;
  regionLine?: string;
  stats?: AboutStat[];
  steps?: AboutStep[];
  quote?: string;
  author?: string;
  subcopy?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}

interface AboutConfig {
  hero: { tagline: string; titleLine1: string; titleLine2: string; subtitle: string; microcopy: string };
  punctuations: string[];
  sections: AboutSection[];
}

const HERO_DEFAULTS = {
  tagline: "Est. 2026 · The Tribunal",
  titleLine1: "A place to say what people",
  titleLine2: "usually keep private",
  subtitle: "The sharpest read on what the region really thinks.",
  microcopy: "No names attached. No public performance. Just the result.",
};

const DEFAULT_SECTIONS: AboutSection[] = [
  { id: "what-is-it", type: "text", enabled: true, heading: "What is The Tribunal?", lead: "The Tribunal is a private voting platform for the Middle East and North Africa.", body: "We ask the questions people usually avoid in public. People vote privately. The results are shown publicly.\n\nIt is a sharper way to see what people actually think when their names are not attached.\n\nIt is not a news site.\n\nIt is not a think tank.\n\nIt is not a comment section.\n\nYou can vote without creating an account. If you sign up, you can save your activity, view previous votes and predictions, and continue from another device.", note: "Private does not mean fake. If it is not human, it does not count." },
  { id: "the-sharpest-read", type: "stats", enabled: true, heading: "The sharpest read on the region.", paragraphs: "Public conversations are usually polished.\n\nPrivate conversations are usually honest.\n\nThe Tribunal exists to close that gap.\n\nEvery question is designed to surface a clearer signal: what people believe, what they expect, and where the region is shifting.", regionLine: "19 countries. One regional lens.", stats: [ { value: "100+", label: "Live Questions" }, { value: "19", label: "Countries Covered" }, { value: "Private", label: "Votes" }, { value: "Public", label: "Results" } ] },
  { id: "how-it-works", type: "steps", enabled: true, heading: "How The Tribunal Works", steps: [ { num: "01", title: "Choose a question.", body: "Debates ask what people believe. Predictions ask what people think will happen." }, { num: "02", title: "Vote privately.", body: "Your name and email are not shown with your vote." }, { num: "03", title: "See the result.", body: "Results are shown publicly in aggregate, with country and topic breakdowns where enough data exists." }, { num: "04", title: "Save your activity.", body: "You can vote without an account. If you sign up, you can view previous votes, track predictions and continue from another device." }, { num: "05", title: "Go deeper.", body: "Pulse adds sourced public signals. Voices profiles people with a view worth recording. The Gallery creates a private room for serious conversation." }, { num: "06", title: "Trust the process.", body: "Questions are human reviewed. Results are opinion signals, not scientific polling. No bots. No sponsored sentiment. No fake activity." } ] },
  { id: "from-the-founder", type: "quote", enabled: true, heading: "From the Founder", body: "This started with a question I kept asking in private rooms:\n\nWhat does the region actually think?\n\nNot what people say in public. Not what people post for approval. Not what leaders claim. Not what outsiders assume.\n\nWhat people actually think.\n\nThe Tribunal does not speak for the region. It records what people say when they can answer honestly.", quote: "\"People do not lack opinions. They lack a place to say them honestly.\"", author: "Kareem Kaddoura, Founder" },
  { id: "final-cta", type: "cta", enabled: true, heading: "See where you stand.", subcopy: "Vote privately. See the result publicly.", primaryLabel: "Cast Your Vote", primaryHref: "/debates", secondaryLabel: "Make a Prediction", secondaryHref: "/predictions" },
];

const SECTION_LABELS: Record<AboutSectionType, string> = {
  text: "Text block", stats: "Stats grid", steps: "Numbered steps", quote: "Quote", cta: "Call to action",
};

function newId(): string {
  try { return crypto.randomUUID(); } catch { return `s-${Date.now()}-${Math.floor(Math.random() * 1e6)}`; }
}

function blankSection(type: AboutSectionType): AboutSection {
  const base = { id: newId(), type, enabled: true, heading: "" };
  if (type === "text") return { ...base, lead: "", body: "", note: "" };
  if (type === "stats") return { ...base, paragraphs: "", regionLine: "", stats: [] };
  if (type === "steps") return { ...base, steps: [] };
  if (type === "quote") return { ...base, body: "", quote: "", author: "" };
  return { ...base, subcopy: "", primaryLabel: "", primaryHref: "/debates", secondaryLabel: "", secondaryHref: "/predictions" };
}

// Accept the new `sections` array or the legacy fixed-key shape.
function normalize(data: any): AboutConfig {
  const hero = { ...HERO_DEFAULTS, ...(data?.hero ?? {}) };
  const punctuations = data?.punctuations ?? ["."];
  if (Array.isArray(data?.sections) && data.sections.length) {
    return { hero, punctuations, sections: data.sections };
  }
  const hasLegacy = data?.whatIsIt || data?.sharpestRead || data?.howItWorks || data?.founderStatement || data?.finalCta;
  if (!hasLegacy) return { hero, punctuations, sections: DEFAULT_SECTIONS };
  const sections: AboutSection[] = [];
  if (data.whatIsIt) {
    const w = data.whatIsIt;
    const body = [w.body, ...(w.negations ?? []), w.accountNote].filter(Boolean).join("\n\n");
    sections.push({ id: "what-is-it", type: "text", enabled: true, heading: w.heading, lead: w.lead, body, note: w.note });
  }
  if (data.sharpestRead) sections.push({ id: "the-sharpest-read", type: "stats", enabled: true, heading: data.sharpestRead.heading, paragraphs: data.sharpestRead.paragraphs, regionLine: data.sharpestRead.regionLine, stats: data.sharpestRead.stats ?? [] });
  if (data.howItWorks) sections.push({ id: "how-it-works", type: "steps", enabled: true, heading: data.howItWorks.heading, steps: data.howItWorks.steps ?? [] });
  if (data.founderStatement) { const f = data.founderStatement; sections.push({ id: "from-the-founder", type: "quote", enabled: true, heading: f.heading, body: f.text, quote: f.quote, author: f.author }); }
  if (data.finalCta) { const c = data.finalCta; sections.push({ id: "final-cta", type: "cta", enabled: true, heading: c.heading, subcopy: c.subcopy, primaryLabel: c.primaryLabel, primaryHref: c.primaryHref, secondaryLabel: c.secondaryLabel, secondaryHref: c.secondaryHref }); }
  return { hero, punctuations, sections: sections.length ? sections : DEFAULT_SECTIONS };
}

const inputCls = "w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary";
const labelCls = "block text-xs text-muted-foreground uppercase tracking-wider mb-1";

export default function PageAbout() {
  const [config, setConfig] = useState<AboutConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getPage("about").then((data: any) => setConfig(normalize(data))).catch(console.error).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await api.updatePage("about", config as unknown as Record<string, unknown>);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  if (!config) return <div className="text-center py-12 text-red-500">Failed to load About page config</div>;

  const setHero = (patch: Partial<AboutConfig["hero"]>) => setConfig({ ...config, hero: { ...config.hero, ...patch } });
  const updateSection = (id: string, patch: Partial<AboutSection>) =>
    setConfig({ ...config, sections: config.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  const removeSection = (id: string) => setConfig({ ...config, sections: config.sections.filter((s) => s.id !== id) });
  const moveSection = (i: number, dir: -1 | 1) => {
    const arr = [...config.sections];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setConfig({ ...config, sections: arr });
  };
  const addSection = (type: AboutSectionType) => setConfig({ ...config, sections: [...config.sections, blankSection(type)] });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between sticky top-0 bg-background z-10 py-2">
        <h1 className="font-serif text-2xl font-bold uppercase tracking-wide">About Page<span className="text-primary">.</span></h1>
        <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-sm hover:bg-primary/90 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      {/* Hero (fixed) */}
      <section className="border border-border rounded-sm p-4 space-y-3">
        <h2 className="font-serif text-lg font-bold uppercase tracking-wide">Hero <span className="text-xs font-normal text-muted-foreground normal-case">(fixed page header)</span></h2>
        <div><label className={labelCls}>Tagline</label><input value={config.hero.tagline} onChange={e => setHero({ tagline: e.target.value })} className={inputCls} /></div>
        <div><label className={labelCls}>Title Line 1</label><input value={config.hero.titleLine1} onChange={e => setHero({ titleLine1: e.target.value })} className={inputCls} /></div>
        <div>
          <label className={labelCls}>Title Line 2</label>
          <div className="flex items-center gap-2">
            <input value={config.hero.titleLine2} onChange={e => setHero({ titleLine2: e.target.value })} className={`flex-1 ${inputCls}`} />
            <input value={(config.punctuations ?? ["."]).join("")} onChange={e => setConfig({ ...config, punctuations: e.target.value ? e.target.value.split("") : [] })} placeholder="." className="w-16 px-2 py-2 bg-background border border-border rounded-sm text-sm text-primary font-bold text-center focus:outline-none focus:ring-1 focus:ring-primary" title="Punctuation (renders in primary color)" />
          </div>
        </div>
        <div><label className={labelCls}>Subtitle</label><input value={config.hero.subtitle} onChange={e => setHero({ subtitle: e.target.value })} className={inputCls} /></div>
        <div><label className={labelCls}>Microcopy (optional)</label><input value={config.hero.microcopy} onChange={e => setHero({ microcopy: e.target.value })} className={inputCls} /></div>
      </section>

      {/* Dynamic sections */}
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-bold uppercase tracking-wide">Sections</h2>
        <p className="text-xs text-muted-foreground">{config.sections.length} section{config.sections.length === 1 ? "" : "s"} — drag order with ↑ ↓, hide with the toggle</p>
      </div>

      {config.sections.map((section, i) => (
        <section key={section.id} className={`border rounded-sm p-4 space-y-3 ${section.enabled === false ? "border-border/40 opacity-60" : "border-border"}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-secondary rounded-sm text-primary">{SECTION_LABELS[section.type]}</span>
              <span className="text-xs text-muted-foreground truncate max-w-[220px]">{section.heading || "(no heading)"}</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-xs text-muted-foreground"><input type="checkbox" checked={section.enabled !== false} onChange={e => updateSection(section.id, { enabled: e.target.checked })} className="accent-primary" /> Visible</label>
              <button disabled={i === 0} onClick={() => moveSection(i, -1)} className="text-muted-foreground hover:text-foreground disabled:opacity-25" title="Move up"><ChevronUp className="w-4 h-4" /></button>
              <button disabled={i === config.sections.length - 1} onClick={() => moveSection(i, 1)} className="text-muted-foreground hover:text-foreground disabled:opacity-25" title="Move down"><ChevronDown className="w-4 h-4" /></button>
              <button onClick={() => removeSection(section.id)} className="text-muted-foreground hover:text-red-500" title="Delete section"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>

          <div><label className={labelCls}>Heading</label><input value={section.heading ?? ""} onChange={e => updateSection(section.id, { heading: e.target.value })} className={inputCls} /></div>

          {section.type === "text" && (<>
            <div><label className={labelCls}>Lead paragraph (optional, larger)</label><textarea value={section.lead ?? ""} onChange={e => updateSection(section.id, { lead: e.target.value })} rows={2} className={`${inputCls} resize-y`} /></div>
            <div><label className={labelCls}>Body (separate paragraphs with a blank line)</label><textarea value={section.body ?? ""} onChange={e => updateSection(section.id, { body: e.target.value })} rows={6} className={`${inputCls} resize-y`} /></div>
            <div><label className={labelCls}>Italic note (optional)</label><input value={section.note ?? ""} onChange={e => updateSection(section.id, { note: e.target.value })} className={inputCls} /></div>
          </>)}

          {section.type === "stats" && (<>
            <div><label className={labelCls}>Paragraphs (blank line between; the 3rd is bolded)</label><textarea value={section.paragraphs ?? ""} onChange={e => updateSection(section.id, { paragraphs: e.target.value })} rows={5} className={`${inputCls} resize-y`} /></div>
            <div><label className={labelCls}>Region line (italic, optional)</label><input value={section.regionLine ?? ""} onChange={e => updateSection(section.id, { regionLine: e.target.value })} className={inputCls} /></div>
            <div>
              <div className="flex items-center justify-between mb-1"><label className={labelCls}>Stats</label><button onClick={() => updateSection(section.id, { stats: [...(section.stats ?? []), { value: "", label: "" }] })} className="flex items-center gap-1 px-2 py-1 text-xs bg-secondary rounded-sm hover:bg-secondary/80"><Plus className="w-3 h-3" /> Add</button></div>
              {(section.stats ?? []).map((s, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <input value={s.value} onChange={e => { const stats = [...(section.stats ?? [])]; stats[idx] = { ...s, value: e.target.value }; updateSection(section.id, { stats }); }} placeholder="Value" className="w-28 px-3 py-1.5 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                  <input value={s.label} onChange={e => { const stats = [...(section.stats ?? [])]; stats[idx] = { ...s, label: e.target.value }; updateSection(section.id, { stats }); }} placeholder="Label" className={inputCls} />
                  <button onClick={() => updateSection(section.id, { stats: (section.stats ?? []).filter((_, j) => j !== idx) })} className="text-muted-foreground hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </>)}

          {section.type === "steps" && (
            <div>
              <div className="flex items-center justify-between mb-1"><label className={labelCls}>Steps</label><button onClick={() => updateSection(section.id, { steps: [...(section.steps ?? []), { num: String((section.steps?.length ?? 0) + 1).padStart(2, "0"), title: "", body: "" }] })} className="flex items-center gap-1 px-2 py-1 text-xs bg-secondary rounded-sm hover:bg-secondary/80"><Plus className="w-3 h-3" /> Add Step</button></div>
              {(section.steps ?? []).map((s, idx) => (
                <div key={idx} className="border border-border/50 rounded-sm p-2 space-y-2 bg-card mb-2">
                  <div className="flex items-center justify-between">
                    <input value={s.num} onChange={e => { const steps = [...(section.steps ?? [])]; steps[idx] = { ...s, num: e.target.value }; updateSection(section.id, { steps }); }} className="w-16 px-2 py-1 bg-background border border-border rounded-sm text-sm text-primary font-bold focus:outline-none focus:ring-1 focus:ring-primary" />
                    <button onClick={() => updateSection(section.id, { steps: (section.steps ?? []).filter((_, j) => j !== idx) })} className="text-muted-foreground hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <input value={s.title} onChange={e => { const steps = [...(section.steps ?? [])]; steps[idx] = { ...s, title: e.target.value }; updateSection(section.id, { steps }); }} placeholder="Title" className={inputCls} />
                  <textarea value={s.body} onChange={e => { const steps = [...(section.steps ?? [])]; steps[idx] = { ...s, body: e.target.value }; updateSection(section.id, { steps }); }} rows={2} placeholder="Description" className={`${inputCls} resize-y`} />
                </div>
              ))}
            </div>
          )}

          {section.type === "quote" && (<>
            <div><label className={labelCls}>Statement (blank line between paragraphs)</label><textarea value={section.body ?? ""} onChange={e => updateSection(section.id, { body: e.target.value })} rows={6} className={`${inputCls} resize-y`} /></div>
            <div><label className={labelCls}>Pull quote</label><input value={section.quote ?? ""} onChange={e => updateSection(section.id, { quote: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Author</label><input value={section.author ?? ""} onChange={e => updateSection(section.id, { author: e.target.value })} className={inputCls} /></div>
          </>)}

          {section.type === "cta" && (<>
            <div><label className={labelCls}>Subcopy</label><input value={section.subcopy ?? ""} onChange={e => updateSection(section.id, { subcopy: e.target.value })} className={inputCls} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={labelCls}>Primary label</label><input value={section.primaryLabel ?? ""} onChange={e => updateSection(section.id, { primaryLabel: e.target.value })} className={inputCls} /></div>
              <div><label className={labelCls}>Primary link</label><input value={section.primaryHref ?? ""} onChange={e => updateSection(section.id, { primaryHref: e.target.value })} className={inputCls} /></div>
              <div><label className={labelCls}>Secondary label</label><input value={section.secondaryLabel ?? ""} onChange={e => updateSection(section.id, { secondaryLabel: e.target.value })} className={inputCls} /></div>
              <div><label className={labelCls}>Secondary link</label><input value={section.secondaryHref ?? ""} onChange={e => updateSection(section.id, { secondaryHref: e.target.value })} className={inputCls} /></div>
            </div>
            <p className="text-xs text-muted-foreground">Pulse / Voices / Gallery buttons appear automatically when enabled in Site Settings.</p>
          </>)}
        </section>
      ))}

      {/* Add section */}
      <div className="border border-dashed border-border rounded-sm p-4">
        <p className={labelCls}>Add a section</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SECTION_LABELS) as AboutSectionType[]).map((type) => (
            <button key={type} onClick={() => addSection(type)} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-secondary rounded-sm hover:bg-secondary/80">
              <Plus className="w-3 h-3" /> {SECTION_LABELS[type]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
