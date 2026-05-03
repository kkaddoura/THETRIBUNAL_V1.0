import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { Share2, CheckCircle2 } from "lucide-react";
import { FilterSidebar } from "@/components/layout/FilterSidebar";
import { LiveNumber } from "@/components/live-counter/FlipDigit";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { ShareModal } from "@/components/ShareModal";
import type { PulseShareContext } from "@/lib/share";
import {
  usePulseTopics,
  usePageConfig,
  type ApiPulseTopic,
} from "@/hooks/use-cms-data";
import { usePageTitle } from "@/hooks/use-page-title";
import { TitlePunctuation } from "@/components/TitlePunctuation";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { LoadingDots } from "@/components/ui/loading-dots";

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
const BASE_DATE = new Date("2026-01-01T00:00:00Z").getTime();

interface TopicCard {
  id: string;
  tag: string;
  tagColor: string;
  title: string;
  stat: string;
  delta: string;
  deltaUp: boolean;
  blurb: string;
  source: string;
  sparkData: number[];
  live?: { baseValue: number; annualGrowth: number; prefix?: string };
}

function apiToTopicCard(t: ApiPulseTopic): TopicCard {
  return {
    id: t.topicId,
    tag: t.tag,
    tagColor: t.tagColor,
    title: t.title,
    stat: t.stat,
    delta: t.delta,
    deltaUp: t.deltaUp,
    blurb: t.blurb,
    source: t.source,
    sparkData: t.sparkData,
    live: t.liveConfig
      ? {
          baseValue: t.liveConfig.baseValue,
          annualGrowth: t.liveConfig.annualGrowth,
        }
      : undefined,
  };
}

const FALLBACK_CATEGORIES = [
  { key: "ALL", label: "All Trends", color: "#DC143C" },
  { key: "POWER", label: "Power & Politics", color: "#EF4444" },
  { key: "MONEY", label: "Money & Markets", color: "#F59E0B" },
  { key: "SOCIETY", label: "Society & Identity", color: "#EC4899" },
  { key: "TECHNOLOGY", label: "Tech & AI", color: "#3B82F6" },
  { key: "SURVIVAL", label: "Survival & Crisis", color: "#F97316" },
  { key: "MIGRATION", label: "Migration & Talent", color: "#EF4444" },
  { key: "CULTURE", label: "Culture & Religion", color: "#A855F7" },
  { key: "HEALTH", label: "Health & Youth", color: "#10B981" },
];

const FALLBACK_TOPICS: TopicCard[] = [
  {
    id: "authoritarianism-index",
    tag: "POWER",
    tagColor: "#EF4444",
    title: "Press Freedom Collapse",
    stat: "17 of 19 countries",
    delta: "Not Free",
    deltaUp: false,
    blurb:
      '17 of 19 MENA nations are rated "Not Free" or "Partly Free" by Freedom House. Egypt jails more journalists than any country on earth. Saudi Arabia\'s MBS consolidated more power than any Saudi ruler in history. The region has 0 full democracies.',
    source: "Freedom House 2026 / RSF Press Freedom Index",
    sparkData: [14, 14, 15, 15, 15, 16, 16, 16, 17, 17, 17, 17],
  },
  {
    id: "surveillance-tech",
    tag: "POWER",
    tagColor: "#EF4444",
    title: "Surveillance Tech Spending",
    stat: "$4.8B",
    delta: "+62% since 2021",
    deltaUp: true,
    blurb:
      "UAE deployed Pegasus spyware against its own citizens. Saudi Arabia monitors 23M social media accounts. Bahrain used facial recognition at protests. Egypt built a $45B new capital with surveillance baked into every street. MENA is the world's #1 buyer of spyware.",
    source: "Citizen Lab / Amnesty International / Carnegie Endowment",
    sparkData: [1.8, 2.1, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.2, 4.5, 4.7, 4.8],
  },
  {
    id: "political-prisoners",
    tag: "POWER",
    tagColor: "#EF4444",
    title: "Political Detainees",
    stat: "60,000+",
    delta: "Across MENA",
    deltaUp: false,
    blurb:
      "Egypt holds 60,000+ political prisoners — more than during Mubarak. Saudi detained women's rights activists for demanding the right to drive. Bahrain imprisoned its entire opposition leadership. UAE's Ahmed Mansoor: 10 years in solitary for tweeting.",
    source: "HRW / Amnesty International / ANHRI",
    sparkData: [35, 38, 40, 42, 44, 47, 50, 52, 54, 56, 58, 60],
  },
  {
    id: "wealth-inequality",
    tag: "MONEY",
    tagColor: "#F59E0B",
    title: "Billionaire Wealth vs. GDP",
    stat: "Top 10 = $186B",
    delta: "+41%",
    deltaUp: true,
    blurb:
      "The 10 richest Arabs hold $186B — more than the GDP of Jordan, Lebanon, Tunisia, Libya, and Yemen combined. Saudi's PIF alone manages $930B. Meanwhile: 40% of Egyptians live below the poverty line. The gap is the widest in recorded history.",
    source: "Forbes MENA Rich List 2026 / World Bank",
    sparkData: [95, 102, 110, 118, 125, 132, 140, 150, 160, 170, 178, 186],
  },
  {
    id: "inflation-crisis",
    tag: "MONEY",
    tagColor: "#F59E0B",
    title: "Cost of Living Crisis",
    stat: "Egypt: 38% inflation",
    delta: "Peak 2024",
    deltaUp: false,
    blurb:
      "Egypt's pound lost 70% of its value since 2022. Lebanon's lira collapsed 98%. Tunisia's middle class shrunk by 30%. Sudan's inflation hit 256%. Meanwhile: Dubai rent up 27% YoY. The region's cost of living crisis is creating two MENAs — one that's booming, one that's collapsing.",
    source: "IMF WEO / Central Bank of Egypt / BDL",
    sparkData: [12, 15, 19, 24, 29, 33, 38, 36, 34, 32, 30, 28],
  },
  {
    id: "crypto-volume",
    tag: "MONEY",
    tagColor: "#F59E0B",
    title: "Crypto Trading Volume",
    stat: "$338B",
    delta: "+74%",
    deltaUp: true,
    blurb:
      "UAE is now the world's 3rd largest crypto market by volume. Dubai issued more crypto licenses in 2026 than the entire EU combined. Bahrain became the first MENA nation to regulate stablecoins. Why? Populations who don't trust banks are going on-chain.",
    source: "Chainalysis MENA Report 2026",
    sparkData: [89, 110, 125, 145, 160, 180, 210, 240, 268, 295, 318, 338],
  },
  {
    id: "sovereign-wealth",
    tag: "MONEY",
    tagColor: "#F59E0B",
    title: "Sovereign Wealth Power",
    stat: "$4.1 Trillion",
    delta: "+18%",
    deltaUp: true,
    blurb:
      "Gulf sovereign wealth funds now control $4.1T — more than the GDP of Germany. ADIA, PIF, QIA, Mubadala, and KIA are buying everything: Newcastle FC, Lucid Motors, Jio, Twitter debt, Silicon Valley AI labs. The Gulf is becoming the world's landlord.",
    source: "SWF Institute / PIF Annual Report 2026",
    sparkData: [2.8, 2.9, 3.0, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4.1],
  },
  {
    id: "womens-rights",
    tag: "SOCIETY",
    tagColor: "#EC4899",
    title: "Women's Rights Gap",
    stat: "Worst region globally",
    delta: "WEF ranking",
    deltaUp: false,
    blurb:
      "MENA ranks last on the Global Gender Gap Index — every single year. Saudi women gained the right to drive in 2018, but male guardianship persists. Iran executed women for removing hijab. Yemen has no minimum marriage age. Kuwait: women couldn't vote until 2005. Progress is real but glacial.",
    source: "WEF Gender Gap Report 2026 / HRW",
    sparkData: [
      0.49, 0.5, 0.51, 0.51, 0.52, 0.52, 0.53, 0.53, 0.54, 0.54, 0.55, 0.55,
    ],
  },
  {
    id: "women-workforce",
    tag: "SOCIETY",
    tagColor: "#EC4899",
    title: "Women in the Workforce",
    stat: "33.4%",
    delta: "+9.2pp since 2019",
    deltaUp: true,
    blurb:
      "Saudi female workforce participation jumped from 17% to 33% in 6 years — the fastest rise in recorded history for any G20 nation. UAE boards now require 30% female representation. But: Yemen's female labor participation is 6%. Two realities.",
    source: "GASTAT / ILO 2026",
    sparkData: [17, 19, 21, 23, 25, 26, 28, 29, 30, 31, 32, 33.4],
  },
  {
    id: "honor-killings",
    tag: "SOCIETY",
    tagColor: "#EC4899",
    title: '"Honor"-Based Violence',
    stat: "~5,000/year",
    delta: "Underreported",
    deltaUp: false,
    blurb:
      "An estimated 5,000 \"honor\" killings occur annually — the real number is likely 4x higher. Jordan's penal code still offers reduced sentences. Iraq's tribal courts operate outside state law. Pakistan recorded 1,000+ cases in 2025 alone. Most cases never reach a courtroom.",
    source: "UN Women / UNFPA / HRW",
    sparkData: [5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0],
  },
  {
    id: "lgbtq-criminalization",
    tag: "SOCIETY",
    tagColor: "#EC4899",
    title: "LGBTQ+ Criminalization",
    stat: "18 of 19 countries",
    delta: "Death penalty in 6",
    deltaUp: false,
    blurb:
      "Homosexuality is illegal in 18 of 19 MENA countries. Six carry the death penalty (Iran, Saudi, Yemen, Qatar, UAE, Mauritania). Egypt uses dating apps to entrap gay men. Iraq passed a 15-year prison sentence law in 2024. Zero MENA countries recognize same-sex unions.",
    source: "ILGA World Database / HRW",
    sparkData: [18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18],
  },
  {
    id: "ai-adoption",
    tag: "TECHNOLOGY",
    tagColor: "#3B82F6",
    title: "AI Adoption Rate",
    stat: "68%",
    delta: "+31% YoY",
    deltaUp: true,
    blurb:
      "UAE ranks #1 globally in government AI readiness. Saudi Arabia's $100B AI fund is the largest sovereign AI bet on earth. Over 1,200 Arabic-language AI startups founded since 2023. But: AI is also being used for mass surveillance, deepfake propaganda, and social scoring.",
    source: "Oxford Insights / PIF / SDAIA",
    sparkData: [22, 28, 31, 35, 39, 42, 48, 52, 55, 59, 63, 68],
  },
  {
    id: "digital-censorship",
    tag: "TECHNOLOGY",
    tagColor: "#3B82F6",
    title: "Internet Censorship",
    stat: "8 countries block VPNs",
    delta: "+3 since 2022",
    deltaUp: true,
    blurb:
      "Iran shut down the internet during protests — 80M people went dark. Egypt blocks 600+ websites including Medium and HuffPost. Saudi Arabia monitors WhatsApp groups. UAE criminalizes VPN use for \"illegal purposes.\" The world's most connected youth lives behind the world's thickest firewalls.",
    source: "NetBlocks / Access Now / OONI",
    sparkData: [3, 4, 4, 5, 5, 5, 6, 6, 7, 7, 8, 8],
  },
  {
    id: "gaming",
    tag: "TECHNOLOGY",
    tagColor: "#3B82F6",
    title: "MENA Gaming Market",
    stat: "$6.8B",
    delta: "+28%",
    deltaUp: true,
    blurb:
      "Saudi Arabia is now the world's largest gaming investor through Savvy Games Group ($38B deployed). 85% of Saudi youth play daily. Riyadh hosts the world's largest esports arena. Gaming is the region's escape valve — and its governments know it.",
    source: "Newzoo / Savvy Games Group",
    sparkData: [2.1, 2.5, 2.9, 3.3, 3.7, 4.0, 4.5, 5.0, 5.5, 6.0, 6.4, 6.8],
  },
  {
    id: "water-crisis",
    tag: "SURVIVAL",
    tagColor: "#F97316",
    title: "Water Scarcity Emergency",
    stat: "12 of 19 countries",
    delta: "Below crisis threshold",
    deltaUp: false,
    blurb:
      "MENA has 1% of the world's freshwater but 6% of its population. Jordan has less water per capita than the Sahara. Yemen's capital Sana'a could be the first to run dry. Iraq's Tigris and Euphrates are at 30% of historical flow — Turkey and Iran are damming them. By 2040, 14 of the 33 most water-stressed countries will be in MENA.",
    source: "World Resources Institute / FAO / UNICEF",
    sparkData: [8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12],
  },
  {
    id: "food-security",
    tag: "SURVIVAL",
    tagColor: "#F97316",
    title: "Food Import Dependency",
    stat: "85% imported",
    delta: "Zero change",
    deltaUp: false,
    blurb:
      "GCC imports 85% of its food. One disrupted shipping lane (Suez, Strait of Hormuz) and 60M people face shortages. Saudi Arabia spent $2.4B on vertical farming. Qatar built 70% food self-sufficiency from 0% after the 2017 blockade. Yemen: 17M food-insecure. Sudan: famine declared.",
    source: "FAO / KAUST / WFP",
    sparkData: [87, 87, 86, 86, 86, 85, 85, 85, 85, 85, 85, 85],
  },
  {
    id: "climate-heat",
    tag: "SURVIVAL",
    tagColor: "#F97316",
    title: "Lethal Heat Threshold",
    stat: "56°C recorded",
    delta: "Uninhabitable by 2060",
    deltaUp: true,
    blurb:
      "Parts of Iraq, Kuwait, and UAE are approaching the wet-bulb temperature threshold — beyond which the human body cannot cool itself. Kuwait recorded 56°C. Outdoor laborers in Qatar die at 4x the reported rate. By 2060, summer temperatures in the Gulf could exceed human survivability for 6 hours/day.",
    source: "MIT / Lancet Countdown / Nature Climate Change",
    sparkData: [48, 49, 49, 50, 51, 51, 52, 53, 53, 54, 55, 56],
  },
  {
    id: "displaced-populations",
    tag: "SURVIVAL",
    tagColor: "#F97316",
    title: "Displaced Populations",
    stat: "42 Million",
    delta: "Refugees + IDPs",
    deltaUp: false,
    blurb:
      "Syria: 13M displaced. Yemen: 4.5M. Iraq: 2.5M. Sudan: 9M+ (2024 war). Palestine: 6M registered refugees since 1948. Lebanon hosts more refugees per capita than any country on earth. Jordan: 1 in 3 residents is a refugee. The region produces — and absorbs — more displacement than anywhere.",
    source: "UNHCR / UNRWA / IOM 2026",
    sparkData: [28, 30, 31, 32, 33, 34, 35, 36, 38, 39, 41, 42],
    live: { baseValue: 42_000_000, annualGrowth: 0.03 },
  },
  {
    id: "kafala-system",
    tag: "MIGRATION",
    tagColor: "#EF4444",
    title: "Kafala Sponsorship System",
    stat: "23M workers affected",
    delta: "Reforms stalling",
    deltaUp: false,
    blurb:
      "23M migrant workers across the Gulf live under the kafala system — their visa, housing, and legal status tied to a single employer. Qatar reformed it post-World Cup; workers say nothing changed. Saudi loosened rules but enforcement is minimal. UAE's reforms exclude domestic workers. The modern workforce built on medieval contracts.",
    source: "ILO / Amnesty International / Equidem",
    sparkData: [25, 25, 24, 24, 24, 24, 23, 23, 23, 23, 23, 23],
  },
  {
    id: "brain-drain",
    tag: "MIGRATION",
    tagColor: "#EF4444",
    title: "MENA Brain Drain",
    stat: "1 in 3 graduates leave",
    delta: "Accelerating",
    deltaUp: false,
    blurb:
      "Lebanon lost 50% of its physicians. 77% of Tunisian engineers want to emigrate. Iraq lost 23,000 academics since 2003. Egypt loses 800+ doctors/year to the Gulf and Europe. Counter-trend: UAE and Saudi are poaching Silicon Valley talent. The region's brains are redistributing, not disappearing.",
    source: "IOM / World Bank / Arab Barometer",
    sparkData: [22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33],
  },
  {
    id: "expat-exodus",
    tag: "MIGRATION",
    tagColor: "#EF4444",
    title: "Nationalization vs. Expat Workforce",
    stat: "1.2M jobs nationalized",
    delta: "Since 2021",
    deltaUp: false,
    blurb:
      "Saudi Nitaqat reforms displaced 800K+ expat workers. UAE's Emiratisation mandate: 2% annual private sector targets. Kuwait proposed a 30% expat cap. Oman replaced 100K expats. The Gulf built its economies on imported labor — now it's trying to undo that without crashing them.",
    source: "HRDF / MOHRE / IOM",
    sparkData: [120, 250, 380, 470, 560, 650, 740, 830, 920, 1010, 1100, 1200],
  },
  {
    id: "sectarian-divide",
    tag: "CULTURE",
    tagColor: "#A855F7",
    title: "Sectarian Tension Index",
    stat: "7 active conflicts",
    delta: "Sunni–Shia fault line",
    deltaUp: false,
    blurb:
      "Iraq, Syria, Yemen, Lebanon, Bahrain, Iran, and Saudi Arabia all have active sectarian fault lines. Iran funds Hezbollah ($700M/yr), Hamas, and Houthis. Saudi Arabia leads a Sunni coalition. Bahrain's Shia majority is ruled by a Sunni monarchy. The 1,400-year-old divide still shapes every election, war, and alliance.",
    source: "IISS / Carnegie Middle East Center",
    sparkData: [5, 5, 6, 6, 6, 7, 7, 7, 7, 7, 7, 7],
  },
  {
    id: "religious-decline",
    tag: "CULTURE",
    tagColor: "#A855F7",
    title: "Religious Observance Decline",
    stat: "18% drop in prayer",
    delta: "Since 2013",
    deltaUp: false,
    blurb:
      'Arab Barometer: the share of Arabs identifying as "not religious" doubled in 10 years. Tunisia: 33% of youth say religion is unimportant. Lebanon: mosque attendance down 22%. Saudi Arabia opened cinemas, concerts, mixed-gender events. The most religious region on earth is quietly secularizing — and nobody\'s allowed to say it.',
    source: "Arab Barometer Wave VII / Pew Research",
    sparkData: [82, 80, 79, 77, 76, 74, 73, 71, 70, 68, 66, 64],
  },
  {
    id: "blasphemy-laws",
    tag: "CULTURE",
    tagColor: "#A855F7",
    title: "Blasphemy & Apostasy Laws",
    stat: "14 countries",
    delta: "Death penalty in 6",
    deltaUp: false,
    blurb:
      'Leaving Islam is punishable by death in 6 MENA countries. Saudi Arabia classifies atheism as terrorism. Kuwait imprisons for "insulting religion" on social media. Egypt jailed a teenager for posting a meme about the Quran. Blasphemy laws are the region\'s most powerful tool of intellectual control.',
    source: "USCIRF / Library of Congress / HRW",
    sparkData: [14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14],
  },
  {
    id: "creator-economy",
    tag: "CULTURE",
    tagColor: "#A855F7",
    title: "MENA Creator Economy",
    stat: "$1.2B",
    delta: "+42%",
    deltaUp: true,
    blurb:
      "Arabic is now the 4th most-used language on TikTok. Saudi Arabia alone has 28M+ active TikTok users. The average MENA influencer earns 3x more per post than their European counterpart. But creators self-censor — one wrong post and you lose your visa, your freedom, or both.",
    source: "Arab Social Media Report / TikTok 2026",
    sparkData: [0.3, 0.4, 0.5, 0.55, 0.6, 0.7, 0.78, 0.85, 0.92, 1.0, 1.1, 1.2],
  },
  {
    id: "mental-health",
    tag: "HEALTH",
    tagColor: "#10B981",
    title: "Mental Health Search Volume",
    stat: "312% increase",
    delta: "+312%",
    deltaUp: true,
    blurb:
      '"Anxiety" in Arabic is now the most-searched health term in 14 MENA countries. Saudi Arabia launched 1,600 mental health clinics. UAE made therapy sessions tax-deductible. Still: 1 psychiatrist per 250,000 people in Egypt. Suicide is illegal in 12 MENA countries. Stigma kills more than the illness.',
    source: "Google Trends MENA / WHO EMRO",
    sparkData: [30, 42, 55, 68, 82, 95, 110, 135, 168, 210, 265, 312],
  },
  {
    id: "youth-unemployment",
    tag: "HEALTH",
    tagColor: "#10B981",
    title: "Youth Unemployment",
    stat: "26%",
    delta: "Highest globally",
    deltaUp: false,
    blurb:
      "MENA youth unemployment is the highest on earth — 2x the global average. Tunisia: 36%. Jordan: 40%. Egypt: 29%. Libya: 50%. The region's youngest population has the fewest jobs. 10M new jobs needed annually just to keep up. Saudi Vision 2030 created 600K jobs — and needs 4M more.",
    source: "ILO Global Employment Trends 2026",
    sparkData: [25, 25, 26, 27, 28, 28, 27, 27, 26, 26, 26, 26],
  },
  {
    id: "youth-bulge",
    tag: "HEALTH",
    tagColor: "#10B981",
    title: "Population Under 30",
    stat: "60%",
    delta: "~325M people",
    deltaUp: true,
    blurb:
      "MENA has the youngest population on earth relative to its economy. Median age: 26 (vs. Europe: 44). Egypt adds 2M people per year. Gaza's median age is 18. This is either the region's greatest asset or a ticking time bomb — depending on whether it creates jobs or just creates frustration.",
    source: "UN Population Division / ILO",
    sparkData: [63, 63, 62, 62, 62, 61, 61, 61, 61, 60, 60, 60],
    live: { baseValue: 325_000_000, annualGrowth: 0.016 },
  },
  {
    id: "child-marriage",
    tag: "HEALTH",
    tagColor: "#10B981",
    title: "Child Marriage Rate",
    stat: "1 in 5 girls",
    delta: "Before age 18",
    deltaUp: false,
    blurb:
      "20% of girls in MENA are married before 18. Yemen: 32%. Sudan: 34%. Egypt: 17%. Iraq: 24%. Child marriage spiked during COVID and during conflicts — families marry daughters to reduce mouths to feed. Only Tunisia and Morocco have set 18 as the minimum with no exceptions.",
    source: "UNICEF / Girls Not Brides / UNFPA",
    sparkData: [25, 24, 24, 23, 23, 22, 22, 21, 21, 20, 20, 20],
  },
  {
    id: "oil-dependency",
    tag: "MONEY",
    tagColor: "#F59E0B",
    title: "Oil Revenue Dependency",
    stat: "70% of Gulf GDP",
    delta: "Target: 50% by 2030",
    deltaUp: false,
    blurb:
      "Despite Vision 2030 rhetoric, oil still funds 70%+ of Saudi, Kuwait, and Iraq government budgets. The entire Gulf economic miracle runs on a commodity that the world is trying to quit. UAE is furthest along in diversification (30% oil). Iraq is 95% oil-dependent. The clock is ticking louder than any press release admits.",
    source: "IMF Article IV Consultations / OPEC",
    sparkData: [85, 83, 82, 80, 78, 76, 75, 74, 73, 72, 71, 70],
  },
  {
    id: "sportswashing",
    tag: "POWER",
    tagColor: "#EF4444",
    title: "Sportswashing Spending",
    stat: "$75B+",
    delta: "Since 2016",
    deltaUp: true,
    blurb:
      "Saudi: LIV Golf ($2B), Newcastle FC ($700M), Cristiano Ronaldo ($200M/yr), WWE, Formula 1, esports. Qatar: World Cup ($220B). UAE: Man City, Formula 1, UFC. The region spent more on sports in 10 years than most nations spend on healthcare. Critics call it reputation laundering. Gulf states call it diversification.",
    source: "Grant Liberty / PlayTheGame / Forbes",
    sparkData: [8, 15, 22, 28, 35, 42, 48, 55, 60, 65, 70, 75],
  },
  {
    id: "normalization",
    tag: "POWER",
    tagColor: "#EF4444",
    title: "Arab-Israel Normalization",
    stat: "4 Abraham Accords",
    delta: "Saudi deal pending",
    deltaUp: true,
    blurb:
      "UAE, Bahrain, Morocco, and Sudan normalized with Israel. Saudi Arabia was reportedly weeks away before Oct 7. Trade between UAE and Israel hit $3.5B. Meanwhile: 85% of Arab public opinion still opposes normalization. The gap between governments and their people has never been wider on this issue.",
    source: "Arab Barometer / Abraham Accords Institute",
    sparkData: [0, 0, 0, 0, 2, 2, 3, 3, 4, 4, 4, 4],
  },
  {
    id: "tobacco-epidemic",
    tag: "HEALTH",
    tagColor: "#10B981",
    title: "Tobacco & Vaping Epidemic",
    stat: "42% male smoking rate",
    delta: "Vaping +180%",
    deltaUp: true,
    blurb:
      "MENA has the fastest-growing vaping market on earth. Jordan: 65% of men smoke — highest globally. Lebanon: 37% of teenagers vape. Egypt sells cigarettes for $1.50/pack. Saudi Arabia banned shisha in restaurants then reversed it within months. WHO calls MENA the last tobacco frontier.",
    source: "WHO EMRO / Euromonitor / Lancet",
    sparkData: [25, 27, 29, 31, 33, 34, 36, 37, 38, 39, 41, 42],
  },
  {
    id: "cannabis-debate",
    tag: "CULTURE",
    tagColor: "#A855F7",
    title: "Cannabis Reform Momentum",
    stat: "3 countries decriminalizing",
    delta: "Morocco, Lebanon, Tunisia",
    deltaUp: true,
    blurb:
      "Morocco legalized medical cannabis and became Africa's largest legal exporter ($420M in 2026). Lebanon passed cultivation laws for export. Tunisia is debating personal use decriminalization. Still: UAE punishes possession with prison. Saudi Arabia executes for trafficking. The war on drugs is splitting MENA in two.",
    source: "INCB / Reuters / Morocco Ministry of Interior",
    sparkData: [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 3, 3],
  },
  {
    id: "tourism-boom",
    tag: "MONEY",
    tagColor: "#F59E0B",
    title: "Saudi Tourism Revolution",
    stat: "109M visits",
    delta: "+23%",
    deltaUp: true,
    blurb:
      "Saudi Arabia went from 0 tourist visas to 109M visits in 5 years. NEOM's Sindalah island opens 2026. AlUla saw 500,000 visitors. Vision 2030 target: 150M by 2030. Alcohol now served in diplomatic zones. A kingdom that banned cinemas until 2018 is now building a Disneyland competitor.",
    source: "Saudi Tourism Authority / MoT",
    sparkData: [18, 27, 39, 51, 62, 70, 78, 85, 92, 98, 104, 109],
  },
  {
    id: "domestic-workers",
    tag: "MIGRATION",
    tagColor: "#EF4444",
    title: "Domestic Worker Abuse",
    stat: "3.2M+ workers",
    delta: "Minimal protections",
    deltaUp: false,
    blurb:
      "3.2M domestic workers across the Gulf — mostly women from Ethiopia, Philippines, and South Asia — live in employers' homes with no labor law protections. Passport confiscation is illegal but universal. Kuwait: 2 domestic worker deaths/week reported. UAE excluded domestic workers from 2022 labor reforms. The invisible workforce.",
    source: "HRW / ILO / Amnesty International",
    sparkData: [2.5, 2.6, 2.7, 2.8, 2.8, 2.9, 2.9, 3.0, 3.0, 3.1, 3.1, 3.2],
  },
  {
    id: "military-spending",
    tag: "POWER",
    tagColor: "#EF4444",
    title: "Military Expenditure",
    stat: "$198B annually",
    delta: "+9% YoY",
    deltaUp: true,
    blurb:
      "Saudi Arabia is the world's 5th largest military spender at $75B. UAE spends more per capita on defense than any country on earth. Egypt receives $1.3B/yr in US military aid. Meanwhile: MENA has 0 countries with universal healthcare. The region's priorities are etched in its budgets.",
    source: "SIPRI 2026 / IISS Military Balance",
    sparkData: [145, 150, 155, 160, 165, 170, 175, 180, 185, 190, 194, 198],
  },
  {
    id: "death-penalty",
    tag: "POWER",
    tagColor: "#EF4444",
    title: "Death Penalty Executions",
    stat: "1,100+ in 2025",
    delta: "Iran + Saudi = 85%",
    deltaUp: true,
    blurb:
      "Iran executed 901 people in 2025 — highest in 30 years. Saudi Arabia executed 196, including for drug offenses. Egypt's death row holds 2,000+. Iraq resumed mass executions. MENA accounts for 76% of all recorded executions globally. Many are for nonviolent offenses.",
    source: "Amnesty International / Iran Human Rights / Reprieve",
    sparkData: [680, 720, 760, 800, 830, 860, 900, 940, 980, 1020, 1060, 1100],
  },
  {
    id: "arms-imports",
    tag: "POWER",
    tagColor: "#EF4444",
    title: "Arms Import Volume",
    stat: "35% of global arms trade",
    delta: "Top buyer since 2015",
    deltaUp: true,
    blurb:
      "MENA imports more weapons than any other region. Saudi Arabia is the world's #1 arms importer. UAE bought $23B in F-35s. Egypt operates the largest fleet of French Rafales outside France. Qatar's military budget is $15B for a population of 300K citizens. The arms race shows no signs of cooling.",
    source: "SIPRI Arms Transfer Database 2026",
    sparkData: [28, 29, 30, 31, 32, 33, 33, 34, 34, 35, 35, 35],
  },
  {
    id: "remittances",
    tag: "MONEY",
    tagColor: "#F59E0B",
    title: "Remittance Outflows",
    stat: "$128B annually",
    delta: "+11%",
    deltaUp: true,
    blurb:
      "Gulf states are the world's largest remittance senders. Saudi alone sends $39B/yr — more than the GDP of Bahrain. UAE sends $47B. This money keeps 200M+ people alive in South Asia, Africa, and the Philippines. One Houthi missile at a Saudi port doesn't just threaten oil. It threatens dinner in Lahore.",
    source: "World Bank Remittance Data 2026",
    sparkData: [82, 86, 90, 95, 100, 104, 108, 112, 116, 120, 124, 128],
  },
  {
    id: "real-estate-boom",
    tag: "MONEY",
    tagColor: "#F59E0B",
    title: "Real Estate Mega-Projects",
    stat: "$1.3 Trillion planned",
    delta: "Delivery risk: HIGH",
    deltaUp: true,
    blurb:
      "NEOM: $500B. The Line: $200B. Jeddah Tower: $1.4B (still unfinished). Dubai's Palm Jebel Ali revival: $10B. Egypt's New Administrative Capital: $58B. The Gulf is building the largest construction pipeline in human history — with a 40-year track record of 60% of mega-projects being delayed or downscaled.",
    source: "MEED Projects / Knight Frank / JLL",
    sparkData: [400, 480, 550, 620, 700, 780, 850, 920, 1000, 1100, 1200, 1300],
  },
  {
    id: "debt-crisis",
    tag: "MONEY",
    tagColor: "#F59E0B",
    title: "Public Debt Surge",
    stat: "Egypt: 92% of GDP",
    delta: "Lebanon: 150%+",
    deltaUp: true,
    blurb:
      "Lebanon's debt-to-GDP hit 150% before the banking collapse. Egypt owes $165B externally — more than its foreign reserves. Tunisia's debt is 80% of GDP. Jordan: 89%. Bahrain: 130%. Even oil-rich Iraq carries $72B in debt. The non-oil MENA states are running on borrowed time and borrowed money.",
    source: "IMF WEO / World Bank / Central Bank data",
    sparkData: [72, 75, 78, 80, 82, 84, 86, 87, 88, 89, 91, 92],
  },
  {
    id: "fintech-explosion",
    tag: "MONEY",
    tagColor: "#F59E0B",
    title: "Fintech Adoption",
    stat: "843 fintech startups",
    delta: "+58% since 2023",
    deltaUp: true,
    blurb:
      "UAE has 350+ fintechs. Saudi Arabia's digital payments hit 70% of transactions (was 18% in 2019). Egypt's mobile wallets grew 400% in 3 years. Bahrain issues more crypto licenses than traditional banking licenses. The unbanked population (100M+ in MENA) is leapfrogging straight to digital.",
    source: "MAGNiTT / SAMA / CBB",
    sparkData: [290, 340, 390, 440, 490, 540, 590, 640, 690, 740, 790, 843],
  },
  {
    id: "divorce-rates",
    tag: "SOCIETY",
    tagColor: "#EC4899",
    title: "Divorce Rate Surge",
    stat: "1 in 3 marriages",
    delta: "+22% in 5 years",
    deltaUp: true,
    blurb:
      "Kuwait: 48% divorce rate — nearly 1 in 2 marriages ends. Jordan: 37%. Egypt: 35%. Saudi Arabia: 28% and climbing fast. Women filing for khula' (no-fault divorce) increased 300% across the Gulf since 2019. Financial independence, social media, and legal reform are reshaping the Arab family unit.",
    source: "Arab Social Media Report / National Statistics Bureaus",
    sparkData: [24, 25, 26, 27, 28, 29, 29, 30, 31, 31, 32, 33],
  },
  {
    id: "social-media-penetration",
    tag: "SOCIETY",
    tagColor: "#EC4899",
    title: "Social Media Penetration",
    stat: "99% in UAE",
    delta: "Highest globally",
    deltaUp: true,
    blurb:
      "UAE has 99% social media penetration — #1 on earth. Saudi Arabia: 98%. Bahrain: 97%. Average MENA user spends 3.5 hours/day on social platforms. TikTok is the #1 news source for under-25s. Governments monitor every platform. Your feed is curated. But so is your freedom on it.",
    source: "DataReportal / We Are Social 2026",
    sparkData: [85, 87, 89, 90, 92, 93, 94, 95, 96, 97, 98, 99],
  },
  {
    id: "education-spend",
    tag: "SOCIETY",
    tagColor: "#EC4899",
    title: "Education Spending vs. Outcomes",
    stat: "5.2% of GDP average",
    delta: "PISA: Bottom quartile",
    deltaUp: false,
    blurb:
      "MENA spends more on education than Latin America but scores worse on every international assessment. Saudi spends $52B/yr on education — PISA scores rank 70th. UAE invested $2.8B in university cities but 40% of graduates can't find jobs. The money is there. The results aren't.",
    source: "OECD PISA 2025 / World Bank Education",
    sparkData: [4.5, 4.6, 4.7, 4.8, 4.8, 4.9, 5.0, 5.0, 5.1, 5.1, 5.2, 5.2],
  },
  {
    id: "cybersecurity-attacks",
    tag: "TECHNOLOGY",
    tagColor: "#3B82F6",
    title: "Cyberattacks on Infrastructure",
    stat: "2,300+ in 2025",
    delta: "+45% YoY",
    deltaUp: true,
    blurb:
      "Saudi Aramco was hit by the world's largest cyberattack (Shamoon). Iran's nuclear program was disabled by Stuxnet. UAE banks face 50,000 phishing attempts daily. MENA critical infrastructure — oil, desalination, power grids — is the #1 target for state-sponsored hackers. The next war starts with a keystroke.",
    source: "IBM X-Force / Kaspersky / DarkMatter",
    sparkData: [
      800, 900, 1000, 1100, 1200, 1350, 1500, 1650, 1800, 1950, 2100, 2300,
    ],
  },
  {
    id: "edtech-growth",
    tag: "TECHNOLOGY",
    tagColor: "#3B82F6",
    title: "EdTech Market Growth",
    stat: "$7.2B by 2027",
    delta: "+34%",
    deltaUp: true,
    blurb:
      "MENA EdTech funding grew 3x faster than global average. Saudi's Noon Academy has 12M users. UAE's Alef Education deployed AI tutoring in 100% of public schools. Egypt launched a 1:1 tablet program for 2M students. But 30% of rural MENA still has no reliable internet. The digital divide is the new class divide.",
    source: "HolonIQ / MAGNiTT / GSMA",
    sparkData: [2.1, 2.6, 3.0, 3.5, 4.0, 4.4, 4.9, 5.3, 5.8, 6.2, 6.7, 7.2],
  },
  {
    id: "space-race",
    tag: "TECHNOLOGY",
    tagColor: "#3B82F6",
    title: "MENA Space Programs",
    stat: "$6.5B invested",
    delta: "3 Mars missions",
    deltaUp: true,
    blurb:
      "UAE's Hope Probe orbits Mars — the first Arab interplanetary mission. Saudi launched its first astronaut in 2023 and is building a $2.1B space city. Egypt's space agency launched 4 satellites. Bahrain and Oman joined the Artemis Accords. The region that once navigated by stars is now putting hardware around them.",
    source: "UAE Space Agency / Saudi Space Commission / NASA Artemis",
    sparkData: [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5],
  },
  {
    id: "renewable-energy",
    tag: "SURVIVAL",
    tagColor: "#F97316",
    title: "Renewable Energy Capacity",
    stat: "42 GW installed",
    delta: "+210% since 2020",
    deltaUp: true,
    blurb:
      "UAE's Barakah: the Arab world's first nuclear plant. Saudi's NEOM green hydrogen project: world's largest. Morocco: 52% renewable electricity by 2030 (already at 40%). Jordan: 27% solar. But Iraq — the 2nd largest OPEC producer — generates 0.3% from renewables. The transition is happening. Just not evenly.",
    source: "IRENA / IEA / ACWA Power",
    sparkData: [8, 11, 14, 17, 20, 23, 26, 29, 32, 36, 39, 42],
  },
  {
    id: "air-quality",
    tag: "SURVIVAL",
    tagColor: "#F97316",
    title: "Air Pollution Deaths",
    stat: "138,000/year in MENA",
    delta: "5th leading cause",
    deltaUp: true,
    blurb:
      "Cairo's air quality is 10x worse than WHO limits. Kuwait City: 8x. Riyadh sandstorms now last 60+ days/year (was 30 in 2000). Iraq's marshlands — the lungs of the Gulf — are 90% destroyed. 138,000 MENA residents die annually from air pollution. The region builds the tallest buildings under the dirtiest skies.",
    source: "WHO Air Quality Database / Lancet Planetary Health",
    sparkData: [95, 100, 105, 108, 112, 115, 118, 122, 126, 130, 134, 138],
  },
  {
    id: "desalination",
    tag: "SURVIVAL",
    tagColor: "#F97316",
    title: "Desalination Dependency",
    stat: "55% of global capacity",
    delta: "Energy cost: $2.8B/yr",
    deltaUp: true,
    blurb:
      "MENA operates 55% of the world's desalination plants. Saudi Arabia desalinates 7.5M cubic meters daily. UAE: 100% of drinking water is desalinated. One attack on Ras Al Khair (world's largest plant) and 3.5M people lose water within 72 hours. The region turned the sea into a faucet — and the faucet has a single point of failure.",
    source: "IDA / ACWA Power / World Bank",
    sparkData: [42, 43, 44, 45, 46, 47, 48, 49, 50, 52, 53, 55],
  },
  {
    id: "golden-visa",
    tag: "MIGRATION",
    tagColor: "#EF4444",
    title: "Golden Visa Programs",
    stat: "250,000+ issued",
    delta: "UAE leads globally",
    deltaUp: true,
    blurb:
      "UAE issued 150,000+ Golden Visas since 2019 — more than any country in the world. Saudi launched its Premium Residency (costs $213K). Bahrain and Oman followed. The Gulf is competing for global talent with residency-for-investment. But: Golden Visa holders still can't vote, own land freely, or become citizens. Welcome. But don't get comfortable.",
    source: "UAE ICP / Saudi CDA / Gulf Business",
    sparkData: [5, 15, 30, 50, 75, 100, 120, 140, 165, 195, 220, 250],
  },
  {
    id: "freelance-economy",
    tag: "MIGRATION",
    tagColor: "#EF4444",
    title: "Freelance & Gig Economy",
    stat: "3.8M gig workers",
    delta: "+67% since 2021",
    deltaUp: true,
    blurb:
      "Dubai's freelance visa program grew 400% in 3 years. Saudi Arabia registered 2.1M freelancers on its Musaned platform. Egypt's freelance designers earn more on Upwork than their office counterparts. Careem (sold for $3.1B) runs on 250,000 gig drivers. The traditional employment contract is dying — and MENA's labor laws haven't caught up.",
    source: "MOHRE / Freelancer.com / GigVista MENA",
    sparkData: [1.2, 1.5, 1.8, 2.0, 2.3, 2.5, 2.8, 3.0, 3.2, 3.4, 3.6, 3.8],
  },
  {
    id: "arabic-content",
    tag: "CULTURE",
    tagColor: "#A855F7",
    title: "Arabic Content Deficit",
    stat: "3% of internet content",
    delta: "For 420M speakers",
    deltaUp: false,
    blurb:
      "Arabic is the 5th most spoken language (420M+ speakers) but represents only 3% of internet content. Wikipedia has more articles in Swedish (10M speakers) than Arabic. Google Translate's Arabic is still unreliable. AI models train on 0.1% Arabic data. The world's fastest-growing online population is being served in someone else's language.",
    source: "Internet World Stats / W3Techs / UNESCO",
    sparkData: [2.4, 2.5, 2.5, 2.6, 2.6, 2.7, 2.7, 2.8, 2.8, 2.9, 2.9, 3.0],
  },
  {
    id: "cinema-revolution",
    tag: "CULTURE",
    tagColor: "#A855F7",
    title: "Cinema & Entertainment Boom",
    stat: "$3.2B market",
    delta: "From $0 in 2018",
    deltaUp: true,
    blurb:
      "Saudi Arabia had zero cinemas until 2018. Now it has 70+ multiplexes and is building the region's largest studio lot. Riyadh Season drew 15M visitors. MBC Studios produced 4 Netflix originals. Arabic content on streaming platforms grew 280%. The kingdom that banned fun is now the region's entertainment capital.",
    source: "GEA / MBC Group / PwC EMEA",
    sparkData: [0, 0.1, 0.3, 0.5, 0.8, 1.2, 1.5, 1.9, 2.3, 2.6, 2.9, 3.2],
  },
  {
    id: "heritage-destruction",
    tag: "CULTURE",
    tagColor: "#A855F7",
    title: "Cultural Heritage at Risk",
    stat: "6 UNESCO danger sites",
    delta: "Syria, Iraq, Yemen, Libya",
    deltaUp: false,
    blurb:
      "ISIS destroyed Palmyra, Mosul's Al-Nuri Mosque, and 28 religious shrines. Yemen's Old Sana'a (UNESCO) was bombed 38 times. Iraq's national museum lost 15,000 artifacts. Libya's Leptis Magna is unguarded. Syria's Aleppo souk — the world's largest covered market — was 60% destroyed. 10,000 years of civilization, burning.",
    source: "UNESCO / ALIPH Foundation / Smithsonian",
    sparkData: [3, 3, 4, 4, 5, 5, 5, 6, 6, 6, 6, 6],
  },
  {
    id: "diabetes-epidemic",
    tag: "HEALTH",
    tagColor: "#10B981",
    title: "Diabetes Epidemic",
    stat: "1 in 6 adults",
    delta: "Highest prevalence globally",
    deltaUp: true,
    blurb:
      "Kuwait: 24% diabetes prevalence — world's highest. Saudi Arabia: 18%. Egypt: 17%. UAE: 16%. MENA has 6 of the top 10 countries for diabetes globally. Obesity rates: 40%+ in Gulf states. Healthcare costs: $24B/yr. The region's greatest health crisis isn't COVID or conflict — it's metabolic disease, and it's accelerating.",
    source: "IDF Diabetes Atlas 2026 / WHO EMRO",
    sparkData: [12, 12.5, 13, 13.5, 14, 14.5, 15, 15.3, 15.6, 15.9, 16.2, 16.5],
  },
  {
    id: "maternal-mortality",
    tag: "HEALTH",
    tagColor: "#10B981",
    title: "Maternal Mortality Disparity",
    stat: "60x gap within region",
    delta: "Yemen vs. UAE",
    deltaUp: false,
    blurb:
      "UAE maternal mortality: 3 per 100,000 births (better than USA). Yemen: 183 per 100,000 — a 60x gap within the same region. Sudan: 270. Egypt: 37. Saudi Arabia: 12. Access to healthcare in MENA is determined by which side of a border you were born on. The distance between Abu Dhabi and Aden isn't geographic. It's existential.",
    source: "WHO / UNICEF / UNFPA Maternal Mortality Estimates",
    sparkData: [220, 210, 200, 195, 190, 188, 186, 185, 184, 183, 183, 183],
  },
  {
    id: "drug-use-surge",
    tag: "HEALTH",
    tagColor: "#10B981",
    title: "Substance Use Crisis",
    stat: "Captagon: $57B trade",
    delta: "Syria → Gulf pipeline",
    deltaUp: true,
    blurb:
      "Syria became the world's largest producer of Captagon — a $57B amphetamine trade, mostly consumed in the Gulf. Saudi Arabia seized 240M Captagon pills in 2025. Jordan intercepts drug convoys weekly. Iraq's crystal meth use tripled. Meanwhile: treatment facilities in MENA serve 1% of those who need them. The war on drugs is lost. The conversation hasn't started.",
    source: "UNODC / New Lines Institute / BBC Arabic",
    sparkData: [12, 16, 20, 25, 30, 34, 38, 42, 46, 50, 54, 57],
  },
  {
    id: "algeria-gas-leverage",
    tag: "POWER",
    tagColor: "#EF4444",
    title: "Algeria's Gas Leverage Over Europe",
    stat: "11% of EU gas imports",
    delta: "Post-Russia shift",
    deltaUp: true,
    blurb:
      "After Europe's break with Russian gas, Algeria became Italy's #1 gas supplier and Europe's 3rd-largest. The Transmed pipeline delivers 30 BCM/year. Algeria used this leverage to resist EU pressure on human rights. Sonatrach signed $4B in new deals in 2025. Europe traded one energy dependency for another.",
    source: "IEA / Sonatrach Annual Report 2025 / Eni",
    sparkData: [6, 7, 7, 8, 8, 9, 9, 10, 10, 10, 11, 11],
  },
  {
    id: "morocco-auto-hub",
    tag: "MONEY",
    tagColor: "#F59E0B",
    title: "Morocco: Africa's Auto Factory",
    stat: "700,000 cars/year",
    delta: "Top African producer",
    deltaUp: true,
    blurb:
      "Morocco surpassed South Africa as Africa's largest car manufacturer. Renault and Stellantis produce 700,000+ vehicles annually in Tangier and Kenitra. Automotive is now Morocco's #1 export sector at $14B. The country trained 100,000 auto workers in 5 years. A nation once known for oranges now exports more cars than citrus.",
    source: "AMICA / Moroccan Ministry of Industry / Renault Group",
    sparkData: [320, 380, 420, 460, 500, 530, 570, 600, 630, 660, 680, 700],
  },
  {
    id: "tunisia-olive-oil",
    tag: "MONEY",
    tagColor: "#F59E0B",
    title: "Tunisia's Olive Oil Dominance",
    stat: "$900M exports",
    delta: "World's #2 exporter",
    deltaUp: true,
    blurb:
      "Tunisia is the world's second-largest olive oil exporter, behind only Spain. 80 million olive trees cover 1/3 of agricultural land. Yet most Tunisian oil is sold in bulk, rebranded as Italian or Spanish. The $900M export value could triple if Tunisia marketed directly. A tiny nation punching above its weight in liquid gold.",
    source: "IOC / Tunisia National Oil Board / FAO",
    sparkData: [450, 500, 540, 580, 620, 660, 700, 740, 780, 820, 860, 900],
  },
  {
    id: "iraq-development-road",
    tag: "MONEY",
    tagColor: "#F59E0B",
    title: "Iraq's $17B Development Road",
    stat: "$17 Billion project",
    delta: "Grand Faw to Turkey",
    deltaUp: true,
    blurb:
      "Iraq's most ambitious post-war project: a 1,200 km rail and highway corridor from the Grand Faw Port on the Gulf to the Turkish border. Designed to rival the Suez Canal as a trade route connecting Asia to Europe. Turkey, UAE, and Qatar are investors. Phase 1 construction began in 2024. If completed, it transforms Iraq from warzone to trade superhighway.",
    source: "Iraq Ministry of Transport / Reuters / Middle East Eye",
    sparkData: [0, 0.5, 1.0, 2.0, 3.0, 5.0, 7.0, 9.0, 11.0, 13.0, 15.0, 17.0],
  },
  {
    id: "jordan-water-emergency",
    tag: "SURVIVAL",
    tagColor: "#F97316",
    title: "Jordan's Water Emergency",
    stat: "61 m³ per capita",
    delta: "2nd most water-scarce",
    deltaUp: false,
    blurb:
      "Jordan is the world's second most water-scarce country. Amman residents receive piped water only once a week. The Disi aquifer — Jordan's strategic reserve — is being depleted 5x faster than recharge. Population doubled from 5M to 11M in 20 years due to refugee influx. The Red Sea-Dead Sea desalination project is a matter of survival, not ambition.",
    source: "World Bank / Jordan Water Authority / UNICEF",
    sparkData: [95, 90, 86, 82, 78, 75, 72, 69, 66, 64, 62, 61],
  },
  {
    id: "turkey-defense-exports",
    tag: "TECHNOLOGY",
    tagColor: "#3B82F6",
    title: "Turkey's Defense Industry Boom",
    stat: "$10.2B exports",
    delta: "+240% since 2019",
    deltaUp: true,
    blurb:
      "Turkey went from arms importer to one of the world's top 10 defense exporters. Bayraktar TB2 drones are used by 35+ countries. The TCG Anadolu is the world's first drone carrier. Turkey's defense exports hit $10.2B in 2025. From Ukraine to Libya to Ethiopia, Turkish hardware is reshaping battlefields. Ankara is the new arms merchant of the developing world.",
    source: "Turkish Defence Industries / SSB / SIPRI",
    sparkData: [3.0, 3.8, 4.5, 5.2, 6.0, 6.8, 7.5, 8.2, 8.9, 9.4, 9.8, 10.2],
  },
  {
    id: "lebanon-banking-collapse",
    tag: "MONEY",
    tagColor: "#F59E0B",
    title: "Lebanon's Banking Black Hole",
    stat: "$72B in trapped deposits",
    delta: "Since Oct 2019",
    deltaUp: false,
    blurb:
      "Lebanon's banks froze $72B in deposits — the savings of an entire nation, gone. The lira lost 98% of its value. The central bank ran a Ponzi scheme for 30 years per forensic audit. 80% of Lebanese are now below the poverty line. No banker has been prosecuted. No depositor has been repaid. The world's largest bank heist, committed by the banks themselves.",
    source: "Alvarez & Marsal Forensic Audit / World Bank / BDL",
    sparkData: [72, 72, 72, 72, 72, 72, 72, 72, 72, 72, 72, 72],
  },
  {
    id: "palestine-tech-scene",
    tag: "TECHNOLOGY",
    tagColor: "#3B82F6",
    title: "Palestinian Tech Despite Occupation",
    stat: "$300M+ revenue",
    delta: "Under restrictions",
    deltaUp: true,
    blurb:
      "Despite no 4G (Israel controls spectrum), no direct imports, and military checkpoints, Ramallah has 600+ tech companies generating $300M+ in annual revenue. Palestinian developers outsource to Silicon Valley. Gaza had 100+ tech startups before 2023. The world's most constrained tech ecosystem is also one of its most resilient.",
    source: "PITA / World Bank Digital Development / Mercy Corps",
    sparkData: [80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300],
  },
  {
    id: "oman-green-hydrogen",
    tag: "TECHNOLOGY",
    tagColor: "#3B82F6",
    title: "Oman's Green Hydrogen Bet",
    stat: "$50B committed",
    delta: "World's largest pipeline",
    deltaUp: true,
    blurb:
      "Oman has the world's largest green hydrogen project pipeline at $50B+ across 18 projects. ACME, BP, and Shell are building production hubs in Duqm and Salalah. By 2030, Oman aims to produce 1 million tonnes of green hydrogen annually. A nation betting its post-oil future on the most abundant element in the universe.",
    source: "Hydrogen Oman (Hydrom) / IRENA / Oman Vision 2040",
    sparkData: [2, 5, 8, 12, 16, 20, 25, 30, 35, 40, 45, 50],
  },
  {
    id: "sudan-famine",
    tag: "SURVIVAL",
    tagColor: "#F97316",
    title: "Sudan's Famine Crisis",
    stat: "25.6M food insecure",
    delta: "Worst crisis on earth",
    deltaUp: false,
    blurb:
      "Sudan's civil war (since April 2023) created the world's largest displacement crisis: 9M+ internally displaced, 25.6M food insecure, famine declared in multiple states. Both SAF and RSF accused of war crimes. Agricultural production collapsed 60%. Aid access is blocked. The world's worst humanitarian crisis is also its most ignored.",
    source: "WFP / IPC / OCHA Sudan Situation Report 2026",
    sparkData: [9.8, 12, 14, 16, 18, 19.5, 21, 22, 23, 24, 25, 25.6],
  },
  {
    id: "qatar-lng-dominance",
    tag: "MONEY",
    tagColor: "#F59E0B",
    title: "Qatar's LNG Super-Expansion",
    stat: "126 MTPA by 2027",
    delta: "+64% capacity",
    deltaUp: true,
    blurb:
      "Qatar is expanding LNG production from 77 to 126 million tonnes per year — the largest LNG expansion in history. The North Field project alone costs $30B+. QatarEnergy signed 27-year supply deals with China, Germany, and Bangladesh. While the world debates energy transition, Qatar is locking in gas contracts through 2053.",
    source: "QatarEnergy / IEA / Reuters",
    sparkData: [77, 80, 83, 87, 91, 95, 100, 105, 110, 115, 120, 126],
  },
  {
    id: "syria-reconstruction",
    tag: "SURVIVAL",
    tagColor: "#F97316",
    title: "Syria's $400B Reconstruction Gap",
    stat: "$400B needed",
    delta: "<$10B pledged",
    deltaUp: false,
    blurb:
      "Syria's reconstruction requires an estimated $400B — 7x its pre-war GDP. Less than $10B has been pledged. Western sanctions block most investment. Russia and Iran lack funds. Gulf states are cautious. 6.7M Syrians remain internally displaced. Aleppo, Homs, and Raqqa are still largely rubble. A country frozen between war and peace.",
    source: "World Bank Syria Damage Assessment / ESCWA / UNHCR",
    sparkData: [0.5, 1, 1.5, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  },
  {
    id: "libya-oil-chaos",
    tag: "MONEY",
    tagColor: "#F59E0B",
    title: "Libya's Oil Revenue Struggle",
    stat: "1.2M barrels/day",
    delta: "Split between 2 govts",
    deltaUp: false,
    blurb:
      "Libya produces 1.2M barrels/day of high-quality crude but can't agree on who controls the money. Two rival governments, two central banks, two national oil claims. The NOC reported $22B in revenue in 2025 — but transparent allocation is nonexistent. A country with Africa's largest oil reserves can't keep its own lights on.",
    source: "Libya NOC / IMF / OPEC Monthly Report",
    sparkData: [0.4, 0.6, 0.8, 0.9, 1.0, 1.0, 1.1, 1.1, 1.2, 1.2, 1.2, 1.2],
  },
  {
    id: "yemen-red-sea",
    tag: "POWER",
    tagColor: "#EF4444",
    title: "Houthi Red Sea Disruption",
    stat: "50% drop in Suez traffic",
    delta: "Global trade rerouted",
    deltaUp: false,
    blurb:
      "Houthi attacks on Red Sea shipping since late 2023 caused a 50% drop in Suez Canal traffic. Maersk, MSC, and Hapag-Lloyd rerouted via the Cape of Good Hope — adding 10 days and $1M per voyage. Egypt lost $7B+ in Suez revenue. Insurance premiums spiked 300%. A militia in one of the world's poorest countries disrupted 12% of global trade.",
    source: "IMF PortWatch / Suez Canal Authority / Lloyd's of London",
    sparkData: [100, 95, 90, 80, 70, 60, 55, 52, 50, 50, 50, 50],
  },
  {
    id: "kuwait-political-gridlock",
    tag: "POWER",
    tagColor: "#EF4444",
    title: "Kuwait's Parliamentary Paralysis",
    stat: "10 elections in 18 years",
    delta: "No reform progress",
    deltaUp: false,
    blurb:
      "Kuwait has held 10 parliamentary elections since 2006 — more than any democracy in the period. The cycle: elect, deadlock with government, dissolve, repeat. The public debt law hasn't passed in 7 years. Mega-projects stall for decades. The country with the world's 6th-largest oil reserves can't build a metro, a port, or a hospital on time.",
    source: "Kuwait National Assembly / Carnegie MEC / Oxford Analytica",
    sparkData: [6, 6, 7, 7, 8, 8, 8, 9, 9, 9, 10, 10],
  },
  {
    id: "bahrain-fintech",
    tag: "TECHNOLOGY",
    tagColor: "#3B82F6",
    title: "Bahrain's Fintech Ambitions",
    stat: "120+ licensed fintechs",
    delta: "First crypto sandbox in MENA",
    deltaUp: true,
    blurb:
      "Bahrain launched the MENA region's first regulatory sandbox for fintech and crypto in 2017. It now hosts 120+ licensed fintechs including Rain (first licensed crypto exchange), Tarabut Gateway (open banking), and M2 (digital payments). The Central Bank of Bahrain processes $16B in real-time payments. A 780 km² island punching as a financial innovation hub.",
    source: "CBB FinTech Report / MAGNiTT / Rain.com",
    sparkData: [15, 25, 35, 45, 55, 65, 72, 80, 88, 98, 110, 120],
  },
  {
    id: "egypt-population-bomb",
    tag: "HEALTH",
    tagColor: "#10B981",
    title: "Egypt's Population Surge",
    stat: "112 Million",
    delta: "+2M per year",
    deltaUp: true,
    blurb:
      "Egypt adds 2 million people every year — that's a new city the size of Paris annually. Population hit 112M in 2026 and will reach 160M by 2050. Cairo is the world's densest major city. The Nile — Egypt's only water source — is shared with 10 upstream nations. Egypt's greatest challenge isn't geopolitics. It's demographics.",
    source: "CAPMAS / UN Population Division / World Bank",
    sparkData: [90, 92, 95, 97, 100, 102, 104, 106, 108, 110, 111, 112],
    live: { baseValue: 112_000_000, annualGrowth: 0.018 },
  },
  {
    id: "morocco-cannabis-legal",
    tag: "CULTURE",
    tagColor: "#A855F7",
    title: "Morocco's Legal Cannabis Industry",
    stat: "$420M exports",
    delta: "First Arab legal exporter",
    deltaUp: true,
    blurb:
      "Morocco legalized cannabis for medical and industrial use in 2021 — a historic first for an Arab country. The Rif region, which long grew cannabis illegally, is now transitioning to licensed production. Exports reached $420M in 2025. The EU and Canada are primary buyers. A 1,000-year-old crop finally came in from the cold.",
    source: "Morocco National Agency for Cannabis / Reuters / EMCDDA",
    sparkData: [0, 0, 0, 30, 80, 140, 200, 260, 310, 350, 390, 420],
  },
];

const TICKER_ITEMS = [
  { label: "PRESS FREEDOM", value: "17/19", delta: "NOT FREE", up: false },
  { label: "SURVEILLANCE", value: "$4.8B", delta: "+62%", up: true },
  { label: "BILLIONAIRES", value: "$186B", delta: "+41%", up: true },
  { label: "CRYPTO VOL", value: "$338B", delta: "+74%", up: true },
  { label: "SWF ASSETS", value: "$4.1T", delta: "+18%", up: true },
  { label: "WATER CRISIS", value: "12/19", delta: "CRITICAL", up: false },
  { label: "DISPLACED", value: "42M", delta: "GROWING", up: false },
  { label: "BRAIN DRAIN", value: "1 in 3", delta: "LEAVING", up: false },
  { label: "MENTAL HEALTH", value: "+312%", delta: "SEARCHES", up: true },
  { label: "YOUTH JOBLESS", value: "26%", delta: "WORST", up: false },
  { label: "LGBTQ+ ILLEGAL", value: "18/19", delta: "6 DEATH", up: false },
  { label: "CHILD MARRIAGE", value: "1 in 5", delta: "GIRLS", up: false },
  { label: "SPORTSWASHING", value: "$75B+", delta: "SPENT", up: true },
  { label: "FOOD IMPORTS", value: "85%", delta: "NO CHANGE", up: false },
  { label: "MILITARY", value: "$198B", delta: "+9%", up: true },
  { label: "REMITTANCES", value: "$128B", delta: "OUTFLOWS", up: true },
  { label: "MEGA PROJECTS", value: "$1.3T", delta: "PLANNED", up: true },
  { label: "EXECUTIONS", value: "1,100+", delta: "IN 2025", up: false },
  { label: "ARMS IMPORTS", value: "35%", delta: "OF GLOBAL", up: true },
  { label: "GOLDEN VISAS", value: "250K+", delta: "ISSUED", up: true },
  { label: "CAPTAGON", value: "$57B", delta: "TRADE", up: true },
  { label: "DIABETES", value: "1 in 6", delta: "ADULTS", up: false },
  { label: "ALGERIA GAS", value: "11%", delta: "EU SUPPLY", up: true },
  { label: "MOROCCO AUTO", value: "700K", delta: "CARS/YR", up: true },
  { label: "TUNISIA OLIVE", value: "$900M", delta: "#2 GLOBAL", up: true },
  { label: "IRAQ DEV ROAD", value: "$17B", delta: "MEGA-PROJECT", up: true },
  { label: "JORDAN H2O", value: "61m³", delta: "CRITICAL", up: false },
  { label: "TURKEY ARMS", value: "$10.2B", delta: "+240%", up: true },
  { label: "LEBANON BANKS", value: "$72B", delta: "TRAPPED", up: false },
  { label: "OMAN H2", value: "$50B", delta: "GREEN", up: true },
  { label: "SUDAN FAMINE", value: "25.6M", delta: "HUNGRY", up: false },
  { label: "QATAR LNG", value: "126 MTPA", delta: "+64%", up: true },
  { label: "SYRIA REBUILD", value: "$400B", delta: "NEEDED", up: false },
  { label: "LIBYA OIL", value: "1.2M B/D", delta: "SPLIT", up: false },
  { label: "YEMEN RED SEA", value: "-50%", delta: "SUEZ", up: false },
  { label: "KUWAIT GRID", value: "10 VOTES", delta: "18 YRS", up: false },
  { label: "BAHRAIN FINT", value: "120+", delta: "LICENSED", up: true },
  { label: "EGYPT POP", value: "112M", delta: "+2M/YR", up: true },
  { label: "PALESTINE TECH", value: "$300M", delta: "RESILIENT", up: true },
];

function useLiveCounter(
  baseValue: number,
  annualGrowth: number,
  tickMs = 1000,
) {
  const perMs = (baseValue * annualGrowth) / MS_PER_YEAR;
  const calc = useCallback(() => {
    const elapsed = Date.now() - BASE_DATE;
    return Math.floor(baseValue + elapsed * perMs);
  }, [baseValue, perMs]);
  const [value, setValue] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setValue(calc()), tickMs);
    return () => clearInterval(id);
  }, [calc, tickMs]);
  return value;
}

function MiniSparkline({
  data,
  color = "#DC143C",
  id,
}: {
  data: number[];
  color?: string;
  id: string;
}) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 120;
  const h = 32;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${h} ${points} ${w},${h}`}
        fill={`url(#spark-${id})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PulseShareBtn({ topic }: { topic: TopicCard }) {
  const [showModal, setShowModal] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/pulse?shared=${topic.id}`
      : `/pulse?shared=${topic.id}`;

  const shareContext: PulseShareContext = {
    contentType: "pulse",
    topicId: topic.id,
    url,
    title: topic.title,
    category: topic.tag,
    stat: topic.stat,
    delta: topic.delta ?? "",
    deltaUp: topic.deltaUp ?? true,
    source: topic.source,
  };

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowModal(true); }}
        title="Share this insight"
        style={{
          background: "none",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 3,
          cursor: "pointer",
          padding: "4px 10px",
          color: "rgba(255,255,255,0.75)",
          transition: "all 0.15s",
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 9,
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 700,
          textTransform: "uppercase" as const,
          letterSpacing: "0.1em",
        }}
      >
        <Share2 size={12} /> Share
      </button>
      {showModal && (
        <ShareModal
          context={shareContext}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

function TopicCardComponent({
  topic,
  index,
  highlighted,
}: {
  topic: TopicCard;
  index: number;
  highlighted?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [glowing, setGlowing] = useState(false);
  const { t } = useI18n();
  const liveValue = useLiveCounter(
    topic.live?.baseValue ?? 0,
    topic.live?.annualGrowth ?? 0,
  );

  useEffect(() => {
    if (!highlighted) return;
    setGlowing(true);
    const timer = setTimeout(() => setGlowing(false), 2200);
    return () => clearTimeout(timer);
  }, [highlighted]);

  return (
    <div
      id={`pulse-${topic.id}`}
      onClick={() => setExpanded(!expanded)}
      style={{
        background: glowing ? `${topic.tagColor}12` : "rgba(0,0,0,0.5)",
        border: `1px solid ${glowing ? topic.tagColor : "rgba(255,255,255,0.06)"}`,
        boxShadow: glowing ? `0 0 0 2px ${topic.tagColor}55, 0 0 28px ${topic.tagColor}44` : undefined,
        padding: "20px 24px",
        cursor: "pointer",
        transition: "border-color 0.3s ease, background 0.3s ease, box-shadow 0.6s ease",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        if (glowing) return;
        (e.currentTarget as HTMLElement).style.borderColor =
          `${topic.tagColor}55`;
        (e.currentTarget as HTMLElement).style.background =
          `${topic.tagColor}08`;
      }}
      onMouseLeave={(e) => {
        if (glowing) return;
        (e.currentTarget as HTMLElement).style.borderColor =
          "rgba(255,255,255,0.06)";
        (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.5)";
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${topic.tagColor}, transparent)`,
          opacity: 0.4,
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 13,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.16em",
            color: topic.tagColor,
            background: `${topic.tagColor}15`,
            padding: "4px 10px",
          }}
        >
          {t(topic.tag)}
        </span>
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 10,
            fontWeight: 700,
            color: topic.deltaUp ? "#10B981" : "#EF4444",
            display: "flex",
            alignItems: "center",
            gap: 3,
          }}
        >
          {topic.deltaUp ? "\u25B2" : "\u25BC"} {t(topic.delta)}
        </span>
      </div>

      <div
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 12,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "rgba(255,255,255,0.65)",
          marginBottom: 8,
        }}
      >
        {t(topic.title)}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 6,
          marginBottom: 8,
        }}
      >
        {topic.live ? (
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 900,
              color: "#fff",
              letterSpacing: "-0.02em",
              fontSize: "clamp(1.3rem, 2.5vw, 1.8rem)",
            }}
          >
            <LiveNumber
              value={liveValue}
              className="tabular-nums"
              style={{
                fontFamily: "inherit",
                fontWeight: "inherit",
                fontSize: "inherit",
                letterSpacing: "inherit",
              }}
            />
          </span>
        ) : (
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 900,
              color: "#fff",
              letterSpacing: "-0.02em",
              fontSize: "clamp(1.3rem, 2.5vw, 1.8rem)",
            }}
          >
            {topic.stat}
          </span>
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "rgba(255,255,255,0.75)",
          }}
        >
          {topic.live
            ? `${(liveValue / 1_000_000).toFixed(1)}M people`
            : topic.stat}
        </span>
        <MiniSparkline
          data={topic.sparkData}
          color={topic.tagColor}
          id={topic.id}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: 12,
          paddingTop: 10,
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <PulseShareBtn topic={topic} />
      </div>

      {expanded && (
        <div
          style={{
            marginTop: 16,
            paddingTop: 12,
            borderTop: `1px solid ${topic.tagColor}20`,
          }}
        >
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12,
              color: "rgba(255,255,255,0.75)",
              lineHeight: 1.7,
              marginBottom: 8,
            }}
          >
            {topic.blurb}
          </p>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 8,
              color: "rgba(255,255,255,0.75)",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
            }}
          >
            {t("Source:")} {topic.source}
          </p>
        </div>
      )}
    </div>
  );
}

interface PulseConfig {
  tickerItems?: Array<{
    label: string;
    value: string;
    delta: string;
    up: boolean;
  }>;
  categories?: Array<{ key: string; label: string; color: string }>;
  hero?: { tagline?: string; titleLine1?: string; titleLine2?: string; subtitle?: string };
  punctuations?: string[];
}

function PulseTicker() {
  const { data: config } = usePageConfig<PulseConfig>("pulse");
  const items = config?.tickerItems?.length ? config.tickerItems : TICKER_ITEMS;
  const doubled = [...items, ...items];

  return (
    <div
      style={{
        background: "#0D0D0D",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        overflow: "hidden",
      }}
    >
      <div className="tmh-ticker-scroll">
        {doubled.map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              padding: "0.7rem 2rem",
              borderRight: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <span
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "rgba(250,250,250,0.75)",
              }}
            >
              {item.label}
            </span>
            <span
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: "0.85rem",
                color: "#fff",
              }}
            >
              {item.value}
            </span>
            <span
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: "0.72rem",
                color: item.up ? "#10B981" : "#DC143C",
              }}
            >
              {item.up ? "▲" : "▼"} {item.delta}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BigNumber() {
  const pop = useLiveCounter(541_000_000, 0.0156, 500);
  const { t } = useI18n();

  return (
    <div
      style={{
        background: "rgba(0,0,0,0.5)",
        border: "1px solid rgba(220,20,60,0.08)",
        padding: "28px 32px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background:
            "linear-gradient(90deg, transparent, #DC143C, transparent)",
          opacity: 0.3,
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#DC143C",
            animation: "pulse-glow 2s ease-in-out infinite",
          }}
        />
        <span
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            color: "#DC143C",
          }}
        >
          {t("Live Counter")}
        </span>
      </div>
      <div
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "rgba(255,255,255,0.75)",
          marginBottom: 6,
        }}
      >
        {t("MENA Population Right Now")}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span
          style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 900,
            color: "#DC143C",
            letterSpacing: "-0.02em",
            fontSize: "clamp(2rem, 4vw, 3rem)",
          }}
        >
          <LiveNumber
            value={pop}
            className="tabular-nums"
            style={{
              fontFamily: "inherit",
              fontWeight: "inherit",
              fontSize: "inherit",
              letterSpacing: "inherit",
            }}
          />
        </span>
      </div>
      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 10,
          color: "rgba(255,255,255,0.75)",
          marginTop: 8,
          lineHeight: 1.5,
        }}
      >
        {t(
          "Growing by ~8.2 million per year — roughly 1 new person every 4 seconds. 60% are under 30.",
        )}
      </p>
    </div>
  );
}

export default function MenaPulse() {
  usePageTitle({
    title: "Pulse",
    description: "36 data-driven trend cards across 8 categories -- from press freedom to sovereign wealth. The region's vital signs, live.",
  });
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const { t, isAr } = useI18n();
  const { data: apiTopics, isLoading } = usePulseTopics();
  const { data: pulseConfig } = usePageConfig<PulseConfig>("pulse");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shared = params.get("shared");
    if (shared) {
      setHighlightedId(shared);
      setTimeout(() => {
        document.getElementById(`pulse-${shared}`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 400);
    }
  }, []);

  const allTopics: TopicCard[] = useMemo(() => {
    if (apiTopics?.items?.length) return apiTopics.items.map(apiToTopicCard);
    return FALLBACK_TOPICS;
  }, [apiTopics]);

  const CATEGORIES = useMemo(() => {
    if (pulseConfig?.categories?.length) {
      return pulseConfig.categories;
    }
    if (apiTopics?.items?.length) {
      const tags = [...new Set(apiTopics.items.map((t) => t.tag))];
      const TAG_COLORS: Record<string, string> = {};
      const TAG_LABELS: Record<string, string> = {};
      for (const item of apiTopics.items) {
        TAG_COLORS[item.tag] = item.tagColor;
      }
      for (const cat of FALLBACK_CATEGORIES) {
        TAG_LABELS[cat.key] = cat.label;
      }
      return [
        { key: "ALL", label: "All Trends", color: "#DC143C" },
        ...tags.map((tag) => ({
          key: tag,
          label: TAG_LABELS[tag] ?? tag,
          color: TAG_COLORS[tag] ?? "#DC143C",
        })),
      ];
    }
    return FALLBACK_CATEGORIES;
  }, [pulseConfig, apiTopics]);

  const filtered = useMemo(() => {
    let result =
      activeCategory === "ALL"
        ? allTopics
        : allTopics.filter((tp) => tp.tag === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (tp) =>
          tp.title.toLowerCase().includes(q) ||
          tp.blurb.toLowerCase().includes(q) ||
          tp.stat.toLowerCase().includes(q) ||
          tp.source.toLowerCase().includes(q) ||
          tp.tag.toLowerCase().includes(q),
      );
    }
    return result;
  }, [activeCategory, searchQuery, allTopics]);

  const { sentinelRef, visibleItems: visibleTopics, hasMore } = useInfiniteScroll(filtered, 10);

  return (
    <Layout>
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>

      <div className="bg-foreground text-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
          <p
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: "0.68rem",
              textTransform: "uppercase",
              letterSpacing: "0.28em",
              color: "#DC143C",
              marginBottom: "0.5rem",
            }}
          >
            {t(pulseConfig?.hero?.tagline || "Pulse")}
          </p>
          <h1
            style={{
              fontFamily: isAr
                ? "'IBM Plex Sans Arabic', sans-serif"
                : "'Barlow Condensed', sans-serif",
              fontWeight: 900,
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              textTransform: "uppercase",
              color: "var(--background)",
              letterSpacing: "-0.01em",
              lineHeight: 1.05,
              marginBottom: "0.5rem",
            }}
          >
            {t(pulseConfig?.hero?.titleLine1 || "What's Actually")}<br />
            {t(pulseConfig?.hero?.titleLine2 || "Happening in MENA")}<TitlePunctuation punctuations={pulseConfig?.punctuations} />
          </h1>
          <p
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: "0.78rem",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
            }}
          >
            {allTopics.length}{" "}
            {t("trends the region needs to confront. Updated quarterly.")}
          </p>
        </div>

        <PulseTicker />

        <div
          style={{
            background: "#0D0D0D",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            padding: "0.65rem 0",
            display: "flex",
            alignItems: "center",
            gap: "2.5rem",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: "0.72rem",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: "rgba(250,250,250,0.75)",
            }}
          >
            <span
              style={{
                color: "#DC143C",
                fontWeight: 900,
                fontSize: "0.85rem",
                marginRight: 6,
              }}
            >
              {allTopics.length}
            </span>{" "}
            {t("Trends")}
          </span>
          <span
            style={{
              width: 1,
              height: 14,
              background: "rgba(255,255,255,0.1)",
            }}
          />
          <span
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: "0.72rem",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: "rgba(250,250,250,0.75)",
            }}
          >
            <span
              style={{
                color: "#DC143C",
                fontWeight: 900,
                fontSize: "0.85rem",
                marginRight: 6,
              }}
            >
              {CATEGORIES.length - 1}
            </span>{" "}
            {t("Categories")}
          </span>
          <span
            style={{
              width: 1,
              height: 14,
              background: "rgba(255,255,255,0.1)",
            }}
          />
          <span
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: "0.72rem",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: "rgba(250,250,250,0.75)",
            }}
          >
            <span
              style={{
                color: "#DC143C",
                fontWeight: 900,
                fontSize: "0.85rem",
                marginRight: 6,
              }}
            >
              19
            </span>{" "}
            {t("Countries")}
          </span>
          <span
            style={{
              width: 1,
              height: 14,
              background: "rgba(255,255,255,0.1)",
            }}
          />
          <span
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: "0.72rem",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: "rgba(250,250,250,0.75)",
            }}
          >
            <span
              style={{
                color: "#DC143C",
                fontWeight: 900,
                fontSize: "0.85rem",
                marginRight: 6,
              }}
            >
              541M
            </span>{" "}
            {t("People")}
          </span>
        </div>
      </div>

      <div
        style={{
          minHeight: "100vh",
          background: "#0A0A0A",
          color: "#fff",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(220,20,60,0.04) 0%, transparent 60%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 16px" }}
          >
            <BigNumber />
          </div>

          <div
            className="flex flex-col lg:flex-row gap-12"
            style={{ maxWidth: 1280, margin: "0 auto", padding: "0 16px 16px" }}
          >
            <FilterSidebar
              search={{
                value: searchQuery,
                onChange: setSearchQuery,
                placeholder: t("Search trends..."),
              }}
              categories={{
                items: CATEGORIES.filter((c) => c.key !== "ALL").map((c) => ({
                  key: c.key,
                  label: t(c.label),
                  count: allTopics.filter((tp) => tp.tag === c.key).length,
                })),
                activeKey: activeCategory,
                onSelect: setActiveCategory,
                allLabel: t("All Trends"),
                allCount: allTopics.length,
              }}
            />

            <div className="flex-1 min-w-0">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <div style={{ width: 3, height: 16, background: "#DC143C" }} />
                <span
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 12,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.18em",
                    color: "rgba(255,255,255,0.75)",
                  }}
                >
                  {t("Exploding Trends")}
                </span>
                <span
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 9,
                    color: "rgba(255,255,255,0.75)",
                    marginLeft: 8,
                    letterSpacing: "0.05em",
                  }}
                >
                  {t("Click any card for the full story")}
                </span>
              </div>

              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 10,
                  color: "rgba(255,255,255,0.75)",
                  margin: "16px 0",
                  letterSpacing: "0.05em",
                }}
              >
                {t("Showing")} {filtered.length} {t("of")} {allTopics.length}{" "}
                {t("trends")}
                {activeCategory !== "ALL" && (
                  <button
                    onClick={() => setActiveCategory("ALL")}
                    style={{
                      marginLeft: 12,
                      color: "#DC143C",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: "inherit",
                      letterSpacing: "inherit",
                      textDecoration: "underline",
                    }}
                  >
                    {t("Clear filter")}
                  </button>
                )}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                  gap: 12,
                }}
              >
                {visibleTopics.map((topic, i) => (
                  <TopicCardComponent key={topic.id} topic={topic} index={i} highlighted={highlightedId === topic.id} />
                ))}
              </div>
              {hasMore && (
                <div ref={sentinelRef} className="flex justify-center py-8">
                  <LoadingDots />
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              maxWidth: 1280,
              margin: "0 auto",
              padding: "40px 16px 48px",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 9,
                color: "rgba(255,255,255,0.75)",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                maxWidth: 640,
                margin: "0 auto",
                lineHeight: 1.8,
              }}
            >
              Data compiled from Freedom House, World Bank, IMF, ILO, UNHCR,
              HRW, Amnesty International, WHO, Chainalysis, Citizen Lab, Arab
              Barometer, WEF, FAO, UNICEF & UN Population Division. Click any
              card for source attribution.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
