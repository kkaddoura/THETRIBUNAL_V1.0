import { Link } from "wouter"
import { Layout } from "@/components/layout/Layout"
import { usePageTitle } from "@/hooks/use-page-title"
import { usePageConfig } from "@/hooks/use-cms-data"
import { TitlePunctuation } from "@/components/TitlePunctuation"

const SECTIONS = [
  {
    id: "acceptance",
    title: "1. Acceptance of Terms",
    content: `By accessing or using The Tribunal, by The Middle East Hustle ("The Tribunal," "we," "our," or "us") at themiddleeasthustle.com and any related subdomains, you agree to be bound by these Terms and Conditions. If you do not agree to all of these terms, please do not use the platform. We may update these terms at any time; continued use of the platform constitutes acceptance of the revised terms.`,
  },
  {
    id: "platform",
    title: "2. What The Tribunal Is",
    content: `The Tribunal is an independent opinion and polling platform by The Middle East Hustle, focused on the Middle East and North Africa region. We publish poll questions, aggregate anonymous votes, and feature curated profiles of founders, operators, and change-makers ("Voices"). The Tribunal is not a news outlet, financial advisor, or research institution. Content on this platform represents the opinions of voters and contributors, not the views of The Tribunal or its founders.`,
  },
  {
    id: "eligibility",
    title: "3. Age and Eligibility",
    content: `You must be at least 16 years old to use The Tribunal. By using the platform, you represent that you meet this age requirement. We do not knowingly collect personal information from users under 16. If you believe a minor has submitted personal information to us, please contact us immediately.`,
  },
  {
    id: "data",
    title: "4. Data Collection",
    content: `When you vote on a poll, we collect: your anonymised vote selection, the poll ID and timestamp, your approximate country of origin (derived from your IP address via a third-party geolocation service — your full IP address is never stored). When you submit your email address (via the share gate or newsletter signup), we collect your email and the source of capture. We do not sell your data to third parties. We may use aggregate, anonymised vote data for editorial purposes — for example, publishing "42% of UAE respondents voted X." We retain email addresses for newsletter distribution only and honour all unsubscribe requests immediately.`,
  },
  {
    id: "cookies",
    title: "5. Cookies and Local Storage",
    content: `The Tribunal uses browser localStorage (not third-party cookies) to remember your voting history, theme preference (dark/light), and whether you have unlocked poll results. We do not use tracking pixels, retargeting cookies, or cross-site analytics. If you clear your browser data, your voting history and preferences will reset. We may use first-party analytics (Plausible or similar privacy-preserving tools) to understand aggregate traffic patterns — no personally identifiable information is captured in this process.`,
  },
  {
    id: "ugc",
    title: "6. User-Generated Content",
    content: `Voice profiles, submitted poll questions, and application materials constitute user-generated content ("UGC"). By submitting content to The Tribunal, you grant us a non-exclusive, worldwide, royalty-free licence to display, reproduce, and distribute that content on the platform. You retain ownership of your content. You represent that your content is accurate, does not infringe any third-party rights, and does not violate any applicable law. The Tribunal reserves the right to remove, edit, or decline any content at our sole discretion.`,
  },
  {
    id: "ip",
    title: "7. Intellectual Property",
    content: `All branding, editorial content, design assets, and platform code are the intellectual property of The Middle East Hustle and its owners. The Tribunal name, logo, and "The Voice of 541 Million" tagline are proprietary marks. You may not reproduce, distribute, or create derivative works from our content without prior written permission. Poll results and Voice profiles displayed on the platform remain the property of The Tribunal and their respective contributors.`,
  },
  {
    id: "sharing",
    title: "8. The Share Gate Mechanic",
    content: `The Tribunal's Share Gate requires users to share a poll to a social network or provide an email address before accessing full results. By engaging with the Share Gate, you agree that: (a) you will not use automated tools, bots, or scripts to bypass the gate, (b) social shares you initiate are your own voluntary act and The Tribunal is not responsible for the content of your posts, (c) emails submitted to unlock results may be added to our newsletter list — you may unsubscribe at any time.`,
  },
  {
    id: "disclaimers",
    title: "9. Disclaimers and Limitation of Liability",
    content: `THE PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. THE TRIBUNAL DOES NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES. TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE TRIBUNAL AND ITS FOUNDERS, EMPLOYEES, AND AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE PLATFORM. Poll results are non-scientific and represent only the self-selected opinions of platform visitors. They should not be cited as representative surveys or used for academic, commercial, or policy purposes without appropriate caveats.`,
  },
  {
    id: "prohibited",
    title: "10. Prohibited Conduct",
    content: `You agree not to: vote multiple times on a single poll using VPNs, proxies, or multiple accounts; submit false or misleading information in a Voice application; impersonate any individual or organisation; use the platform to distribute spam or malware; attempt to reverse-engineer, scrape, or data-mine The Tribunal's content at scale without prior written consent; or engage in any conduct that disrupts or damages the platform.`,
  },
  {
    id: "governing",
    title: "11. Governing Law",
    content: `These Terms are governed by the laws of the United Arab Emirates. Any disputes arising from or relating to these Terms shall first be attempted to be resolved through good-faith negotiation. If unresolved, disputes shall be submitted to the exclusive jurisdiction of the courts of Dubai, UAE. If you access the platform from outside the UAE, you do so at your own initiative and are responsible for compliance with applicable local laws.`,
  },
  {
    id: "changes",
    title: "12. Changes to These Terms",
    content: `We reserve the right to modify these Terms at any time. We will notify users of material changes by updating the "Last Updated" date below and, where appropriate, by posting a notice on the platform. Your continued use of The Tribunal after any changes constitutes your acceptance of the new Terms.`,
  },
  {
    id: "contact",
    title: "13. Contact",
    content: `For questions, data requests, or legal correspondence, contact us at: legal@themiddleeasthustle.com. For content removal requests or profile corrections, contact: editorial@themiddleeasthustle.com.`,
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
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-primary mb-4 font-serif">Legal</p>
          <h1 className="font-display font-black text-4xl md:text-6xl uppercase tracking-tight">
            {pageConfig?.titleLine1 || "Terms &"}<br />
            {pageConfig?.titleLine2 || "Conditions"}<TitlePunctuation punctuations={pageConfig?.punctuations} />
          </h1>
          <p className="text-background/75 font-sans text-sm mt-4">
            Last updated: March 2026 · Governed by UAE Law
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-secondary/30 border border-border p-6 mb-12 font-sans text-sm text-foreground/80 leading-relaxed">
          <strong className="text-foreground font-bold">Plain English Summary:</strong> Vote anonymously. We capture your country (not your IP). If you give us your email, we'll send you the Weekly Pulse — you can unsubscribe any time. Don't fake votes or impersonate people. Everything on this platform is opinion, not science. We're based in Dubai and UAE law applies.
        </div>

        <div className="space-y-12">
          {SECTIONS.map(s => (
            <section key={s.id} id={s.id}>
              <h2 className="font-serif font-black text-xl uppercase tracking-wide text-foreground mb-4 pb-2 border-b-2 border-primary inline-block">
                {s.title}
              </h2>
              <p className="font-sans text-foreground/80 leading-relaxed text-[15px]">{s.content}</p>
            </section>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-border flex flex-wrap gap-6 text-[10px] uppercase tracking-widest font-bold font-serif text-muted-foreground">
          <Link href="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
          <Link href="/about" className="hover:text-foreground transition-colors">About The Tribunal</Link>
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
        </div>
      </div>
    </Layout>
  )
}
