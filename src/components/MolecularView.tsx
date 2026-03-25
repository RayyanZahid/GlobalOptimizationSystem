'use client';

import { motion } from 'framer-motion';
import { MoleculeData, CarbonFootprint, MolecularComposition } from '@/lib/carbon';
import { formatMass } from '@/lib/estimation-engine';

interface MolecularViewProps {
  molecules: MolecularComposition;
  carbon: CarbonFootprint;
}

const SECTION_CONFIG: {
  key: MoleculeData['category'];
  label: string;
  accentColor: string;
}[] = [
  { key: 'emission',   label: 'ATMOSPHERIC EMISSIONS', accentColor: '#ff0040' },
  { key: 'biological', label: 'BIOLOGICAL MOLECULES',  accentColor: '#00ff88' },
  { key: 'mineral',    label: 'MINERAL COMPOUNDS',     accentColor: '#00f0ff' },
];

function StatBox({
  label,
  value,
  color,
  delay,
}: {
  label: string;
  value: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      className="flex-1 min-w-0 rounded-xl px-4 py-3 flex flex-col gap-1"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${color}33`,
        boxShadow: `0 0 16px ${color}11`,
      }}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
    >
      <span
        className="text-xs font-black tracking-[0.18em] uppercase"
        style={{ color: 'rgba(255,255,255,0.38)' }}
      >
        {label}
      </span>
      <span
        className="text-base font-mono font-bold truncate"
        style={{ color, textShadow: `0 0 10px ${color}88` }}
      >
        {value}
      </span>
    </motion.div>
  );
}

function MoleculeCard({
  molecule,
  maxMass,
  index,
}: {
  molecule: MoleculeData;
  maxMass: number;
  index: number;
}) {
  const barPct = maxMass > 0 ? (molecule.mass_kg_per_year / maxMass) * 100 : 0;
  const delay = 0.15 + index * 0.07;

  return (
    <motion.div
      className="relative rounded-xl overflow-hidden"
      style={{
        background: 'var(--bg-card, #0d0d20)',
        border: `1px solid ${molecule.color}22`,
        boxShadow: `0 0 20px ${molecule.color}0a`,
      }}
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
    >
      {/* Proportion bar — rendered behind content */}
      <motion.div
        className="absolute inset-y-0 left-0 pointer-events-none"
        style={{
          background: `linear-gradient(90deg, ${molecule.color}28, ${molecule.color}08)`,
        }}
        initial={{ width: '0%' }}
        animate={{ width: `${barPct}%` }}
        transition={{ duration: 0.8, delay: delay + 0.1, ease: 'easeOut' }}
      />

      {/* Card body */}
      <div className="relative flex items-center gap-4 px-4 py-3">
        {/* Formula + name */}
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <span
            className="text-xl font-black font-mono leading-none"
            style={{
              color: molecule.color,
              textShadow: `0 0 12px ${molecule.color}cc, 0 0 24px ${molecule.color}55`,
            }}
          >
            {molecule.formula}
          </span>
          <span
            className="text-xs tracking-wide truncate"
            style={{ color: 'var(--text-muted, rgba(255,255,255,0.45))' }}
          >
            {molecule.name}
          </span>
        </div>

        {/* Mass/year */}
        <motion.span
          className="text-xs font-mono font-semibold whitespace-nowrap"
          style={{ color: molecule.color }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, delay: delay + 0.25 }}
        >
          {formatMass(molecule.mass_kg_per_year)}/yr
        </motion.span>
      </div>
    </motion.div>
  );
}

function SectionGroup({
  category,
  label,
  accentColor,
  molecules,
  maxMass,
  baseIndex,
}: {
  category: MoleculeData['category'];
  label: string;
  accentColor: string;
  molecules: MoleculeData[];
  maxMass: number;
  baseIndex: number;
}) {
  const filtered = molecules.filter((m) => m.category === category);
  if (filtered.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {/* Section header */}
      <motion.div
        className="flex items-center gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 + baseIndex * 0.05 }}
      >
        <span
          className="text-xs font-black tracking-[0.22em] uppercase"
          style={{ color: accentColor, textShadow: `0 0 8px ${accentColor}66` }}
        >
          {label}
        </span>
        <div
          className="flex-1 h-px"
          style={{ background: `linear-gradient(90deg, ${accentColor}44, transparent)` }}
        />
        <span
          className="text-xs font-mono"
          style={{ color: 'rgba(255,255,255,0.25)' }}
        >
          {filtered.length}
        </span>
      </motion.div>

      {/* Cards */}
      <div className="flex flex-col gap-2">
        {filtered.map((mol, i) => (
          <MoleculeCard
            key={mol.formula}
            molecule={mol}
            maxMass={maxMass}
            index={baseIndex + i}
          />
        ))}
      </div>
    </div>
  );
}

export default function MolecularView({ molecules, carbon }: MolecularViewProps) {
  const allMolecules = molecules.molecules;
  const maxMass = allMolecules.length > 0
    ? Math.max(...allMolecules.map((m) => m.mass_kg_per_year))
    : 1;

  // Running index for staggered animation across all sections
  const sectionStartIndexes: Record<string, number> = {};
  let runningIndex = 0;
  for (const sec of SECTION_CONFIG) {
    sectionStartIndexes[sec.key] = runningIndex;
    runningIndex += allMolecules.filter((m) => m.category === sec.key).length;
  }

  return (
    <div
      className="relative rounded-2xl p-6 overflow-hidden flex flex-col gap-6"
      style={{
        background: 'linear-gradient(135deg, rgba(0,8,24,0.97) 0%, rgba(8,0,24,0.97) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 0 60px rgba(0,0,0,0.6), inset 0 0 80px rgba(0,0,0,0.3)',
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 35% at 50% 0%, rgba(255,0,64,0.07) 0%, transparent 70%)',
        }}
      />

      {/* ── Header ── */}
      <div className="relative flex flex-col gap-1">
        <motion.h3
          className="text-base font-black tracking-[0.25em] uppercase"
          style={{ color: 'var(--text-primary, #ffffff)' }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          Molecular Composition
        </motion.h3>
        <motion.div
          className="text-2xl font-black font-mono"
          style={{
            color: '#ff0040',
            textShadow: '0 0 18px #ff004099, 0 0 36px #ff004044',
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {formatMass(carbon.total_co2e_kg_per_year)}{' '}
          <span
            className="text-sm font-semibold tracking-widest"
            style={{ color: 'rgba(255,0,64,0.65)' }}
          >
            CO₂e / yr
          </span>
        </motion.div>
      </div>

      {/* ── Summary stat boxes ── */}
      <div className="relative flex gap-3">
        <StatBox
          label="Total CO₂e"
          value={formatMass(carbon.total_co2e_kg_per_year)}
          color="#ff0040"
          delay={0.2}
        />
        <StatBox
          label="CH₄"
          value={formatMass(carbon.breakdown.ch4_kg)}
          color="#ff6b00"
          delay={0.28}
        />
        <StatBox
          label="H₂O"
          value={formatMass(carbon.breakdown.h2o_kg)}
          color="#00f0ff"
          delay={0.36}
        />
      </div>

      {/* ── Grouped molecule sections ── */}
      <div className="relative flex flex-col gap-5">
        {SECTION_CONFIG.map((sec) => (
          <SectionGroup
            key={sec.key}
            category={sec.key}
            label={sec.label}
            accentColor={sec.accentColor}
            molecules={allMolecules}
            maxMass={maxMass}
            baseIndex={sectionStartIndexes[sec.key]}
          />
        ))}
      </div>
    </div>
  );
}
