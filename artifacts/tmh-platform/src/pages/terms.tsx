import { Link } from "wouter"
import { Layout } from "@/components/layout/Layout"
import { usePageTitle } from "@/hooks/use-page-title"
import { usePageConfig } from "@/hooks/use-cms-data"
import { TitlePunctuation } from "@/components/TitlePunctuation"

const SECTIONS = [
  {
    id: "acceptance",
    title: "1. Acceptance of Terms",
    content: `By accessing or using The Tribunal, you agree to these Terms of Use.\n\nIf you do not agree, please do not use the platform.\n\nWe may update these Terms from time to time. Continued use of the platform means you accept the updated Terms.`,
  },
  {
    id: "platform",
    title: "2. What The Tribunal Is",
    content: `The Tribunal is a private voting platform focused on the Middle East and North Africa.\n\nWe publish questions, collect private votes, show aggregate results, and track predictions.\n\nUsers may create accounts to save activity, view previous votes or predictions, and continue from another device.\n\nThe Tribunal is not a news outlet, financial adviser, research institution, polling company, or scientific survey provider.\n\nResults represent the opinions of platform users. They should not be treated as statistically representative unless clearly stated otherwise.`,
  },
  {
    id: "eligibility",
    title: "3. Age and Eligibility",
    content: `You must be at least 16 years old to use The Tribunal.\n\nBy using the platform, you confirm that you meet this requirement.\n\nWe do not knowingly collect personal information from users under 16.`,
  },
  {
    id: "data",
    title: "4. Data Collection",
    content: `When you vote, we may collect:\n• your vote selection\n• the poll or prediction ID\n• timestamp\n• approximate country location, if enabled\n• basic device or browser signals used to protect against duplicate or automated voting\n• account-related activity if you create an account or sign in\n\nWe do not publicly show your name or email with your vote.\n\nIf you provide your email address, we may use it to send updates, create or access your account, unlock results, or help you save your activity. You can unsubscribe from marketing emails at any time.\n\nWe do not sell your personal data.`,
  },
  {
    id: "cookies",
    title: "5. Cookies and Local Storage",
    content: `The Tribunal may use browser local storage and similar technologies to remember your voting activity, theme preference, and whether you have unlocked results.\n\nIf you create an account, some activity may also be stored server-side so you can access it later.\n\nIf you clear your browser data, some preferences or local voting history may reset.\n\nWe do not use advertising cookies or tracking pixels unless this is clearly disclosed before use.`,
  },
  {
    id: "ugc",
    title: "6. User Submitted Content",
    content: `If you submit a question, profile, application, comment, or other content to The Tribunal, you confirm that you have the right to submit it.\n\nYou retain ownership of your content.\n\nBy submitting it, you give The Tribunal permission to review, edit, display, reproduce, and distribute that content on the platform and related channels.\n\nWe may remove, edit, or decline any submitted content at our discretion.`,
  },
  {
    id: "ip",
    title: "7. Intellectual Property",
    content: `The Tribunal name, logo, design, editorial content, questions, platform structure, and related assets are owned by the platform operator or its licensors.\n\nYou may not copy, reproduce, scrape, redistribute, or create derivative works from the platform without written permission.\n\nPoll and prediction results may be referenced with clear attribution to The Tribunal, provided they are not presented as scientific or representative survey results unless we explicitly say so.`,
  },
  {
    id: "sharing",
    title: "8. Sharing, Email Capture and Accounts",
    content: `Some results may require sharing, signing up, or providing an email address to access.\n\nIf you provide your email, we may send you updates from The Tribunal if you opted in. You can unsubscribe at any time.\n\nIf you create an account, we may save your activity so you can view previous votes, predictions, and saved activity.\n\nYou may not use bots, scripts, fake accounts, or automated tools to bypass result gates or manipulate voting.`,
  },
  {
    id: "disclaimers",
    title: "9. Disclaimers and Liability",
    content: `The platform is provided "as is."\n\nWe do not guarantee that the platform will always be available, error free, or free from interruptions.\n\nPolls, debates, predictions, and results are opinion signals from self-selected users. They are not scientific surveys, investment advice, legal advice, policy advice, or professional advice.\n\nUse the platform at your own discretion.`,
  },
  {
    id: "prohibited",
    title: "10. Prohibited Conduct",
    content: `You agree not to:\n• submit fake, misleading, or unlawful content\n• impersonate another person or organisation\n• manipulate votes\n• use bots, scripts, VPN abuse, proxies, or multiple accounts to distort results\n• scrape, reverse engineer, or data mine the platform at scale\n• interfere with the security or operation of the platform\n• use the platform to harass, threaten, defame, or target others`,
  },
  {
    id: "governing",
    title: "11. Governing Law",
    content: `This section requires legal review.\n\nUntil the formal operating entity is established, governing law and jurisdiction will be updated later.\n\nUsers are responsible for complying with the laws applicable in their own location.`,
  },
  {
    id: "changes",
    title: "12. Changes to These Terms",
    content: `We may update these Terms from time to time.\n\nWhen we do, we will update the "Last updated" date on this page.\n\nContinued use of The Tribunal after changes are posted means you accept the updated Terms.`,
  },
  {
    id: "contact",
    title: "13. Contact",
    content: `For legal, data, or platform questions, contact:\nlegal@themiddleeasthustle.com\n\nFor editorial corrections or content removal requests, contact:\neditorial@themiddleeasthustle.com`,
  },
]

export default function Terms() {
  usePageTitle({
    title: "Terms of Service",
    description: "Terms of service and usage policies for The Tribunal platform.",
  });
  const { data: pageConfig } = usePageConfig<{ titleLine1?: string; titleLine2?: string; punctuations?: string[] }>("terms")
  return (
    <Layout>
      <div className="bg-foreground text-background py-16 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="text-[12px] uppercase tracking-[0.3em] font-bold text-primary mb-4 font-serif">Legal</p>
          <h1 className="font-display font-black text-4xl md:text-6xl uppercase tracking-tight">
            {pageConfig?.titleLine1 || "Terms"}<br />
            {pageConfig?.titleLine2 || "of Use"}<TitlePunctuation punctuations={pageConfig?.punctuations} />
          </h1>
          <p className="text-background/75 font-sans text-sm mt-4">
            Last updated: May 2026
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-secondary/30 border border-border p-6 mb-8 font-sans text-sm text-foreground/80 leading-relaxed">
          <strong className="text-foreground font-bold">Plain English Summary:</strong> Use the platform honestly. Vote privately. Do not fake votes, impersonate people, scrape the site, or misuse the platform. Results are opinion signals from self-selected users, not scientific polling. If you create an account, we may save your activity so you can view it later. We do not sell your personal data. Formal operator details will be updated once incorporation is complete.
        </div>

        <div className="bg-background border border-primary/40 p-6 mb-12 font-sans text-sm text-foreground/80 leading-relaxed">
          <strong className="text-foreground font-bold">About the operator:</strong> &ldquo;The Tribunal&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo; and &ldquo;our&rdquo; refer to the operator of this platform. The Tribunal is operated by its founder under The Middle East Hustle brand. Formal operating entity details will be updated once incorporation is complete.
        </div>

        <div className="space-y-12">
          {SECTIONS.map(s => (
            <section key={s.id} id={s.id}>
              <h2 className="font-serif font-black text-xl uppercase tracking-wide text-foreground mb-4 pb-2 border-b-2 border-primary inline-block">
                {s.title}
              </h2>
              <p className="font-sans text-foreground/80 leading-relaxed text-[15px] whitespace-pre-line">{s.content}</p>
            </section>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-border flex flex-wrap gap-6 text-[12px] uppercase tracking-widest font-bold font-serif text-muted-foreground">
          <Link href="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
          <Link href="/about" className="hover:text-foreground transition-colors">About The Tribunal</Link>
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
        </div>
      </div>
    </Layout>
  )
}
