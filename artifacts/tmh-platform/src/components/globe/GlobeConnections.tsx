import { useEffect, useRef, useState } from "react";
import createGlobe from "cobe";

// ── Data ─────────────────────────────────────────────────────────────────────

interface GlobeMarker {
  id: string;
  location: [number, number];
  label: string;
  isMena: boolean;
}

interface GlobeArc {
  id: string;
  from: [number, number];
  to: [number, number];
}

// 6 continents — the voice reaches everywhere
const MARKERS: GlobeMarker[] = [
  // MENA (larger dots)
  { id: "cairo",      location: [30.06,   31.25], label: "Cairo",      isMena: true  },
  { id: "dubai",      location: [25.25,   55.36], label: "Dubai",      isMena: true  },
  { id: "riyadh",     location: [24.69,   46.72], label: "Riyadh",     isMena: true  },
  { id: "istanbul",   location: [41.01,   28.95], label: "Istanbul",   isMena: true  },
  { id: "beirut",     location: [33.89,   35.50], label: "Beirut",     isMena: true  },
  { id: "tehran",     location: [35.69,   51.39], label: "Tehran",     isMena: true  },
  { id: "amman",      location: [31.95,   35.93], label: "Amman",      isMena: true  },
  { id: "doha",       location: [25.29,   51.53], label: "Doha",       isMena: true  },
  // Europe
  { id: "london",     location: [51.51,   -0.13], label: "London",     isMena: false },
  { id: "paris",      location: [48.86,    2.35], label: "Paris",      isMena: false },
  { id: "berlin",     location: [52.52,   13.41], label: "Berlin",     isMena: false },
  // Americas
  { id: "newyork",    location: [40.71,  -74.01], label: "New York",   isMena: false },
  { id: "losangeles", location: [34.05, -118.24], label: "Los Angeles",isMena: false },
  { id: "saopaulo",   location: [-23.55, -46.63], label: "São Paulo",  isMena: false },
  // Asia-Pacific
  { id: "singapore",  location: [1.35,   103.82], label: "Singapore",  isMena: false },
  { id: "tokyo",      location: [35.68,  139.69], label: "Tokyo",      isMena: false },
  { id: "mumbai",     location: [19.08,   72.88], label: "Mumbai",     isMena: false },
  { id: "sydney",     location: [-33.87, 151.21], label: "Sydney",     isMena: false },
  // Africa
  { id: "lagos",      location: [6.52,     3.38], label: "Lagos",      isMena: false },
  { id: "nairobi",    location: [-1.29,   36.82], label: "Nairobi",    isMena: false },
];

// Arcs: global → MENA — voices flowing in from every corner of the world
const ARCS: GlobeArc[] = [
  { id: "arc-ny-dubai",     from: [40.71,  -74.01], to: [25.25,  55.36] },
  { id: "arc-ldn-cairo",    from: [51.51,   -0.13], to: [30.06,  31.25] },
  { id: "arc-par-istanbul", from: [48.86,    2.35], to: [41.01,  28.95] },
  { id: "arc-sin-riyadh",   from: [1.35,   103.82], to: [24.69,  46.72] },
  { id: "arc-lag-cairo",    from: [6.52,     3.38], to: [30.06,  31.25] },
  { id: "arc-tok-dubai",    from: [35.68,  139.69], to: [25.25,  55.36] },
  { id: "arc-syd-beirut",   from: [-33.87, 151.21], to: [33.89,  35.50] },
  { id: "arc-ber-istanbul", from: [52.52,   13.41], to: [41.01,  28.95] },
  { id: "arc-sao-cairo",    from: [-23.55, -46.63], to: [30.06,  31.25] },
  { id: "arc-la-dubai",     from: [34.05, -118.24], to: [25.25,  55.36] },
];

const ARC_STEPS     = 60;
const ARC_ELEVATION = 0.3;

// ── Trending callouts ────────────────────────────────────────────────────────

interface TrendingItem {
  markerId: string;
  message: string;
}

const TRENDING: TrendingItem[] = [
  { markerId: "cairo",     message: "Youth Voices Rising" },
  { markerId: "dubai",     message: "Tech Boom Surging" },
  { markerId: "london",    message: "Policy Shifts Ahead" },
  { markerId: "tokyo",     message: "Innovation Drives Growth" },
  { markerId: "riyadh",    message: "Vision 2030 Accelerates" },
  { markerId: "newyork",   message: "Markets Watch Closely" },
  { markerId: "istanbul",  message: "Culture Bridge Expands" },
  { markerId: "mumbai",    message: "Digital Wave Grows" },
  { markerId: "lagos",     message: "Creators Lead Change" },
  { markerId: "singapore", message: "Hub Status Strengthens" },
  { markerId: "beirut",    message: "Diaspora Voices Amplify" },
  { markerId: "saopaulo",  message: "Street Pulse Beats" },
];

const TRENDING_CYCLE = 260;  // frames per callout (~4.3s at 60fps)

// ── Math helpers ─────────────────────────────────────────────────────────────

function latLonToVec3(lat: number, lon: number): [number, number, number] {
  const latR   = (lat * Math.PI) / 180;
  const lonR   = (lon * Math.PI) / 180;
  const cosLat = Math.cos(latR);
  return [cosLat * Math.cos(lonR), Math.sin(latR), -cosLat * Math.sin(lonR)];
}

function slerpElevated(
  p0: [number, number, number],
  p1: [number, number, number],
  t: number,
  elevation: number
): [number, number, number] {
  const dot   = Math.min(1, Math.max(-1, p0[0]*p1[0] + p0[1]*p1[1] + p0[2]*p1[2]));
  const angle = Math.acos(dot);
  if (angle < 1e-6) return p0;
  const sinA = Math.sin(angle);
  const w0   = Math.sin((1 - t) * angle) / sinA;
  const w1   = Math.sin(t       * angle) / sinA;
  const r    = 1 + elevation * Math.sin(Math.PI * t);
  return [
    (w0 * p0[0] + w1 * p1[0]) * r,
    (w0 * p0[1] + w1 * p1[1]) * r,
    (w0 * p0[2] + w1 * p1[2]) * r,
  ];
}

function projectPoint(
  p: [number, number, number],
  phi: number,
  theta: number,
  cssW: number
) {
  const [px, py, pz] = p;
  const cp = Math.cos(phi),   sp = Math.sin(phi);
  const ct = Math.cos(theta), st = Math.sin(theta);

  // Globe rotation matrix F(theta, phi) applied to world point
  const qx =  cp * px               + sp * pz;
  const qy =  sp * st * px + ct * py - cp * st * pz;
  const qz = -sp * ct * px + st * py + cp * ct * pz;

  // Scale: cobe renders globe at NDC radius 0.8; elevated points scale inward
  const elev  = Math.sqrt(px*px + py*py + pz*pz) || 1;
  const scale = 0.8 / elev;

  return {
    x:       (qx * scale + 1) / 2 * cssW,
    y:       (-qy * scale + 1) / 2 * cssW,
    visible: qz > 0,
    z:       qz,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface GlobeConnectionsProps {
  className?: string;
  speed?: number;
}

export function GlobeConnections({
  className = "",
  speed = 0.0018,
}: GlobeConnectionsProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);

  const pointerInteracting = useRef<{ x: number; y: number } | null>(null);
  const dragOffset         = useRef({ phi: 0, theta: 0 });
  const phiOffsetRef       = useRef(0);
  const thetaOffsetRef     = useRef(0);
  const isPausedRef        = useRef(false);

  // Dark mode — ref-based so globe is never destroyed/recreated on theme change
  const isDarkRef = useRef(
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false
  );
  useEffect(() => {
    const obs = new MutationObserver(() => {
      isDarkRef.current = document.documentElement.classList.contains("dark");
    });
    obs.observe(document.documentElement, { attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // Pointer drag
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!pointerInteracting.current) return;
      dragOffset.current = {
        phi:   (e.clientX - pointerInteracting.current.x) / 300,
        theta: (e.clientY - pointerInteracting.current.y) / 1000,
      };
    };
    const onUp = () => {
      if (pointerInteracting.current) {
        phiOffsetRef.current   += dragOffset.current.phi;
        thetaOffsetRef.current += dragOffset.current.theta;
        dragOffset.current = { phi: 0, theta: 0 };
      }
      pointerInteracting.current = null;
      if (canvasRef.current) canvasRef.current.style.cursor = "grab";
      isPausedRef.current = false;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup",   onUp,   { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup",   onUp);
    };
  }, []);

  // Globe + overlay (created once; theme updates happen live via onRender)
  useEffect(() => {
    const canvas  = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let phi   = 3.72; // start slightly east of Middle East so rotation sweeps it through center
    let width = 0;

    const onResize = () => {
      if (!canvas) return;
      width = canvas.offsetWidth;
      overlay.width  = Math.round(width * dpr);
      overlay.height = Math.round(width * dpr);
      overlay.style.width  = `${width}px`;
      overlay.style.height = `${width}px`;
    };
    window.addEventListener("resize", onResize);
    onResize();

    const ctx = overlay.getContext("2d");

    // Pre-compute arc sample positions (constant across frames)
    const arcSamples = ARCS.map((arc) => {
      const p0 = latLonToVec3(arc.from[0], arc.from[1]);
      const p1 = latLonToVec3(arc.to[0],   arc.to[1]);
      return Array.from({ length: ARC_STEPS + 1 }, (_, i) =>
        slerpElevated(p0, p1, i / ARC_STEPS, ARC_ELEVATION)
      );
    });

    // Staggered pulse dot positions per arc
    const arcPulse = ARCS.map((_, i) => i / ARCS.length);

    // Trending callout animation state
    let trendIdx     = 0;
    let trendFrame   = 0;
    let trendHolding = false;
    // Track consecutive skips to avoid infinite loops
    let skipCount    = 0;

    function drawOverlay(currentPhi: number, currentTheta: number) {
      if (!ctx || width === 0) return;

      // High-DPI: reset transform each frame (canvas reset on resize clears it)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, width);

      // Theme-aware colors
      const dark      = isDarkRef.current;
      const arcColor  = "#DC143C";
      const menaColor = dark ? "#ff3a5c" : "#DC143C";
      const dotColor  = dark ? "rgba(255,255,255,0.85)" : "rgba(30,30,30,0.85)";
      const labelBg   = dark ? "rgba(12,12,12,0.88)"    : "rgba(255,255,255,0.93)";
      const labelText = dark ? "#e8e8e8"                : "#111111";
      const menaText  = dark ? "#ff3a5c"                : "#DC143C";

      // ── Arc lines + pulse dots ──
      arcSamples.forEach((samples, ai) => {
        const pts = samples.map((p) => projectPoint(p, currentPhi, currentTheta, width));

        // Static arc line
        ctx.beginPath();
        ctx.strokeStyle = arcColor;
        ctx.lineWidth   = dark ? 0.9 : 0.8;
        ctx.globalAlpha = dark ? 0.5  : 0.45;
        ctx.lineCap     = "round";
        ctx.lineJoin    = "round";

        let inPath = false;
        for (const pt of pts) {
          if (!pt.visible) { inPath = false; continue; }
          if (!inPath) { ctx.moveTo(pt.x, pt.y); inPath = true; }
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();

        // Advance pulse dot along arc
        arcPulse[ai] = (arcPulse[ai] + 0.004) % 1;
        const idx = Math.min(Math.floor(arcPulse[ai] * ARC_STEPS), ARC_STEPS - 1);
        const dot = pts[idx];
        if (dot?.visible) {
          // Glow halo
          ctx.globalAlpha = 0.7;
          const grad = ctx.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, 7);
          grad.addColorStop(0, "rgba(220,20,60,0.85)");
          grad.addColorStop(1, "rgba(220,20,60,0)");
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, 7, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
          // Core dot
          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = arcColor;
          ctx.fill();
        }
      });

      // ── City dots + labels ──
      ctx.globalAlpha = 1;
      MARKERS.forEach((m) => {
        const vec = latLonToVec3(m.location[0], m.location[1]);
        const pt  = projectPoint(vec, currentPhi, currentTheta, width);
        if (!pt.visible) return;

        const radius = m.isMena ? 3.5 : 2.2;

        // Outer ring for MENA cities
        if (m.isMena) {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, radius + 2.5, 0, Math.PI * 2);
          ctx.strokeStyle = menaColor;
          ctx.lineWidth   = 0.7;
          ctx.globalAlpha = 0.35;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        // Dot fill
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = m.isMena ? menaColor : dotColor;
        ctx.fill();

        // Label — only render when clearly facing camera (not at horizon edge)
        if (pt.z > 0.18) {
          ctx.font = `${m.isMena ? 600 : 500} ${m.isMena ? 7.5 : 6.5}px 'Barlow Condensed', sans-serif`;
          const tw  = ctx.measureText(m.label).width;
          const pad = 4;
          const lw  = tw + pad * 2;
          const lh  = 12;
          const lx  = pt.x - lw / 2;
          const ly  = pt.y - radius - lh - 3;

          // Background pill
          ctx.globalAlpha = 0.95;
          ctx.fillStyle   = labelBg;
          ctx.beginPath();
          ctx.roundRect(lx, ly, lw, lh, 2);
          ctx.fill();

          // MENA border accent
          if (m.isMena) {
            ctx.strokeStyle = dark ? "rgba(255,58,92,0.35)" : "rgba(220,20,60,0.3)";
            ctx.lineWidth   = 0.5;
            ctx.stroke();
          }

          // Text
          ctx.globalAlpha = 1;
          ctx.fillStyle   = m.isMena ? menaText : labelText;
          ctx.fillText(m.label, pt.x - tw / 2, ly + lh - 3);
        }
      });

      // ── Trending callout ──
      trendFrame++;
      const trend   = TRENDING[trendIdx];
      const marker  = MARKERS.find((m) => m.id === trend.markerId);
      if (marker) {
        const vec = latLonToVec3(marker.location[0], marker.location[1]);
        const pt  = projectPoint(vec, currentPhi, currentTheta, width);

        // Only show when city faces camera clearly
        if (pt.visible && pt.z > 0.15) {
          skipCount = 0;
          const t = trendFrame / TRENDING_CYCLE; // 0→1

          // Signal hold phase so onRender can slow the globe
          trendHolding = t > 0.15 && t < 0.80;

          // Phase easing
          const lineT   = Math.min(1, t / 0.18);                          // 0→0.18: line grows
          const textT   = Math.max(0, Math.min(1, (t - 0.18) / 0.12));    // 0.18→0.30: text appears
          const fadeOut  = t > 0.78 ? Math.max(0, 1 - (t - 0.78) / 0.22) : 1; // 0.78→1.0: fade out
          const easeOut  = (v: number) => 1 - (1 - v) * (1 - v);

          const lineProgress = easeOut(lineT);
          const textAlpha    = easeOut(textT) * fadeOut;
          const lineAlpha    = (lineT < 1 ? 0.9 : 1) * fadeOut;

          // Direction: radially outward from globe center
          const cx = width / 2, cy = width / 2;
          const dx = pt.x - cx, dy = pt.y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = dx / dist, ny = dy / dist;

          // Leader line: extends 32px outward from dot
          const lineLen = 32 * lineProgress;
          const x0 = pt.x + nx * 5;      // start just outside the dot
          const y0 = pt.y + ny * 5;
          const x1 = x0 + nx * lineLen;
          const y1 = y0 + ny * lineLen;

          // Draw leader line
          ctx.globalAlpha = lineAlpha * 0.9;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.strokeStyle = "#DC143C";
          ctx.lineWidth   = 1.2;
          ctx.lineCap     = "round";
          ctx.stroke();

          // Terminal dot
          if (lineProgress > 0.5) {
            ctx.globalAlpha = lineAlpha;
            ctx.beginPath();
            ctx.arc(x1, y1, 2.2, 0, Math.PI * 2);
            ctx.fillStyle = "#DC143C";
            ctx.fill();
          }

          // Message pill
          if (textAlpha > 0.02) {
            const msgFont = `600 7px 'Barlow Condensed', sans-serif`;
            ctx.font = msgFont;
            const msg = trend.message.toUpperCase();
            const tw  = ctx.measureText(msg).width;
            const pad = 5;
            const pillW = tw + pad * 2;
            const pillH = 13;

            // Position pill at end of line, offset perpendicular
            const pillX = x1 + nx * 4 - pillW / 2;
            const pillY = y1 + ny * 4 - pillH / 2;

            // Pill background
            ctx.globalAlpha = textAlpha * 0.92;
            ctx.fillStyle = dark ? "rgba(220,20,60,0.15)" : "rgba(220,20,60,0.08)";
            ctx.beginPath();
            ctx.roundRect(pillX, pillY, pillW, pillH, 3);
            ctx.fill();

            // Pill border
            ctx.strokeStyle = dark ? "rgba(220,20,60,0.5)" : "rgba(220,20,60,0.35)";
            ctx.lineWidth = 0.6;
            ctx.stroke();

            // Message text
            ctx.globalAlpha = textAlpha;
            ctx.fillStyle = dark ? "#ff5a78" : "#b01030";
            ctx.fillText(msg, pillX + pad, pillY + pillH - 3.5);
          }
        } else {
          trendHolding = false;
          // City is on back of globe — skip to next after brief wait
          skipCount++;
          if (skipCount < TRENDING.length) {
            trendFrame = TRENDING_CYCLE; // trigger advance
          } else {
            skipCount = 0; // all hidden, just wait
          }
        }
      }

      // Advance to next trending item
      if (trendFrame >= TRENDING_CYCLE) {
        trendFrame = 0;
        trendIdx   = (trendIdx + 1) % TRENDING.length;
      }

      ctx.globalAlpha = 1;
    }

    // Cobe config — created once; theme-dependent props update each frame via onRender
    const initDark = isDarkRef.current;
    const globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width:            width * dpr,
      height:           width * dpr,
      phi:              3.72,
      theta:            0.25,
      dark:          0,
      diffuse:       initDark ? 2.0 : 1.4,
      mapSamples:    16000,
      mapBrightness: initDark ? 2.0 : 8,
      baseColor:     initDark ? [0.46, 0.46, 0.5] : [1, 1, 1],
      markerColor:   initDark ? [1, 1, 1]          : [0.86, 0.08, 0.24],
      glowColor:     initDark ? [0.04, 0.04, 0.05] : [0.96, 0.94, 0.91],
      markerElevation:  0.015,
      markers: MARKERS.map((m) => ({
        location: m.location,
        size:     m.isMena ? 0.011 : 0.007,
      })),
      onRender: (state) => {
        if (!isPausedRef.current) phi += speed;
        const currentPhi   = phi + phiOffsetRef.current + dragOffset.current.phi;
        const currentTheta = 0.25 + thetaOffsetRef.current + dragOffset.current.theta;
        state.phi    = currentPhi;
        state.theta  = currentTheta;
        state.width  = width * dpr;
        state.height = width * dpr;
        // Live theme updates — no globe recreation needed
        const dk = isDarkRef.current;
        state.diffuse       = dk ? 2.0 : 1.4;
        state.mapBrightness = dk ? 2.0 : 8;
        state.baseColor     = dk ? [0.46, 0.46, 0.5] : [1, 1, 1];
        state.markerColor   = dk ? [1, 1, 1]          : [0.86, 0.08, 0.24];
        state.glowColor     = dk ? [0.04, 0.04, 0.05] : [0.96, 0.94, 0.91];
        drawOverlay(currentPhi, currentTheta);
      },
    });

    setTimeout(() => {
      if (canvas) canvas.style.opacity = "1";
    });

    return () => {
      globe.destroy();
      window.removeEventListener("resize", onResize);
    };
  }, [speed]);

  return (
    <div
      className={`relative aspect-square select-none ${className}`}
      style={{ touchAction: "none", cursor: "grab" }}
      onPointerDown={(e) => {
        pointerInteracting.current = { x: e.clientX, y: e.clientY };
        if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
        isPausedRef.current = true;
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          opacity: 0,
          transition: "opacity 1.2s ease",
          borderRadius: "50%",
          display: "block",
        }}
      />
      <canvas
        ref={overlayRef}
        style={{
          position:      "absolute",
          inset:         0,
          width:         "100%",
          height:        "100%",
          pointerEvents: "none",
          borderRadius:  "50%",
        }}
      />
    </div>
  );
}
