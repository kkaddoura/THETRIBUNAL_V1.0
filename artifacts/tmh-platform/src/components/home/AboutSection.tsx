import { useI18n } from "@/lib/i18n"

const PRINCIPLES = [
  { title: "A Social Experiment", body: "Every question is a controlled provocation. The point is honesty." },
  { title: "No Editorial Agenda", body: "We write the questions. We never write the answers." },
  { title: "Private Opinions, Public Data", body: "Your vote is anonymous. The aggregate is not. That gap is the truth." },
  { title: "The Questions No One Asks", body: "Not because they're dangerous. Because nobody built the room yet." },
  { title: "Youngest Region on Earth", body: "60% of MENA is under 30. That's 541 million opinions waiting to be heard." },
  { title: "Real People Only", body: "No bots. No sponsored opinions. Just the region, speaking for itself." },
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
      {/* top hairline accent */}
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
        .tmh-principle {
          border-top: 1px solid rgba(245,240,235,0.10);
          display: grid;
          grid-template-columns: clamp(3rem, 9vw, 5.25rem) 1fr;
          gap: clamp(1rem, 3vw, 2.25rem);
          align-items: baseline;
          padding: clamp(1.05rem, 2.6vw, 1.7rem) 0;
          position: relative;
          transition: background 180ms ease;
        }
        .tmh-principle::before {
          content: "";
          position: absolute;
          left: 0;
          top: -1px;
          bottom: 0;
          width: 2px;
          background: ${CRIMSON};
          transform: scaleY(0);
          transform-origin: top;
          transition: transform 220ms ease;
        }
        .tmh-principle:hover {
          background: linear-gradient(90deg, rgba(220,20,60,0.06), transparent 60%);
        }
        .tmh-principle:hover::before { transform: scaleY(1); }
        .tmh-principle:last-child { border-bottom: 1px solid rgba(245,240,235,0.10); }
      `}</style>

      <div
        style={{
          maxWidth: "64rem",
          margin: "0 auto",
          padding: "clamp(3rem, 7vw, 5.5rem) clamp(1.25rem, 5vw, 3rem)",
        }}
      >
        {/* ── Founder banner ─────────────────────────────────────────── */}
        <div
          style={{
            borderBottom: "1px solid rgba(245,240,235,0.12)",
            paddingBottom: "clamp(2.25rem, 5vw, 3.5rem)",
            marginBottom: "clamp(2.5rem, 5vw, 4rem)",
          }}
        >
          <p
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 800,
              fontSize: "0.85rem",
              textTransform: "uppercase",
              letterSpacing: "0.34em",
              color: CRIMSON,
              marginBottom: "1.25rem",
            }}
          >
            {t("Founder's Note")}
          </p>

          <div style={{ position: "relative", paddingLeft: "clamp(1.25rem, 4vw, 2.75rem)" }}>
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "-0.35rem",
                top: "-1.5rem",
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(4rem, 11vw, 7rem)",
                lineHeight: 1,
                color: "rgba(220,20,60,0.28)",
                pointerEvents: "none",
                userSelect: "none",
              }}
            >
              &ldquo;
            </span>
            <blockquote
              style={{
                margin: 0,
                fontFamily: "'Playfair Display', serif",
                fontStyle: "italic",
                fontWeight: 600,
                fontSize: "clamp(1.6rem, 4.2vw, 2.7rem)",
                lineHeight: 1.2,
                color: CREAM,
                letterSpacing: "-0.01em",
              }}
            >
              {t("Bringing the voices of the Middle East into one room. Finally.")}
            </blockquote>
            <p
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: "0.95rem",
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                color: "rgba(245,240,235,0.55)",
                marginTop: "1.5rem",
              }}
            >
              {t("— Kareem Kaddoura, Founder")}
            </p>
          </div>
        </div>

        {/* ── Section header with rules ──────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "clamp(0.75rem, 2.5vw, 1.5rem)",
            marginBottom: "clamp(0.5rem, 2vw, 1rem)",
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
            {t("What We Stand For")}
          </p>
          <span style={{ flex: 1, height: 1, background: "rgba(245,240,235,0.18)" }} />
        </div>

        {/* ── 6 principles — single airy column, big numerals ────────── */}
        <div>
          {PRINCIPLES.map((item, idx) => (
            <div key={idx} className="tmh-principle">
              <span
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 900,
                  fontSize: "clamp(2.4rem, 7vw, 4rem)",
                  lineHeight: 0.85,
                  color: CRIMSON,
                  letterSpacing: "-0.02em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {String(idx + 1).padStart(2, "0")}
              </span>
              <div>
                <h3
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 800,
                    fontSize: "clamp(1.05rem, 2.6vw, 1.45rem)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    color: CREAM,
                    margin: "0 0 0.4rem",
                    lineHeight: 1.1,
                  }}
                >
                  {t(item.title)}
                  <span style={{ color: CRIMSON }}>.</span>
                </h3>
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "clamp(0.95rem, 1.7vw, 1.1rem)",
                    color: "rgba(245,240,235,0.6)",
                    lineHeight: 1.55,
                    margin: 0,
                    maxWidth: "44rem",
                  }}
                >
                  {t(item.body)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
