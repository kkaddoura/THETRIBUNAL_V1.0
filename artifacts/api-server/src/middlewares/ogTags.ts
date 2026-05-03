import { Request, Response, NextFunction } from "express"

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const BOT_UA_PATTERNS = [
  /Twitterbot/i,
  /facebookexternalhit/i,
  /LinkedInBot/i,
  /TelegramBot/i,
  /WhatsApp/i,
  /Slackbot/i,
  /Discordbot/i,
  /pinterest/i,
  /Googlebot/i,
  /bingbot/i,
  /Applebot/i,
  /Embedly/i,
  /vkShare/i,
  /W3C_Validator/i,
  /redditbot/i,
  /Pinterestbot/i,
  /iframely/i,
]

function isBot(ua: string): boolean {
  return BOT_UA_PATTERNS.some(p => p.test(ua))
}

const INTERNAL_API_BASE = process.env.INTERNAL_API_URL ?? `http://127.0.0.1:${process.env.PORT ?? 8080}`;
const SITE = "https://themiddleeasthustle.com"
const DEFAULT_IMAGE = `${SITE}/og-cover.jpg`
const SITE_NAME = "The Tribunal, by The Middle East Hustle"

function buildHtml(meta: {
  title: string
  description: string
  url: string
  image: string
  type?: string
}): string {
  const { title, description, url, image, type = "website" } = meta
  const fullTitle = title.includes("Tribunal") || title.includes("Middle East") ? title : `${title} | ${SITE_NAME}`
  const safeTitle = escapeHtml(fullTitle)
  const safeDescription = escapeHtml(description)
  const safeUrl = escapeHtml(url)
  const safeImage = escapeHtml(image)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}" />

  <!-- Open Graph -->
  <meta property="og:type" content="${type}" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDescription}" />
  <meta property="og:url" content="${safeUrl}" />
  <meta property="og:image" content="${safeImage}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@TMHustle" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDescription}" />
  <meta name="twitter:image" content="${safeImage}" />

  <!-- Redirect bots gracefully -->
  <link rel="canonical" href="${safeUrl}" />
</head>
<body>
  <h1>${safeTitle}</h1>
  <p>${safeDescription}</p>
  <a href="${safeUrl}">View on The Tribunal</a>
</body>
</html>`
}

export function ogTagsMiddleware(req: Request, res: Response, next: NextFunction) {
  const ua = req.headers["user-agent"] ?? ""
  if (!isBot(ua)) return next()

  const host = req.headers.host ?? "themiddleeasthustle.com"
  // Railway (and most reverse proxies) terminate TLS — req.secure is always false.
  // Use x-forwarded-proto header, or default to https in production.
  const protocol = (req.headers["x-forwarded-proto"] as string) ?? (req.secure ? "https" : "http")
  const fullUrl = `${protocol}://${host}${req.originalUrl}`

  const debateMatch = req.path.match(/^\/debates\/(\d+)/)
  const pollMatch = req.path.match(/^\/polls\/(\d+)/) || debateMatch
  if (pollMatch) {
    // We'll try to fetch poll data from the internal polls route
    const pollId = pollMatch[1]
    fetch(`${INTERNAL_API_BASE}/api/polls/${pollId}`)
      .then(r => r.json() as Promise<Record<string, any>>)
      .then((poll) => {
        const title = poll.question ?? "The Middle East's boldest question"
        const totalVotes = poll.totalVotes ?? 0
        const topOption = (poll.options ?? []).reduce(
          (top: any, opt: any) => (!top || opt.voteCount > top.voteCount ? opt : top),
          null,
        )
        const leadText = topOption
          ? `${topOption.percentage}% say "${topOption.text}". ${totalVotes.toLocaleString()} MENA voices weighed in.`
          : `${totalVotes.toLocaleString()} voices from across MENA. Where do you stand?`
        const description = `${leadText} Vote on The Tribunal — the region's most honest opinion platform.`
        const siteBase = `${protocol}://${host}`
        const image = poll.ogImage ?? `${siteBase}/api/og-image/debate/${pollId}`
        const html = buildHtml({ title, description, url: fullUrl, image, type: "article" })
        res.setHeader("Content-Type", "text/html")
        return res.send(html)
      })
      .catch(() => {
        const html = buildHtml({
          title: "Today's Debate | The Tribunal",
          description: "The Middle East's most honest opinion platform. Vote on what actually matters.",
          url: fullUrl,
          image: DEFAULT_IMAGE,
          type: "article",
        })
        res.setHeader("Content-Type", "text/html")
        return res.send(html)
      })
    return
  }

  const profileMatch = req.path.match(/^\/voices\/(\d+)/)
  if (profileMatch) {
    const profileId = profileMatch[1]
    fetch(`${INTERNAL_API_BASE}/api/profiles/${profileId}`)
      .then(r => r.json() as Promise<Record<string, any>>)
      .then((profile) => {
        const name = profile.name ?? "A Hustler"
        const role = profile.role ? ` — ${profile.role}` : ""
        const company = profile.company ? ` at ${profile.company}` : ""
        const title = `${name}${role}${company}`
        const quote = profile.quote ? `"${profile.quote.slice(0, 100)}"` : ""
        const description = quote || `Meet ${name}, one of the founding Voices shaping the Middle East's future. ${profile.city ?? ""} ${profile.country ?? ""}`.trim()
        const image = profile.photoUrl ?? DEFAULT_IMAGE
        const html = buildHtml({ title, description, url: fullUrl, image })
        res.setHeader("Content-Type", "text/html")
        return res.send(html)
      })
      .catch(() => {
        const html = buildHtml({
          title: "A Voice Profile | The Tribunal",
          description: "Meet the founders, operators, and change-makers shaping the Middle East's future.",
          url: fullUrl,
          image: DEFAULT_IMAGE,
        })
        res.setHeader("Content-Type", "text/html")
        return res.send(html)
      })
    return
  }

  const predictionMatch = req.path.match(/^\/predictions\/(\d+)/)
  if (predictionMatch) {
    const predId = predictionMatch[1]
    fetch(`${INTERNAL_API_BASE}/api/predictions/${predId}`)
      .then(r => r.json() as Promise<Record<string, any>>)
      .then((pred) => {
        const title = pred.question ?? "MENA Prediction"
        const yesP = pred.yesPercentage ?? 50
        const totalVotes = pred.totalCount ?? 0
        const description = `${yesP}% say yes. ${totalVotes.toLocaleString()} predictions locked in. Vote on The Tribunal.`
        const predSiteBase = `${protocol}://${host}`
        const html = buildHtml({ title, description, url: fullUrl, image: `${predSiteBase}/api/og-image/prediction/${predId}`, type: "article" })
        res.setHeader("Content-Type", "text/html")
        return res.send(html)
      })
      .catch(() => {
        const html = buildHtml({
          title: "Prediction | The Tribunal",
          description: "MENA's prediction market. Track confidence, watch consensus shift, and call the future.",
          url: fullUrl,
          image: DEFAULT_IMAGE,
          type: "article",
        })
        res.setHeader("Content-Type", "text/html")
        return res.send(html)
      })
    return
  }

  // Default OG for all other pages
  const pageMeta: Record<string, { title: string; description: string }> = {
    "/": {
      title: "The Tribunal — The Voice of 541 Million",
      description: "MENA's premium polling and opinion platform. Real debates. Real people. Real opinions.",
    },
    "/polls": {
      title: "All Debates | The Tribunal",
      description: "Browse every debate. 135+ questions about the future of the Arab world.",
    },
    "/debates": {
      title: "All Debates | The Tribunal",
      description: "Browse every debate. 135+ questions about the future of the Arab world.",
    },
    "/debates/archive": {
      title: "Debate Archive | The Tribunal",
      description: "Past debates and their results. See how MENA voted on the questions that mattered.",
    },
    "/voices": {
      title: "The Voices | The Tribunal",
      description: "100+ curated founders, operators, and change-makers shaping MENA.",
    },
    "/join": {
      title: "Join The Tribunal",
      description: "The most honest conversation in the Middle East. Founders and operators voting every day.",
    },
    "/apply": {
      title: "Become a Voice | The Tribunal",
      description: "Think you belong? Apply now. Bar is high.",
    },
    "/predictions": {
      title: "Predictions | The Tribunal",
      description: "Bloomberg-style prediction market for MENA. Track confidence, watch consensus shift, and call the future.",
    },
    "/pulse": {
      title: "MENA Pulse — Real-Time Regional Data",
      description: "Live economic, social, and geopolitical data from across the Middle East and North Africa. Tracked on The Tribunal.",
    },
    "/mena-pulse": {
      title: "MENA Pulse — Real-Time Regional Data",
      description: "Live economic, social, and geopolitical data from across the Middle East and North Africa. Tracked on The Tribunal.",
    },
    "/about": {
      title: "About | The Tribunal",
      description: "The voice of 541 million. Why we built MENA's most honest opinion platform — and what comes next.",
    },
  }

  const page = pageMeta[req.path] ?? {
    title: SITE_NAME,
    description: "The voice of 541 million. Real debates. Real opinions.",
  }

  const html = buildHtml({ ...page, url: fullUrl, image: DEFAULT_IMAGE })
  res.setHeader("Content-Type", "text/html")
  return res.send(html)
}
