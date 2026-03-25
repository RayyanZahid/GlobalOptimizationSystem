'use client';

import { motion } from 'framer-motion';
import { ElementalProfile } from '@/lib/types';
import { formatMass } from '@/lib/estimation-engine';

interface ComparisonViewProps {
  profile: ElementalProfile;
  nationalAvg: ElementalProfile;
  globalAvg: ElementalProfile;
  sustainableTarget?: ElementalProfile;
}

interface BarSeries {
  label: string;
  color: string;
  glowColor: string;
  dimColor: string;
}

const SERIES: BarSeries[] = [
  { label: 'You',         color: '#00f0ff', glowColor: 'rgba(0,240,255,0.5)', dimColor: 'rgba(0,240,255,0.15)' },
  { label: 'National Avg',color: '#ff6b00', glowColor: 'rgba(255,107,0,0.4)', dimColor: 'rgba(255,107,0,0.12)' },
  { label: 'Global Avg',  color: '#bf00ff', glowColor: 'rgba(191,0,255,0.4)', dimColor: 'rgba(191,0,255,0.12)' },
  { label: 'Target',      color: '#00ff88', glowColor: 'rgba(0,255,136,0.5)', dimColor: 'rgba(0,255,136,0.12)' },
];

interface Metric {
  key: string;
  label: string;
  unit: string;
  getValue: (p: ElementalProfile) => number;
  formatValue: (v: number) => string;
}

const METRICS: Metric[] = [
  {
    key: 'throughput',
    label: 'Annual Material Throughput',
    unit: 'tonnes/yr',
    getValue: (p) => p.annualThroughput_tonnes,
    formatValue: (v) => `${v.toLocaleString(undefined, { maximumFractionDigits: 1 })} t`,
  },
  {
    key: 'biomass',
    label: 'Biomass Consumption',
    unit: 'kg/yr',
    getValue: (p) => p.flows.inbound.biomass ?? 0,
    formatValue: (v) => formatMass(v),
  },
  {
    key: 'metals',
    label: 'Metal Consumption',
    unit: 'kg/yr',
    getValue: (p) => p.flows.inbound.metals ?? 0,
    formatValue: (v) => formatMass(v),
  },
  {
    key: 'fossil_fuels',
    label: 'Fossil Fuel Use',
    unit: 'kg/yr',
    getValue: (p) => p.flows.inbound.fossil_fuels ?? 0,
    formatValue: (v) => formatMass(v),
  },
  {
    key: 'co2e',
    label: 'Carbon Footprint (CO₂e)',
    unit: 'tonnes/yr',
    getValue: (p) => (p.carbon?.total_co2e_kg_per_year ?? 0) / 1000,
    formatValue: (v) => `${v.toFixed(1)} t CO₂e`,
  },
];

interface MetricRowProps {
  metric: Metric;
  values: number[];
  maxValue: number;
  rowIndex: number;
}

function MetricRow({ metric, values, maxValue, rowIndex }: MetricRowProps) {
  return (
    <motion.div
      className="flex flex-col gap-2"
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: rowIndex * 0.1 }}
    >
      {/* Metric label */}
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-semibold tracking-widest uppercase"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          {metric.label}
        </span>
      </div>

      {/* Bars */}
      <div className="flex flex-col gap-1.5">
        {SERIES.map((series, seriesIdx) => {
          const val = values[seriesIdx];
          const pct = maxValue > 0 ? Math.max((val / maxValue) * 100, 0) : 0;
          const isYou = seriesIdx === 0;
          const formattedVal = metric.formatValue(val);

          return (
            <div key={series.label} className="flex items-center gap-2">
              {/* Series name */}
              <span
                className="text-xs font-mono flex-shrink-0"
                style={{
                  color: isYou ? series.color : 'rgba(255,255,255,0.35)',
                  width: '80px',
                  fontWeight: isYou ? 700 : 400,
                }}
              >
                {series.label}
              </span>

              {/* Bar track */}
              <div
                className="relative flex-1 rounded-full overflow-hidden"
                style={{ height: isYou ? '10px' : '7px', background: 'rgba(255,255,255,0.05)' }}
              >
                <motion.div
                  className="absolute top-0 left-0 h-full rounded-full"
                  style={{
                    background: isYou
                      ? `linear-gradient(90deg, ${series.color}99, ${series.color})`
                      : `linear-gradient(90deg, ${series.dimColor}, ${series.color}55)`,
                    boxShadow: isYou ? `0 0 10px ${series.glowColor}` : 'none',
                  }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${pct}%` }}
                  transition={{
                    duration: 1.0,
                    delay: rowIndex * 0.1 + seriesIdx * 0.08,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                />
              </div>

              {/* Value label */}
              <motion.span
                className="text-xs font-mono flex-shrink-0"
                style={{
                  color: isYou ? series.color : 'rgba(255,255,255,0.3)',
                  minWidth: '80px',
                  textAlign: 'right',
                  fontWeight: isYou ? 700 : 400,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: rowIndex * 0.1 + seriesIdx * 0.08 + 0.7 }}
              >
                {formattedVal}
              </motion.span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

export default function ComparisonView({ profile, nationalAvg, globalAvg, sustainableTarget }: ComparisonViewProps) {
  const profiles = sustainableTarget
    ? [profile, nationalAvg, globalAvg, sustainableTarget]
    : [profile, nationalAvg, globalAvg];

  return (
    <div
      className="relative rounded-2xl p-6 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(0,6,20,0.97) 0%, rgba(10,0,20,0.97) 100%)',
        border: '1px solid rgba(0,240,255,0.15)',
        boxShadow: '0 0 50px rgba(0,0,0,0.6), inset 0 0 80px rgba(0,0,0,0.3)',
      }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 20% 50%, rgba(0,240,255,0.04) 0%, transparent 60%)',
        }}
      />

      {/* Header */}
      <div className="relative mb-6">
        <motion.h3
          className="text-base font-black tracking-[0.2em] uppercase mb-1"
          style={{ color: '#ffffff' }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          How You Compare
        </motion.h3>
        <motion.p
          className="text-xs tracking-wide"
          style={{ color: 'rgba(255,255,255,0.35)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          Material consumption vs. national and global averages
        </motion.p>
      </div>

      {/* Legend */}
      <motion.div
        className="relative flex items-center gap-4 mb-5 pb-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        {SERIES.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{
                background: s.color,
                boxShadow: `0 0 6px ${s.glowColor}`,
              }}
            />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {s.label}
            </span>
          </div>
        ))}
      </motion.div>

      {/* Metrics */}
      <div className="relative flex flex-col gap-5">
        {METRICS.map((metric, rowIdx) => {
          const values = profiles.map((p) => metric.getValue(p));
          const maxValue = Math.max(...values, 1);

          return (
            <MetricRow
              key={metric.key}
              metric={metric}
              values={values}
              maxValue={maxValue}
              rowIndex={rowIdx}
            />
          );
        })}
      </div>

      {/* Summary callout */}
      <motion.div
        className="relative mt-6 rounded-xl p-3 flex items-center gap-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        style={{
          background: 'linear-gradient(135deg, rgba(0,240,255,0.06), rgba(0,240,255,0.02))',
          border: '1px solid rgba(0,240,255,0.14)',
        }}
      >
        {(() => {
          const you = profile.annualThroughput_tonnes;
          const global = globalAvg.annualThroughput_tonnes;
          const ratio = global > 0 ? you / global : 1;
          const pctMore = ((ratio - 1) * 100).toFixed(0);
          const isAbove = ratio >= 1;

          return (
            <>
              <div
                className="w-1 self-stretch rounded-full flex-shrink-0"
                style={{ background: isAbove ? '#ff6b00' : '#00ff88' }}
              />
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Your throughput is{' '}
                <span
                  className="font-bold"
                  style={{ color: isAbove ? '#ff6b00' : '#00ff88' }}
                >
                  {isAbove ? `${pctMore}% above` : `${Math.abs(Number(pctMore))}% below`}
                </span>{' '}
                the global average of{' '}
                <span style={{ color: '#bf00ff' }}>
                  {globalAvg.annualThroughput_tonnes.toLocaleString(undefined, { maximumFractionDigits: 1 })} t/yr
                </span>
                .
              </p>
            </>
          );
        })()}
      </motion.div>
    </div>
  );
}
