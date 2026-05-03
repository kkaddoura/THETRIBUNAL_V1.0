import { useState } from "react"
import { Link } from "wouter"
import { Layout } from "@/components/layout/Layout"
import { useI18n } from "@/lib/i18n"
import { Mail, MapPin, MessageSquare } from "lucide-react"
import { usePageTitle } from "@/hooks/use-page-title"
import { usePageConfig } from "@/hooks/use-cms-data"
import { TitlePunctuation } from "@/components/TitlePunctuation"

export default function Contact() {
  usePageTitle({
    title: "Contact",
    description: "Get in touch with The Tribunal team. Partnerships, press, feedback, or just say hello.",
  });
  const { t, isAr } = useI18n()
  const { data: pageConfig } = usePageConfig<{ titleLine1?: string; titleLine2?: string; punctuations?: string[] }>("contact")
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" })
  const [submitted, setSubmitted] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) {
      setFieldErrors(prev => { const next = { ...prev }; delete next[name]; return next })
    }
  }

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {}
    if (!form.name.trim()) errors.name = "This field is required"
    if (!form.email.trim()) errors.email = "This field is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Please enter a valid email"
    if (!form.message.trim()) errors.message = "This field is required"
    return errors
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return
    // Open mailto with pre-filled fields as fallback
    const mailtoBody = `Name: ${form.name}%0D%0A%0D%0A${form.message}`
    const mailtoSubject = form.subject || "General Inquiry"
    window.location.href = `mailto:hello@themiddleeasthustle.com?subject=${encodeURIComponent(mailtoSubject)}&body=${mailtoBody}`
    setSubmitted(true)
  }

  return (
    <Layout>
      {/* Hero */}
      <div className="bg-foreground text-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.28em", color: "#DC143C", marginBottom: "0.5rem" }}>
            {t("Get In Touch")}
          </p>
          <h1 style={{ fontFamily: isAr ? "'IBM Plex Sans Arabic', sans-serif" : "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "clamp(2rem, 5vw, 3.5rem)", textTransform: "uppercase", color: "var(--background)", letterSpacing: "-0.01em", lineHeight: 1.05, marginBottom: "0.5rem" }}>
            {t(pageConfig?.titleLine1 || "Contact")}<br />
            {t(pageConfig?.titleLine2 || "Us")}<TitlePunctuation punctuations={pageConfig?.punctuations} />
          </h1>
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(250,250,250,0.65)" }}>
            {t("Questions, partnerships, press inquiries, or just want to say hello.")}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-5 gap-16">
          {/* Contact Info - Left Column */}
          <div className="md:col-span-2 space-y-10">
            <div>
              <h2 className="font-serif font-black uppercase text-lg text-foreground mb-6 border-l-4 border-primary pl-4">
                {t("Reach Us")}
              </h2>
              <div className="space-y-6">
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground font-serif mb-1">
                      {t("Email")}
                    </p>
                    <a
                      href="mailto:hello@themiddleeasthustle.com"
                      className="text-sm font-sans text-foreground hover:text-primary transition-colors"
                    >
                      hello@themiddleeasthustle.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground font-serif mb-1">
                      {t("Region")}
                    </p>
                    <p className="text-sm font-sans text-foreground">
                      {t("Middle East & North Africa")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MessageSquare className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground font-serif mb-1">
                      {t("Social")}
                    </p>
                    <div className="flex flex-col gap-1">
                      <a href="https://x.com/tmhustle" target="_blank" rel="noopener noreferrer" className="text-sm font-sans text-foreground hover:text-primary transition-colors">
                        X (Twitter)
                      </a>
                      <a href="https://linkedin.com/company/the-middle-east-hustle" target="_blank" rel="noopener noreferrer" className="text-sm font-sans text-foreground hover:text-primary transition-colors">
                        LinkedIn
                      </a>
                      <a href="https://instagram.com/tmhustle" target="_blank" rel="noopener noreferrer" className="text-sm font-sans text-foreground hover:text-primary transition-colors">
                        Instagram
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-8">
              <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-primary mb-3 font-serif">
                {t("What We Can Help With")}
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground font-sans">
                <li>{t("Press & media inquiries")}</li>
                <li>{t("Partnership opportunities")}</li>
                <li>{t("Voice applications & nominations")}</li>
                <li>{t("Data licensing & research")}</li>
                <li>{t("General questions & feedback")}</li>
              </ul>
            </div>
          </div>

          {/* Contact Form - Right Column */}
          <div className="md:col-span-3">
            <h2 className="font-serif font-black uppercase text-lg text-foreground mb-6 border-l-4 border-primary pl-4">
              {t("Send a Message")}
            </h2>

            {submitted ? (
              <div className="border-2 border-primary/30 bg-primary/5 p-8 text-center">
                <p className="font-serif font-bold uppercase text-lg text-foreground mb-2">
                  {t("Your email client should open shortly.")}
                </p>
                <p className="text-sm text-muted-foreground font-sans">
                  {t("If it doesn't, send your message directly to")}{" "}
                  <a href="mailto:hello@themiddleeasthustle.com" className="text-primary hover:underline">
                    hello@themiddleeasthustle.com
                  </a>
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-6 text-[10px] uppercase tracking-widest font-bold font-serif text-primary hover:text-foreground transition-colors"
                >
                  {t("Send Another Message")} {isAr ? "←" : "→"}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground font-serif mb-2 block">
                      {t("Name")} *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      className={`w-full border bg-background text-foreground px-4 py-3 text-sm font-sans focus:outline-none transition-colors ${fieldErrors.name ? "border-red-500 focus:border-red-500" : "border-border focus:border-primary"}`}
                      placeholder={t("Your name")}
                    />
                    {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground font-serif mb-2 block">
                      {t("Email")} *
                    </label>
                    <input
                      type="text"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      className={`w-full border bg-background text-foreground px-4 py-3 text-sm font-sans focus:outline-none transition-colors ${fieldErrors.email ? "border-red-500 focus:border-red-500" : "border-border focus:border-primary"}`}
                      placeholder={t("your@email.com")}
                    />
                    {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground font-serif mb-2 block">
                    {t("Subject")}
                  </label>
                  <select
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    className="w-full border border-border bg-background text-foreground px-4 py-3 text-sm font-sans focus:outline-none focus:border-primary transition-colors appearance-none"
                  >
                    <option value="">{t("Select a topic...")}</option>
                    <option value="General Inquiry">{t("General Inquiry")}</option>
                    <option value="Press & Media">{t("Press & Media")}</option>
                    <option value="Partnership">{t("Partnership")}</option>
                    <option value="Voice Application">{t("Voice Application")}</option>
                    <option value="Data & Research">{t("Data & Research")}</option>
                    <option value="Bug Report">{t("Bug Report")}</option>
                    <option value="Other">{t("Other")}</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground font-serif mb-2 block">
                    {t("Message")} *
                  </label>
                  <textarea
                    name="message"
                    rows={6}
                    value={form.message}
                    onChange={handleChange}
                    className={`w-full border bg-background text-foreground px-4 py-3 text-sm font-sans focus:outline-none transition-colors resize-none ${fieldErrors.message ? "border-red-500 focus:border-red-500" : "border-border focus:border-primary"}`}
                    placeholder={t("What's on your mind?")}
                  />
                  {fieldErrors.message && <p className="text-xs text-red-500 mt-1">{fieldErrors.message}</p>}
                </div>

                <button
                  type="submit"
                  className="bg-foreground text-background px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-primary transition-colors font-serif w-full sm:w-auto"
                >
                  {t("Send Message")}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="bg-secondary/20 border-t border-border py-12">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="font-display text-xl text-foreground mb-2 leading-snug">
            {t("541 million voices. One platform.")}
          </p>
          <p className="text-sm text-muted-foreground font-sans mb-6">
            {t("Join the conversation shaping the future of the Middle East.")}
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/debates"
              className="bg-foreground text-background px-6 py-2.5 font-bold uppercase tracking-widest text-[10px] hover:bg-primary transition-colors font-serif"
            >
              {t("Enter The Debates")}
            </Link>
            <Link
              href="/apply"
              className="border border-foreground text-foreground px-6 py-2.5 font-bold uppercase tracking-widest text-[10px] hover:bg-foreground hover:text-background transition-colors font-serif"
            >
              {t("Join The Voices")}
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  )
}
