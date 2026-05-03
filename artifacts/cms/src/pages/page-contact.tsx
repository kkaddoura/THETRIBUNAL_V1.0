import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Save, Plus, Trash2, Mail, Globe, MapPin } from "lucide-react";
interface ContactEmail {
  label: string;
  email: string;
  description: string;
}

interface SocialLink {
  platform: string;
  url: string;
}

interface ContactConfig {
  titleLine1: string;
  titleLine2: string;
  emails: ContactEmail[];
  socialLinks: SocialLink[];
  officeLocation: string;
  punctuations?: string[];
}

export default function PageContact() {
  const [config, setConfig] = useState<ContactConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getPage("contact").then((data: any) => {
      setConfig({
        titleLine1: data?.titleLine1 ?? "Contact",
        titleLine2: data?.titleLine2 ?? "Us",
        emails: data?.emails ?? [],
        socialLinks: data?.socialLinks ?? [],
        officeLocation: data?.officeLocation ?? "",
        punctuations: data?.punctuations ?? ["."],
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await api.updatePage("contact", config as unknown as Record<string, unknown>);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  if (!config) return <div className="text-center py-12 text-red-500">Failed to load Contact config</div>;

  const updateEmail = (i: number, updates: Partial<ContactEmail>) => {
    const emails = [...config.emails];
    emails[i] = { ...emails[i], ...updates };
    setConfig({ ...config, emails });
  };

  const updateSocial = (i: number, updates: Partial<SocialLink>) => {
    const socialLinks = [...config.socialLinks];
    socialLinks[i] = { ...socialLinks[i], ...updates };
    setConfig({ ...config, socialLinks });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold uppercase tracking-wide">Contact Page<span className="text-primary">.</span></h1>
        <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-sm hover:bg-primary/90 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      <div className="border border-border rounded-sm p-4 space-y-3">
        <div>
          <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">Title Line 1</label>
          <input value={config.titleLine1} onChange={e => setConfig({ ...config, titleLine1: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">Title Line 2</label>
          <div className="flex items-center gap-2">
            <input value={config.titleLine2} onChange={e => setConfig({ ...config, titleLine2: e.target.value })} className="flex-1 px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            <input value={(config.punctuations ?? ["."]).join("")} onChange={e => setConfig({ ...config, punctuations: e.target.value ? e.target.value.split("") : [] })} placeholder="." className="w-16 px-2 py-2 bg-background border border-border rounded-sm text-sm text-primary font-bold text-center focus:outline-none focus:ring-1 focus:ring-primary" title="Punctuation (renders in primary color)" />
          </div>
        </div>
      </div>

      <section className="border border-border rounded-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold uppercase tracking-wide flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /> Email Addresses</h2>
          <button onClick={() => setConfig({ ...config, emails: [...config.emails, { label: "", email: "", description: "" }] })} className="flex items-center gap-1 px-2 py-1 text-xs bg-secondary rounded-sm hover:bg-secondary/80">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
        {config.emails.map((em, i) => (
          <div key={i} className="border border-border/50 rounded-sm p-3 space-y-2 bg-card">
            <div className="flex items-center gap-2">
              <input value={em.label} onChange={e => updateEmail(i, { label: e.target.value })} placeholder="Label (e.g. General Inquiries)" className="flex-1 px-2 py-1.5 bg-background border border-border rounded-sm text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary" />
              <button onClick={() => setConfig({ ...config, emails: config.emails.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <input value={em.email} onChange={e => updateEmail(i, { email: e.target.value })} placeholder="email@example.com" className="w-full px-2 py-1.5 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            <input value={em.description} onChange={e => updateEmail(i, { description: e.target.value })} placeholder="Description" className="w-full px-2 py-1.5 bg-background border border-border rounded-sm text-sm text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        ))}
      </section>

      <section className="border border-border rounded-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold uppercase tracking-wide flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> Social Links</h2>
          <button onClick={() => setConfig({ ...config, socialLinks: [...config.socialLinks, { platform: "", url: "" }] })} className="flex items-center gap-1 px-2 py-1 text-xs bg-secondary rounded-sm hover:bg-secondary/80">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
        {config.socialLinks.map((link, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={link.platform} onChange={e => updateSocial(i, { platform: e.target.value })} placeholder="Platform name" className="w-40 px-2 py-1.5 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            <input value={link.url} onChange={e => updateSocial(i, { url: e.target.value })} placeholder="https://..." className="flex-1 px-2 py-1.5 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            <button onClick={() => setConfig({ ...config, socialLinks: config.socialLinks.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-red-500">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </section>

      <section className="border border-border rounded-sm p-4 space-y-3">
        <h2 className="font-serif text-lg font-bold uppercase tracking-wide flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Office Location</h2>
        <input value={config.officeLocation} onChange={e => setConfig({ ...config, officeLocation: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
      </section>
    </div>
  );
}
