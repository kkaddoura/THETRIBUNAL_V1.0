import { Router } from "express";
import rateLimit from "express-rate-limit";
import { db, predictionsTable, predictionVotesTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";

const router = Router();

const voteRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many votes from this IP, please try again later" },
});

async function recalculateVotePercentages(predictionId: number, validOptions: string[], isMultiOption: boolean) {
  const allVotes = await db
    .select({ choice: predictionVotesTable.choice, count: count() })
    .from(predictionVotesTable)
    .where(eq(predictionVotesTable.predictionId, predictionId))
    .groupBy(predictionVotesTable.choice);

  const total = allVotes.reduce((sum, v) => sum + v.count, 0);
  const optionResults: Record<string, number> = {};
  for (const opt of validOptions) {
    const voteRow = allVotes.find(v => v.choice === opt);
    optionResults[opt] = total > 0 ? Math.round(((voteRow?.count ?? 0) / total) * 100) : 0;
  }

  const yesPercentage = optionResults["yes"] ?? optionResults[validOptions[0]] ?? 50;
  const noPercentage = isMultiOption
    ? (optionResults[validOptions[1]] ?? 50)
    : (100 - yesPercentage);

  // Persist real-only stats to DB
  await db
    .update(predictionsTable)
    .set({ yesPercentage, noPercentage, totalCount: total, optionResults, updatedAt: new Date() })
    .where(eq(predictionsTable.id, predictionId));

  // Fetch dummy data and return combined results for the API response
  const [prediction] = await db
    .select({
      dummyTotalCount: predictionsTable.dummyTotalCount,
      dummyOptionResults: predictionsTable.dummyOptionResults,
    })
    .from(predictionsTable)
    .where(eq(predictionsTable.id, predictionId));

  const dummyTotal = prediction?.dummyTotalCount ?? 0;
  const dummyResults: Record<string, number> = (prediction?.dummyOptionResults as Record<string, number>) ?? {};

  // Build combined counts (real vote counts + dummy counts)
  const realCounts: Record<string, number> = {};
  for (const opt of validOptions) {
    const voteRow = allVotes.find(v => v.choice === opt);
    realCounts[opt] = voteRow?.count ?? 0;
  }

  const combinedTotal = total + dummyTotal;
  const combinedOptionResults: Record<string, number> = {};
  for (const opt of validOptions) {
    const combinedCount = realCounts[opt] + (dummyResults[opt] ?? 0);
    combinedOptionResults[opt] = combinedTotal > 0 ? Math.round((combinedCount / combinedTotal) * 100) : 0;
  }

  const combinedYes = combinedOptionResults["yes"] ?? combinedOptionResults[validOptions[0]] ?? 50;
  const combinedNo = isMultiOption
    ? (combinedOptionResults[validOptions[1]] ?? 50)
    : (100 - combinedYes);

  return {
    yesPercentage: combinedYes,
    noPercentage: combinedNo,
    optionResults: combinedOptionResults,
    totalCount: combinedTotal,
  };
}

router.post("/:id/vote", voteRateLimit, async (req, res) => {
  try {
    const predictionId = Number(req.params.id);
    const { choice, voterToken } = req.body;

    if (!choice || !voterToken) {
      return res.status(400).json({ error: "choice and voterToken are required" });
    }

    const [prediction] = await db
      .select({
        editorialStatus: predictionsTable.editorialStatus,
        options: predictionsTable.options,
      })
      .from(predictionsTable)
      .where(eq(predictionsTable.id, predictionId));

    if (!prediction) {
      return res.status(404).json({ error: "Prediction not found" });
    }
    if (prediction.editorialStatus !== "approved") {
      return res.status(403).json({ error: "Voting is not open for this prediction" });
    }

    const validOptions = prediction.options || ["yes", "no"];
    if (!validOptions.includes(choice)) {
      return res.status(400).json({ error: `choice must be one of: ${validOptions.join(", ")}` });
    }

    const [existing] = await db
      .select()
      .from(predictionVotesTable)
      .where(
        and(
          eq(predictionVotesTable.predictionId, predictionId),
          eq(predictionVotesTable.voterToken, voterToken)
        )
      );

    let changed = false;
    if (existing) {
      if (existing.choice === choice) {
        return res.status(200).json({ error: "Already voted with this choice", unchanged: true });
      }
      await db
        .update(predictionVotesTable)
        .set({ choice })
        .where(eq(predictionVotesTable.id, existing.id));
      changed = true;
    } else {
      await db.insert(predictionVotesTable).values({
        predictionId,
        choice,
        voterToken,
        country: null,
      });
    }

    const result = await recalculateVotePercentages(predictionId, validOptions, !!prediction.options);

    return res.json({ success: true, changed, ...result });
  } catch (err) {
    console.error("Prediction vote error:", err);
    return res.status(500).json({ error: "Failed to record prediction vote" });
  }
});

router.delete("/:id/vote", voteRateLimit, async (req, res) => {
  try {
    const predictionId = Number(req.params.id);
    const { voterToken } = req.body;

    if (!voterToken) {
      return res.status(400).json({ error: "voterToken is required" });
    }

    const [prediction] = await db
      .select({
        editorialStatus: predictionsTable.editorialStatus,
        options: predictionsTable.options,
      })
      .from(predictionsTable)
      .where(eq(predictionsTable.id, predictionId));

    if (!prediction) {
      return res.status(404).json({ error: "Prediction not found" });
    }

    const validOptions = prediction.options || ["yes", "no"];

    const [existing] = await db
      .select()
      .from(predictionVotesTable)
      .where(
        and(
          eq(predictionVotesTable.predictionId, predictionId),
          eq(predictionVotesTable.voterToken, voterToken)
        )
      );

    if (!existing) {
      const result = await recalculateVotePercentages(predictionId, validOptions, !!prediction.options);
      return res.json({ success: true, ...result });
    }

    await db.delete(predictionVotesTable).where(eq(predictionVotesTable.id, existing.id));

    const result = await recalculateVotePercentages(predictionId, validOptions, !!prediction.options);
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error("Prediction vote delete error:", err);
    return res.status(500).json({ error: "Failed to remove prediction vote" });
  }
});

router.get("/:id/results", async (req, res) => {
  try {
    const predictionId = Number(req.params.id);
    const [prediction] = await db
      .select()
      .from(predictionsTable)
      .where(eq(predictionsTable.id, predictionId));

    if (!prediction) {
      return res.status(404).json({ error: "Prediction not found" });
    }

    // Return combined (real + dummy) percentages
    const dummyTotal = prediction.dummyTotalCount ?? 0;
    const dummyResults: Record<string, number> = (prediction.dummyOptionResults as Record<string, number>) ?? {}; // raw counts
    const realPcts: Record<string, number> = (prediction.optionResults as Record<string, number>) ?? {}; // percentages
    const realTotal = prediction.totalCount ?? 0;
    const allOptions = (prediction.options as string[]) || ["yes", "no"];
    const combinedTotal = realTotal + dummyTotal;

    // Convert real percentages to counts, then add dummy counts
    const combinedCounts: Record<string, number> = {};
    for (const opt of allOptions) {
      const realCount = realTotal > 0 ? Math.round(((realPcts[opt] ?? 0) / 100) * realTotal) : 0;
      combinedCounts[opt] = realCount + (dummyResults[opt] ?? 0);
    }
    const combinedSum = Object.values(combinedCounts).reduce((a, b) => a + b, 0);
    const combinedPcts: Record<string, number> = {};
    for (const opt of allOptions) {
      combinedPcts[opt] = combinedSum > 0 ? Math.round((combinedCounts[opt] / combinedSum) * 100) : 0;
    }

    return res.json({
      yesPercentage: combinedPcts["yes"] ?? combinedPcts[allOptions[0]] ?? prediction.yesPercentage,
      noPercentage: combinedPcts["no"] ?? combinedPcts[allOptions[1]] ?? prediction.noPercentage,
      totalCount: combinedTotal,
      optionResults: combinedPcts,
    });
  } catch (err) {
    console.error("Prediction results error:", err);
    return res.status(500).json({ error: "Failed to fetch prediction results" });
  }
});

export default router;
