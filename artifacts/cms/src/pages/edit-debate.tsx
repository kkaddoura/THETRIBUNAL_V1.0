import type React from "react";
import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { api } from "@/lib/api";
import TagInput from "@/components/tag-input";
import ComboSelect from "@/components/combo-select";
import PreviewPanel from "@/components/preview-panel";
import { Save, Send, Check, Archive, RotateCcw, Eye, Flag, XCircle, FileEdit } from "lucide-react";
import { toast } from "sonner";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ["in_review", "approved", "rejected"],
  in_review: ["approved", "rejected", "draft"],
  approved: ["flagged", "archived", "draft"],
  rejected: ["revision", "draft"],
  revision: ["in_review", "approved", "draft"],
  flagged: ["approved", "archived"],
  archived: ["approved", "draft"],
};

interface VoiceOption {
  id: number;
  name: string;
}

interface Taxonomy {
  debateCategories: string[];
  tags: string[];
}

export default function EditDebatePage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const isNew = params.id === "new";
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [taxonomy, setTaxonomy] = useState<Taxonomy>({ debateCategories: [], tags: [] });
  const [form, setForm] = useState({
    question: "", context: "", category: "", categorySlug: "", tags: [] as string[],
    pollType: "binary", cardLayout: "standard", isFeatured: false, isEditorsPick: false, editorialStatus: "draft",
    endsAt: "", relatedProfileIds: [] as number[], options: [{ text: "Yes", voteCount: 0 }, { text: "No", voteCount: 0 }],
  });

  useEffect(() => {
    api.getVoices().then(res => {
      setVoices(res.items.map((v: { id: number; name: string }) => ({ id: v.id, name: v.name })));
    }).catch(() => {});

    api.getTaxonomy().then(setTaxonomy).catch(() => {});

    if (!isNew) {
      api.getDebate(Number(params.id)).then(data => {
        setForm({
          question: data.question || "", context: data.context || "", category: data.category || "",
          categorySlug: data.categorySlug || "", tags: data.tags || [], pollType: data.pollType || "binary",
          cardLayout: data.cardLayout || "standard", isFeatured: data.isFeatured || false, isEditorsPick: data.isEditorsPick || false,
          editorialStatus: data.editorialStatus || "draft", endsAt: data.endsAt ? data.endsAt.split("T")[0] : "",
          relatedProfileIds: data.relatedProfileIds || [], options: data.options || [],
        });
        setLoading(false);
      }).catch(() => navigate("/debates"));
    }
  }, [params.id, isNew, navigate]);

  const update = (field: string, value: unknown) => setForm(f => ({ ...f, [field]: value }));

  const save = async (status?: string) => {
    const errors: string[] = [];
    if (!form.question?.trim()) errors.push("Question is required");
    if (!form.category?.trim()) errors.push("Category is required");
    if (errors.length > 0) {
      errors.forEach(e => toast.error(e));
      return;
    }
    setSaving(true);
    try {
      const data = { ...form, editorialStatus: status || form.editorialStatus, endsAt: form.endsAt || null };
      if (isNew) {
        await api.bulkUpload("debates", [{ ...data, options: form.options.map(o => o.text) }]);
      } else {
        await api.updateDebate(Number(params.id), data);
      }
      navigate("/debates");
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold uppercase tracking-wide">{isNew ? "New Debate" : "Edit Debate"}</h1>
        <button onClick={() => setShowPreview(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md text-sm hover:bg-secondary/80">
          <Eye className="w-3.5 h-3.5" /> Preview
        </button>
      </div>

      <div className="space-y-4">
        <Field label="Question">
          <textarea value={form.question} onChange={e => update("question", e.target.value)} rows={2} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
        </Field>

        <Field label="Context">
          <textarea value={form.context} onChange={e => update("context", e.target.value)} rows={4} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Background context for the debate..." />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Category">
            <ComboSelect
              value={form.category}
              onChange={v => { update("category", v); update("categorySlug", v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")); }}
              options={taxonomy.debateCategories}
              placeholder="Select or type category..."
            />
          </Field>
          <Field label="Category Slug">
            <input type="text" value={form.categorySlug} onChange={e => update("categorySlug", e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Poll Type">
            <select value={form.pollType} onChange={e => update("pollType", e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="binary">Binary (Yes/No)</option>
              <option value="multiple_choice">Multiple Choice</option>
              <option value="scale">Scale (Rating)</option>
              <option value="hot_take">Hot Take (Agree/Disagree)</option>
            </select>
          </Field>
          <Field label="Card Layout">
            <select value={form.cardLayout} onChange={e => update("cardLayout", e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="standard">Standard Card</option>
              <option value="featured">Featured (Hero Split)</option>
              <option value="compact">Compact</option>
              <option value="sidebar">Sidebar / List</option>
              <option value="full-width">Full Width</option>
            </select>
          </Field>
          <Field label="Ends At">
            <input type="date" value={form.endsAt} onChange={e => update("endsAt", e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          </Field>
        </div>

        {form.cardLayout && (
          <div className="rounded-md border border-border bg-secondary/20 p-3">
            <p className="text-xs text-muted-foreground mb-1 font-medium">Layout Preview</p>
            <CardLayoutPreview type="debate" layout={form.cardLayout} />
          </div>
        )}

        <Field label="Tags">
          <TagInput tags={form.tags} onChange={v => update("tags", v)} suggestions={taxonomy.tags} placeholder="Add tag..." />
        </Field>

        <Field label="Related Voices">
          <div className="border border-border rounded-md p-2 max-h-40 overflow-y-auto space-y-1">
            {voices.length === 0 ? (
              <p className="text-xs text-muted-foreground">Loading voices...</p>
            ) : (
              voices.map(v => (
                <label key={v.id} className="flex items-center gap-2 text-sm px-1 py-0.5 hover:bg-secondary/30 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.relatedProfileIds.includes(v.id)}
                    onChange={e => {
                      if (e.target.checked) {
                        update("relatedProfileIds", [...form.relatedProfileIds, v.id]);
                      } else {
                        update("relatedProfileIds", form.relatedProfileIds.filter((id: number) => id !== v.id));
                      }
                    }}
                    className="accent-primary"
                  />
                  {v.name}
                </label>
              ))
            )}
          </div>
          {form.relatedProfileIds.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">{form.relatedProfileIds.length} voice{form.relatedProfileIds.length !== 1 ? "s" : ""} selected</p>
          )}
        </Field>

        <Field label="Poll Options">
          <div className="space-y-2">
            {form.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="text" value={opt.text} onChange={e => {
                  const next = [...form.options]; next[i] = { ...next[i], text: e.target.value }; update("options", next);
                }} className="flex-1 px-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                {form.options.length > 2 && (
                  <button type="button" onClick={() => update("options", form.options.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-red-400 text-sm">×</button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => update("options", [...form.options, { text: "", voteCount: 0 }])} className="text-sm text-primary hover:text-primary/80">+ Add Option</button>
          </div>
        </Field>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isFeatured} onChange={e => update("isFeatured", e.target.checked)} className="accent-primary" /> Featured</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isEditorsPick} onChange={e => update("isEditorsPick", e.target.checked)} className="accent-primary" /> Editor's Pick</label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
        <button onClick={() => save()} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm hover:bg-secondary/80 disabled:opacity-50">
          <Save className="w-3.5 h-3.5" /> Save
        </button>
        {ALLOWED_TRANSITIONS[form.editorialStatus]?.includes("draft") && (
          <button onClick={() => save("draft")} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm hover:bg-secondary/80 disabled:opacity-50">
            <FileEdit className="w-3.5 h-3.5" /> Move to Draft
          </button>
        )}
        {ALLOWED_TRANSITIONS[form.editorialStatus]?.includes("in_review") && (
          <button onClick={() => save("in_review")} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50">
            <Send className="w-3.5 h-3.5" /> Submit for Review
          </button>
        )}
        {ALLOWED_TRANSITIONS[form.editorialStatus]?.includes("approved") && (
          <button onClick={() => save("approved")} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50">
            <Check className="w-3.5 h-3.5" /> Approve
          </button>
        )}
        {ALLOWED_TRANSITIONS[form.editorialStatus]?.includes("rejected") && (
          <button onClick={() => save("rejected")} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50">
            <XCircle className="w-3.5 h-3.5" /> Reject
          </button>
        )}
        {ALLOWED_TRANSITIONS[form.editorialStatus]?.includes("revision") && (
          <button onClick={() => save("revision")} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white rounded-md text-sm hover:bg-orange-700 disabled:opacity-50">
            <RotateCcw className="w-3.5 h-3.5" /> Revision
          </button>
        )}
        {ALLOWED_TRANSITIONS[form.editorialStatus]?.includes("flagged") && (
          <button onClick={() => save("flagged")} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-yellow-600 text-white rounded-md text-sm hover:bg-yellow-700 disabled:opacity-50">
            <Flag className="w-3.5 h-3.5" /> Flag
          </button>
        )}
        {ALLOWED_TRANSITIONS[form.editorialStatus]?.includes("archived") && (
          <button onClick={() => save("archived")} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-gray-600 text-white rounded-md text-sm hover:bg-gray-700 disabled:opacity-50">
            <Archive className="w-3.5 h-3.5" /> Archive
          </button>
        )}
        <button onClick={() => navigate("/debates")} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
      </div>

      {showPreview && (
        <PreviewPanel type="debates" item={form} onClose={() => setShowPreview(false)} onUpdate={update} />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const LAYOUT_DESCRIPTIONS: Record<string, Record<string, { desc: string; visual: React.ReactNode }>> = {
  debate: {
    standard: { desc: "Default vertical card in grids. Question + vote options + results.", visual: <div className="flex gap-2"><div className="flex-1 h-16 border border-border rounded bg-secondary/30" /><div className="flex-1 h-16 border border-border rounded bg-secondary/30" /></div> },
    featured: { desc: "Large horizontal hero card. Split-screen with question left, voting right.", visual: <div className="h-12 border border-primary/40 rounded bg-primary/5 flex items-center justify-center text-[10px] text-primary font-bold">HERO SPLIT LAYOUT</div> },
    compact: { desc: "Minimal card. Question + percentage bars only, no context.", visual: <div className="space-y-1"><div className="h-3 w-3/4 bg-secondary rounded" /><div className="h-2 w-1/2 bg-primary/20 rounded" /></div> },
    sidebar: { desc: "Text-only list item. Category, headline, vote count. Used in sidebars.", visual: <div className="space-y-1 border-l-2 border-primary pl-2"><div className="h-2 w-10 bg-primary/30 rounded" /><div className="h-2 w-full bg-secondary rounded" /><div className="h-2 w-8 bg-secondary/50 rounded" /></div> },
    "full-width": { desc: "Full-width banner card spanning the entire content area.", visual: <div className="h-10 border border-border rounded bg-secondary/20 flex items-center justify-center text-[10px] text-muted-foreground">FULL WIDTH</div> },
  },
  prediction: {
    featured: { desc: "Large 2-column card with confidence chart and tipping point.", visual: <div className="h-12 border border-primary/40 rounded bg-primary/5 grid grid-cols-2 gap-1 p-1"><div className="bg-secondary/30 rounded" /><div className="bg-secondary/30 rounded" /></div> },
    grid: { desc: "Compact card with sparkline, resolve date, and confidence bars.", visual: <div className="flex gap-2"><div className="flex-1 h-14 border border-border rounded bg-secondary/30" /><div className="flex-1 h-14 border border-border rounded bg-secondary/30" /></div> },
    compact: { desc: "Minimal prediction with yes/no bars only.", visual: <div className="space-y-1"><div className="h-3 w-2/3 bg-secondary rounded" /><div className="h-2 w-1/2 bg-primary/20 rounded" /><div className="h-2 w-1/3 bg-secondary/40 rounded" /></div> },
    ticker: { desc: "Scrolling ticker item showing label + percentage + delta.", visual: <div className="h-6 bg-[#0D0D0D] rounded flex items-center px-2 gap-2"><span className="text-[8px] text-white/50">LABEL</span><span className="text-[9px] text-white font-bold">71%</span><span className="text-[8px] text-green-400">+2.1</span></div> },
  },
};

function CardLayoutPreview({ type, layout }: { type: string; layout: string }) {
  const info = LAYOUT_DESCRIPTIONS[type]?.[layout];
  if (!info) return null;
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground">{info.desc}</p>
      <div className="max-w-[200px]">{info.visual}</div>
    </div>
  );
}
