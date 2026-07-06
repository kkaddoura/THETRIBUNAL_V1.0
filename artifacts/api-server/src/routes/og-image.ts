import { Router } from "express"
import { loadFonts } from "../lib/og-fonts.js"
import { debateCard, predictionCard, pulseCard } from "../lib/og-card.js"
import { getBrandTokens } from "../lib/design-tokens-cache.js"

// Satori and resvg are ESM-only packages. The server builds to CJS via
// esbuild, so static `import satori from "satori"` breaks at runtime
// ("is not a function"). Dynamic import() works in CJS for ESM modules.
let _satori: ((element: any, options: any) => Promise<string>) | null = null
let _Resvg: (new (svg: string, options: any) => { render(): { asPng(): Uint8Array } }) | null = null

async function getSatori() {
  if (!_satori) {
    const mod = await import("satori")
    _satori = mod.default
  }
  return _satori!
}

async function getResvg() {
  if (!_Resvg) {
    const mod = await import("@resvg/resvg-js")
    _Resvg = mod.Resvg
  }
  return _Resvg!
}

const router = Router()
const INTERNAL_API_BASE =
  process.env.INTERNAL_API_URL ?? `http://127.0.0.1:${process.env.PORT ?? 8080}`

router.get("/og-image/:type/:id", async (req, res) => {
  try {
    const { type, id } = req.params
    const tokens = await getBrandTokens()
    const [satori, Resvg, fonts] = await Promise.all([
      getSatori(),
      getResvg(),
      loadFonts({ headingFamily: tokens.headingFont, bodyFamily: tokens.bodyFont }),
    ])

    let element: ReturnType<typeof debateCard>

    if (type === "debate" || type === "poll") {
      const pollRes = await fetch(`${INTERNAL_API_BASE}/api/polls/${id}`)
      if (!pollRes.ok) {
        res.status(404).send("Poll not found")
        return
      }
      const poll = (await pollRes.json()) as Record<string, any>

      element = debateCard(
        {
          question: poll.question ?? "Untitled debate",
          category: poll.category,
          totalVotes: poll.totalVotes ?? 0,
          options: (poll.options ?? []).map((o: Record<string, any>) => ({
            text: o.text ?? "",
            percentage: o.percentage ?? 0,
          })),
        },
        tokens,
      )
    } else if (type === "prediction") {
      const predRes = await fetch(`${INTERNAL_API_BASE}/api/predictions/${id}`)
      if (!predRes.ok) {
        res.status(404).send("Prediction not found")
        return
      }
      const pred = (await predRes.json()) as Record<string, any>

      element = predictionCard(
        {
          question: pred.question ?? "Untitled prediction",
          category: pred.category,
          totalVotes: pred.totalCount ?? 0,
          yesPercentage: pred.yesPercentage,
          noPercentage: pred.noPercentage,
          options: pred.options?.map((text: string) => ({
            text,
            percentage: pred.optionResults?.[text] ?? 0,
          })),
        },
        tokens,
      )
    } else if (type === "pulse") {
      element = pulseCard(
        {
          title: "MENA Pulse",
          stat: "",
          delta: "",
          deltaUp: true,
          category: "PULSE",
        },
        tokens,
      )
    } else {
      res.status(404).send("Unknown content type")
      return
    }

    const svg = await satori(element as any, {
      width: 1200,
      height: 630,
      fonts: fonts.map((f) => ({
        name: f.name,
        data: f.data,
        weight: f.weight as 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900,
        style: f.style,
      })),
    })

    const resvg = new Resvg(svg, {
      fitTo: { mode: "width" as const, value: 1200 },
    })
    const png = resvg.render().asPng()

    // Cache for 1 hour, stale-while-revalidate for 1 day
    res.setHeader("Content-Type", "image/png")
    res.setHeader(
      "Cache-Control",
      "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    )
    res.send(Buffer.from(png))
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[OG-IMAGE]", message)
    res.status(500).json({ error: "Failed to generate image", detail: message })
  }
})

export default router
