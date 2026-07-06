import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { track as trackCms } from "@/lib/analytics";
import { Loader2, Download, Copy, RefreshCw, ImageIcon, ArrowRight } from "lucide-react";

const TEMPLATE_BY_CONTENT_TYPE: Record<string, string[]> = {
  poll: ["poll-result-split"],
  prediction: ["prediction-momentum"],
  voice: ["voice-quote"],
  pulse: ["pulse-stat"],
};

const SIZE_LABELS: Record<string, string> = {
  x_landscape: "X / Twitter",
  ig_square: "Instagram square",
  ig_story: "Instagram story",
  linkedin: "LinkedIn",
};

interface PressKitAsset {
  id: number;
  template: string;
  size: string;
  r2Key: string;
  publicUrl: string;
  captionX: string | null;
  captionIg: string | null;
  captionLi: string | null;
  createdAt: string;
}

export default function PressKitPage() {
  const [, navigate] = useLocation();
  const [contentType, setContentType] = useState<"poll" | "prediction" | "voice" | "pulse">("poll");
  const [contentId, setContentId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [assets, setAssets] = useState<PressKitAsset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activePlatform, setActivePlatform] = useState<"x" | "ig" | "linkedin">("x");
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  useEffect(() => {
    if (contentType && contentId) {
      const id = Number(contentId);
      if (Number.isFinite(id) && id > 0) {
        api.getPressKitAssets(contentType, id).then((r: { assets: PressKitAsset[] }) => {
          setAssets(r.assets ?? []);
        }).catch(() => setAssets([]));
      }
    }
  }, [contentType, contentId]);

  const handleGenerate = async () => {
    setError(null);
    const id = Number(contentId);
    if (!Number.isFinite(id) || id <= 0) {
      setError("Enter a valid numeric content ID.");
      return;
    }
    setGenerating(true);
    try {
      const templates = TEMPLATE_BY_CONTENT_TYPE[contentType];
      const result = await api.generatePressKit({ contentType, contentId: id, templates });
      trackCms("cms_press_kit_generated", { contentType, contentId: id, templates });
      // Reload assets
      const fresh = await api.getPressKitAssets(contentType, id);
      setAssets(fresh.assets ?? []);
      if (!result.generated || result.generated.length === 0) {
        setError("No assets were generated. Check the API logs.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const captionFor = (asset: PressKitAsset): string => {
    if (activePlatform === "x") return asset.captionX ?? "";
    if (activePlatform === "ig") return asset.captionIg ?? "";
    return asset.captionLi ?? "";
  };

  const copyCaption = async (caption: string) => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopyStatus("Copied!");
      setTimeout(() => setCopyStatus(null), 1500);
    } catch {
      setCopyStatus("Couldn't copy — select manually.");
    }
  };

  const regenerateCaptions = async () => {
    if (assets.length === 0) return;
    setGenerating(true);
    try {
      await api.regeneratePressKitCaption(assets[0].id);
      const fresh = await api.getPressKitAssets(contentType, Number(contentId));
      setAssets(fresh.assets ?? []);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Press Kit</h1>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl">
          Generate branded social-media images and AI-written captions from any platform content. Pick the content type, paste the ID, and grab the assets in 30 seconds.
        </p>
      </div>

      <div className="bg-card border border-border p-6 mb-8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr_auto] gap-3">
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value as typeof contentType)}
            className="bg-background border border-border px-3 py-2 text-sm"
          >
            <option value="poll">Poll / Debate</option>
            <option value="prediction">Prediction</option>
            <option value="voice">Voice / Profile</option>
            <option value="pulse">Pulse Topic</option>
          </select>
          <input
            type="number"
            value={contentId}
            onChange={(e) => setContentId(e.target.value)}
            placeholder="Content ID (e.g. 42)"
            className="bg-background border border-border px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !contentId}
            className="bg-primary text-white px-5 py-2 text-sm font-bold uppercase tracking-widest disabled:opacity-50 inline-flex items-center gap-2"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
            {generating ? "Generating…" : "Generate kit"}
          </button>
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
      </div>

      {assets.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-2">
              {(["x", "ig", "linkedin"] as const).map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setActivePlatform(p)}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border ${
                    activePlatform === p ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p === "x" ? "X" : p === "ig" ? "Instagram" : "LinkedIn"}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={regenerateCaptions}
              disabled={generating}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 font-bold uppercase tracking-widest disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`} />
              Regenerate captions
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {assets.map((asset) => {
              const caption = captionFor(asset);
              return (
                <div key={asset.id} className="border border-border bg-card overflow-hidden">
                  <div className="bg-background flex items-center justify-center p-4 border-b border-border" style={{ aspectRatio: asset.size === "ig_story" ? "9/16" : asset.size === "ig_square" ? "1/1" : asset.size === "linkedin" ? "1200/627" : "16/9" }}>
                    {asset.publicUrl ? (
                      <img src={asset.publicUrl} alt={asset.size} className="max-w-full max-h-full" />
                    ) : (
                      <div className="text-muted-foreground text-xs">No preview</div>
                    )}
                  </div>
                  <div className="p-4 space-y-3">
                    <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground">
                      {SIZE_LABELS[asset.size] ?? asset.size}
                    </p>
                    <textarea
                      readOnly
                      value={caption}
                      className="w-full bg-background border border-border px-3 py-2 text-sm leading-relaxed font-mono"
                      rows={5}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => copyCaption(caption)}
                        className="flex-1 bg-foreground text-background px-3 py-2 text-xs font-bold uppercase tracking-widest inline-flex items-center justify-center gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy caption
                      </button>
                      <a
                        href={asset.publicUrl}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 border border-border px-3 py-2 text-xs font-bold uppercase tracking-widest inline-flex items-center justify-center gap-1.5 hover:bg-secondary"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download image
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {copyStatus && (
            <div className="fixed bottom-6 right-6 bg-foreground text-background px-4 py-2 text-xs font-bold uppercase tracking-widest">
              {copyStatus}
            </div>
          )}
        </>
      )}

      {assets.length === 0 && contentId && !generating && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No assets yet — click <strong>Generate kit</strong> to create them.
        </div>
      )}
    </div>
  );
}
