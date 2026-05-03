import { db, pollsTable, pollOptionsTable, predictionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

/**
 * Seed dummy votes for all approved debates and predictions.
 *
 * Debates: 20-70 dummy votes per poll, distributed with realistic ratios.
 * - Binary polls: 55-75% skew toward one side
 * - Multi-option: leading option 35-45%, rest distributed naturally
 *
 * Predictions: 20-70 dummy votes, YES-lean for optimistic topics, NO-lean for skeptical.
 */

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function distributeVotes(total: number, optionCount: number): number[] {
  if (optionCount === 2) {
    // Binary: 55-75% to one side
    const majorityPct = 55 + Math.random() * 20;
    const majority = Math.round(total * majorityPct / 100);
    // Randomly pick which side gets the majority
    if (Math.random() > 0.5) return [majority, total - majority];
    return [total - majority, majority];
  }

  // Multi-option: leading option 35-45%, rest distributed
  const distribution: number[] = [];
  let remaining = total;

  for (let i = 0; i < optionCount; i++) {
    if (i === optionCount - 1) {
      distribution.push(Math.max(remaining, 0));
    } else if (i === 0) {
      // Leading option: 35-45%
      const share = Math.round(total * (35 + Math.random() * 10) / 100);
      distribution.push(share);
      remaining -= share;
    } else {
      // Other options: random share of remaining
      const maxShare = Math.round(remaining * 0.6);
      const share = randomInt(1, Math.max(1, maxShare));
      distribution.push(share);
      remaining -= share;
    }
  }

  // Shuffle to avoid the leading option always being first
  for (let i = distribution.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [distribution[i], distribution[j]] = [distribution[j], distribution[i]];
  }

  return distribution;
}

async function seedDummyVotes() {
  console.log("Seeding dummy votes...\n");

  // 1. Seed debate dummy votes
  const approvedPolls = await db
    .select({ id: pollsTable.id, question: pollsTable.question })
    .from(pollsTable)
    .where(eq(pollsTable.editorialStatus, "approved"));

  console.log(`Found ${approvedPolls.length} approved debates`);

  let debateCount = 0;
  for (const poll of approvedPolls) {
    const options = await db
      .select()
      .from(pollOptionsTable)
      .where(eq(pollOptionsTable.pollId, poll.id));

    if (options.length === 0) continue;

    const totalDummy = randomInt(20, 70);
    const distribution = distributeVotes(totalDummy, options.length);

    for (let i = 0; i < options.length; i++) {
      await db
        .update(pollOptionsTable)
        .set({ dummyVoteCount: distribution[i] })
        .where(eq(pollOptionsTable.id, options[i].id));
    }

    debateCount++;
  }

  console.log(`Seeded dummy votes for ${debateCount} debates\n`);

  // 2. Seed prediction dummy votes
  const approvedPredictions = await db
    .select()
    .from(predictionsTable)
    .where(eq(predictionsTable.editorialStatus, "approved"));

  console.log(`Found ${approvedPredictions.length} approved predictions`);

  let predCount = 0;
  for (const pred of approvedPredictions) {
    const opts = pred.options || ["yes", "no"];
    const totalDummy = randomInt(20, 70);
    const distribution = distributeVotes(totalDummy, opts.length);

    const dummyOptionResults: Record<string, number> = {};
    for (let i = 0; i < opts.length; i++) {
      dummyOptionResults[opts[i]] = distribution[i];
    }

    await db
      .update(predictionsTable)
      .set({
        dummyTotalCount: totalDummy,
        dummyOptionResults: dummyOptionResults,
      })
      .where(eq(predictionsTable.id, pred.id));

    predCount++;
  }

  console.log(`Seeded dummy votes for ${predCount} predictions\n`);
  console.log("Done! Dummy votes seeded successfully.");
  process.exit(0);
}

seedDummyVotes().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
