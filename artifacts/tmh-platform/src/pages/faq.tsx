import { useState } from "react"
import { Layout } from "@/components/layout/Layout"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Link } from "wouter"
import { useI18n } from "@/lib/i18n"
import { usePageConfig, useSiteSettings } from "@/hooks/use-cms-data"
import { TitlePunctuation } from "@/components/TitlePunctuation"
import { usePageTitle } from "@/hooks/use-page-title"

interface FaqSection {
  category: string
  questions: Array<{ q: string; a: string }>
  requires?: "pulse" | "voices" | "majlis"
}

const FAQ_SECTIONS_DEFAULT: FaqSection[] = [
  {
    category: "The Platform",
    questions: [
      {
        q: "What is The Tribunal?",
        a: "The Tribunal is a private voting platform that shows how people answer direct questions about the Middle East and North Africa.",
      },
      {
        q: "Is The Tribunal free to use?",
        a: "Yes. You can vote and make predictions for free. Some features may require sign up so you can save your activity.",
      },
      {
        q: "Do I need an account?",
        a: "No. You can vote without an account. If you sign up, you can save your activity, view previous votes and predictions, and continue from another device.",
      },
      {
        q: "Who is behind The Tribunal?",
        a: "The Tribunal was created by Kareem Kaddoura under The Middle East Hustle brand. It is its own platform. Formal operating entity details will be updated once incorporation is complete.",
      },
      {
        q: "Are the results scientific?",
        a: "No. Results are based on votes from platform users. They are opinion signals, not scientific or representative surveys.",
      },
      {
        q: "Is The Tribunal part of The Middle East Hustle?",
        a: "The Tribunal was created by the founder of The Middle East Hustle, but it is its own platform.",
      },
    ],
  },
  {
    category: "Debates",
    questions: [
      {
        q: "How do debates work?",
        a: "Choose a question, vote privately, then see how others answered.",
      },
      {
        q: "Can I vote more than once?",
        a: "No. We use technical checks to limit duplicate and automated voting.",
      },
      {
        q: "Are my debate votes private?",
        a: "Your name and email are not shown with your vote. Results are shown in aggregate. If you sign in, your account may show your previous activity back to you.",
      },
      {
        q: "How are debate questions chosen?",
        a: "Questions are selected by the editorial team. The goal is to ask direct questions people usually avoid in public.\n\nEvery question is reviewed by a human before it goes live.",
      },
      {
        q: "Why do some results ask me to share or enter an email?",
        a: "Some full result breakdowns may require sharing or email unlock. This helps more people find the question while keeping voting free.\n\nIf you enter your email, it may also help you save activity or receive updates if you opt in.",
      },
      {
        q: "What is the country breakdown?",
        a: "If you allow country detection, your vote may be tagged by country so results can show regional differences.\n\nYour name is not attached to your vote.\n\nIf you decline country detection, your vote is recorded without a country attached.",
      },
    ],
  },
  {
    category: "Predictions",
    questions: [
      {
        q: "What is the Predictions page?",
        a: "Predictions show what people think will happen next.\n\nNot what should happen.\nWhat people expect will happen.",
      },
      {
        q: "How do predictions work?",
        a: "Each prediction asks a future-facing yes or no question.\n\nVote on what you think will happen. Then watch how confidence changes over time.\n\nIf you sign up, you can save your predictions and return to them later.",
      },
      {
        q: "Are predictions financial bets?",
        a: "No. Predictions on The Tribunal are opinion forecasts. They are not gambling, financial products, investment advice, or financial advice.",
      },
      {
        q: "Can I change my prediction?",
        a: "This depends on the prediction rules. If predictions are locked after voting, that should be clearly shown on the prediction page.",
      },
    ],
  },
  {
    category: "Pulse",
    requires: "pulse",
    questions: [
      {
        q: "What is Pulse?",
        a: "Pulse is a public data layer for the region. It gives context to the questions people are voting on through sourced public data points.",
      },
      {
        q: "How are Pulse trends selected?",
        a: "Pulse trends are selected through editorial review. Each card should be tied to a credible public source.",
      },
      {
        q: "Are Pulse numbers real time?",
        a: "Not always. Some figures update periodically depending on the source. Each card should show source attribution where possible.",
      },
    ],
  },
  {
    category: "Voices",
    requires: "voices",
    questions: [
      {
        q: "What is a Voice?",
        a: "A Voice is a curated profile of someone with a clear connection to the region and a body of work we can verify.",
      },
      {
        q: "How do I become a Voice?",
        a: "Apply through Join The Voices. Applications are reviewed by a human.",
      },
      {
        q: "How are Voices organized?",
        a: "Profiles can be browsed by country, industry and tag.",
      },
      {
        q: "What makes someone eligible?",
        a: "A clear body of work, a connection to the region, and something specific to say.",
      },
    ],
  },
  {
    category: "The Majlis",
    requires: "majlis",
    questions: [
      {
        q: "What is The Majlis?",
        a: "The Majlis is a private members-only space connected to The Tribunal.",
      },
      {
        q: "Who can join?",
        a: "Selected participants with a serious connection to the region.",
      },
      {
        q: "Is The Majlis private?",
        a: "The Majlis is separate from private voting. Voting remains private. Majlis access may require identity review or approval.",
      },
      {
        q: "Can anyone post?",
        a: "No. Access and posting rights may be limited to approved members.",
      },
    ],
  },
  {
    category: "Privacy and Data",
    questions: [
      {
        q: "What do you collect when I vote?",
        a: "We collect the option you selected, the question ID, a timestamp, and technical signals used to prevent duplicate or automated voting.\n\nIf you allow country detection, we may also record your approximate country.\n\nYour name is not shown with your vote.\n\nIf you create an account, your activity may be saved so you can view it later.",
      },
      {
        q: "What happens to my IP address?",
        a: "If you allow country detection, your IP may be used once to estimate your country.\n\nYour raw IP address is not published with your vote.\n\nIf you decline country detection, your vote is recorded without a country attached.",
      },
      {
        q: "Do you use cookies?",
        a: "We use limited local storage and similar technologies to remember voting activity, theme preference, and results you have unlocked.\n\nWe do not use advertising cookies or tracking pixels.",
      },
      {
        q: "What is stored in my browser?",
        a: "Your browser may store your anonymous voter token, debates you have voted on, results you have unlocked, theme preference, language preference, and consent choices.\n\nThis helps the platform work properly.",
      },
      {
        q: "What about my email if I enter it?",
        a: "If you enter your email, we may use it to unlock results, save your activity, create or access your account, or send updates if you opted in.\n\nYou can unsubscribe from updates at any time.",
      },
      {
        q: "Can I see my previous activity?",
        a: "Yes, if you sign up. Your account can show your previous votes, predictions, and saved activity.",
      },
      {
        q: "Do you sell my data?",
        a: "No. We do not sell your personal data.",
      },
      {
        q: "Do you use analytics or tracking pixels?",
        a: "We do not use advertising pixels or retargeting pixels.\n\nIf privacy-conscious analytics are used later, this answer will be updated.",
      },
      {
        q: "What third party services do you use?",
        a: "We work with infrastructure and service providers to operate the platform.",
      },
      {
        q: "Where is my data stored?",
        a: "Platform data is stored using the infrastructure providers used to operate The Tribunal.",
      },
      {
        q: "Can I have my data deleted?",
        a: "Yes. Contact us at legal@themiddleeasthustle.com and we will review your request.",
      },
      {
        q: "How long do you keep my data?",
        a: "We keep data only as long as needed to operate the platform, prevent abuse, maintain aggregate results, support account activity history, and meet legal or operational requirements.",
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
    description: "Frequently asked questions about The Tribunal — how it works, who it's for, and how private voting works.",
  });
  const { t, isAr } = useI18n()
  const { data: cmsConfig } = usePageConfig<{ titleLine1?: string; titleLine2?: string; sections?: FaqSection[]; punctuations?: string[] }>("faq")
  const { data: siteSettings } = useSiteSettings()
  const pulseEnabled = siteSettings?.featureToggles?.pulse?.enabled ?? false
  const voicesEnabled = siteSettings?.featureToggles?.voices?.enabled ?? false
  const majlisEnabled = siteSettings?.featureToggles?.majlis?.enabled ?? false
  const sectionMatchesToggles = (section: FaqSection) => {
    if (!section.requires) return true
    if (section.requires === "pulse") return pulseEnabled
    if (section.requires === "voices") return voicesEnabled
    if (section.requires === "majlis") return majlisEnabled
    return true
  }
  const baseSections = cmsConfig?.sections?.length ? cmsConfig.sections : FAQ_SECTIONS_DEFAULT
  const FAQ_SECTIONS = baseSections.filter(sectionMatchesToggles)

  return (
    <Layout>
      <div className="bg-foreground text-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.28em", color: "#DC143C", marginBottom: "0.5rem" }}>
            {t("Help")}
          </p>
          <h1 style={{ fontFamily: isAr ? "'IBM Plex Sans Arabic', sans-serif" : "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "clamp(2rem, 5vw, 3.5rem)", textTransform: "uppercase", color: "var(--background)", letterSpacing: "-0.01em", lineHeight: 1.05, marginBottom: "0.5rem" }}>
            {t(cmsConfig?.titleLine1 || "Frequently Asked")}<br />
            {t(cmsConfig?.titleLine2 || "Questions")}<TitlePunctuation punctuations={cmsConfig?.punctuations} />
          </h1>
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "0.90rem", textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(250,250,250,0.65)" }}>
            {t("Plain answers about The Tribunal.")}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-14">
        {FAQ_SECTIONS.map(section => (
          <div key={section.category}>
            <h2 className="text-[12px] uppercase tracking-[0.3em] font-bold text-primary mb-1 font-serif">
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
            <Link href="/about" className="text-[12px] uppercase tracking-widest font-bold font-serif text-primary hover:text-foreground transition-colors">
              {t("About The Tribunal →")}
            </Link>
            <Link href="/terms" className="text-[12px] uppercase tracking-widest font-bold font-serif text-muted-foreground hover:text-foreground transition-colors">
              {t("Terms & Conditions →")}
            </Link>
            <Link href="/contact" className="text-[12px] uppercase tracking-widest font-bold font-serif text-muted-foreground hover:text-foreground transition-colors">
              {t("Contact →")}
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  )
}
