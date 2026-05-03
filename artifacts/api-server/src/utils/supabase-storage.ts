import { createClient } from "@supabase/supabase-js";

const { DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

// Derive Supabase URL from DATABASE_URL if not explicitly set
function deriveSupabaseUrl(): string | undefined {
  if (SUPABASE_URL) return SUPABASE_URL;
  if (!DATABASE_URL) return undefined;
  const match = DATABASE_URL.match(/postgres\.([a-z0-9]+)/);
  if (match) return `https://${match[1]}.supabase.co`;
  return undefined;
}

const supabaseUrl = deriveSupabaseUrl();

export const isSupabaseStorageAvailable = !!(supabaseUrl && SUPABASE_SERVICE_ROLE_KEY);

export const supabaseAdmin = isSupabaseStorageAvailable
  ? createClient(supabaseUrl!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

export const STORAGE_BUCKET = "voices";

export function getPublicUrl(filePath: string): string {
  if (!supabaseAdmin) throw new Error("Supabase storage not configured");
  const { data } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}
