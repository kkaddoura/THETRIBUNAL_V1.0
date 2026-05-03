export interface PredictionCard {
  id: number
  category: string
  resolves: string
  question: string
  count: string
  yes: number
  no: number
  momentum: number
  up: boolean
  data: number[]
  options?: string[]
  optionResults?: Record<string, number>
}

function spark(base: number, trend: "up" | "down" | "flat", volatility = 2): number[] {
  const seed = base * 137 + (trend === "up" ? 31 : trend === "down" ? 59 : 17) + volatility * 7
  const len = 12
  const pts: number[] = []
  const startOffset = trend === "up" ? -(volatility * 4) : trend === "down" ? (volatility * 4) : 0
  pts.push(Math.round(Math.max(8, Math.min(92, base + startOffset))))
  for (let i = 1; i < len; i++) {
    const progress = i / (len - 1)
    const trendPull = trend === "up" ? volatility * 1.5 * progress : trend === "down" ? -volatility * 1.5 * progress : 0
    const noise = Math.sin(seed * (i + 1) * 0.7931 + i * 2.1) * volatility * 2.5
    const wobble = Math.cos(seed * i * 1.31 + i * 3.7) * volatility * 1.2
    const target = base + trendPull * (len - 1) + noise + wobble
    const prev = pts[i - 1]
    const jump = (target - prev) * 0.6
    pts.push(Math.round(Math.max(8, Math.min(92, prev + jump))))
  }
  return pts
}

export const PREDICTION_CATEGORIES = [
  "Economy & Finance",
  "Technology & AI",
  "Energy & Climate",
  "Culture & Society",
  "Business & Startups",
  "Geopolitics & Governance",
  "Education & Workforce",
  "Infrastructure & Cities",
  "Sports & Entertainment",
  "Health & Demographics",
]

const _RAW_PREDICTIONS: PredictionCard[] = [
  // ─── ECONOMY & FINANCE ──────────────────────────────────────
  { id: 1, category: "Economy & Finance", resolves: "Dec 2026", question: "Saudi Arabia's non-oil GDP will exceed 50% of total GDP by end of 2026", count: "18,203", yes: 62, no: 38, momentum: 1.8, up: true, data: spark(58, "up") },
  { id: 2, category: "Economy & Finance", resolves: "Mar 2029", question: "UAE will introduce some form of personal income tax within 3 years", count: "15,603", yes: 38, no: 62, momentum: 0.8, up: true, data: spark(35, "up", 1) },
  { id: 3, category: "Economy & Finance", resolves: "Dec 2027", question: "Egypt's pound will stabilize below 50 EGP/$ by 2027", count: "11,402", yes: 41, no: 59, momentum: 2.3, up: false, data: spark(45, "down") },
  { id: 4, category: "Economy & Finance", resolves: "Jun 2027", question: "At least 3 MENA countries will launch a central bank digital currency (CBDC)", count: "9,804", yes: 55, no: 45, momentum: 1.1, up: true, data: spark(51, "up") },
  { id: 5, category: "Economy & Finance", resolves: "Dec 2026", question: "Kuwait's debt law will finally pass before end of 2026", count: "7,291", yes: 47, no: 53, momentum: 0.6, up: false, data: spark(49, "flat") },
  { id: 6, category: "Economy & Finance", resolves: "Dec 2028", question: "Bahrain will need another GCC bailout package before 2029", count: "6,312", yes: 64, no: 36, momentum: 1.4, up: true, data: spark(60, "up") },
  { id: 7, category: "Economy & Finance", resolves: "Jun 2027", question: "Riyadh's stock exchange (Tadawul) will surpass $4 trillion market cap", count: "8,734", yes: 51, no: 49, momentum: 0.9, up: true, data: spark(48, "up") },
  { id: 8, category: "Economy & Finance", resolves: "Dec 2027", question: "Iraq's total GDP will exceed $300 billion", count: "5,901", yes: 43, no: 57, momentum: 0.4, up: false, data: spark(45, "down", 1) },
  { id: 9, category: "Economy & Finance", resolves: "Mar 2027", question: "Jordan will reach a new IMF loan agreement by Q1 2027", count: "4,823", yes: 72, no: 28, momentum: 1.2, up: true, data: spark(68, "up") },
  { id: 10, category: "Economy & Finance", resolves: "Dec 2026", question: "Qatar's LNG revenue will hit a new annual record in 2026", count: "10,445", yes: 78, no: 22, momentum: 0.5, up: true, data: spark(76, "up", 1) },

  // ─── TECHNOLOGY & AI ────────────────────────────────────────
  { id: 11, category: "Technology & AI", resolves: "Dec 2026", question: "UAE will deploy AI in at least 50% of government services by end of 2026", count: "13,892", yes: 68, no: 32, momentum: 2.4, up: true, data: spark(62, "up") },
  { id: 12, category: "Technology & AI", resolves: "Jun 2027", question: "Saudi Arabia will launch a homegrown large language model (Arabic-first)", count: "11,204", yes: 74, no: 26, momentum: 1.9, up: true, data: spark(70, "up") },
  { id: 13, category: "Technology & AI", resolves: "Dec 2027", question: "MENA will have 5+ unicorn AI companies by end of 2027", count: "8,903", yes: 42, no: 58, momentum: 1.1, up: true, data: spark(38, "up") },
  { id: 14, category: "Technology & AI", resolves: "Sep 2026", question: "Autonomous delivery robots will operate commercially in at least 2 GCC cities", count: "7,421", yes: 56, no: 44, momentum: 0.7, up: true, data: spark(53, "up", 1) },
  { id: 15, category: "Technology & AI", resolves: "Dec 2028", question: "A MENA-based company will build a top-50 global data center", count: "6,892", yes: 71, no: 29, momentum: 1.6, up: true, data: spark(67, "up") },
  { id: 16, category: "Technology & AI", resolves: "Mar 2027", question: "5G coverage will exceed 90% in UAE, Saudi Arabia, and Qatar combined", count: "9,123", yes: 82, no: 18, momentum: 0.4, up: true, data: spark(80, "up", 1) },
  { id: 17, category: "Technology & AI", resolves: "Dec 2026", question: "At least one MENA country will regulate cryptocurrency as legal tender", count: "10,302", yes: 31, no: 69, momentum: 1.3, up: false, data: spark(34, "down") },
  { id: 18, category: "Technology & AI", resolves: "Jun 2028", question: "Deepfake detection will become mandatory for MENA social media platforms", count: "5,671", yes: 48, no: 52, momentum: 0.9, up: true, data: spark(44, "up") },
  { id: 19, category: "Technology & AI", resolves: "Dec 2027", question: "MENA's cybersecurity market will exceed $10 billion annually", count: "7,834", yes: 65, no: 35, momentum: 1.2, up: true, data: spark(61, "up") },
  { id: 20, category: "Technology & AI", resolves: "Sep 2027", question: "An Arabic AI chatbot will reach 50 million monthly active users", count: "8,456", yes: 39, no: 61, momentum: 2.1, up: true, data: spark(33, "up") },

  // ─── ENERGY & CLIMATE ───────────────────────────────────────
  { id: 21, category: "Energy & Climate", resolves: "Dec 2030", question: "Saudi Arabia will generate 50% of electricity from renewables by 2030", count: "14,672", yes: 34, no: 66, momentum: 0.8, up: false, data: spark(37, "down", 1) },
  { id: 22, category: "Energy & Climate", resolves: "Dec 2027", question: "UAE's Barakah nuclear plant will reach full 4-unit capacity", count: "9,301", yes: 71, no: 29, momentum: 0.6, up: true, data: spark(69, "up", 1) },
  { id: 23, category: "Energy & Climate", resolves: "Jun 2028", question: "At least 2 GCC countries will ban single-use plastics nationwide", count: "7,823", yes: 44, no: 56, momentum: 1.5, up: true, data: spark(39, "up") },
  { id: 24, category: "Energy & Climate", resolves: "Dec 2026", question: "Oil will average above $85/barrel for all of 2026", count: "12,901", yes: 52, no: 48, momentum: 2.8, up: false, data: spark(58, "down") },
  { id: 25, category: "Energy & Climate", resolves: "Dec 2028", question: "NEOM's green hydrogen project will begin commercial production", count: "8,234", yes: 38, no: 62, momentum: 0.9, up: false, data: spark(41, "down", 1) },
  { id: 26, category: "Energy & Climate", resolves: "Jun 2027", question: "Morocco will become Africa's largest solar energy exporter", count: "6,901", yes: 57, no: 43, momentum: 1.3, up: true, data: spark(53, "up") },
  { id: 27, category: "Energy & Climate", resolves: "Dec 2029", question: "Water desalination costs in the Gulf will drop below $0.30/cubic meter", count: "5,412", yes: 63, no: 37, momentum: 0.7, up: true, data: spark(60, "up", 1) },
  { id: 28, category: "Energy & Climate", resolves: "Sep 2027", question: "Dubai will have 5,000+ electric vehicle charging stations", count: "7,123", yes: 69, no: 31, momentum: 1.1, up: true, data: spark(65, "up") },
  { id: 29, category: "Energy & Climate", resolves: "Dec 2028", question: "At least one Gulf city will hit 55°C (131°F) during summer", count: "11,234", yes: 45, no: 55, momentum: 1.8, up: true, data: spark(40, "up") },
  { id: 30, category: "Energy & Climate", resolves: "Jun 2030", question: "Oman's green hydrogen exports will exceed $1 billion annually", count: "4,892", yes: 41, no: 59, momentum: 0.5, up: true, data: spark(38, "up", 1) },

  // ─── CULTURE & SOCIETY ──────────────────────────────────────
  { id: 31, category: "Culture & Society", resolves: "Dec 2026", question: "Saudi Arabia will have a fully operating cinema in every major city by end of 2026", count: "12,847", yes: 71, no: 29, momentum: 2.1, up: true, data: spark(66, "up") },
  { id: 32, category: "Culture & Society", resolves: "Jun 2027", question: "Alcohol will be legally sold in Saudi Arabia in some form by mid-2027", count: "14,302", yes: 28, no: 72, momentum: 1.4, up: true, data: spark(23, "up") },
  { id: 33, category: "Culture & Society", resolves: "Dec 2027", question: "A MENA film will win or be nominated for an Oscar (main categories)", count: "8,923", yes: 52, no: 48, momentum: 0.8, up: true, data: spark(49, "up") },
  { id: 34, category: "Culture & Society", resolves: "Sep 2026", question: "Female labor force participation in Saudi Arabia will exceed 35%", count: "10,102", yes: 76, no: 24, momentum: 0.6, up: true, data: spark(74, "up", 1) },
  { id: 35, category: "Culture & Society", resolves: "Dec 2027", question: "MENA region will have 500+ million social media users", count: "7,234", yes: 81, no: 19, momentum: 0.3, up: true, data: spark(79, "up", 1) },
  { id: 36, category: "Culture & Society", resolves: "Jun 2028", question: "At least 2 Arab countries will legalize cannabis for medical use", count: "6,891", yes: 35, no: 65, momentum: 1.7, up: true, data: spark(29, "up") },
  { id: 37, category: "Culture & Society", resolves: "Dec 2026", question: "Riyadh Season 2026 will attract more than 20 million visitors", count: "11,456", yes: 67, no: 33, momentum: 1.2, up: true, data: spark(63, "up") },
  { id: 38, category: "Culture & Society", resolves: "Mar 2028", question: "An Arab creator will surpass 100 million YouTube subscribers", count: "9,012", yes: 44, no: 56, momentum: 2.3, up: true, data: spark(38, "up") },
  { id: 39, category: "Culture & Society", resolves: "Dec 2027", question: "Divorce rates in the GCC will exceed 40% of all marriages", count: "5,678", yes: 58, no: 42, momentum: 0.9, up: true, data: spark(55, "up") },
  { id: 40, category: "Culture & Society", resolves: "Jun 2027", question: "Expat populations in Qatar and UAE combined will exceed 12 million", count: "7,892", yes: 73, no: 27, momentum: 0.4, up: true, data: spark(71, "up", 1) },

  // ─── BUSINESS & STARTUPS ────────────────────────────────────
  { id: 41, category: "Business & Startups", resolves: "Dec 2026", question: "A MENA-founded startup will reach $10B valuation in 2026", count: "9,231", yes: 44, no: 56, momentum: 1.3, up: false, data: spark(47, "down") },
  { id: 42, category: "Business & Startups", resolves: "Jun 2027", question: "Riyadh will overtake Dubai in total VC funding deployed in a single year", count: "8,456", yes: 39, no: 61, momentum: 2.1, up: true, data: spark(33, "up") },
  { id: 43, category: "Business & Startups", resolves: "Dec 2027", question: "MENA fintech companies will process over $100B in annual transactions", count: "7,312", yes: 61, no: 39, momentum: 1.5, up: true, data: spark(56, "up") },
  { id: 44, category: "Business & Startups", resolves: "Sep 2026", question: "At least 10 MENA startups will IPO on regional exchanges in 2026", count: "6,789", yes: 52, no: 48, momentum: 0.8, up: true, data: spark(49, "up") },
  { id: 45, category: "Business & Startups", resolves: "Dec 2028", question: "A Gulf sovereign wealth fund will acquire a top-10 global tech company", count: "5,901", yes: 33, no: 67, momentum: 0.7, up: false, data: spark(35, "down", 1) },
  { id: 46, category: "Business & Startups", resolves: "Jun 2027", question: "MENA e-commerce market will exceed $50 billion in annual GMV", count: "8,234", yes: 68, no: 32, momentum: 1.1, up: true, data: spark(64, "up") },
  { id: 47, category: "Business & Startups", resolves: "Dec 2026", question: "Saudi Arabia's PIF will complete at least 3 major international acquisitions in 2026", count: "9,102", yes: 74, no: 26, momentum: 0.5, up: true, data: spark(72, "up", 1) },
  { id: 48, category: "Business & Startups", resolves: "Mar 2028", question: "A MENA-based super app will reach 50M+ monthly active users", count: "6,412", yes: 46, no: 54, momentum: 1.9, up: true, data: spark(40, "up") },
  { id: 49, category: "Business & Startups", resolves: "Dec 2027", question: "Total MENA venture capital funding will exceed $8 billion in a single year", count: "7,823", yes: 38, no: 62, momentum: 0.6, up: false, data: spark(41, "down", 1) },
  { id: 50, category: "Business & Startups", resolves: "Jun 2027", question: "Amazon/Noon will launch same-day grocery delivery in 5+ MENA cities", count: "5,123", yes: 71, no: 29, momentum: 0.9, up: true, data: spark(68, "up") },

  // ─── GEOPOLITICS & GOVERNANCE ───────────────────────────────
  { id: 51, category: "Geopolitics & Governance", resolves: "Dec 2026", question: "Saudi Arabia and Iran will establish full diplomatic embassies in each other's capitals", count: "11,234", yes: 62, no: 38, momentum: 1.3, up: true, data: spark(58, "up") },
  { id: 52, category: "Geopolitics & Governance", resolves: "Jun 2027", question: "Yemen's civil war will reach a formal ceasefire agreement", count: "9,823", yes: 41, no: 59, momentum: 0.8, up: false, data: spark(43, "down", 1) },
  { id: 53, category: "Geopolitics & Governance", resolves: "Dec 2027", question: "At least 2 more Arab states will normalize relations with Israel", count: "8,102", yes: 34, no: 66, momentum: 1.7, up: false, data: spark(39, "down") },
  { id: 54, category: "Geopolitics & Governance", resolves: "Mar 2028", question: "Turkey will fully resolve its currency crisis (lira below 30/$)", count: "7,456", yes: 29, no: 71, momentum: 0.5, up: false, data: spark(32, "down", 1) },
  { id: 55, category: "Geopolitics & Governance", resolves: "Dec 2026", question: "Lebanon will elect a new president and form a stable government in 2026", count: "10,789", yes: 55, no: 45, momentum: 2.4, up: true, data: spark(48, "up") },
  { id: 56, category: "Geopolitics & Governance", resolves: "Jun 2028", question: "Iraq will hold provincial elections without major security incidents", count: "5,234", yes: 38, no: 62, momentum: 0.6, up: false, data: spark(40, "flat") },
  { id: 57, category: "Geopolitics & Governance", resolves: "Dec 2027", question: "GCC countries will introduce a unified tourist visa", count: "8,567", yes: 48, no: 52, momentum: 1.4, up: true, data: spark(43, "up") },
  { id: 58, category: "Geopolitics & Governance", resolves: "Sep 2027", question: "Tunisia's democratic backslide will continue — no free elections before 2028", count: "6,012", yes: 67, no: 33, momentum: 0.7, up: true, data: spark(64, "up", 1) },
  { id: 59, category: "Geopolitics & Governance", resolves: "Dec 2026", question: "Libya will hold its first national election in over a decade", count: "7,891", yes: 22, no: 78, momentum: 0.3, up: false, data: spark(24, "down", 1) },
  { id: 60, category: "Geopolitics & Governance", resolves: "Jun 2027", question: "Sudan's conflict will displace more than 10 million people total", count: "9,345", yes: 79, no: 21, momentum: 1.1, up: true, data: spark(75, "up") },

  // ─── EDUCATION & WORKFORCE ──────────────────────────────────
  { id: 61, category: "Education & Workforce", resolves: "Sep 2027", question: "Arabic will become mandatory in all Dubai private schools within 2 years", count: "8,094", yes: 58, no: 42, momentum: 1.4, up: true, data: spark(54, "up") },
  { id: 62, category: "Education & Workforce", resolves: "Dec 2027", question: "MENA youth unemployment will drop below 25% region-wide", count: "7,234", yes: 32, no: 68, momentum: 0.9, up: false, data: spark(35, "down") },
  { id: 63, category: "Education & Workforce", resolves: "Jun 2027", question: "At least 5 top-50 global universities will have MENA branch campuses", count: "8,901", yes: 72, no: 28, momentum: 0.6, up: true, data: spark(70, "up", 1) },
  { id: 64, category: "Education & Workforce", resolves: "Dec 2026", question: "Saudi Saudization quotas will reach 50% in retail by end of 2026", count: "6,567", yes: 61, no: 39, momentum: 1.2, up: true, data: spark(57, "up") },
  { id: 65, category: "Education & Workforce", resolves: "Mar 2028", question: "MENA EdTech market will exceed $5 billion in annual revenue", count: "5,123", yes: 54, no: 46, momentum: 1.8, up: true, data: spark(48, "up") },
  { id: 66, category: "Education & Workforce", resolves: "Dec 2027", question: "Remote work will be formally adopted by 30%+ of Gulf employers", count: "7,890", yes: 43, no: 57, momentum: 1.3, up: true, data: spark(38, "up") },
  { id: 67, category: "Education & Workforce", resolves: "Sep 2026", question: "UAE will launch a dedicated ministry or authority for AI education", count: "6,234", yes: 67, no: 33, momentum: 0.8, up: true, data: spark(64, "up", 1) },
  { id: 68, category: "Education & Workforce", resolves: "Jun 2028", question: "Gig economy workers in MENA will exceed 25 million", count: "5,678", yes: 71, no: 29, momentum: 0.5, up: true, data: spark(69, "up", 1) },
  { id: 69, category: "Education & Workforce", resolves: "Dec 2027", question: "A MENA country will rank in the top 10 of PISA education scores", count: "4,567", yes: 18, no: 82, momentum: 0.4, up: false, data: spark(20, "flat", 1) },
  { id: 70, category: "Education & Workforce", resolves: "Mar 2027", question: "Coding bootcamps will produce more MENA tech workers than universities", count: "6,789", yes: 45, no: 55, momentum: 2.2, up: true, data: spark(39, "up") },

  // ─── INFRASTRUCTURE & CITIES ────────────────────────────────
  { id: 71, category: "Infrastructure & Cities", resolves: "Dec 2030", question: "NEOM's The Line will have its first residents living in it by 2030", count: "16,234", yes: 36, no: 64, momentum: 1.8, up: false, data: spark(40, "down") },
  { id: 72, category: "Infrastructure & Cities", resolves: "Jun 2027", question: "Riyadh Metro will be fully operational across all 6 lines", count: "11,456", yes: 64, no: 36, momentum: 1.1, up: true, data: spark(60, "up") },
  { id: 73, category: "Infrastructure & Cities", resolves: "Dec 2027", question: "Dubai will surpass 20 million annual international tourists", count: "9,823", yes: 73, no: 27, momentum: 0.7, up: true, data: spark(71, "up", 1) },
  { id: 74, category: "Infrastructure & Cities", resolves: "Sep 2028", question: "Egypt's new administrative capital will be fully functioning as the seat of government", count: "8,234", yes: 48, no: 52, momentum: 1.5, up: true, data: spark(43, "up") },
  { id: 75, category: "Infrastructure & Cities", resolves: "Dec 2028", question: "Hyperloop technology will be tested in at least one GCC country", count: "6,901", yes: 29, no: 71, momentum: 0.6, up: false, data: spark(31, "down", 1) },
  { id: 76, category: "Infrastructure & Cities", resolves: "Jun 2027", question: "Abu Dhabi will complete Saadiyat Island's cultural district (Guggenheim + all museums)", count: "7,567", yes: 42, no: 58, momentum: 0.9, up: false, data: spark(44, "down") },
  { id: 77, category: "Infrastructure & Cities", resolves: "Dec 2026", question: "Jeddah Tower (1km+ supertall) will resume construction in 2026", count: "10,123", yes: 53, no: 47, momentum: 2.6, up: true, data: spark(47, "up") },
  { id: 78, category: "Infrastructure & Cities", resolves: "Mar 2028", question: "Baghdad will open a new international airport terminal", count: "5,234", yes: 44, no: 56, momentum: 0.4, up: false, data: spark(46, "flat") },
  { id: 79, category: "Infrastructure & Cities", resolves: "Dec 2029", question: "Qatar's Lusail City will reach 250,000 permanent residents", count: "6,789", yes: 51, no: 49, momentum: 0.8, up: true, data: spark(48, "up") },
  { id: 80, category: "Infrastructure & Cities", resolves: "Jun 2027", question: "Oman's Duqm economic zone will attract $10B+ in committed investment", count: "4,567", yes: 46, no: 54, momentum: 1.2, up: true, data: spark(42, "up") },

  // ─── SPORTS & ENTERTAINMENT ─────────────────────────────────
  { id: 81, category: "Sports & Entertainment", resolves: "Dec 2030", question: "Saudi Arabia will be awarded the 2034 FIFA World Cup (confirmed)", count: "15,678", yes: 91, no: 9, momentum: 0.2, up: true, data: spark(89, "up", 1) },
  { id: 82, category: "Sports & Entertainment", resolves: "Jun 2027", question: "A MENA football club will sign a current top-10 world player for $100M+", count: "8,901", yes: 72, no: 28, momentum: 1.6, up: true, data: spark(67, "up") },
  { id: 83, category: "Sports & Entertainment", resolves: "Dec 2026", question: "Esports revenue in MENA will exceed $1 billion in 2026", count: "7,234", yes: 48, no: 52, momentum: 2.1, up: true, data: spark(42, "up") },
  { id: 84, category: "Sports & Entertainment", resolves: "Sep 2027", question: "Qatar will host another mega sporting event (Olympics bid or similar)", count: "9,456", yes: 55, no: 45, momentum: 0.8, up: true, data: spark(52, "up") },
  { id: 85, category: "Sports & Entertainment", resolves: "Dec 2027", question: "F1 will add a 3rd MENA race (beyond Bahrain and Saudi Arabia)", count: "6,123", yes: 63, no: 37, momentum: 1.3, up: true, data: spark(59, "up") },
  { id: 86, category: "Sports & Entertainment", resolves: "Jun 2028", question: "A MENA country will host the Summer or Winter Olympics by 2040", count: "7,890", yes: 44, no: 56, momentum: 0.7, up: true, data: spark(41, "up") },
  { id: 87, category: "Sports & Entertainment", resolves: "Dec 2026", question: "Saudi Pro League average attendance will exceed 15,000 per match", count: "5,678", yes: 39, no: 61, momentum: 1.1, up: false, data: spark(42, "down") },
  { id: 88, category: "Sports & Entertainment", resolves: "Mar 2027", question: "A MENA-based gaming studio will publish a globally top-100 game", count: "6,234", yes: 35, no: 65, momentum: 1.9, up: true, data: spark(29, "up") },
  { id: 89, category: "Sports & Entertainment", resolves: "Dec 2027", question: "WWE will hold 10+ events annually in Saudi Arabia", count: "8,012", yes: 78, no: 22, momentum: 0.4, up: true, data: spark(76, "up", 1) },
  { id: 90, category: "Sports & Entertainment", resolves: "Sep 2026", question: "Riyadh Season 2026 will attract 25+ international music headliners", count: "9,567", yes: 82, no: 18, momentum: 0.6, up: true, data: spark(80, "up", 1) },

  // ─── HEALTH & DEMOGRAPHICS ──────────────────────────────────
  { id: 91, category: "Health & Demographics", resolves: "Dec 2027", question: "MENA's diabetes prevalence will exceed 15% of the adult population", count: "8,234", yes: 74, no: 26, momentum: 0.5, up: true, data: spark(72, "up", 1) },
  { id: 92, category: "Health & Demographics", resolves: "Jun 2028", question: "Gulf countries will mandate mental health coverage in all insurance plans", count: "6,789", yes: 47, no: 53, momentum: 1.8, up: true, data: spark(41, "up") },
  { id: 93, category: "Health & Demographics", resolves: "Dec 2026", question: "UAE population will officially surpass 10.5 million", count: "7,901", yes: 69, no: 31, momentum: 0.7, up: true, data: spark(67, "up", 1) },
  { id: 94, category: "Health & Demographics", resolves: "Sep 2027", question: "Saudi Arabia's average life expectancy will reach 78 years", count: "5,456", yes: 58, no: 42, momentum: 0.9, up: true, data: spark(55, "up") },
  { id: 95, category: "Health & Demographics", resolves: "Dec 2028", question: "At least 3 MENA countries will fully legalize IVF for unmarried women", count: "4,123", yes: 22, no: 78, momentum: 0.4, up: false, data: spark(24, "flat", 1) },
  { id: 96, category: "Health & Demographics", resolves: "Jun 2027", question: "Medical tourism revenue in UAE and Turkey combined will exceed $15 billion", count: "7,345", yes: 63, no: 37, momentum: 1.2, up: true, data: spark(59, "up") },
  { id: 97, category: "Health & Demographics", resolves: "Dec 2027", question: "MENA's total population will officially surpass 550 million", count: "8,678", yes: 81, no: 19, momentum: 0.3, up: true, data: spark(79, "up", 1) },
  { id: 98, category: "Health & Demographics", resolves: "Mar 2028", question: "Obesity rates in the Gulf will exceed 35% (adult population)", count: "6,012", yes: 72, no: 28, momentum: 0.6, up: true, data: spark(70, "up", 1) },
  { id: 99, category: "Health & Demographics", resolves: "Dec 2026", question: "MENA will have 100+ operational telemedicine platforms", count: "5,234", yes: 66, no: 34, momentum: 1.5, up: true, data: spark(61, "up") },
  { id: 100, category: "Health & Demographics", resolves: "Sep 2028", question: "Water scarcity will force at least one MENA city to implement strict rationing", count: "9,123", yes: 55, no: 45, momentum: 2.3, up: true, data: spark(48, "up") },

  // ─── BONUS: CROSS-CUTTING / HIGH-INTEREST ───────────────────
  { id: 101, category: "Culture & Society", resolves: "Dec 2027", question: "Arabic will become a top-10 language on the internet by content volume", count: "6,789", yes: 31, no: 69, momentum: 1.1, up: true, data: spark(27, "up") },
  { id: 102, category: "Business & Startups", resolves: "Jun 2027", question: "Careem (or equivalent) will launch financial services rivaling traditional banks", count: "7,234", yes: 54, no: 46, momentum: 1.4, up: true, data: spark(50, "up") },
  { id: 103, category: "Technology & AI", resolves: "Dec 2028", question: "MENA will produce a globally recognized open-source AI framework", count: "4,891", yes: 28, no: 72, momentum: 0.8, up: false, data: spark(30, "flat") },
  { id: 104, category: "Geopolitics & Governance", resolves: "Jun 2028", question: "A GCC country will grant permanent residency pathways to long-term expats", count: "11,567", yes: 58, no: 42, momentum: 1.7, up: true, data: spark(53, "up") },
  { id: 105, category: "Infrastructure & Cities", resolves: "Dec 2029", question: "A fully autonomous public transit system will operate in a MENA city", count: "6,345", yes: 52, no: 48, momentum: 1.3, up: true, data: spark(48, "up") },
  { id: 106, category: "Economy & Finance", resolves: "Dec 2027", question: "Remittances from GCC to South Asia will exceed $100 billion annually", count: "7,890", yes: 64, no: 36, momentum: 0.6, up: true, data: spark(62, "up", 1) },
  { id: 107, category: "Energy & Climate", resolves: "Jun 2028", question: "Saudi Aramco's market cap will drop below $1.5 trillion", count: "8,456", yes: 37, no: 63, momentum: 1.9, up: true, data: spark(31, "up") },
  { id: 108, category: "Sports & Entertainment", resolves: "Dec 2026", question: "A Saudi-produced TV series will trend globally on Netflix or similar", count: "7,012", yes: 59, no: 41, momentum: 2.4, up: true, data: spark(52, "up") },
  { id: 109, category: "Education & Workforce", resolves: "Sep 2027", question: "KAUST will be ranked in the global top-50 universities", count: "5,678", yes: 42, no: 58, momentum: 0.9, up: true, data: spark(39, "up") },
  { id: 110, category: "Health & Demographics", resolves: "Dec 2027", question: "Fertility rates in the Gulf will drop below 1.8 children per woman", count: "6,234", yes: 57, no: 43, momentum: 0.7, up: true, data: spark(54, "up") },
  { id: 111, category: "Culture & Society", resolves: "Mar 2027", question: "MENA will have 10+ internationally touring music festivals annually", count: "5,890", yes: 68, no: 32, momentum: 1.1, up: true, data: spark(64, "up") },
  { id: 112, category: "Business & Startups", resolves: "Dec 2027", question: "A MENA crypto exchange will become a top-5 global platform by volume", count: "6,456", yes: 33, no: 67, momentum: 1.6, up: true, data: spark(27, "up") },
  { id: 113, category: "Geopolitics & Governance", resolves: "Jun 2027", question: "Morocco will formally bid for the 2030 FIFA World Cup co-hosting", count: "8,234", yes: 84, no: 16, momentum: 0.4, up: true, data: spark(82, "up", 1) },
  { id: 114, category: "Infrastructure & Cities", resolves: "Dec 2028", question: "Dubai Creek Tower will be completed and open to the public", count: "7,345", yes: 31, no: 69, momentum: 0.5, up: false, data: spark(34, "down", 1) },
  { id: 115, category: "Technology & AI", resolves: "Sep 2027", question: "Drone delivery will be commercially available in 3+ MENA cities", count: "6,901", yes: 61, no: 39, momentum: 1.3, up: true, data: spark(57, "up") },

  // ─── MOROCCO ──────────────────────────────────────────────
  { id: 116, category: "Infrastructure & Cities", resolves: "Jun 2030", question: "Morocco's TGV high-speed rail will extend from Casablanca to Marrakech by 2030", count: "7,823", yes: 54, no: 46, momentum: 1.1, up: true, data: spark(50, "up") },
  { id: 117, category: "Sports & Entertainment", resolves: "Jun 2030", question: "Morocco will successfully co-host the 2030 FIFA World Cup with Spain and Portugal", count: "14,502", yes: 92, no: 8, momentum: 0.3, up: true, data: spark(90, "up", 1) },
  { id: 118, category: "Business & Startups", resolves: "Dec 2027", question: "Tanger Med port will surpass 10 million TEU containers annually", count: "6,234", yes: 67, no: 33, momentum: 0.9, up: true, data: spark(63, "up") },
  { id: 119, category: "Energy & Climate", resolves: "Dec 2028", question: "Morocco's Noor-Ouarzazate solar complex will reach full 580 MW capacity and export power to Europe", count: "8,012", yes: 58, no: 42, momentum: 1.4, up: true, data: spark(54, "up") },
  { id: 120, category: "Economy & Finance", resolves: "Dec 2027", question: "Morocco's automotive sector will export $15 billion annually, surpassing South Africa", count: "5,678", yes: 62, no: 38, momentum: 1.2, up: true, data: spark(58, "up") },
  { id: 121, category: "Culture & Society", resolves: "Dec 2026", question: "Morocco's Amazigh New Year (Yennayer) will be widely observed as a national holiday across North Africa", count: "4,567", yes: 71, no: 29, momentum: 0.5, up: true, data: spark(69, "up", 1) },
  { id: 122, category: "Education & Workforce", resolves: "Jun 2028", question: "Morocco's mandatory French-language instruction in public schools will be reduced in favor of English", count: "6,345", yes: 44, no: 56, momentum: 1.7, up: true, data: spark(38, "up") },
  { id: 123, category: "Health & Demographics", resolves: "Dec 2027", question: "Morocco's universal health insurance (AMO) will cover 90% of the population", count: "5,901", yes: 52, no: 48, momentum: 0.8, up: true, data: spark(49, "up") },

  // ─── ALGERIA ──────────────────────────────────────────────
  { id: 124, category: "Economy & Finance", resolves: "Dec 2027", question: "Algeria will reduce its oil and gas dependency to below 85% of total exports", count: "5,234", yes: 28, no: 72, momentum: 0.6, up: false, data: spark(31, "down", 1) },
  { id: 125, category: "Infrastructure & Cities", resolves: "Dec 2028", question: "Algiers Metro will complete its extension to El Harrach and Baraki (Line 1 full build-out)", count: "4,567", yes: 43, no: 57, momentum: 0.7, up: false, data: spark(45, "flat") },
  { id: 126, category: "Business & Startups", resolves: "Jun 2027", question: "Algeria's 2022 startup law will produce at least 5,000 registered startups", count: "5,123", yes: 51, no: 49, momentum: 1.3, up: true, data: spark(47, "up") },
  { id: 127, category: "Energy & Climate", resolves: "Dec 2029", question: "Algeria will begin construction on its first nuclear power plant for electricity generation", count: "4,012", yes: 32, no: 68, momentum: 0.4, up: false, data: spark(34, "down", 1) },
  { id: 128, category: "Geopolitics & Governance", resolves: "Dec 2027", question: "Algeria and Morocco will reopen their shared land border (closed since 1994)", count: "7,456", yes: 22, no: 78, momentum: 0.5, up: false, data: spark(24, "flat") },
  { id: 129, category: "Culture & Society", resolves: "Jun 2027", question: "Algeria's film industry will produce a Cannes Film Festival official selection entry", count: "3,890", yes: 47, no: 53, momentum: 1.1, up: true, data: spark(43, "up") },
  { id: 130, category: "Technology & AI", resolves: "Dec 2027", question: "Algeria will achieve 95% 4G coverage nationwide, up from 70% in 2024", count: "4,678", yes: 55, no: 45, momentum: 0.8, up: true, data: spark(52, "up") },

  // ─── TUNISIA ──────────────────────────────────────────────
  { id: 131, category: "Economy & Finance", resolves: "Dec 2027", question: "Tunisia will secure a new IMF loan program after rejecting the 2023 deal", count: "6,012", yes: 38, no: 62, momentum: 0.9, up: false, data: spark(41, "down") },
  { id: 132, category: "Geopolitics & Governance", resolves: "Dec 2027", question: "Tunisia will hold free and competitive parliamentary elections under President Saied", count: "5,678", yes: 24, no: 76, momentum: 0.6, up: false, data: spark(27, "down", 1) },
  { id: 133, category: "Business & Startups", resolves: "Jun 2027", question: "Tunisia's olive oil exports will exceed $1 billion, becoming the world's second-largest exporter", count: "4,891", yes: 63, no: 37, momentum: 0.7, up: true, data: spark(60, "up", 1) },
  { id: 134, category: "Culture & Society", resolves: "Dec 2026", question: "Tunisia will maintain its 1956 Personal Status Code protections for women's rights despite constitutional changes", count: "5,234", yes: 72, no: 28, momentum: 0.4, up: true, data: spark(70, "up", 1) },
  { id: 135, category: "Health & Demographics", resolves: "Dec 2028", question: "Tunisia's emigration of healthcare workers will exceed 2,000 doctors per year", count: "3,456", yes: 67, no: 33, momentum: 1.5, up: true, data: spark(62, "up") },
  { id: 136, category: "Energy & Climate", resolves: "Dec 2028", question: "Tunisia's TuNur solar export project will begin transmitting power to Europe via subsea cable", count: "4,123", yes: 29, no: 71, momentum: 0.5, up: false, data: spark(32, "down", 1) },

  // ─── EGYPT ────────────────────────────────────────────────
  { id: 137, category: "Infrastructure & Cities", resolves: "Dec 2027", question: "Egypt's Grand Egyptian Museum in Giza will reach 10 million annual visitors", count: "9,567", yes: 55, no: 45, momentum: 1.3, up: true, data: spark(51, "up") },
  { id: 138, category: "Economy & Finance", resolves: "Jun 2027", question: "The Ras El-Hekma mega-development (UAE's $35B deal) will break ground on Phase 1", count: "8,234", yes: 64, no: 36, momentum: 0.9, up: true, data: spark(61, "up") },
  { id: 139, category: "Health & Demographics", resolves: "Dec 2028", question: "Egypt's population will officially surpass 115 million", count: "7,901", yes: 82, no: 18, momentum: 0.3, up: true, data: spark(80, "up", 1) },
  { id: 140, category: "Technology & AI", resolves: "Dec 2027", question: "Egypt's Knowledge City in the New Administrative Capital will host 30+ tech companies", count: "5,456", yes: 48, no: 52, momentum: 1.1, up: true, data: spark(44, "up") },
  { id: 141, category: "Energy & Climate", resolves: "Jun 2028", question: "Egypt's El Dabaa nuclear plant (built by Rosatom) will begin generating power", count: "6,789", yes: 39, no: 61, momentum: 0.7, up: false, data: spark(42, "down") },
  { id: 142, category: "Culture & Society", resolves: "Dec 2026", question: "Egyptian cinema will produce 200+ feature films in 2026, reclaiming its 'Hollywood of the Arab World' title", count: "5,012", yes: 58, no: 42, momentum: 0.8, up: true, data: spark(55, "up") },
  { id: 143, category: "Business & Startups", resolves: "Dec 2027", question: "Egypt's Suez Canal Economic Zone will attract $10 billion in cumulative FDI", count: "6,345", yes: 45, no: 55, momentum: 1.0, up: true, data: spark(41, "up") },

  // ─── JORDAN ───────────────────────────────────────────────
  { id: 144, category: "Energy & Climate", resolves: "Dec 2027", question: "Jordan will generate 35% of electricity from renewables (currently 27%)", count: "5,234", yes: 64, no: 36, momentum: 0.8, up: true, data: spark(60, "up") },
  { id: 145, category: "Economy & Finance", resolves: "Jun 2028", question: "Jordan's national debt-to-GDP ratio will decrease below 85% (currently 89%)", count: "4,567", yes: 31, no: 69, momentum: 0.5, up: false, data: spark(34, "down", 1) },
  { id: 146, category: "Infrastructure & Cities", resolves: "Dec 2029", question: "The Aqaba-Amman national railway project will begin passenger service", count: "5,901", yes: 33, no: 67, momentum: 0.6, up: false, data: spark(36, "down") },
  { id: 147, category: "Technology & AI", resolves: "Jun 2027", question: "Jordan's tech sector will exceed $3 billion in revenue, led by Maktoob/Mawdoo3-era companies", count: "4,890", yes: 54, no: 46, momentum: 1.2, up: true, data: spark(50, "up") },
  { id: 148, category: "Health & Demographics", resolves: "Dec 2027", question: "Jordan's water crisis will force year-round rationing in Amman (currently seasonal)", count: "6,123", yes: 61, no: 39, momentum: 1.6, up: true, data: spark(55, "up") },
  { id: 149, category: "Culture & Society", resolves: "Dec 2026", question: "Jordan will amend its penal code to eliminate reduced sentences for 'honor' crimes", count: "5,345", yes: 38, no: 62, momentum: 0.7, up: false, data: spark(40, "flat") },

  // ─── LEBANON ──────────────────────────────────────────────
  { id: 150, category: "Economy & Finance", resolves: "Dec 2027", question: "Lebanon's banking sector will begin formal restructuring with depositor compensation plan", count: "7,234", yes: 34, no: 66, momentum: 0.8, up: false, data: spark(37, "down") },
  { id: 151, category: "Infrastructure & Cities", resolves: "Jun 2028", question: "Beirut port explosion site will have a completed memorial and reconstruction plan underway", count: "5,678", yes: 42, no: 58, momentum: 0.9, up: true, data: spark(38, "up") },
  { id: 152, category: "Health & Demographics", resolves: "Dec 2027", question: "Lebanon will lose more than 40% of its physicians to emigration (up from 30% in 2023)", count: "4,901", yes: 72, no: 28, momentum: 1.3, up: true, data: spark(68, "up") },
  { id: 153, category: "Energy & Climate", resolves: "Dec 2028", question: "Lebanon will begin offshore gas extraction from Block 9 (Qana prospect)", count: "5,456", yes: 28, no: 72, momentum: 0.4, up: false, data: spark(31, "down", 1) },
  { id: 154, category: "Culture & Society", resolves: "Jun 2027", question: "Beirut will reclaim its position as the Arab world's top publishing city by title output", count: "4,012", yes: 45, no: 55, momentum: 0.6, up: false, data: spark(48, "flat") },
  { id: 155, category: "Geopolitics & Governance", resolves: "Dec 2027", question: "Lebanon's new government will implement the Taif Agreement's decentralization provisions", count: "5,234", yes: 21, no: 79, momentum: 0.3, up: false, data: spark(23, "down", 1) },

  // ─── IRAQ ─────────────────────────────────────────────────
  { id: 156, category: "Infrastructure & Cities", resolves: "Dec 2028", question: "Iraq's Grand Faw Port on the Persian Gulf will complete Phase 1 and begin commercial operations", count: "7,123", yes: 52, no: 48, momentum: 1.1, up: true, data: spark(48, "up") },
  { id: 157, category: "Economy & Finance", resolves: "Jun 2027", question: "Iraq's Development Road (1,200 km rail corridor to Turkey) will complete its first section", count: "5,890", yes: 35, no: 65, momentum: 0.7, up: false, data: spark(38, "down") },
  { id: 158, category: "Energy & Climate", resolves: "Dec 2027", question: "Iraq will reduce natural gas flaring by 50% from 2023 levels (currently world's 2nd-largest flarer)", count: "4,567", yes: 27, no: 73, momentum: 0.5, up: false, data: spark(30, "down", 1) },
  { id: 159, category: "Health & Demographics", resolves: "Dec 2028", question: "Iraq's cancer rates in Basra and Fallujah will be formally linked to depleted uranium exposure by WHO", count: "3,901", yes: 44, no: 56, momentum: 0.8, up: true, data: spark(40, "up") },
  { id: 160, category: "Culture & Society", resolves: "Jun 2027", question: "Iraqi Kurdistan's tourism sector will exceed 5 million visitors annually", count: "5,234", yes: 57, no: 43, momentum: 1.0, up: true, data: spark(53, "up") },
  { id: 161, category: "Technology & AI", resolves: "Dec 2027", question: "Iraq will complete its national fiber-optic backbone connecting all 18 governorates", count: "4,345", yes: 41, no: 59, momentum: 0.6, up: false, data: spark(43, "flat") },

  // ─── KUWAIT ───────────────────────────────────────────────
  { id: 162, category: "Infrastructure & Cities", resolves: "Dec 2029", question: "Kuwait's Mubarak Al-Kabeer Port (Bubiyan Island) will reach initial operating capacity", count: "5,678", yes: 38, no: 62, momentum: 0.7, up: false, data: spark(41, "down") },
  { id: 163, category: "Economy & Finance", resolves: "Dec 2026", question: "Kuwait's parliament will pass the public debt law after 7+ years of deadlock", count: "6,890", yes: 52, no: 48, momentum: 1.4, up: true, data: spark(47, "up") },
  { id: 164, category: "Health & Demographics", resolves: "Dec 2027", question: "Kuwait's diabetes prevalence will remain the world's highest at 24%+ of adults", count: "4,123", yes: 78, no: 22, momentum: 0.3, up: true, data: spark(76, "up", 1) },
  { id: 165, category: "Geopolitics & Governance", resolves: "Jun 2028", question: "Kuwait will implement its expat population cap, reducing non-Kuwaiti residents by 15%", count: "5,456", yes: 34, no: 66, momentum: 0.9, up: false, data: spark(37, "down") },
  { id: 166, category: "Energy & Climate", resolves: "Dec 2027", question: "Kuwait's Shagaya renewable energy park will reach its 4.5 GW target", count: "4,789", yes: 29, no: 71, momentum: 0.5, up: false, data: spark(32, "down", 1) },

  // ─── BAHRAIN ──────────────────────────────────────────────
  { id: 167, category: "Economy & Finance", resolves: "Dec 2027", question: "Bahrain's fiscal balance plan will reduce its budget deficit below 3% of GDP", count: "4,567", yes: 36, no: 64, momentum: 0.7, up: false, data: spark(39, "down") },
  { id: 168, category: "Business & Startups", resolves: "Jun 2027", question: "Bahrain's fintech ecosystem will host 200+ licensed fintech firms (currently 120+)", count: "5,234", yes: 58, no: 42, momentum: 1.1, up: true, data: spark(54, "up") },
  { id: 169, category: "Infrastructure & Cities", resolves: "Dec 2028", question: "The King Hamad Causeway (second Bahrain-Saudi link) will begin construction", count: "6,012", yes: 41, no: 59, momentum: 0.6, up: false, data: spark(43, "flat") },
  { id: 170, category: "Culture & Society", resolves: "Jun 2027", question: "Bahrain's Pearling Path UNESCO World Heritage site will draw 500,000 annual tourists", count: "3,890", yes: 49, no: 51, momentum: 0.8, up: true, data: spark(46, "up") },

  // ─── QATAR ────────────────────────────────────────────────
  { id: 171, category: "Energy & Climate", resolves: "Dec 2027", question: "Qatar's North Field LNG expansion will increase production capacity to 126 MTPA (from 77 MTPA)", count: "8,456", yes: 71, no: 29, momentum: 0.6, up: true, data: spark(68, "up", 1) },
  { id: 172, category: "Education & Workforce", resolves: "Jun 2028", question: "Qatar Foundation's Education City will host 15+ international university branches", count: "5,234", yes: 66, no: 34, momentum: 0.5, up: true, data: spark(64, "up", 1) },
  { id: 173, category: "Economy & Finance", resolves: "Dec 2027", question: "Qatar Investment Authority's global portfolio will exceed $500 billion in assets", count: "6,789", yes: 73, no: 27, momentum: 0.8, up: true, data: spark(70, "up") },
  { id: 174, category: "Culture & Society", resolves: "Dec 2026", question: "Qatar's kafala system reforms will result in measurable improvements in worker conditions per ILO audit", count: "5,678", yes: 32, no: 68, momentum: 0.7, up: false, data: spark(35, "down") },

  // ─── OMAN ─────────────────────────────────────────────────
  { id: 175, category: "Economy & Finance", resolves: "Dec 2028", question: "Oman's Vision 2040 will reduce oil dependency to below 60% of government revenue", count: "5,345", yes: 42, no: 58, momentum: 0.9, up: true, data: spark(38, "up") },
  { id: 176, category: "Infrastructure & Cities", resolves: "Jun 2028", question: "Oman's national railway (connecting Muscat to Sohar and Duqm) will begin operations", count: "4,901", yes: 36, no: 64, momentum: 0.5, up: false, data: spark(38, "down", 1) },
  { id: 177, category: "Business & Startups", resolves: "Dec 2027", question: "Oman's Duqm Special Economic Zone will attract cumulative investment exceeding $15 billion", count: "5,123", yes: 49, no: 51, momentum: 1.0, up: true, data: spark(45, "up") },
  { id: 178, category: "Culture & Society", resolves: "Dec 2026", question: "Oman's tourism sector will surpass 3.5 million visitors (Vision 2040 target ramp-up)", count: "4,567", yes: 54, no: 46, momentum: 0.7, up: true, data: spark(51, "up") },

  // ─── TURKEY ───────────────────────────────────────────────
  { id: 179, category: "Economy & Finance", resolves: "Dec 2027", question: "Turkey's inflation will drop below 20% annually (from 65% peak in 2024)", count: "8,901", yes: 47, no: 53, momentum: 1.5, up: true, data: spark(41, "up") },
  { id: 180, category: "Infrastructure & Cities", resolves: "Dec 2028", question: "Turkey's Kanal Istanbul (parallel to the Bosphorus) will complete its first phase", count: "7,234", yes: 28, no: 72, momentum: 0.4, up: false, data: spark(31, "down", 1) },
  { id: 181, category: "Business & Startups", resolves: "Jun 2027", question: "Turkey's defense industry exports will exceed $10 billion annually (Baykar drones leading)", count: "6,567", yes: 62, no: 38, momentum: 1.3, up: true, data: spark(58, "up") },
  { id: 182, category: "Health & Demographics", resolves: "Dec 2027", question: "Turkey's medical tourism revenue will surpass $15 billion (currently $10B+)", count: "5,890", yes: 56, no: 44, momentum: 0.9, up: true, data: spark(52, "up") },
  { id: 183, category: "Geopolitics & Governance", resolves: "Dec 2028", question: "Turkey will hold municipal elections with opposition parties winning 5+ major cities", count: "6,234", yes: 54, no: 46, momentum: 1.1, up: true, data: spark(50, "up") },
  { id: 184, category: "Energy & Climate", resolves: "Dec 2027", question: "Turkey's Akkuyu nuclear power plant will deliver first electricity to the grid", count: "7,012", yes: 61, no: 39, momentum: 0.7, up: true, data: spark(58, "up") },
  { id: 185, category: "Culture & Society", resolves: "Jun 2027", question: "Turkish TV series (dizi) export revenue will exceed $1 billion annually", count: "5,456", yes: 74, no: 26, momentum: 0.5, up: true, data: spark(72, "up", 1) },
  { id: 186, category: "Sports & Entertainment", resolves: "Dec 2028", question: "Istanbul will submit another Summer Olympics bid (after 5 failed bids)", count: "4,678", yes: 51, no: 49, momentum: 0.8, up: true, data: spark(48, "up") },

  // ─── PALESTINE ────────────────────────────────────────────
  { id: 187, category: "Geopolitics & Governance", resolves: "Dec 2028", question: "The number of UN member states recognizing Palestinian statehood will exceed 160 (currently 146)", count: "9,012", yes: 71, no: 29, momentum: 1.4, up: true, data: spark(66, "up") },
  { id: 188, category: "Economy & Finance", resolves: "Dec 2028", question: "Gaza reconstruction costs will officially be assessed at over $50 billion by the World Bank", count: "7,456", yes: 78, no: 22, momentum: 0.6, up: true, data: spark(75, "up", 1) },
  { id: 189, category: "Health & Demographics", resolves: "Jun 2028", question: "UNRWA will face existential funding crisis with annual budget gap exceeding $500 million", count: "6,345", yes: 74, no: 26, momentum: 1.7, up: true, data: spark(69, "up") },
  { id: 190, category: "Technology & AI", resolves: "Dec 2027", question: "Palestinian tech startups in Ramallah will collectively raise over $200 million in funding", count: "4,123", yes: 41, no: 59, momentum: 1.1, up: true, data: spark(36, "up") },

  // ─── YEMEN ────────────────────────────────────────────────
  { id: 191, category: "Geopolitics & Governance", resolves: "Dec 2027", question: "Yemen's Houthi-controlled areas will maintain de facto independence from the recognized government", count: "7,890", yes: 76, no: 24, momentum: 0.5, up: true, data: spark(74, "up", 1) },
  { id: 192, category: "Health & Demographics", resolves: "Dec 2027", question: "Yemen will remain the world's worst humanitarian crisis with 18+ million people needing aid", count: "6,567", yes: 81, no: 19, momentum: 0.4, up: true, data: spark(79, "up", 1) },
  { id: 193, category: "Economy & Finance", resolves: "Jun 2028", question: "Yemen's rial will continue dual exchange rates between Aden and Sana'a governments", count: "4,901", yes: 72, no: 28, momentum: 0.6, up: true, data: spark(69, "up") },
  { id: 194, category: "Energy & Climate", resolves: "Dec 2028", question: "The Safer oil tanker environmental disaster in the Red Sea will cost over $20 billion in damages", count: "5,234", yes: 48, no: 52, momentum: 0.9, up: true, data: spark(44, "up") },

  // ─── SUDAN ────────────────────────────────────────────────
  { id: 195, category: "Geopolitics & Governance", resolves: "Dec 2027", question: "Sudan's civil war between SAF and RSF will continue with no formal ceasefire by end of 2027", count: "8,234", yes: 68, no: 32, momentum: 1.2, up: true, data: spark(64, "up") },
  { id: 196, category: "Health & Demographics", resolves: "Jun 2027", question: "Sudan's internally displaced population will exceed 12 million (currently 9M+)", count: "7,012", yes: 75, no: 25, momentum: 1.8, up: true, data: spark(70, "up") },
  { id: 197, category: "Economy & Finance", resolves: "Dec 2027", question: "Sudan's agricultural sector will remain below 50% of its pre-war production capacity", count: "4,567", yes: 71, no: 29, momentum: 0.7, up: true, data: spark(67, "up") },
  { id: 198, category: "Culture & Society", resolves: "Dec 2028", question: "Sudan's cultural heritage sites in Khartoum including the National Museum will sustain irreparable war damage", count: "5,123", yes: 64, no: 36, momentum: 1.0, up: true, data: spark(60, "up") },

  // ─── SYRIA ────────────────────────────────────────────────
  { id: 199, category: "Geopolitics & Governance", resolves: "Dec 2028", question: "Western sanctions on Syria will be partially lifted to enable reconstruction", count: "6,789", yes: 37, no: 63, momentum: 0.8, up: true, data: spark(33, "up") },
  { id: 200, category: "Economy & Finance", resolves: "Dec 2028", question: "Syria's reconstruction will attract less than $5 billion in international funding (vs. $400B needed)", count: "5,456", yes: 74, no: 26, momentum: 0.6, up: true, data: spark(71, "up") },
  { id: 201, category: "Health & Demographics", resolves: "Jun 2028", question: "Fewer than 500,000 Syrian refugees will have returned home (out of 5.5 million abroad)", count: "6,012", yes: 68, no: 32, momentum: 0.9, up: true, data: spark(64, "up") },
  { id: 202, category: "Culture & Society", resolves: "Dec 2027", question: "Syria's pre-war population of 21 million will remain below 18 million due to displacement and emigration", count: "4,890", yes: 72, no: 28, momentum: 0.4, up: true, data: spark(70, "up", 1) },

  // ─── LIBYA ────────────────────────────────────────────────
  { id: 203, category: "Energy & Climate", resolves: "Dec 2027", question: "Libya's oil production will stabilize above 1.2 million barrels per day despite political division", count: "5,678", yes: 51, no: 49, momentum: 1.0, up: true, data: spark(48, "up") },
  { id: 204, category: "Geopolitics & Governance", resolves: "Dec 2028", question: "Libya will remain governed by two rival administrations (Tripoli and Benghazi) through 2028", count: "6,345", yes: 73, no: 27, momentum: 0.5, up: true, data: spark(71, "up", 1) },
  { id: 205, category: "Infrastructure & Cities", resolves: "Dec 2028", question: "Derna flood reconstruction (2023 disaster, 11,000+ killed) will be less than 30% complete", count: "4,901", yes: 66, no: 34, momentum: 0.8, up: true, data: spark(62, "up") },
  { id: 206, category: "Health & Demographics", resolves: "Jun 2027", question: "Libya's healthcare system will continue operating at below 50% capacity due to conflict damage", count: "4,234", yes: 69, no: 31, momentum: 0.6, up: true, data: spark(66, "up") },

  // ─── CROSS-REGIONAL: DIVERSE COUNTRY FOCUS ────────────────
  { id: 207, category: "Economy & Finance", resolves: "Dec 2027", question: "Morocco's phosphate exports (OCP Group) will generate $10+ billion annually due to global fertilizer demand", count: "6,234", yes: 66, no: 34, momentum: 1.1, up: true, data: spark(62, "up") },
  { id: 208, category: "Technology & AI", resolves: "Jun 2028", question: "Turkey's Baykar will export Bayraktar TB3 drones to 30+ countries worldwide", count: "7,012", yes: 64, no: 36, momentum: 1.3, up: true, data: spark(59, "up") },
  { id: 209, category: "Education & Workforce", resolves: "Dec 2027", question: "Egyptian expat remittances will exceed $35 billion annually (key source of foreign currency)", count: "5,890", yes: 68, no: 32, momentum: 0.7, up: true, data: spark(65, "up") },
  { id: 210, category: "Business & Startups", resolves: "Jun 2027", question: "Jordan will have 1,000+ active tech startups, cementing its role as the Levant's startup hub", count: "4,567", yes: 55, no: 45, momentum: 1.0, up: true, data: spark(51, "up") },
  { id: 211, category: "Energy & Climate", resolves: "Dec 2028", question: "Algeria's Trans-Saharan gas pipeline to Nigeria will begin construction", count: "5,123", yes: 31, no: 69, momentum: 0.5, up: false, data: spark(34, "down", 1) },
  { id: 212, category: "Infrastructure & Cities", resolves: "Dec 2027", question: "Kuwait's South Al-Mutlaa City project will deliver 30,000 housing units (out of planned 400,000)", count: "4,678", yes: 43, no: 57, momentum: 0.6, up: false, data: spark(45, "flat") },
  { id: 213, category: "Culture & Society", resolves: "Jun 2027", question: "Lebanon's literary scene will produce 5+ internationally translated Arabic novels per year", count: "3,456", yes: 62, no: 38, momentum: 0.5, up: true, data: spark(59, "up") },
  { id: 214, category: "Sports & Entertainment", resolves: "Dec 2026", question: "Morocco's Atlas Lions will remain in the FIFA top 15 rankings through 2026", count: "6,789", yes: 61, no: 39, momentum: 0.8, up: true, data: spark(58, "up") },
  { id: 215, category: "Geopolitics & Governance", resolves: "Dec 2027", question: "Algeria will maintain its non-aligned foreign policy, refusing to join any Saudi or Iran-led bloc", count: "5,012", yes: 79, no: 21, momentum: 0.3, up: true, data: spark(77, "up", 1) },
  { id: 216, category: "Health & Demographics", resolves: "Dec 2028", question: "Turkey will face a net emigration of skilled workers exceeding 200,000 annually", count: "5,678", yes: 58, no: 42, momentum: 1.4, up: true, data: spark(53, "up") },
  { id: 217, category: "Economy & Finance", resolves: "Jun 2027", question: "Bahrain's aluminum industry (Alba) will remain the country's largest non-oil export at $3B+", count: "4,234", yes: 76, no: 24, momentum: 0.4, up: true, data: spark(74, "up", 1) },
  { id: 218, category: "Technology & AI", resolves: "Dec 2027", question: "Qatar's TASMU smart city platform will achieve 90% digital government service delivery", count: "5,345", yes: 62, no: 38, momentum: 0.9, up: true, data: spark(58, "up") },
  { id: 219, category: "Business & Startups", resolves: "Dec 2028", question: "Egypt's Golden Triangle mining project in the Eastern Desert will begin gold and mineral extraction", count: "4,901", yes: 44, no: 56, momentum: 0.7, up: true, data: spark(40, "up") },
  { id: 220, category: "Education & Workforce", resolves: "Jun 2028", question: "Tunisia's youth emigration rate will exceed 50% of university graduates within 5 years of graduation", count: "4,567", yes: 66, no: 34, momentum: 1.5, up: true, data: spark(61, "up") },
  { id: 221, category: "Infrastructure & Cities", resolves: "Dec 2029", question: "Iraq's Bismayah new city project south of Baghdad will house 500,000 residents", count: "4,234", yes: 37, no: 63, momentum: 0.6, up: false, data: spark(39, "down") },
  { id: 222, category: "Sports & Entertainment", resolves: "Jun 2027", question: "Algeria's national football team will qualify for the 2026 Africa Cup of Nations", count: "5,123", yes: 72, no: 28, momentum: 0.4, up: true, data: spark(70, "up", 1) },
  { id: 223, category: "Energy & Climate", resolves: "Dec 2028", question: "Jordan's Red Sea–Dead Sea desalination project will begin delivering water to Amman", count: "4,890", yes: 34, no: 66, momentum: 0.7, up: false, data: spark(37, "down") },
  { id: 224, category: "Geopolitics & Governance", resolves: "Dec 2027", question: "Iraq's Kurdistan Region will hold an independence referendum or formal autonomy vote", count: "4,012", yes: 18, no: 82, momentum: 0.4, up: false, data: spark(20, "flat", 1) },
  { id: 225, category: "Culture & Society", resolves: "Jun 2028", question: "Oman will open its Royal Opera House second venue, expanding Muscat's cultural tourism", count: "3,678", yes: 58, no: 42, momentum: 0.6, up: true, data: spark(55, "up") },
  { id: 226, category: "Economy & Finance", resolves: "Dec 2027", question: "Turkey's GDP will surpass $1.2 trillion, making it the world's 16th largest economy", count: "6,567", yes: 59, no: 41, momentum: 1.0, up: true, data: spark(55, "up") },
  { id: 227, category: "Health & Demographics", resolves: "Dec 2028", question: "Algeria's population will surpass 48 million with a fertility rate above 2.8", count: "4,345", yes: 75, no: 25, momentum: 0.3, up: true, data: spark(73, "up", 1) },
  { id: 228, category: "Technology & AI", resolves: "Jun 2027", question: "Morocco's Casablanca Finance City will host 250+ international financial firms", count: "4,789", yes: 56, no: 44, momentum: 0.8, up: true, data: spark(53, "up") },
  { id: 229, category: "Business & Startups", resolves: "Dec 2027", question: "Kuwait's direct investment portfolio through KIA will exceed $800 billion globally", count: "5,012", yes: 65, no: 35, momentum: 0.6, up: true, data: spark(62, "up") },
  { id: 230, category: "Education & Workforce", resolves: "Dec 2027", question: "Oman's Saudization (Omanization) rate in the private sector will reach 42%", count: "4,123", yes: 48, no: 52, momentum: 0.9, up: true, data: spark(44, "up") },
]

// Zero out all fabricated engagement data — keep content, remove fake counts
export const PREDICTIONS: PredictionCard[] = _RAW_PREDICTIONS.map(p => ({
  ...p,
  count: "0",
  yes: 50,
  no: 50,
  momentum: 0,
  up: true,
  data: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50],
}))

