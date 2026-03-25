'use client';

import { motion } from 'framer-motion';
import { Recommendation } from '@/lib/recommendations';
import { formatMass } from '@/lib/estimation-engine';

interface RecommendationsViewProps {
  recommendations: Recommendation[];
  baselineCarbon: { total_co2e_kg_per_year: number };
  onFindSwaps?: (category: string) => void;
}

function formatCarbonDelta(delta_co2e_kg: number): string {
  const abs = Math.abs(delta_co2e_kg);
  const tonnes = abs / 1000;
  return `-${tonnes.toFixed(1)} t CO\u2082e/yr`;
}

export default function RecommendationsView({
  recommendations,
  baselineCarbon,
  onFindSwaps,
}: RecommendationsViewProps) {
  if (recommendations.length === 0) {
    return (
      <div
        className="relative rounded-2xl p-8 flex flex-col items-center justify-center gap-4"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid rgba(0,255,136,0.2)',
          boxShadow: '0 0 40px rgba(0,0,0,0.5)',
        }}
      >
        <span style={{ fontSize: '3rem', lineHeight: 1 }}>&#10003;</span>
        <p
          className="text-base font-semibold tracking-wide text-center"
          style={{ color: 'var(--neon-green)' }}
        >
          You&apos;re already at the optimal configuration
        </p>
      </div>
    );
  }

  const totalDeltaKg = recommendations.reduce(
    (sum, r) => sum + r.delta_co2e_kg,
    0,
  );
  const totalDeltaTonnes = Math.abs(totalDeltaKg) / 1000;
  const totalPct =
    baselineCarbon.total_co2e_kg_per_year > 0
      ? (Math.abs(totalDeltaKg) / baselineCarbon.total_co2e_kg_per_year) * 100
      : 0;

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, rgba(6,6,20,0.98) 0%, rgba(13,13,32,0.98) 100%)',
        border: '1px solid rgba(0,255,136,0.12)',
        boxShadow: '0 0 60px rgba(0,0,0,0.6), inset 0 0 80px rgba(0,0,0,0.3)',
      }}
    >
      {/* Background radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(0,255,136,0.05) 0%, transparent 70%)',
        }}
      />

      {/* Header */}
      <div className="relative px-6 pt-6 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <motion.h3
          className="text-base font-black tracking-[0.2em] uppercase mb-1"
          style={{ color: '#ffffff' }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Actions to Reach Planetary Limits
        </motion.h3>
        <motion.p
          className="text-xs tracking-wide"
          style={{ color: 'var(--text-muted)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          Ranked by carbon impact
        </motion.p>
      </div>

      {/* Recommendation cards */}
      <div className="relative flex flex-col divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        {recommendations.map((rec, idx) => {
          const isFirst = idx === 0;
          const barWidth = Math.min(rec.pct_reduction, 100);
          const deltaTonnes = Math.abs(rec.delta_co2e_kg) / 1000;
          const pctLabel = rec.pct_reduction.toFixed(0);

          return (
            <motion.div
              key={rec.id}
              className="relative flex items-start gap-4 px-6 py-5"
              style={{
                background: isFirst
                  ? 'linear-gradient(90deg, rgba(0,255,136,0.04) 0%, transparent 60%)'
                  : undefined,
              }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 + idx * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {/* Category icon */}
              <div
                className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {rec.icon}
              </div>

              {/* Center content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span
                    className="text-sm font-bold tracking-wide"
                    style={{ color: '#ffffff' }}
                  >
                    {rec.title}
                  </span>
                  {isFirst && (
                    <span
                      className="text-[10px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded"
                      style={{
                        color: '#000000',
                        background: '#ffff00',
                        boxShadow: '0 0 8px rgba(255,255,0,0.6)',
                        letterSpacing: '0.12em',
                      }}
                    >
                      Highest Impact
                    </span>
                  )}
                </div>

                <p
                  className="text-xs mb-3 leading-relaxed"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {rec.description}
                </p>

                {/* Progress bar — % of total footprint eliminated */}
                <div className="flex items-center gap-2">
                  <div
                    className="flex-1 rounded-full overflow-hidden"
                    style={{ height: '6px', background: 'rgba(255,255,255,0.07)' }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: '#00ff88',
                        boxShadow: '0 0 8px rgba(0,255,136,0.7), 0 0 16px rgba(0,255,136,0.35)',
                      }}
                      initial={{ width: '0%' }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{
                        duration: 1.0,
                        delay: 0.2 + idx * 0.08,
                        ease: [0.25, 0.46, 0.45, 0.94],
                      }}
                    />
                  </div>
                  <span
                    className="text-[11px] font-mono flex-shrink-0"
                    style={{ color: 'rgba(0,255,136,0.55)', minWidth: '36px' }}
                  >
                    {pctLabel}%
                  </span>
                </div>

                {/* Material delta if meaningful */}
                {Math.abs(rec.delta_material_tonnes) >= 0.1 && (
                  <p
                    className="text-[11px] mt-1.5 font-mono"
                    style={{ color: 'rgba(255,255,255,0.25)' }}
                  >
                    {formatMass(Math.abs(rec.delta_material_tonnes) * 1000)} material saved/yr
                  </p>
                )}
              </div>

              {/* Right: CO2 delta + Find Swaps */}
              <div className="flex-shrink-0 text-right">
                <motion.div
                  className="text-sm font-black font-mono"
                  style={{
                    color: '#00ff88',
                    textShadow: '0 0 10px rgba(0,255,136,0.6)',
                    letterSpacing: '-0.01em',
                  }}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.25 + idx * 0.08 }}
                >
                  -{deltaTonnes.toFixed(1)} t CO&#x2082;e/yr
                </motion.div>
                <motion.div
                  className="text-xs font-mono mt-0.5"
                  style={{ color: 'rgba(0,255,136,0.5)' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.35 + idx * 0.08 }}
                >
                  (-{pctLabel}%)
                </motion.div>
                {onFindSwaps && (
                  <motion.button
                    onClick={() => onFindSwaps(rec.category)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="mt-2 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase"
                    style={{
                      background: 'rgba(0,240,255,0.08)',
                      border: '1px solid rgba(0,240,255,0.3)',
                      color: '#00f0ff',
                      cursor: 'pointer',
                    }}
                  >
                    Find Swaps
                  </motion.button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Summary box */}
      <motion.div
        className="relative mx-6 mb-6 mt-4 rounded-xl p-4 flex items-center gap-4"
        style={{
          background: 'linear-gradient(135deg, rgba(0,255,136,0.07), rgba(0,255,136,0.02))',
          border: '1px solid rgba(0,255,136,0.2)',
          boxShadow: 'inset 0 0 30px rgba(0,255,136,0.03)',
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 + recommendations.length * 0.08 }}
      >
        <div
          className="w-1 self-stretch rounded-full flex-shrink-0"
          style={{ background: '#00ff88', boxShadow: '0 0 8px rgba(0,255,136,0.8)' }}
        />
        <div className="flex-1 min-w-0">
          <p
            className="text-[11px] font-semibold tracking-widest uppercase mb-1"
            style={{ color: 'rgba(0,255,136,0.6)' }}
          >
            If you made ALL these changes
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Total reduction:{' '}
            <span
              className="font-black font-mono text-sm"
              style={{ color: '#00ff88', textShadow: '0 0 10px rgba(0,255,136,0.5)' }}
            >
              -{totalDeltaTonnes.toFixed(1)} t CO&#x2082;e/yr
            </span>
            <span
              className="font-mono ml-1.5"
              style={{ color: 'rgba(0,255,136,0.55)' }}
            >
              (-{totalPct.toFixed(0)}%)
            </span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
