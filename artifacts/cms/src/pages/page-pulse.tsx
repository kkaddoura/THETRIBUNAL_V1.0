import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Save, Plus, Trash2, ChevronDown, ChevronUp, Database } from "lucide-react";

interface DesignToken {
  id: number;
  name: string;
  label: string;
  value: string;
  tokenType: string;
  category: string | null;
}

interface PulseTopic {
  id: number;
  topicId: string;
  tag: string;
  tagColor: string;
  title: string;
  stat: string;
  delta: string;
  deltaUp: boolean;
  blurb: string;
  source: string;
  sparkData: number[];
  liveConfig: { baseValue: number; annualGrowth: number } | null;
  editorialStatus: string;
}

interface PulseCategory {
  key: string;
  label: string;
  color: string;
}

interface TickerItem {
  label: string;
  value: string;
  delta: string;
  up: boolean;
}

interface PulsePageConfig {
  hero: { tagline: string; titleLine1: string; titleLine2: string; subtitle: string };
  punctuations?: string[];
  categories: PulseCategory[];
  tickerItems?: TickerItem[];
}

const TAG_OPTIONS = ["POWER", "MONEY", "SOCIETY", "TECHNOLOGY", "SURVIVAL", "MIGRATION", "CULTURE", "HEALTH"];

function TokenColorPicker({ value, onChange, tokens }: { value: string; onChange: (v: string) => void; tokens: DesignToken[] }) {
  const brandTokens = tokens.filter(t => t.tokenType === "color");

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5 flex-wrap">
        {brandTokens.map(token => (
          <button
            key={token.id}
            onClick={() => onChange(token.value)}
            className={`w-7 h-7 rounded-sm border-2 transition-all ${token.value === value ? "border-primary scale-110" : "border-border/50 hover:border-border"}`}
            style={{ backgroundColor: token.value }}
            title={`${token.label} (${token.value})`}
          />
        ))}
      </div>
      <span className="text-[0.55rem] text-muted-foreground">Selected: {brandTokens.find(t => t.value === value)?.label ?? value}</span>
    </div>
  );
}

export default function PagePulse() {
  const [config, setConfig] = useState<PulsePageConfig | null>(null);
  const [topics, setTopics] = useState<PulseTopic[]>([]);
  const [tokens, setTokens] = useState<DesignToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [filterCat, setFilterCat] = useState("ALL");

  useEffect(() => {
    Promise.all([
      api.getPage("pulse").catch(() => ({ hero: { tagline: "Pulse", titleLine1: "What's Actually", titleLine2: "Happening in MENA", subtitle: "" }, punctuations: ["."], categories: [] })),
      api.getPulseTopics().then((d: { items: PulseTopic[] }) => d.items).catch(() => []),
      api.getDesignTokens().then((d: { items: DesignToken[] }) => d.items).catch(() => []),
    ]).then(([cfg, items, designTokens]) => {
      setConfig(cfg as PulsePageConfig);
      setTopics(items);
      setTokens(designTokens);
    }).finally(() => setLoading(false));
  }, []);

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await api.updatePage("pulse", config as unknown as Record<string, unknown>);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  const updateTopic = async (id: number, updates: Partial<PulseTopic>) => {
    try {
      await api.updatePulseTopic(id, updates as Record<string, unknown>);
      setTopics(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    } catch (e) { alert(e instanceof Error ? e.message : "Update failed"); }
  };

  const addTopic = async () => {
    try {
      const res = await api.createPulseTopic({
        topicId: `topic-${Date.now()}`,
        tag: "POWER",
        tagColor: "#EF4444",
        title: "New Topic",
        stat: "0",
        delta: "0%",
        deltaUp: true,
        blurb: "",
        source: "",
        sparkData: [],
        editorialStatus: "draft",
      });
      if (res.item) {
        setTopics(prev => [...prev, res.item]);
        setExpandedCard(res.item.id);
      }
    } catch (e) { alert(e instanceof Error ? e.message : "Create failed"); }
  };

  const deleteTopic = async (id: number) => {
    if (!confirm("Delete this pulse topic?")) return;
    try {
      await api.deletePulseTopic(id);
      setTopics(prev => prev.filter(t => t.id !== id));
    } catch (e) { alert(e instanceof Error ? e.message : "Delete failed"); }
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  if (!config) return <div className="text-center py-12 text-red-500">Failed to load Pulse config</div>;

  const filteredTopics = filterCat === "ALL" ? topics : topics.filter(t => t.tag === filterCat);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold uppercase tracking-wide flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" /> Pulse Page<span className="text-primary">.</span>
        </h1>
        <button onClick={saveConfig} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-sm hover:bg-primary/90 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? "Saving..." : saved ? "Saved!" : "Save Config"}
        </button>
      </div>

      <section className="border border-border rounded-sm p-4 space-y-3">
        <h2 className="font-serif text-lg font-bold uppercase tracking-wide">Hero</h2>
        <div>
          <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">Tagline</label>
          <input value={config.hero.tagline} onChange={e => setConfig({ ...config, hero: { ...config.hero, tagline: e.target.value } })} placeholder="Pulse" className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
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
          <textarea value={config.hero.subtitle} onChange={e => setConfig({ ...config, hero: { ...config.hero, subtitle: e.target.value } })} rows={2} placeholder="Subtitle" className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
        </div>
      </section>

      <section className="border border-border rounded-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold uppercase tracking-wide">Categories</h2>
          <button onClick={() => setConfig({ ...config, categories: [...config.categories, { key: `CAT_${Date.now()}`, label: "New Category", color: "#DC143C" }] })} className="flex items-center gap-1 px-2 py-1 text-xs bg-secondary rounded-sm hover:bg-secondary/80">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {config.categories.map((cat, i) => (
            <div key={cat.key} className="flex items-center gap-2 p-2 border border-border/50 rounded-sm bg-card">
              <TokenColorPicker
                value={cat.color}
                onChange={color => { const cats = [...config.categories]; cats[i] = { ...cat, color }; setConfig({ ...config, categories: cats }); }}
                tokens={tokens}
              />
              <input value={cat.label} onChange={e => { const cats = [...config.categories]; cats[i] = { ...cat, label: e.target.value }; setConfig({ ...config, categories: cats }); }} className="flex-1 px-2 py-1 bg-background border border-border rounded-sm text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
              {cat.key !== "ALL" && (
                <button onClick={() => setConfig({ ...config, categories: config.categories.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-red-500">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="border border-border rounded-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold uppercase tracking-wide">Ticker Items</h2>
          <button onClick={() => setConfig({ ...config, tickerItems: [...(config.tickerItems || []), { label: "", value: "", delta: "", up: true }] })} className="flex items-center gap-1 px-2 py-1 text-xs bg-secondary rounded-sm hover:bg-secondary/80">
            <Plus className="w-3 h-3" /> Add Item
          </button>
        </div>
        <p className="text-xs text-muted-foreground">These items scroll across the top of the Pulse page.</p>
        {(config.tickerItems || []).map((item, i) => (
          <div key={i} className="flex items-center gap-2 border border-border/50 rounded-sm p-2 bg-card">
            <input value={item.label} onChange={e => { const items = [...(config.tickerItems || [])]; items[i] = { ...item, label: e.target.value }; setConfig({ ...config, tickerItems: items }); }} placeholder="Label" className="flex-1 px-2 py-1.5 bg-background border border-border rounded-sm text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
            <input value={item.value} onChange={e => { const items = [...(config.tickerItems || [])]; items[i] = { ...item, value: e.target.value }; setConfig({ ...config, tickerItems: items }); }} placeholder="Value" className="w-20 px-2 py-1.5 bg-background border border-border rounded-sm text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
            <input value={item.delta} onChange={e => { const items = [...(config.tickerItems || [])]; items[i] = { ...item, delta: e.target.value }; setConfig({ ...config, tickerItems: items }); }} placeholder="Delta" className="w-16 px-2 py-1.5 bg-background border border-border rounded-sm text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" checked={item.up} onChange={e => { const items = [...(config.tickerItems || [])]; items[i] = { ...item, up: e.target.checked }; setConfig({ ...config, tickerItems: items }); }} className="accent-primary" />
              ↑
            </label>
            <button onClick={() => setConfig({ ...config, tickerItems: (config.tickerItems || []).filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-red-500">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </section>

      <section className="border border-border rounded-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold uppercase tracking-wide">Topics ({topics.length})</h2>
          <button onClick={addTopic} className="flex items-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded-sm hover:bg-primary/90">
            <Plus className="w-3 h-3" /> Add Topic
          </button>
        </div>

        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setFilterCat("ALL")} className={`px-2 py-1 text-xs rounded-sm ${filterCat === "ALL" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>All</button>
          {TAG_OPTIONS.map(tag => (
            <button key={tag} onClick={() => setFilterCat(tag)} className={`px-2 py-1 text-xs rounded-sm ${filterCat === tag ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
              {tag}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filteredTopics.map(topic => (
            <div key={topic.id} className="border border-border/50 rounded-sm bg-card">
              <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setExpandedCard(expandedCard === topic.id ? null : topic.id)}>
                <span className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded-sm uppercase" style={{ backgroundColor: topic.tagColor + "22", color: topic.tagColor }}>{topic.tag}</span>
                <span className="text-sm font-medium flex-1">{topic.title}</span>
                <span className={`text-[0.6rem] px-1.5 py-0.5 rounded-sm ${topic.editorialStatus === "approved" ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"}`}>{topic.editorialStatus}</span>
                <span className="text-xs text-muted-foreground">{topic.stat}</span>
                {expandedCard === topic.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
              {expandedCard === topic.id && (
                <div className="px-3 pb-3 space-y-2 border-t border-border/50 pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[0.6rem] text-muted-foreground uppercase mb-0.5">Title</label>
                      <input value={topic.title} onChange={e => updateTopic(topic.id, { title: e.target.value })} className="w-full px-2 py-1.5 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                    <div>
                      <label className="block text-[0.6rem] text-muted-foreground uppercase mb-0.5">Category Tag</label>
                      <select value={topic.tag} onChange={e => updateTopic(topic.id, { tag: e.target.value })} className="w-full px-2 py-1.5 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                        {TAG_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[0.6rem] text-muted-foreground uppercase mb-0.5">Tag Color (from Design Tokens)</label>
                      <TokenColorPicker
                        value={topic.tagColor}
                        onChange={color => updateTopic(topic.id, { tagColor: color })}
                        tokens={tokens}
                      />
                    </div>
                    <div>
                      <label className="block text-[0.6rem] text-muted-foreground uppercase mb-0.5">Status</label>
                      <select value={topic.editorialStatus} onChange={e => updateTopic(topic.id, { editorialStatus: e.target.value })} className="w-full px-2 py-1.5 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                        <option value="draft">Draft</option>
                        <option value="approved">Approved</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[0.6rem] text-muted-foreground uppercase mb-0.5">Stat</label>
                      <input value={topic.stat} onChange={e => updateTopic(topic.id, { stat: e.target.value })} className="w-full px-2 py-1.5 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                    <div>
                      <label className="block text-[0.6rem] text-muted-foreground uppercase mb-0.5">Delta</label>
                      <input value={topic.delta} onChange={e => updateTopic(topic.id, { delta: e.target.value })} className="w-full px-2 py-1.5 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                    <div>
                      <label className="block text-[0.6rem] text-muted-foreground uppercase mb-0.5">Direction</label>
                      <select value={topic.deltaUp ? "up" : "down"} onChange={e => updateTopic(topic.id, { deltaUp: e.target.value === "up" })} className="w-full px-2 py-1.5 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                        <option value="up">Up</option>
                        <option value="down">Down</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[0.6rem] text-muted-foreground uppercase mb-0.5">Blurb</label>
                    <textarea value={topic.blurb} onChange={e => updateTopic(topic.id, { blurb: e.target.value })} rows={3} className="w-full px-2 py-1.5 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
                  </div>
                  <div>
                    <label className="block text-[0.6rem] text-muted-foreground uppercase mb-0.5">Source</label>
                    <input value={topic.source} onChange={e => updateTopic(topic.id, { source: e.target.value })} className="w-full px-2 py-1.5 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-[0.6rem] text-muted-foreground uppercase mb-0.5">Spark Data (comma-separated numbers)</label>
                    <input
                      value={topic.sparkData.join(", ")}
                      onChange={e => updateTopic(topic.id, { sparkData: e.target.value.split(",").map(s => parseFloat(s.trim())).filter(n => !isNaN(n)) })}
                      className="w-full px-2 py-1.5 bg-background border border-border rounded-sm text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="border border-border/30 rounded-sm p-3 space-y-2 bg-background/50">
                    <label className="block text-[0.6rem] text-muted-foreground uppercase font-bold">Live Counter Config</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[0.6rem] text-muted-foreground uppercase mb-0.5">Base Value</label>
                        <input
                          type="number"
                          value={topic.liveConfig?.baseValue ?? ""}
                          onChange={e => {
                            const baseValue = parseFloat(e.target.value);
                            if (isNaN(baseValue)) {
                              updateTopic(topic.id, { liveConfig: null });
                            } else {
                              updateTopic(topic.id, { liveConfig: { baseValue, annualGrowth: topic.liveConfig?.annualGrowth ?? 0 } });
                            }
                          }}
                          placeholder="e.g. 442000000"
                          className="w-full px-2 py-1.5 bg-background border border-border rounded-sm text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-[0.6rem] text-muted-foreground uppercase mb-0.5">Annual Growth Rate</label>
                        <input
                          type="number"
                          step="0.01"
                          value={topic.liveConfig?.annualGrowth ?? ""}
                          onChange={e => {
                            const annualGrowth = parseFloat(e.target.value);
                            if (isNaN(annualGrowth)) {
                              updateTopic(topic.id, { liveConfig: null });
                            } else {
                              updateTopic(topic.id, { liveConfig: { baseValue: topic.liveConfig?.baseValue ?? 0, annualGrowth } });
                            }
                          }}
                          placeholder="e.g. 0.017"
                          className="w-full px-2 py-1.5 bg-background border border-border rounded-sm text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                    <p className="text-[0.55rem] text-muted-foreground">Set both values to enable a live ticking counter on the frontend. Leave empty to disable.</p>
                  </div>
                  <button onClick={() => deleteTopic(topic.id)} className="flex items-center gap-1 px-2 py-1 text-xs text-red-500 hover:bg-red-500/10 rounded-sm">
                    <Trash2 className="w-3 h-3" /> Delete Topic
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
