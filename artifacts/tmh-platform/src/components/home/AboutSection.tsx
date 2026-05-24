import { useState } from "react"
import { useI18n } from "@/lib/i18n"

const PRINCIPLES = [
  { title: "Ask directly", body: "Soft questions produce soft answers." },
  { title: "Do not answer for people", body: "The Tribunal asks the question. People decide the result." },
  { title: "Keep votes private", body: "Your name is not shown with your vote." },
  { title: "Show the result publicly", body: "The value is in the aggregate." },
  { title: "Let people save their own record", body: "If someone signs up, they can view their previous activity and return to it later." },
  { title: "Count people, not noise", body: "No bots. No sponsored sentiment. No manufactured consensus." },
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
        .tmh-deck { position: relative; max-width: 46rem; margin: 0 auto; --card-h: clamp(8.25rem, 16vw, 9.25rem); }
        .tmh-card {
          position: relative;
          display: grid;
          grid-template-columns: clamp(2.6rem, 8vw, 3.75rem) 1fr;
          gap: clamp(0.85rem, 3vw, 1.75rem);
          align-content: start;
          align-items: start;
          width: 100%;
          height: var(--card-h);
          text-align: left;
          background: #131313;
          border: 1px solid rgba(245,240,235,0.10);
          border-left: 3px solid rgba(220,20,60,0.35);
          border-radius: 12px;
          padding: clamp(0.9rem, 2.4vw, 1.4rem) clamp(1rem, 3vw, 1.75rem);
          margin-top: calc(var(--card-h) * -0.28);
          cursor: pointer;
          color: inherit;
          font: inherit;
          overflow: hidden;
          box-shadow: 0 -8px 24px -16px rgba(0,0,0,0.85);
          transition: transform 360ms cubic-bezier(.22,1,.36,1),
                      box-shadow 360ms ease,
                      border-color 240ms ease,
                      background 240ms ease;
          transform: translateY(0) scale(1);
        }
        .tmh-card:first-child { margin-top: 0; }
        .tmh-card:focus-visible { outline: 2px solid #DC143C; outline-offset: 3px; }
        .tmh-card .tmh-body {
          opacity: 0;
          transform: translateY(5px);
          transition: opacity 320ms ease 40ms, transform 320ms cubic-bezier(.22,1,.36,1) 40ms;
        }
        .tmh-card[data-active="true"] {
          background: linear-gradient(180deg, #1c1c1c, #141414);
          border-color: rgba(245,240,235,0.20);
          border-left-color: #DC143C;
          transform: translateY(-6px) scale(1.012);
          box-shadow: 0 28px 56px -26px rgba(0,0,0,0.95), 0 0 0 1px rgba(220,20,60,0.12);
          z-index: 10;
        }
        .tmh-card[data-active="true"] .tmh-body { opacity: 1; transform: translateY(0); }
        @media (hover: none) { .tmh-deck { --card-h: clamp(9rem, 34vw, 11rem); } }
        @media (prefers-reduced-motion: reduce) { .tmh-card, .tmh-card .tmh-body { transition: none; } }
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
              {t("People do not lack opinions. They lack a place to say them honestly.")}
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
