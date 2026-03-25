'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatMass } from '@/lib/estimation-engine';
import { UserInputs } from '@/lib/types';

// ── Types ────────────────────────────────────────────────────────────────────

type Category = 'transport' | 'housing' | 'diet' | 'device';

interface MaterialMap {
  steel_kg?: number;
  aluminum_kg?: number;
  copper_kg?: number;
  lithium_kg?: number;
  plastic_kg?: number;
  [key: string]: number | undefined;
}

interface CurrentItem {
  name: string;
  materials: MaterialMap;
  annual_co2e_kg: number;
  planetary_status: 'over' | 'at' | 'under';
  overshoot_ratio: number;
}

interface SwapOption {
  name: string;
  description: string;
  estimated_cost: string;
  materials: MaterialMap;
  annual_co2e_kg: number;
  co2e_delta_kg: number;
  co2e_reduction_pct: number;
  planetary_status: 'over' | 'at' | 'under';
  overshoot_ratio: number;
  tradeoffs: string[];
  recommendation: 'best_planetary' | 'best_cost' | 'keep_current';
}

interface SwapResult {
  current: CurrentItem;
  swaps: SwapOption[];
}

interface MarketplaceProps {
  initialCategory?: string | null;
  initialQuery?: string;
  userInputs?: UserInputs;
}

// ── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: { id: Category; label: string; icon: string }[] = [
  { id: 'transport', label: 'Transport', icon: '🚗' },
  { id: 'housing', label: 'Housing', icon: '🏠' },
  { id: 'diet', label: 'Diet', icon: '🌿' },
  { id: 'device', label: 'Devices', icon: '📱' },
];

const PLACEHOLDERS: Record<Category, string> = {
  transport: 'e.g., 2019 Toyota Camry, 12000 miles/year',
  housing: 'e.g., 3-bed house, 1800 sqft, gas heating',
  diet: 'e.g., eat meat 5 days/week, mostly chicken and beef',
  device: 'e.g., iPhone 14, MacBook Pro 2022, iPad Air',
};

// Material color palette
const MATERIAL_COLORS: Record<string, string> = {
  steel_kg: '#ff6b00',
  aluminum_kg: '#00f0ff',
  copper_kg: '#ff9900',
  lithium_kg: '#00ff88',
  plastic_kg: '#b000ff',
  glass_kg: '#88ccff',
  rubber_kg: '#888888',
  cobalt_kg: '#ff4488',
  silicon_kg: '#aaddff',
  wood_kg: '#aa7744',
};

const MATERIAL_LABELS: Record<string, string> = {
  steel_kg: 'Steel',
  aluminum_kg: 'Alum.',
  copper_kg: 'Cu',
  lithium_kg: 'Li',
  plastic_kg: 'Plastic',
  glass_kg: 'Glass',
  rubber_kg: 'Rubber',
  cobalt_kg: 'Co',
  silicon_kg: 'Si',
  wood_kg: 'Wood',
};

// ── Helper components ─────────────────────────────────────────────────────────

function MaterialPills({ materials }: { materials: MaterialMap }) {
  const entries = Object.entries(materials).filter(([, v]) => v != null && (v as number) > 0);
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {entries.map(([key, val]) => {
        const color = MATERIAL_COLORS[key] ?? '#888888';
        const label = MATERIAL_LABELS[key] ?? key.replace('_kg', '');
        const displayVal = (val as number) >= 1 ? `${(val as number).toFixed(0)} kg` : `${((val as number) * 1000).toFixed(0)} g`;

        return (
          <span
            key={key}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold"
            style={{
              background: `${color}18`,
              border: `1px solid ${color}55`,
              color,
            }}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: color, boxShadow: `0 0 4px ${color}` }}
            />
            {label} {displayVal}
          </span>
        );
      })}
    </div>
  );
}

function PlanetaryStatusBadge({
  status,
  ratio,
}: {
  status: 'over' | 'at' | 'under';
  ratio: number;
}) {
  const config = {
    over: { emoji: '🔴', color: '#ff0040', label: `${ratio.toFixed(1)}x over limit` },
    at: { emoji: '🟡', color: '#ffff00', label: 'At planetary limit' },
    under: { emoji: '🟢', color: '#00ff88', label: 'Within limits' },
  }[status];

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-mono font-bold"
      style={{
        background: `${config.color}15`,
        border: `1px solid ${config.color}44`,
        color: config.color,
      }}
    >
      {config.emoji} {config.label}
    </span>
  );
}

function MaterialDelta({ current, swap }: { current: MaterialMap; swap: MaterialMap }) {
  const allKeys = new Set([...Object.keys(current), ...Object.keys(swap)]);
  const deltas: { key: string; delta: number; pct: number }[] = [];

  allKeys.forEach((key) => {
    const cur = (current[key] ?? 0) as number;
    const swp = (swap[key] ?? 0) as number;
    const delta = swp - cur;
    const pct = cur > 0 ? (delta / cur) * 100 : swp > 0 ? 100 : 0;
    if (Math.abs(delta) > 0.001) {
      deltas.push({ key, delta, pct });
    }
  });

  if (deltas.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {deltas.map(({ key, delta, pct }) => {
        const isIncrease = delta > 0;
        const color = isIncrease ? '#ff0040' : '#00ff88';
        const label = MATERIAL_LABELS[key] ?? key.replace('_kg', '');
        const absKg = Math.abs(delta);
        const displayVal = absKg >= 1 ? `${absKg.toFixed(0)} kg` : `${(absKg * 1000).toFixed(0)} g`;

        return (
          <span
            key={key}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono"
            style={{
              background: `${color}12`,
              border: `1px solid ${color}33`,
              color,
            }}
          >
            {isIncrease ? '+' : '-'}{displayVal} {label}
          </span>
        );
      })}
    </div>
  );
}

function RecommendationBadge({ type }: { type: SwapOption['recommendation'] }) {
  const config = {
    best_planetary: {
      label: 'BEST FOR PLANET',
      color: '#00ff88',
      bg: 'rgba(0,255,136,0.12)',
      border: 'rgba(0,255,136,0.4)',
      glow: 'rgba(0,255,136,0.5)',
    },
    best_cost: {
      label: 'BEST VALUE',
      color: '#00f0ff',
      bg: 'rgba(0,240,255,0.12)',
      border: 'rgba(0,240,255,0.4)',
      glow: 'rgba(0,240,255,0.5)',
    },
    keep_current: {
      label: 'KEEP CURRENT',
      color: '#ffff00',
      bg: 'rgba(255,255,0,0.10)',
      border: 'rgba(255,255,0,0.4)',
      glow: 'rgba(255,255,0,0.4)',
    },
  }[type];

  return (
    <span
      className="inline-block text-[10px] font-black tracking-widest uppercase px-2 py-1 rounded"
      style={{
        color: config.color,
        background: config.bg,
        border: `1px solid ${config.border}`,
        boxShadow: `0 0 10px ${config.glow}`,
        letterSpacing: '0.12em',
      }}
    >
      {config.label}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Marketplace({ initialCategory, initialQuery, userInputs }: MarketplaceProps) {
  const [category, setCategory] = useState<Category>('transport');
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SwapResult | null>(null);

  // Sync initial values from props
  useEffect(() => {
    if (initialCategory && ['transport', 'housing', 'diet', 'device'].includes(initialCategory)) {
      setCategory(initialCategory as Category);
    }
  }, [initialCategory]);

  useEffect(() => {
    if (initialQuery) setInputValue(initialQuery);
  }, [initialQuery]);

  // Build profile-based suggestions
  const suggestions: { label: string; cat: Category; query: string }[] = [];
  if (userInputs) {
    if (userInputs.transport === 'car' || userInputs.transport === 'suv') {
      suggestions.push({ label: 'Analyze your car', cat: 'transport', query: userInputs.transport === 'suv' ? 'SUV, 15000 miles/year' : 'Sedan, 12000 miles/year' });
    }
    if (userInputs.housing === 'house' || userInputs.housing === 'large_house') {
      suggestions.push({ label: 'Analyze your home', cat: 'housing', query: userInputs.housing === 'large_house' ? '4-bed house, 2500 sqft, gas heating' : '3-bed house, 1800 sqft' });
    }
    if (userInputs.diet === 'heavy_meat' || userInputs.diet === 'omnivore') {
      suggestions.push({ label: 'Compare plant-based diet', cat: 'diet', query: userInputs.diet === 'heavy_meat' ? 'meat at every meal, 7 days/week' : 'meat 4-5 days/week' });
    }
  }

  async function handleAnalyze() {
    if (!inputValue.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/swap-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentItem: inputValue.trim(), category }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Server error ${res.status}`);
      }

      const data: SwapResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const currentBorderColor =
    result?.current.planetary_status === 'over'
      ? '#ff0040'
      : result?.current.planetary_status === 'at'
      ? '#ffff00'
      : '#00ff88';

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-6">

      {/* ── Input section ── */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid rgba(0,240,255,0.15)',
          boxShadow: '0 0 40px rgba(0,0,0,0.5)',
        }}
      >
        {/* Category selector */}
        <div className="flex gap-2 flex-wrap mb-5">
          {CATEGORIES.map((cat) => {
            const isActive = category === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setCategory(cat.id);
                  setResult(null);
                  setError(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold tracking-wide transition-all duration-200"
                style={{
                  background: isActive
                    ? 'rgba(0,240,255,0.12)'
                    : 'rgba(255,255,255,0.04)',
                  border: isActive
                    ? '1px solid rgba(0,240,255,0.5)'
                    : '1px solid rgba(255,255,255,0.08)',
                  color: isActive ? '#00f0ff' : 'var(--text-muted)',
                  boxShadow: isActive
                    ? '0 0 12px rgba(0,240,255,0.25), inset 0 0 12px rgba(0,240,255,0.05)'
                    : 'none',
                }}
              >
                <span>{cat.icon}</span>
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Profile-based suggestions */}
        {suggestions.length > 0 && !result && (
          <div className="flex gap-2 flex-wrap mb-4">
            <span className="text-[10px] font-bold tracking-widest uppercase self-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
              SUGGESTED:
            </span>
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => {
                  setCategory(s.cat);
                  setInputValue(s.query);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: 'rgba(0,255,136,0.06)',
                  border: '1px solid rgba(0,255,136,0.25)',
                  color: '#00ff88',
                  cursor: 'pointer',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Text input + analyze button */}
        <div className="flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && handleAnalyze()}
            placeholder={PLACEHOLDERS[category]}
            className="flex-1 rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-primary)',
              caretColor: '#00f0ff',
            }}
            onFocus={(e) => {
              e.currentTarget.style.border = '1px solid rgba(0,240,255,0.4)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,240,255,0.08)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <button
            onClick={handleAnalyze}
            disabled={loading || !inputValue.trim()}
            className="px-5 py-3 rounded-xl text-sm font-black tracking-wider uppercase transition-all duration-200 flex-shrink-0"
            style={{
              background: loading || !inputValue.trim()
                ? 'rgba(0,240,255,0.06)'
                : 'rgba(0,240,255,0.12)',
              border: loading || !inputValue.trim()
                ? '1px solid rgba(0,240,255,0.15)'
                : '1px solid rgba(0,240,255,0.5)',
              color: loading || !inputValue.trim() ? 'rgba(0,240,255,0.3)' : '#00f0ff',
              boxShadow:
                loading || !inputValue.trim()
                  ? 'none'
                  : '0 0 16px rgba(0,240,255,0.3), inset 0 0 12px rgba(0,240,255,0.06)',
              cursor: loading || !inputValue.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            Analyze
          </button>
        </div>
      </div>

      {/* ── Loading state ── */}
      <AnimatePresence>
        {loading && (
          <motion.div
            className="flex items-center gap-4 rounded-2xl px-6 py-5"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid rgba(0,240,255,0.15)',
            }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {/* Spinner */}
            <div
              className="w-6 h-6 rounded-full border-2 flex-shrink-0"
              style={{
                borderColor: 'rgba(0,240,255,0.15)',
                borderTopColor: '#00f0ff',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <p className="text-sm" style={{ color: '#00f0ff' }}>
              Claude is analyzing material trade-offs...
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error state ── */}
      <AnimatePresence>
        {error && !loading && (
          <motion.div
            className="rounded-2xl px-6 py-5"
            style={{
              background: 'rgba(255,0,64,0.07)',
              border: '1px solid rgba(255,0,64,0.3)',
            }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <p className="text-sm font-semibold" style={{ color: '#ff0040' }}>
              {error}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Results ── */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div
            className="flex flex-col gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Current item card */}
            <motion.div
              className="rounded-2xl p-5"
              style={{
                background: 'linear-gradient(135deg, rgba(255,0,64,0.06) 0%, rgba(13,13,32,0.98) 100%)',
                border: `1px solid ${currentBorderColor}44`,
                boxShadow: `0 0 30px ${currentBorderColor}15`,
              }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
                <div>
                  <p
                    className="text-[10px] font-black tracking-[0.2em] uppercase mb-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Currently Owns
                  </p>
                  <h3
                    className="text-base font-black tracking-wide"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {result.current.name}
                  </h3>
                </div>
                <PlanetaryStatusBadge
                  status={result.current.planetary_status}
                  ratio={result.current.overshoot_ratio}
                />
              </div>

              <MaterialPills materials={result.current.materials} />

              <div className="flex items-center gap-4 mt-3 flex-wrap">
                <div>
                  <span
                    className="text-xl font-black font-mono"
                    style={{
                      color: currentBorderColor,
                      textShadow: `0 0 12px ${currentBorderColor}88`,
                    }}
                  >
                    {(result.current.annual_co2e_kg / 1000).toFixed(1)} t
                  </span>
                  <span
                    className="text-xs ml-1.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    CO&#x2082;e/yr
                  </span>
                </div>
                {result.current.planetary_status === 'over' && (
                  <span
                    className="text-xs font-mono"
                    style={{ color: '#ff0040' }}
                  >
                    {result.current.overshoot_ratio.toFixed(1)}x over planetary limit
                  </span>
                )}
              </div>
            </motion.div>

            {/* Swap cards */}
            {result.swaps.map((swap, idx) => {
              const swapBorder =
                swap.planetary_status === 'under'
                  ? '#00ff88'
                  : swap.planetary_status === 'at'
                  ? '#ffff00'
                  : '#ff6b00';

              const isDeltaGood = swap.co2e_delta_kg < 0;

              return (
                <motion.div
                  key={idx}
                  className="rounded-2xl p-5"
                  style={{
                    background:
                      swap.planetary_status === 'under'
                        ? 'linear-gradient(135deg, rgba(0,255,136,0.05) 0%, rgba(13,13,32,0.98) 100%)'
                        : 'linear-gradient(135deg, rgba(255,107,0,0.05) 0%, rgba(13,13,32,0.98) 100%)',
                    border: `1px solid ${swapBorder}33`,
                    boxShadow: `0 0 24px ${swapBorder}10`,
                  }}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.45,
                    delay: 0.1 + idx * 0.1,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <h4
                          className="text-sm font-black tracking-wide"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {swap.name}
                        </h4>
                        <RecommendationBadge type={swap.recommendation} />
                      </div>
                      <p
                        className="text-xs leading-relaxed"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {swap.description}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p
                        className="text-base font-black font-mono"
                        style={{ color: '#00f0ff' }}
                      >
                        {swap.estimated_cost}
                      </p>
                      <p
                        className="text-[10px] font-mono"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        est. cost
                      </p>
                    </div>
                  </div>

                  {/* Material delta */}
                  <MaterialDelta current={result.current.materials} swap={swap.materials} />

                  {/* CO2e stats row */}
                  <div className="flex items-center gap-4 mt-3 flex-wrap">
                    <div>
                      <span
                        className="text-lg font-black font-mono"
                        style={{
                          color: swapBorder,
                          textShadow: `0 0 10px ${swapBorder}66`,
                        }}
                      >
                        {(swap.annual_co2e_kg / 1000).toFixed(1)} t
                      </span>
                      <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>
                        CO&#x2082;e/yr
                      </span>
                    </div>

                    <div
                      className="text-sm font-black font-mono px-2.5 py-1 rounded-lg"
                      style={{
                        color: isDeltaGood ? '#00ff88' : '#ff0040',
                        background: isDeltaGood ? 'rgba(0,255,136,0.10)' : 'rgba(255,0,64,0.10)',
                        border: isDeltaGood ? '1px solid rgba(0,255,136,0.25)' : '1px solid rgba(255,0,64,0.25)',
                      }}
                    >
                      {isDeltaGood ? '-' : '+'}{Math.abs(swap.co2e_delta_kg / 1000).toFixed(1)} t CO&#x2082;e/yr
                      {' '}
                      <span className="text-xs font-mono opacity-70">
                        ({isDeltaGood ? '-' : '+'}{Math.abs(swap.co2e_reduction_pct).toFixed(0)}%)
                      </span>
                    </div>

                    <PlanetaryStatusBadge
                      status={swap.planetary_status}
                      ratio={swap.overshoot_ratio}
                    />
                  </div>

                  {/* Trade-offs */}
                  {swap.tradeoffs.length > 0 && (
                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <p
                        className="text-[10px] font-black tracking-widest uppercase mb-2"
                        style={{ color: 'rgba(255,255,0,0.5)' }}
                      >
                        Trade-offs
                      </p>
                      <ul className="flex flex-col gap-1">
                        {swap.tradeoffs.map((t, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-[11px] leading-snug"
                            style={{ color: 'rgba(255,255,255,0.45)' }}
                          >
                            <span
                              className="flex-shrink-0 mt-0.5"
                              style={{ color: '#ffff00', opacity: 0.6 }}
                            >
                              &#9651;
                            </span>
                            {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
