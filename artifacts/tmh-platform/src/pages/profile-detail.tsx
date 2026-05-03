import { useState } from "react"
import { useRoute, Link } from "wouter"
import { useGetProfile } from "@workspace/api-client-react"
import { Layout } from "@/components/layout/Layout"
import { PollCard } from "@/components/poll/PollCard"
import { ProfileCard } from "@/components/profile/ProfileCard"
import { ArrowLeft, MapPin, Building, Briefcase, Eye, ExternalLink, MessageSquare } from "lucide-react"
import { usePageTitle } from "@/hooks/use-page-title"

const COMPANY_URLS: Record<string, string> = {
  "1833 Members Club": "https://1833.club",
  "MUNCH:ON (acquired by Careem)": "https://careem.com",
  "School of Humanity": "https://www.soh.earth",
  "CoinMENA": "https://coinmena.com",
  "Better (itsbetter.app)": "https://itsbetter.app",
  "Dubai Future Foundation": "https://www.dubaifuture.ae",
  "MSA Capital": "https://www.msacapital.com",
  "Replit": "https://replit.com",
  "Arzan Venture Capital": "https://arzanvc.com",
  "Kitopi": "https://kitopi.com",
  "Careem": "https://www.careem.com",
  "noon": "https://www.noon.com",
  "Anghami": "https://anghami.com",
  "Luna PR": "https://lunapr.io",
  "Washmen": "https://washmen.com",
  "Swvl": "https://swvl.com",
  "Mumzworld": "https://www.mumzworld.com",
  "Sarwa": "https://sarwa.co",
  "Baraka": "https://getbaraka.com",
  "PayTabs": "https://paytabs.com",
  "Magnitt": "https://magnitt.com",
  "Wio Bank": "https://wio.io",
  "Ziina": "https://ziina.com",
  "Zbooni": "https://zbooni.com",
  "Trukker": "https://trukker.com",
  "Mawdoo3": "https://mawdoo3.com",
  "The Lighthouse": "https://thelighthouse.ae",
  "Miral": "https://miral.ae",
  "Hub71": "https://www.hub71.com",
  "AstroLabs": "https://astrolabs.com",
  "Flat6Labs": "https://www.flat6labs.com",
  "Global Ventures": "https://globalventures.vc",
  "Endeavor": "https://endeavor.org",
  "Crescent Enterprises": "https://www.crescententerprises.com",
}

function getCompanyUrl(company: string): string {
  if (COMPANY_URLS[company]) return COMPANY_URLS[company]
  for (const [key, url] of Object.entries(COMPANY_URLS)) {
    if (company.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(company.toLowerCase())) return url
  }
  return ""
}

function CompanyLink({ company, companyUrl: apiUrl }: { company: string; companyUrl?: string | null }) {
  const url = apiUrl || getCompanyUrl(company)
  if (!url) return <span>{company}</span>
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="hover:text-primary transition-colors inline-flex items-center gap-1">
      {company} <ExternalLink className="w-3 h-3 opacity-60" />
    </a>
  )
}

export default function ProfileDetail() {
  const [, params] = useRoute("/voices/:id")
  const id = params?.id ? parseInt(params.id) : 0
  const [imgError, setImgError] = useState(false)

  const { data: profile, isLoading, error } = useGetProfile(id)
  usePageTitle(profile?.name)

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="h-8 w-24 bg-secondary animate-pulse mb-8" />
          <div className="h-[300px] bg-secondary animate-pulse mb-8 border border-border" />
          <div className="h-64 bg-secondary animate-pulse border border-border" />
        </div>
      </Layout>
    )
  }

  if (error || !profile) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-24 text-center">
          <h1 className="text-4xl font-serif font-black uppercase tracking-tight mb-4 text-foreground">Profile not found</h1>
          <Link href="/voices" className="text-primary hover:underline font-bold text-xs uppercase tracking-widest">
            Back to Directory
          </Link>
        </div>
      </Layout>
    )
  }

  const paragraphs = profile.story.split('\n').filter(Boolean)

  return (
    <Layout>
      {/* Header: portrait photo + name/meta */}
      <div className="bg-background border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Link href="/voices" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground font-bold mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Directory
          </Link>

          <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start">
            {/* Portrait photo */}
            {profile.imageUrl && !imgError ? (
              <div className="flex-shrink-0 w-48 md:w-56 overflow-hidden" style={{ aspectRatio: '3/4' }}>
                <img
                  src={profile.imageUrl}
                  alt={profile.name}
                  className="w-full h-full object-cover object-top grayscale"
                  onError={() => setImgError(true)}
                />
              </div>
            ) : (
              <div className="flex-shrink-0 w-48 md:w-56 bg-secondary text-foreground flex items-center justify-center font-serif font-black text-5xl" style={{ aspectRatio: '3/4' }}>
                {profile.name.substring(0, 2).toUpperCase()}
              </div>
            )}

            {/* Name / meta */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-foreground text-background text-[10px] font-bold uppercase tracking-widest">
                  {profile.sector}
                </span>
                {profile.isFeatured && (
                  <span className="px-3 py-1 bg-primary text-background text-[10px] font-bold uppercase tracking-widest">
                    Featured Voice
                  </span>
                )}
                <span className="text-muted-foreground text-[10px] uppercase tracking-widest font-bold flex items-center gap-1 ml-auto">
                  <Eye className="w-4 h-4" /> {profile.viewCount.toLocaleString()} Views
                </span>
              </div>

              <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-black uppercase text-foreground mb-4 leading-none tracking-tight">
                {profile.name}
              </h1>
              <p className="text-lg md:text-xl text-foreground font-serif italic mb-6 leading-relaxed border-l-4 border-primary pl-4">
                {profile.headline}
              </p>

              <div className="flex flex-wrap items-center gap-6 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-foreground" /> {profile.role}
                </div>
                {profile.company && (
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-foreground" />
                    <CompanyLink company={profile.company} companyUrl={profile.companyUrl} />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-foreground" /> {profile.city}, {profile.country}
                </div>
              </div>

              <Link
                href="/majlis"
                className="inline-flex items-center gap-2 mt-4 text-primary hover:text-primary/80 text-[10px] font-bold uppercase tracking-widest transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Message in The Majlis
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 lg:grid-cols-3 gap-16">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-16">
          {/* Impact Statement */}
          {!!(profile as unknown as Record<string, unknown>).impactStatement && (
            <section className="bg-background border border-border p-6 md:p-8">
              <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-primary mb-3">Impact</p>
              <p className="text-lg font-sans font-medium text-foreground leading-relaxed">
                {String((profile as unknown as Record<string, unknown>).impactStatement)}
              </p>
            </section>
          )}

          {/* IN THEIR OWN WORDS — above The Story */}
          {profile.quote && (
            <section>
              <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-primary mb-4">In Their Own Words</p>
              <blockquote className="font-serif italic text-2xl md:text-3xl font-black border-l-4 border-primary pl-6 py-4 text-foreground leading-snug">
                "{profile.quote}"
              </blockquote>
            </section>
          )}

          {/* The Story with drop cap */}
          <section>
            <h2 className="font-serif text-3xl font-black uppercase tracking-tight border-b-2 border-foreground pb-4 mb-6">The Story</h2>
            <div className="text-muted-foreground font-sans space-y-5 leading-relaxed">
              {paragraphs.map((para, i) => (
                <p key={i} className={i === 0 ? "first-letter-dropcap" : ""}>
                  {i === 0 ? (
                    <>
                      <span className="float-left font-serif font-black text-6xl leading-none mr-2 text-foreground" style={{ lineHeight: '0.85' }}>
                        {para[0]}
                      </span>
                      {para.slice(1)}
                    </>
                  ) : para}
                </p>
              ))}
            </div>
          </section>

          {/* Lessons Learned — large decorative numbers */}
          {profile.lessonsLearned && profile.lessonsLearned.length > 0 && (
            <section className="bg-background border border-border p-8 md:p-12">
              <h2 className="font-serif text-2xl font-black uppercase tracking-tight mb-8 text-primary">Lessons Learned</h2>
              <ul className="space-y-10">
                {profile.lessonsLearned.map((lesson, i) => (
                  <li key={i} className="relative pl-4">
                    <span className="absolute -left-2 top-0 text-6xl font-serif font-black text-foreground/10 leading-none select-none pointer-events-none" style={{ zIndex: 0 }}>
                      {(i + 1).toString().padStart(2, '0')}
                    </span>
                    <span className="relative z-10 text-lg font-medium text-foreground font-sans block pt-6">
                      {lesson}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Related Polls */}
          {profile.relatedPolls && profile.relatedPolls.length > 0 && (
            <section>
              <h2 className="font-serif text-3xl font-black uppercase tracking-tight border-b-2 border-foreground pb-4 mb-8">Associated Debates</h2>
              <div className="grid gap-10">
                {profile.relatedPolls.map(poll => (
                  <div key={poll.id}>
                    <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-primary mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      How does {profile.name.split(" ")[0]}'s network vote on this?
                    </p>
                    <PollCard poll={poll} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-8">
          {profile.similarProfiles && profile.similarProfiles.length > 0 && (
            <div className="bg-background border border-border p-6">
              <h3 className="font-serif font-black uppercase tracking-wider text-xl mb-6 border-b border-border pb-4">Similar Voices</h3>
              <div className="space-y-6">
                {profile.similarProfiles.map(similar => (
                  <ProfileCard key={similar.id} profile={similar} />
                ))}
              </div>
            </div>
          )}

          {/* Fun Fact */}
          {(profile as any).funFact && (
            <div className="bg-background border border-border p-6">
              <p className="text-[10px] uppercase tracking-widest text-primary font-bold mb-2">Fun Fact</p>
              <p className="text-sm text-muted-foreground italic font-sans">{(profile as any).funFact}</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
