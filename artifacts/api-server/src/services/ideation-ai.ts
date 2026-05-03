interface ResearchResult {
  topics: { title: string; summary: string; source: string }[];
  dataPoints: { fact: string; relevance: string }[];
  trends: string[];
}

interface GeneratedIdea {
  pillarType: string;
  title: string;
  content: Record<string, unknown>;
}

interface RiskFlag {
  type: string;
  description: string;
}

interface SafetyReview {
  level: string;
  flags: RiskFlag[];
}

interface RefinedContent {
  [key: string]: unknown;
}

interface ResearchConfig {
  categories: string[];
  tags: string[];
  regions: string[];
}

interface GenerationConfig {
  pillarType?: string;
  mode: string;
  batchSize: number;
  pillarCounts?: { debates: number; predictions: number; pulse: number };
  promptTemplate: string;
  exclusionList: string[];
  guardrails?: string[];
  categories?: string[];
  tags?: string[];
  researchData: ResearchResult | Record<string, unknown>;
}

interface RefinementConfig {
  pillarType: string;
  idea: GeneratedIdea;
}

async function callPerplexity(prompt: string): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    return generateMockResearch(prompt);
  }

  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        { role: "system", content: "You are a MENA-focused research analyst. Return ONLY valid JSON. Focus on verifiable facts from the past 7 days. Include specific numbers, named sources, and dates. Prioritize breaking news, policy changes, funding rounds, and market data from the Middle East and North Africa." },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      search_recency_filter: "week",
    }),
  });

  if (!res.ok) {
    console.error("Perplexity API error:", res.status, await res.text());
    return generateMockResearch(prompt);
  }

  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? generateMockResearch(prompt);
}

async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; max_tokens?: number },
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return generateMockContent(userPrompt);
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: options?.max_tokens ?? 4096,
      temperature: options?.temperature ?? 0.3,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    console.error("Claude API error:", res.status, await res.text());
    return generateMockContent(userPrompt);
  }

  const data = await res.json() as { content?: { text?: string }[] };
  return data.content?.[0]?.text ?? generateMockContent(userPrompt);
}

function generateMockResearch(_prompt: string): string {
  return JSON.stringify({
    topics: [
      { title: "Gulf Tech Investment Surge", summary: "Record venture capital flowing into MENA tech startups, with Saudi Arabia and UAE leading the charge.", source: "Industry Reports 2026" },
      { title: "AI Adoption in Government Services", summary: "Multiple Gulf states implementing AI-driven citizen services platforms.", source: "Government Tech Weekly" },
      { title: "Sustainable City Projects", summary: "Major green building and renewable energy developments across the region.", source: "MENA Construction News" },
      { title: "Creator Economy Growth", summary: "Middle East content creators seeing 300% growth in sponsorship deals.", source: "Digital Media Report" },
      { title: "Fintech Revolution", summary: "Open banking regulations driving innovation across GCC markets.", source: "Banking & Finance MENA" },
    ],
    dataPoints: [
      { fact: "MENA startup funding reached $3.2B in Q1 2026", relevance: "Shows accelerating investment trends" },
      { fact: "UAE AI strategy targeting 50% government service automation by 2028", relevance: "Major policy shift driving tech adoption" },
      { fact: "Saudi entertainment sector grew 45% year-over-year", relevance: "Cultural transformation accelerating" },
    ],
    trends: [
      "AI-native startups displacing traditional businesses",
      "Cross-border MENA collaboration increasing",
      "Youth entrepreneurship programs scaling rapidly",
      "Sustainability becoming a competitive advantage",
      "Digital nomad visa programs attracting global talent",
    ],
  });
}

function generateMockContent(_prompt: string): string {
  return "MOCK_RESPONSE";
}

function generateMockIdeas(config: GenerationConfig): GeneratedIdea[] {
  const debateTemplates = [
    { title: "Lebanon's brain drain is killing the country faster than the economic crisis.", content: { question: "Lebanon's brain drain is killing the country faster than the economic crisis.", context: "Lebanon lost 50% of its physicians, 40% of engineers, 30% of academics. Skilled emigration accelerating since 2019. A country losing its future, one visa at a time.", options: ["It's already too late — the talent is gone", "They'll come back when the economy stabilizes", "The diaspora IS Lebanon's economy now", "Brain drain is overhyped — resilience runs deep"] } },
    { title: "Libya has Africa's largest oil reserves and can't keep its lights on.", content: { question: "Libya has Africa's largest oil reserves and can't keep its lights on.", context: "1.2M barrels/day but power cuts last 12+ hours. $22B oil revenue but no transparent allocation. Wealth without welfare.", options: ["Classic resource curse — seen this movie before", "Stability is coming, give it time", "Foreign interference is the real problem", "Libyans will figure it out without outside help"] } },
    { title: "Women in MENA are the most underutilized economic resource on earth.", content: { question: "Women in MENA are the most underutilized economic resource on earth.", context: "Saudi jumped 17% to 33% in 6 years — fastest G20 rise ever. But Yemen is at 6%. MENA's GDP could grow 57% with full parity.", options: ["Absolutely — it's the region's biggest missed opportunity", "Progress is happening faster than people think", "Cultural change can't be forced by economics", "The numbers don't tell the full story"] } },
    { title: "MENA's private school boom is creating education apartheid.", content: { question: "MENA's private school boom is creating education apartheid.", context: "Gulf private schools charge $30,000+/year. Public schools in Egypt spend $300/student. The class divide starts at age 5.", options: ["This is how inequality gets baked in for generations", "Private schools raise the bar for everyone", "Fix public schools instead of blaming private ones", "Education quality matters more than who pays for it"] } },
    { title: "Sportswashing works — that's why they keep doing it.", content: { question: "Sportswashing works — that's why they keep doing it.", context: "LIV Golf, Newcastle FC, PSG, F1, World Cup — $75B+ spent. Saudi Arabia went from pariah to vacation destination. Outrage fades. Brand value remains.", options: ["It works and everyone knows it — that's the uncomfortable truth", "Sports investment ≠ sportswashing, stop conflating them", "Short-term PR, long-term credibility problem", "Every country does soft power — only MENA gets called out"] } },
  ];

  const predictionTemplates = [
    { title: "Saudi Arabia's non-oil GDP will exceed 50% of total GDP by end of 2027", content: { question: "Saudi Arabia's non-oil GDP will exceed 50% of total GDP by end of 2027", category: "Economy & Finance", resolvesAt: "2027-12-31", options: ["Already on track — Vision 2030 is delivering", "Close but they'll miss by a year or two", "Oil dependency runs too deep to shift that fast", "The numbers will say 50% but the economy won't feel it"] } },
    { title: "Morocco's Casablanca Finance City will host 250+ international financial firms", content: { question: "Morocco's Casablanca Finance City will host 250+ international financial firms", category: "Economy & Finance", resolvesAt: "2027-06-30", options: ["Absolutely — Morocco is the gateway to Africa", "They'll get close but 250 is ambitious", "Dubai and Riyadh will keep stealing the spotlight", "Depends entirely on EU trade deals"] } },
    { title: "UAE will deploy AI in 50%+ of federal government services", content: { question: "UAE will deploy AI in 50%+ of federal government services", category: "Technology & AI", resolvesAt: "2028-06-30", options: ["If any country can do it, it's the UAE", "Deployed yes, actually working — different question", "Government AI is mostly marketing right now", "They'll exceed 50% before the deadline"] } },
    { title: "Egypt's Ras El-Hekma megaproject will attract $10B+ in foreign investment", content: { question: "Egypt's Ras El-Hekma megaproject will attract $10B+ in foreign investment", category: "Infrastructure & Cities", resolvesAt: "2028-12-31", options: ["The ADQ deal already proves the appetite is there", "Mega-projects in Egypt always over-promise", "Gulf money will flow but Western investors won't", "Depends on whether Egypt stabilizes the pound first"] } },
    { title: "Jordan's water deficit will exceed 50% of national demand", content: { question: "Jordan's water deficit will exceed 50% of national demand", category: "Energy & Climate", resolvesAt: "2027-12-31", options: ["It's already a crisis — this is just making it official", "Desalination projects will close the gap in time", "Climate change makes this inevitable for the whole region", "Jordan's been managing scarcity for decades — they'll adapt"] } },
  ];

  const pulseTemplates = [
    { title: "Billionaire Wealth vs. GDP", content: { title: "Billionaire Wealth vs. GDP", stat: "$186B", delta: "+41%", direction: "up", blurb: "The 10 richest Arabs hold more than the GDP of Jordan, Lebanon, Tunisia, Libya, and Yemen combined.", source: "Forbes MENA Rich List 2026 / World Bank" } },
    { title: "Surveillance Tech Spending", content: { title: "Surveillance Tech Spending", stat: "$4.8B", delta: "+62% since 2021", direction: "up", blurb: "MENA is the world's #1 buyer of spyware — UAE deployed Pegasus against its own citizens.", source: "Citizen Lab / Amnesty International" } },
    { title: "Water Scarcity Emergency", content: { title: "Water Scarcity Emergency", stat: "12 of 19 countries", delta: "Below crisis threshold", direction: "down", blurb: "MENA has 1% of the world's freshwater but 6% of its population.", source: "World Resources Institute / FAO" } },
    { title: "Press Freedom Collapse", content: { title: "Press Freedom Collapse", stat: "17 of 19 countries", delta: "Worst region globally", direction: "down", blurb: "More journalists jailed in MENA than any other region — silence is the editorial policy.", source: "RSF / Freedom House 2026" } },
    { title: "Mental Health Crisis", content: { title: "Mental Health Crisis", stat: "1 per 250,000", delta: "Lowest globally", direction: "down", blurb: "Egypt has 1 psychiatrist per 250,000 people — suicide is illegal in 12 MENA countries.", source: "WHO / Lancet Psychiatry" } },
  ];

  const allTemplates: Record<string, GeneratedIdea[]> = {
    debates: debateTemplates.map(t => ({ pillarType: "debates", ...t })),
    predictions: predictionTemplates.map(t => ({ pillarType: "predictions", ...t })),
    pulse: pulseTemplates.map(t => ({ pillarType: "pulse", ...t })),
  };

  const ideas: GeneratedIdea[] = [];

  if (config.mode === "focused" && config.pillarType) {
    const templates = allTemplates[config.pillarType] || allTemplates.debates;
    for (let i = 0; i < config.batchSize; i++) {
      ideas.push({ ...templates[i % templates.length], title: `${templates[i % templates.length].title}` });
    }
  } else if (config.pillarCounts) {
    const pc = config.pillarCounts;
    for (const [pillar, count] of Object.entries(pc)) {
      const templates = allTemplates[pillar] || allTemplates.debates;
      for (let i = 0; i < count; i++) {
        ideas.push({ ...templates[i % templates.length] });
      }
    }
  } else {
    const pillars = ["debates", "predictions", "pulse"];
    const perPillar = Math.ceil(config.batchSize / 3);
    for (const pillar of pillars) {
      const templates = allTemplates[pillar];
      for (let i = 0; i < perPillar && ideas.length < config.batchSize; i++) {
        ideas.push({ ...templates[i % templates.length] });
      }
    }
  }

  return ideas;
}

function generateMockSafetyReview(): SafetyReview {
  const riskLevels = ["low", "low", "low", "medium", "low"];
  const level = riskLevels[Math.floor(Math.random() * riskLevels.length)];

  const possibleFlags: RiskFlag[] = [
    { type: "political_sensitivity", description: "Topic touches on inter-state relations" },
    { type: "factual_concern", description: "Claims may need verification" },
    { type: "sentiment_risk", description: "Could polarize audience" },
  ];

  const flags = level === "low" ? [] :
    level === "medium" ? [possibleFlags[Math.floor(Math.random() * possibleFlags.length)]] :
    possibleFlags.slice(0, 2);

  return { level, flags };
}

export async function runResearch(config: ResearchConfig): Promise<ResearchResult> {
  const today = new Date().toISOString().split("T")[0];
  const prompt = `Today is ${today}. Find the most important MENA news and data from the past 7 days.

Focus areas: ${config.categories.join(", ") || "business, technology, culture, politics, economy"}
Tags: ${config.tags.join(", ") || "any"}
Regions: ${config.regions.join(", ") || "MENA region broadly"}

Return a JSON object with:
- "topics": array of {title, summary, source} for 5-8 BREAKING or trending stories. Each summary must be 1 sentence with a specific fact or number.
- "dataPoints": array of {fact, relevance} for 3-5 data points. Each fact must include a specific number and named source.
- "trends": array of 5 trend strings — each must be a specific, debatable claim (not vague platitudes)

Return ONLY valid JSON.`;

  const result = await callPerplexity(prompt);
  try {
    return JSON.parse(result);
  } catch {
    return JSON.parse(generateMockResearch(prompt));
  }
}

export async function runGeneration(config: GenerationConfig): Promise<GeneratedIdea[]> {
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

  if (!hasApiKey) {
    return generateMockIdeas(config);
  }

  const systemPrompt = config.promptTemplate || `You are a content ideation engine for "The Middle East Hustle", a platform covering business, technology, and culture in the MENA region. Generate engaging, thought-provoking content ideas.`;

  const exclusionNote = config.exclusionList.length > 0
    ? `\n\nEXCLUSION LIST — Do NOT generate ideas about these topics/phrases:\n${config.exclusionList.map(e => `- ${e}`).join("\n")}`
    : "";

  const guardrailNote = config.guardrails && config.guardrails.length > 0
    ? `\n\nCONTENT GUARDRAILS — You MUST follow these rules:\n${config.guardrails.map(g => `- ${g}`).join("\n")}`
    : "";

  const focusNote = (config.categories?.length || config.tags?.length)
    ? `\n\nEDITORIAL FOCUS — Prioritize ideas in these areas:\nCategories: ${config.categories?.join(", ") || "any"}\nThemes/Tags: ${config.tags?.join(", ") || "any"}`
    : "";

  const researchContext = `Research data:\n${JSON.stringify(config.researchData, null, 2)}`;

  const pillarInstructions: Record<string, string> = {
    debates: `Generate debate ideas. Each must have: title (string, 8-15 words, a DECLARATIVE ASSERTION using superlatives or comparison — NOT a neutral question), content with {question (string — same as title), context (string, EXACTLY 2-4 sentences: [shocking stat with hard number] + [comparative number showing disparity] + [poetic kicker 3-7 words]. Target ~150 chars. Every sentence must contain a specific number, name, or date. End with a gut-punch fragment, not a full sentence.), options (array of EXACTLY 4 strings — NOT "Yes"/"No". Each option must be a relatable, opinionated stance that feels personal. Think first-person reactions people actually have: "It's already too late", "Progress is happening faster than people think", "The numbers don't tell the full story". Options should cover: a strong agree, a strong disagree, a nuanced middle, and a contrarian/unexpected take. Keep each option under 12 words.)}.
QUALITY GATES: Reject any idea where (1) context has no specific numbers, (2) title is a neutral question rather than a provocative assertion, (3) context exceeds 200 characters, (4) the kicker is missing, or (5) options are generic "Yes"/"No"/"Maybe"/"I don't know".`,
    predictions: `Generate prediction market questions. Each must have: title (string, same as question), content with {question (string, a SPECIFIC MILESTONE with a threshold number and named entity — e.g., "Morocco's Casablanca Finance City will host 250+ international financial firms"), category (string from: Economy & Finance, Technology & AI, Energy & Climate, Geopolitics & Governance, Infrastructure & Cities, Education & Workforce, Health & Demographics, Culture & Society, Sports & Entertainment), resolvesAt (ISO date string, 12-36 months from now), options (array of EXACTLY 4 strings — NOT "Yes"/"No". Each option must be a nuanced position on the prediction's likelihood. Think informed takes people actually hold: "Already on track — it's inevitable", "Close but they'll miss the deadline", "The whole premise is flawed", "Depends entirely on X factor". Cover: confident yes, conditional yes, skeptical no, and a wildcard/contrarian take. Keep each under 12 words.)}.
QUALITY GATES: Reject any prediction where (1) there's no specific threshold number, (2) the entity is vague ("a MENA country" instead of naming it), (3) resolution is obvious (>90% or <10% probability), or (4) options are generic "Yes"/"No"/"Maybe".`,
    pulse: `Generate pulse/stat cards. Each must have: title (string, max 5 words — punchy label like "Billionaire Wealth vs. GDP" or "Press Freedom Collapse"), content with {title (string, same), stat (string — a specific number/ratio: "$4.8B" or "17 of 19 countries" or "1 in 5 girls"), delta (string — change indicator: "+62% since 2021" or "Highest globally" or "Death penalty in 6"), direction ("up"|"down"), blurb (string, ONE sentence max ~20 words — editorial interpretation with juxtaposition or benchmark comparison, ending with punch), source (string — named institutional source with year)}.
QUALITY GATES: Reject any card where (1) the stat is vague ("millions" instead of "42 Million"), (2) the blurb just restates the stat, or (3) the source is generic ("reports" instead of a named institution).`,
  };

  let pillarPrompt: string;
  let totalCount = config.batchSize;

  if (config.mode === "focused" && config.pillarType) {
    pillarPrompt = pillarInstructions[config.pillarType] || pillarInstructions.debates;
  } else if (config.pillarCounts) {
    const pc = config.pillarCounts;
    totalCount = pc.debates + pc.predictions + pc.pulse;
    pillarPrompt = `Generate ideas across pillars with these exact counts:\n- debates (${pc.debates} ideas): ${pillarInstructions.debates}\n- predictions (${pc.predictions} ideas): ${pillarInstructions.predictions}\n- pulse (${pc.pulse} ideas): ${pillarInstructions.pulse}`;
  } else {
    pillarPrompt = `Generate a mix of ideas across all three pillars:\n${Object.entries(pillarInstructions).map(([k, v]) => `${k}: ${v}`).join("\n")}`;
  }

  const userPrompt = `${researchContext}${focusNote}${exclusionNote}${guardrailNote}

${pillarPrompt}

Generate exactly ${totalCount} ideas. Return a JSON array of objects, each with: pillarType ("debates"|"predictions"|"pulse"), title (string), content (object matching the pillar schema).

CRITICAL QUALITY STANDARDS:
- Every context/blurb must contain at least 2 SPECIFIC numbers (dollar amounts, percentages, population counts, rankings)
- Use JUXTAPOSITION: pair wealth with poverty, growth with stagnation, connected with censored
- End debate contexts with a POETIC KICKER: a 3-7 word gut-punch fragment (e.g., "Two MENAs.", "Wealth without welfare.", "Stigma kills more than illness.")
- Titles are DECLARATIVE ASSERTIONS, not neutral questions
- Cover the full MENA region: Gulf, North Africa, Levant, Turkey, Iran — not just UAE and Saudi
- NO generic filler: "this raises important questions", "time will tell", "remains to be seen"
- OPTIONS must be dynamic, relatable, opinionated stances — NEVER "Yes"/"No"/"Maybe". Write options as things real people would actually say.

Return ONLY a valid JSON array.`;

  const result = await callClaude(systemPrompt, userPrompt, { temperature: 0.7, max_tokens: 4096 });
  try {
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(result);
  } catch {
    return generateMockIdeas(config);
  }
}

export async function runSafetyReview(ideas: GeneratedIdea[]): Promise<Map<number, SafetyReview>> {
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
  const reviews = new Map<number, SafetyReview>();

  if (!hasApiKey) {
    ideas.forEach((_, idx) => {
      reviews.set(idx, generateMockSafetyReview());
    });
    return reviews;
  }

  const systemPrompt = `You are a content safety reviewer for a Middle East business/culture platform. Analyze each content idea for potential risks including: sentiment harm, political sensitivity, factual concerns, and cultural sensitivity. Rate each as "low", "medium", or "high" risk.`;

  const userPrompt = `Review these content ideas for safety risks:\n${JSON.stringify(ideas, null, 2)}

Return a JSON array where each element has:
- index (number, 0-based)
- level ("low"|"medium"|"high")
- flags (array of {type: string, description: string})

Flag types: "sentiment_risk", "political_sensitivity", "factual_concern", "cultural_sensitivity"
Return ONLY valid JSON array.`;

  const result = await callClaude(systemPrompt, userPrompt, { temperature: 0.1, max_tokens: 2048 });
  try {
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(result);
    for (const review of parsed) {
      reviews.set(review.index, { level: review.level, flags: review.flags || [] });
    }
  } catch {
    ideas.forEach((_, idx) => {
      reviews.set(idx, generateMockSafetyReview());
    });
  }

  return reviews;
}

export async function runRefinement(config: RefinementConfig): Promise<RefinedContent> {
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

  if (!hasApiKey) {
    const base = config.idea.content;
    if (config.pillarType === "debates") {
      return {
        question: base.question || config.idea.title,
        context: base.context || "A pivotal question dividing MENA's business and policy elite. The stakes are real, the clock is ticking.",
        options: base.options || ["Strongly agree — this is undeniable", "Disagree — the data is misleading", "It's complicated — both sides have a point", "Asking the wrong question entirely"],
        category: "Technology & AI",
        tags: ["ai-generated", "mena"],
      };
    } else if (config.pillarType === "predictions") {
      return {
        question: base.question || config.idea.title,
        category: base.category || "Technology",
        resolvesAt: base.resolvesAt || new Date(Date.now() + 365 * 86400000).toISOString(),
        tags: ["ai-generated"],
      };
    } else {
      return {
        title: base.title || config.idea.title,
        stat: base.stat || "N/A",
        delta: base.delta || "0%",
        direction: base.direction || "up",
        blurb: base.blurb || "A data point that tells you more about the region than any headline.",
        source: base.source || "AI Generated",
      };
    }
  }

  const fieldSchemas: Record<string, string> = {
    debates: `{question: string (8-15 words — declarative assertion with superlative or comparison, NOT a neutral question), context: string (2-4 sentences, ~150 chars: [shocking stat] + [comparative number] + [poetic kicker 3-7 words]), options: string[] (exactly 4 relatable opinionated stances — NOT "Yes"/"No", each under 12 words, covering: strong agree, strong disagree, nuanced middle, contrarian take), category: string, tags: string[]}`,
    predictions: `{question: string (specific milestone with threshold number and named entity), category: string, resolvesAt: string (ISO date, 12-36 months out), options: string[] (exactly 4 nuanced positions — NOT "Yes"/"No", each under 12 words, covering: confident yes, conditional yes, skeptical no, contrarian wildcard), tags: string[]}`,
    pulse: `{title: string (max 5 words — punchy stat label), stat: string (specific number/ratio), delta: string (change indicator with timeframe), direction: "up"|"down", blurb: string (1 sentence, ~20 words — editorial punch with juxtaposition), source: string (named institution + year)}`,
  };

  const systemPrompt = `You are the senior editor at "The Middle East Hustle" — a sharp, data-driven platform covering MENA business, tech, and culture. Your job is to ELEVATE and TIGHTEN content to publication quality.

EDITORIAL IDENTITY:
- Bloomberg terminal meets Vice News — crisp, provocative, zero fluff
- Every claim must cite a specific number, name, or date
- End contexts and blurbs with a poetic kicker (3-7 word gut-punch fragment)

THE FORMULA YOU ENFORCE:
Debates: [DECLARATIVE ASSERTION] + [SHOCKING STAT] + [COMPARATIVE DATA] + [POETIC KICKER]
Pulse: [PUNCHY STAT] + [CONTEXTUAL DELTA] + [ONE-SENTENCE EDITORIAL PUNCH]
Predictions: [NAMED ENTITY] + [SPECIFIC THRESHOLD] + [REALISTIC TIMELINE]

QUALITY GATES — Flag and fix these:
1. No specific numbers in context/blurb → ADD real data points
2. Title is a neutral question → REFRAME as declarative assertion
3. Context is generic → ADD juxtaposition (wealth vs. poverty, growth vs. stagnation)
4. Missing poetic kicker → ADD a 3-7 word closing fragment
5. Prediction has no threshold → ADD a specific milestone number

HARD LIMITS:
- Debate context: 2-4 sentences, ~150 characters
- Pulse blurb: 1 sentence, ~20 words
- Prediction questions: specific milestone with number
- If the input is already sharp, make it sharper — do NOT pad it
- ALWAYS make output SHORTER than input, never longer`;

  const userPrompt = `ELEVATE this ${config.pillarType} idea to publication quality. Apply the formula and quality gates.

Input:
${JSON.stringify(config.idea, null, 2)}

Output schema: ${fieldSchemas[config.pillarType] || fieldSchemas.debates}

CHECKLIST before returning:
- [ ] Contains at least 2 specific numbers/data points?
- [ ] Title is a declarative assertion (not a question)?
- [ ] Context/blurb ends with a poetic kicker?
- [ ] Uses juxtaposition or comparison?
- [ ] Output is SHORTER than input?

Return ONLY valid JSON matching the schema.`;

  const result = await callClaude(systemPrompt, userPrompt, { temperature: 0.4, max_tokens: 1024 });
  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(result);
  } catch {
    return config.idea.content;
  }
}

export const DEFAULT_PROMPTS: Record<string, string> = {
  debates: `You are the ideation engine for "The Middle East Hustle" — Debates pillar.

VOICE: Bloomberg terminal meets Vice News. Every claim backed by a specific number. Every context ends with a poetic kicker (3-7 words).

STRUCTURAL FORMULA:
[DECLARATIVE ASSERTION as title] + [SHOCKING STAT] + [COMPARATIVE NUMBER showing disparity] + [HUMAN CONSEQUENCE] + [POETIC KICKER]

FRAMING TECHNIQUES (rotate these):
- Contradiction: "Richest resources / Worst services"
- Paradox: "Silicon Valley outsourcing through occupation"
- Hidden Cost: "The region's most expensive invisible tax"
- Superlative: "World's most X / Region's biggest Y"
- Time-Pressure: "50 years until X"

TITLE RULES:
- Declarative assertions, NOT neutral questions (e.g., "Libya has Africa's largest oil reserves and can't keep its lights on" NOT "Should Libya improve its power grid?")
- Use superlatives: most, biggest, fastest, worst
- Or comparison-based: "X proves you don't need Y to Z"
- Average ~11 words, max 15

CONTEXT RULES:
- EXACTLY 2-4 sentences, ~150 characters (~24 words)
- Sentence 1: Shocking statistic with a hard number
- Sentence 2-3: Comparative data point showing disparity or scale
- Final fragment: Poetic/emotional kicker (3-7 words)
- NO filler, NO hedging, NO "this raises questions"

OPTIONS RULES:
- EXACTLY 4 options per debate — NEVER "Yes" / "No" / "Maybe" / "I don't know"
- Each option is a relatable, opinionated STANCE that feels personal and first-person
- Options must cover 4 positions: (1) strong agree, (2) strong disagree, (3) nuanced middle ground, (4) contrarian/unexpected take
- Keep each option under 12 words
- Write them as things real people would actually say in conversation
- Good examples: "It's already too late — the talent is gone", "Progress is faster than people think", "Every country does this — only MENA gets called out"
- Bad examples: "Yes", "No", "Maybe", "I agree", "I disagree", "Not sure"

GOLD-STANDARD EXAMPLES:

1. Title: "Lebanon's brain drain is killing the country faster than the economic crisis."
   Context: "Lebanon lost 50% of its physicians, 40% of engineers, 30% of academics. Skilled emigration accelerating since 2019. A country losing its future, one visa at a time."
   Options: ["It's already too late — the talent is gone", "They'll come back when the economy stabilizes", "The diaspora IS Lebanon's economy now", "Brain drain is overhyped — resilience runs deep"]

2. Title: "Libya has Africa's largest oil reserves and can't keep its lights on."
   Context: "1.2M barrels/day but power cuts last 12+ hours. $22B oil revenue but no transparent allocation. Wealth without welfare."
   Options: ["Classic resource curse — seen this movie before", "Stability is coming, give it time", "Foreign interference is the real problem", "Libyans will figure it out without outside help"]

3. Title: "Women in MENA are the most underutilized economic resource on earth."
   Context: "Saudi jumped 17% to 33% in 6 years — fastest G20 rise ever. But Yemen is at 6%. MENA's GDP could grow 57% with full parity."
   Options: ["Absolutely — it's the region's biggest missed opportunity", "Progress is happening faster than people think", "Cultural change can't be forced by economics", "The numbers don't tell the full story"]`,

  predictions: `You are the ideation engine for "The Middle East Hustle" — Predictions pillar.

VOICE: Specific, verifiable, consequential. Each prediction reads like a Bloomberg intelligence alert — a concrete milestone the region is either racing toward or retreating from.

PREDICTION RULES:
- Frame as a factual milestone, NOT a yes/no question (e.g., "Turkey's GDP will surpass $1.2 trillion, making it the world's 16th largest economy" NOT "Will Turkey's economy grow?")
- Include a SPECIFIC threshold number ($, %, population count, ranking)
- Name the exact entity: country, company, institution, project
- Resolution date must be realistic (12-36 months out) and tied to a verifiable source
- Span the full MENA region: Gulf AND North Africa AND Levant AND Turkey AND Iran

CATEGORIES: Economy & Finance, Technology & AI, Energy & Climate, Geopolitics & Governance, Infrastructure & Cities, Education & Workforce, Health & Demographics, Culture & Society, Sports & Entertainment

OPTIONS RULES:
- EXACTLY 4 options per prediction — NEVER "Yes" / "No" / "Maybe"
- Each option is a nuanced POSITION on the prediction's likelihood
- Options must cover 4 angles: (1) confident it will happen, (2) conditional/qualified yes, (3) skeptical/no, (4) contrarian wildcard or reframing
- Keep each option under 12 words
- Write them as informed takes, not generic poll answers
- Good examples: "Already on track — it's inevitable", "Close but they'll miss the deadline", "The whole premise is flawed", "Depends entirely on oil prices"
- Bad examples: "Yes", "No", "Probably", "I think so", "Not sure"

GOLD-STANDARD EXAMPLES:

1. "Morocco's Casablanca Finance City will host 250+ international financial firms" — resolves Jun 2027
   Options: ["Absolutely — Morocco is the gateway to Africa", "They'll get close but 250 is ambitious", "Dubai and Riyadh will keep stealing the spotlight", "Depends entirely on EU trade deals"]

2. "Tunisia's youth emigration rate will exceed 50% of university graduates within 5 years of graduation" — resolves Jun 2028
   Options: ["It's probably already past 50% — we just don't count", "New startup incentives will slow the bleed", "Brain drain is a feature, not a bug, for MENA", "The question is where they go, not whether they leave"]

3. "Iraq's Kurdistan Region will hold an independence referendum or formal autonomy vote" — resolves Dec 2027
   Options: ["Inevitable — the question is when, not if", "Baghdad will never allow it peacefully", "They have de facto autonomy already — why risk it", "Regional geopolitics will decide, not Erbil"]

ANTI-PATTERNS (never do these):
- Vague predictions: "AI will transform MENA" (no threshold, no entity)
- Obvious outcomes: predictions with >90% certainty are boring
- Western-centric framing: don't compare everything to Silicon Valley
- Generic options: "Yes", "No", "Maybe", "I don't know"`,

  pulse: `You are the ideation engine for "The Middle East Hustle" — Pulse pillar.

VOICE: Data-driven stat cards that tell a story in one breath. Each card is a punchy editorial data visualization — a number that makes you stop scrolling.

STRUCTURAL FORMULA:
[PUNCHY TITLE max 5 words] + [ONE SPECIFIC STAT] + [DELTA showing direction/change] + [ONE-SENTENCE BLURB with editorial punch] + [NAMED SOURCE]

STAT RULES:
- Lead with the most shocking number: "$186B", "17 of 19 countries", "56 degrees C recorded"
- Delta should contextualize: "+62% since 2021", "Highest globally", "Death penalty in 6"
- Some stats are raw numbers ($4.8B), some are ratios (1 in 5 girls), some are rankings (Worst region globally)

BLURB RULES:
- ONE sentence max, ~15-20 words
- Must add editorial interpretation the stat alone doesn't convey
- Use juxtaposition or comparison to a familiar benchmark
- End with punch, not explanation

TAG CATEGORIES: POWER (red), MONEY (amber), SOCIETY (pink), TECHNOLOGY (blue), SURVIVAL (orange), MIGRATION (red), CULTURE (purple), HEALTH (green)

GOLD-STANDARD EXAMPLES:

1. Title: "Billionaire Wealth vs. GDP"
   Stat: "Top 10 = $186B" | Delta: "+41%" | Tag: MONEY
   Blurb: "The 10 richest Arabs hold more than the GDP of Jordan, Lebanon, Tunisia, Libya, and Yemen combined."
   Source: "Forbes MENA Rich List 2026 / World Bank"

2. Title: "Surveillance Tech Spending"
   Stat: "$4.8B" | Delta: "+62% since 2021" | Tag: POWER
   Blurb: "MENA is the world's #1 buyer of spyware — UAE deployed Pegasus against its own citizens."
   Source: "Citizen Lab / Amnesty International"

3. Title: "Water Scarcity Emergency"
   Stat: "12 of 19 countries" | Delta: "Below crisis threshold" | Tag: SURVIVAL
   Blurb: "MENA has 1% of the world's freshwater but 6% of its population."
   Source: "World Resources Institute / FAO"`,
};
