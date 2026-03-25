'use client';

import { motion } from 'framer-motion';
import { ElementalProfile } from '@/lib/types';
import { ImpactMetrics } from '@/lib/types';
import { Recommendation } from '@/lib/recommendations';

interface ImpactHeroProps {
  profile: ElementalProfile;
  metrics: ImpactMetrics;
  recommendations: Recommendation[];
  sustainableTarget: ElementalProfile;
  onTabSwitch?: (tab: string) => void;
}

// SVG Semicircle Gauge
function PlanetaryGauge({ earthsNeeded }: { earthsNeeded: number }) {
  // Map 0.5 -> 0 degrees, 3.0 -> 180 degrees
  const clamped = Math.max(0.5, Math.min(3.5, earthsNeeded));
  const angle = ((clamped - 0.5) / 2.5) * 180;
  const needleAngle = angle - 90; // SVG rotation: -90 is left, 90 is right

  // Arc path for the gauge background
  const r = 70;
  const cx = 100;
  const cy = 85;

  return (
    <svg viewBox="0 0 200 100" width="100%" style={{ maxWidth: 220 }}>
      {/* Gauge arc background segments */}
      {/* Green zone: 0-60 deg */}
      <path
        d={describeArc(cx, cy, r, -180, -120)}
        fill="none"
        stroke="#00ff88"
        strokeWidth={8}
        strokeLinecap="round"
        opacity={0.3}
      />
      {/* Yellow zone: 60-120 deg */}
      <path
        d={describeArc(cx, cy, r, -120, -60)}
        fill="none"
        stroke="#ffff00"
        strokeWidth={8}
        strokeLinecap="round"
        opacity={0.3}
      />
      {/* Red zone: 120-180 deg */}
      <path
        d={describeArc(cx, cy, r, -60, 0)}
        fill="none"
        stroke="#ff0040"
        strokeWidth={8}
        strokeLinecap="round"
        opacity={0.3}
      />

      {/* Active arc up to needle */}
      <path
        d={describeArc(cx, cy, r, -180, -180 + angle)}
        fill="none"
        stroke={earthsNeeded <= 1 ? '#00ff88' : earthsNeeded <= 2 ? '#ffff00' : '#ff0040'}
        strokeWidth={8}
        strokeLinecap="round"
        style={{
          filter: `drop-shadow(0 0 6px ${earthsNeeded <= 1 ? '#00ff88' : earthsNeeded <= 2 ? '#ffff00' : '#ff0040'})`,
        }}
      />

      {/* Needle */}
      <g transform={`rotate(${needleAngle}, ${cx}, ${cy})`}>
        <line
          x1={cx}
          y1={cy}
          x2={cx}
          y2={cy - r + 10}
          stroke="white"
          strokeWidth={2.5}
          strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.5))' }}
        />
        <circle cx={cx} cy={cy} r={4} fill="white" style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.5))' }} />
      </g>

      {/* Labels */}
      <text x={cx - r - 8} y={cy + 14} fill="rgba(255,255,255,0.3)" fontSize={9} textAnchor="middle" fontFamily="monospace">0.5</text>
      <text x={cx} y={cy - r - 6} fill="rgba(255,255,255,0.3)" fontSize={9} textAnchor="middle" fontFamily="monospace">2.0</text>
      <text x={cx + r + 8} y={cy + 14} fill="rgba(255,255,255,0.3)" fontSize={9} textAnchor="middle" fontFamily="monospace">3.5</text>

      {/* Center value */}
      <text x={cx} y={cy - 8} fill="white" fontSize={22} fontWeight={900} textAnchor="middle" fontFamily="monospace">
        {earthsNeeded.toFixed(1)}
      </text>
      <text x={cx} y={cy + 8} fill="rgba(255,255,255,0.4)" fontSize={8} textAnchor="middle" fontFamily="monospace" letterSpacing={1}>
        EARTHS NEEDED
      </text>
    </svg>
  );
}

// Helper to describe SVG arc path
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(cx: number, cy: number, r: number, angleInDegrees: number) {
  const rad = (angleInDegrees * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

export default function ImpactHero({
  profile,
  metrics,
  recommendations,
  onTabSwitch,
}: ImpactHeroProps) {
  const topRec = recommendations[0] ?? null;
  const statusColor = metrics.earths_needed <= 1 ? '#00ff88' : metrics.earths_needed <= 2 ? '#ffff00' : '#ff0040';
  const isOver = metrics.pct_above_global_avg > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        position: 'relative',
        borderRadius: '1rem',
        padding: '1.5rem',
        background: 'linear-gradient(135deg, rgba(0,6,18,0.98) 0%, rgba(6,0,20,0.98) 100%)',
        border: '1px solid rgba(0,240,255,0.18)',
        boxShadow: '0 0 50px rgba(0,0,0,0.6), 0 0 80px rgba(0,240,255,0.04), inset 0 0 60px rgba(0,0,0,0.4)',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse 70% 50% at 20% 0%, rgba(0,240,255,0.05) 0%, transparent 65%),' +
            'radial-gradient(ellipse 50% 40% at 80% 100%, rgba(191,0,255,0.04) 0%, transparent 65%)',
        }}
      />

      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1.5rem', alignItems: 'center' }}>
        {/* Left: Impact Score */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <div style={{ fontSize: '0.6rem', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>
            YOUR CARBON FOOTPRINT
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginBottom: '0.75rem' }}>
            <span
              style={{
                fontSize: '2.5rem',
                fontWeight: 900,
                fontFamily: 'monospace',
                color: '#ff0040',
                textShadow: '0 0 20px rgba(255,0,64,0.6), 0 0 40px rgba(255,0,64,0.3)',
                lineHeight: 1,
              }}
            >
              {metrics.total_co2e_tonnes.toFixed(1)}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
              t CO2e/yr
            </span>
          </div>

          {/* Overshoot Day */}
          {metrics.overshoot_day !== 'never' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <motion.div
                animate={{ opacity: [1, 0.35, 1], scale: [1, 1.3, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#ff0040',
                  boxShadow: '0 0 8px #ff0040',
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ fontSize: '0.55rem', fontWeight: 900, letterSpacing: '0.15em', color: '#ff0040', textTransform: 'uppercase' }}>
                  Your Overshoot Day
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, fontFamily: 'monospace', color: '#ff0040', textShadow: '0 0 8px rgba(255,0,64,0.5)' }}>
                  {metrics.overshoot_day}
                </div>
              </div>
            </div>
          )}

          {/* Global comparison */}
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
            You consume{' '}
            <span style={{ color: isOver ? '#ff6b00' : '#00ff88', fontWeight: 700, fontFamily: 'monospace' }}>
              {isOver ? `${Math.abs(metrics.pct_above_global_avg).toFixed(0)}% more` : `${Math.abs(metrics.pct_above_global_avg).toFixed(0)}% less`}
            </span>{' '}
            than the global average
          </div>
        </motion.div>

        {/* Center: Gauge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          <PlanetaryGauge earthsNeeded={metrics.earths_needed} />
        </motion.div>

        {/* Right: Quick Action + Confidence */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
        >
          {topRec && (
            <div
              style={{
                borderRadius: '0.75rem',
                padding: '0.75rem',
                background: 'rgba(0,255,136,0.06)',
                border: '1px solid rgba(0,255,136,0.2)',
              }}
            >
              <div style={{ fontSize: '0.55rem', fontWeight: 900, letterSpacing: '0.15em', color: 'rgba(0,255,136,0.6)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                TOP ACTION
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>{topRec.icon}</span>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'white' }}>{topRec.title}</div>
                  <div style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: '#00ff88', textShadow: '0 0 6px rgba(0,255,136,0.5)' }}>
                    -{Math.abs(topRec.delta_co2e_kg / 1000).toFixed(1)}t CO2e/yr
                  </div>
                </div>
              </div>
              {onTabSwitch && (
                <button
                  onClick={() => onTabSwitch('action')}
                  style={{
                    marginTop: '0.5rem',
                    width: '100%',
                    padding: '0.35rem',
                    borderRadius: '0.4rem',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    background: 'rgba(0,240,255,0.08)',
                    border: '1px solid rgba(0,240,255,0.25)',
                    color: '#00f0ff',
                    cursor: 'pointer',
                  }}
                >
                  SEE ALL ACTIONS
                </button>
              )}
            </div>
          )}

          {/* Confidence */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.55rem', fontWeight: 900, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>
              PROFILE ACCURACY
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'monospace', color: '#00f0ff', textShadow: '0 0 8px rgba(0,240,255,0.5)' }}>
              {Math.round(profile.confidence * 100)}%
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
