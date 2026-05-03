import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import {
  db,
  pollsTable,
  pollOptionsTable,
  predictionsTable,
  profilesTable,
  cmsConfigsTable,
  pulseTopicsTable,
} from "@workspace/db";
import { eq, desc, sql, count } from "drizzle-orm";

const router: IRouter = Router();

const chatbotRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many messages, please try again later" },
});

// ── Platform context cache (60 seconds) ──────────────────────────
interface PlatformContext {
  debateCount: number;
  predictionCount: number;
  voiceCount: number;
  pulseCount: number;
  totalVotes: number;
  topDebates: Array<{ id: number; question: string; category: string; totalVotes: number }>;
  topPredictions: Array<{ id: number; question: string; category: string; yesPercentage: number }>;
  featuredVoices: Array<{ id: number; name: string; role: string; company: string | null }>;
  majlisEnabled: boolean;
}

let contextCache: { data: PlatformContext; expiresAt: number } | null = null;
const CONTEXT_TTL_MS = 60_000;

async function getPlatformContext(): Promise<PlatformContext> {
  if (contextCache && contextCache.expiresAt > Date.now()) {
    return contextCache.data;
  }

  try {
    const [
      [debateCountRow],
      [predictionCountRow],
      [voiceCountRow],
      [pulseCountRow],
      siteSettingsRow,
    ] = await Promise.all([
      db.select({ count: count() }).from(pollsTable).where(eq(pollsTable.editorialStatus, "approved")),
      db.select({ count: count() }).from(predictionsTable).where(eq(predictionsTable.editorialStatus, "approved")),
      db.select({ count: count() }).from(profilesTable).where(eq(profilesTable.editorialStatus, "approved")),
      db.select({ count: count() }).from(pulseTopicsTable).where(eq(pulseTopicsTable.editorialStatus, "approved")),
      db.select().from(cmsConfigsTable).where(eq(cmsConfigsTable.key, "site_settings")),
    ]);

    // Total votes = real + dummy, across all approved polls and predictions
    const [voteTotalRow] = await db.select({
      total: sql<number>`COALESCE(SUM(vote_count), 0) + COALESCE(SUM(dummy_vote_count), 0)`,
    }).from(pollOptionsTable);

    const [predVoteTotalRow] = await db.select({
      total: sql<number>`COALESCE(SUM(total_count), 0) + COALESCE(SUM(dummy_total_count), 0)`,
    }).from(predictionsTable).where(eq(predictionsTable.editorialStatus, "approved"));

    const totalVotes = Number(voteTotalRow.total) + Number(predVoteTotalRow.total);

    // Top 5 trending debates (by combined vote count)
    const topDebatesRaw = await db
      .select({
        id: pollsTable.id,
        question: pollsTable.question,
        category: pollsTable.category,
      })
      .from(pollsTable)
      .where(eq(pollsTable.editorialStatus, "approved"))
      .orderBy(desc(sql`(SELECT SUM(vote_count + COALESCE(dummy_vote_count, 0)) FROM poll_options WHERE poll_id = polls.id)`))
      .limit(5);

    const topDebates = await Promise.all(
      topDebatesRaw.map(async (d) => {
        const opts = await db.select().from(pollOptionsTable).where(eq(pollOptionsTable.pollId, d.id));
        const total = opts.reduce((s, o) => s + o.voteCount + (o.dummyVoteCount ?? 0), 0);
        return { id: d.id, question: d.question, category: d.category, totalVotes: total };
      })
    );

    // Top 5 predictions by engagement
    const topPredictionsRaw = await db
      .select({
        id: predictionsTable.id,
        question: predictionsTable.question,
        category: predictionsTable.category,
        yesPercentage: predictionsTable.yesPercentage,
      })
      .from(predictionsTable)
      .where(eq(predictionsTable.editorialStatus, "approved"))
      .orderBy(desc(sql`total_count + COALESCE(dummy_total_count, 0)`))
      .limit(5);

    // 3 featured voices
    const featuredVoicesRaw = await db
      .select({
        id: profilesTable.id,
        name: profilesTable.name,
        role: profilesTable.role,
        company: profilesTable.company,
      })
      .from(profilesTable)
      .where(eq(profilesTable.editorialStatus, "approved"))
      .orderBy(desc(profilesTable.isFeatured), desc(profilesTable.viewCount))
      .limit(3);

    const siteSettings = siteSettingsRow[0]?.value as Record<string, any> | undefined;
    const majlisEnabled = siteSettings?.featureToggles?.majlis?.enabled ?? false;

    const data: PlatformContext = {
      debateCount: Number(debateCountRow.count),
      predictionCount: Number(predictionCountRow.count),
      voiceCount: Number(voiceCountRow.count),
      pulseCount: Number(pulseCountRow.count),
      totalVotes,
      topDebates,
      topPredictions: topPredictionsRaw,
      featuredVoices: featuredVoicesRaw,
      majlisEnabled,
    };

    contextCache = { data, expiresAt: Date.now() + CONTEXT_TTL_MS };
    return data;
  } catch (err) {
    console.error("[CHATBOT] Failed to load platform context:", err);
    // Return minimal fallback
    return {
      debateCount: 0,
      predictionCount: 0,
      voiceCount: 0,
      pulseCount: 0,
      totalVotes: 0,
      topDebates: [],
      topPredictions: [],
      featuredVoices: [],
      majlisEnabled: false,
    };
  }
}

function buildSystemPrompt(ctx: PlatformContext): string {
  const majlisSection = ctx.majlisEnabled
    ? "- Majlis: private invite-only chat for verified voices"
    : "";

  const topDebatesList = ctx.topDebates
    .slice(0, 5)
    .map((d) => `  • "${d.question}" (${d.totalVotes} votes) → /debates/${d.id}`)
    .join("\n");

  const topPredictionsList = ctx.topPredictions
    .slice(0, 5)
    .map((p) => `  • "${p.question}" (${p.yesPercentage}% YES) → /predictions/${p.id}`)
    .join("\n");

  const featuredVoicesList = ctx.featuredVoices
    .map((v) => `  • ${v.name} — ${v.role}${v.company ? ` at ${v.company}` : ""} → /voices/${v.id}`)
    .join("\n");

  return `you are noor — the tribunals AI guide.

## how you talk
- lowercase. short. like texting a sharp friend
- 1-2 sentences. max 3 if you really need to explain something
- no filler. no "certainly" no "I'd be happy to" no "great question"
- skip grammar perfection — crisp > correct
- drop links inline when pointing to stuff: [text](/path)
- if off-topic: "i only know tribunal stuff — want me to show you a trending debate?"

## links
- debates: [title](/debates/ID)
- predictions: [title](/predictions/ID)
- voices: [name](/voices/ID)
- pages: [Debates](/debates), [Predictions](/predictions), [Voices](/voices), [Pulse](/pulse)
always link when naming something specific

## what the tribunal is
opinion platform for 541M people across 19 MENA countries. anonymous voting, real people, no editorial agenda.

features:
- debates — polls on MENA issues, country breakdowns
- predictions — crowd forecasts, YES/NO with confidence tracking
- pulse — live trend cards across 8 categories
- voices — curated founders, operators, changemakers
${majlisSection}

## live stats
${ctx.debateCount} debates · ${ctx.predictionCount} predictions · ${ctx.voiceCount} voices · ${ctx.pulseCount} pulse topics · ${ctx.totalVotes.toLocaleString()} total votes

## trending debates
${topDebatesList || "(none)"}

## top predictions
${topPredictionsList || "(none)"}

## featured voices
${featuredVoicesList || "(none)"}

only reference content from the lists above. never invent debates/predictions/voices.`;
}

interface ChatMessage {
  role: string;
  content: string;
}

router.post("/chatbot/message", chatbotRateLimit, async (req, res) => {
  try {
    const { message, history, stream } = req.body as {
      message?: string;
      history?: ChatMessage[];
      stream?: boolean;
    };

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "message is required" });
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: "Message too long (max 2000 characters)" });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "Chatbot is not configured" });
    }

    const platformCtx = await getPlatformContext();
    const systemPrompt = buildSystemPrompt(platformCtx);

    const messages: { role: string; content: string }[] = [];
    if (Array.isArray(history)) {
      const recentHistory = history.slice(-20);
      for (const msg of recentHistory) {
        if (msg && typeof msg.role === "string" && typeof msg.content === "string" && (msg.role === "user" || msg.role === "assistant")) {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }
    messages.push({ role: "user", content: message.trim() });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 400,
        temperature: 0.7,
        system: systemPrompt,
        messages,
        stream: !!stream,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[CHATBOT] Claude API error:", response.status, errText);
      return res.status(502).json({ error: "Failed to get response from AI" });
    }

    // Streaming mode
    if (stream && response.body) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const body = response.body as any;
      const reader = typeof body.getReader === "function" ? body.getReader() : null;

      if (reader) {
        const decoder = new TextDecoder();
        let done = false;
        while (!done) {
          const result = await reader.read();
          done = result.done;
          if (result.value) {
            const chunk = decoder.decode(result.value, { stream: true });
            const lines = chunk.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const jsonStr = line.slice(6);
                if (jsonStr === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(jsonStr);
                  if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                    res.write(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`);
                  }
                  if (parsed.type === "message_stop") {
                    res.write(`data: [DONE]\n\n`);
                  }
                } catch {}
              }
            }
          }
        }
        res.end();
      } else if (body.pipe) {
        body.pipe(res);
      } else {
        res.end();
      }
      return;
    }

    // Non-streaming mode
    const data = (await response.json()) as {
      content?: { type: string; text?: string }[];
    };
    const text = data.content?.find((c) => c.type === "text")?.text ?? "hmm, couldn't generate a response — try again?";
    return res.json({ response: text });
  } catch (err) {
    console.error("[CHATBOT] Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
