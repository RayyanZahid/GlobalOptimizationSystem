'use client';

import { useState, useCallback, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatMass } from '@/lib/estimation-engine';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ProductResult {
  name: string;
  total_mass_kg: number;
  carbon_kg_co2e: number;
  description: string;
  elements: Record<string, number>;
  materials: Record<string, number>;
}

interface ProductScannerProps {
  onProductScanned?: (product: ProductResult) => void;
}

// ── Element category color mapping ───────────────────────────────────────────

const METALS = new Set([
  'Li','Na','K','Rb','Cs','Fr',
  'Be','Mg','Ca','Sr','Ba','Ra',
  'Al','Ga','In','Sn','Tl','Pb','Bi',
  'Fe','Cu','Zn','Mn','Cr','Ni','Co','Mo','W','Au','Ag','Pt','Ti','V',
  'Sc','Y','Zr','Nb','Tc','Ru','Rh','Pd','Cd','Hf','Ta','Re','Os','Ir','Hg',
]);
const METALLOIDS = new Set(['B','Si','Ge','As','Sb','Te','Po','At']);
const NONMETALS  = new Set(['H','C','N','O','P','S','Se','F','Cl','Br','I']);
const NOBLES     = new Set(['He','Ne','Ar','Kr','Xe','Rn']);

function elementColor(symbol: string): string {
  if (METALS.has(symbol))     return '#ff6b00'; // orange
  if (METALLOIDS.has(symbol)) return '#c084fc'; // purple
  if (NOBLES.has(symbol))     return '#facc15'; // yellow
  if (NONMETALS.has(symbol))  return '#00f0ff'; // cyan
  return '#00ff88';                              // green (lanthanides / actinides)
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SearchIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function SpinnerRing() {
  return (
    <motion.div
      className="rounded-full border-2"
      style={{
        width: 40,
        height: 40,
        borderColor: 'rgba(0,240,255,0.2)',
        borderTopColor: '#00f0ff',
      }}
      animate={{ rotate: 360 }}
      transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
    />
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="flex flex-col gap-1 rounded-xl px-4 py-3 flex-1"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${color}33`,
      }}
    >
      <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>
        {label}
      </span>
      <span className="text-lg font-black font-mono" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

function ElementPill({ symbol, mass }: { symbol: string; mass: number }) {
  const color = elementColor(symbol);
  return (
    <motion.div
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
      style={{
        background: `${color}14`,
        border: `1px solid ${color}44`,
        boxShadow: `0 0 8px ${color}22`,
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <span className="text-xs font-black font-mono" style={{ color }}>
        {symbol}
      </span>
      <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>
        {formatMass(mass)}
      </span>
    </motion.div>
  );
}

function MaterialBar({
  name,
  mass,
  maxMass,
  index,
}: {
  name: string;
  mass: number;
  maxMass: number;
  index: number;
}) {
  const pct = maxMass > 0 ? (mass / maxMass) * 100 : 0;
  const color = '#00f0ff';

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold capitalize tracking-wide" style={{ color: 'rgba(255,255,255,0.65)' }}>
          {name.replace(/_/g, ' ')}
        </span>
        <span className="text-xs font-mono" style={{ color }}>
          {formatMass(mass)}
        </span>
      </div>
      <div
        className="rounded-full overflow-hidden"
        style={{ height: 6, background: 'rgba(255,255,255,0.06)' }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${color}cc, ${color})`,
            boxShadow: `0 0 8px ${color}88`,
          }}
          initial={{ width: '0%' }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, delay: index * 0.08, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProductScanner({ onProductScanned }: ProductScannerProps) {
  const [query, setQuery]     = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<ProductResult | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  const handleScan = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/product-scan?product=${encodeURIComponent(trimmed)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const data: ProductResult = await res.json();
      setResult(data);
      onProductScanned?.(data);
    } catch (e) {
      setError('Could not analyze this product. Try another.');
    } finally {
      setLoading(false);
    }
  }, [query, loading, onProductScanned]);

  const handleKey = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleScan();
    },
    [handleScan],
  );

  // Sort elements and materials by mass descending
  const sortedElements  = result ? Object.entries(result.elements).sort(([, a], [, b]) => b - a)  : [];
  const sortedMaterials = result ? Object.entries(result.materials).sort(([, a], [, b]) => b - a) : [];
  const maxMaterialMass = sortedMaterials.length > 0 ? sortedMaterials[0][1] : 1;

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Search bar */}
      <div className="relative flex items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="What's it made of? Try 'iPhone 15' or 'cup of coffee'"
          disabled={loading}
          className="w-full rounded-xl px-4 py-3 pr-12 text-sm font-medium outline-none transition-all duration-200"
          style={{
            background: 'rgba(0,12,24,0.8)',
            border: `1.5px solid ${focused ? '#00f0ff' : 'rgba(0,240,255,0.2)'}`,
            boxShadow: focused ? '0 0 0 3px rgba(0,240,255,0.12), 0 0 20px rgba(0,240,255,0.08)' : 'none',
            color: '#ffffff',
            caretColor: '#00f0ff',
          }}
        />
        <button
          onClick={handleScan}
          disabled={loading || !query.trim()}
          className="absolute right-3 flex items-center justify-center rounded-lg w-7 h-7 transition-all duration-150"
          style={{
            color: query.trim() ? '#00f0ff' : 'rgba(255,255,255,0.2)',
            cursor: query.trim() ? 'pointer' : 'default',
          }}
          aria-label="Scan product"
        >
          <SearchIcon size={17} />
        </button>
      </div>

      {/* Loading state */}
      <AnimatePresence>
        {loading && (
          <motion.div
            className="flex flex-col items-center gap-3 py-8"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <SpinnerRing />
            <span
              className="text-sm font-medium tracking-wide"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              Analyzing{' '}
              <span style={{ color: '#00f0ff' }}>{query.trim()}</span>
              {' '}…
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error state */}
      <AnimatePresence>
        {error && !loading && (
          <motion.div
            className="rounded-xl px-4 py-3 text-sm font-medium"
            style={{
              background: 'rgba(255,0,64,0.08)',
              border: '1px solid rgba(255,0,64,0.3)',
              color: '#ff6680',
            }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(0,12,24,0.97) 0%, rgba(0,20,16,0.97) 100%)',
              border: '1px solid rgba(0,240,255,0.18)',
              boxShadow: '0 0 40px rgba(0,240,255,0.06), inset 0 0 60px rgba(0,0,0,0.4)',
            }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {/* Ambient glow */}
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl"
              style={{
                background:
                  'radial-gradient(ellipse 70% 35% at 50% 0%, rgba(0,240,255,0.07) 0%, transparent 70%)',
              }}
            />

            <div className="relative p-6 flex flex-col gap-5">
              {/* Header */}
              <div>
                <motion.h2
                  className="text-xl font-black tracking-tight"
                  style={{ color: '#ffffff' }}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  {result.name}
                </motion.h2>
                <motion.p
                  className="text-sm mt-1 leading-relaxed"
                  style={{ color: 'rgba(255,255,255,0.45)' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  {result.description}
                </motion.p>
              </div>

              {/* Stat boxes */}
              <motion.div
                className="flex gap-3"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
              >
                <StatBox
                  label="Total Mass"
                  value={formatMass(result.total_mass_kg)}
                  color="#00f0ff"
                />
                <StatBox
                  label="Carbon Footprint"
                  value={`${result.carbon_kg_co2e.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg CO₂e`}
                  color="#ff6b00"
                />
              </motion.div>

              {/* Two-column breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Elements column */}
                <div>
                  <motion.h3
                    className="text-xs font-black tracking-[0.25em] uppercase mb-3"
                    style={{ color: '#00f0ff' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.35, delay: 0.2 }}
                  >
                    Elements
                  </motion.h3>
                  <motion.div
                    className="flex flex-wrap gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.25 }}
                  >
                    {sortedElements.map(([symbol, mass], i) => (
                      <motion.div
                        key={symbol}
                        initial={{ opacity: 0, scale: 0.75 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.25, delay: 0.25 + i * 0.04 }}
                      >
                        <ElementPill symbol={symbol} mass={mass} />
                      </motion.div>
                    ))}
                  </motion.div>
                </div>

                {/* Materials column */}
                <div>
                  <motion.h3
                    className="text-xs font-black tracking-[0.25em] uppercase mb-3"
                    style={{ color: '#ff6b00' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.35, delay: 0.2 }}
                  >
                    Materials
                  </motion.h3>
                  <motion.div
                    className="flex flex-col gap-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.25 }}
                  >
                    {sortedMaterials.map(([name, mass], i) => (
                      <MaterialBar
                        key={name}
                        name={name}
                        mass={mass}
                        maxMass={maxMaterialMass}
                        index={i}
                      />
                    ))}
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
