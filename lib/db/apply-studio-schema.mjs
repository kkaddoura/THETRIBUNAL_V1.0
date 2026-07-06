// Surgical schema patch for Studio v2 — adds 8 columns to press_kit_assets
// and extends the unique index to include slide_index. All additive,
// idempotent (IF NOT EXISTS), and reversible.

import pg from "pg"

const { Pool } = pg

const url = process.env.DATABASE_URL
if (!url) {
  console.error("DATABASE_URL not set")
  process.exit(1)
}

const pool = new Pool({ connectionString: url })

const STATEMENTS = [
  `ALTER TABLE press_kit_assets ADD COLUMN IF NOT EXISTS template_family TEXT NOT NULL DEFAULT 'item'`,
  `ALTER TABLE press_kit_assets ADD COLUMN IF NOT EXISTS template_style TEXT NOT NULL DEFAULT 'default'`,
  `ALTER TABLE press_kit_assets ADD COLUMN IF NOT EXISTS slide_index INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE press_kit_assets ADD COLUMN IF NOT EXISTS slide_count INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE press_kit_assets ADD COLUMN IF NOT EXISTS caption_variants JSONB`,
  `ALTER TABLE press_kit_assets ADD COLUMN IF NOT EXISTS chosen_caption_x TEXT`,
  `ALTER TABLE press_kit_assets ADD COLUMN IF NOT EXISTS chosen_caption_ig TEXT`,
  `ALTER TABLE press_kit_assets ADD COLUMN IF NOT EXISTS chosen_caption_li TEXT`,
  `ALTER TABLE press_kit_assets ADD COLUMN IF NOT EXISTS tone_hint TEXT`,
  // Drop the old 4-column unique index (only if it doesn't already cover slide_index)
  `DROP INDEX IF EXISTS press_kit_unique`,
  `CREATE UNIQUE INDEX IF NOT EXISTS press_kit_unique ON press_kit_assets (content_type, content_id, template, size, slide_index)`,
]

const run = async () => {
  for (const sql of STATEMENTS) {
    process.stdout.write(`> ${sql.slice(0, 80)}${sql.length > 80 ? "…" : ""}\n`)
    await pool.query(sql)
  }
  console.log("\n✓ press_kit_assets patched for Studio v2")
  await pool.end()
}

run().catch((err) => {
  console.error("✗ patch failed:", err.message)
  pool.end().finally(() => process.exit(1))
})
