import { useEffect, useRef, useState } from "react";
import createGlobe from "cobe";

// ── Cities ───────────────────────────────────────────────────────────────────

interface City {
  id: string;
  ll: [number, number];
  name: string;
  country: string;
  flag: string;
  mena?: boolean;
}

const CITIES: City[] = [
  // MENA hubs (larger markers, halo)
  { id: "cairo",     ll: [30.04,  31.23], name: "Cairo",       country: "Egypt",     flag: "🇪🇬", mena: true },
  { id: "dubai",     ll: [25.20,  55.27], name: "Dubai",       country: "UAE",       flag: "🇦🇪", mena: true },
  { id: "riyadh",    ll: [24.71,  46.68], name: "Riyadh",      country: "KSA",       flag: "🇸🇦", mena: true },
  { id: "istanbul",  ll: [41.01,  28.98], name: "Istanbul",    country: "Türkiye",   flag: "🇹🇷", mena: true },
  { id: "beirut",    ll: [33.89,  35.50], name: "Beirut",      country: "Lebanon",   flag: "🇱🇧", mena: true },
  { id: "amman",     ll: [31.95,  35.93], name: "Amman",       country: "Jordan",    flag: "🇯🇴", mena: true },
  { id: "doha",      ll: [25.29,  51.53], name: "Doha",        country: "Qatar",     flag: "🇶🇦", mena: true },
  { id: "tehran",    ll: [35.69,  51.39], name: "Tehran",      country: "Iran",      flag: "🇮🇷", mena: true },
  { id: "casa",      ll: [33.57,  -7.59], name: "Casablanca",  country: "Morocco",   flag: "🇲🇦", mena: true },
  { id: "tunis",     ll: [36.80,  10.18], name: "Tunis",       country: "Tunisia",   flag: "🇹🇳", mena: true },
  // Europe
  { id: "london",    ll: [51.51,  -0.13], name: "London",      country: "UK",        flag: "🇬🇧" },
  { id: "paris",     ll: [48.86,   2.35], name: "Paris",       country: "France",    flag: "🇫🇷" },
  { id: "berlin",    ll: [52.52,  13.41], name: "Berlin",      country: "Germany",   flag: "🇩🇪" },
  { id: "stockholm", ll: [59.33,  18.06], name: "Stockholm",   country: "Sweden",    flag: "🇸🇪" },
  // Americas
  { id: "ny",        ll: [40.71, -74.01], name: "New York",    country: "USA",       flag: "🇺🇸" },
  { id: "la",        ll: [34.05,-118.24], name: "Los Angeles", country: "USA",       flag: "🇺🇸" },
  { id: "toronto",   ll: [43.65, -79.38], name: "Toronto",     country: "Canada",    flag: "🇨🇦" },
  { id: "sao",       ll: [-23.55,-46.63], name: "São Paulo",   country: "Brazil",    flag: "🇧🇷" },
  // Asia-Pacific
  { id: "mumbai",    ll: [19.08,  72.88], name: "Mumbai",      country: "India",     flag: "🇮🇳" },
  { id: "singapore", ll: [1.35,  103.82], name: "Singapore",   country: "Singapore", flag: "🇸🇬" },
  { id: "tokyo",     ll: [35.68, 139.69], name: "Tokyo",       country: "Japan",     flag: "🇯🇵" },
  { id: "seoul",     ll: [37.57, 126.98], name: "Seoul",       country: "S. Korea",  flag: "🇰🇷" },
  { id: "sydney",    ll: [-33.87,151.21], name: "Sydney",      country: "Australia", flag: "🇦🇺" },
  { id: "jakarta",   ll: [-6.21, 106.85], name: "Jakarta",     country: "Indonesia", flag: "🇮🇩" },
  // Africa
  { id: "lagos",     ll: [6.52,    3.38], name: "Lagos",       country: "Nigeria",   flag: "🇳🇬" },
  { id: "nairobi",   ll: [-1.29,  36.82], name: "Nairobi",     country: "Kenya",     flag: "🇰🇪" },
  { id: "joburg",    ll: [-26.20, 28.04], name: "Johannesburg",country: "S. Africa", flag: "🇿🇦" },
];

const MENA_HUBS = CITIES.filter((c) => c.mena);
const GLOBAL = CITIES.filter((c) => !c.mena);

// TMH-authentic verbs/messages — matches debates/predictions/pulse vocab
const ACTIONS: Array<(name: string) => string> = [
  () => `voted on <span class="hg-verb">"Who owns MENA's AI future?"</span>`,
  () => `predicted <span class="hg-verb">Saudi IPO pipeline by 2027</span>`,
  () => `cast a vote on <span class="hg-verb">"Is Beirut finished as a cultural capital?"</span>`,
  () => `joined the debate <span class="hg-verb">"Gulf vs Levant tech supremacy"</span>`,
  () => `backed <span class="hg-verb">YES</span> on the Egypt pound recovery`,
  () => `disagreed with <span class="hg-verb">the majority on Dubai housing</span>`,
  () => `opened <span class="hg-verb">"Will MENA produce a trillion-dollar company?"</span>`,
  () => `called the <span class="hg-verb">next regional unicorn</span>`,
  () => `flipped their vote to <span class="hg-verb">NO</span> on Qatar's bid`,
  () => `voted on <span class="hg-verb">"Would you hire entirely remote-MENA?"</span>`,
  () => `predicted <span class="hg-verb">Iran's currency by Q3</span>`,
  () => `weighed in on <span class="hg-verb">Turkey's next pivot</span>`,
  () => `submitted a Pulse story on <span class="hg-verb">diaspora identity</span>`,
];

// ── Math helpers (lat/lon → 3D unit vector → screen) ─────────────────────────

function latLonToVec3(lat: number, lon: number): [number, number, number] {
  const latR = (lat * Math.PI) / 180;
  const lonR = (lon * Math.PI) / 180;
  const cosLat = Math.cos(latR);
  return [cosLat * Math.cos(lonR), Math.sin(latR), -cosLat * Math.sin(lonR)];
}

function slerpElev(
  p0: [number, number, number],
  p1: [number, number, number],
  t: number,
  elev: number,
): [number, number, number] {
  const dot = Math.min(1, Math.max(-1, p0[0]*p1[0]+p0[1]*p1[1]+p0[2]*p1[2]));
  const angle = Math.acos(dot);
  if (angle < 1e-6) return p0;
  const sinA = Math.sin(angle);
  const w0 = Math.sin((1-t)*angle)/sinA, w1 = Math.sin(t*angle)/sinA;
  const r = 1 + elev * Math.sin(Math.PI * t);
  return [
    (w0*p0[0] + w1*p1[0]) * r,
    (w0*p0[1] + w1*p1[1]) * r,
    (w0*p0[2] + w1*p1[2]) * r,
  ];
}

function projectPoint(
  p: [number, number, number],
  phi: number,
  theta: number,
  cssW: number,
) {
  const [px, py, pz] = p;
  const cp = Math.cos(phi), sp = Math.sin(phi);
  const ct = Math.cos(theta), st = Math.sin(theta);
  const qx =  cp*px               + sp*pz;
  const qy =  sp*st*px + ct*py    - cp*st*pz;
  const qz = -sp*ct*px + st*py    + cp*ct*pz;
  const elev = Math.sqrt(px*px + py*py + pz*pz) || 1;
  const scale = 0.8 / elev;
  return {
    x: (qx * scale + 1) / 2 * cssW,
    y: (-qy * scale + 1) / 2 * cssW,
    visible: qz > 0,
    z: qz,
  };
}

// ── Component ────────────────────────────────────────────────────────────────

// Cards live in one of two fixed slots: "tr" (top-right) and "bl" (bottom-left).
// Each new spawn alternates slots, and any prior card in the target slot is
// faded out immediately. This guarantees the headline (TL) and live-status (BR)
// overlays are never obscured, and two cards never overlap.
type CardSlot = "tr" | "bl";

interface ActivityCard {
  id: number;
  city: string;
  country: string;
  flag: string;
  message: string; // HTML string with .hg-verb spans
  slot: CardSlot;
}

interface HeroGlobeProps {
  className?: string;
}

const PHI_CENTER = 3.5;        // MENA-centered baseline
const THETA_BASE = 0.28;
const OSC_AMPLITUDE = 0.35;     // ±0.35 rad lateral swing
const OSC_RATE = 0.06;          // ~17s full oscillation period (slow drift)
const ARC_SPAWN_MS = 1800;      // new activity every 1.8s
const CARD_TTL_MS = 3200;       // card on-screen lifetime
const CARD_FADE_MS = 500;       // card fade-out duration

export function HeroGlobe({ className = "" }: HeroGlobeProps) {
  const wrapRef    = useRef<HTMLDivElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);

  // Animation state held in refs (no re-render churn)
  const arcsRef = useRef<Array<{
    from: [number, number, number];
    to:   [number, number, number];
    t: number;
    steps: number;
  }>>([]);
  const ripplesRef = useRef<Array<{
    pos: [number, number, number];
    r: number;
    a: number;
    kind: "ring" | "flash";
  }>>([]);
  const phiOffsetRef   = useRef(0);
  const thetaOffsetRef = useRef(0);
  const dragRef        = useRef({ phi: 0, theta: 0 });
  const pointerRef     = useRef<{ x: number; y: number } | null>(null);

  // Pause animation work when the globe is off-screen or tab is hidden.
  // Without this, the overlay loop + arc spawner keep running and accumulate
  // queued state that all flushes when the user scrolls/switches back.
  const inViewRef   = useRef(true);
  const visibleRef  = useRef(typeof document !== "undefined" ? !document.hidden : true);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const io = new IntersectionObserver(
      ([entry]) => { inViewRef.current = entry.isIntersecting; },
      { threshold: 0.05 },
    );
    io.observe(wrap);
    const onVis = () => { visibleRef.current = !document.hidden; };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // Reactive state for overlay UI
  const [currentCity, setCurrentCity] = useState<string>("Cairo");
  // Activity card state retained so the spawner timers keep their existing shape,
  // but cards are no longer rendered. Restore the card layer when real-time
  // activity is wired up. See render block below.
  const [, setCards]             = useState<ActivityCard[]>([]);
  const [, setExitingCardIds] = useState<Set<number>>(new Set());

  // Dark mode — ref drives the cobe render loop (no globe recreation on flip);
  // state drives the React/CSS-rendered overlays (cards, headlines, brackets).
  const isDarkRef = useRef(
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false,
  );
  const [isDark, setIsDark] = useState<boolean>(isDarkRef.current);
  useEffect(() => {
    const sync = () => {
      const dk = document.documentElement.classList.contains("dark");
      isDarkRef.current = dk;
      setIsDark(dk);
    };
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributeFilter: ["class"] });
    sync();
    return () => obs.disconnect();
  }, []);

  // ── Globe + overlay canvas: setup once ──────────────────────────────────────
  useEffect(() => {
    const wrap    = wrapRef.current;
    const canvas  = canvasRef.current;
    const overlay = overlayRef.current;
    if (!wrap || !canvas || !overlay) return;

    // Lighter render path on small screens: lower dpr cap, fewer mapSamples,
    // and (in the spawner effect) fewer in-flight arcs at a slower cadence.
    const isMobile =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 640px)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 2);
    let width = 0;
    let phi   = PHI_CENTER;
    const theta = THETA_BASE;
    // Active-only animation clock: advances only while in view + tab visible,
    // so re-entering doesn't fast-forward the oscillation.
    let activeT = 0;
    let lastFrame = performance.now();

    const onResize = () => {
      width = wrap.offsetWidth || wrap.getBoundingClientRect().width || 600;
      overlay.width  = Math.round(width * dpr);
      overlay.height = Math.round(width * dpr);
      overlay.style.width  = `${width}px`;
      overlay.style.height = `${width}px`;
    };
    window.addEventListener("resize", onResize);
    onResize();
    requestAnimationFrame(onResize); // settle after layout

    const ctx = overlay.getContext("2d");

    // Pre-seed a single in-flight arc so the globe isn't visually empty on mount;
    // the rest spawn at the steady-state cadence below.
    {
      const g = GLOBAL[Math.floor(Math.random() * GLOBAL.length)];
      const m = MENA_HUBS[Math.floor(Math.random() * MENA_HUBS.length)];
      arcsRef.current.push({
        from: latLonToVec3(g.ll[0], g.ll[1]),
        to:   latLonToVec3(m.ll[0], m.ll[1]),
        t:    Math.random() * 0.6,
        steps: 54,
      });
    }

    function drawOverlay(curPhi: number, curTheta: number) {
      if (!ctx || width === 0) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, width);

      // Theme-aware overlay colors. In dark mode the leading dot/halo flash is
      // bright white over a near-black globe; in light mode the globe is cream
      // with dark map dots, so we keep the trail pure crimson and use a soft
      // cream highlight for the leading dot.
      const dark = isDarkRef.current;
      const headRGB         = dark ? [255, 255, 255] : [255, 240, 230]; // arc head color
      const leadCore        = dark ? "#FFFFFF"        : "#FFE9D8";
      const flashGrad0      = dark ? "rgba(255,255,255," : "rgba(255,235,220,";
      const flashGrad1      = dark ? "rgba(255,210,215," : "rgba(255,200,180,";
      const nonMenaDotFill  = dark ? "rgba(240,235,229,0.7)" : "rgba(20,20,20,0.55)";
      const labelFill       = dark ? "#E8E2D7"            : "#111111";
      const labelBg         = dark ? "rgba(12,12,12,0.88)" : "rgba(255,253,249,0.94)";
      const labelBorder     = dark ? "rgba(220,20,60,0.4)" : "rgba(220,20,60,0.32)";

      // ── Arcs ──
      const arcs = arcsRef.current;
      for (let i = arcs.length - 1; i >= 0; i--) {
        const arc = arcs[i];
        arc.t += 0.012;
        if (arc.t >= 1.05) {
          ripplesRef.current.push({ pos: arc.to, r: 0,  a: 1.0, kind: "flash" });
          ripplesRef.current.push({ pos: arc.to, r: 2,  a: 0.85, kind: "ring"  });
          arcs.splice(i, 1);
          continue;
        }
        const head = Math.min(1, arc.t);
        const tail = Math.max(0, arc.t - 0.55);
        const steps = arc.steps;
        const pts: Array<{ x: number; y: number; visible: boolean; z: number } | null> = [];
        for (let s = 0; s <= steps; s++) {
          const u = s / steps;
          if (u < tail || u > head) { pts.push(null); continue; }
          pts.push(projectPoint(slerpElev(arc.from, arc.to, u, 0.35), curPhi, curTheta, width));
        }

        ctx.lineCap = "round"; ctx.lineJoin = "round";
        for (let s = 0; s < steps; s++) {
          const a = pts[s], b = pts[s+1];
          if (!a || !b || !a.visible || !b.visible) continue;
          const u = (s + 0.5) / steps;
          const k = Math.min(1, Math.max(0, (u - tail) / Math.max(0.001, head - tail)));
          const w = Math.pow(k, 1.6);
          // Crimson base (220,20,60) → warm head (theme-dependent)
          const r  = Math.round(220 + (headRGB[0] - 220) * w);
          const g  = Math.round(20  + (headRGB[1] - 20)  * w);
          const bl = Math.round(60  + (headRGB[2] - 60)  * w);
          const alpha = 0.25 + 0.75 * k;
          ctx.strokeStyle = `rgba(${r},${g},${bl},${alpha})`;
          ctx.lineWidth = 0.7 + 1.1 * k;
          // Subtle warm shadow halo around the moving head
          ctx.shadowColor = `rgba(255,${Math.round(120+135*(1-w))},${Math.round(140+115*(1-w))},${(dark ? 0.35 : 0.18)+(dark ? 0.45 : 0.30)*k})`;
          ctx.shadowBlur = 6 + 6 * k;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
        ctx.shadowBlur = 0;

        // Leading dot — bright core, crimson halo
        const leadIdx = Math.min(steps, Math.floor(head * steps));
        const lead = pts[leadIdx];
        if (lead && lead.visible) {
          const grad = ctx.createRadialGradient(lead.x, lead.y, 0, lead.x, lead.y, 14);
          grad.addColorStop(0,    `rgba(${headRGB[0]},${headRGB[1]},${headRGB[2]},1)`);
          grad.addColorStop(0.35, `rgba(${headRGB[0]},${Math.min(255, headRGB[1]+40)},${Math.min(255, headRGB[2]+40)},0.7)`);
          grad.addColorStop(1,    "rgba(220,20,60,0)");
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(lead.x, lead.y, 14, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = leadCore;
          ctx.beginPath(); ctx.arc(lead.x, lead.y, 2.2, 0, Math.PI*2); ctx.fill();
        }
      }

      // ── Ripples ──
      const ripples = ripplesRef.current;
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        if (rp.kind === "flash") {
          rp.r += 1.1;
          rp.a -= 0.045;
          if (rp.a <= 0) { ripples.splice(i, 1); continue; }
          const p = projectPoint(rp.pos, curPhi, curTheta, width);
          if (!p.visible) continue;
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 18 + rp.r);
          grad.addColorStop(0,   `${flashGrad0}${rp.a})`);
          grad.addColorStop(0.4, `${flashGrad1}${rp.a*0.6})`);
          grad.addColorStop(1,   "rgba(220,20,60,0)");
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(p.x, p.y, 18 + rp.r, 0, Math.PI*2); ctx.fill();
          continue;
        }
        rp.r += 0.55;
        rp.a -= 0.013;
        if (rp.a <= 0) { ripples.splice(i, 1); continue; }
        const p = projectPoint(rp.pos, curPhi, curTheta, width);
        if (!p.visible) continue;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rp.r, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(220,20,60,${rp.a})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = `rgba(220,20,60,${Math.min(1, rp.a + 0.4)})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, Math.PI*2); ctx.fill();
      }

      // ── City dots ──
      // Pass 1: draw every visible dot. Collect MENA label candidates so we
      // can depth-sort them and (on mobile) cap + collision-skip pills, which
      // keeps the small panel from filling with overlapping name pills.
      type LabelCand = {
        name: string;
        x: number;
        y: number;
        z: number;
        r: number;
      };
      const menaLabelCands: LabelCand[] = [];

      CITIES.forEach((c) => {
        const v = latLonToVec3(c.ll[0], c.ll[1]);
        const p = projectPoint(v, curPhi, curTheta, width);
        if (!p.visible) return;
        const r = c.mena ? 2.8 : 1.8;
        if (c.mena) {
          ctx.beginPath(); ctx.arc(p.x, p.y, r+2, 0, Math.PI*2);
          ctx.strokeStyle = "rgba(220,20,60,0.45)"; ctx.lineWidth = 0.6;
          ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI*2);
        ctx.fillStyle = c.mena ? "#DC143C" : nonMenaDotFill;
        ctx.fill();

        if (c.mena && p.z > 0.3) {
          menaLabelCands.push({ name: c.name.toUpperCase(), x: p.x, y: p.y, z: p.z, r });
        }
      });

      // Pass 2: pill labels for MENA hubs. Front-most first; on mobile
      // cap to 4 and skip any that overlap a previously-placed pill.
      menaLabelCands.sort((a, b) => b.z - a.z);
      const labelFont   = isMobile ? "600 7px 'Barlow Condensed', sans-serif"
                                   : "600 8px 'Barlow Condensed', sans-serif";
      const labelPadX   = isMobile ? 3 : 4;
      const labelPillH  = isMobile ? 9 : 11;
      const labelMaxN   = isMobile ? 4 : menaLabelCands.length;
      const placed: Array<{ x: number; y: number; w: number; h: number }> = [];
      ctx.font = labelFont;

      for (let i = 0; i < menaLabelCands.length && placed.length < labelMaxN; i++) {
        const cand = menaLabelCands[i];
        const tw    = ctx.measureText(cand.name).width;
        const pillW = tw + labelPadX * 2;
        const lx    = cand.x - pillW / 2;
        const ly    = cand.y - cand.r - labelPillH - 3;

        // Skip if this pill would overlap any already-placed pill on mobile
        if (isMobile) {
          const overlaps = placed.some(
            (p) =>
              !(lx + pillW < p.x || p.x + p.w < lx ||
                ly + labelPillH < p.y || p.y + p.h < ly),
          );
          if (overlaps) continue;
        }

        ctx.fillStyle = labelBg;
        ctx.beginPath();
        ctx.roundRect(lx, ly, pillW, labelPillH, labelPillH / 2);
        ctx.fill();

        ctx.strokeStyle = labelBorder;
        ctx.lineWidth   = 0.5;
        ctx.stroke();

        ctx.fillStyle = labelFill;
        ctx.fillText(cand.name, lx + labelPadX, ly + labelPillH - 3);

        placed.push({ x: lx, y: ly, w: pillW, h: labelPillH });
      }
    }

    // Drag interaction — rotate globe with pointer
    const onPointerDown = (e: PointerEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY };
      wrap.style.cursor = "grabbing";
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!pointerRef.current) return;
      dragRef.current.phi   = (e.clientX - pointerRef.current.x) / 280;
      dragRef.current.theta = (e.clientY - pointerRef.current.y) / 900;
    };
    const onPointerUp = () => {
      if (pointerRef.current) {
        phiOffsetRef.current   += dragRef.current.phi;
        thetaOffsetRef.current += dragRef.current.theta;
        dragRef.current = { phi: 0, theta: 0 };
      }
      pointerRef.current = null;
      wrap.style.cursor = "grab";
    };
    wrap.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup",   onPointerUp,   { passive: true });
    wrap.style.cursor = "grab";

    const initDark = isDarkRef.current;
    const globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width:  width * dpr,
      height: width * dpr,
      phi,
      theta,
      dark:          initDark ? 1 : 0,
      diffuse:       initDark ? 1.8 : 3.0,
      mapSamples:    isMobile ? 12000 : 18000,
      mapBrightness: initDark ? 2.2 : 8,
      baseColor:     initDark ? [0.35, 0.35, 0.4] : [0.97, 0.95, 0.91],
      markerColor:   initDark ? [0.9, 0.24, 0.36] : [0.86, 0.08, 0.24],
      glowColor:     initDark ? [0.06, 0.04, 0.07] : [0.97, 0.95, 0.91],
      markers: CITIES.map((c) => ({ location: c.ll, size: c.mena ? 0.09 : 0.045 })),
      onRender: (state) => {
        const now = performance.now();
        const dt  = (now - lastFrame) / 1000;
        lastFrame = now;
        const isActive = inViewRef.current && visibleRef.current;
        if (!isActive) {
          // Hold the last frame: keep cobe painting current state (cheap GPU
          // pass, no flicker) but skip overlay work + arc.t advancement.
          state.width  = width * dpr;
          state.height = width * dpr;
          return;
        }
        activeT += dt;
        phi = PHI_CENTER + Math.sin(activeT * OSC_RATE) * OSC_AMPLITUDE;
        const curPhi   = phi   + phiOffsetRef.current   + dragRef.current.phi;
        const curTheta = theta + thetaOffsetRef.current + dragRef.current.theta;
        state.phi    = curPhi;
        state.theta  = curTheta;
        state.width  = width * dpr;
        state.height = width * dpr;
        // Live theme updates — no globe recreation needed
        const dk = isDarkRef.current;
        state.diffuse       = dk ? 1.8 : 3.0;
        state.mapBrightness = dk ? 2.2 : 8;
        state.baseColor     = dk ? [0.35, 0.35, 0.4] : [0.97, 0.95, 0.91];
        state.markerColor   = dk ? [0.9, 0.24, 0.36] : [0.86, 0.08, 0.24];
        state.glowColor     = dk ? [0.06, 0.04, 0.07] : [0.97, 0.95, 0.91];
        drawOverlay(curPhi, curTheta);
      },
    });

    canvas.style.opacity = "0";
    requestAnimationFrame(() => { canvas.style.opacity = "1"; });

    return () => {
      globe.destroy();
      window.removeEventListener("resize", onResize);
      wrap.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup",   onPointerUp);
    };
  }, []);

  // ── Activity spawner: arcs + cards + Right Now city sync ────────────────────
  useEffect(() => {
    const isMobile =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 640px)").matches;
    const spawnInterval = isMobile ? 2400 : ARC_SPAWN_MS;
    const arcCap = isMobile ? 14 : 26;
    let nextId = 1;
    let nextSlot: CardSlot = "tr"; // alternates per spawn
    const ttlTimers = new Map<number, number>();
    const fadeTimers = new Map<number, number>();

    const spawn = () => {
      const origin = GLOBAL[Math.floor(Math.random() * GLOBAL.length)];
      const dest   = MENA_HUBS[Math.floor(Math.random() * MENA_HUBS.length)];

      // Spawn arc: origin → MENA hub
      arcsRef.current.push({
        from:  latLonToVec3(origin.ll[0], origin.ll[1]),
        to:    latLonToVec3(dest.ll[0],   dest.ll[1]),
        t:     0,
        steps: 54,
      });
      if (arcsRef.current.length > arcCap) arcsRef.current.shift();

      // Update "Right Now" city headline
      setCurrentCity(origin.name);

      // Decide the slot, then immediately fade any prior card occupying it
      const targetSlot: CardSlot = nextSlot;
      nextSlot = nextSlot === "tr" ? "bl" : "tr";

      const id = nextId++;
      const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
      const card: ActivityCard = {
        id,
        city:    origin.name,
        country: origin.country,
        flag:    origin.flag,
        message: action(origin.name),
        slot:    targetSlot,
      };

      setCards((prev) => {
        // Force-fade any prior card in the target slot
        const occupying = prev.filter((c) => c.slot === targetSlot);
        if (occupying.length > 0) {
          setExitingCardIds((s) => {
            const n = new Set(s);
            for (const oc of occupying) {
              n.add(oc.id);
              // Cancel its scheduled lifecycle and schedule an immediate removal
              const tt = ttlTimers.get(oc.id);
              if (tt !== undefined) { window.clearTimeout(tt); ttlTimers.delete(oc.id); }
              const ft = fadeTimers.get(oc.id);
              if (ft !== undefined) { window.clearTimeout(ft); fadeTimers.delete(oc.id); }
              const removeTimer = window.setTimeout(() => {
                setCards((p) => p.filter((c) => c.id !== oc.id));
                setExitingCardIds((s2) => { const n2 = new Set(s2); n2.delete(oc.id); return n2; });
              }, CARD_FADE_MS);
              fadeTimers.set(oc.id, removeTimer);
            }
            return n;
          });
        }
        return [...prev, card];
      });

      // Schedule normal lifecycle for the new card
      const ttl = window.setTimeout(() => {
        ttlTimers.delete(id);
        setExitingCardIds((s) => { const n = new Set(s); n.add(id); return n; });
        const fade = window.setTimeout(() => {
          fadeTimers.delete(id);
          setCards((prev) => prev.filter((c) => c.id !== id));
          setExitingCardIds((s) => { const n = new Set(s); n.delete(id); return n; });
        }, CARD_FADE_MS);
        fadeTimers.set(id, fade);
      }, CARD_TTL_MS);
      ttlTimers.set(id, ttl);
    };

    // No quick primers — first card fires at the regular cadence so first
    // load matches the steady state instead of bursting.
    // Skip when the globe is off-screen or the tab is hidden, so we don't
    // accumulate arcs/cards that all flush when the user returns.
    const interval = window.setInterval(() => {
      if (!inViewRef.current) return;
      if (typeof document !== "undefined" && document.hidden) return;
      spawn();
    }, spawnInterval);

    return () => {
      window.clearInterval(interval);
      for (const t of ttlTimers.values())  window.clearTimeout(t);
      for (const t of fadeTimers.values()) window.clearTimeout(t);
    };
  }, []);

  // Slot positioning helper (currently unused while cards are hidden).
  // Kept here so re-enabling the activity layer doesn't require restoring it.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _slotClass = (slot: CardSlot) =>
    slot === "tr" ? "hg-card-tr" : "hg-card-bl";

  return (
    <div
      className={`hg-root relative aspect-square select-none overflow-hidden ${className}`}
      data-theme={isDark ? "dark" : "light"}
      style={{ touchAction: "none" }}
    >
      {/* Bentham corner brackets */}
      <span className="hg-bentham hg-bentham-tl" aria-hidden />
      <span className="hg-bentham hg-bentham-tr" aria-hidden />
      <span className="hg-bentham hg-bentham-bl" aria-hidden />
      <span className="hg-bentham hg-bentham-br" aria-hidden />

      {/* "Right Now" overlay (top-left) */}
      <div className="hg-tl">
        <div className="hg-tl-lbl">Right Now</div>
        <div className="hg-tl-val">
          <span key={currentCity} className="hg-tl-city">{currentCity}</span>
          <span className="hg-tl-period">.</span>
        </div>
      </div>

      {/* Live status (bottom-right) */}
      <div className="hg-br">
        <span className="hg-br-dot" aria-hidden />
        <span>Live activity map</span>
      </div>

      {/* Globe wrap (oversized + shifted so MENA fills the panel) */}
      <div ref={wrapRef} className="hg-globe-wrap">
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            opacity: 0,
            transition: "opacity 1.2s ease",
          }}
        />
        <canvas
          ref={overlayRef}
          style={{
            position: "absolute",
            inset: 0,
            width:  "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Activity cards intentionally hidden at launch — no fake live activity. */}
      {/* When real-time activity is wired up, restore the card layer here.    */}

      <style>{`
        /* ── Theme variables ──────────────────────────────────── */
        .hg-root[data-theme="dark"] {
          --hg-bg:
            radial-gradient(ellipse 70% 60% at 50% 50%, rgba(220,20,60,0.10) 0%, transparent 65%),
            radial-gradient(ellipse at 20% 20%, rgba(230,62,92,0.04) 0%, transparent 40%),
            linear-gradient(180deg, #0A0A0A 0%, #050505 100%);
          --hg-grain-blend: overlay;
          --hg-grain-opacity: 0.04;
          --hg-bentham-color: rgba(255,255,255,0.20);
          --hg-eyebrow: rgba(240,235,229,0.55);
          --hg-strong: #F0EBE5;
          --hg-status: rgba(240,235,229,0.65);
          --hg-card-bg: rgba(12,12,12,0.92);
          --hg-card-border: rgba(255,255,255,0.10);
          --hg-card-city: #F0EBE5;
          --hg-card-time: rgba(240,235,229,0.4);
          --hg-card-msg: rgba(240,235,229,0.88);
        }
        .hg-root[data-theme="light"] {
          --hg-bg:
            radial-gradient(ellipse 70% 55% at 50% 50%, rgba(220,20,60,0.06) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 20%, rgba(220,20,60,0.04) 0%, transparent 45%);
          --hg-grain-blend: multiply;
          --hg-grain-opacity: 0.025;
          --hg-bentham-color: rgba(20,20,20,0.22);
          --hg-eyebrow: rgba(20,20,20,0.55);
          --hg-strong: #1A1A1A;
          --hg-status: rgba(20,20,20,0.65);
          --hg-card-bg: rgba(255,253,249,0.95);
          --hg-card-border: rgba(20,20,20,0.10);
          --hg-card-city: #1A1A1A;
          --hg-card-time: rgba(20,20,20,0.45);
          --hg-card-msg: rgba(20,20,20,0.85);
        }

        .hg-root { background: var(--hg-bg); }
        .hg-root::after {
          content: ""; position: absolute; inset: 0;
          pointer-events: none; opacity: var(--hg-grain-opacity);
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
          mix-blend-mode: var(--hg-grain-blend); z-index: 30;
        }

        .hg-globe-wrap {
          position: absolute;
          width: 122%;
          aspect-ratio: 1 / 1;
          right: -11%;
          top: 50%;
          transform: translateY(-50%);
          z-index: 10;
        }

        .hg-bentham {
          position: absolute;
          width: 22px; height: 22px;
          border: 1px solid var(--hg-bentham-color);
          z-index: 20;
          pointer-events: none;
        }
        .hg-bentham-tl { top: 10px; left: 10px;    border-right: 0; border-bottom: 0; }
        .hg-bentham-tr { top: 10px; right: 10px;   border-left:  0; border-bottom: 0; }
        .hg-bentham-bl { bottom: 10px; left: 10px; border-right: 0; border-top:    0; }
        .hg-bentham-br { bottom: 10px; right: 10px;border-left:  0; border-top:    0; }

        .hg-tl {
          position: absolute;
          top: 26px; left: 26px;
          z-index: 22;
          opacity: 0;
          animation: hg-fade-up 900ms cubic-bezier(0.16, 1, 0.3, 1) 200ms forwards;
        }
        .hg-tl-lbl {
          font-family: var(--font-serif, 'Barlow Condensed', 'Arial Narrow', sans-serif);
          font-weight: 800;
          font-size: 10px;
          letter-spacing: 0.3em;
          color: var(--hg-eyebrow);
          text-transform: uppercase;
          margin-bottom: 6px;
          display: flex; align-items: center; gap: 8px;
        }
        .hg-tl-lbl::before {
          content: ""; width: 20px; height: 1px; background: currentColor;
        }
        .hg-tl-val {
          font-family: var(--font-serif, 'Barlow Condensed', 'Arial Narrow', sans-serif);
          font-weight: 900;
          font-size: clamp(28px, 4.5vw, 40px);
          line-height: 1;
          color: var(--hg-strong);
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
          letter-spacing: -0.01em;
        }
        .hg-tl-city {
          display: inline-block;
          animation: hg-city-flip 380ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .hg-tl-period { color: #DC143C; }

        .hg-br {
          position: absolute;
          bottom: 22px; right: 22px;
          z-index: 22;
          font-family: var(--font-serif, 'Barlow Condensed', 'Arial Narrow', sans-serif);
          font-weight: 800;
          font-size: 9.5px;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: var(--hg-status);
          display: flex; align-items: center; gap: 9px;
          opacity: 0;
          animation: hg-fade-up 900ms cubic-bezier(0.16, 1, 0.3, 1) 350ms forwards;
        }
        .hg-br-dot {
          width: 6px; height: 6px; border-radius: 999px; background: #DC143C;
          box-shadow: 0 0 0 0 rgba(220,20,60,0.5);
          animation: hg-pulse 1.6s ease-in-out infinite;
        }

        .hg-cards {
          position: absolute;
          inset: 0;
          z-index: 25;
          pointer-events: none;
        }
        .hg-card {
          position: absolute;
          background: var(--hg-card-bg);
          border: 1px solid var(--hg-card-border);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          padding: 9px 12px;
          width: clamp(168px, 44%, 220px);
          font-family: var(--font-sans, 'Inter', sans-serif);
          opacity: 0;
          transform: translateY(8px) scale(0.96);
          transition: opacity 500ms cubic-bezier(0.16, 1, 0.3, 1),
                      transform 500ms cubic-bezier(0.16, 1, 0.3, 1);
          pointer-events: none;
        }
        .hg-card-show { opacity: 1; transform: translateY(0) scale(1); }
        .hg-card-tr { top: 16%;    right: 5%; }
        .hg-card-bl { bottom: 16%; left:  5%; }
        .hg-card::before, .hg-card::after {
          content: ""; position: absolute; width: 6px; height: 6px;
          border: 1px solid #DC143C; opacity: 0.7;
        }
        .hg-card::before { top: -1px; right: -1px;  border-left: 0; border-bottom: 0; }
        .hg-card::after  { bottom: -1px; left: -1px;border-right: 0; border-top:    0; }
        .hg-card-row1 {
          display: flex; align-items: center; gap: 7px;
          margin-bottom: 4px;
        }
        .hg-card-flag { font-size: 14px; line-height: 1; }
        .hg-card-city {
          font-family: var(--font-serif, 'Barlow Condensed', 'Arial Narrow', sans-serif);
          font-weight: 800;
          font-size: 9px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--hg-card-city);
        }
        .hg-card-time {
          margin-left: auto;
          font-family: var(--font-serif, 'Barlow Condensed', 'Arial Narrow', sans-serif);
          font-weight: 700;
          font-size: 8px;
          letter-spacing: 0.15em;
          color: var(--hg-card-time);
          text-transform: uppercase;
        }
        .hg-card-msg {
          font-size: 11.5px;
          line-height: 1.35;
          color: var(--hg-card-msg);
        }
        .hg-verb { color: #DC143C; font-weight: 600; }

        @keyframes hg-fade-up {
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes hg-city-flip {
          0%   { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes hg-pulse {
          0%   { box-shadow: 0 0 0 0    rgba(220,20,60,0.55); }
          70%  { box-shadow: 0 0 0 10px rgba(220,20,60,0); }
          100% { box-shadow: 0 0 0 0    rgba(220,20,60,0); }
        }

        /* ── Mobile (≤640px) — fix overflow + leave room for the TL headline */
        @media (max-width: 640px) {
          /* Globe canvas sized to panel — no 122% overscale (perf + clipping) */
          .hg-globe-wrap { width: 100%; right: 0; }

          /* "Right Now: <city>." — allow wrap so long names don't bleed off */
          .hg-tl { top: 14px; left: 16px; right: 16px; }
          .hg-tl-lbl { font-size: 9px; letter-spacing: 0.24em; margin-bottom: 4px; }
          .hg-tl-val {
            font-size: clamp(20px, 7vw, 30px);
            white-space: normal;
            word-break: break-word;
            line-height: 1.02;
          }

          /* Live badge — keep it in the corner but smaller */
          .hg-br { bottom: 12px; right: 12px; font-size: 8.5px; letter-spacing: 0.24em; gap: 6px; }
          .hg-br-dot { width: 5px; height: 5px; }

          /* Bentham brackets — pull tighter so they don't crash with cards */
          .hg-bentham { width: 16px; height: 16px; }
          .hg-bentham-tl { top: 8px; left: 8px; }
          .hg-bentham-tr { top: 8px; right: 8px; }
          .hg-bentham-bl { bottom: 8px; left: 8px; }
          .hg-bentham-br { bottom: 8px; right: 8px; }

          /* Cards — narrower + repositioned so they sit clear of TL/BR overlays */
          .hg-card {
            width: clamp(140px, 56%, 180px);
            padding: 7px 9px;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
          }
          .hg-card-tr { top: 38%; right: 4%; }
          .hg-card-bl { bottom: 6%;  left: 4%; }
          .hg-card-row1 { gap: 5px; margin-bottom: 3px; }
          .hg-card-flag { font-size: 12px; }
          .hg-card-city { font-size: 8.5px; letter-spacing: 0.18em; }
          .hg-card-time { font-size: 7.5px; letter-spacing: 0.12em; }
          .hg-card-msg { font-size: 10.5px; line-height: 1.3; }
        }

        @media (prefers-reduced-motion: reduce) {
          .hg-card, .hg-tl-city, .hg-tl, .hg-br { animation: none !important; transition: none !important; }
        }
      `}</style>
    </div>
  );
}
