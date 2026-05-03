import { useState } from "react"
import { useLocation } from "wouter"
import { MapPin, ExternalLink } from "lucide-react"
import type { Profile } from "@workspace/api-client-react"

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
  "noon.com": "https://www.noon.com",
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
  "Hala": "https://hala.com",
  "Majid Al Futtaim": "https://www.majidalfuttaim.com",
  "ADGM": "https://www.adgm.com",
  "DIFC": "https://www.difc.ae",
  "500 Global": "https://500.co",
  "Middle East Venture Partners": "https://mevp.com",
  "MEVP": "https://mevp.com",
  "Wamda Capital": "https://wamda.com",
}

export function getCompanyUrl(company?: string | null): string {
  if (!company) return ""
  if (COMPANY_URLS[company]) return COMPANY_URLS[company]
  for (const [key, url] of Object.entries(COMPANY_URLS)) {
    if (company.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(company.toLowerCase())) {
      return url
    }
  }
  return ""
}

export function ProfileCard({ profile }: { profile: Profile }) {
  const [, navigate] = useLocation()
  const [imgError, setImgError] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()

  const companyUrl = profile.companyUrl || getCompanyUrl(profile.company)
  const profileUrl = `/voices/${profile.id}`

  return (
    <div
      className="group bg-card border border-border hover:border-primary transition-all duration-300 cursor-pointer h-full flex flex-col relative overflow-hidden"
      onClick={() => navigate(profileUrl)}
      role="article"
    >
      {/* Photo or initials — fixed aspect ratio for alignment */}
      {profile.imageUrl && !imgError ? (
        <div className="w-full aspect-[3/4] relative overflow-hidden flex-shrink-0 bg-secondary flex items-center justify-center">
          {/* Skeleton shimmer while image loads */}
          {!imgLoaded && (
            <div className="absolute inset-0 bg-secondary">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-background/20 to-transparent" />
            </div>
          )}
          <img
            src={profile.imageUrl}
            alt={profile.name}
            className={`w-full h-full object-cover object-top grayscale group-hover:grayscale-0 transition-all duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
          {profile.isFeatured && (
            <span className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-primary text-background text-[8px] sm:text-[9px] uppercase tracking-widest px-1.5 py-0.5 sm:px-2 sm:py-1 font-bold">
              Featured Voice
            </span>
          )}
          {profile.isVerified && (
            <div className="absolute top-2 right-2 sm:top-3 sm:right-3 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-primary border-2 border-background" title="Verified Voice" />
          )}
        </div>
      ) : (
        <div className="relative aspect-[3/4] bg-secondary flex items-center justify-center flex-shrink-0">
          <span className="font-serif font-bold text-2xl sm:text-4xl text-foreground/30">
            {getInitials(profile.name)}
          </span>
          {profile.isFeatured && (
            <span className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-primary text-background text-[8px] sm:text-[9px] uppercase tracking-widest px-1.5 py-0.5 sm:px-2 sm:py-1 font-bold">
              Featured Voice
            </span>
          )}
          {profile.isVerified && (
            <div className="absolute top-2 right-2 sm:top-3 sm:right-3 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-primary border-2 border-background" title="Verified Voice" />
          )}
        </div>
      )}

      <div className="p-3 sm:p-5 flex flex-col flex-1">
        <h3 className="font-serif font-black text-sm sm:text-xl uppercase tracking-tight text-foreground group-hover:text-primary transition-colors leading-tight mb-0.5 sm:mb-1">
          {profile.name}
        </h3>

        {profile.headline && (
          <p className="text-xs sm:text-sm italic text-muted-foreground mb-1.5 sm:mb-2 leading-snug" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {profile.headline}
          </p>
        )}

        <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5 sm:mb-1">
          {profile.role}
          {profile.company && (
            <>
              {" · "}
              {companyUrl ? (
                <a
                  href={companyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  {profile.company}
                  <ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-60" />
                </a>
              ) : (
                profile.company
              )}
            </>
          )}
        </p>

        {profile.city && (
          <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1 mb-2 sm:mb-4">
            <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" /> {profile.city}
          </p>
        )}

        <div className="mt-auto">
          <div className="w-full py-1.5 sm:py-2 border border-foreground text-foreground text-[9px] sm:text-[10px] uppercase tracking-widest font-bold hover:bg-foreground hover:text-background transition-colors text-center">
            Read Their Story →
          </div>
        </div>
      </div>
    </div>
  )
}
