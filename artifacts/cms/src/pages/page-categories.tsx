import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Save } from "lucide-react";

interface CategoryRow {
  name: string;
  debateCount: number;
  predictionCount: number;
  disabled: boolean;
}

export default function PageCategories() {
  const [categories, setCategories] = useState<CategoryRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getCategories()
      .then((data: any) => setCategories(data?.categories ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggle = (name: string) => {
    if (!categories) return;
    setCategories(categories.map((c) => (c.name === name ? { ...c, disabled: !c.disabled } : c)));
  };

  const save = async () => {
    if (!categories) return;
    setSaving(true);
    try {
      const disabled = categories.filter((c) => c.disabled).map((c) => c.name);
      await api.updateCategories(disabled);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  if (!categories) return <div className="text-center py-12 text-red-500">Failed to load categories</div>;

  const disabledCount = categories.filter((c) => c.disabled).length;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold uppercase tracking-wide">Categories<span className="text-primary">.</span></h1>
        <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-sm hover:bg-primary/90 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Turn a category off to hide it from the public site. All debates and predictions in a disabled category
        are removed from listings, category filters and the homepage. Content is not deleted — re-enable any time.
        {disabledCount > 0 && <span className="text-primary font-bold"> {disabledCount} disabled.</span>}
      </p>

      <section className="border border-border rounded-sm divide-y divide-border">
        {categories.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No categories found.</p>
        )}
        {categories.map((c) => (
          <label key={c.name} className="flex items-center justify-between gap-3 p-3 hover:bg-secondary/30 cursor-pointer">
            <div className="flex-1">
              <p className={`font-bold text-sm ${c.disabled ? "text-muted-foreground line-through" : ""}`}>{c.name}</p>
              <p className="text-xs text-muted-foreground">
                {c.debateCount} debate{c.debateCount === 1 ? "" : "s"} · {c.predictionCount} prediction{c.predictionCount === 1 ? "" : "s"}
              </p>
            </div>
            <span className={`text-[11px] font-bold uppercase tracking-wider ${c.disabled ? "text-muted-foreground" : "text-primary"}`}>
              {c.disabled ? "Hidden" : "Visible"}
            </span>
            <input
              type="checkbox"
              checked={!c.disabled}
              onChange={() => toggle(c.name)}
              className="w-4 h-4 accent-primary"
              title={c.disabled ? "Enable category" : "Disable category"}
            />
          </label>
        ))}
      </section>
    </div>
  );
}
