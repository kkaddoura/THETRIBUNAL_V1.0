import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Save, Plus, Trash2, GripVertical, Eye, EyeOff, ChevronDown, ChevronUp, X, Monitor } from "lucide-react";
import { toast } from "sonner";
import { ContentPicker } from "@/components/ContentPicker";

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  bgColor: string;
  textColor: string;
  enabled: boolean;
  position: string;
}

interface Section {
  id: string;
  type: string;
  title: string;
  enabled: boolean;
  order: number;
  config: Record<string, unknown>;
}

interface CountryBreakdown {
  name: string;
  flag: string;
  population: string;
}

interface HomepageData {
  masthead: { title: string; subtitle: string; showPopulationCounter: boolean; issueLabel: string; basePopulation?: number; growthRate?: number; countryBreakdown?: CountryBreakdown[] };
  sectionStats?: { useOverrides: boolean; overrides: { debates: number | null; predictions: number | null; pulseTopics: number | null; voices: number | null; totalVotes: number | null } };
  ticker: { enabled: boolean; speed: string; items: { topic: string; votes: string }[] };
  sections: Section[];
  banners: Banner[];
  newsletter: { heading: string; subheading: string; buttonText: string; enabled: boolean };
}

const SECTION_TYPE_LABELS: Record<string, string> = {
  lead_debate: "Lead Debate + Sidebar",
  debate_grid: "Debate Grid",
  predictions: "Predictions",
  voices: "Featured Voices",
  explore_topics: "Explore Topics",
  live_activity: "Live Activity Feed",
  newsletter_cta: "Newsletter CTA",
};

export default function HomepagePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"sections" | "banners" | "newsletter" | "stats">("sections");
  const [data, setData] = useState<HomepageData | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [expandedBanner, setExpandedBanner] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewSectionId, setPreviewSectionId] = useState<string | null>(null);
  const [previewBannerId, setPreviewBannerId] = useState<string | null>(null);

  useEffect(() => {
    api.getHomepage().then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await api.updateHomepage(data as unknown as Record<string, unknown>);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  const addBanner = async () => {
    try {
      const res = await api.addBanner({ title: "New Banner", subtitle: "", ctaText: "Learn More", ctaLink: "/", bgColor: "#DC143C", textColor: "#FFFFFF", enabled: false, position: "top" });
      if (data) setData({ ...data, banners: [...data.banners, res.banner] });
      setExpandedBanner(res.banner.id);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const removeBanner = async (id: string) => {
    try {
      await api.deleteBanner(id);
      if (data) setData({ ...data, banners: data.banners.filter(b => b.id !== id) });
      if (previewBannerId === id) setPreviewBannerId(null);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const updateBanner = (id: string, field: string, value: unknown) => {
    if (!data) return;
    setData({ ...data, banners: data.banners.map(b => b.id === id ? { ...b, [field]: value } : b) });
  };

  const updateSection = (id: string, field: string, value: unknown) => {
    if (!data) return;
    setData({ ...data, sections: data.sections.map(s => s.id === id ? { ...s, [field]: value } : s) });
  };

  const updateSectionConfig = (id: string, key: string, value: unknown) => {
    if (!data) return;
    setData({
      ...data,
      sections: data.sections.map(s => s.id === id ? { ...s, config: { ...s.config, [key]: value } } : s),
    });
  };

  const moveSection = (id: string, direction: "up" | "down") => {
    if (!data) return;
    const sorted = [...data.sections].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(s => s.id === id);
    if (direction === "up" && idx > 0) {
      const prev = sorted[idx - 1].order;
      sorted[idx - 1].order = sorted[idx].order;
      sorted[idx].order = prev;
    } else if (direction === "down" && idx < sorted.length - 1) {
      const next = sorted[idx + 1].order;
      sorted[idx + 1].order = sorted[idx].order;
      sorted[idx].order = next;
    }
    setData({ ...data, sections: sorted });
  };

  const openSectionPreview = (id: string) => { setPreviewSectionId(id); setPreviewBannerId(null); setShowPreview(false); };
  const openBannerPreview = (id: string) => { setPreviewBannerId(id); setPreviewSectionId(null); setShowPreview(false); };
  const openFullPreview = () => { setShowPreview(true); setPreviewSectionId(null); setPreviewBannerId(null); };

  const previewSection = previewSectionId ? data?.sections.find(s => s.id === previewSectionId) ?? null : null;
  const previewBanner = previewBannerId ? data?.banners.find(b => b.id === previewBannerId) ?? null : null;

  if (loading || !data) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold uppercase tracking-wide">Homepage Manager</h1>
        <div className="flex items-center gap-2">
          <button onClick={openFullPreview} className="flex items-center gap-1.5 px-4 py-2 bg-card border border-border text-foreground rounded-md text-sm hover:bg-accent">
            <Monitor className="w-3.5 h-3.5" /> Preview
          </button>
          <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 disabled:opacity-50">
            <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save All Changes"}
          </button>
        </div>
      </div>

      {showPreview && data && <HomepagePreview data={data} onClose={() => setShowPreview(false)} />}

      {previewSection && (
        <div className="fixed inset-0 bg-black/70 flex justify-end z-50">
          <div className="w-full max-w-lg bg-[#0A0A0A] h-full overflow-auto border-l border-[rgba(255,255,255,0.08)]">
            <div className="flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.08)] sticky top-0 bg-[#0A0A0A] z-10">
              <div>
                <span className="text-xs text-[rgba(255,255,255,0.4)] uppercase tracking-wider font-serif">Section Preview</span>
                <p className="text-sm text-white mt-0.5">{previewSection.title}</p>
              </div>
              <button onClick={() => setPreviewSectionId(null)} className="text-[rgba(255,255,255,0.4)] hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              <div className="mb-3 flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${previewSection.enabled ? "bg-green-500" : "bg-red-500"}`} />
                <span className="text-xs text-[rgba(255,255,255,0.4)]">{previewSection.enabled ? "Visible on homepage" : "Hidden"}</span>
                <span className="text-xs text-[rgba(255,255,255,0.3)] ml-auto">Order: {previewSection.order}</span>
              </div>
              <SectionPreview section={previewSection} />
              <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)] space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)] font-serif">Configuration</p>
                <div className="text-xs text-[rgba(255,255,255,0.5)] space-y-1">
                  <p>Type: <span className="text-white">{SECTION_TYPE_LABELS[previewSection.type] || previewSection.type}</span></p>
                  {!!previewSection.config.layout && <p>Layout: <span className="text-white">{String(previewSection.config.layout)}</span></p>}
                  {!!previewSection.config.maxItems && <p>Max Items: <span className="text-white">{String(previewSection.config.maxItems)}</span></p>}
                  {!!previewSection.config.firstSpanFull && <p>First item full width: <span className="text-white">Yes</span></p>}
                  {previewSection.config.showSidebar !== undefined && <p>Sidebar: <span className="text-white">{previewSection.config.showSidebar ? "Yes" : "No"}</span></p>}
                  {previewSection.config.showOpinionBubbles !== undefined && <p>Opinion bubbles: <span className="text-white">{previewSection.config.showOpinionBubbles ? "Yes" : "No"}</span></p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewBanner && (
        <div className="fixed inset-0 bg-black/70 flex justify-end z-50">
          <div className="w-full max-w-lg bg-[#0A0A0A] h-full overflow-auto border-l border-[rgba(255,255,255,0.08)]">
            <div className="flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.08)] sticky top-0 bg-[#0A0A0A] z-10">
              <div>
                <span className="text-xs text-[rgba(255,255,255,0.4)] uppercase tracking-wider font-serif">Banner Preview</span>
                <p className="text-sm text-white mt-0.5">{previewBanner.title}</p>
              </div>
              <button onClick={() => setPreviewBannerId(null)} className="text-[rgba(255,255,255,0.4)] hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              <div className="mb-3 flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${previewBanner.enabled ? "bg-green-500" : "bg-red-500"}`} />
                <span className="text-xs text-[rgba(255,255,255,0.4)]">{previewBanner.enabled ? "Active" : "Disabled"}</span>
                <span className="text-xs text-[rgba(255,255,255,0.3)] ml-auto capitalize">Position: {previewBanner.position}</span>
              </div>

              <p className="text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)] font-serif mb-2">Desktop View</p>
              <div className="rounded-lg overflow-hidden" style={{ background: previewBanner.bgColor, color: previewBanner.textColor }}>
                <div className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-base">{previewBanner.title}</p>
                    {previewBanner.subtitle && <p className="text-sm opacity-80 mt-0.5">{previewBanner.subtitle}</p>}
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider border px-4 py-1.5 rounded" style={{ borderColor: previewBanner.textColor }}>{previewBanner.ctaText}</span>
                </div>
              </div>

              <p className="text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)] font-serif mb-2 mt-6">Mobile View</p>
              <div className="rounded-lg overflow-hidden max-w-[280px]" style={{ background: previewBanner.bgColor, color: previewBanner.textColor }}>
                <div className="px-4 py-3 text-center">
                  <p className="font-bold text-sm">{previewBanner.title}</p>
                  {previewBanner.subtitle && <p className="text-xs opacity-80 mt-0.5">{previewBanner.subtitle}</p>}
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider border px-3 py-1 rounded mt-2" style={{ borderColor: previewBanner.textColor }}>{previewBanner.ctaText}</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[rgba(255,255,255,0.06)] space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)] font-serif">Details</p>
                <div className="text-xs text-[rgba(255,255,255,0.5)] space-y-1">
                  <p>CTA Link: <span className="text-white">{previewBanner.ctaLink}</span></p>
                  <p>Background: <span className="text-white inline-flex items-center gap-1"><span className="inline-block w-3 h-3 rounded" style={{ background: previewBanner.bgColor, border: "1px solid rgba(255,255,255,0.2)" }} />{previewBanner.bgColor}</span></p>
                  <p>Text Color: <span className="text-white inline-flex items-center gap-1"><span className="inline-block w-3 h-3 rounded" style={{ background: previewBanner.textColor, border: "1px solid rgba(255,255,255,0.2)" }} />{previewBanner.textColor}</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-1 border-b border-border">
        {(["sections", "banners", "newsletter", "stats"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${activeTab === tab ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "sections" && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Use arrows to reorder sections. Toggle visibility to show/hide them on the homepage.</p>
          {[...data.sections].sort((a, b) => a.order - b.order).map(section => (
            <div key={section.id} className="border border-border rounded-md bg-card">
              <div className="flex items-center gap-3 px-4 py-3">
                <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{section.title}</p>
                  <p className="text-xs text-muted-foreground">{SECTION_TYPE_LABELS[section.type] || section.type}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => moveSection(section.id, "up")} className="p-1 text-muted-foreground hover:text-foreground"><ChevronUp className="w-4 h-4" /></button>
                  <button onClick={() => moveSection(section.id, "down")} className="p-1 text-muted-foreground hover:text-foreground"><ChevronDown className="w-4 h-4" /></button>
                  <button onClick={() => updateSection(section.id, "enabled", !section.enabled)} className={`p-1.5 rounded ${section.enabled ? "text-green-500" : "text-muted-foreground"}`}>
                    {section.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button onClick={() => openSectionPreview(section.id)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors" title="Preview section">
                    <Monitor className="w-4 h-4" />
                  </button>
                  <button onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)} className="p-1 text-muted-foreground hover:text-foreground text-xs">
                    {expandedSection === section.id ? "Close" : "Edit"}
                  </button>
                </div>
              </div>
              {expandedSection === section.id && (
                <div className="px-4 pb-4 pt-1 border-t border-border space-y-3">
                  <Field label="Section Title">
                    <input type="text" value={section.title} onChange={e => updateSection(section.id, "title", e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                  </Field>
                  {(section.type === "debate_grid" || section.type === "predictions" || section.type === "voices") && (
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Max Items">
                        <input type="number" min={1} max={20} value={(section.config.maxItems as number) || 4} onChange={e => updateSectionConfig(section.id, "maxItems", Number(e.target.value))} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                      </Field>
                      <Field label="Layout">
                        <select value={(section.config.layout as string) || "grid-2col"} onChange={e => updateSectionConfig(section.id, "layout", e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                          <option value="grid-2col">2 Columns</option>
                          <option value="grid-3col">3 Columns</option>
                          <option value="grid-4col">4 Columns</option>
                          <option value="list">List</option>
                          <option value="carousel">Carousel</option>
                        </select>
                      </Field>
                    </div>
                  )}
                  {section.type === "debate_grid" && (
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={(section.config.firstSpanFull as boolean) || false} onChange={e => updateSectionConfig(section.id, "firstSpanFull", e.target.checked)} className="accent-primary" />
                      First item spans full width
                    </label>
                  )}
                  {section.type === "lead_debate" && (
                    <div className="space-y-3">
                      <ContentPicker
                        type="debates"
                        mode="single"
                        label="lead debate"
                        selectedIds={section.config.selectedDebateId ? [section.config.selectedDebateId as number] : []}
                        onChange={(ids) => updateSectionConfig(section.id, "selectedDebateId", ids[0] ?? null)}
                      />
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={(section.config.showSidebar as boolean) ?? true} onChange={e => updateSectionConfig(section.id, "showSidebar", e.target.checked)} className="accent-primary" />
                        Show sidebar with latest debates
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={(section.config.showOpinionBubbles as boolean) ?? true} onChange={e => updateSectionConfig(section.id, "showOpinionBubbles", e.target.checked)} className="accent-primary" />
                        Show opinion bubbles (desktop)
                      </label>
                    </div>
                  )}
                  {section.type === "debate_grid" && (
                    <ContentPicker
                      type="debates"
                      mode="multi"
                      label="debate"
                      selectedIds={(section.config.selectedDebateIds as number[]) ?? []}
                      onChange={(ids) => updateSectionConfig(section.id, "selectedDebateIds", ids)}
                    />
                  )}
                  {section.type === "predictions" && (
                    <ContentPicker
                      type="predictions"
                      mode="multi"
                      label="prediction"
                      selectedIds={(section.config.selectedPredictionIds as number[]) ?? []}
                      onChange={(ids) => updateSectionConfig(section.id, "selectedPredictionIds", ids)}
                    />
                  )}
                  {section.type === "voices" && (
                    <ContentPicker
                      type="voices"
                      mode="multi"
                      label="voice"
                      selectedIds={(section.config.selectedVoiceIds as number[]) ?? []}
                      onChange={(ids) => updateSectionConfig(section.id, "selectedVoiceIds", ids)}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === "banners" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Promotional banners displayed across the homepage.</p>
            <button onClick={addBanner} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90">
              <Plus className="w-3.5 h-3.5" /> Add Banner
            </button>
          </div>
          {data.banners.map(banner => (
            <div key={banner.id} className="border border-border rounded-md bg-card">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-6 h-6 rounded border border-border flex-shrink-0" style={{ background: banner.bgColor }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{banner.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">{banner.position} · {banner.enabled ? "Active" : "Disabled"}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateBanner(banner.id, "enabled", !banner.enabled)} className={`p-1.5 rounded ${banner.enabled ? "text-green-500" : "text-muted-foreground"}`}>
                    {banner.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button onClick={() => openBannerPreview(banner.id)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors" title="Preview banner">
                    <Monitor className="w-4 h-4" />
                  </button>
                  <button onClick={() => setExpandedBanner(expandedBanner === banner.id ? null : banner.id)} className="p-1 text-muted-foreground hover:text-foreground text-xs">
                    {expandedBanner === banner.id ? "Close" : "Edit"}
                  </button>
                  <button onClick={() => removeBanner(banner.id)} className="p-1 text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              {expandedBanner === banner.id && (
                <div className="px-4 pb-4 pt-1 border-t border-border space-y-3">
                  <Field label="Title">
                    <input type="text" value={banner.title} onChange={e => updateBanner(banner.id, "title", e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                  </Field>
                  <Field label="Subtitle">
                    <textarea value={banner.subtitle} onChange={e => updateBanner(banner.id, "subtitle", e.target.value)} rows={2} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="CTA Text">
                      <input type="text" value={banner.ctaText} onChange={e => updateBanner(banner.id, "ctaText", e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                    </Field>
                    <Field label="CTA Link">
                      <input type="text" value={banner.ctaLink} onChange={e => updateBanner(banner.id, "ctaLink", e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                    </Field>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Background Color">
                      <div className="flex items-center gap-2">
                        <input type="color" value={banner.bgColor} onChange={e => updateBanner(banner.id, "bgColor", e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-border" />
                        <input type="text" value={banner.bgColor} onChange={e => updateBanner(banner.id, "bgColor", e.target.value)} className="flex-1 px-2 py-1.5 bg-background border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                      </div>
                    </Field>
                    <Field label="Text Color">
                      <div className="flex items-center gap-2">
                        <input type="color" value={banner.textColor} onChange={e => updateBanner(banner.id, "textColor", e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-border" />
                        <input type="text" value={banner.textColor} onChange={e => updateBanner(banner.id, "textColor", e.target.value)} className="flex-1 px-2 py-1.5 bg-background border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                      </div>
                    </Field>
                    <Field label="Position">
                      <select value={banner.position} onChange={e => updateBanner(banner.id, "position", e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                        <option value="top">Top</option>
                        <option value="middle">Middle (between sections)</option>
                        <option value="bottom">Bottom</option>
                      </select>
                    </Field>
                  </div>
                  <div className="mt-3 rounded-md overflow-hidden" style={{ background: banner.bgColor, color: banner.textColor }}>
                    <div className="px-6 py-4 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm">{banner.title}</p>
                        <p className="text-xs opacity-80 mt-0.5">{banner.subtitle}</p>
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider border px-3 py-1 rounded" style={{ borderColor: banner.textColor }}>
                        {banner.ctaText}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}


      {activeTab === "stats" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Override the live counts shown on the homepage. When disabled, counts are fetched live from the database.</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={data.sectionStats?.useOverrides || false} onChange={e => setData({ ...data, sectionStats: { ...(data.sectionStats || { useOverrides: false, overrides: { debates: null, predictions: null, pulseTopics: null, voices: null, totalVotes: null } }), useOverrides: e.target.checked } })} className="accent-primary" />
            Use manual stat overrides instead of live counts
          </label>
          {(data.sectionStats?.useOverrides) && (
            <div className="grid grid-cols-2 gap-3 pl-6 border-l-2 border-primary/20">
              {(["debates", "predictions", "pulseTopics", "voices", "totalVotes"] as const).map(key => (
                <Field key={key} label={key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase())}>
                  <input type="number" value={data.sectionStats?.overrides[key] ?? ""} onChange={e => {
                    const val = e.target.value === "" ? null : Number(e.target.value);
                    setData({ ...data, sectionStats: { ...(data.sectionStats || { useOverrides: true, overrides: { debates: null, predictions: null, pulseTopics: null, voices: null, totalVotes: null } }), overrides: { ...(data.sectionStats?.overrides || { debates: null, predictions: null, pulseTopics: null, voices: null, totalVotes: null }), [key]: val } } });
                  }} placeholder="Live (auto)" className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </Field>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "newsletter" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Configure the newsletter call-to-action section.</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={data.newsletter.enabled} onChange={e => setData({ ...data, newsletter: { ...data.newsletter, enabled: e.target.checked } })} className="accent-primary" />
            Enable newsletter section
          </label>
          <Field label="Heading">
            <input type="text" value={data.newsletter.heading} onChange={e => setData({ ...data, newsletter: { ...data.newsletter, heading: e.target.value } })} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          </Field>
          <Field label="Subheading">
            <textarea value={data.newsletter.subheading} onChange={e => setData({ ...data, newsletter: { ...data.newsletter, subheading: e.target.value } })} rows={2} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
          </Field>
          <Field label="Button Text">
            <input type="text" value={data.newsletter.buttonText} onChange={e => setData({ ...data, newsletter: { ...data.newsletter, buttonText: e.target.value } })} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          </Field>

          <div className="rounded-md overflow-hidden mt-4" style={{ background: "var(--foreground)", color: "var(--background)" }}>
            <div className="px-6 py-8 text-center">
              <h3 className="font-display font-black text-2xl uppercase tracking-tight">{data.newsletter.heading}</h3>
              <p className="text-sm opacity-75 mt-2">{data.newsletter.subheading}</p>
              <div className="mt-4 flex gap-2 justify-center max-w-sm mx-auto">
                <div className="flex-1 h-10 bg-background/10 rounded" />
                <button className="px-4 py-2 bg-primary text-white font-bold uppercase tracking-widest text-xs font-serif rounded">
                  {data.newsletter.buttonText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HomepagePreview({ data, onClose }: { data: HomepageData; onClose: () => void }) {
  const sortedSections = [...data.sections].sort((a, b) => a.order - b.order);
  const enabledSections = sortedSections.filter(s => s.enabled);
  const topBanners = data.banners.filter(b => b.enabled && b.position === "top");
  const middleBanners = data.banners.filter(b => b.enabled && b.position === "middle");
  const bottomBanners = data.banners.filter(b => b.enabled && b.position === "bottom");

  const midpoint = Math.floor(enabledSections.length / 2);

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-end z-50">
      <div className="w-full max-w-2xl bg-[#0A0A0A] h-full overflow-auto border-l border-[rgba(255,255,255,0.08)]">
        <div className="flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.08)] sticky top-0 bg-[#0A0A0A] z-10">
          <span className="text-xs text-[rgba(255,255,255,0.4)] uppercase tracking-wider font-serif">Homepage Preview</span>
          <button onClick={onClose} className="text-[rgba(255,255,255,0.4)] hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {topBanners.map(b => <BannerPreview key={b.id} banner={b} />)}

          <div className="text-center py-8 px-4" style={{ background: "radial-gradient(ellipse at 50% -20%, rgba(220,20,60,0.07) 0%, transparent 65%)" }}>
            <p className="text-[9px] uppercase tracking-[0.18em] text-[rgba(255,255,255,0.4)]" style={{ fontFamily: "'Playfair Display', serif" }}>{data.masthead.issueLabel}</p>
            <h2 className="font-black text-3xl uppercase tracking-tight mt-2 text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{data.masthead.title}</h2>
            <p className="text-[10px] tracking-[0.25em] uppercase text-[rgba(255,255,255,0.4)] mt-1" style={{ fontFamily: "'Playfair Display', serif" }}>{data.masthead.subtitle}</p>
            {data.masthead.showPopulationCounter && (
              <div className="mt-3 text-xs text-[rgba(255,255,255,0.3)]">▲ Population counter active</div>
            )}
          </div>

          {data.ticker.enabled && (
            <div className="bg-[rgba(220,20,60,0.08)] border-y border-[rgba(220,20,60,0.15)] py-2 px-4 overflow-hidden">
              <div className="flex gap-8 text-xs text-[rgba(255,255,255,0.6)] whitespace-nowrap animate-pulse">
                {data.ticker.items.map((item, i) => (
                  <span key={i}><span className="text-[#DC143C] font-semibold">{item.topic}</span> · {item.votes}</span>
                ))}
              </div>
            </div>
          )}

          {enabledSections.slice(0, midpoint).map(section => (
            <SectionPreview key={section.id} section={section} />
          ))}

          {middleBanners.map(b => <BannerPreview key={b.id} banner={b} />)}

          {enabledSections.slice(midpoint).map(section => (
            <SectionPreview key={section.id} section={section} />
          ))}

          {data.newsletter.enabled && (
            <div className="px-6 py-10 text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
              <h3 className="font-black text-xl uppercase tracking-tight text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{data.newsletter.heading}</h3>
              <p className="text-xs text-[rgba(255,255,255,0.5)] mt-2 max-w-sm mx-auto">{data.newsletter.subheading}</p>
              <div className="mt-4 flex gap-2 justify-center max-w-xs mx-auto">
                <div className="flex-1 h-9 bg-[rgba(255,255,255,0.06)] rounded border border-[rgba(255,255,255,0.1)]" />
                <button className="px-4 py-2 bg-[#DC143C] text-white text-xs font-bold uppercase tracking-wider rounded">{data.newsletter.buttonText}</button>
              </div>
            </div>
          )}

          {bottomBanners.map(b => <BannerPreview key={b.id} banner={b} />)}

          <div className="py-6 text-center border-t border-[rgba(255,255,255,0.06)]">
            <p className="text-[10px] text-[rgba(255,255,255,0.2)] uppercase tracking-wider">Footer</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BannerPreview({ banner }: { banner: Banner }) {
  return (
    <div style={{ background: banner.bgColor, color: banner.textColor }}>
      <div className="px-6 py-3 flex items-center justify-between">
        <div>
          <p className="font-bold text-sm">{banner.title}</p>
          {banner.subtitle && <p className="text-xs opacity-80 mt-0.5">{banner.subtitle}</p>}
        </div>
        <span className="text-xs font-bold uppercase tracking-wider border px-3 py-1 rounded" style={{ borderColor: banner.textColor }}>{banner.ctaText}</span>
      </div>
    </div>
  );
}

function SectionPreview({ section }: { section: Section }) {
  const layout = (section.config.layout as string) || "grid-2col";
  const maxItems = (section.config.maxItems as number) || 4;
  const cols = layout === "grid-3col" ? 3 : layout === "grid-4col" ? 4 : layout === "list" ? 1 : 2;

  if (section.type === "lead_debate") {
    return (
      <div className="px-4 py-6 border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex gap-4">
          <div className="flex-1">
            <p className="text-[9px] uppercase tracking-wider text-[#DC143C] mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>FEATURED DEBATE</p>
            <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-lg p-4">
              <div className="h-3 w-3/4 bg-[rgba(255,255,255,0.12)] rounded mb-2" />
              <div className="h-2 w-full bg-[rgba(255,255,255,0.06)] rounded mb-3" />
              <div className="space-y-1.5">
                <div className="h-7 bg-[rgba(220,20,60,0.1)] rounded" />
                <div className="h-7 bg-[rgba(255,255,255,0.04)] rounded" />
              </div>
            </div>
          </div>
          {(section.config.showSidebar as boolean) !== false && (
            <div className="w-36 space-y-2">
              <p className="text-[9px] uppercase tracking-wider text-[rgba(255,255,255,0.3)]">Latest</p>
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-[rgba(255,255,255,0.03)] rounded p-2">
                  <div className="h-2 w-full bg-[rgba(255,255,255,0.08)] rounded mb-1" />
                  <div className="h-1.5 w-2/3 bg-[rgba(255,255,255,0.05)] rounded" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (section.type === "live_activity") {
    return (
      <div className="px-4 py-6 border-b border-[rgba(255,255,255,0.06)]">
        <p className="text-[9px] uppercase tracking-wider text-[#DC143C] mb-3" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{section.title}</p>
        <div className="space-y-1.5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-2 py-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <div className="h-2 flex-1 bg-[rgba(255,255,255,0.06)] rounded" />
              <div className="h-2 w-10 bg-[rgba(255,255,255,0.04)] rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (section.type === "explore_topics") {
    return (
      <div className="px-4 py-6 border-b border-[rgba(255,255,255,0.06)]">
        <p className="text-[9px] uppercase tracking-wider text-[#DC143C] mb-3" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{section.title}</p>
        <div className="flex flex-wrap gap-2">
          {["Politics", "Economy", "Tech", "Culture", "Energy", "Diplomacy"].map(t => (
            <span key={t} className="px-3 py-1.5 text-xs rounded-full bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.08)]">{t}</span>
          ))}
        </div>
      </div>
    );
  }

  if (section.type === "newsletter_cta") {
    return (
      <div className="px-4 py-6 border-b border-[rgba(255,255,255,0.06)]">
        <div className="bg-[rgba(255,255,255,0.03)] rounded-lg p-4 text-center">
          <p className="text-xs font-bold text-white uppercase tracking-wider">{section.title}</p>
          <div className="mt-2 flex gap-2 justify-center max-w-[200px] mx-auto">
            <div className="flex-1 h-7 bg-[rgba(255,255,255,0.06)] rounded" />
            <div className="h-7 w-16 bg-[#DC143C] rounded" />
          </div>
        </div>
      </div>
    );
  }

  const sectionIcon = section.type === "predictions" ? "📊" : section.type === "voices" ? "🎙" : "💬";

  return (
    <div className="px-4 py-6 border-b border-[rgba(255,255,255,0.06)]">
      <p className="text-[9px] uppercase tracking-wider text-[#DC143C] mb-3" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{section.title}</p>
      {layout === "carousel" ? (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: Math.min(maxItems, 4) }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-40 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-lg p-3">
              <div className="text-xs mb-2">{sectionIcon}</div>
              <div className="h-2 w-full bg-[rgba(255,255,255,0.1)] rounded mb-1.5" />
              <div className="h-1.5 w-2/3 bg-[rgba(255,255,255,0.06)] rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: maxItems }).map((_, i) => {
            const spanFull = i === 0 && section.type === "debate_grid" && (section.config.firstSpanFull as boolean);
            return (
              <div key={i} className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-lg p-3" style={spanFull ? { gridColumn: `1 / -1` } : undefined}>
                <div className="text-xs mb-2">{sectionIcon}</div>
                <div className={`h-2 bg-[rgba(255,255,255,0.1)] rounded mb-1.5 ${spanFull ? "w-1/2" : "w-full"}`} />
                <div className="h-1.5 w-2/3 bg-[rgba(255,255,255,0.06)] rounded" />
                {section.type === "predictions" && (
                  <div className="mt-2 flex gap-1">
                    <div className="h-4 flex-1 bg-[rgba(220,20,60,0.12)] rounded" />
                    <div className="h-4 flex-1 bg-[rgba(255,255,255,0.04)] rounded" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium mb-1.5">{label}</label>{children}</div>;
}
