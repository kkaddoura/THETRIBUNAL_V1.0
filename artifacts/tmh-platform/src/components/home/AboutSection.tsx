import { useI18n } from "@/lib/i18n"

const PRINCIPLES = [
  { title: "Private votes. Public results", body: "Your name and email are not shown with your vote." },
  { title: "Human reviewed questions", body: "Questions are curated before they go live." },
  { title: "No manufactured consensus", body: "No bots. No sponsored sentiment. No fake activity." },
  { title: "Not scientific polling", body: "Results are opinion signals from people who choose to participate." },
  { title: "Save your own record", body: "If you sign up, you can view your previous activity and return to it later." },
  { title: "The sharper the question, the clearer the signal", body: "Soft questions produce soft answers." },
]

const CREAM = "#F5F0EB"
const CRIMSON = "#DC143C"

export default function AboutSection() {
  const { t } = useI18n()

  return (
    <section
      style={{
        background: "#0A0A0A",
        borderTop: "1px solid rgba(245,240,235,0.08)",
        borderBottom: "1px solid rgba(245,240,235,0.08)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${CRIMSON}, transparent)`,
        }}
      />

      <style>{`
        .tmh-deck {
          position: relative;
          max-width: 46rem;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: clamp(0.6rem, 1.6vw, 0.9rem);
        }
        .tmh-card {
          display: grid;
          grid-template-columns: clamp(2.6rem, 8vw, 3.75rem) 1fr;
          gap: clamp(0.85rem, 3vw, 1.75rem);
          align-items: start;
          width: 100%;
          text-align: left;
          background: linear-gradient(180deg, #1c1c1c, #141414);
          border: 1px solid rgba(245,240,235,0.14);
          border-left: 3px solid #DC143C;
          border-radius: 12px;
          padding: clamp(1rem, 2.6vw, 1.5rem) clamp(1rem, 3vw, 1.75rem);
          color: inherit;
          box-shadow: 0 16px 40px -28px rgba(0,0,0,0.9);
        }
        .tmh-card .tmh-body { display: block; }
      `}</style>

      <div
        style={{
          maxWidth: "64rem",
          margin: "0 auto",
          padding: "clamp(3rem, 7vw, 5.5rem) clamp(1.25rem, 5vw, 3rem)",
        }}
      >
        {/* ── Section header with rules ──────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "clamp(0.75rem, 2.5vw, 1.5rem)",
            marginBottom: "clamp(1.25rem, 3vw, 2rem)",
          }}
        >
          <span style={{ flex: 1, height: 1, background: "rgba(245,240,235,0.18)" }} />
          <p
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900,
              fontSize: "clamp(1.05rem, 2.4vw, 1.45rem)",
              textTransform: "uppercase",
              letterSpacing: "0.32em",
              color: CRIMSON,
              margin: 0,
              whiteSpace: "nowrap",
            }}
          >
            {t("How We Keep It Honest")}
          </p>
          <span style={{ flex: 1, height: 1, background: "rgba(245,240,235,0.18)" }} />
        </div>

        {/* ── Principle cards — all text always visible (mobile-safe) ── */}
        <div className="tmh-deck">
          {PRINCIPLES.map((item, idx) => {
            return (
              <div key={idx} className="tmh-card">
                <span
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 900,
                    fontSize: "clamp(1.9rem, 5.5vw, 2.9rem)",
                    lineHeight: 0.85,
                    color: CRIMSON,
                    letterSpacing: "-0.02em",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span style={{ display: "block", minWidth: 0 }}>
                  <span
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 800,
                      fontSize: "clamp(1rem, 2.5vw, 1.35rem)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      color: CREAM,
                      display: "block",
                      lineHeight: 1.15,
                    }}
                  >
                    {t(item.title)}
                    <span style={{ color: CRIMSON }}>.</span>
                  </span>
                  <span
                    className="tmh-body"
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "clamp(0.95rem, 1.7vw, 1.1rem)",
                      color: "rgba(245,240,235,0.6)",
                      lineHeight: 1.55,
                      display: "block",
                    }}
                  >
                    {t(item.body)}
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
