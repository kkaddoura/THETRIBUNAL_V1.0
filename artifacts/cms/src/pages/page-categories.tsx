import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Save, Plus, Pencil, Check, X } from "lucide-react";

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

  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    return api.getCategories()
      .then((data: any) => setCategories(data?.categories ?? []))
      .catch(console.error);
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const toggle = (name: string) => {
    if (!categories) return;
    setCategories(categories.map((c) => (c.name === name ? { ...c, disabled: !c.disabled } : c)));
  };

  const saveVisibility = async () => {
    if (!categories) return;
    setSaving(true);
    try {
      await api.updateCategories(categories.filter((c) => c.disabled).map((c) => c.name));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const addCategory = async () => {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    try {
      await api.addCategory(name);
      setNewName("");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Add failed");
    } finally {
      setAdding(false);
    }
  };

  const commitRename = async (from: string) => {
    const to = renameValue.trim();
    if (!to || to === from) { setRenaming(null); return; }
    setBusy(true);
    try {
      await api.renameCategory(from, to);
      setRenaming(null);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Rename failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  if (!categories) return <div className="text-center py-12 text-red-500">Failed to load categories</div>;

  const disabledCount = categories.filter((c) => c.disabled).length;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold uppercase tracking-wide">Categories<span className="text-primary">.</span></h1>
        <button onClick={saveVisibility} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-sm hover:bg-primary/90 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? "Saving..." : saved ? "Saved!" : "Save Visibility"}
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Add a category, rename one (updates every debate &amp; prediction using it), or hide it from the public site.
        Hiding removes a category and all its content from listings and filters — nothing is deleted. Visibility
        changes apply on <span className="font-bold">Save Visibility</span>; add and rename apply immediately.
        {disabledCount > 0 && <span className="text-primary font-bold"> {disabledCount} hidden.</span>}
      </p>

      {/* Add */}
      <div className="flex items-center gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addCategory(); }}
          placeholder="New category name…"
          className="flex-1 px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button onClick={addCategory} disabled={adding || !newName.trim()} className="flex items-center gap-1.5 px-3 py-2 bg-secondary rounded-sm text-sm hover:bg-secondary/80 disabled:opacity-50">
          <Plus className="w-4 h-4" /> {adding ? "Adding…" : "Add"}
        </button>
      </div>

      <section className="border border-border rounded-sm divide-y divide-border">
        {categories.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No categories yet. Add one above.</p>
        )}
        {categories.map((c) => (
          <div key={c.name} className="flex items-center justify-between gap-3 p-3 hover:bg-secondary/30">
            <div className="flex-1 min-w-0">
              {renaming === c.name ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") commitRename(c.name); if (e.key === "Escape") setRenaming(null); }}
                    className="flex-1 px-2 py-1 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button onClick={() => commitRename(c.name)} disabled={busy} className="text-primary hover:opacity-80 disabled:opacity-50" title="Save name"><Check className="w-4 h-4" /></button>
                  <button onClick={() => setRenaming(null)} className="text-muted-foreground hover:text-foreground" title="Cancel"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <p className={`font-bold text-sm ${c.disabled ? "text-muted-foreground line-through" : ""}`}>{c.name}</p>
                    <button onClick={() => { setRenaming(c.name); setRenameValue(c.name); }} className="text-muted-foreground hover:text-primary" title="Rename"><Pencil className="w-3.5 h-3.5" /></button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {c.debateCount} debate{c.debateCount === 1 ? "" : "s"} · {c.predictionCount} prediction{c.predictionCount === 1 ? "" : "s"}
                    {c.debateCount + c.predictionCount === 0 && " · no content yet"}
                  </p>
                </>
              )}
            </div>
            {renaming !== c.name && (
              <>
                <span className={`text-[11px] font-bold uppercase tracking-wider ${c.disabled ? "text-muted-foreground" : "text-primary"}`}>
                  {c.disabled ? "Hidden" : "Visible"}
                </span>
                <input
                  type="checkbox"
                  checked={!c.disabled}
                  onChange={() => toggle(c.name)}
                  className="w-4 h-4 accent-primary"
                  title={c.disabled ? "Show category" : "Hide category"}
                />
              </>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
