/**
 * Content curation script.
 *
 * Archives low-quality AI-generated debates and predictions to bring
 * counts down to ~100 quality items per pillar.
 *
 * Priorities (in order — never archived):
 *   1. Featured items (isFeatured = true)
 *   2. Editor's picks (isEditorsPick = true on polls)
 *   3. Multi-option polls (more than 2 options — these are more editorially crafted)
 *   4. Oldest items (assumption: older = manually curated, newer = AI-generated)
 *
 * Archives:
 *   - Binary polls (exactly 2 options) that are newer and not featured/picks
 *   - Predictions that are newer and not featured
 *
 * Modes:
 *   --dry-run       : prints counts only, no changes (default)
 *   --apply         : actually archives the items
 *   --target=100    : target keep count per pillar (default 100)
 */

import { db, pollsTable, pollOptionsTable, predictionsTable } from "@workspace/db";
import { eq, inArray, asc } from "drizzle-orm";

interface CandidatePoll {
  id: number;
  question: string;
  createdAt: Date;
  isFeatured: boolean;
  isEditorsPick: boolean;
  optionCount: number;
}

interface CandidatePrediction {
  id: number;
  question: string;
  createdAt: Date;
  isFeatured: boolean;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const targetArg = args.find((a) => a.startsWith("--target="));
  const target = targetArg ? parseInt(targetArg.split("=")[1], 10) : 100;
  return { apply, target };
}

async function curateDebates(target: number, apply: boolean) {
  console.log("\n── DEBATES ─────────────────────────────────────────");

  const polls = await db
    .select({
      id: pollsTable.id,
      question: pollsTable.question,
      createdAt: pollsTable.createdAt,
      isFeatured: pollsTable.isFeatured,
      isEditorsPick: pollsTable.isEditorsPick,
    })
    .from(pollsTable)
    .where(eq(pollsTable.editorialStatus, "approved"))
    .orderBy(asc(pollsTable.createdAt));

  // Count options per poll
  const allOptions = await db.select().from(pollOptionsTable);
  const optionCountByPoll = new Map<number, number>();
  for (const opt of allOptions) {
    optionCountByPoll.set(opt.pollId, (optionCountByPoll.get(opt.pollId) ?? 0) + 1);
  }

  const candidates: CandidatePoll[] = polls.map((p) => ({
    id: p.id,
    question: p.question,
    createdAt: p.createdAt,
    isFeatured: p.isFeatured,
    isEditorsPick: p.isEditorsPick,
    optionCount: optionCountByPoll.get(p.id) ?? 0,
  }));

  console.log(`Current approved debates: ${candidates.length}`);
  console.log(`Target to keep: ${target}`);

  const featured = candidates.filter((c) => c.isFeatured);
  const editorsPicks = candidates.filter((c) => c.isEditorsPick && !c.isFeatured);
  const multiOption = candidates.filter(
    (c) => !c.isFeatured && !c.isEditorsPick && c.optionCount > 2
  );
  const binary = candidates.filter(
    (c) => !c.isFeatured && !c.isEditorsPick && c.optionCount === 2
  );
  const empty = candidates.filter(
    (c) => !c.isFeatured && !c.isEditorsPick && c.optionCount < 2
  );

  console.log(`  • Featured: ${featured.length} (keep all)`);
  console.log(`  • Editor's picks: ${editorsPicks.length} (keep all)`);
  console.log(`  • Multi-option (3+ options): ${multiOption.length} (keep oldest)`);
  console.log(`  • Binary (2 options): ${binary.length} (keep oldest, archive newest)`);
  console.log(`  • Empty/broken (<2 options): ${empty.length} (archive all)`);

  // Keep strategy: keep all featured + editor's picks, then fill up with oldest multi-option, then oldest binary
  const keepIds = new Set<number>();
  for (const c of featured) keepIds.add(c.id);
  for (const c of editorsPicks) keepIds.add(c.id);

  let remaining = target - keepIds.size;
  if (remaining > 0) {
    // multi-option already sorted by createdAt asc
    for (const c of multiOption) {
      if (remaining <= 0) break;
      keepIds.add(c.id);
      remaining--;
    }
  }
  if (remaining > 0) {
    // binary sorted by createdAt asc — keep oldest
    for (const c of binary) {
      if (remaining <= 0) break;
      keepIds.add(c.id);
      remaining--;
    }
  }

  const archiveIds = candidates.filter((c) => !keepIds.has(c.id)).map((c) => c.id);

  console.log(`\nPlan: keep ${keepIds.size}, archive ${archiveIds.length}`);

  if (apply && archiveIds.length > 0) {
    // Chunk to avoid huge IN clauses
    const CHUNK = 100;
    let archived = 0;
    for (let i = 0; i < archiveIds.length; i += CHUNK) {
      const chunk = archiveIds.slice(i, i + CHUNK);
      await db
        .update(pollsTable)
        .set({ editorialStatus: "archived" })
        .where(inArray(pollsTable.id, chunk));
      archived += chunk.length;
      console.log(`  archived ${archived}/${archiveIds.length}...`);
    }
    console.log(`\n✓ Archived ${archived} debates`);
  } else if (!apply) {
    console.log("\n(dry-run — no changes made. Re-run with --apply to execute)");
  }
}

async function curatePredictions(target: number, apply: boolean) {
  console.log("\n── PREDICTIONS ─────────────────────────────────────────");

  const preds = await db
    .select({
      id: predictionsTable.id,
      question: predictionsTable.question,
      createdAt: predictionsTable.createdAt,
      isFeatured: predictionsTable.isFeatured,
    })
    .from(predictionsTable)
    .where(eq(predictionsTable.editorialStatus, "approved"))
    .orderBy(asc(predictionsTable.createdAt));

  const candidates: CandidatePrediction[] = preds;
  console.log(`Current approved predictions: ${candidates.length}`);
  console.log(`Target to keep: ${target}`);

  const featured = candidates.filter((c) => c.isFeatured);
  const nonFeatured = candidates.filter((c) => !c.isFeatured);

  console.log(`  • Featured: ${featured.length} (keep all)`);
  console.log(`  • Non-featured: ${nonFeatured.length} (keep oldest, archive newest)`);

  const keepIds = new Set<number>();
  for (const c of featured) keepIds.add(c.id);

  let remaining = target - keepIds.size;
  // Sorted oldest first — keep oldest remaining count
  for (const c of nonFeatured) {
    if (remaining <= 0) break;
    keepIds.add(c.id);
    remaining--;
  }

  const archiveIds = candidates.filter((c) => !keepIds.has(c.id)).map((c) => c.id);

  console.log(`\nPlan: keep ${keepIds.size}, archive ${archiveIds.length}`);

  if (apply && archiveIds.length > 0) {
    const CHUNK = 100;
    let archived = 0;
    for (let i = 0; i < archiveIds.length; i += CHUNK) {
      const chunk = archiveIds.slice(i, i + CHUNK);
      await db
        .update(predictionsTable)
        .set({ editorialStatus: "archived" })
        .where(inArray(predictionsTable.id, chunk));
      archived += chunk.length;
      console.log(`  archived ${archived}/${archiveIds.length}...`);
    }
    console.log(`\n✓ Archived ${archived} predictions`);
  } else if (!apply) {
    console.log("\n(dry-run — no changes made. Re-run with --apply to execute)");
  }
}

async function main() {
  const { apply, target } = parseArgs();
  console.log(`Content curation script`);
  console.log(`Mode: ${apply ? "APPLY (will archive)" : "DRY RUN"}`);
  console.log(`Target per pillar: ${target}`);

  await curateDebates(target, apply);
  await curatePredictions(target, apply);

  console.log("\nDone.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Curation error:", err);
  process.exit(1);
});
