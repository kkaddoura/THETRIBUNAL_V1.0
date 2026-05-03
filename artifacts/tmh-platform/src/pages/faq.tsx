import { useState } from "react"
import { Layout } from "@/components/layout/Layout"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Link } from "wouter"
import { useI18n } from "@/lib/i18n"
import { usePageConfig } from "@/hooks/use-cms-data"
import { TitlePunctuation } from "@/components/TitlePunctuation"
import { usePageTitle } from "@/hooks/use-page-title"

interface FaqSection {
  category: string
  questions: Array<{ q: string; a: string }>
}

const FAQ_SECTIONS_DEFAULT: FaqSection[] = [
  {
    category: "The Platform",
    questions: [
      {
        q: "What is The Tribunal?",
        a: "MENA's first opinion intelligence platform. Part editorial, part data engine, part social experiment.\n\nWe cover 19 countries and 541 million people.\n\nFive sections, each doing one thing well:\n\n1. Debates: anonymous polling on the questions nobody else asks.\n2. Predictions: a Bloomberg-style market for what will actually happen.\n3. The Pulse: data trends across 8 categories.\n4. Voices: 100+ verified regional leaders.\n5. About: the manifesto.",
      },
      {
        q: "Is The Tribunal free to use?",
        a: "Yes. Voting, predicting, browsing trends, exploring Voices: all of it, free.\n\nNo paywall. No ads. No signup required.\n\nA premium tier for deeper data may come later. Core participation stays free.",
      },
      {
        q: "Who is behind The Tribunal?",
        a: "Founded by Kareem Kaddoura under The Middle East Hustle.\n\nThe platform is editorially independent. No government, political party, or corporate sponsor funds it or shapes the questions.\n\nQuestions come from the editorial team. Data comes from you.",
      },
      {
        q: "Are the debates scientific?",
        a: "No, and we're upfront about it.\n\nOur debates are not statistically representative surveys. They capture the sentiment of people who chose to participate.\n\nUseful signal, not census. Results are never published as nationally representative data.",
      },
    ],
  },
  {
    category: "Debates",
    questions: [
      {
        q: "How do the debates work?",
        a: "One question. Multiple options. Click your answer.\n\nYour vote is anonymous. It's never tied to your name or email, and your raw IP is never stored. (If you accepted the country banner, your IP is used once for a country lookup, then thrown away.)\n\nAfter voting, full results unlock by sharing the debate or entering an email. We call that the Share Gate, and it's how a debate spreads.",
      },
      {
        q: "Can I vote more than once?",
        a: "No.\n\nEach browser receives a random anonymous voter token. The server enforces one vote per token per debate using a unique database constraint.\n\nClearing storage or switching browsers will let you vote again, but it skews the dataset and breaks the rules.",
      },
      {
        q: "How are debate questions chosen?",
        a: "Editorially. We watch what's trending in the region, what Voices are talking about, what sparks real disagreement.\n\nTopics span identity, money, religion, gender, power, AI, geopolitics, culture, and the future.\n\nEvery question is reviewed by a human before it goes live. No automated question generation.",
      },
      {
        q: "What is the Share Gate?",
        a: "It sits between your vote and the full results.\n\nAfter voting, you unlock the results by sharing on WhatsApp, X, LinkedIn, or Instagram. Or by entering an email.\n\nIt's our growth engine. Every share brings new voters. No share, no email: limited results.",
      },
      {
        q: "What is the Country Breakdown?",
        a: "Every vote is tagged with the country we detect from your IP, but only if you accepted the country banner.\n\nKnowing Egyptians voted differently from Emiratis on the same question tells a real story.\n\nThe richer per-country visualizations are still rolling out across the platform. The underlying data is already being captured.",
      },
    ],
  },
  {
    category: "Predictions",
    questions: [
      {
        q: "What is the Predictions page?",
        a: "A Bloomberg-style prediction market for MENA's biggest questions.\n\nNot \"what should happen.\" \"What will.\"\n\nTrack confidence over time. Watch consensus shift. See where the region thinks it's headed on oil, IPOs, geopolitics, and tech.",
      },
      {
        q: "How do predictions work?",
        a: "Each card shows a future-facing question, a current confidence percentage from collective votes, and how that confidence has evolved.\n\nVote yes or no on whether you think it'll happen. Watch the consensus move. Come back later to see if you were right.",
      },
    ],
  },
  {
    category: "The Pulse",
    questions: [
      {
        q: "What is The Pulse?",
        a: "Data-driven trend tracking. Think Exploding Topics, built for MENA.\n\n50+ trend cards across 8 categories: Power, Money, Society, Tech, Survival, Migration, Culture, Health.\n\nFilter by category. Every card includes real data, growth metrics, and source attribution. Numbers, not vibes.",
      },
      {
        q: "How are Pulse trends selected?",
        a: "A mix of data analysis, regional news monitoring, and editorial judgment.\n\nWe track search volumes, investment flows, demographic shifts, and cultural movements across all 19 MENA countries.\n\nEvery card cites its sources.",
      },
    ],
  },
  {
    category: "The Voices",
    questions: [
      {
        q: "What is a Voice?",
        a: "A verified profile on The Tribunal: a curated founder, operator, investor, or change-maker with real, verifiable impact in MENA.\n\nCurrently 100+ Voices across 10+ countries.\n\nEach profile carries a background, a personal quote, a lesson learned, and key tags. Curation matters more than application volume.",
      },
      {
        q: "How do I become a Voice?",
        a: "Apply through Join The Voices. The bar is intentionally high.\n\nYou need:\n\n1. Real, verifiable impact (not just a job title).\n2. An active MENA connection.\n3. A unique story (pivots, failures, non-linear paths).\n4. Something you've built or founded.\n5. A LinkedIn we can verify.\n\nApplications are reviewed by a human. We'll contact you if you pass.",
      },
      {
        q: "How are Voices organized?",
        a: "Browse by country, industry, or tag.\n\nEach profile shows the person's name, title, country, industry, a quote, a key lesson, and descriptive tags.\n\nThe directory features a live ticker showing Voice stats and a real-time MENA population counter.",
      },
    ],
  },
  {
    category: "What We Collect",
    questions: [
      {
        q: "What do you collect when I vote?",
        a: "Three things. Only three:\n\n1. Which option you picked.\n2. The voter token (covered in Debates above): a UUID generated in your browser, stored in localStorage. We use it to prevent duplicate votes.\n3. The country we resolved from your IP, but only if you accepted the country banner.\n\nThat's it. No name. No email. No device fingerprint linked to your vote.",
      },
      {
        q: "What happens to my IP address?",
        a: "Sent once to a public geolocation service (ip-api.com), only if you accepted the country banner.\n\nWe use it for the country lookup, then discard.\n\nYour raw IP is never written to our database, and never logged.\n\nIf you decline the banner, no lookup happens, and your vote is recorded with no country attached.",
      },
      {
        q: "Do you use cookies?",
        a: "Almost none.\n\nNo third-party cookies. No advertising cookies. No tracking pixels.\n\nThere is one first-party cookie used by the CMS to remember editorial sidebar state (max 7 days). It never reaches the public site.\n\nVote-related state lives in localStorage, which never leaves your device.",
      },
      {
        q: "What's stored in my browser?",
        a: "localStorage only. Never sent to us unsolicited.\n\nKeys we set:\n\n1. Your voter token.\n2. The list of debates you've voted on.\n3. Which results you've unlocked.\n4. Your theme (dark or light).\n5. Your language (English or Arabic).\n6. Your IP-consent choice.\n\nNothing in there identifies you to us. Clear it any time from your browser settings.",
      },
      {
        q: "What about my email if I enter it?",
        a: "If you enter an email through the Share Gate or newsletter form, we store:\n\n1. The address itself.\n2. The source (e.g. \"share_gate\" or \"homepage\").\n3. The country detected at that moment.\n4. Your newsletter opt-in choice.\n\nIf you opted in, we mirror the subscription to Beehiiv, our newsletter provider.\n\nIf you didn't opt in, the email is used only to unlock the result you wanted to see.",
      },
      {
        q: "What does the Noor chatbot send to AI services?",
        a: "Noor runs on Anthropic's Claude.\n\nWe send:\n\n1. Your message.\n2. The last 20 messages of the conversation, for context.\n3. A small read-only snapshot of platform metadata (top debates, top predictions, featured voices).\n\nWe do not send your IP, your email, your voter token, or any identifier we've collected.\n\nConversations aren't stored on our side after the chat closes.",
      },
      {
        q: "Do you use any analytics or tracking pixels?",
        a: "No.\n\nThe HTML you receive contains zero third-party trackers.\n\nNot installed: Google Analytics, Plausible, PostHog, Mixpanel, Sentry, Facebook Pixel. None of it.\n\nThe only metrics we keep are aggregate counts (total votes, total debates). Nothing tied back to you.",
      },
      {
        q: "What third-party services do you use?",
        a: "The complete list:\n\n1. Anthropic: powers the Noor chatbot.\n2. Beehiiv: receives newsletter signups, only if you opted in.\n3. ip-api.com: country lookup from IP, only if you accepted the consent banner.\n4. Supabase Storage: stores profile images uploaded by our editorial team. No end-user uploads.\n5. Railway: hosts the platform's servers and Postgres database.\n\nWe update this answer the moment it changes.",
      },
      {
        q: "Where is my data stored?",
        a: "A Postgres database hosted on Railway.\n\nImage uploads (CMS-only) live in Supabase Storage.\n\nNewsletter subscriptions, if opted in, are mirrored to Beehiiv.\n\nAnthropic processes chatbot messages on their own infrastructure per their privacy policy.\n\nNothing is replicated outside these systems.",
      },
      {
        q: "Can I have my data deleted?",
        a: "Yes. The path is currently manual.\n\nEmail contact@themiddleeasthustle.com from the address we have on file. A human will delete your record.\n\nVotes are anonymous (only a random token), so there's nothing on that front to remove.\n\nA self-serve deletion flow for newsletter subscribers and Majlis accounts is on the roadmap.",
      },
      {
        q: "How long do you keep my data?",
        a: "Honestly: no automated deletion schedule yet.\n\nVotes and aggregate counts stay for the lifetime of the platform. They're anonymous and form the historical record.\n\nEmails stay until you ask us to remove them.\n\nMajlis accounts remain until the user requests deletion.\n\nA formal retention policy will follow as the platform matures.",
      },
    ],
  },
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  const { t } = useI18n()
  return (
    <div className={cn("border-b border-border transition-colors", open ? "pb-5" : "")}>
      <button
        onClick={() => setOpen(x => !x)}
        className="w-full flex items-start justify-between gap-4 py-5 text-left group"
      >
        <span className={cn("font-serif font-bold text-sm uppercase tracking-wide leading-snug transition-colors", open ? "text-primary" : "text-foreground group-hover:text-primary")}>
          {t(q)}
        </span>
        <ChevronDown className={cn("w-4 h-4 flex-shrink-0 mt-0.5 text-muted-foreground transition-transform duration-200", open && "rotate-180 text-primary")} />
      </button>
      {open && (
        <p className="font-sans text-sm text-foreground/80 leading-relaxed pr-8 whitespace-pre-line">
          {a}
        </p>
      )}
    </div>
  )
}

export default function FAQ() {
  usePageTitle({
    title: "FAQ",
    description: "Frequently asked questions about The Tribunal -- how it works, who it's for, and why anonymity matters.",
  });
  const { t, isAr } = useI18n()
  const { data: cmsConfig } = usePageConfig<{ titleLine1?: string; titleLine2?: string; sections?: FaqSection[]; punctuations?: string[] }>("faq")
  const FAQ_SECTIONS = cmsConfig?.sections?.length ? cmsConfig.sections : FAQ_SECTIONS_DEFAULT

  return (
    <Layout>
      <div className="bg-foreground text-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.28em", color: "#DC143C", marginBottom: "0.5rem" }}>
            {t("Help")}
          </p>
          <h1 style={{ fontFamily: isAr ? "'IBM Plex Sans Arabic', sans-serif" : "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "clamp(2rem, 5vw, 3.5rem)", textTransform: "uppercase", color: "var(--background)", letterSpacing: "-0.01em", lineHeight: 1.05, marginBottom: "0.5rem" }}>
            {t(cmsConfig?.titleLine1 || "Frequently Asked")}<br />
            {t(cmsConfig?.titleLine2 || "Questions")}<TitlePunctuation punctuations={cmsConfig?.punctuations} />
          </h1>
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(250,250,250,0.65)" }}>
            {t("Everything you need to know about The Tribunal.")}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-14">
        {FAQ_SECTIONS.map(section => (
          <div key={section.category}>
            <h2 className="text-[10px] uppercase tracking-[0.3em] font-bold text-primary mb-1 font-serif">
              {t(section.category)}
            </h2>
            <div className="border-t-2 border-foreground">
              {section.questions.map(item => (
                <FAQItem key={item.q} {...item} />
              ))}
            </div>
          </div>
        ))}

        <div className="border-t border-border pt-10">
          <p className="font-sans text-sm text-muted-foreground mb-4">{t("Still have questions?")}</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/about" className="text-[10px] uppercase tracking-widest font-bold font-serif text-primary hover:text-foreground transition-colors">
              {t("About The Tribunal →")}
            </Link>
            <Link href="/apply" className="text-[10px] uppercase tracking-widest font-bold font-serif text-muted-foreground hover:text-foreground transition-colors">
              {t("Apply to be a Voice →")}
            </Link>
            <Link href="/terms" className="text-[10px] uppercase tracking-widest font-bold font-serif text-muted-foreground hover:text-foreground transition-colors">
              {t("Terms & Conditions →")}
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  )
}
