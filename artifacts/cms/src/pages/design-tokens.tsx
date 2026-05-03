import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import { Save, Plus, Trash2, Palette } from "lucide-react";
import { toast } from "sonner";

interface DesignToken {
  id: number;
  tokenType: string;
  name: string;
  label: string;
  value: string;
  category: string | null;
  sortOrder: number;
}

export default function DesignTokensPage() {
  const [tokens, setTokens] = useState<DesignToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [filterCat, setFilterCat] = useState("all");

  const load = () => {
    api.getDesignTokens()
      .then((d: { items: DesignToken[] }) => setTokens(d.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const categories = [...new Set(tokens.map(t => t.category).filter(Boolean))] as string[];
  const filtered = filterCat === "all" ? tokens : tokens.filter(t => t.category === filterCat);

  const updateToken = async (id: number, data: Partial<DesignToken>) => {
    setSaving(id);
    try {
      await api.updateDesignToken(id, data as Record<string, unknown>);
      setTokens(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Update failed"); }
    finally { setSaving(null); }
  };

  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const debouncedUpdate = useCallback((tokenId: number, data: Partial<DesignToken>) => {
    const key = String(tokenId);
    const existing = debounceTimers.current.get(key);
    if (existing) clearTimeout(existing);
    debounceTimers.current.set(key, setTimeout(async () => {
      await updateToken(tokenId, data);
      debounceTimers.current.delete(key);
    }, 500));
  }, []);

  const addToken = async () => {
    try {
      const res = await api.createDesignToken({
        name: `token-${Date.now()}`,
        label: "New Token",
        value: "#000000",
        tokenType: "color",
        category: "brand",
      });
      if (res.item) setTokens(prev => [...prev, res.item]);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Create failed"); }
  };

  const deleteToken = async (id: number) => {
    if (!confirm("Delete this design token?")) return;
    try {
      await api.deleteDesignToken(id);
      setTokens(prev => prev.filter(t => t.id !== id));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed"); }
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold uppercase tracking-wide flex items-center gap-2">
          <Palette className="w-6 h-6 text-primary" /> Design Tokens<span className="text-primary">.</span>
        </h1>
        <button onClick={addToken} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-sm hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Add Token
        </button>
      </div>

      <div className="flex gap-1 flex-wrap">
        <button onClick={() => setFilterCat("all")} className={`px-2 py-1 text-xs rounded-sm ${filterCat === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>All</button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setFilterCat(cat)} className={`px-2 py-1 text-xs rounded-sm capitalize ${filterCat === cat ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{cat}</button>
        ))}
      </div>

      <div className="grid gap-3">
        {filtered.map(token => (
          <div key={token.id} className="border border-border rounded-sm p-4 bg-card">
            <div className="grid grid-cols-[48px_1fr_1fr_120px_80px_40px] gap-3 items-center">
              {token.tokenType === "color" ? (
                <input
                  type="color"
                  value={token.value}
                  onChange={e => { setTokens(prev => prev.map(t => t.id === token.id ? { ...t, value: e.target.value } : t)); debouncedUpdate(token.id, { value: e.target.value }); }}
                  className="w-10 h-10 border border-border rounded-sm cursor-pointer"
                />
              ) : (
                <div className="w-10 h-10 border border-border rounded-sm flex items-center justify-center text-xs text-muted-foreground">Aa</div>
              )}
              <div>
                <label className="block text-[0.6rem] text-muted-foreground uppercase mb-0.5">Label</label>
                <input
                  value={token.label}
                  onChange={e => { setTokens(prev => prev.map(t => t.id === token.id ? { ...t, label: e.target.value } : t)); debouncedUpdate(token.id, { label: e.target.value }); }}
                  className="w-full px-2 py-1 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[0.6rem] text-muted-foreground uppercase mb-0.5">Value</label>
                <input
                  value={token.value}
                  onChange={e => { setTokens(prev => prev.map(t => t.id === token.id ? { ...t, value: e.target.value } : t)); debouncedUpdate(token.id, { value: e.target.value }); }}
                  className="w-full px-2 py-1 bg-background border border-border rounded-sm text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[0.6rem] text-muted-foreground uppercase mb-0.5">Category</label>
                <select
                  value={token.category || ""}
                  onChange={e => updateToken(token.id, { category: e.target.value || null })}
                  className="w-full px-2 py-1 bg-background border border-border rounded-sm text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="brand">Brand</option>
                  <option value="ui">UI</option>
                  <option value="typography">Typography</option>
                </select>
              </div>
              <span className="text-xs text-muted-foreground font-mono">{token.name}</span>
              <button onClick={() => deleteToken(token.id)} className="text-muted-foreground hover:text-red-500 p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {saving === token.id && <span className="text-xs text-primary mt-1 block">Saving...</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
