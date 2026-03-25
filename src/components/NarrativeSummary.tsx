'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ElementalProfile } from '@/lib/types';
import { Recommendation } from '@/lib/recommendations';
import { formatMass } from '@/lib/estimation-engine';

interface NarrativeSummaryProps {
  profile: ElementalProfile;
  recommendations: Recommendation[];
  sustainableTarget: ElementalProfile;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function overshootDay(targetThroughput: number, yourThroughput: number): string {
  if (yourThroughput <= 0) return 'never';
  const ratio = targetThroughput / yourThroughput;
  if (ratio >= 1) return 'never';
  const dayOfYear = Math.floor(365 * ratio);
  // dayOfYear is 0-indexed from Jan 1
  const date = new Date(2026, 0, 1); // use a non-leap year anchor
  date.setDate(date.getDate() + dayOfYear);
  const month = MONTH_NAMES[date.getMonth()];
  const day = date.getDate();
  return `${month} ${day}`;
}

function formatTonnes(t: number): string {
  if (t >= 1e9) return `${(t / 1e9).toFixed(2)} Gt`;
  if (t >= 1e6) return `${(t / 1e6).toFixed(2)} Mt`;
  if (t >= 1000) return `${(t / 1000).toFixed(1)} kt`;
  return `${t.toFixed(1)} t`;
}

// Colours matching the project's neon palette
const CYAN   = '#00f0ff';
const ORANGE = '#ff6b00';
const RED    = '#ff0040';
const GREEN  = '#00ff88';

interface NeonProps {
  color: string;
  children: React.ReactNode;
}

function Neon({ color, children }: NeonProps) {
  return (
    <span
      style={{
        color,
        fontWeight: 700,
        fontFamily: 'monospace',
        textShadow: `0 0 8px ${color}99`,
      }}
    >
      {children}
    </span>
  );
}

export default function NarrativeSummary({
  profile,
  recommendations,
  sustainableTarget,
}: NarrativeSummaryProps) {
  const flows = profile.flows.inbound;
  const carbon = profile.carbon;

  // Derive values
  const bodyWeight = profile.totalMass_kg;
  const throughput = profile.annualThroughput_tonnes;
  const biomass    = (flows.biomass   / 1000).toFixed(1);
  const metals     = (flows.metals    / 1000).toFixed(1);
  const minerals   = (flows.minerals  / 1000).toFixed(1);
  const fossilFuels = (flows.fossil_fuels / 1000).toFixed(1);

  const targetThroughput = sustainableTarget.annualThroughput_tonnes;
  const pctAboveTarget = targetThroughput > 0
    ? Math.round(((throughput - targetThroughput) / targetThroughput) * 100)
    : 0;

  const co2eTonnes = carbon ? (carbon.total_co2e_kg_per_year / 1000).toFixed(1) : '—';

  const topRec = recommendations[0] ?? null;

  // Body composition highlights (oxygen, carbon, hydrogen)
  const oxygenPct   = profile.composition['O']?.percentage?.toFixed(1)  ?? '65.0';
  const carbonPct   = profile.composition['C']?.percentage?.toFixed(1)  ?? '18.5';
  const hydrogenPct = profile.composition['H']?.percentage?.toFixed(1)  ?? '9.5';

  const overshootDate = useMemo(
    () => overshootDay(targetThroughput, throughput),
    [targetThroughput, throughput],
  );

  const isOverTarget = throughput > targetThroughput;

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
      {/* Ambient background glow */}
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

      {/* Header row */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <div
          style={{
            width: '6px',
            alignSelf: 'stretch',
            borderRadius: '9999px',
            background: `linear-gradient(180deg, ${CYAN}, #bf00ff)`,
            boxShadow: `0 0 12px ${CYAN}88`,
            flexShrink: 0,
          }}
        />
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: '0.7rem',
              fontWeight: 900,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.9)',
            }}
          >
            Narrative Summary
          </h2>
          <p style={{ margin: 0, fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>
            Auto-generated from your profile
          </p>
        </div>
      </div>

      {/* Main narrative paragraph */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        style={{
          position: 'relative',
          fontSize: '0.875rem',
          lineHeight: 1.75,
          color: 'rgba(255,255,255,0.75)',
          margin: 0,
          marginBottom: '1rem',
        }}
      >
        Your body contains{' '}
        <Neon color={CYAN}>{bodyWeight.toFixed(0)}kg</Neon>{' '}
        of matter —{' '}
        <Neon color={CYAN}>{oxygenPct}%</Neon> oxygen,{' '}
        <Neon color={CYAN}>{carbonPct}%</Neon> carbon,{' '}
        <Neon color={CYAN}>{hydrogenPct}%</Neon> hydrogen. But that&apos;s just the stock.
        Every year,{' '}
        <Neon color={ORANGE}>{formatTonnes(throughput)}</Neon>{' '}
        of material flows through your life —{' '}
        <Neon color={ORANGE}>{biomass}t</Neon> of biomass,{' '}
        <Neon color={ORANGE}>{metals}t</Neon> of metals,{' '}
        <Neon color={ORANGE}>{minerals}t</Neon> of minerals,{' '}
        <Neon color={ORANGE}>{fossilFuels}t</Neon> of fossil fuels.
        {isOverTarget ? (
          <>
            {' '}That&apos;s{' '}
            <Neon color={RED}>{pctAboveTarget}% above</Neon>{' '}
            the sustainable planetary limit of{' '}
            <Neon color={GREEN}>{formatTonnes(targetThroughput)}</Neon>{' '}
            per person.
          </>
        ) : (
          <>
            {' '}That&apos;s{' '}
            <Neon color={GREEN}>within</Neon>{' '}
            the sustainable planetary limit of{' '}
            <Neon color={GREEN}>{formatTonnes(targetThroughput)}</Neon>{' '}
            per person.
          </>
        )}
        {' '}Your carbon footprint is{' '}
        <Neon color={RED}>{co2eTonnes}t CO&#x2082;e/year</Neon>.
        {topRec && (
          <>
            {' '}The single biggest action you can take:{' '}
            <Neon color={GREEN}>{topRec.title}</Neon>{' '}
            (saving{' '}
            <Neon color={GREEN}>{Math.abs(topRec.delta_co2e_kg / 1000).toFixed(1)}t CO&#x2082;e/year</Neon>
            ).
          </>
        )}
      </motion.p>

      {/* Overshoot Day indicator */}
      {isOverTarget && overshootDate !== 'never' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          style={{
            position: 'relative',
            borderRadius: '0.75rem',
            padding: '0.75rem 1rem',
            background: `linear-gradient(135deg, ${RED}12, ${RED}06)`,
            border: `1px solid ${RED}30`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          {/* Pulsing dot */}
          <motion.div
            animate={{ opacity: [1, 0.35, 1], scale: [1, 1.3, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: RED,
              boxShadow: `0 0 10px ${RED}`,
              flexShrink: 0,
            }}
          />
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 900,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: RED,
                display: 'block',
                marginBottom: '0.15rem',
                textShadow: `0 0 8px ${RED}88`,
              }}
            >
              Your Overshoot Day
            </span>
            At your consumption rate, you exhaust your annual planetary share by{' '}
            <Neon color={RED}>{overshootDate}</Neon>.
          </p>
        </motion.div>
      )}

      {/* Key numbers strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.55 }}
        style={{
          position: 'relative',
          marginTop: '1rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '0.5rem',
        }}
      >
        {[
          { label: 'Body mass', value: formatMass(bodyWeight), color: CYAN },
          { label: 'Throughput/yr', value: formatTonnes(throughput), color: ORANGE },
          { label: 'Carbon', value: `${co2eTonnes}t CO₂e`, color: RED },
          { label: 'Target', value: formatTonnes(targetThroughput), color: GREEN },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              borderRadius: '0.5rem',
              padding: '0.5rem 0.6rem',
              background: `${item.color}0d`,
              border: `1px solid ${item.color}22`,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                fontFamily: 'monospace',
                color: item.color,
                textShadow: `0 0 6px ${item.color}77`,
                marginBottom: '0.15rem',
              }}
            >
              {item.value}
            </div>
            <div
              style={{
                fontSize: '0.6rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.3)',
              }}
            >
              {item.label}
            </div>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}
