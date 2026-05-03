import { Router } from "express"
import { db, hustlerApplicationsTable } from "@workspace/db"

const router = Router()

const CRITERIA = [
  {
    key: "impact",
    label: "Real, verifiable impact",
    maxScore: 15,
    passSignals: ["raised", "exits", "million", "users", "employees", "founded", "launched", "built", "revenue", "funded", "acquired", "unicorn", "exit"],
    failSignals: ["passionate about", "experienced in", "interested in", "aspiring"],
  },
  {
    key: "mena",
    label: "MENA connection",
    maxScore: 15,
    passSignals: ["dubai", "uae", "saudi", "egypt", "jordan", "lebanon", "bahrain", "qatar", "oman", "kuwait", "morocco", "mena", "gulf", "middle east", "riyadh", "cairo", "abu dhabi"],
    failSignals: [],
  },
  {
    key: "story",
    label: "Unique story",
    maxScore: 15,
    passSignals: ["pivot", "failed", "failure", "lost", "struggle", "challenge", "overcome", "unexpected", "left", "quit", "bet", "risk", "decided"],
    failSignals: ["joined", "promoted", "worked my way"],
  },
  {
    key: "built",
    label: "Built something tangible",
    maxScore: 15,
    passSignals: ["founded", "co-founded", "built", "created", "launched", "started", "developed", "shipped", "product", "company", "startup", "NGO", "platform"],
    failSignals: [],
  },
  {
    key: "quote",
    label: "Original quote",
    maxScore: 10,
    passSignals: [],
    failSignals: ["work hard", "dream big", "never give up", "believe in yourself", "success is a journey", "sky is the limit"],
  },
  {
    key: "linkedin",
    label: "LinkedIn provided",
    maxScore: 10,
    passSignals: ["linkedin.com"],
    failSignals: [],
  },
]

function scoreApplication(data: any): { score: number; status: string; reasoning: string; checklist: any[] } {
  const searchText = [data.bio ?? "", data.impact ?? "", data.quote ?? "", data.linkedin ?? ""].join(" ").toLowerCase()
  const menaText = [data.country ?? "", data.city ?? "", data.bio ?? ""].join(" ").toLowerCase()

  const checklist = CRITERIA.map(criterion => {
    let text = searchText
    if (criterion.key === "mena") text = menaText
    if (criterion.key === "quote") text = (data.quote ?? "").toLowerCase()
    if (criterion.key === "linkedin") text = (data.linkedin ?? "").toLowerCase()

    const passCount = criterion.passSignals.filter(s => text.includes(s)).length
    const failCount = criterion.failSignals.filter(s => text.includes(s)).length

    let rawScore: number
    if (criterion.key === "linkedin") {
      rawScore = criterion.passSignals.some(s => text.includes(s)) ? criterion.maxScore : 0
    } else if (criterion.key === "quote") {
      rawScore = failCount > 0 ? Math.round(criterion.maxScore * 0.2) : criterion.maxScore * 0.7
    } else {
      const passRatio = Math.min(passCount / Math.max(criterion.passSignals.length * 0.3, 1), 1)
      rawScore = Math.round(criterion.maxScore * passRatio)
      if (failCount > 0) rawScore = Math.round(rawScore * 0.4)
    }

    if (data.bio && data.bio.length >= 100 && criterion.key === "impact") rawScore = Math.max(rawScore, 5)

    return {
      criterion: criterion.label,
      score: Math.min(rawScore, criterion.maxScore),
      maxScore: criterion.maxScore,
      notes: passCount > 0 ? `${passCount} signal(s) detected` : failCount > 0 ? "Concern signals detected" : "Insufficient signals",
    }
  })

  const bioLengthBonus = data.bio && data.bio.split(/\s+/).length >= 80 ? 5 : data.bio && data.bio.split(/\s+/).length >= 40 ? 3 : 0
  const allFieldsBonus = (data.name && data.email && data.title && data.company && data.bio && data.linkedin && data.impact) ? 5 : 0

  const baseScore = checklist.reduce((sum, c) => sum + c.score, 0)
  const score = Math.min(100, baseScore + bioLengthBonus + allFieldsBonus)

  let status: string
  let reasoning: string

  if (score >= 70) {
    status = "passed"
    reasoning = `Strong application. Score ${score}/100. Multiple verifiable impact signals, MENA connection confirmed, LinkedIn provided. Ready for editorial review.`
  } else if (score >= 40) {
    status = "conditional"
    reasoning = `Promising application. Score ${score}/100. Shows potential but needs stronger impact evidence or more specific MENA connection. Resubmit in 30 days with specific outcomes.`
  } else {
    status = "not_yet"
    reasoning = `Score ${score}/100. The Tribunal's bar is high — applications need verifiable impact signals, specific MENA connection, and a genuinely unique story. Keep building and reapply in 90 days.`
  }

  return { score, status, reasoning, checklist }
}

async function sendApplicationEmail(email: string, name: string, status: string, reasoning: string, score: number) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) return

  const subjects: Record<string, string> = {
    passed: "Your Tribunal application is through.",
    conditional: "Your Tribunal application — one more step.",
    not_yet: "Your Tribunal application — keep building.",
  }

  const bodies: Record<string, string> = {
    passed: `Hi ${name},\n\nYou've passed our AI review (score: ${score}/100).\n\nOur editorial team will review your application within 48 hours. You'll receive the final decision and your onboarding kit if approved.\n\nThe Tribunal, by The Middle East Hustle`,
    conditional: `Hi ${name},\n\nYour profile shows real promise (score: ${score}/100).\n\n${reasoning}\n\nResubmit in 30 days with more specific outcomes.\n\nThe Tribunal, by The Middle East Hustle`,
    not_yet: `Hi ${name},\n\nThe Tribunal's bar is high because our audience is discerning (score: ${score}/100).\n\n${reasoning}\n\nYou're on our Rising Voices watchlist. Reapply in 90 days. In the meantime — go vote on something.\n\nthemiddleeasthustle.com\n\nThe Tribunal, by The Middle East Hustle`,
  }

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "The Tribunal <noreply@themiddleeasthustle.com>",
        to: email,
        subject: subjects[status] ?? "Your Tribunal Application",
        text: bodies[status] ?? `Thank you for applying, ${name}. We'll be in touch.`,
      }),
    })
    console.log(`[APPLY] Resend email sent to ${email.substring(0, 3)}*** (${status})`)
  } catch (err) {
    console.error("[APPLY] Resend email failed:", err)
  }
}

router.post("/apply", async (req, res) => {
  const { name, email, title, company, bio, linkedin, quote, impact, city, country, sector, wantsMajlis } = req.body

  if (!name || !email || !title || !company || !bio || !linkedin) {
    return res.status(400).json({ error: "Missing required fields" })
  }

  const aiResult = scoreApplication({ name, email, title, company, bio, linkedin, quote, impact, city, country })

  let refNumber = `TMH-${Date.now()}`

  try {
    const [inserted] = await db.insert(hustlerApplicationsTable).values({
      name,
      email: email.toLowerCase().trim(),
      title,
      company,
      city: city ?? null,
      country: country ?? null,
      sector: sector ?? null,
      bio,
      linkedin,
      quote: quote ?? null,
      impact: impact ?? null,
      wantsMajlis: !!wantsMajlis,
      aiScore: aiResult.score,
      aiStatus: aiResult.status,
      aiReasoning: aiResult.reasoning,
      aiChecklist: aiResult.checklist,
    }).returning()
    refNumber = `TMH-${inserted.id || Date.now()}`
    console.log(`[APPLY] Stored application: ${name.substring(0, 2)}*** <${email.substring(0, 3)}***> | Score: ${aiResult.score} | Status: ${aiResult.status} | Ref: ${refNumber}`)
  } catch (err) {
    console.error("[APPLY] DB save failed:", (err as Error).message)
    return res.status(500).json({ success: false, error: "Failed to submit application. Please try again." })
  }

  sendApplicationEmail(email, name, aiResult.status, aiResult.reasoning, aiResult.score).catch(() => {})

  return res.json({
    success: true,
    referenceNumber: refNumber,
    message: "Application received. We'll review it and get back to you within 48 hours.",
  })
})

export default router
