import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { api } from "@/lib/api";
import TagInput from "@/components/tag-input";
import ComboSelect from "@/components/combo-select";
import PreviewPanel from "@/components/preview-panel";
import type React from "react";
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

interface Taxonomy {
  predictionCategories: string[];
  tags: string[];
}

export default function EditPredictionPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const isNew = params.id === "new";
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [taxonomy, setTaxonomy] = useState<Taxonomy>({ predictionCategories: [], tags: [] });
  const [form, setForm] = useState({
    question: "", category: "", categorySlug: "", resolvesAt: "",
    yesPercentage: 50, noPercentage: 50, totalCount: 0, momentum: 0,
    momentumDirection: "up", trendData: [] as number[], cardLayout: "grid",
    editorialStatus: "draft", isFeatured: false, tags: [] as string[],
  });

  useEffect(() => {
    api.getTaxonomy().then(setTaxonomy).catch(() => {});

    if (!isNew) {
      api.getPrediction(Number(params.id)).then(data => {
        setForm({
          question: data.question || "", category: data.category || "", categorySlug: data.categorySlug || "",
          resolvesAt: data.resolvesAt ? data.resolvesAt.split("T")[0] : "",
          yesPercentage: data.yesPercentage ?? 50, noPercentage: data.noPercentage ?? 50,
          totalCount: data.totalCount ?? 0, momentum: data.momentum ?? 0,
          momentumDirection: data.momentumDirection || "up", trendData: data.trendData || [],
          cardLayout: data.cardLayout || "grid",
          editorialStatus: data.editorialStatus || "draft", isFeatured: data.isFeatured || false,
          tags: data.tags || [],
        });
        setLoading(false);
      }).catch(() => navigate("/predictions"));
    }
  }, [params.id, isNew, navigate]);

  const update = (field: string, value: unknown) => setForm(f => ({ ...f, [field]: value }));

  const save = async (status?: string) => {
    const errors: string[] = [];
    if (!form.question?.trim()) errors.push("Question is required");
    if (errors.length > 0) {
      errors.forEach(e => toast.error(e));
      return;
    }
    setSaving(true);
    try {
      const data = { ...form, editorialStatus: status || form.editorialStatus, resolvesAt: form.resolvesAt || null };
      if (isNew) {
        await api.bulkUpload("predictions", [data]);
      } else {
        await api.updatePrediction(Number(params.id), data);
      }
      navigate("/predictions");
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold uppercase tracking-wide">{isNew ? "New Prediction" : "Edit Prediction"}</h1>
        <button onClick={() => setShowPreview(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md text-sm hover:bg-secondary/80">
          <Eye className="w-3.5 h-3.5" /> Preview
        </button>
      </div>

      <div className="space-y-4">
        <Field label="Question">
          <textarea value={form.question} onChange={e => update("question", e.target.value)} rows={2} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Category">
            <ComboSelect
              value={form.category}
              onChange={v => { update("category", v); update("categorySlug", v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")); }}
              options={taxonomy.predictionCategories}
              placeholder="Select or type category..."
            />
          </Field>
          <Field label="Category Slug">
            <input type="text" value={form.categorySlug} onChange={e => update("categorySlug", e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Resolves At">
            <input type="date" value={form.resolvesAt} onChange={e => update("resolvesAt", e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          </Field>
          <Field label="Card Layout">
            <select value={form.cardLayout} onChange={e => update("cardLayout", e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="featured">Featured (Chart + Details)</option>
              <option value="grid">Grid Card (Sparkline)</option>
              <option value="compact">Compact</option>
              <option value="ticker">Ticker Item</option>
            </select>
          </Field>
        </div>

        {form.cardLayout && (
          <div className="rounded-md border border-border bg-secondary/20 p-3">
            <p className="text-xs text-muted-foreground mb-1 font-medium">Layout Preview</p>
            <CardLayoutPreview layout={form.cardLayout} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Yes %">
            <input type="number" min={0} max={100} value={form.yesPercentage} onChange={e => { const v = Number(e.target.value); update("yesPercentage", v); update("noPercentage", 100 - v); }} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          </Field>
          <Field label="No %">
            <input type="number" min={0} max={100} value={form.noPercentage} readOnly className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm opacity-50" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Momentum">
            <input type="number" step="0.1" value={form.momentum} onChange={e => update("momentum", Number(e.target.value))} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          </Field>
          <Field label="Direction">
            <select value={form.momentumDirection} onChange={e => update("momentumDirection", e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="up">Up</option>
              <option value="down">Down</option>
            </select>
          </Field>
        </div>

        <Field label="Tags">
          <TagInput tags={form.tags} onChange={v => update("tags", v)} suggestions={taxonomy.tags} placeholder="Add tag..." />
        </Field>

        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isFeatured} onChange={e => update("isFeatured", e.target.checked)} className="accent-primary" /> Featured</label>
      </div>

      <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
        <button onClick={() => save()} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm hover:bg-secondary/80 disabled:opacity-50"><Save className="w-3.5 h-3.5" /> Save</button>
        {ALLOWED_TRANSITIONS[form.editorialStatus]?.includes("draft") && (
          <button onClick={() => save("draft")} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm hover:bg-secondary/80 disabled:opacity-50"><FileEdit className="w-3.5 h-3.5" /> Move to Draft</button>
        )}
        {ALLOWED_TRANSITIONS[form.editorialStatus]?.includes("in_review") && (
          <button onClick={() => save("in_review")} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"><Send className="w-3.5 h-3.5" /> Submit for Review</button>
        )}
        {ALLOWED_TRANSITIONS[form.editorialStatus]?.includes("approved") && (
          <button onClick={() => save("approved")} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50"><Check className="w-3.5 h-3.5" /> Approve</button>
        )}
        {ALLOWED_TRANSITIONS[form.editorialStatus]?.includes("rejected") && (
          <button onClick={() => save("rejected")} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50"><XCircle className="w-3.5 h-3.5" /> Reject</button>
        )}
        {ALLOWED_TRANSITIONS[form.editorialStatus]?.includes("revision") && (
          <button onClick={() => save("revision")} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white rounded-md text-sm hover:bg-orange-700 disabled:opacity-50"><RotateCcw className="w-3.5 h-3.5" /> Revision</button>
        )}
        {ALLOWED_TRANSITIONS[form.editorialStatus]?.includes("flagged") && (
          <button onClick={() => save("flagged")} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-yellow-600 text-white rounded-md text-sm hover:bg-yellow-700 disabled:opacity-50"><Flag className="w-3.5 h-3.5" /> Flag</button>
        )}
        {ALLOWED_TRANSITIONS[form.editorialStatus]?.includes("archived") && (
          <button onClick={() => save("archived")} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-gray-600 text-white rounded-md text-sm hover:bg-gray-700 disabled:opacity-50"><Archive className="w-3.5 h-3.5" /> Archive</button>
        )}
        <button onClick={() => navigate("/predictions")} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
      </div>

      {showPreview && (
        <PreviewPanel type="predictions" item={form} onClose={() => setShowPreview(false)} onUpdate={update} />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium mb-1.5">{label}</label>{children}</div>;
}

const PRED_LAYOUTS: Record<string, { desc: string; visual: React.ReactNode }> = {
  featured: { desc: "Large 2-column card with confidence chart, tipping point line, and detailed breakdown.", visual: <div className="h-12 border border-primary/40 rounded bg-primary/5 grid grid-cols-2 gap-1 p-1"><div className="bg-secondary/30 rounded" /><div className="bg-secondary/30 rounded" /></div> },
  grid: { desc: "Compact card with sparkline at top, resolve date badge, and simplified confidence bars.", visual: <div className="flex gap-2"><div className="flex-1 h-14 border border-border rounded bg-secondary/30" /><div className="flex-1 h-14 border border-border rounded bg-secondary/30" /></div> },
  compact: { desc: "Minimal prediction with yes/no percentage bars only.", visual: <div className="space-y-1"><div className="h-3 w-2/3 bg-secondary rounded" /><div className="h-2 w-1/2 bg-primary/20 rounded" /><div className="h-2 w-1/3 bg-secondary/40 rounded" /></div> },
  ticker: { desc: "Scrolling ticker item showing label, percentage, and delta change.", visual: <div className="h-6 bg-[#0D0D0D] rounded flex items-center px-2 gap-2"><span className="text-[8px] text-white/50">LABEL</span><span className="text-[9px] text-white font-bold">71%</span><span className="text-[8px] text-green-400">+2.1</span></div> },
};

function CardLayoutPreview({ layout }: { layout: string }) {
  const info = PRED_LAYOUTS[layout];
  if (!info) return null;
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground">{info.desc}</p>
      <div className="max-w-[200px]">{info.visual}</div>
    </div>
  );
}
