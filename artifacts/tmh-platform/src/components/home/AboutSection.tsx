import { useI18n } from "@/lib/i18n"

const PRINCIPLES = [
  { title: "A Social Experiment", body: "Every question is a controlled provocation. The point is honesty." },
  { title: "No Editorial Agenda", body: "We write the questions. We never write the answers." },
  { title: "Private Opinions, Public Data", body: "Your vote is anonymous. The aggregate is not. That gap is the truth." },
  { title: "The Questions No One Asks", body: "Not because they're dangerous. Because nobody built the room yet." },
  { title: "Youngest Region on Earth", body: "60% of MENA is under 30. That's 541 million opinions waiting to be heard." },
  { title: "Real People Only", body: "No bots. No sponsored opinions. Just the region, speaking for itself." },
]

export default function AboutSection() {
  const { t } = useI18n()

  return (
    <section style={{ background: "#0A0A0A", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ maxWidth: "80rem", margin: "0 auto", padding: "3rem 1.5rem" }}>

        {/* ── Top: What Is The Tribunal / What We Stand For ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "3rem 5rem", alignItems: "start" }}>

          {/* Left: mission statement */}
          <div>
            <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.28em", color: "#DC143C", marginBottom: "0.75rem" }}>
              {t("What Is The Tribunal?")}
            </p>
            <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "clamp(1.4rem, 2.5vw, 2rem)", textTransform: "uppercase", letterSpacing: "-0.01em", lineHeight: 1.1, color: "#F5F0EB", marginBottom: "1.25rem" }}>
              {t("MENA's first opinion intelligence platform.")}
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", lineHeight: 1.75, color: "rgba(245,240,235,0.7)", marginBottom: "1.75rem" }}>
              {t("Anonymous votes from across the globe on 19 MENA countries. Honest data from real people. No op-eds, no think tanks, no narrative — just what 541 million people actually think.")}
            </p>
            <blockquote style={{ borderLeft: "3px solid #DC143C", paddingLeft: "1.25rem", fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: "1rem", lineHeight: 1.65, color: "#F5F0EB", marginBottom: "0.85rem" }}>
              {t("\"Bringing the voices of the Middle East into one room. Finally.\"")}
            </blockquote>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.72rem", color: "rgba(245,240,235,0.45)", letterSpacing: "0.05em" }}>
              {t("— Kareem Kaddoura, Founder")}
            </p>
          </div>

          {/* Right: 6 principles */}
          <div>
            <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.28em", color: "#DC143C", marginBottom: "1rem" }}>
              {t("What We Stand For")}
            </p>
            <div>
              {PRINCIPLES.map((item, i) => (
                <div key={i} style={{ borderTop: "1px solid rgba(245,240,235,0.08)", padding: "0.9rem 0", display: "flex", gap: "0.85rem", alignItems: "flex-start" }}>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "0.65rem", color: "#DC143C", letterSpacing: "0.1em", flexShrink: 0, paddingTop: "0.15rem" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#F5F0EB", display: "block", marginBottom: "0.25rem" }}>
                      {t(item.title)}<span style={{ color: "#DC143C" }}>.</span>
                    </span>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", color: "rgba(245,240,235,0.5)", lineHeight: 1.55 }}>
                      {t(item.body)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>


      </div>
    </section>
  )
}
