import type React from "react";
import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { api } from "@/lib/api";
import DynamicList from "@/components/dynamic-list";
import ComboSelect from "@/components/combo-select";
import PreviewPanel from "@/components/preview-panel";
import { Save, Send, Check, Upload, Archive, RotateCcw, Eye, Flag, XCircle, FileEdit } from "lucide-react";
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
  sectors: string[];
  countries: string[];
  cities: string[];
}

export default function EditVoicePage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const isNew = params.id === "new";
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [taxonomy, setTaxonomy] = useState<Taxonomy>({ sectors: [], countries: [], cities: [] });
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: "", headline: "", role: "", company: "", companyUrl: "", sector: "",
    country: "", city: "", imageUrl: "", summary: "", story: "",
    lessonsLearned: [] as string[], quote: "", impactStatement: "",
    isFeatured: false, isVerified: false, editorialStatus: "draft",
  });

  useEffect(() => {
    api.getTaxonomy().then(setTaxonomy).catch(() => {});

    if (!isNew) {
      api.getVoice(Number(params.id)).then(data => {
        setForm({
          name: data.name || "", headline: data.headline || "", role: data.role || "",
          company: data.company || "", companyUrl: data.companyUrl || "", sector: data.sector || "",
          country: data.country || "", city: data.city || "", imageUrl: data.imageUrl || "",
          summary: data.summary || "", story: data.story || "",
          lessonsLearned: data.lessonsLearned || [], quote: data.quote || "",
          impactStatement: data.impactStatement || "",
          isFeatured: data.isFeatured || false, isVerified: data.isVerified || false,
          editorialStatus: data.editorialStatus || "draft",
        });
        setLoading(false);
      }).catch(() => navigate("/voices"));
    }
  }, [params.id, isNew, navigate]);

  const update = (field: string, value: unknown) => setForm(f => ({ ...f, [field]: value }));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await api.uploadImage(file);
      update("imageUrl", res.url);
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Upload failed"); }
  };

  const save = async (status?: string) => {
    const errors: string[] = [];
    if (!form.name?.trim()) errors.push("Name is required");
    if (!form.headline?.trim()) errors.push("Headline is required");
    if (errors.length > 0) {
      errors.forEach(e => toast.error(e));
      return;
    }
    setSaving(true);
    try {
      const data = { ...form, editorialStatus: status || form.editorialStatus };
      if (isNew) {
        await api.bulkUpload("voices", [data]);
      } else {
        await api.updateVoice(Number(params.id), data);
      }
      navigate("/voices");
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold uppercase tracking-wide">{isNew ? "New Voice" : "Edit Voice"}</h1>
        <button onClick={() => setShowPreview(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md text-sm hover:bg-secondary/80">
          <Eye className="w-3.5 h-3.5" /> Preview
        </button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name">
            <input type="text" value={form.name} onChange={e => update("name", e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          </Field>
          <Field label="Role">
            <input type="text" value={form.role} onChange={e => update("role", e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          </Field>
        </div>

        <Field label="Headline">
          <textarea value={form.headline} onChange={e => update("headline", e.target.value)} rows={2} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Company">
            <input type="text" value={form.company} onChange={e => update("company", e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          </Field>
          <Field label="Company URL">
            <input type="text" value={form.companyUrl} onChange={e => update("companyUrl", e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Sector">
            <ComboSelect value={form.sector} onChange={v => update("sector", v)} options={taxonomy.sectors} placeholder="Select or type sector..." />
          </Field>
          <Field label="Country">
            <ComboSelect value={form.country} onChange={v => update("country", v)} options={taxonomy.countries} placeholder="Select or type country..." />
          </Field>
          <Field label="City">
            <ComboSelect value={form.city} onChange={v => update("city", v)} options={taxonomy.cities} placeholder="Select or type city..." />
          </Field>
        </div>

        <Field label="Profile Image">
          <div className="flex items-center gap-3">
            {form.imageUrl && <img src={form.imageUrl} alt="" className="w-12 h-12 rounded-full object-cover border border-border" />}
            <input type="text" value={form.imageUrl} onChange={e => update("imageUrl", e.target.value)} className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Image URL or upload" />
            <input type="file" ref={fileRef} accept="image/*" onChange={handleImageUpload} className="hidden" />
            <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 bg-secondary rounded-md text-sm hover:bg-secondary/80"><Upload className="w-3.5 h-3.5" /> Upload</button>
          </div>
        </Field>

        <Field label="Summary">
          <textarea value={form.summary} onChange={e => update("summary", e.target.value)} rows={3} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
        </Field>

        <Field label="Story">
          <textarea value={form.story} onChange={e => update("story", e.target.value)} rows={6} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm resize-y focus:outline-none focus:ring-1 focus:ring-primary" />
        </Field>

        <DynamicList items={form.lessonsLearned} onChange={v => update("lessonsLearned", v)} placeholder="Add lesson..." label="Lessons Learned" />

        <Field label="Quote">
          <textarea value={form.quote} onChange={e => update("quote", e.target.value)} rows={2} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
        </Field>

        <Field label="Impact Statement">
          <textarea value={form.impactStatement} onChange={e => update("impactStatement", e.target.value)} rows={2} placeholder="e.g. Built the Middle East's first $3.1B acquisition" className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
        </Field>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isFeatured} onChange={e => update("isFeatured", e.target.checked)} className="accent-primary" /> Featured</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isVerified} onChange={e => update("isVerified", e.target.checked)} className="accent-primary" /> Verified</label>
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
        <button onClick={() => navigate("/voices")} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
      </div>

      {showPreview && (
        <PreviewPanel type="voices" item={form} onClose={() => setShowPreview(false)} onUpdate={update} />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium mb-1.5">{label}</label>{children}</div>;
}
