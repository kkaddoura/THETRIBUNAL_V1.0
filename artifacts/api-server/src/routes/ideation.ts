import { Router, Request, Response, NextFunction } from "express";
import {
  db,
  ideationSessionsTable,
  ideationIdeasTable,
  ideationRejectionLogTable,
  ideationExclusionListTable,
  ideationPromptTemplatesTable,
  pollsTable,
  pollOptionsTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { cmsSessions, mockPredictions, incrementPredictionId } from "./cms";
import {
  runResearch,
  runGeneration,
  runSafetyReview,
  runRefinement,
  DEFAULT_PROMPTS,
} from "../services/ideation-ai";

const router = Router();

function requireCmsAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers["x-cms-token"] as string;
  if (!token || !cmsSessions.has(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const session = cmsSessions.get(token)!;
  if (Date.now() - session.createdAt > 24 * 60 * 60 * 1000) {
    cmsSessions.delete(token);
    res.status(401).json({ error: "Session expired" });
    return;
  }
  next();
}

router.get("/cms/ideation/prompt-templates", requireCmsAuth, async (_req, res) => {
  try {
    const templates = await db.select().from(ideationPromptTemplatesTable);

    const result: Record<string, { id?: number; promptText: string; defaultPromptText: string }> = {};
    for (const pillar of ["debates", "predictions", "pulse"]) {
      const existing = templates.find(t => t.pillarType === pillar);
      if (existing) {
        result[pillar] = { id: existing.id, promptText: existing.promptText, defaultPromptText: existing.defaultPromptText };
      } else {
        result[pillar] = { promptText: DEFAULT_PROMPTS[pillar], defaultPromptText: DEFAULT_PROMPTS[pillar] };
      }
    }

    return res.json(result);
  } catch (err) {
    console.error("Prompt templates error:", err);
    return res.status(500).json({ error: "Failed to fetch prompt templates" });
  }
});

router.put("/cms/ideation/prompt-templates/:pillar", requireCmsAuth, async (req, res) => {
  try {
    const pillar = String(req.params.pillar);
    const { promptText } = req.body;

    if (!["debates", "predictions", "pulse"].includes(pillar)) {
      return res.status(400).json({ error: "Invalid pillar type" });
    }

    const [existing] = await db.select().from(ideationPromptTemplatesTable).where(eq(ideationPromptTemplatesTable.pillarType, pillar));

    if (existing) {
      await db.update(ideationPromptTemplatesTable)
        .set({ promptText, updatedAt: new Date() })
        .where(eq(ideationPromptTemplatesTable.pillarType, pillar));
    } else {
      await db.insert(ideationPromptTemplatesTable).values({
        pillarType: pillar,
        promptText,
        defaultPromptText: DEFAULT_PROMPTS[pillar as keyof typeof DEFAULT_PROMPTS],
      });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Update prompt template error:", err);
    return res.status(500).json({ error: "Failed to update prompt template" });
  }
});

router.post("/cms/ideation/exclusion-list/bulk", requireCmsAuth, async (req, res) => {
  try {
    const { phrases } = req.body as { phrases: string[] };
    if (!phrases || !Array.isArray(phrases)) return res.status(400).json({ error: "phrases array required" });

    const existing = await db.select().from(ideationExclusionListTable);
    const existingPhrases = new Set(existing.map(e => e.phrase.toLowerCase()));

    const newPhrases = phrases.filter(p => p.trim() && !existingPhrases.has(p.trim().toLowerCase()));
    const inserted = [];
    for (const phrase of newPhrases) {
      try {
        const [item] = await db.insert(ideationExclusionListTable).values({ phrase: phrase.trim() }).returning();
        inserted.push(item);
      } catch { /* skip duplicates */ }
    }

    return res.json({ inserted, skipped: phrases.length - inserted.length });
  } catch (err) {
    console.error("Bulk exclusion error:", err);
    return res.status(500).json({ error: "Failed to bulk add exclusions" });
  }
});

router.get("/cms/ideation/exclusion-list", requireCmsAuth, async (_req, res) => {
  try {
    const items = await db.select().from(ideationExclusionListTable).orderBy(desc(ideationExclusionListTable.createdAt));
    return res.json({ items });
  } catch (err) {
    console.error("Exclusion list error:", err);
    return res.status(500).json({ error: "Failed to fetch exclusion list" });
  }
});

router.post("/cms/ideation/exclusion-list", requireCmsAuth, async (req, res) => {
  try {
    const { phrase } = req.body;
    if (!phrase?.trim()) {
      return res.status(400).json({ error: "Phrase is required" });
    }

    const [item] = await db.insert(ideationExclusionListTable)
      .values({ phrase: phrase.trim() })
      .returning();

    return res.json(item);
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(409).json({ error: "Phrase already exists" });
    }
    console.error("Add exclusion error:", err);
    return res.status(500).json({ error: "Failed to add exclusion" });
  }
});

router.delete("/cms/ideation/exclusion-list/:id", requireCmsAuth, async (req, res) => {
  try {
    await db.delete(ideationExclusionListTable).where(eq(ideationExclusionListTable.id, Number(req.params.id)));
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete exclusion error:", err);
    return res.status(500).json({ error: "Failed to delete exclusion" });
  }
});

router.post("/cms/ideation/sessions", requireCmsAuth, async (req, res) => {
  try {
    const { mode, pillarType, config } = req.body;

    const [session] = await db.insert(ideationSessionsTable).values({
      mode: mode || "explore",
      pillarType: pillarType || null,
      configSnapshot: config,
      status: "researching",
    }).returning();

    return res.json(session);
  } catch (err) {
    console.error("Create session error:", err);
    return res.status(500).json({ error: "Failed to create session" });
  }
});

router.get("/cms/ideation/sessions", requireCmsAuth, async (_req, res) => {
  try {
    const sessions = await db.select().from(ideationSessionsTable).orderBy(desc(ideationSessionsTable.createdAt));
    return res.json({ items: sessions });
  } catch (err) {
    console.error("Sessions list error:", err);
    return res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

router.get("/cms/ideation/sessions/:id", requireCmsAuth, async (req, res) => {
  try {
    const [session] = await db.select().from(ideationSessionsTable).where(eq(ideationSessionsTable.id, Number(req.params.id)));
    if (!session) return res.status(404).json({ error: "Session not found" });

    const ideas = await db.select().from(ideationIdeasTable).where(eq(ideationIdeasTable.sessionId, session.id)).orderBy(ideationIdeasTable.id);

    return res.json({ ...session, ideas });
  } catch (err) {
    console.error("Session detail error:", err);
    return res.status(500).json({ error: "Failed to fetch session" });
  }
});

router.post("/cms/ideation/sessions/:id/research", requireCmsAuth, async (req, res) => {
  try {
    const sessionId = Number(req.params.id);
    const [session] = await db.select().from(ideationSessionsTable).where(eq(ideationSessionsTable.id, sessionId));
    if (!session) return res.status(404).json({ error: "Session not found" });

    const config = session.configSnapshot as { categories: string[]; tags: string[]; regions: string[] };
    const researchData = await runResearch({
      categories: config.categories || [],
      tags: config.tags || [],
      regions: config.regions || [],
    });

    await db.update(ideationSessionsTable)
      .set({ researchData: researchData as unknown as Record<string, unknown>, status: "researched" })
      .where(eq(ideationSessionsTable.id, sessionId));

    return res.json({ researchData });
  } catch (err) {
    console.error("Research error:", err);
    return res.status(500).json({ error: "Research step failed" });
  }
});

router.post("/cms/ideation/sessions/:id/generate", requireCmsAuth, async (req, res) => {
  try {
    const sessionId = Number(req.params.id);
    const [session] = await db.select().from(ideationSessionsTable).where(eq(ideationSessionsTable.id, sessionId));
    if (!session) return res.status(404).json({ error: "Session not found" });

    const config = session.configSnapshot as {
      batchSize: number;
      pillarCounts?: { debates: number; predictions: number; pulse: number };
      exclusionList: string[];
      guardrails?: string[];
      categories: string[];
      tags: string[];
      regions: string[];
    };

    const templates = await db.select().from(ideationPromptTemplatesTable);
    const pillarType = session.pillarType || undefined;

    const getPromptForPillar = (p: string) => {
      const saved = templates.find(t => t.pillarType === p);
      return saved?.promptText || DEFAULT_PROMPTS[p] || DEFAULT_PROMPTS.debates;
    };

    let promptTemplate: string;
    if (pillarType) {
      promptTemplate = getPromptForPillar(pillarType);
    } else {
      promptTemplate = [
        "You are a multi-pillar content ideation engine for 'The Middle East Hustle'.",
        "",
        "When generating DEBATES ideas, follow this guidance:",
        getPromptForPillar("debates"),
        "",
        "When generating PREDICTIONS ideas, follow this guidance:",
        getPromptForPillar("predictions"),
        "",
        "When generating PULSE ideas, follow this guidance:",
        getPromptForPillar("pulse"),
      ].join("\n");
    }

    const exclusionItems = await db.select().from(ideationExclusionListTable);
    const exclusionList = [
      ...(config.exclusionList || []),
      ...exclusionItems.map(e => e.phrase),
    ];

    const ideas = await runGeneration({
      pillarType,
      mode: session.mode,
      batchSize: config.batchSize || 15,
      pillarCounts: config.pillarCounts,
      promptTemplate,
      exclusionList,
      guardrails: config.guardrails || [],
      categories: config.categories || [],
      tags: config.tags || [],
      researchData: (session.researchData as Record<string, unknown>) || { topics: [], dataPoints: [], trends: [] },
    });

    const inserted = [];
    for (const idea of ideas) {
      const [row] = await db.insert(ideationIdeasTable).values({
        sessionId,
        pillarType: idea.pillarType,
        title: idea.title,
        content: idea.content,
        status: "generated",
      }).returning();
      inserted.push(row);
    }

    await db.update(ideationSessionsTable)
      .set({ status: "generated", generatedCount: inserted.length })
      .where(eq(ideationSessionsTable.id, sessionId));

    return res.json({ ideas: inserted });
  } catch (err) {
    console.error("Generation error:", err);
    return res.status(500).json({ error: "Generation step failed" });
  }
});

router.post("/cms/ideation/sessions/:id/safety-review", requireCmsAuth, async (req, res) => {
  try {
    const sessionId = Number(req.params.id);
    const ideas = await db.select().from(ideationIdeasTable)
      .where(eq(ideationIdeasTable.sessionId, sessionId));

    const ideaInputs = ideas.map(i => ({
      pillarType: i.pillarType,
      title: i.title,
      content: i.content as Record<string, unknown>,
    }));

    const reviews = await runSafetyReview(ideaInputs);

    for (let idx = 0; idx < ideas.length; idx++) {
      const review = reviews.get(idx);
      if (review) {
        await db.update(ideationIdeasTable)
          .set({ riskFlags: review, status: "reviewed" })
          .where(eq(ideationIdeasTable.id, ideas[idx].id));
      }
    }

    await db.update(ideationSessionsTable)
      .set({ status: "reviewed" })
      .where(eq(ideationSessionsTable.id, sessionId));

    const updated = await db.select().from(ideationIdeasTable)
      .where(eq(ideationIdeasTable.sessionId, sessionId));

    return res.json({ ideas: updated });
  } catch (err) {
    console.error("Safety review error:", err);
    return res.status(500).json({ error: "Safety review step failed" });
  }
});

router.post("/cms/ideation/ideas/:id/cherry-pick", requireCmsAuth, async (req, res) => {
  try {
    const ideaId = Number(req.params.id);
    if (!ideaId || ideaId <= 0) return res.status(400).json({ error: "Invalid idea ID" });

    const { action, rejectionTag } = req.body;
    if (!action || !["accept", "reject"].includes(action)) {
      return res.status(400).json({ error: "Action must be 'accept' or 'reject'" });
    }

    if (action === "accept") {
      const [idea] = await db.select().from(ideationIdeasTable).where(eq(ideationIdeasTable.id, ideaId));
      if (!idea) return res.status(404).json({ error: "Idea not found" });

      await db.update(ideationIdeasTable)
        .set({ status: "accepted" })
        .where(eq(ideationIdeasTable.id, ideaId));

      const [session] = await db.select().from(ideationSessionsTable).where(eq(ideationSessionsTable.id, idea.sessionId));
      if (session) {
        await db.update(ideationSessionsTable)
          .set({ acceptedCount: (session.acceptedCount || 0) + 1 })
          .where(eq(ideationSessionsTable.id, session.id));
      }
    } else if (action === "reject") {
      const [idea] = await db.select().from(ideationIdeasTable).where(eq(ideationIdeasTable.id, ideaId));
      if (!idea) return res.status(404).json({ error: "Idea not found" });

      await db.update(ideationIdeasTable)
        .set({ status: "rejected" })
        .where(eq(ideationIdeasTable.id, ideaId));

      await db.insert(ideationRejectionLogTable).values({
        ideaId: idea.id,
        sessionId: idea.sessionId,
        ideaTitle: idea.title,
        pillarType: idea.pillarType,
        rejectionTag: rejectionTag || "generic",
      });

      const [session] = await db.select().from(ideationSessionsTable).where(eq(ideationSessionsTable.id, idea.sessionId));
      if (session) {
        await db.update(ideationSessionsTable)
          .set({ rejectedCount: (session.rejectedCount || 0) + 1 })
          .where(eq(ideationSessionsTable.id, session.id));
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Cherry-pick error:", err);
    return res.status(500).json({ error: "Cherry-pick failed" });
  }
});

router.post("/cms/ideation/ideas/:id/refine", requireCmsAuth, async (req, res) => {
  try {
    const ideaId = Number(req.params.id);
    const [idea] = await db.select().from(ideationIdeasTable).where(eq(ideationIdeasTable.id, ideaId));
    if (!idea) return res.status(404).json({ error: "Idea not found" });

    const refined = await runRefinement({
      pillarType: idea.pillarType,
      idea: {
        pillarType: idea.pillarType,
        title: idea.title,
        content: idea.content as Record<string, unknown>,
      },
    });

    await db.update(ideationIdeasTable)
      .set({ refinedContent: refined, status: "refined" })
      .where(eq(ideationIdeasTable.id, ideaId));

    return res.json({ refinedContent: refined });
  } catch (err) {
    console.error("Refinement error:", err);
    return res.status(500).json({ error: "Refinement step failed" });
  }
});

router.post("/cms/ideation/ideas/:id/update-refined", requireCmsAuth, async (req, res) => {
  try {
    const ideaId = Number(req.params.id);
    const { refinedContent } = req.body;

    await db.update(ideationIdeasTable)
      .set({ refinedContent })
      .where(eq(ideationIdeasTable.id, ideaId));

    return res.json({ success: true });
  } catch (err) {
    console.error("Update refined error:", err);
    return res.status(500).json({ error: "Failed to update refined content" });
  }
});

router.post("/cms/ideation/ideas/:id/publish-draft", requireCmsAuth, async (req, res) => {
  const ideaId = Number(req.params.id);
  let pillarType = "unknown";
  try {
    const [idea] = await db.select().from(ideationIdeasTable).where(eq(ideationIdeasTable.id, ideaId));
    if (!idea) return res.status(404).json({ error: "Idea not found" });
    pillarType = idea.pillarType;

    const content = (idea.refinedContent || idea.content) as Record<string, unknown>;

    if (idea.pillarType === "debates") {
      const categorySlug = ((content.category as string) || "general")
        .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

      const poll = await db.transaction(async (tx) => {
        const [createdPoll] = await tx.insert(pollsTable).values({
          question: (content.question as string) || idea.title,
          context: (content.context as string) || null,
          category: (content.category as string) || "General",
          categorySlug,
          tags: (content.tags as string[]) || ["ai-generated"],
          pollType: "multiple_choice",
          editorialStatus: "draft",
        }).returning();

        if (!createdPoll) {
          throw new Error("Failed to create poll");
        }

        const options = (content.options as string[]) || ["Strongly agree — this is undeniable", "Disagree — the data is misleading", "It's complicated — both sides have a point", "Asking the wrong question entirely"];
        for (const opt of options) {
          await tx.insert(pollOptionsTable).values({
            pollId: createdPoll.id,
            text: opt,
            voteCount: 0,
          });
        }

        await tx.update(ideationIdeasTable)
          .set({ status: "published" })
          .where(eq(ideationIdeasTable.id, ideaId));

        return createdPoll;
      });

      return res.json({ success: true, type: "debate", id: poll.id });
    }

    if (idea.pillarType === "predictions") {
      const categorySlug = ((content.category as string) || "general")
        .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

      const newId = incrementPredictionId();
      const now = new Date().toISOString();

      const predOptions = (content.options as string[]) || ["Confident this will happen", "Possible but timeline is too aggressive", "Unlikely — too many obstacles", "The question itself is flawed"];
      const equalPct = Math.floor(100 / predOptions.length);
      const optionResults: Record<string, number> = {};
      predOptions.forEach((opt, i) => {
        optionResults[opt] = i === 0 ? 100 - equalPct * (predOptions.length - 1) : equalPct;
      });

      mockPredictions.push({
        id: newId,
        question: (content.question as string) || idea.title,
        category: (content.category as string) || "General",
        categorySlug,
        resolvesAt: (content.resolvesAt as string) || null,
        yesPercentage: 50,
        noPercentage: 50,
        totalCount: 0,
        momentum: 0,
        momentumDirection: "neutral",
        trendData: [50, 50, 50],
        cardLayout: "grid",
        editorialStatus: "draft",
        isFeatured: false,
        tags: (content.tags as string[]) || ["ai-generated"],
        options: predOptions,
        optionResults,
        createdAt: now,
        updatedAt: now,
      });

      await db.transaction(async (tx) => {
        await tx.update(ideationIdeasTable)
          .set({ status: "published" })
          .where(eq(ideationIdeasTable.id, ideaId));
      });

      return res.json({ success: true, type: "prediction", id: newId });
    }

    if (idea.pillarType === "pulse") {
      await db.transaction(async (tx) => {
        await tx.update(ideationIdeasTable)
          .set({ status: "published" })
          .where(eq(ideationIdeasTable.id, ideaId));
      });

      return res.json({
        success: true,
        type: "pulse",
        draft: {
          title: (content.title as string) || idea.title,
          stat: (content.stat as string) || "N/A",
          delta: (content.delta as string) || "0%",
          direction: (content.direction as string) || "up",
          blurb: (content.blurb as string) || "",
          source: (content.source as string) || "AI Generated",
        },
        note: "Pulse draft data returned — add to Pulse page configuration to publish",
      });
    }

    return res.status(400).json({ error: `Unsupported pillar type: ${idea.pillarType}` });
  } catch (err) {
    console.error(`Publish draft error for idea ${ideaId} (pillar: ${pillarType}):`, err);
    return res.status(500).json({ error: "Failed to create draft" });
  }
});

router.post("/cms/ideation/sessions/:id/complete", requireCmsAuth, async (req, res) => {
  try {
    const sessionId = Number(req.params.id);
    await db.update(ideationSessionsTable)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(ideationSessionsTable.id, sessionId));
    return res.json({ success: true });
  } catch (err) {
    console.error("Complete session error:", err);
    return res.status(500).json({ error: "Failed to complete session" });
  }
});

router.get("/cms/ideation/rejection-log", requireCmsAuth, async (req, res) => {
  try {
    const items = await db.select().from(ideationRejectionLogTable).orderBy(desc(ideationRejectionLogTable.createdAt));
    return res.json({ items });
  } catch (err) {
    console.error("Rejection log error:", err);
    return res.status(500).json({ error: "Failed to fetch rejection log" });
  }
});

router.get("/cms/ideation/rejection-log/export", requireCmsAuth, async (_req, res) => {
  try {
    const items = await db.select().from(ideationRejectionLogTable).orderBy(desc(ideationRejectionLogTable.createdAt));

    const sanitizeCsv = (val: string) => {
      let safe = val.replace(/"/g, '""');
      if (/^[=+\-@\t\r]/.test(safe)) safe = "'" + safe;
      return `"${safe}"`;
    };

    const csv = [
      "ID,Idea ID,Session ID,Title,Pillar,Rejection Tag,Date",
      ...items.map(i =>
        `${i.id},${i.ideaId},${i.sessionId},${sanitizeCsv(i.ideaTitle)},${sanitizeCsv(i.pillarType)},${sanitizeCsv(i.rejectionTag)},${i.createdAt?.toISOString() || ""}`
      ),
    ].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=rejection-log.csv");
    return res.send(csv);
  } catch (err) {
    console.error("Rejection export error:", err);
    return res.status(500).json({ error: "Export failed" });
  }
});

router.delete("/cms/ideation/sessions/:id", requireCmsAuth, async (req, res) => {
  try {
    const sessionId = Number(req.params.id);
    if (!sessionId || sessionId <= 0) return res.status(400).json({ error: "Invalid session ID" });

    await db.delete(ideationRejectionLogTable).where(eq(ideationRejectionLogTable.sessionId, sessionId));
    await db.delete(ideationIdeasTable).where(eq(ideationIdeasTable.sessionId, sessionId));
    await db.delete(ideationSessionsTable).where(eq(ideationSessionsTable.id, sessionId));
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete session error:", err);
    return res.status(500).json({ error: "Failed to delete session" });
  }
});

router.delete("/cms/ideation/ideas/:id", requireCmsAuth, async (req, res) => {
  try {
    const ideaId = Number(req.params.id);
    if (!ideaId || ideaId <= 0) return res.status(400).json({ error: "Invalid idea ID" });

    await db.delete(ideationRejectionLogTable).where(eq(ideationRejectionLogTable.ideaId, ideaId));
    await db.delete(ideationIdeasTable).where(eq(ideationIdeasTable.id, ideaId));
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete idea error:", err);
    return res.status(500).json({ error: "Failed to delete idea" });
  }
});

router.put("/cms/ideation/ideas/:id", requireCmsAuth, async (req, res) => {
  try {
    const ideaId = Number(req.params.id);
    if (!ideaId || ideaId <= 0) return res.status(400).json({ error: "Invalid idea ID" });

    const { title, content, status } = req.body;
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (status !== undefined) updates.status = status;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    await db.update(ideationIdeasTable).set(updates).where(eq(ideationIdeasTable.id, ideaId));
    return res.json({ success: true });
  } catch (err) {
    console.error("Update idea error:", err);
    return res.status(500).json({ error: "Failed to update idea" });
  }
});

router.delete("/cms/ideation/rejection-log/:id", requireCmsAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || id <= 0) return res.status(400).json({ error: "Invalid ID" });

    await db.delete(ideationRejectionLogTable).where(eq(ideationRejectionLogTable.id, id));
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete rejection log entry error:", err);
    return res.status(500).json({ error: "Failed to delete rejection log entry" });
  }
});

export default router;
