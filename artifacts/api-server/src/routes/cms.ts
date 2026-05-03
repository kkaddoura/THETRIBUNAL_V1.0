import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import { supabaseAdmin, isSupabaseStorageAvailable, STORAGE_BUCKET, getPublicUrl } from "../utils/supabase-storage";
import crypto from "crypto";
import { db, pollsTable, pollOptionsTable, votesTable, newsletterSubscribersTable, hustlerApplicationsTable, profilesTable, predictionsTable, pulseTopicsTable, cmsConfigsTable, designTokensTable, majlisInvitesTable, cmsSessionsTable } from "@workspace/db";
import { eq, desc, sql, count, like, or, inArray, and, asc, gt } from "drizzle-orm";

const router = Router();

const CMS_USERNAME = process.env.CMS_USERNAME ?? "admin";
const CMS_PIN = process.env.CMS_PIN ?? "1234";
const isDefaultUsername = CMS_USERNAME === "admin";
const isDefaultPin = CMS_PIN === "1234";
const hasAnyDefaultCred = isDefaultUsername || isDefaultPin;

if (process.env.NODE_ENV === "production") {
  if (!process.env.CMS_USERNAME || !process.env.CMS_PIN) {
    console.error("[SECURITY] CMS_USERNAME and CMS_PIN must be set via environment variables in production. Default credentials are active — set these immediately.");
  }
}

/** @deprecated Kept as write-through cache for backward compat with majlis.ts / ideation.ts.
 *  Primary session storage is now the cms_sessions DB table. */
export const cmsSessions = new Map<string, { username: string; createdAt: number }>();

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

const VALID_STATUSES = new Set(["draft", "in_review", "approved", "rejected", "revision", "flagged", "archived"]);

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ["in_review", "approved", "rejected"],
  in_review: ["approved", "rejected", "draft"],
  approved: ["flagged", "archived", "draft"],
  rejected: ["revision", "draft"],
  revision: ["in_review", "approved", "draft"],
  flagged: ["approved", "archived"],
  archived: ["approved", "draft"],
};

function isValidStatusTransition(from: string | null, to: string): boolean {
  if (!from) return VALID_STATUSES.has(to);
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

async function requireCmsAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.headers["x-cms-token"] as string;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const [session] = await db.select().from(cmsSessionsTable)
      .where(and(eq(cmsSessionsTable.token, token), gt(cmsSessionsTable.expiresAt, new Date())));
    if (!session) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  } catch (err) {
    console.error("CMS auth check error:", err);
    res.status(500).json({ error: "Auth check failed" });
  }
}

export let nextPredictionId = 100;

export function incrementPredictionId(): number {
  return nextPredictionId++;
}

export interface MockPrediction {
  id: number;
  question: string;
  category: string;
  categorySlug: string;
  resolvesAt: string | null;
  yesPercentage: number;
  noPercentage: number;
  totalCount: number;
  momentum: number;
  momentumDirection: string;
  trendData: number[];
  cardLayout: string;
  editorialStatus: string;
  isFeatured: boolean;
  tags: string[];
  options?: string[];
  optionResults?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export const mockPredictions: MockPrediction[] = [];

router.post("/cms/auth/login", async (req, res) => {
  if (hasAnyDefaultCred && process.env.NODE_ENV === "production") {
    return res.status(503).json({ error: "CMS login disabled — default credentials detected. Set CMS_USERNAME and CMS_PIN environment variables." });
  }
  const { username, pin } = req.body;
  if (username === CMS_USERNAME && pin === CMS_PIN) {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    try {
      await db.insert(cmsSessionsTable).values({ token, username, expiresAt });
      // Write-through to in-memory Map for backward compat with majlis.ts / ideation.ts
      cmsSessions.set(token, { username, createdAt: Date.now() });
      return res.json({ token, username });
    } catch (err) {
      console.error("CMS login session insert error:", err);
      return res.status(500).json({ error: "Login failed" });
    }
  }
  return res.status(401).json({ error: "Invalid credentials" });
});

router.post("/cms/auth/verify", requireCmsAuth, (_req, res) => {
  return res.json({ valid: true });
});

router.get("/cms/stats", requireCmsAuth, async (_req, res) => {
  try {
    const debateStatusCounts = await db
      .select({ status: pollsTable.editorialStatus, count: count() })
      .from(pollsTable)
      .groupBy(pollsTable.editorialStatus);

    const debateStats = {
      total: debateStatusCounts.reduce((s, r) => s + r.count, 0),
      drafts: debateStatusCounts.find(r => r.status === "draft")?.count ?? 0,
      live: debateStatusCounts.find(r => r.status === "approved")?.count ?? 0,
      flagged: debateStatusCounts.find(r => r.status === "flagged")?.count ?? 0,
      inReview: debateStatusCounts.find(r => r.status === "in_review")?.count ?? 0,
      archived: debateStatusCounts.find(r => r.status === "archived")?.count ?? 0,
    };

    const voiceStatusCounts = await db
      .select({ status: profilesTable.editorialStatus, count: count() })
      .from(profilesTable)
      .groupBy(profilesTable.editorialStatus);

    const voiceStats = {
      total: voiceStatusCounts.reduce((s, r) => s + r.count, 0),
      drafts: voiceStatusCounts.find(r => r.status === "draft")?.count ?? 0,
      live: voiceStatusCounts.find(r => r.status === "approved")?.count ?? 0,
      flagged: voiceStatusCounts.find(r => r.status === "flagged")?.count ?? 0,
      inReview: voiceStatusCounts.find(r => r.status === "in_review")?.count ?? 0,
      archived: voiceStatusCounts.find(r => r.status === "archived")?.count ?? 0,
    };

    const predStatusCounts = await db
      .select({ status: predictionsTable.editorialStatus, count: count() })
      .from(predictionsTable)
      .groupBy(predictionsTable.editorialStatus);

    const predStats = {
      total: predStatusCounts.reduce((s, r) => s + r.count, 0),
      drafts: predStatusCounts.find(r => r.status === "draft")?.count ?? 0,
      live: predStatusCounts.find(r => r.status === "approved")?.count ?? 0,
      flagged: predStatusCounts.find(r => r.status === "flagged")?.count ?? 0,
      inReview: predStatusCounts.find(r => r.status === "in_review")?.count ?? 0,
      archived: predStatusCounts.find(r => r.status === "archived")?.count ?? 0,
    };

    const [pulseCountResult] = await db.select({ count: count() }).from(pulseTopicsTable);

    const recentDebates = await db
      .select({ id: pollsTable.id, question: pollsTable.question, editorialStatus: pollsTable.editorialStatus, createdAt: pollsTable.createdAt })
      .from(pollsTable)
      .orderBy(desc(pollsTable.createdAt))
      .limit(10);

    const recentPredictions = await db
      .select({ id: predictionsTable.id, question: predictionsTable.question, editorialStatus: predictionsTable.editorialStatus, updatedAt: predictionsTable.updatedAt })
      .from(predictionsTable)
      .orderBy(desc(predictionsTable.updatedAt))
      .limit(10);

    const recentActivity = [
      ...recentDebates.map(d => ({ type: "debate" as const, id: d.id, title: d.question, status: d.editorialStatus, updatedAt: d.createdAt?.toISOString() ?? new Date().toISOString() })),
      ...recentPredictions.map(p => ({ type: "prediction" as const, id: p.id, title: p.question, status: p.editorialStatus, updatedAt: p.updatedAt?.toISOString() ?? new Date().toISOString() })),
    ].sort((a, b) => new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime()).slice(0, 10);

    // Vote counts: real vs dummy
    const [debateVoteCounts] = await db.select({
      realVotes: sql<number>`COALESCE(SUM(vote_count), 0)`,
      dummyVotes: sql<number>`COALESCE(SUM(dummy_vote_count), 0)`,
    }).from(pollOptionsTable);

    const [predictionVoteCounts] = await db.select({
      realVotes: sql<number>`COALESCE(SUM(total_count), 0)`,
      dummyVotes: sql<number>`COALESCE(SUM(dummy_total_count), 0)`,
    }).from(predictionsTable);

    return res.json({
      debates: debateStats,
      predictions: predStats,
      voices: voiceStats,
      pulse: { total: pulseCountResult.count },
      recentActivity,
      voteCounts: {
        debates: { real: Number(debateVoteCounts.realVotes), dummy: Number(debateVoteCounts.dummyVotes) },
        predictions: { real: Number(predictionVoteCounts.realVotes), dummy: Number(predictionVoteCounts.dummyVotes) },
      },
    });
  } catch (err) {
    console.error("Stats error:", err);
    return res.status(500).json({ error: "Stats failed" });
  }
});

router.get("/cms/taxonomy", requireCmsAuth, async (_req, res) => {
  try {
    const dbCategories = await db
      .select({ category: pollsTable.category })
      .from(pollsTable)
      .groupBy(pollsTable.category);

    const dbSectors = await db
      .select({ sector: profilesTable.sector })
      .from(profilesTable)
      .groupBy(profilesTable.sector);

    const dbCountries = await db
      .select({ country: profilesTable.country })
      .from(profilesTable)
      .groupBy(profilesTable.country);

    const dbCities = await db
      .select({ city: profilesTable.city })
      .from(profilesTable)
      .groupBy(profilesTable.city);

    const dbTags = await db
      .select({ tags: pollsTable.tags })
      .from(pollsTable);

    const allDbTags = new Set<string>();
    for (const row of dbTags) {
      if (Array.isArray(row.tags)) {
        for (const t of row.tags) {
          if (typeof t === "string" && t.trim()) allDbTags.add(t.trim().toLowerCase());
        }
      }
    }

    const debateCategories = [...new Set([
      ...dbCategories.map(r => r.category),
      "Technology & AI", "Politics", "Economy", "Finance", "Startups", "Society", "Lifestyle", "Culture", "Energy", "Climate", "Diplomacy", "Healthcare", "Education", "Real Estate",
    ])].sort();

    const dbPredCategories = await db
      .select({ category: predictionsTable.category })
      .from(predictionsTable)
      .groupBy(predictionsTable.category);

    const predictionCategories = [...new Set([
      ...dbPredCategories.map(r => r.category),
      "Economy & Finance", "Technology & AI", "Energy & Climate", "Culture & Society", "Business & Startups", "Geopolitics & Governance", "Education & Workforce", "Infrastructure & Cities", "Sports & Entertainment", "Health & Demographics",
    ])].sort();

    return res.json({
      debateCategories,
      predictionCategories,
      tags: [...allDbTags].sort(),
      sectors: [...new Set([...dbSectors.map(r => r.sector), "Technology", "Finance", "Healthcare", "Education", "Energy", "Real Estate", "Logistics", "Media", "Climate Tech", "E-commerce", "Agriculture", "Manufacturing", "Consulting", "Legal"])].sort(),
      countries: [...new Set([...dbCountries.map(r => r.country), "Saudi Arabia", "UAE", "Egypt", "Jordan", "Bahrain", "Kuwait", "Oman", "Qatar", "Lebanon", "Morocco", "Tunisia", "Iraq", "Turkey", "Iran"])].sort(),
      cities: [...new Set([...dbCities.map(r => r.city), "Dubai", "Riyadh", "Jeddah", "Abu Dhabi", "Cairo", "Amman", "Manama", "Doha", "Kuwait City", "Muscat", "Beirut", "Casablanca", "Istanbul", "Tehran"])].sort(),
    });
  } catch (err) {
    console.error("Taxonomy error:", err);
    return res.status(500).json({ error: "Taxonomy failed" });
  }
});

router.get("/cms/debates", requireCmsAuth, async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const whereClause = (status && status !== "all") ? eq(pollsTable.editorialStatus, status) : undefined;

    const polls = await db
      .select()
      .from(pollsTable)
      .where(whereClause)
      .orderBy(desc(pollsTable.createdAt));

    const pollIds = polls.map(p => p.id);
    let optionsMap: Record<number, { id: number; pollId: number; text: string; voteCount: number }[]> = {};

    if (pollIds.length > 0) {
      const allOptions = await db
        .select()
        .from(pollOptionsTable)
        .where(inArray(pollOptionsTable.pollId, pollIds));

      for (const opt of allOptions) {
        if (!optionsMap[opt.pollId]) optionsMap[opt.pollId] = [];
        optionsMap[opt.pollId].push(opt);
      }
    }

    const items = polls.map(p => ({
      id: p.id,
      question: p.question,
      context: p.context,
      category: p.category,
      categorySlug: p.categorySlug,
      tags: p.tags ?? [],
      pollType: p.pollType,
      cardLayout: p.cardLayout ?? "standard",
      isFeatured: p.isFeatured,
      isEditorsPick: p.isEditorsPick,
      editorialStatus: p.editorialStatus,
      endsAt: p.endsAt?.toISOString() ?? null,
      createdAt: p.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: p.createdAt?.toISOString() ?? new Date().toISOString(),
      relatedProfileIds: p.relatedProfileIds ?? [],
      options: optionsMap[p.id] ?? [],
      totalVotes: (optionsMap[p.id] ?? []).reduce((s, o) => s + o.voteCount, 0),
    }));

    return res.json({ items });
  } catch (err) {
    console.error("Debates list error:", err);
    return res.status(500).json({ error: "Failed to fetch debates" });
  }
});

router.get("/cms/debates/:id", requireCmsAuth, async (req, res) => {
  try {
    const [poll] = await db.select().from(pollsTable).where(eq(pollsTable.id, Number(req.params.id)));
    if (!poll) return res.status(404).json({ error: "Not found" });

    const options = await db.select().from(pollOptionsTable).where(eq(pollOptionsTable.pollId, poll.id));

    return res.json({
      id: poll.id,
      question: poll.question,
      context: poll.context,
      category: poll.category,
      categorySlug: poll.categorySlug,
      tags: poll.tags ?? [],
      pollType: poll.pollType,
      cardLayout: poll.cardLayout ?? "standard",
      isFeatured: poll.isFeatured,
      isEditorsPick: poll.isEditorsPick,
      editorialStatus: poll.editorialStatus,
      endsAt: poll.endsAt?.toISOString() ?? null,
      createdAt: poll.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: poll.createdAt?.toISOString() ?? new Date().toISOString(),
      relatedProfileIds: poll.relatedProfileIds ?? [],
      options,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch debate" });
  }
});

router.put("/cms/debates/:id", requireCmsAuth, async (req, res) => {
  try {
    const pollId = Number(req.params.id);
    const [existing] = await db.select().from(pollsTable).where(eq(pollsTable.id, pollId));
    if (!existing) return res.status(404).json({ error: "Not found" });

    const { options, updatedAt, totalVotes, ...data } = req.body;

    if (data.editorialStatus && VALID_STATUSES.has(data.editorialStatus)) {
      if (!isValidStatusTransition(existing.editorialStatus, data.editorialStatus)) {
        return res.status(400).json({ error: `Cannot transition from '${existing.editorialStatus}' to '${data.editorialStatus}'` });
      }
    }

    const updateFields: Record<string, unknown> = {};
    if (data.question !== undefined) updateFields.question = data.question;
    if (data.context !== undefined) updateFields.context = data.context;
    if (data.category !== undefined) updateFields.category = data.category;
    if (data.categorySlug !== undefined) updateFields.categorySlug = data.categorySlug;
    if (data.tags !== undefined) updateFields.tags = data.tags;
    if (data.pollType !== undefined) updateFields.pollType = data.pollType;
    if (data.cardLayout !== undefined) updateFields.cardLayout = data.cardLayout;
    if (data.isFeatured !== undefined) updateFields.isFeatured = data.isFeatured;
    if (data.isEditorsPick !== undefined) updateFields.isEditorsPick = data.isEditorsPick;
    if (data.editorialStatus !== undefined) updateFields.editorialStatus = data.editorialStatus;
    if (data.endsAt !== undefined) updateFields.endsAt = data.endsAt ? new Date(data.endsAt) : null;
    if (data.relatedProfileIds !== undefined) updateFields.relatedProfileIds = data.relatedProfileIds;

    if (Object.keys(updateFields).length > 0) {
      await db.update(pollsTable).set(updateFields).where(eq(pollsTable.id, pollId));
    }

    if (options && Array.isArray(options)) {
      await db.delete(pollOptionsTable).where(eq(pollOptionsTable.pollId, pollId));
      for (const opt of options) {
        await db.insert(pollOptionsTable).values({
          pollId,
          text: typeof opt === "string" ? opt : opt.text,
          voteCount: opt.voteCount ?? 0,
        });
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Update debate error:", err);
    return res.status(500).json({ error: "Failed to update debate" });
  }
});

router.delete("/cms/debates/:id", requireCmsAuth, async (req, res) => {
  try {
    const pollId = Number(req.params.id);
    await db.delete(votesTable).where(eq(votesTable.pollId, pollId));
    await db.delete(pollOptionsTable).where(eq(pollOptionsTable.pollId, pollId));
    await db.delete(pollsTable).where(eq(pollsTable.id, pollId));
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete debate" });
  }
});

router.get("/cms/predictions", requireCmsAuth, async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const whereClause = (status && status !== "all") ? eq(predictionsTable.editorialStatus, status) : undefined;

    const items = await db
      .select()
      .from(predictionsTable)
      .where(whereClause)
      .orderBy(desc(predictionsTable.updatedAt));

    return res.json({ items });
  } catch (err) {
    console.error("Predictions list error:", err);
    return res.status(500).json({ error: "Failed to fetch predictions" });
  }
});

router.get("/cms/predictions/:id", requireCmsAuth, async (req, res) => {
  try {
    const [item] = await db.select().from(predictionsTable).where(eq(predictionsTable.id, Number(req.params.id)));
    if (!item) return res.status(404).json({ error: "Not found" });
    return res.json(item);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch prediction" });
  }
});

router.put("/cms/predictions/:id", requireCmsAuth, async (req, res) => {
  try {
    const predId = Number(req.params.id);
    const [existing] = await db.select().from(predictionsTable).where(eq(predictionsTable.id, predId));
    if (!existing) return res.status(404).json({ error: "Not found" });

    if (req.body.editorialStatus && VALID_STATUSES.has(req.body.editorialStatus)) {
      if (!isValidStatusTransition(existing.editorialStatus, req.body.editorialStatus)) {
        return res.status(400).json({ error: `Cannot transition from '${existing.editorialStatus}' to '${req.body.editorialStatus}'` });
      }
    }

    const { question, category, categorySlug, tags, resolvesAt, yesPercentage, noPercentage,
      totalCount, momentum, momentumDirection, trendData, cardLayout, editorialStatus,
      isFeatured, options, optionResults } = req.body;
    const data: Record<string, unknown> = {};
    if (question !== undefined) data.question = question;
    if (category !== undefined) data.category = category;
    if (categorySlug !== undefined) data.categorySlug = categorySlug;
    if (tags !== undefined) data.tags = tags;
    if (resolvesAt !== undefined) data.resolvesAt = resolvesAt;
    if (yesPercentage !== undefined) data.yesPercentage = yesPercentage;
    if (noPercentage !== undefined) data.noPercentage = noPercentage;
    if (totalCount !== undefined) data.totalCount = totalCount;
    if (momentum !== undefined) data.momentum = momentum;
    if (momentumDirection !== undefined) data.momentumDirection = momentumDirection;
    if (trendData !== undefined) data.trendData = trendData;
    if (cardLayout !== undefined) data.cardLayout = cardLayout;
    if (editorialStatus !== undefined) data.editorialStatus = editorialStatus;
    if (isFeatured !== undefined) data.isFeatured = isFeatured;
    if (options !== undefined) data.options = options;
    if (optionResults !== undefined) data.optionResults = optionResults;

    data.updatedAt = new Date();
    const [updated] = await db.update(predictionsTable).set(data).where(eq(predictionsTable.id, predId)).returning();
    return res.json({ success: true, item: updated });
  } catch (err) {
    console.error("Update prediction error:", err);
    return res.status(500).json({ error: "Failed to update prediction" });
  }
});

router.delete("/cms/predictions/:id", requireCmsAuth, async (req, res) => {
  try {
    const predId = Number(req.params.id);
    await db.delete(predictionsTable).where(eq(predictionsTable.id, predId));
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete prediction" });
  }
});

router.get("/cms/pulse-topics", requireCmsAuth, async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const whereClause = (status && status !== "all") ? eq(pulseTopicsTable.editorialStatus, status) : undefined;

    const items = await db
      .select()
      .from(pulseTopicsTable)
      .where(whereClause)
      .orderBy(asc(pulseTopicsTable.sortOrder));

    return res.json({ items });
  } catch (err) {
    console.error("Pulse topics list error:", err);
    return res.status(500).json({ error: "Failed to fetch pulse topics" });
  }
});

router.get("/cms/pulse-topics/:id", requireCmsAuth, async (req, res) => {
  try {
    const [item] = await db.select().from(pulseTopicsTable).where(eq(pulseTopicsTable.id, Number(req.params.id)));
    if (!item) return res.status(404).json({ error: "Not found" });
    return res.json(item);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch pulse topic" });
  }
});

router.put("/cms/pulse-topics/:id", requireCmsAuth, async (req, res) => {
  try {
    const topicId = Number(req.params.id);
    const [existing] = await db.select().from(pulseTopicsTable).where(eq(pulseTopicsTable.id, topicId));
    if (!existing) return res.status(404).json({ error: "Not found" });

    if (req.body.editorialStatus && VALID_STATUSES.has(req.body.editorialStatus)) {
      if (!isValidStatusTransition(existing.editorialStatus, req.body.editorialStatus)) {
        return res.status(400).json({ error: `Cannot transition from '${existing.editorialStatus}' to '${req.body.editorialStatus}'` });
      }
    }

    const { topicId: bodyTopicId, tag, tagColor, title, stat, delta, deltaUp, blurb, source,
      sparkData, liveConfig, sortOrder, editorialStatus } = req.body;
    const data: Record<string, unknown> = {};
    if (bodyTopicId !== undefined) data.topicId = bodyTopicId;
    if (tag !== undefined) data.tag = tag;
    if (tagColor !== undefined) data.tagColor = tagColor;
    if (title !== undefined) data.title = title;
    if (stat !== undefined) data.stat = stat;
    if (delta !== undefined) data.delta = delta;
    if (deltaUp !== undefined) data.deltaUp = deltaUp;
    if (blurb !== undefined) data.blurb = blurb;
    if (source !== undefined) data.source = source;
    if (sparkData !== undefined) data.sparkData = sparkData;
    if (liveConfig !== undefined) data.liveConfig = liveConfig;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;
    if (editorialStatus !== undefined) data.editorialStatus = editorialStatus;

    data.updatedAt = new Date();
    await db.update(pulseTopicsTable).set(data).where(eq(pulseTopicsTable.id, topicId));
    return res.json({ success: true });
  } catch (err) {
    console.error("Update pulse topic error:", err);
    return res.status(500).json({ error: "Failed to update pulse topic" });
  }
});

router.delete("/cms/pulse-topics/:id", requireCmsAuth, async (req, res) => {
  try {
    await db.delete(pulseTopicsTable).where(eq(pulseTopicsTable.id, Number(req.params.id)));
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete pulse topic" });
  }
});

router.post("/cms/pulse-topics", requireCmsAuth, async (req, res) => {
  try {
    const [item] = await db.insert(pulseTopicsTable).values({
      topicId: req.body.topicId || `topic-${Date.now()}`,
      tag: req.body.tag,
      tagColor: req.body.tagColor || "#DC143C",
      title: req.body.title,
      stat: req.body.stat,
      delta: req.body.delta,
      deltaUp: req.body.deltaUp ?? true,
      blurb: req.body.blurb,
      source: req.body.source,
      sparkData: req.body.sparkData || [],
      liveConfig: req.body.liveConfig || null,
      editorialStatus: req.body.editorialStatus || "draft",
    }).returning();
    return res.json({ success: true, item });
  } catch (err) {
    console.error("Create pulse topic error:", err);
    return res.status(500).json({ error: "Failed to create pulse topic" });
  }
});

router.get("/cms/design-tokens", requireCmsAuth, async (_req, res) => {
  try {
    const items = await db.select().from(designTokensTable).orderBy(asc(designTokensTable.sortOrder));
    return res.json({ items });
  } catch (err) {
    console.error("Design tokens error:", err);
    return res.status(500).json({ error: "Failed to fetch design tokens" });
  }
});

router.put("/cms/design-tokens/:id", requireCmsAuth, async (req, res) => {
  try {
    const tokenId = Number(req.params.id);
    const [existing] = await db.select().from(designTokensTable).where(eq(designTokensTable.id, tokenId));
    if (!existing) return res.status(404).json({ error: "Not found" });

    const { id: _id, createdAt: _ca, ...data } = req.body;
    await db.update(designTokensTable).set({ ...data, updatedAt: new Date() }).where(eq(designTokensTable.id, tokenId));
    return res.json({ success: true });
  } catch (err) {
    console.error("Update design token error:", err);
    return res.status(500).json({ error: "Failed to update design token" });
  }
});

router.post("/cms/design-tokens", requireCmsAuth, async (req, res) => {
  try {
    const [item] = await db.insert(designTokensTable).values({
      tokenType: req.body.tokenType || "color",
      name: req.body.name,
      label: req.body.label,
      value: req.body.value,
      category: req.body.category || null,
    }).returning();
    return res.json({ success: true, item });
  } catch (err) {
    console.error("Create design token error:", err);
    return res.status(500).json({ error: "Failed to create design token" });
  }
});

router.delete("/cms/design-tokens/:id", requireCmsAuth, async (req, res) => {
  try {
    await db.delete(designTokensTable).where(eq(designTokensTable.id, Number(req.params.id)));
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete design token" });
  }
});

router.get("/cms/voices", requireCmsAuth, async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const whereClause = (status && status !== "all") ? eq(profilesTable.editorialStatus, status) : undefined;

    const profiles = await db
      .select()
      .from(profilesTable)
      .where(whereClause)
      .orderBy(desc(profilesTable.createdAt));

    const items = profiles.map(p => ({
      id: p.id,
      name: p.name,
      headline: p.headline,
      role: p.role,
      company: p.company,
      companyUrl: p.companyUrl,
      sector: p.sector,
      country: p.country,
      city: p.city,
      imageUrl: p.imageUrl,
      summary: p.summary,
      story: p.story,
      lessonsLearned: p.lessonsLearned ?? [],
      quote: p.quote,
      impactStatement: p.impactStatement ?? null,
      isFeatured: p.isFeatured,
      isVerified: p.isVerified,
      viewCount: p.viewCount,
      associatedPollCount: p.associatedPollCount,
      editorialStatus: p.editorialStatus,
      createdAt: p.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: p.createdAt?.toISOString() ?? new Date().toISOString(),
    }));

    return res.json({ items });
  } catch (err) {
    console.error("Voices list error:", err);
    return res.status(500).json({ error: "Failed to fetch voices" });
  }
});

router.get("/cms/voices/:id", requireCmsAuth, async (req, res) => {
  try {
    const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, Number(req.params.id)));
    if (!profile) return res.status(404).json({ error: "Not found" });

    return res.json({
      id: profile.id,
      name: profile.name,
      headline: profile.headline,
      role: profile.role,
      company: profile.company,
      companyUrl: profile.companyUrl,
      sector: profile.sector,
      country: profile.country,
      city: profile.city,
      imageUrl: profile.imageUrl,
      summary: profile.summary,
      story: profile.story,
      lessonsLearned: profile.lessonsLearned ?? [],
      quote: profile.quote,
      impactStatement: profile.impactStatement ?? null,
      isFeatured: profile.isFeatured,
      isVerified: profile.isVerified,
      viewCount: profile.viewCount,
      associatedPollCount: profile.associatedPollCount,
      editorialStatus: profile.editorialStatus,
      createdAt: profile.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: profile.createdAt?.toISOString() ?? new Date().toISOString(),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch voice" });
  }
});

router.put("/cms/voices/:id", requireCmsAuth, async (req, res) => {
  try {
    const profileId = Number(req.params.id);
    const [existing] = await db.select().from(profilesTable).where(eq(profilesTable.id, profileId));
    if (!existing) return res.status(404).json({ error: "Not found" });

    const { updatedAt, viewCount, associatedPollCount, ...data } = req.body;

    if (data.editorialStatus && VALID_STATUSES.has(data.editorialStatus)) {
      if (!isValidStatusTransition(existing.editorialStatus, data.editorialStatus)) {
        return res.status(400).json({ error: `Cannot transition from '${existing.editorialStatus}' to '${data.editorialStatus}'` });
      }
    }

    const updateFields: Record<string, unknown> = {};
    if (data.name !== undefined) updateFields.name = data.name;
    if (data.headline !== undefined) updateFields.headline = data.headline;
    if (data.role !== undefined) updateFields.role = data.role;
    if (data.company !== undefined) updateFields.company = data.company;
    if (data.companyUrl !== undefined) updateFields.companyUrl = data.companyUrl;
    if (data.sector !== undefined) updateFields.sector = data.sector;
    if (data.country !== undefined) updateFields.country = data.country;
    if (data.city !== undefined) updateFields.city = data.city;
    if (data.imageUrl !== undefined) updateFields.imageUrl = data.imageUrl;
    if (data.summary !== undefined) updateFields.summary = data.summary;
    if (data.story !== undefined) updateFields.story = data.story;
    if (data.lessonsLearned !== undefined) updateFields.lessonsLearned = data.lessonsLearned;
    if (data.quote !== undefined) updateFields.quote = data.quote;
    if (data.impactStatement !== undefined) updateFields.impactStatement = data.impactStatement;
    if (data.isFeatured !== undefined) updateFields.isFeatured = data.isFeatured;
    if (data.isVerified !== undefined) updateFields.isVerified = data.isVerified;
    if (data.editorialStatus !== undefined) updateFields.editorialStatus = data.editorialStatus;

    if (Object.keys(updateFields).length > 0) {
      await db.update(profilesTable).set(updateFields).where(eq(profilesTable.id, profileId));
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Update voice error:", err);
    return res.status(500).json({ error: "Failed to update voice" });
  }
});

router.delete("/cms/voices/:id", requireCmsAuth, async (req, res) => {
  try {
    await db.delete(profilesTable).where(eq(profilesTable.id, Number(req.params.id)));
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete voice" });
  }
});

router.post("/cms/:type/:id/status", requireCmsAuth, async (req, res) => {
  const { type, id } = req.params;
  const { action } = req.body;

  const validTransitions: Record<string, Record<string, string>> = {
    approve: { draft: "approved", in_review: "approved", revision: "approved" },
    reject: { in_review: "rejected", draft: "rejected" },
    review: { draft: "in_review", revision: "in_review" },
    revision: { rejected: "revision" },
    flag: { approved: "flagged" },
    archive: { approved: "archived", flagged: "archived" },
    unflag: { flagged: "approved" },
    unarchive: { archived: "approved" },
    unpublish: { approved: "draft" },
  };

  if (!action || !validTransitions[action]) {
    return res.status(400).json({ error: "Invalid action" });
  }

  const numId = Number(id);

  try {
    if (type === "debates") {
      const [poll] = await db.select({ editorialStatus: pollsTable.editorialStatus }).from(pollsTable).where(eq(pollsTable.id, numId));
      if (!poll) return res.status(404).json({ error: "Not found" });
      const newStatus = validTransitions[action][poll.editorialStatus];
      if (!newStatus) return res.status(400).json({ error: `Cannot ${action} from status '${poll.editorialStatus}'` });
      if (!isValidStatusTransition(poll.editorialStatus, newStatus)) {
        return res.status(400).json({ error: `Transition from '${poll.editorialStatus}' to '${newStatus}' is not allowed` });
      }
      await db.update(pollsTable).set({ editorialStatus: newStatus }).where(eq(pollsTable.id, numId));
      return res.json({ success: true, newStatus });
    } else if (type === "predictions") {
      const [item] = await db.select({ editorialStatus: predictionsTable.editorialStatus }).from(predictionsTable).where(eq(predictionsTable.id, numId));
      if (!item) return res.status(404).json({ error: "Not found" });
      const newStatus = validTransitions[action][item.editorialStatus];
      if (!newStatus) return res.status(400).json({ error: `Cannot ${action} from status '${item.editorialStatus}'` });
      if (!isValidStatusTransition(item.editorialStatus, newStatus)) {
        return res.status(400).json({ error: `Transition from '${item.editorialStatus}' to '${newStatus}' is not allowed` });
      }
      await db.update(predictionsTable).set({ editorialStatus: newStatus, updatedAt: new Date() }).where(eq(predictionsTable.id, numId));
      return res.json({ success: true, newStatus });
    } else if (type === "pulse-topics") {
      const [item] = await db.select({ editorialStatus: pulseTopicsTable.editorialStatus }).from(pulseTopicsTable).where(eq(pulseTopicsTable.id, numId));
      if (!item) return res.status(404).json({ error: "Not found" });
      const newStatus = validTransitions[action][item.editorialStatus];
      if (!newStatus) return res.status(400).json({ error: `Cannot ${action} from status '${item.editorialStatus}'` });
      if (!isValidStatusTransition(item.editorialStatus, newStatus)) {
        return res.status(400).json({ error: `Transition from '${item.editorialStatus}' to '${newStatus}' is not allowed` });
      }
      await db.update(pulseTopicsTable).set({ editorialStatus: newStatus, updatedAt: new Date() }).where(eq(pulseTopicsTable.id, numId));
      return res.json({ success: true, newStatus });
    } else if (type === "voices") {
      const [profile] = await db.select({ editorialStatus: profilesTable.editorialStatus }).from(profilesTable).where(eq(profilesTable.id, numId));
      if (!profile) return res.status(404).json({ error: "Not found" });
      const newStatus = validTransitions[action][profile.editorialStatus];
      if (!newStatus) return res.status(400).json({ error: `Cannot ${action} from status '${profile.editorialStatus}'` });
      // Also verify via ALLOWED_TRANSITIONS for consistency between the two transition systems
      if (!isValidStatusTransition(profile.editorialStatus, newStatus)) {
        return res.status(400).json({ error: `Transition from '${profile.editorialStatus}' to '${newStatus}' is not allowed` });
      }
      await db.update(profilesTable).set({ editorialStatus: newStatus }).where(eq(profilesTable.id, numId));
      return res.json({ success: true, newStatus });
    } else {
      return res.status(400).json({ error: "Invalid type" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Status update failed" });
  }
});

router.post("/cms/:type/bulk-action", requireCmsAuth, async (req, res) => {
  const { type } = req.params;
  const { ids, action } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "ids array is required" });
  }

  try {
    if (action === "delete") {
      if (type === "debates") {
        for (const id of ids) {
          await db.delete(votesTable).where(eq(votesTable.pollId, id));
          await db.delete(pollOptionsTable).where(eq(pollOptionsTable.pollId, id));
          await db.delete(pollsTable).where(eq(pollsTable.id, id));
        }
      } else if (type === "predictions") {
        await db.delete(predictionsTable).where(inArray(predictionsTable.id, ids));
      } else if (type === "pulse-topics") {
        await db.delete(pulseTopicsTable).where(inArray(pulseTopicsTable.id, ids));
      } else if (type === "voices") {
        for (const id of ids) {
          await db.delete(profilesTable).where(eq(profilesTable.id, id));
        }
      } else {
        return res.status(400).json({ error: "Invalid type" });
      }
      return res.json({ success: true, deleted: ids.length });
    }

    const statusMap: Record<string, string> = {
      approve: "approved", reject: "rejected", flag: "flagged", archive: "archived",
      unflag: "approved", unarchive: "approved", unpublish: "draft", revision: "revision",
      review: "in_review",
    };

    const newStatus = statusMap[action];
    if (!newStatus) return res.status(400).json({ error: "Invalid action" });

    // Validate that newStatus is a recognized status value
    if (!VALID_STATUSES.has(newStatus)) {
      return res.status(400).json({ error: `Invalid target status '${newStatus}'` });
    }

    // Fetch current statuses and validate transitions per item
    let items: { id: number; editorialStatus: string }[] = [];
    if (type === "debates") {
      items = await db.select({ id: pollsTable.id, editorialStatus: pollsTable.editorialStatus }).from(pollsTable).where(inArray(pollsTable.id, ids));
    } else if (type === "predictions") {
      items = await db.select({ id: predictionsTable.id, editorialStatus: predictionsTable.editorialStatus }).from(predictionsTable).where(inArray(predictionsTable.id, ids));
    } else if (type === "pulse-topics") {
      items = await db.select({ id: pulseTopicsTable.id, editorialStatus: pulseTopicsTable.editorialStatus }).from(pulseTopicsTable).where(inArray(pulseTopicsTable.id, ids));
    } else if (type === "voices") {
      items = await db.select({ id: profilesTable.id, editorialStatus: profilesTable.editorialStatus }).from(profilesTable).where(inArray(profilesTable.id, ids));
    } else {
      return res.status(400).json({ error: "Invalid type" });
    }

    const validIds: number[] = [];
    const skippedIds: number[] = [];
    for (const item of items) {
      if (isValidStatusTransition(item.editorialStatus, newStatus)) {
        validIds.push(item.id);
      } else {
        skippedIds.push(item.id);
      }
    }

    if (validIds.length > 0) {
      if (type === "debates") {
        await db.update(pollsTable).set({ editorialStatus: newStatus }).where(inArray(pollsTable.id, validIds));
      } else if (type === "predictions") {
        await db.update(predictionsTable).set({ editorialStatus: newStatus, updatedAt: new Date() }).where(inArray(predictionsTable.id, validIds));
      } else if (type === "pulse-topics") {
        await db.update(pulseTopicsTable).set({ editorialStatus: newStatus, updatedAt: new Date() }).where(inArray(pulseTopicsTable.id, validIds));
      } else if (type === "voices") {
        await db.update(profilesTable).set({ editorialStatus: newStatus }).where(inArray(profilesTable.id, validIds));
      }
    }

    return res.json({ success: true, updated: validIds.length, skipped: skippedIds.length, skippedIds });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Bulk action failed" });
  }
});

router.post("/cms/upload/:type", requireCmsAuth, async (req, res) => {
  const { type } = req.params;
  const { items } = req.body;

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: "items array is required" });
  }

  try {
    if (type === "debates") {
      let created = 0;
      for (const item of items) {
        if (item.editorialStatus && !VALID_STATUSES.has(item.editorialStatus)) {
          return res.status(400).json({ error: `Invalid editorialStatus '${item.editorialStatus}' in upload item` });
        }
        const [poll] = await db.insert(pollsTable).values({
          question: item.question,
          context: item.context ?? null,
          category: item.category,
          categorySlug: item.categorySlug ?? item.category.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          tags: item.tags ?? [],
          pollType: item.pollType ?? "binary",
          isFeatured: item.isFeatured ?? false,
          isEditorsPick: item.isEditorsPick ?? false,
          editorialStatus: item.editorialStatus ?? "draft",
          endsAt: item.endsAt ? new Date(item.endsAt) : null,
          relatedProfileIds: item.relatedProfileIds ?? [],
        }).returning();

        if (item.options && Array.isArray(item.options)) {
          for (const opt of item.options) {
            await db.insert(pollOptionsTable).values({
              pollId: poll.id,
              text: typeof opt === "string" ? opt : opt.text,
              voteCount: 0,
            });
          }
        }
        created++;
      }
      return res.json({ success: true, created });
    }

    if (type === "predictions") {
      let created = 0;
      for (const item of items) {
        if (item.editorialStatus && !VALID_STATUSES.has(item.editorialStatus)) {
          return res.status(400).json({ error: `Invalid editorialStatus '${item.editorialStatus}' in upload item` });
        }
        await db.insert(predictionsTable).values({
          question: item.question,
          category: item.category,
          categorySlug: item.categorySlug ?? item.category.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          resolvesAt: item.resolvesAt ?? null,
          yesPercentage: item.yesPercentage ?? 50,
          noPercentage: item.noPercentage ?? 50,
          totalCount: item.totalCount ?? 0,
          momentum: item.momentum ?? 0,
          momentumDirection: item.momentumDirection ?? "up",
          trendData: item.trendData ?? [],
          cardLayout: item.cardLayout ?? "grid",
          editorialStatus: item.editorialStatus ?? "draft",
          isFeatured: item.isFeatured ?? false,
          tags: item.tags ?? [],
        });
        created++;
      }
      return res.json({ success: true, created });
    }

    if (type === "voices") {
      let created = 0;
      for (const item of items) {
        if (item.editorialStatus && !VALID_STATUSES.has(item.editorialStatus)) {
          return res.status(400).json({ error: `Invalid editorialStatus '${item.editorialStatus}' in upload item` });
        }
        await db.insert(profilesTable).values({
          name: item.name,
          headline: item.headline,
          role: item.role,
          company: item.company ?? null,
          companyUrl: item.companyUrl ?? null,
          sector: item.sector,
          country: item.country,
          city: item.city,
          imageUrl: item.imageUrl ?? null,
          summary: item.summary,
          story: item.story,
          lessonsLearned: item.lessonsLearned ?? [],
          quote: item.quote,
          impactStatement: item.impactStatement ?? null,
          isFeatured: item.isFeatured ?? false,
          isVerified: item.isVerified ?? false,
          editorialStatus: item.editorialStatus ?? "draft",
        });
        created++;
      }
      return res.json({ success: true, created });
    }

    return res.status(400).json({ error: "Invalid type" });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ error: "Upload failed" });
  }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
    }
  },
});

router.post("/cms/upload-image", requireCmsAuth, upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image provided" });
  }
  if (!isSupabaseStorageAvailable || !supabaseAdmin) {
    return res.status(500).json({ error: "Image storage not configured. Set SUPABASE_SERVICE_ROLE_KEY." });
  }
  const ext = path.extname(req.file.originalname);
  const filePath = `profiles/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
  if (error) {
    return res.status(500).json({ error: `Upload failed: ${error.message}` });
  }
  const url = getPublicUrl(filePath);
  return res.json({ url, filename: path.basename(filePath) });
});

router.get("/cms/homepage", requireCmsAuth, async (_req, res) => {
  try {
    const [row] = await db.select().from(cmsConfigsTable).where(eq(cmsConfigsTable.key, "homepage"));
    if (!row) return res.json({});
    return res.json(row.value);
  } catch (err) {
    console.error("Homepage config error:", err);
    return res.status(500).json({ error: "Failed to fetch homepage config" });
  }
});

router.put("/cms/homepage", requireCmsAuth, async (req, res) => {
  try {
    const [existing] = await db.select().from(cmsConfigsTable).where(eq(cmsConfigsTable.key, "homepage"));
    const currentConfig = (existing?.value ?? {}) as Record<string, Record<string, unknown> | unknown[] | unknown>;
    const { masthead, ticker, sections, banners, newsletter, sectionStats } = req.body;

    if (masthead) currentConfig.masthead = { ...(currentConfig.masthead as Record<string, unknown> ?? {}), ...masthead };
    if (ticker) currentConfig.ticker = { ...(currentConfig.ticker as Record<string, unknown> ?? {}), ...ticker };
    if (sections) currentConfig.sections = sections;
    if (banners) currentConfig.banners = banners;
    if (newsletter) currentConfig.newsletter = { ...(currentConfig.newsletter as Record<string, unknown> ?? {}), ...newsletter };
    if (sectionStats) currentConfig.sectionStats = { ...(currentConfig.sectionStats as Record<string, unknown> ?? {}), ...sectionStats };

    if (existing) {
      await db.update(cmsConfigsTable).set({ value: currentConfig, updatedAt: new Date() }).where(eq(cmsConfigsTable.key, "homepage"));
    } else {
      await db.insert(cmsConfigsTable).values({ key: "homepage", value: currentConfig });
    }
    return res.json({ success: true, config: currentConfig });
  } catch (err) {
    console.error("Update homepage error:", err);
    return res.status(500).json({ error: "Failed to update homepage config" });
  }
});

router.post("/cms/homepage/banners", requireCmsAuth, async (req, res) => {
  try {
    const [existing] = await db.select().from(cmsConfigsTable).where(eq(cmsConfigsTable.key, "homepage"));
    const config = (existing?.value ?? { banners: [] }) as Record<string, unknown>;
    const banner = {
      id: `banner-${Date.now()}`,
      title: req.body.title || "New Banner",
      subtitle: req.body.subtitle || "",
      ctaText: req.body.ctaText || "Learn More",
      ctaLink: req.body.ctaLink || "/",
      bgColor: req.body.bgColor || "#DC143C",
      textColor: req.body.textColor || "#FFFFFF",
      enabled: req.body.enabled ?? true,
      position: req.body.position || "top",
    };
    const bannerList = (config.banners ?? []) as Record<string, unknown>[];
    bannerList.push(banner);
    config.banners = bannerList;

    if (existing) {
      await db.update(cmsConfigsTable).set({ value: config, updatedAt: new Date() }).where(eq(cmsConfigsTable.key, "homepage"));
    } else {
      await db.insert(cmsConfigsTable).values({ key: "homepage", value: config });
    }
    return res.json({ success: true, banner });
  } catch (err) {
    console.error("Add banner error:", err);
    return res.status(500).json({ error: "Failed to add banner" });
  }
});

router.delete("/cms/homepage/banners/:id", requireCmsAuth, async (req, res) => {
  try {
    const [existing] = await db.select().from(cmsConfigsTable).where(eq(cmsConfigsTable.key, "homepage"));
    if (!existing) return res.status(404).json({ error: "Homepage config not found" });
    const config = existing.value as Record<string, unknown>;
    const bannerList = (config.banners ?? []) as Array<Record<string, unknown>>;
    const idx = bannerList.findIndex((b) => b.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Banner not found" });
    bannerList.splice(idx, 1);
    config.banners = bannerList;
    await db.update(cmsConfigsTable).set({ value: config, updatedAt: new Date() }).where(eq(cmsConfigsTable.key, "homepage"));
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete banner error:", err);
    return res.status(500).json({ error: "Failed to delete banner" });
  }
});

router.get("/cms/subscribers", requireCmsAuth, async (req, res) => {
  try {
    const search = req.query.search as string | undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    let whereClause;
    if (search) {
      whereClause = like(newsletterSubscribersTable.email, `%${search}%`);
    }

    const [items, totalResult] = await Promise.all([
      db.select().from(newsletterSubscribersTable)
        .where(whereClause)
        .orderBy(desc(newsletterSubscribersTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(newsletterSubscribersTable).where(whereClause),
    ]);

    const total = totalResult[0]?.count ?? 0;

    const sourceStats = await db
      .select({ source: newsletterSubscribersTable.source, count: count() })
      .from(newsletterSubscribersTable)
      .groupBy(newsletterSubscribersTable.source);

    return res.json({ items, total, page, limit, totalPages: Math.ceil(total / limit), sourceStats });
  } catch (err) {
    console.error("Subscribers error:", err);
    return res.status(500).json({ error: "Failed to fetch subscribers" });
  }
});

router.delete("/cms/subscribers/:id", requireCmsAuth, async (req, res) => {
  try {
    await db.delete(newsletterSubscribersTable).where(eq(newsletterSubscribersTable.id, Number(req.params.id)));
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete subscriber" });
  }
});

router.get("/cms/subscribers/export", requireCmsAuth, async (_req, res) => {
  try {
    const items = await db.select().from(newsletterSubscribersTable).orderBy(desc(newsletterSubscribersTable.createdAt));
    const csv = ["email,source,country_code,created_at", ...items.map(i => `${i.email},${i.source},${i.countryCode || ""},${i.createdAt}`)].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=subscribers.csv");
    return res.send(csv);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to export" });
  }
});

router.get("/cms/applications", requireCmsAuth, async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const conditions = [];
    if (status && status !== "all") {
      conditions.push(eq(hustlerApplicationsTable.editorialStatus, status));
    }
    if (search) {
      conditions.push(or(
        like(hustlerApplicationsTable.name, `%${search}%`),
        like(hustlerApplicationsTable.email, `%${search}%`),
        like(hustlerApplicationsTable.company, `%${search}%`)
      ));
    }

    const whereClause = conditions.length > 0
      ? conditions.length === 1 ? conditions[0] : and(...conditions)
      : undefined;

    const [items, totalResult] = await Promise.all([
      db.select().from(hustlerApplicationsTable)
        .where(whereClause)
        .orderBy(desc(hustlerApplicationsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(hustlerApplicationsTable).where(whereClause),
    ]);

    const total = totalResult[0]?.count ?? 0;

    const statusCounts = await db
      .select({ status: hustlerApplicationsTable.editorialStatus, count: count() })
      .from(hustlerApplicationsTable)
      .groupBy(hustlerApplicationsTable.editorialStatus);

    return res.json({ items, total, page, limit, totalPages: Math.ceil(total / limit), statusCounts });
  } catch (err) {
    console.error("Applications error:", err);
    return res.status(500).json({ error: "Failed to fetch applications" });
  }
});

router.get("/cms/applications/:id", requireCmsAuth, async (req, res) => {
  try {
    const [item] = await db.select().from(hustlerApplicationsTable).where(eq(hustlerApplicationsTable.id, Number(req.params.id)));
    if (!item) return res.status(404).json({ error: "Not found" });
    return res.json(item);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch application" });
  }
});

router.patch("/cms/applications/:id", requireCmsAuth, async (req, res) => {
  try {
    const { editorialStatus, editorNotes } = req.body;
    const updates: Record<string, unknown> = {};
    if (editorialStatus) updates.editorialStatus = editorialStatus;
    if (editorNotes !== undefined) updates.editorNotes = editorNotes;
    if (editorialStatus && editorialStatus !== "pending") updates.reviewedAt = new Date();

    await db.update(hustlerApplicationsTable).set(updates).where(eq(hustlerApplicationsTable.id, Number(req.params.id)));
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update application" });
  }
});

router.post("/cms/applications/:id/invite-majlis", requireCmsAuth, async (req, res) => {
  try {
    const [app] = await db.select().from(hustlerApplicationsTable).where(eq(hustlerApplicationsTable.id, Number(req.params.id)));
    if (!app) return res.status(404).json({ error: "Application not found" });

    // Check if invite already exists for this email
    const [existingInvite] = await db.select().from(majlisInvitesTable)
      .where(eq(majlisInvitesTable.email, app.email.toLowerCase().trim()));
    if (existingInvite && !existingInvite.isUsed && new Date(existingInvite.expiresAt) > new Date()) {
      return res.json({ success: true, token: existingInvite.token, alreadyInvited: true });
    }

    // Create a verified profile for the applicant
    const [profile] = await db.insert(profilesTable).values({
      name: app.name,
      headline: `${app.title} at ${app.company}`,
      role: app.title,
      company: app.company,
      sector: app.sector || "Technology",
      country: app.country || "",
      city: app.city || "",
      summary: app.bio,
      story: app.impact || "",
      quote: app.quote || "",
      isVerified: true,
    }).returning();

    // Generate invite token
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = crypto.randomBytes(12);
    let token = "";
    for (let i = 0; i < 12; i++) token += chars[bytes[i] % chars.length];
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db.insert(majlisInvitesTable).values({
      profileId: profile.id,
      email: app.email.toLowerCase().trim(),
      token,
      expiresAt,
    });

    // Send invite email via Resend
    let emailSent = false;
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (RESEND_API_KEY) {
      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "The Tribunal <noreply@themiddleeasthustle.com>",
            to: app.email,
            subject: "You're invited to The Majlis",
            text: `Hi ${app.name},\n\nYou've been approved to join The Majlis — our private chat room for verified voices across MENA.\n\nYour invite code: ${token}\n\nUse it to register at: https://themiddleeasthustle.com/majlis/register\n\nThis code expires in 30 days.\n\nThe Tribunal, by The Middle East Hustle`,
          }),
        });
        emailSent = emailRes.ok;
        console.log(`[CMS] Majlis invite email sent to ${app.email} | Code: ${token}`);
      } catch (err) {
        console.error("[CMS] Majlis invite email failed:", err);
      }
    }

    console.log(`[CMS] Majlis invite created for ${app.email} | Code: ${token} | ProfileId: ${profile.id}`);
    return res.json({ success: true, token, profileId: profile.id, emailSent });
  } catch (err) {
    console.error("Invite Majlis error:", err);
    return res.status(500).json({ error: "Failed to create Majlis invite" });
  }
});

router.get("/cms/analytics", requireCmsAuth, async (_req, res) => {
  try {
    const [totalVotesResult] = await db.select({ count: count() }).from(votesTable);
    const [totalPollsResult] = await db.select({ count: count() }).from(pollsTable);
    const [totalProfilesResult] = await db.select({ count: count() }).from(profilesTable);
    const [totalSubscribersResult] = await db.select({ count: count() }).from(newsletterSubscribersTable);
    const [totalApplicationsResult] = await db.select({ count: count() }).from(hustlerApplicationsTable);
    const [totalPredictionsResult] = await db.select({ count: count() }).from(predictionsTable);
    const [totalPulseResult] = await db.select({ count: count() }).from(pulseTopicsTable);

    const votesByCategory = await db
      .select({ category: pollsTable.category, count: count() })
      .from(votesTable)
      .innerJoin(pollsTable, eq(votesTable.pollId, pollsTable.id))
      .groupBy(pollsTable.category)
      .orderBy(desc(count()));

    const topPolls = await db
      .select({
        id: pollsTable.id,
        question: pollsTable.question,
        category: pollsTable.category,
        totalVotes: sql<number>`COALESCE(SUM(${pollOptionsTable.voteCount}), 0)`.as("total_votes"),
      })
      .from(pollsTable)
      .leftJoin(pollOptionsTable, eq(pollsTable.id, pollOptionsTable.pollId))
      .groupBy(pollsTable.id, pollsTable.question, pollsTable.category)
      .orderBy(desc(sql`total_votes`))
      .limit(10);

    const recentVotes = await db
      .select({
        date: sql<string>`DATE(${votesTable.createdAt})`.as("date"),
        count: count(),
      })
      .from(votesTable)
      .groupBy(sql`DATE(${votesTable.createdAt})`)
      .orderBy(desc(sql`DATE(${votesTable.createdAt})`))
      .limit(14);

    const votesByCountry = await db
      .select({ country: votesTable.countryName, count: count() })
      .from(votesTable)
      .where(sql`${votesTable.countryName} IS NOT NULL`)
      .groupBy(votesTable.countryName)
      .orderBy(desc(count()))
      .limit(15);

    return res.json({
      overview: {
        totalVotes: totalVotesResult.count,
        totalPolls: totalPollsResult.count,
        totalProfiles: totalProfilesResult.count,
        totalSubscribers: totalSubscribersResult.count,
        totalApplications: totalApplicationsResult.count,
        totalPredictions: totalPredictionsResult.count,
        totalPulseTopics: totalPulseResult.count,
      },
      votesByCategory,
      topPolls,
      recentVotes: recentVotes.reverse(),
      votesByCountry,
    });
  } catch (err) {
    console.error("Analytics error:", err);
    return res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

router.get("/cms/pages/:page", requireCmsAuth, async (req, res) => {
  try {
    const page = req.params.page;
    const [row] = await db.select().from(cmsConfigsTable).where(eq(cmsConfigsTable.key, `page_${page}`));
    if (!row) return res.status(404).json({ error: "Page not found" });
    return res.json(row.value);
  } catch (err) {
    console.error("Page config error:", err);
    return res.status(500).json({ error: "Failed to fetch page config" });
  }
});

router.put("/cms/pages/:page", requireCmsAuth, async (req, res) => {
  try {
    const page = req.params.page;
    const key = `page_${page}`;
    const [existing] = await db.select().from(cmsConfigsTable).where(eq(cmsConfigsTable.key, key));

    if (existing) {
      await db.update(cmsConfigsTable).set({ value: req.body, updatedAt: new Date() }).where(eq(cmsConfigsTable.key, key));
    } else {
      await db.insert(cmsConfigsTable).values({ key, value: req.body });
    }
    return res.json({ success: true, config: req.body });
  } catch (err) {
    console.error("Update page config error:", err);
    return res.status(500).json({ error: "Failed to update page config" });
  }
});

router.get("/public/predictions", async (req, res) => {
  try {
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 50));
    const offset = Math.max(0, Number(req.query.offset) || 0);

    const conditions: any[] = [eq(predictionsTable.editorialStatus, "approved")];
    if (category) conditions.push(eq(predictionsTable.category, category));
    if (search?.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      conditions.push(
        sql`(LOWER(question) LIKE ${term} OR LOWER(category) LIKE ${term} OR LOWER(resolves_at) LIKE ${term} OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(tags) t WHERE LOWER(t) LIKE ${term}))`
      );
    }

    const items = await db
      .select()
      .from(predictionsTable)
      .where(and(...conditions))
      .orderBy(desc(predictionsTable.updatedAt))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await db
      .select({ count: count() })
      .from(predictionsTable)
      .where(and(...conditions));

    return res.json({ items: items.map(toPredictionPublicResponse), total: totalResult.count });
  } catch (err) {
    console.error("Public predictions error:", err);
    return res.status(500).json({ error: "Failed to fetch predictions" });
  }
});

router.get("/public/predictions/:id", async (req, res) => {
  try {
    const [item] = await db.select().from(predictionsTable).where(
      and(eq(predictionsTable.id, Number(req.params.id)), eq(predictionsTable.editorialStatus, "approved"))
    );
    if (!item) return res.status(404).json({ error: "Not found" });
    return res.json(toPredictionPublicResponse(item));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch prediction" });
  }
});

router.get("/public/pulse-topics", async (_req, res) => {
  try {
    const items = await db
      .select()
      .from(pulseTopicsTable)
      .where(eq(pulseTopicsTable.editorialStatus, "approved"))
      .orderBy(asc(pulseTopicsTable.sortOrder));
    return res.json({ items });
  } catch (err) {
    console.error("Public pulse topics error:", err);
    return res.status(500).json({ error: "Failed to fetch pulse topics" });
  }
});

router.get("/public/homepage", async (_req, res) => {
  try {
    const [row] = await db.select().from(cmsConfigsTable).where(eq(cmsConfigsTable.key, "homepage"));
    if (!row) return res.json({});
    return res.json(row.value);
  } catch (err) {
    console.error("Public homepage error:", err);
    return res.status(500).json({ error: "Failed to fetch homepage config" });
  }
});

router.get("/public/page-config/:page", async (req, res) => {
  try {
    const [row] = await db.select().from(cmsConfigsTable).where(eq(cmsConfigsTable.key, `page_${req.params.page}`));
    if (!row) return res.status(404).json({ error: "Page not found" });
    return res.json(row.value);
  } catch (err) {
    console.error("Public page config error:", err);
    return res.status(500).json({ error: "Failed to fetch page config" });
  }
});

router.get("/public/design-tokens", async (_req, res) => {
  try {
    const items = await db.select().from(designTokensTable).orderBy(asc(designTokensTable.sortOrder));
    return res.json({ items });
  } catch (err) {
    console.error("Public design tokens error:", err);
    return res.status(500).json({ error: "Failed to fetch design tokens" });
  }
});

// Seeded pseudo-random for deterministic trend generation per prediction
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 12345) & 0x7fffffff;
    return (s & 0xffff) / 0xffff;
  };
}

function generateSyntheticTrend(predictionId: number, targetYes: number): number[] {
  const rng = seededRandom(predictionId * 31 + 7);
  const points: number[] = [];
  let current = 50; // Start from neutral
  for (let i = 0; i < 12; i++) {
    // Gradually trend toward current yes%, with random noise
    const pull = (targetYes - current) * 0.15;
    const noise = (rng() - 0.5) * 6; // ±3% noise
    current = Math.max(5, Math.min(95, current + pull + noise));
    points.push(Math.round(current));
  }
  // Ensure last point lands close to actual percentage
  points[11] = targetYes;
  return points;
}

function toPredictionPublicResponse(item: any) {
  const dummyTotal = item.dummyTotalCount ?? 0;
  const dummyResults: Record<string, number> = item.dummyOptionResults ?? {}; // raw counts
  const realPcts: Record<string, number> = item.optionResults ?? {}; // percentages
  const realTotal = item.totalCount ?? 0;
  const combinedTotal = realTotal + dummyTotal;

  // Convert real percentages to approximate counts, then add dummy raw counts
  const allOptions = item.options || ["yes", "no"];
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

  const combinedYes = combinedPcts["yes"] ?? combinedPcts[allOptions[0]] ?? item.yesPercentage;

  // Generate synthetic trend data if DB has none
  let trendData: number[] = item.trendData;
  if (!trendData || !Array.isArray(trendData) || trendData.length === 0) {
    trendData = generateSyntheticTrend(item.id, combinedYes);
  }

  // Compute momentum from trend data (last point vs 5 steps back)
  let momentum = item.momentum ?? 0;
  let momentumDirection = item.momentumDirection ?? "up";
  if (trendData.length >= 6) {
    const recent = trendData[trendData.length - 1];
    const earlier = trendData[trendData.length - 6];
    momentum = parseFloat(Math.abs(recent - earlier).toFixed(1));
    momentumDirection = recent >= earlier ? "up" : "down";
  }

  return {
    ...item,
    totalCount: combinedTotal,
    yesPercentage: combinedYes,
    noPercentage: combinedPcts["no"] ?? combinedPcts[allOptions[1]] ?? item.noPercentage,
    optionResults: combinedPcts,
    trendData,
    momentum,
    momentumDirection,
    // Don't expose dummy fields publicly
    dummyTotalCount: undefined,
    dummyOptionResults: undefined,
  };
}

router.get("/predictions", async (req, res) => {
  try {
    const items = await db
      .select()
      .from(predictionsTable)
      .where(eq(predictionsTable.editorialStatus, "approved"))
      .orderBy(desc(predictionsTable.createdAt));
    return res.json({ items: items.map(toPredictionPublicResponse) });
  } catch (err) {
    console.error("Public predictions error:", err);
    return res.status(500).json({ error: "Failed to fetch predictions" });
  }
});

router.get("/predictions/:id", async (req, res) => {
  try {
    const [item] = await db.select().from(predictionsTable).where(
      and(eq(predictionsTable.id, Number(req.params.id)), eq(predictionsTable.editorialStatus, "approved"))
    );
    if (!item) return res.status(404).json({ error: "Not found" });
    return res.json(toPredictionPublicResponse(item));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch prediction" });
  }
});

router.get("/pulse-topics", async (_req, res) => {
  try {
    const items = await db
      .select()
      .from(pulseTopicsTable)
      .where(eq(pulseTopicsTable.editorialStatus, "approved"))
      .orderBy(asc(pulseTopicsTable.sortOrder));
    return res.json({ items });
  } catch (err) {
    console.error("Public pulse topics error:", err);
    return res.status(500).json({ error: "Failed to fetch pulse topics" });
  }
});

router.get("/homepage", async (_req, res) => {
  try {
    const [row] = await db.select().from(cmsConfigsTable).where(eq(cmsConfigsTable.key, "homepage"));
    if (!row) return res.json({});
    return res.json(row.value);
  } catch (err) {
    console.error("Public homepage error:", err);
    return res.status(500).json({ error: "Failed to fetch homepage config" });
  }
});

router.get("/page-config/:page", async (req, res) => {
  try {
    const [row] = await db.select().from(cmsConfigsTable).where(eq(cmsConfigsTable.key, `page_${req.params.page}`));
    if (!row) return res.status(404).json({ error: "Page not found" });
    return res.json(row.value);
  } catch (err) {
    console.error("Public page config error:", err);
    return res.status(500).json({ error: "Failed to fetch page config" });
  }
});

router.get("/design-tokens", async (_req, res) => {
  try {
    const items = await db.select().from(designTokensTable).orderBy(asc(designTokensTable.sortOrder));
    return res.json({ items });
  } catch (err) {
    console.error("Public design tokens error:", err);
    return res.status(500).json({ error: "Failed to fetch design tokens" });
  }
});

router.get("/public/site-settings", async (_req, res) => {
  try {
    const [row] = await db.select().from(cmsConfigsTable).where(eq(cmsConfigsTable.key, "site_settings"));
    if (!row) return res.json({});
    return res.json(row.value);
  } catch (err) {
    console.error("Public site settings error:", err);
    return res.status(500).json({ error: "Failed to fetch site settings" });
  }
});

router.get("/site-settings", async (_req, res) => {
  try {
    const [row] = await db.select().from(cmsConfigsTable).where(eq(cmsConfigsTable.key, "site_settings"));
    if (!row) return res.json({});
    return res.json(row.value);
  } catch (err) {
    console.error("Public site settings error:", err);
    return res.status(500).json({ error: "Failed to fetch site settings" });
  }
});

router.get("/public/live-counts", async (_req, res) => {
  try {
    const [debateCount] = await db.select({ count: count() }).from(pollsTable).where(eq(pollsTable.editorialStatus, "approved"));
    const [predictionCount] = await db.select({ count: count() }).from(predictionsTable).where(eq(predictionsTable.editorialStatus, "approved"));
    const [pulseCount] = await db.select({ count: count() }).from(pulseTopicsTable).where(eq(pulseTopicsTable.editorialStatus, "approved"));
    const [voiceCount] = await db.select({ count: count() }).from(profilesTable).where(eq(profilesTable.editorialStatus, "approved"));
    const [voteCount] = await db.select({ count: count() }).from(votesTable);

    return res.json({
      debates: debateCount.count,
      predictions: predictionCount.count,
      pulseTopics: pulseCount.count,
      voices: voiceCount.count,
      totalVotes: voteCount.count,
    });
  } catch (err) {
    console.error("Live counts error:", err);
    return res.status(500).json({ error: "Failed to fetch live counts" });
  }
});

router.get("/live-counts", async (_req, res) => {
  try {
    const [debateCount] = await db.select({ count: count() }).from(pollsTable).where(eq(pollsTable.editorialStatus, "approved"));
    const [predictionCount] = await db.select({ count: count() }).from(predictionsTable).where(eq(predictionsTable.editorialStatus, "approved"));
    const [pulseCount] = await db.select({ count: count() }).from(pulseTopicsTable).where(eq(pulseTopicsTable.editorialStatus, "approved"));
    const [voiceCount] = await db.select({ count: count() }).from(profilesTable).where(eq(profilesTable.editorialStatus, "approved"));
    const [voteCount] = await db.select({ count: count() }).from(votesTable);

    return res.json({
      debates: debateCount.count,
      predictions: predictionCount.count,
      pulseTopics: pulseCount.count,
      voices: voiceCount.count,
      totalVotes: voteCount.count,
    });
  } catch (err) {
    console.error("Live counts error:", err);
    return res.status(500).json({ error: "Failed to fetch live counts" });
  }
});

router.get("/cms/site-settings", requireCmsAuth, async (_req, res) => {
  try {
    const [row] = await db.select().from(cmsConfigsTable).where(eq(cmsConfigsTable.key, "site_settings"));
    if (!row) return res.json({});
    return res.json(row.value);
  } catch (err) {
    console.error("Site settings error:", err);
    return res.status(500).json({ error: "Failed to fetch site settings" });
  }
});

router.put("/cms/site-settings", requireCmsAuth, async (req, res) => {
  try {
    const [existing] = await db.select().from(cmsConfigsTable).where(eq(cmsConfigsTable.key, "site_settings"));
    if (existing) {
      await db.update(cmsConfigsTable).set({ value: req.body, updatedAt: new Date() }).where(eq(cmsConfigsTable.key, "site_settings"));
    } else {
      await db.insert(cmsConfigsTable).values({ key: "site_settings", value: req.body });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("Update site settings error:", err);
    return res.status(500).json({ error: "Failed to update site settings" });
  }
});

// ── DUMMY VOTES: Boost endpoints ──

router.post("/cms/boost", requireCmsAuth, async (req, res) => {
  try {
    const { scope, category } = req.body; // scope: "all" | "category", category: string (when scope=category)

    // Get all approved polls, optionally filtered by category
    const conditions: any[] = [eq(pollsTable.editorialStatus, "approved")];
    if (scope === "category" && category) {
      conditions.push(eq(pollsTable.category, category));
    }

    const polls = await db.select({ id: pollsTable.id }).from(pollsTable).where(and(...conditions));
    const pollIds = polls.map(p => p.id);

    if (pollIds.length > 0) {
      // Boost each option's dummy count by 2-10% of current combined total
      const allOptions = await db.select().from(pollOptionsTable).where(inArray(pollOptionsTable.pollId, pollIds));

      for (const opt of allOptions) {
        const currentTotal = opt.voteCount + (opt.dummyVoteCount ?? 0);
        const boostPct = 2 + Math.random() * 8; // 2-10%
        const boost = Math.max(1, Math.round(currentTotal * boostPct / 100));
        await db.update(pollOptionsTable)
          .set({ dummyVoteCount: sql`COALESCE(dummy_vote_count, 0) + ${boost}` })
          .where(eq(pollOptionsTable.id, opt.id));
      }
    }

    // Boost predictions too
    const predConditions: any[] = [eq(predictionsTable.editorialStatus, "approved")];
    if (scope === "category" && category) {
      predConditions.push(eq(predictionsTable.category, category));
    }

    const predictions = await db.select().from(predictionsTable).where(and(...predConditions));

    for (const pred of predictions) {
      const currentTotal = pred.totalCount + (pred.dummyTotalCount ?? 0);
      const boostPct = 2 + Math.random() * 8;
      const boost = Math.max(1, Math.round(currentTotal * boostPct / 100));

      const opts = pred.options || ["yes", "no"];
      const existingDummy: Record<string, number> = (pred.dummyOptionResults as Record<string, number>) ?? {};

      // Distribute boost across options proportionally to existing dummy ratios
      const newDummy: Record<string, number> = { ...existingDummy };
      let remaining = boost;
      for (let i = 0; i < opts.length; i++) {
        const share = i === opts.length - 1 ? remaining : Math.round(boost * (1 / opts.length));
        newDummy[opts[i]] = (newDummy[opts[i]] ?? 0) + share;
        remaining -= share;
      }

      await db.update(predictionsTable)
        .set({
          dummyTotalCount: sql`COALESCE(dummy_total_count, 0) + ${boost}`,
          dummyOptionResults: newDummy,
        })
        .where(eq(predictionsTable.id, pred.id));
    }

    return res.json({
      success: true,
      boostedPolls: pollIds.length,
      boostedPredictions: predictions.length,
    });
  } catch (err) {
    console.error("Boost error:", err);
    return res.status(500).json({ error: "Failed to boost votes" });
  }
});

// Get available categories for boost UI
router.get("/cms/boost/categories", requireCmsAuth, async (_req, res) => {
  try {
    const debateCats = await db
      .select({ category: pollsTable.category, count: count() })
      .from(pollsTable)
      .where(eq(pollsTable.editorialStatus, "approved"))
      .groupBy(pollsTable.category);

    return res.json({
      categories: debateCats.map(c => ({ name: c.category, count: c.count })).sort((a, b) => a.name.localeCompare(b.name)),
    });
  } catch (err) {
    console.error("Boost categories error:", err);
    return res.status(500).json({ error: "Failed to fetch categories" });
  }
});

export default router;
