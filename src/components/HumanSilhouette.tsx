"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ElementalProfile, Scope, ElementSymbol } from "@/lib/types";
import { formatMass } from "@/lib/estimation-engine";

// ─── Types ────────────────────────────────────────────────

interface HumanSilhouetteProps {
  profile: ElementalProfile;
  scale: Scope;
  onRegionClick?: (element: string) => void;
}

interface BodyRegion {
  id: string;
  element: ElementSymbol;
  label: string;
  color: string;
  tooltipY: number;
}

// ─── Constants ────────────────────────────────────────────

const BODY_REGIONS: BodyRegion[] = [
  { id: "brain", element: "P", label: "Phosphorus (Brain)", color: "#00f0ff", tooltipY: 52 },
  { id: "lungs", element: "O", label: "Oxygen (Lungs)", color: "#ffffff", tooltipY: 155 },
  { id: "heart", element: "Fe", label: "Iron (Heart)", color: "#ff0040", tooltipY: 175 },
  { id: "skeleton", element: "Ca", label: "Calcium (Bones)", color: "#ff6b00", tooltipY: 250 },
  { id: "gut", element: "C", label: "Carbon (Gut)", color: "#00ff88", tooltipY: 275 },
  { id: "vessels", element: "Fe", label: "Iron (Blood)", color: "#ff0040", tooltipY: 200 },
];

// Anatomically proportioned human silhouette — a single smooth path
// Designed to look like a high-end medical scan outline
const SILHOUETTE_PATH = `
  M 150 38
  C 138 38, 128 48, 127 62
  C 126 76, 132 88, 140 94
  C 142 96, 144 98, 144 102
  L 143 106
  C 140 108, 136 110, 132 114
  C 124 118, 116 126, 112 136
  C 108 144, 100 152, 90 162
  L 68 186
  C 60 194, 52 204, 48 210
  C 44 218, 42 224, 42 230
  C 42 236, 46 238, 50 238
  C 54 238, 56 236, 60 232
  L 82 206
  C 88 200, 94 192, 100 186
  L 106 178
  L 106 186
  L 104 220
  L 102 280
  L 100 310
  C 98 330, 96 352, 94 370
  C 92 390, 90 410, 90 424
  C 90 432, 92 438, 94 440
  L 96 442
  C 100 444, 106 444, 112 442
  C 116 440, 118 436, 118 430
  C 118 420, 118 410, 120 392
  L 126 340
  L 134 310
  L 150 290
  L 166 310
  L 174 340
  L 180 392
  C 182 410, 182 420, 182 430
  C 182 436, 184 440, 188 442
  C 194 444, 200 444, 204 442
  L 206 440
  C 208 438, 210 432, 210 424
  C 210 410, 208 390, 206 370
  C 204 352, 202 330, 200 310
  L 198 280
  L 196 220
  L 194 186
  L 194 178
  L 200 186
  C 206 192, 212 200, 218 206
  L 240 232
  C 244 236, 246 238, 250 238
  C 254 238, 258 236, 258 230
  C 258 224, 256 218, 252 210
  C 248 204, 240 194, 232 186
  L 210 162
  C 200 152, 192 144, 188 136
  C 184 126, 176 118, 168 114
  C 164 110, 160 108, 157 106
  L 156 102
  C 156 98, 158 96, 160 94
  C 168 88, 174 76, 173 62
  C 172 48, 162 38, 150 38
  Z
`;

// Seeded pseudo-random for consistent city dots
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

// ─── CSS Keyframes (injected via <style>) ─────────────────

const KEYFRAMES_CSS = `
  @keyframes silhouette-breathe {
    0%, 100% { transform: scale(0.97); }
    50% { transform: scale(1.03); }
  }
  @keyframes silhouette-pulse-fast {
    0%, 100% { transform: scale(0.92); opacity: 0.7; }
    50% { transform: scale(1.08); opacity: 1; }
  }
  @keyframes silhouette-brain-pulse {
    0%, 100% { opacity: 0.5; transform: scale(1); }
    50% { opacity: 0.9; transform: scale(1.06); }
  }
  @keyframes silhouette-gut-glow {
    0%, 100% { opacity: 0.25; }
    50% { opacity: 0.5; }
  }
  @keyframes silhouette-flow {
    0% { stroke-dashoffset: 20; }
    100% { stroke-dashoffset: 0; }
  }
  @keyframes silhouette-outline-trace {
    0% { stroke-dashoffset: 2000; }
    100% { stroke-dashoffset: 0; }
  }
  @keyframes silhouette-earth-rotate {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes silhouette-dot-pulse {
    0%, 100% { transform: scale(1); opacity: 0.9; }
    50% { transform: scale(1.5); opacity: 0.4; }
  }
  @keyframes silhouette-ring-expand {
    0% { transform: scale(1); opacity: 0.8; }
    100% { transform: scale(3); opacity: 0; }
  }
  @keyframes silhouette-scan-line {
    0% { transform: translateY(-180px); opacity: 0; }
    10% { opacity: 0.6; }
    90% { opacity: 0.6; }
    100% { transform: translateY(220px); opacity: 0; }
  }
`;

// ─── Tooltip ──────────────────────────────────────────────

function Tooltip({
  x,
  y,
  label,
  mass,
  color,
}: {
  x: number;
  y: number;
  label: string;
  mass: string;
  color: string;
}) {
  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <rect
        x={x - 72}
        y={y - 38}
        width={144}
        height={34}
        rx={4}
        fill="rgba(6,6,15,0.92)"
        stroke={color}
        strokeWidth={0.8}
      />
      <text
        x={x}
        y={y - 22}
        textAnchor="middle"
        fill={color}
        fontSize={9}
        fontFamily="monospace"
        fontWeight="bold"
        letterSpacing="0.05em"
      >
        {label}
      </text>
      <text
        x={x}
        y={y - 10}
        textAnchor="middle"
        fill="#8888aa"
        fontSize={8}
        fontFamily="monospace"
      >
        {mass}
      </text>
    </motion.g>
  );
}

// ─── Person View ──────────────────────────────────────────

function PersonView({
  profile,
  onRegionClick,
}: {
  profile: ElementalProfile;
  onRegionClick?: (element: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const getMass = (el: ElementSymbol) => {
    const entry = profile.composition[el];
    return entry ? formatMass(entry.mass_kg) : "trace";
  };

  const hoveredRegion = BODY_REGIONS.find((r) => r.id === hovered);

  const regionInteraction = (region: BodyRegion) => ({
    onClick: () => onRegionClick?.(region.element),
    onMouseEnter: () => setHovered(region.id),
    onMouseLeave: () => setHovered(null),
    style: { cursor: "pointer" } as React.CSSProperties,
  });

  return (
    <svg viewBox="0 0 300 480" className="w-full h-full max-h-[500px]">
      <style>{KEYFRAMES_CSS}</style>
      <defs>
        {/* Outer neon glow for silhouette edge */}
        <filter id="sil-edge-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur2" />
          <feMerge>
            <feMergeNode in="blur1" />
            <feMergeNode in="blur2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Inner organ glow filter */}
        <filter id="sil-organ-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Intense point glow for heart */}
        <filter id="sil-heart-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Brain glow */}
        <filter id="sil-brain-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Clip path for internal elements */}
        <clipPath id="body-clip">
          <path d={SILHOUETTE_PATH} />
        </clipPath>

        {/* Radial gradient for scan line */}
        <linearGradient id="scan-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00f0ff" stopOpacity="0" />
          <stop offset="40%" stopColor="#00f0ff" stopOpacity="0.15" />
          <stop offset="50%" stopColor="#00f0ff" stopOpacity="0.4" />
          <stop offset="60%" stopColor="#00f0ff" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#00f0ff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* ── Dark filled silhouette body ── */}
      <path
        d={SILHOUETTE_PATH}
        fill="#0a0a1a"
        stroke="none"
      />

      {/* ── Neon edge outline with glow ── */}
      <path
        d={SILHOUETTE_PATH}
        fill="none"
        stroke="#00f0ff"
        strokeWidth={1.2}
        strokeOpacity={0.7}
        filter="url(#sil-edge-glow)"
        style={{
          strokeDasharray: 2000,
          animation: "silhouette-outline-trace 2.5s ease-out forwards",
        }}
      />

      {/* ── Scanning line effect ── */}
      <g clipPath="url(#body-clip)">
        <rect
          x="40"
          y="40"
          width="220"
          height="60"
          fill="url(#scan-gradient)"
          style={{
            animation: "silhouette-scan-line 4s ease-in-out infinite",
            transformOrigin: "150px 240px",
          }}
        />
      </g>

      {/* ── BONES: Skeleton overlay ── */}
      <g
        clipPath="url(#body-clip)"
        opacity={0.35}
        {...regionInteraction(BODY_REGIONS[3])}
      >
        {/* Spine */}
        <line x1={150} y1={108} x2={150} y2={288} stroke="#ff6b00" strokeWidth={1.5} strokeOpacity={0.6} />
        {/* Vertebrae marks */}
        {Array.from({ length: 18 }, (_, i) => (
          <line
            key={`vert-${i}`}
            x1={146}
            y1={112 + i * 10}
            x2={154}
            y2={112 + i * 10}
            stroke="#ff6b00"
            strokeWidth={0.8}
            strokeOpacity={0.4}
          />
        ))}
        {/* Ribs */}
        {[140, 152, 164, 176, 188, 198].map((y, i) => (
          <g key={`rib-pair-${i}`}>
            <path
              d={`M 150 ${y} Q ${130 - i * 1.5} ${y + 6} ${118 + i * 1} ${y + 12}`}
              fill="none" stroke="#ff6b00" strokeWidth={0.8} strokeOpacity={0.45}
            />
            <path
              d={`M 150 ${y} Q ${170 + i * 1.5} ${y + 6} ${182 - i * 1} ${y + 12}`}
              fill="none" stroke="#ff6b00" strokeWidth={0.8} strokeOpacity={0.45}
            />
          </g>
        ))}
        {/* Pelvis */}
        <path
          d="M 134 288 Q 120 300 118 316 Q 118 324 126 328 L 150 310 L 174 328 Q 182 324 182 316 Q 180 300 166 288"
          fill="none" stroke="#ff6b00" strokeWidth={1} strokeOpacity={0.4}
        />
        {/* Shoulder girdle */}
        <path
          d="M 150 118 Q 130 114 112 120 Q 106 124 106 130"
          fill="none" stroke="#ff6b00" strokeWidth={0.9} strokeOpacity={0.4}
        />
        <path
          d="M 150 118 Q 170 114 188 120 Q 194 124 194 130"
          fill="none" stroke="#ff6b00" strokeWidth={0.9} strokeOpacity={0.4}
        />
        {/* Skull outline */}
        <circle cx={150} cy={66} r={22} fill="none" stroke="#ff6b00" strokeWidth={0.7} strokeOpacity={0.3} />
        {/* Femurs */}
        <line x1={138} y1={316} x2={126} y2={400} stroke="#ff6b00" strokeWidth={1.2} strokeOpacity={0.35} />
        <line x1={162} y1={316} x2={174} y2={400} stroke="#ff6b00" strokeWidth={1.2} strokeOpacity={0.35} />
        {/* Tibias */}
        <line x1={124} y1={404} x2={116} y2={436} stroke="#ff6b00" strokeWidth={1} strokeOpacity={0.3} />
        <line x1={176} y1={404} x2={184} y2={436} stroke="#ff6b00" strokeWidth={1} strokeOpacity={0.3} />
        {/* Arm bones */}
        <line x1={106} y1={136} x2={82} y2={206} stroke="#ff6b00" strokeWidth={0.9} strokeOpacity={0.3} />
        <line x1={194} y1={136} x2={218} y2={206} stroke="#ff6b00" strokeWidth={0.9} strokeOpacity={0.3} />
        <line x1={80} y1={208} x2={58} y2={234} stroke="#ff6b00" strokeWidth={0.8} strokeOpacity={0.25} />
        <line x1={220} y1={208} x2={242} y2={234} stroke="#ff6b00" strokeWidth={0.8} strokeOpacity={0.25} />
      </g>

      {/* ── BRAIN: Glowing orb at head ── */}
      <g
        filter="url(#sil-brain-glow)"
        {...regionInteraction(BODY_REGIONS[0])}
      >
        <circle
          cx={150}
          cy={66}
          r={14}
          fill="#00f0ff"
          fillOpacity={0.12}
          stroke="#00f0ff"
          strokeWidth={0.8}
          strokeOpacity={0.5}
          style={{
            animation: "silhouette-brain-pulse 3s ease-in-out infinite",
            transformOrigin: "150px 66px",
          }}
        />
        {/* Neural pattern lines */}
        <path
          d="M 140 60 Q 150 54 160 60 M 138 66 Q 150 72 162 66 M 140 72 Q 150 78 160 72"
          fill="none"
          stroke="#00f0ff"
          strokeWidth={0.5}
          strokeOpacity={0.35}
        />
      </g>

      {/* ── LUNGS: Two breathing ovals ── */}
      <g
        filter="url(#sil-organ-glow)"
        {...regionInteraction(BODY_REGIONS[1])}
      >
        {/* Left lung */}
        <ellipse
          cx={132}
          cy={168}
          rx={16}
          ry={26}
          fill="#ffffff"
          fillOpacity={0.04}
          stroke="#ffffff"
          strokeWidth={0.8}
          strokeOpacity={0.35}
          style={{
            animation: "silhouette-breathe 3s ease-in-out infinite",
            transformOrigin: "132px 168px",
          }}
        />
        {/* Right lung */}
        <ellipse
          cx={168}
          cy={168}
          rx={16}
          ry={26}
          fill="#ffffff"
          fillOpacity={0.04}
          stroke="#ffffff"
          strokeWidth={0.8}
          strokeOpacity={0.35}
          style={{
            animation: "silhouette-breathe 3s ease-in-out infinite",
            transformOrigin: "168px 168px",
          }}
        />
        {/* Lung internal lines */}
        <path
          d="M 124 158 Q 132 162 126 174 M 128 154 Q 136 160 130 170"
          fill="none" stroke="#ffffff" strokeWidth={0.4} strokeOpacity={0.2}
          style={{
            animation: "silhouette-breathe 3s ease-in-out infinite",
            transformOrigin: "130px 164px",
          }}
        />
        <path
          d="M 176 158 Q 168 162 174 174 M 172 154 Q 164 160 170 170"
          fill="none" stroke="#ffffff" strokeWidth={0.4} strokeOpacity={0.2}
          style={{
            animation: "silhouette-breathe 3s ease-in-out infinite",
            transformOrigin: "170px 164px",
          }}
        />
      </g>

      {/* ── HEART: Bright pulsing dot ── */}
      <g
        filter="url(#sil-heart-glow)"
        {...regionInteraction(BODY_REGIONS[2])}
      >
        <circle
          cx={150}
          cy={176}
          r={5}
          fill="#ff0040"
          fillOpacity={0.8}
          style={{
            animation: "silhouette-pulse-fast 1s ease-in-out infinite",
            transformOrigin: "150px 176px",
          }}
        />
        <circle
          cx={150}
          cy={176}
          r={5}
          fill="none"
          stroke="#ff0040"
          strokeWidth={1}
          strokeOpacity={0.4}
          style={{
            animation: "silhouette-ring-expand 1s ease-out infinite",
            transformOrigin: "150px 176px",
          }}
        />
      </g>

      {/* ── GUT / STOMACH: Soft abdominal glow ── */}
      <g
        filter="url(#sil-organ-glow)"
        {...regionInteraction(BODY_REGIONS[4])}
      >
        <ellipse
          cx={150}
          cy={240}
          rx={22}
          ry={18}
          fill="#00ff88"
          fillOpacity={0.06}
          stroke="#00ff88"
          strokeWidth={0.6}
          strokeOpacity={0.25}
          style={{
            animation: "silhouette-gut-glow 4s ease-in-out infinite",
            transformOrigin: "150px 240px",
          }}
        />
        {/* Intestinal suggestion */}
        <path
          d="M 140 234 Q 144 240 148 234 Q 152 228 156 234 Q 160 240 156 246 Q 152 252 148 246 Q 144 240 140 246"
          fill="none"
          stroke="#00ff88"
          strokeWidth={0.5}
          strokeOpacity={0.2}
        />
      </g>

      {/* ── BLOOD VESSELS: Flowing dashed lines ── */}
      <g
        clipPath="url(#body-clip)"
        opacity={0.5}
        {...regionInteraction(BODY_REGIONS[5])}
      >
        {/* Aorta down from heart */}
        <path
          d="M 150 182 L 150 210 Q 150 220 148 240 Q 146 260 144 280"
          fill="none"
          stroke="#ff0040"
          strokeWidth={1}
          strokeOpacity={0.4}
          strokeDasharray="4 3"
          style={{ animation: "silhouette-flow 1.2s linear infinite" }}
        />
        {/* Carotid up to brain */}
        <path
          d="M 148 168 Q 146 140 146 120 Q 146 100 150 80"
          fill="none"
          stroke="#ff0040"
          strokeWidth={0.7}
          strokeOpacity={0.3}
          strokeDasharray="3 4"
          style={{ animation: "silhouette-flow 1.5s linear infinite" }}
        />
        <path
          d="M 152 168 Q 154 140 154 120 Q 154 100 150 80"
          fill="none"
          stroke="#ff0040"
          strokeWidth={0.7}
          strokeOpacity={0.3}
          strokeDasharray="3 4"
          style={{ animation: "silhouette-flow 1.5s linear infinite" }}
        />
        {/* Iliac arteries to legs */}
        <path
          d="M 148 280 Q 142 300 136 330 Q 130 360 126 400"
          fill="none"
          stroke="#ff0040"
          strokeWidth={0.6}
          strokeOpacity={0.25}
          strokeDasharray="3 4"
          style={{ animation: "silhouette-flow 1.8s linear infinite" }}
        />
        <path
          d="M 152 280 Q 158 300 164 330 Q 170 360 174 400"
          fill="none"
          stroke="#ff0040"
          strokeWidth={0.6}
          strokeOpacity={0.25}
          strokeDasharray="3 4"
          style={{ animation: "silhouette-flow 1.8s linear infinite" }}
        />
        {/* Brachial arteries to arms */}
        <path
          d="M 140 170 Q 120 180 106 190 Q 90 200 76 218"
          fill="none"
          stroke="#ff0040"
          strokeWidth={0.5}
          strokeOpacity={0.2}
          strokeDasharray="2 4"
          style={{ animation: "silhouette-flow 2s linear infinite" }}
        />
        <path
          d="M 160 170 Q 180 180 194 190 Q 210 200 224 218"
          fill="none"
          stroke="#ff0040"
          strokeWidth={0.5}
          strokeOpacity={0.2}
          strokeDasharray="2 4"
          style={{ animation: "silhouette-flow 2s linear infinite" }}
        />
      </g>

      {/* ── Second edge pass: finer bright line on top ── */}
      <path
        d={SILHOUETTE_PATH}
        fill="none"
        stroke="#00f0ff"
        strokeWidth={0.4}
        strokeOpacity={0.9}
      />

      {/* ── Tooltip overlay ── */}
      <AnimatePresence>
        {hoveredRegion && (
          <Tooltip
            x={150}
            y={hoveredRegion.tooltipY - 44}
            label={hoveredRegion.label}
            mass={getMass(hoveredRegion.element)}
            color={hoveredRegion.color}
          />
        )}
      </AnimatePresence>
    </svg>
  );
}

// ─── City View ────────────────────────────────────────────

function CityView({ profile }: { profile: ElementalProfile }) {
  const dots = useMemo(() => {
    const rand = seededRandom(42);
    const result: { x: number; y: number }[] = [];
    // Organic cluster — gaussian-ish distribution
    for (let i = 0; i < 150; i++) {
      // Box-Muller approximation via seeded random
      const angle = rand() * Math.PI * 2;
      const radius = Math.sqrt(-2 * Math.log(rand() + 0.001)) * 55;
      result.push({
        x: 150 + Math.cos(angle) * radius * 1.2,
        y: 190 + Math.sin(angle) * radius * 0.8,
      });
    }
    return result;
  }, []);

  return (
    <svg viewBox="0 0 300 380" className="w-full h-full max-h-[480px]">
      <style>{KEYFRAMES_CSS}</style>
      <defs>
        <filter id="city-user-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Population dots */}
      {dots.map((d, i) => (
        <circle
          key={i}
          cx={d.x}
          cy={d.y}
          r={i === 0 ? 3.5 : 1.2}
          fill={i === 0 ? "#00f0ff" : "#00f0ff"}
          fillOpacity={i === 0 ? 1 : 0.18 + (i % 5) * 0.03}
          filter={i === 0 ? "url(#city-user-glow)" : undefined}
          style={
            i === 0
              ? {
                  animation: "silhouette-dot-pulse 2s ease-in-out infinite",
                  transformOrigin: `${d.x}px ${d.y}px`,
                }
              : undefined
          }
        />
      ))}

      {/* User dot expanding ring */}
      <circle
        cx={dots[0]?.x ?? 150}
        cy={dots[0]?.y ?? 190}
        r={4}
        fill="none"
        stroke="#00f0ff"
        strokeWidth={0.8}
        strokeOpacity={0.6}
        style={{
          animation: "silhouette-ring-expand 2.5s ease-out infinite",
          transformOrigin: `${dots[0]?.x ?? 150}px ${dots[0]?.y ?? 190}px`,
        }}
      />

      {/* Label */}
      <text
        x={150}
        y={40}
        textAnchor="middle"
        fill="#00f0ff"
        fontSize={13}
        fontFamily="monospace"
        fontWeight="bold"
        letterSpacing="0.2em"
      >
        YOUR CITY
      </text>
      <text
        x={150}
        y={58}
        textAnchor="middle"
        fill="#556677"
        fontSize={10}
        fontFamily="monospace"
        letterSpacing="0.1em"
      >
        500,000 people
      </text>
      <text
        x={150}
        y={355}
        textAnchor="middle"
        fill="#334"
        fontSize={9}
        fontFamily="monospace"
      >
        Combined mass: {formatMass(profile.totalMass_kg)}
      </text>
    </svg>
  );
}

// ─── Country View ─────────────────────────────────────────

function CountryView({ profile }: { profile: ElementalProfile }) {
  // Simplified but recognizable US continental outline
  const usPath =
    "M 62 140 L 58 136 L 52 138 L 46 144 L 40 148 L 38 154 L 40 162 L 44 168 L 48 174 L 52 180 L 48 186 L 46 194 L 48 200 L 54 204 L 60 206 L 62 212 L 58 218 L 56 224 L 60 228 L 68 228 L 76 226 L 82 222 L 90 218 L 96 220 L 100 226 L 106 230 L 114 232 L 120 230 L 128 226 L 134 220 L 142 218 L 148 220 L 152 226 L 158 228 L 164 224 L 170 218 L 176 214 L 184 212 L 190 214 L 196 218 L 202 220 L 208 218 L 214 214 L 218 208 L 224 202 L 230 196 L 238 192 L 244 188 L 250 182 L 254 176 L 256 168 L 258 160 L 256 152 L 252 146 L 246 142 L 240 140 L 232 140 L 226 142 L 218 140 L 210 138 L 202 136 L 194 134 L 186 132 L 178 132 L 170 134 L 162 136 L 154 138 L 146 138 L 138 136 L 130 134 L 122 134 L 114 136 L 106 138 L 98 138 L 90 136 L 82 134 L 74 134 L 68 136 Z";

  const dots = useMemo(() => {
    const rand = seededRandom(77);
    const result: { x: number; y: number }[] = [];
    for (let i = 0; i < 300; i++) {
      // Scatter within rough US bounding box, let clip handle containment
      const x = 42 + rand() * 214;
      const y = 134 + rand() * 98;
      result.push({ x, y });
    }
    return result;
  }, []);

  return (
    <svg viewBox="0 0 300 380" className="w-full h-full max-h-[480px]">
      <style>{KEYFRAMES_CSS}</style>
      <defs>
        <clipPath id="us-clip">
          <path d={usPath} />
        </clipPath>
        <filter id="country-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* US outline */}
      <path
        d={usPath}
        fill="none"
        stroke="#00f0ff"
        strokeWidth={1}
        strokeOpacity={0.3}
        style={{
          strokeDasharray: 1200,
          animation: "silhouette-outline-trace 2s ease-out forwards",
        }}
      />
      {/* Faint fill */}
      <path d={usPath} fill="#00f0ff" fillOpacity={0.02} />

      {/* Density dots clipped to US */}
      <g clipPath="url(#us-clip)">
        {dots.map((d, i) => (
          <circle
            key={i}
            cx={d.x}
            cy={d.y}
            r={i === 0 ? 2.5 : 0.7}
            fill="#00f0ff"
            fillOpacity={i === 0 ? 0.9 : 0.12}
          />
        ))}
      </g>

      {/* User highlight */}
      <circle
        cx={dots[0]?.x ?? 150}
        cy={dots[0]?.y ?? 180}
        r={2.5}
        fill="#00f0ff"
        filter="url(#country-glow)"
        style={{
          animation: "silhouette-dot-pulse 2s ease-in-out infinite",
          transformOrigin: `${dots[0]?.x ?? 150}px ${dots[0]?.y ?? 180}px`,
        }}
      />

      {/* Labels */}
      <text
        x={150}
        y={44}
        textAnchor="middle"
        fill="#00f0ff"
        fontSize={13}
        fontFamily="monospace"
        fontWeight="bold"
        letterSpacing="0.2em"
      >
        UNITED STATES
      </text>
      <text
        x={150}
        y={62}
        textAnchor="middle"
        fill="#556677"
        fontSize={10}
        fontFamily="monospace"
        letterSpacing="0.1em"
      >
        331M people
      </text>
      <text
        x={150}
        y={355}
        textAnchor="middle"
        fill="#334"
        fontSize={9}
        fontFamily="monospace"
      >
        Combined mass: {formatMass(profile.totalMass_kg)}
      </text>
    </svg>
  );
}

// ─── Planet View ──────────────────────────────────────────

function PlanetView({ profile }: { profile: ElementalProfile }) {
  // Simplified continent arcs positioned on a sphere
  const continentArcs = [
    // North America
    "M 96 118 Q 88 128 86 142 Q 86 152 92 158 Q 98 162 104 156 Q 108 148 106 138",
    // South America
    "M 108 168 Q 104 178 106 192 Q 108 204 112 212 Q 114 218 110 226 Q 108 230 110 234",
    // Europe
    "M 152 108 Q 156 114 158 122 Q 158 128 154 132",
    // Africa
    "M 154 136 Q 150 148 148 162 Q 148 178 152 192 Q 154 200 150 210",
    // Asia
    "M 162 104 Q 174 108 186 118 Q 196 130 200 142 Q 202 152 196 160 Q 188 166 180 162 Q 172 156 168 146",
    // Australia
    "M 200 182 Q 208 186 212 194 Q 212 200 206 204 Q 200 202 198 194",
  ];

  return (
    <svg viewBox="0 0 300 380" className="w-full h-full max-h-[480px]">
      <style>{KEYFRAMES_CSS}</style>
      <defs>
        <filter id="earth-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="earth-outline-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id="earth-clip">
          <circle cx={150} cy={170} r={78} />
        </clipPath>
        <radialGradient id="earth-atmosphere" cx="50%" cy="50%" r="50%">
          <stop offset="70%" stopColor="#00f0ff" stopOpacity="0" />
          <stop offset="85%" stopColor="#00f0ff" stopOpacity="0.03" />
          <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.08" />
        </radialGradient>
      </defs>

      {/* Atmosphere glow */}
      <circle cx={150} cy={170} r={90} fill="url(#earth-atmosphere)" />

      {/* Earth outline */}
      <circle
        cx={150}
        cy={170}
        r={80}
        fill="none"
        stroke="#00f0ff"
        strokeWidth={1.2}
        strokeOpacity={0.5}
        filter="url(#earth-outline-glow)"
      />

      {/* Faint inner fill */}
      <circle cx={150} cy={170} r={78} fill="#00f0ff" fillOpacity={0.015} />

      {/* Grid lines — latitude */}
      {[-50, -25, 0, 25, 50].map((offset) => {
        const ry = 6;
        const rxCalc = Math.sqrt(Math.max(0, 78 * 78 - offset * offset));
        return (
          <ellipse
            key={`lat-${offset}`}
            cx={150}
            cy={170 + offset}
            rx={rxCalc}
            ry={ry}
            fill="none"
            stroke="#00f0ff"
            strokeWidth={0.3}
            strokeOpacity={0.1}
          />
        );
      })}

      {/* Grid lines — longitude (vertical great-circle arcs) */}
      {[-40, -20, 0, 20, 40].map((offset) => {
        const rxCalc = Math.abs(offset) * 0.8 + 8;
        return (
          <ellipse
            key={`lon-${offset}`}
            cx={150 + offset}
            cy={170}
            rx={rxCalc}
            ry={78}
            fill="none"
            stroke="#00f0ff"
            strokeWidth={0.3}
            strokeOpacity={0.08}
          />
        );
      })}

      {/* Rotating continent layer */}
      <g
        clipPath="url(#earth-clip)"
        style={{
          animation: "silhouette-earth-rotate 90s linear infinite",
          transformOrigin: "150px 170px",
        }}
      >
        {continentArcs.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={i === 0 ? "#00ff88" : "#00f0ff"}
            strokeWidth={i === 0 ? 1.6 : 1}
            strokeOpacity={i === 0 ? 0.6 : 0.3}
          />
        ))}

        {/* User region highlight on North America */}
        <circle
          cx={96}
          cy={138}
          r={4}
          fill="#00ff88"
          fillOpacity={0.5}
          filter="url(#earth-glow)"
          style={{
            animation: "silhouette-dot-pulse 3s ease-in-out infinite",
            transformOrigin: "96px 138px",
          }}
        />
      </g>

      {/* Labels */}
      <text
        x={150}
        y={44}
        textAnchor="middle"
        fill="#00f0ff"
        fontSize={13}
        fontFamily="monospace"
        fontWeight="bold"
        letterSpacing="0.2em"
      >
        EARTH
      </text>
      <text
        x={150}
        y={62}
        textAnchor="middle"
        fill="#556677"
        fontSize={10}
        fontFamily="monospace"
        letterSpacing="0.1em"
      >
        8.1B people
      </text>
      <text
        x={150}
        y={355}
        textAnchor="middle"
        fill="#334"
        fontSize={9}
        fontFamily="monospace"
      >
        Combined mass: {formatMass(profile.totalMass_kg)}
      </text>
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────

export default function HumanSilhouette({
  profile,
  scale,
  onRegionClick,
}: HumanSilhouetteProps) {
  return (
    <div
      className="flex flex-col items-center w-full"
      style={{ background: "#06060f" }}
    >
      <AnimatePresence mode="wait">
        {scale === "person" && (
          <motion.div
            key="person"
            className="w-full flex flex-col items-center"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.02 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          >
            <PersonView profile={profile} onRegionClick={onRegionClick} />
            <div className="mt-1 text-center">
              <p
                className="text-xs tracking-[0.3em] font-mono"
                style={{ color: "#00f0ff" }}
              >
                YOUR ELEMENTAL BODY
              </p>
              <p className="text-xs font-mono mt-1" style={{ color: "#334" }}>
                Total mass: {formatMass(profile.totalMass_kg)}
              </p>
            </div>
          </motion.div>
        )}

        {scale === "city" && (
          <motion.div
            key="city"
            className="w-full flex flex-col items-center"
            initial={{ opacity: 0, scale: 1.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.1 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          >
            <CityView profile={profile} />
          </motion.div>
        )}

        {scale === "country" && (
          <motion.div
            key="country"
            className="w-full flex flex-col items-center"
            initial={{ opacity: 0, scale: 1.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.1 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          >
            <CountryView profile={profile} />
          </motion.div>
        )}

        {scale === "planet" && (
          <motion.div
            key="planet"
            className="w-full flex flex-col items-center"
            initial={{ opacity: 0, scale: 1.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          >
            <PlanetView profile={profile} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
