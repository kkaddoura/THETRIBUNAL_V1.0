import { useI18n } from "@/lib/i18n"

const ETHOS_PARAGRAPHS = [
  "The Tribunal exists because the Middle East and North Africa is the most opinionated, least surveyed region on earth. There are 541 million people here - builders, dreamers, troublemakers - and no one has ever given them a single platform to say what they really think.",
  "We are not a news outlet. We are not a think tank. We do not do sponsored polls or PR research. Every question on this platform is designed to surface the truth - not a narrative.",
  "We believe that anonymous, honest data from real people is more valuable than any op-ed, any government report, any think-tank white paper. We believe the region knows itself better than anyone watching from the outside.",
  "The questions are provocative because the region deserves provocative questions. The data is honest because anything less is a waste of everyone's time.",
]

const ETHOS_CLOSING = "This is MENA's living dataset - and it grows with every vote."

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
        .tmh-ethos-copy {
          color: rgba(245, 240, 235, 0.62);
          font-family: 'DM Sans', sans-serif;
          font-size: clamp(0.94rem, 1.05vw, 1.06rem);
          line-height: 1.68;
          letter-spacing: 0;
          max-width: 60rem;
        }
        .tmh-ethos-copy p {
          margin: 0 0 clamp(1rem, 1.8vw, 1.35rem);
        }
        .tmh-ethos-rail {
          position: absolute;
          top: clamp(2.75rem, 5vw, 4.25rem);
          bottom: clamp(2.75rem, 5vw, 4.25rem);
          right: clamp(1.25rem, 4vw, 2rem);
          width: 2px;
          border-radius: 999px;
          background: linear-gradient(180deg, transparent, rgba(245,240,235,0.14), transparent);
        }
        @media (max-width: 768px) {
          .tmh-ethos-copy {
            font-size: clamp(0.9rem, 3.8vw, 1rem);
            line-height: 1.65;
          }
          .tmh-ethos-rail { display: none; }
        }
      `}</style>

      <div
        style={{
          maxWidth: "86rem",
          margin: "0 auto",
          padding: "clamp(2.5rem, 4.5vw, 3.5rem) clamp(1.25rem, 5vw, 3rem)",
          position: "relative",
        }}
      >
        <div className="tmh-ethos-rail" aria-hidden="true" />

        <p
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: "clamp(0.75rem, 1vw, 0.86rem)",
            textTransform: "uppercase",
            letterSpacing: "0.3em",
            color: CRIMSON,
            margin: "0 0 clamp(1.25rem, 2vw, 1.75rem)",
          }}
        >
          {t("Our Ethos")}
        </p>

        <div className="tmh-ethos-copy">
          {ETHOS_PARAGRAPHS.map((paragraph) => (
            <p key={paragraph}>{t(paragraph)}</p>
          ))}
          <p
            style={{
              color: CREAM,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900,
              fontSize: "clamp(1rem, 1.35vw, 1.2rem)",
              lineHeight: 1.3,
              letterSpacing: "0.02em",
              textTransform: "none",
              marginBottom: 0,
            }}
          >
            {t(ETHOS_CLOSING)}
          </p>
        </div>
      </div>
    </section>
  )
}
