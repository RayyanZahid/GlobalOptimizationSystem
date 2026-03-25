'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ElementalProfile, MaterialCategory } from '@/lib/types';
import { formatMass } from '@/lib/estimation-engine';

interface FlowDiagramProps {
  profile: ElementalProfile;
}

const CATEGORY_CONFIG: Record<MaterialCategory, { label: string; color: string; icon: string }> = {
  biomass:     { label: 'Biomass',     color: '#00ff88', icon: '🌿' },
  metals:      { label: 'Metals',      color: '#ff6b00', icon: '⚙️' },
  minerals:    { label: 'Minerals',    color: '#00f0ff', icon: '🪨' },
  fossil_fuels:{ label: 'Fossil Fuels',color: '#ff0040', icon: '🛢️' },
};

const CATEGORIES: MaterialCategory[] = ['biomass', 'metals', 'minerals', 'fossil_fuels'];

function FlowColumn({
  title,
  data,
  maxValue,
  align,
  unitLabel,
}: {
  title: string;
  data: Record<MaterialCategory, number>;
  maxValue: number;
  align: 'left' | 'right';
  unitLabel: string;
}) {
  return (
    <div className="flex-1 min-w-0">
      {/* Column header */}
      <div
        className="text-center mb-4 pb-2"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
      >
        <span
          className="text-xs font-black tracking-[0.25em] uppercase"
          style={{ color: align === 'left' ? '#00f0ff' : '#ff6b00' }}
        >
          {title}
        </span>
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-3">
        {CATEGORIES.map((cat, i) => {
          const cfg = CATEGORY_CONFIG[cat];
          const val = data[cat] ?? 0;
          const pct = maxValue > 0 ? (val / maxValue) * 100 : 0;

          return (
            <div key={cat} className="flex flex-col gap-1">
              {/* Category label */}
              <div className="flex items-center gap-1.5">
                <span className="text-sm leading-none">{cfg.icon}</span>
                <span
                  className="text-xs font-semibold tracking-wide uppercase truncate"
                  style={{ color: 'rgba(255,255,255,0.55)' }}
                >
                  {cfg.label}
                </span>
              </div>

              {/* Bar + value */}
              <div className="flex items-center gap-2">
                <div
                  className="relative flex-1 rounded-full overflow-hidden"
                  style={{ height: '8px', background: 'rgba(255,255,255,0.06)' }}
                >
                  <motion.div
                    className="absolute top-0 left-0 h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${cfg.color}cc, ${cfg.color})`,
                      boxShadow: `0 0 8px ${cfg.color}88`,
                    }}
                    initial={{ width: '0%' }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.9, delay: i * 0.12, ease: 'easeOut' }}
                  />
                </div>
                <motion.span
                  className="text-xs font-mono whitespace-nowrap"
                  style={{ color: cfg.color, minWidth: '72px', textAlign: 'right' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: i * 0.12 + 0.6 }}
                >
                  {formatMass(val)}{unitLabel}
                </motion.span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function FlowDiagram({ profile }: FlowDiagramProps) {
  const { flows, annualThroughput_tonnes } = profile;
  const [timeScale, setTimeScale] = useState<'year' | 'day' | 'hour'>('year');

  const divisor = timeScale === 'year' ? 1 : timeScale === 'day' ? 365 : 8760;
  const unitLabel = timeScale === 'year' ? '/yr' : timeScale === 'day' ? '/day' : '/hr';

  const scaledInbound = Object.fromEntries(
    CATEGORIES.map((c) => [c, (flows.inbound[c] ?? 0) / divisor])
  ) as Record<MaterialCategory, number>;

  const scaledOutbound = Object.fromEntries(
    CATEGORIES.map((c) => [c, (flows.outbound[c] ?? 0) / divisor])
  ) as Record<MaterialCategory, number>;

  // Unified max for proportional comparison across both columns
  const allValues = [
    ...CATEGORIES.map((c) => scaledInbound[c]),
    ...CATEGORIES.map((c) => scaledOutbound[c]),
  ];
  const maxValue = Math.max(...allValues, 1);

  const throughputDisplay = annualThroughput_tonnes / divisor;

  return (
    <div
      className="relative rounded-2xl p-6 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(0,12,24,0.95) 0%, rgba(0,24,12,0.95) 100%)',
        border: '1px solid rgba(0,240,255,0.18)',
        boxShadow: '0 0 40px rgba(0,240,255,0.06), inset 0 0 60px rgba(0,0,0,0.4)',
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(0,255,136,0.06) 0%, transparent 70%)',
        }}
      />

      {/* Header */}
      <div className="relative mb-4">
        <motion.h3
          className="text-base font-black tracking-[0.2em] uppercase mb-1"
          style={{ color: '#ffffff' }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Material Flows
        </motion.h3>
        <motion.p
          className="text-xs tracking-wide"
          style={{ color: 'rgba(255,255,255,0.4)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          Throughput:{' '}
          <span style={{ color: '#00f0ff' }}>
            {throughputDisplay.toLocaleString(undefined, { maximumFractionDigits: 3 })} tonnes{unitLabel}
          </span>
        </motion.p>
      </div>

      {/* Time scale toggle */}
      <div className="flex gap-2 mb-4">
        {(['year', 'day', 'hour'] as const).map(ts => (
          <button key={ts} onClick={() => setTimeScale(ts)}
            className={`px-3 py-1 rounded text-xs font-mono transition-all ${
              timeScale === ts ? 'bg-[rgba(0,240,255,0.15)] text-[var(--neon-cyan)]' : 'text-[var(--text-muted)]'
            }`}
          >{ts === 'year' ? 'ANNUAL' : ts === 'day' ? 'DAILY' : 'HOURLY'}</button>
        ))}
      </div>

      {/* Columns */}
      <div className="relative flex gap-4">
        <FlowColumn
          title="INBOUND"
          data={scaledInbound}
          maxValue={maxValue}
          align="left"
          unitLabel={unitLabel}
        />

        {/* Divider */}
        <div
          className="w-px self-stretch"
          style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.12), transparent)' }}
        />

        <FlowColumn
          title="OUTBOUND"
          data={scaledOutbound}
          maxValue={maxValue}
          align="right"
          unitLabel={unitLabel}
        />
      </div>

      {/* Net flow indicator */}
      <motion.div
        className="relative mt-5 pt-4 flex items-center justify-center gap-2"
        style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
          NET ACCUMULATION
        </span>
        <span className="text-xs font-mono font-bold" style={{ color: '#00ff88' }}>
          {formatMass(
            CATEGORIES.reduce(
              (sum, c) => sum + scaledInbound[c] - scaledOutbound[c],
              0
            )
          )}
          {unitLabel}
        </span>
      </motion.div>
    </div>
  );
}
