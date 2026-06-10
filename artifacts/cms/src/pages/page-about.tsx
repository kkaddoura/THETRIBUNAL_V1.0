import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Save, Plus, Trash2 } from "lucide-react";

interface AboutStat { value: string; label: string }
interface AboutStep { num: string; title: string; body: string }

interface AboutConfig {
  hero: { tagline: string; titleLine1: string; titleLine2: string; subtitle: string; microcopy: string };
  whatIsIt: { heading: string; lead: string; body: string; negations: string[]; note: string; accountNote: string };
  sharpestRead: { heading: string; paragraphs: string; regionLine: string; stats: AboutStat[] };
  howItWorks: { heading: string; steps: AboutStep[] };
  founderStatement: { heading: string; text: string; quote: string; author: string };
  finalCta: { heading: string; subcopy: string; primaryLabel: string; primaryHref: string; secondaryLabel: string; secondaryHref: string };
  punctuations?: string[];
}

// Mirrors ABOUT_DEFAULTS in the platform's about.tsx so the editor opens with
// the live copy pre-filled and saving reproduces the page exactly.
const DEFAULTS: AboutConfig = {
  hero: {
    tagline: "Est. 2026 · The Tribunal",
    titleLine1: "A place to say what people",
    titleLine2: "usually keep private",
    subtitle: "The sharpest read on what the region really thinks.",
    microcopy: "No names attached. No public performance. Just the result.",
  },
  whatIsIt: {
    heading: "What is The Tribunal?",
    lead: "The Tribunal is a private voting platform for the Middle East and North Africa.",
    body: "We ask the questions people usually avoid in public. People vote privately. The results are shown publicly.\n\nIt is a sharper way to see what people actually think when their names are not attached.",
    negations: ["It is not a news site.", "It is not a think tank.", "It is not a comment section."],
    note: "Private does not mean fake. If it is not human, it does not count.",
    accountNote: "You can vote without creating an account. If you sign up, you can save your activity, view previous votes and predictions, and continue from another device.",
  },
  sharpestRead: {
    heading: "The sharpest read on the region.",
    paragraphs: "Public conversations are usually polished.\n\nPrivate conversations are usually honest.\n\nThe Tribunal exists to close that gap.\n\nEvery question is designed to surface a clearer signal: what people believe, what they expect, and where the region is shifting.",
    regionLine: "19 countries. One regional lens.",
    stats: [
      { value: "100+", label: "Live Questions" },
      { value: "19", label: "Countries Covered" },
      { value: "Private", label: "Votes" },
      { value: "Public", label: "Results" },
    ],
  },
  howItWorks: {
    heading: "How The Tribunal Works",
    steps: [
      { num: "01", title: "Choose a question.", body: "Debates ask what people believe. Predictions ask what people think will happen." },
      { num: "02", title: "Vote privately.", body: "Your name and email are not shown with your vote." },
      { num: "03", title: "See the result.", body: "Results are shown publicly in aggregate, with country and topic breakdowns where enough data exists." },
      { num: "04", title: "Save your activity.", body: "You can vote without an account. If you sign up, you can view previous votes, track predictions and continue from another device." },
      { num: "05", title: "Go deeper.", body: "Pulse adds sourced public signals. Voices profiles people with a view worth recording. The Majlis creates a private room for serious conversation." },
      { num: "06", title: "Trust the process.", body: "Questions are human reviewed. Results are opinion signals, not scientific polling. No bots. No sponsored sentiment. No fake activity." },
    ],
  },
  founderStatement: {
    heading: "From the Founder",
    text: "This started with a question I kept asking in private rooms:\n\nWhat does the region actually think?\n\nNot what people say in public. Not what people post for approval. Not what leaders claim. Not what outsiders assume.\n\nWhat people actually think.\n\nThe Tribunal does not speak for the region. It records what people say when they can answer honestly.",
    quote: "\"People do not lack opinions. They lack a place to say them honestly.\"",
    author: "Kareem Kaddoura, Founder",
  },
  finalCta: {
    heading: "See where you stand.",
    subcopy: "Vote privately. See the result publicly.",
    primaryLabel: "Cast Your Vote",
    primaryHref: "/debates",
    secondaryLabel: "Make a Prediction",
    secondaryHref: "/predictions",
  },
  punctuations: ["."],
};

const inputCls = "w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary";
const labelCls = "block text-xs text-muted-foreground uppercase tracking-wider mb-1";

export default function PageAbout() {
  const [config, setConfig] = useState<AboutConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getPage("about").then((data: any) => {
      const d = data ?? {};
      setConfig({
        hero: { ...DEFAULTS.hero, ...d.hero },
        whatIsIt: { ...DEFAULTS.whatIsIt, ...d.whatIsIt, negations: d.whatIsIt?.negations?.length ? d.whatIsIt.negations : DEFAULTS.whatIsIt.negations },
        sharpestRead: { ...DEFAULTS.sharpestRead, ...d.sharpestRead, stats: d.sharpestRead?.stats?.length ? d.sharpestRead.stats : DEFAULTS.sharpestRead.stats },
        howItWorks: { ...DEFAULTS.howItWorks, ...d.howItWorks, steps: d.howItWorks?.steps?.length ? d.howItWorks.steps : DEFAULTS.howItWorks.steps },
        founderStatement: { ...DEFAULTS.founderStatement, ...d.founderStatement },
        finalCta: { ...DEFAULTS.finalCta, ...d.finalCta },
        punctuations: d.punctuations ?? DEFAULTS.punctuations,
      });
    }).catch(console.error).finally(() => setLoading(false));
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

  // Section-scoped update helpers keep the JSX readable.
  const setHero = (patch: Partial<AboutConfig["hero"]>) => setConfig({ ...config, hero: { ...config.hero, ...patch } });
  const setWhat = (patch: Partial<AboutConfig["whatIsIt"]>) => setConfig({ ...config, whatIsIt: { ...config.whatIsIt, ...patch } });
  const setRead = (patch: Partial<AboutConfig["sharpestRead"]>) => setConfig({ ...config, sharpestRead: { ...config.sharpestRead, ...patch } });
  const setHow = (patch: Partial<AboutConfig["howItWorks"]>) => setConfig({ ...config, howItWorks: { ...config.howItWorks, ...patch } });
  const setFounder = (patch: Partial<AboutConfig["founderStatement"]>) => setConfig({ ...config, founderStatement: { ...config.founderStatement, ...patch } });
  const setCta = (patch: Partial<AboutConfig["finalCta"]>) => setConfig({ ...config, finalCta: { ...config.finalCta, ...patch } });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between sticky top-0 bg-background z-10 py-2">
        <h1 className="font-serif text-2xl font-bold uppercase tracking-wide">About Page<span className="text-primary">.</span></h1>
        <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-sm hover:bg-primary/90 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      {/* Hero */}
      <section className="border border-border rounded-sm p-4 space-y-3">
        <h2 className="font-serif text-lg font-bold uppercase tracking-wide">Hero</h2>
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

      {/* What is The Tribunal? */}
      <section className="border border-border rounded-sm p-4 space-y-3">
        <h2 className="font-serif text-lg font-bold uppercase tracking-wide">What Is It</h2>
        <div><label className={labelCls}>Heading</label><input value={config.whatIsIt.heading} onChange={e => setWhat({ heading: e.target.value })} className={inputCls} /></div>
        <div><label className={labelCls}>Lead paragraph</label><textarea value={config.whatIsIt.lead} onChange={e => setWhat({ lead: e.target.value })} rows={2} className={`${inputCls} resize-y`} /></div>
        <div><label className={labelCls}>Body (separate paragraphs with a blank line)</label><textarea value={config.whatIsIt.body} onChange={e => setWhat({ body: e.target.value })} rows={5} className={`${inputCls} resize-y`} /></div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelCls}>"It is not…" lines</label>
            <button onClick={() => setWhat({ negations: [...config.whatIsIt.negations, ""] })} className="flex items-center gap-1 px-2 py-1 text-xs bg-secondary rounded-sm hover:bg-secondary/80"><Plus className="w-3 h-3" /> Add</button>
          </div>
          {config.whatIsIt.negations.map((line, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <input value={line} onChange={e => { const negations = [...config.whatIsIt.negations]; negations[i] = e.target.value; setWhat({ negations }); }} className={inputCls} />
              <button onClick={() => setWhat({ negations: config.whatIsIt.negations.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
        <div><label className={labelCls}>Italic note (optional)</label><input value={config.whatIsIt.note} onChange={e => setWhat({ note: e.target.value })} className={inputCls} /></div>
        <div><label className={labelCls}>Account note (optional)</label><textarea value={config.whatIsIt.accountNote} onChange={e => setWhat({ accountNote: e.target.value })} rows={2} className={`${inputCls} resize-y`} /></div>
      </section>

      {/* The Sharpest Read */}
      <section className="border border-border rounded-sm p-4 space-y-3">
        <h2 className="font-serif text-lg font-bold uppercase tracking-wide">The Sharpest Read</h2>
        <div><label className={labelCls}>Heading</label><input value={config.sharpestRead.heading} onChange={e => setRead({ heading: e.target.value })} className={inputCls} /></div>
        <div><label className={labelCls}>Paragraphs (separate with a blank line — the 3rd is bolded)</label><textarea value={config.sharpestRead.paragraphs} onChange={e => setRead({ paragraphs: e.target.value })} rows={6} className={`${inputCls} resize-y`} /></div>
        <div><label className={labelCls}>Region line (italic)</label><input value={config.sharpestRead.regionLine} onChange={e => setRead({ regionLine: e.target.value })} className={inputCls} /></div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelCls}>Stats</label>
            <button onClick={() => setRead({ stats: [...config.sharpestRead.stats, { value: "", label: "" }] })} className="flex items-center gap-1 px-2 py-1 text-xs bg-secondary rounded-sm hover:bg-secondary/80"><Plus className="w-3 h-3" /> Add</button>
          </div>
          {config.sharpestRead.stats.map((s, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <input value={s.value} onChange={e => { const stats = [...config.sharpestRead.stats]; stats[i] = { ...s, value: e.target.value }; setRead({ stats }); }} placeholder="Value" className="w-28 px-3 py-1.5 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              <input value={s.label} onChange={e => { const stats = [...config.sharpestRead.stats]; stats[i] = { ...s, label: e.target.value }; setRead({ stats }); }} placeholder="Label" className={inputCls} />
              <button onClick={() => setRead({ stats: config.sharpestRead.stats.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="border border-border rounded-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold uppercase tracking-wide">How It Works</h2>
          <button onClick={() => setHow({ steps: [...config.howItWorks.steps, { num: String(config.howItWorks.steps.length + 1).padStart(2, "0"), title: "", body: "" }] })} className="flex items-center gap-1 px-2 py-1 text-xs bg-secondary rounded-sm hover:bg-secondary/80"><Plus className="w-3 h-3" /> Add Step</button>
        </div>
        <div><label className={labelCls}>Heading</label><input value={config.howItWorks.heading} onChange={e => setHow({ heading: e.target.value })} className={inputCls} /></div>
        {config.howItWorks.steps.map((s, i) => (
          <div key={i} className="border border-border/50 rounded-sm p-3 space-y-2 bg-card">
            <div className="flex items-center justify-between">
              <input value={s.num} onChange={e => { const steps = [...config.howItWorks.steps]; steps[i] = { ...s, num: e.target.value }; setHow({ steps }); }} className="w-16 px-2 py-1 bg-background border border-border rounded-sm text-sm text-primary font-bold focus:outline-none focus:ring-1 focus:ring-primary" />
              <button onClick={() => setHow({ steps: config.howItWorks.steps.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            <input value={s.title} onChange={e => { const steps = [...config.howItWorks.steps]; steps[i] = { ...s, title: e.target.value }; setHow({ steps }); }} placeholder="Title" className={inputCls} />
            <textarea value={s.body} onChange={e => { const steps = [...config.howItWorks.steps]; steps[i] = { ...s, body: e.target.value }; setHow({ steps }); }} rows={2} placeholder="Description" className={`${inputCls} resize-y`} />
          </div>
        ))}
      </section>

      {/* From the Founder */}
      <section className="border border-border rounded-sm p-4 space-y-3">
        <h2 className="font-serif text-lg font-bold uppercase tracking-wide">From the Founder</h2>
        <div><label className={labelCls}>Heading</label><input value={config.founderStatement.heading} onChange={e => setFounder({ heading: e.target.value })} className={inputCls} /></div>
        <div><label className={labelCls}>Statement (separate paragraphs with a blank line)</label><textarea value={config.founderStatement.text} onChange={e => setFounder({ text: e.target.value })} rows={8} className={`${inputCls} resize-y`} /></div>
        <div><label className={labelCls}>Pull quote</label><input value={config.founderStatement.quote} onChange={e => setFounder({ quote: e.target.value })} className={inputCls} /></div>
        <div><label className={labelCls}>Author</label><input value={config.founderStatement.author} onChange={e => setFounder({ author: e.target.value })} className={inputCls} /></div>
      </section>

      {/* Final CTA */}
      <section className="border border-border rounded-sm p-4 space-y-3">
        <h2 className="font-serif text-lg font-bold uppercase tracking-wide">Final CTA</h2>
        <div><label className={labelCls}>Heading</label><input value={config.finalCta.heading} onChange={e => setCta({ heading: e.target.value })} className={inputCls} /></div>
        <div><label className={labelCls}>Subcopy</label><input value={config.finalCta.subcopy} onChange={e => setCta({ subcopy: e.target.value })} className={inputCls} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelCls}>Primary button label</label><input value={config.finalCta.primaryLabel} onChange={e => setCta({ primaryLabel: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Primary button link</label><input value={config.finalCta.primaryHref} onChange={e => setCta({ primaryHref: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Secondary button label</label><input value={config.finalCta.secondaryLabel} onChange={e => setCta({ secondaryLabel: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Secondary button link</label><input value={config.finalCta.secondaryHref} onChange={e => setCta({ secondaryHref: e.target.value })} className={inputCls} /></div>
        </div>
        <p className="text-xs text-muted-foreground">The Pulse / Voices / Majlis buttons appear automatically when those features are enabled in Site Settings.</p>
      </section>
    </div>
  );
}
