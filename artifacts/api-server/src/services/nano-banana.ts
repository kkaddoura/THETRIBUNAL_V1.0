/**
 * Generates editorial B&W portraits for Voice profiles via Google AI Studio's
 * "Nano Banana" image model (gemini-2.5-flash-image, GA).
 *
 * Style is locked to match the existing Voices section aesthetic: monochrome
 * editorial portrait, soft natural lighting, head-and-shoulders framing,
 * environmental backdrop (not flat white), with a halftone screen-print overlay.
 */

import { supabaseAdmin, isSupabaseStorageAvailable, STORAGE_BUCKET, getPublicUrl } from "../utils/supabase-storage";
import type { CaptionInput } from "../lib/press-kit/index.js";

const MODEL = "gemini-2.5-flash-image";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export interface VoiceSubject {
  id: number;
  name: string;
  role?: string | null;
  company?: string | null;
  blurb?: string | null;
  quote?: string | null;
}

export interface PortraitGenerationResult {
  url: string;
  storagePath: string;
  bytes: number;
  elapsedMs: number;
}

export const isNanoBananaAvailable = !!process.env.GEMINI_API_KEY;

function buildPrompt(voice: VoiceSubject, variantSeed: number): string {
  const subjectLines = [
    `Subject: ${voice.name}, ${voice.role ?? "thinker"}${voice.company ? `, ${voice.company}` : ""}.`,
    voice.blurb ? `Context: ${voice.blurb}.` : null,
    voice.quote ? `They are known for saying: "${voice.quote.slice(0, 240)}".` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const variantAngles = [
    "looking directly at the camera, neutral confident expression, slight smile",
    "three-quarter turn, contemplative gaze off-camera, candid editorial feel",
    "head slightly tilted, mid-thought expression, warm but serious",
  ];
  const angle = variantAngles[variantSeed % variantAngles.length];

  return [
    `Generate an editorial black-and-white portrait of a real-looking adult who could plausibly be ${voice.name}.`,
    `${angle}. Head-and-shoulders / chest-up framing, centered composition.`,
    "Style: high-contrast monochrome, true grayscale, no color tint.",
    "Lighting: soft natural light from the side, gentle shadows, no studio flash.",
    "Background: real environmental context (architectural detail, foliage, urban texture, library, workshop, or street) — NEVER a flat seamless backdrop.",
    "Treatment: subtle halftone screen-print pattern overlay across the entire image, giving it a printed-zine editorial newspaper texture. The halftone dots should be visible but not overwhelm the subject.",
    "Aspect ratio: square 1:1.",
    "The subject should look natural and real, not airbrushed or hyper-stylized. Avoid: neon colors, fantasy elements, exaggerated cartoonish features, oversaturated effects, watermarks, text on the image.",
    subjectLines,
  ].join(" ");
}

interface GeminiContentPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
  // Newer SDKs use snake_case
  inline_data?: { mime_type: string; data: string };
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: GeminiContentPart[] } }>;
  promptFeedback?: { blockReason?: string };
}

function extractImagePart(parts: GeminiContentPart[]): { mimeType: string; data: string } | null {
  for (const p of parts) {
    if (p.inlineData?.data) return { mimeType: p.inlineData.mimeType, data: p.inlineData.data };
    if (p.inline_data?.data) return { mimeType: p.inline_data.mime_type, data: p.inline_data.data };
  }
  return null;
}

/**
 * Generate one portrait variant for a voice and persist it to Supabase storage
 * under voices/ai-portraits/<voiceId>/<sessionId>-<index>.png.
 *
 * Throws on configuration or upstream errors so the caller can decide whether
 * to surface an SSE error event.
 */
export async function generatePortraitVariant(
  voice: VoiceSubject,
  sessionId: string,
  variantIndex: number,
): Promise<PortraitGenerationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("nano_banana_not_configured");
  if (!isSupabaseStorageAvailable || !supabaseAdmin) throw new Error("supabase_storage_not_configured");

  const prompt = buildPrompt(voice, variantIndex);
  const startedAt = Date.now();

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`gemini_http_${res.status}: ${errText.slice(0, 240)}`);
  }

  const data = (await res.json()) as GeminiResponse;
  if (data.promptFeedback?.blockReason) {
    throw new Error(`gemini_blocked_${data.promptFeedback.blockReason}`);
  }

  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const image = extractImagePart(parts);
  if (!image) throw new Error("gemini_no_image_returned");

  const buffer = Buffer.from(image.data, "base64");
  const storagePath = `ai-portraits/${voice.id}/${sessionId}-${variantIndex}.png`;

  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: image.mimeType || "image/png",
      upsert: true,
    });
  if (error) throw new Error(`supabase_upload_failed: ${error.message}`);

  return {
    url: getPublicUrl(storagePath),
    storagePath,
    bytes: buffer.byteLength,
    elapsedMs: Date.now() - startedAt,
  };
}

export async function deleteUnchosenPortraits(storagePaths: string[]): Promise<void> {
  if (!supabaseAdmin || storagePaths.length === 0) return;
  await supabaseAdmin.storage.from(STORAGE_BUCKET).remove(storagePaths);
}

// ── Generalized atom imagery (Compose v2) ─────────────────────────
//
// Every atom type renders in the same locked brand treatment so a mixed
// carousel still looks like one publication. Only the *subject* changes.

const LOCKED_STYLE = [
  "Style: high-contrast editorial monochrome, true grayscale, absolutely no color.",
  "Lighting: soft natural light, gentle directional shadows, no studio flash.",
  "Treatment: a subtle halftone screen-print pattern overlaid across the whole frame, giving it a printed-zine / newspaper texture — visible but not overwhelming the subject.",
  "Composition: strong, editorial, magazine-cover quality. Real and grounded, never airbrushed, never fantastical.",
  "Aspect ratio: square 1:1.",
  "Hard avoid: color, neon, watermarks, any text or lettering rendered in the image, cartoonish exaggeration, oversaturated effects, surreal artifacts.",
].join(" ");

function clamp(s: string | undefined, n: number): string {
  if (!s) return "";
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

/** Map a CaptionInput to a single-sentence photographic subject brief. */
function buildAtomSubject(caption: CaptionInput): string {
  switch (caption.contentType) {
    case "voice":
      return `An editorial black-and-white portrait of a real-looking person — ${clamp(caption.voicesName, 80) || "a MENA changemaker"} — head-and-shoulders, centered, set against real environmental context (architecture, foliage, street, workshop), never a flat backdrop.`;
    case "prediction":
      return `A photographic scene that illustrates this future prediction about the Middle East: "${clamp(caption.question, 200)}".${caption.category ? ` Context: ${clamp(caption.category, 60)}.` : ""} Depict the world if it comes true — documentary, grounded, no text.`;
    case "poll":
      return `A photographic scene that captures the tension of this debate question from the Middle East: "${clamp(caption.question, 200)}". Show the human stakes, documentary style, no text.`;
    case "pulse":
      return `A photographic scene illustrating this trend in the Middle East: "${clamp(caption.question || caption.stat, 160)}".${caption.stat ? ` Signal: ${clamp(caption.stat, 60)}.` : ""} Editorial, grounded, no charts, no text.`;
    case "about-pillar":
      return `A symbolic editorial photograph representing the idea of "${clamp(caption.pillarTitle, 80)}"${caption.pillarBody ? ` — ${clamp(caption.pillarBody, 140)}` : ""}. Conceptual but real, no text.`;
    case "about-founder":
      return `An editorial black-and-white environmental portrait of a thoughtful founder figure in a Middle Eastern setting, reflective mood, no text. Context: ${clamp(caption.founderText, 160)}.`;
    default:
      return `An editorial black-and-white photographic scene evoking the Middle East — grounded, documentary, no text.`;
  }
}

async function callGeminiImage(prompt: string, apiKey: string): Promise<{ mimeType: string; data: string }> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`gemini_http_${res.status}: ${errText.slice(0, 240)}`);
  }
  const data = (await res.json()) as GeminiResponse;
  if (data.promptFeedback?.blockReason) {
    throw new Error(`gemini_blocked_${data.promptFeedback.blockReason}`);
  }
  const image = extractImagePart(data.candidates?.[0]?.content?.parts ?? []);
  if (!image) throw new Error("gemini_no_image_returned");
  return image;
}

export interface AtomImageResult {
  url: string;
  storagePath: string;
  elapsedMs: number;
}

/**
 * Generate one brand-styled image for an atom and persist it under
 * voices/ai-kits/<kitId>/<slotIndex>.png. Returns the public URL the
 * aiBackgroundCard template will full-bleed.
 */
export async function generateAtomImageToStorage(
  caption: CaptionInput,
  kitId: string,
  slotIndex: number,
): Promise<AtomImageResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("nano_banana_not_configured");
  if (!isSupabaseStorageAvailable || !supabaseAdmin) throw new Error("supabase_storage_not_configured");

  const prompt = `${buildAtomSubject(caption)} ${LOCKED_STYLE}`;
  const startedAt = Date.now();
  const image = await callGeminiImage(prompt, apiKey);
  const buffer = Buffer.from(image.data, "base64");
  const storagePath = `ai-kits/${kitId}/${slotIndex}.png`;

  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, { contentType: image.mimeType || "image/png", upsert: true });
  if (error) throw new Error(`supabase_upload_failed: ${error.message}`);

  return { url: getPublicUrl(storagePath), storagePath, elapsedMs: Date.now() - startedAt };
}
