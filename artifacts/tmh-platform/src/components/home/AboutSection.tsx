import { useState } from "react"
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
  // Top card open by default so the section reads on load (and for no-hover/touch).
  const [active, setActive] = useState(0)

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
        }
        .tmh-card {
          position: relative;
          display: grid;
          grid-template-columns: clamp(2.6rem, 8vw, 3.75rem) 1fr;
          gap: clamp(0.85rem, 3vw, 1.75rem);
          align-items: start;
          width: 100%;
          text-align: left;
          background: #121212;
          border: 1px solid rgba(245,240,235,0.10);
          border-left: 3px solid rgba(220,20,60,0.35);
          border-radius: 10px;
          padding: clamp(0.9rem, 2.4vw, 1.4rem) clamp(1rem, 3vw, 1.75rem);
          margin-top: -3.05rem;            /* tight overlap — only the header strip peeks */
          cursor: pointer;
          color: inherit;
          font: inherit;
          box-shadow: 0 -10px 30px -18px rgba(0,0,0,0.9);
          transition: margin 280ms cubic-bezier(.22,1,.36,1),
                      transform 280ms cubic-bezier(.22,1,.36,1),
                      border-color 200ms ease, box-shadow 280ms ease, background 200ms ease;
        }
        .tmh-card:first-child { margin-top: 0; }
        .tmh-card:focus-visible { outline: 2px solid ${CRIMSON}; outline-offset: 3px; }
        .tmh-card .tmh-body {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transition: max-height 320ms cubic-bezier(.22,1,.36,1), opacity 220ms ease, margin 280ms ease;
        }
        /* Active card lifts forward, fully opens, and stops overlapping the next one. */
        .tmh-card[data-active="true"] {
          background: linear-gradient(180deg, #1a1a1a, #131313);
          border-color: rgba(245,240,235,0.18);
          border-left-color: ${CRIMSON};
          transform: translateY(-2px);
          box-shadow: 0 24px 50px -24px rgba(0,0,0,0.95), 0 0 0 1px rgba(220,20,60,0.10);
          z-index: 5;
          margin-bottom: 0.6rem;
        }
        .tmh-card[data-active="true"] .tmh-body {
          max-height: 12rem;
          opacity: 1;
          margin-top: 0.45rem;
        }
        .tmh-card[data-active="true"] + .tmh-card { margin-top: 0.45rem; }
        @media (hover: none) {
          /* Touch: a touch more breathing room since there's no hover affordance. */
          .tmh-card { margin-top: -2.4rem; }
        }
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
            {t("What We Stand For")}
          </p>
          <span style={{ flex: 1, height: 1, background: "rgba(245,240,235,0.18)" }} />
        </div>

        {/* ── Overlapping card deck — hover/focus/tap to lift ────────── */}
        <div className="tmh-deck">
          {PRINCIPLES.map((item, idx) => {
            const isActive = active === idx
            return (
              <button
                key={idx}
                type="button"
                className="tmh-card"
                data-active={isActive}
                aria-expanded={isActive}
                onMouseEnter={() => setActive(idx)}
                onFocus={() => setActive(idx)}
                onClick={() => setActive(idx)}
                style={{ zIndex: isActive ? 5 : idx + 1 }}
              >
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
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
