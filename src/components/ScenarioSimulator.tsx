'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Recommendation } from '@/lib/recommendations';

interface ScenarioSimulatorProps {
  recommendations: Recommendation[];
  baselineCarbon: { total_co2e_kg_per_year: number };
}

// Logarithmic slider stops: 1M, 10M, 100M, 1B, 5B, 8.1B
const POP_STOPS = [1e6, 1e7, 1e8, 1e9, 5e9, 8.1e9];
const SLIDER_MIN = 0;
const SLIDER_MAX = POP_STOPS.length - 1;

function snapToStop(rawIndex: number): number {
  return Math.round(Math.max(SLIDER_MIN, Math.min(SLIDER_MAX, rawIndex)));
}

function formatPopulation(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} billion`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)} million`;
  return n.toLocaleString();
}

function formatResult(value: number, unit: 'co2' | 'material'): string {
  if (unit === 'co2') {
    const abs = Math.abs(value);
    if (abs >= 1e12) return `${(abs / 1e12).toFixed(2)} Gt CO\u2082e`;
    if (abs >= 1e9)  return `${(abs / 1e9).toFixed(2)} Mt CO\u2082e`;
    if (abs >= 1e6)  return `${(abs / 1e6).toFixed(2)} kt CO\u2082e`;
    return `${(abs / 1000).toFixed(1)} t CO\u2082e`;
  } else {
    const abs = Math.abs(value);
    if (abs >= 1e9)  return `${(abs / 1e9).toFixed(2)} Gt`;
    if (abs >= 1e6)  return `${(abs / 1e6).toFixed(2)} Mt`;
    if (abs >= 1e3)  return `${(abs / 1e3).toFixed(2)} kt`;
    return `${abs.toFixed(1)} t`;
  }
}

// Equivalency comparisons
function buildComparison(co2SavedKg: number): string {
  const abs = Math.abs(co2SavedKg);
  if (abs <= 0) return '';
  const carsPerYear = 4600; // kg CO2/yr per car
  const treePerYear = 22;   // kg CO2/yr per tree
  const cars = abs / carsPerYear;
  const trees = abs / treePerYear;

  if (cars >= 1e9)  return `taking ${(cars / 1e9).toFixed(1)} billion cars off the road`;
  if (cars >= 1e6)  return `taking ${(cars / 1e6).toFixed(0)} million cars off the road`;
  if (cars >= 1000) return `taking ${Math.round(cars / 1000)}k cars off the road`;
  if (cars >= 1)    return `taking ${Math.round(cars)} cars off the road`;

  if (trees >= 1e9)  return `planting ${(trees / 1e9).toFixed(1)} billion trees`;
  if (trees >= 1e6)  return `planting ${(trees / 1e6).toFixed(0)} million trees`;
  return `planting ${Math.round(trees)} trees`;
}

// Animated counter hook
function useCountUp(target: number, duration: number = 700): number {
  const [current, setCurrent] = useState(target);
  const frameRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const fromRef  = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    const to   = target;
    if (from === to) return;

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
    }

    startRef.current = null;

    const tick = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(from + (to - from) * eased);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return current;
}

const CYAN   = '#00f0ff';
const PURPLE = '#bf00ff';
const GREEN  = '#00ff88';
const ORANGE = '#ff6b00';
const WHITE  = 'rgba(255,255,255,0.75)';

export default function ScenarioSimulator({
  recommendations,
  baselineCarbon,
}: ScenarioSimulatorProps) {
  const [stopIndex, setStopIndex] = useState(3); // default: 1B
  const [selectedRecId, setSelectedRecId] = useState<string>(
    recommendations[0]?.id ?? '',
  );

  const population = POP_STOPS[stopIndex];
  const selectedRec = recommendations.find((r) => r.id === selectedRecId) ?? recommendations[0];

  // Derived results
  const co2SavedKgTotal     = selectedRec ? Math.abs(selectedRec.delta_co2e_kg) * population : 0;
  const materialSavedTTotal = selectedRec ? Math.abs(selectedRec.delta_material_tonnes) * population : 0;
  const comparison          = buildComparison(co2SavedKgTotal);

  // Animated display values
  const animCO2      = useCountUp(co2SavedKgTotal, 600);
  const animMaterial = useCountUp(materialSavedTTotal * 1000, 600); // convert tonnes → kg for smoother animation

  // Slider drag handling
  const trackRef = useRef<HTMLDivElement>(null);

  const getIndexFromPointer = useCallback((clientX: number): number => {
    if (!trackRef.current) return stopIndex;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return snapToStop(ratio * SLIDER_MAX);
  }, [stopIndex]);

  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    setStopIndex(getIndexFromPointer(e.clientX));
  }, [getIndexFromPointer]);

  const handleThumbDrag = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      setStopIndex(getIndexFromPointer(ev.clientX));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }, [getIndexFromPointer]);

  const trackPct = (stopIndex / SLIDER_MAX) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        position: 'relative',
        borderRadius: '1rem',
        padding: '1.5rem',
        background: 'linear-gradient(135deg, rgba(0,6,18,0.98) 0%, rgba(8,0,22,0.98) 100%)',
        border: '1px solid rgba(0,240,255,0.14)',
        boxShadow:
          '0 0 50px rgba(0,0,0,0.6), 0 0 80px rgba(191,0,255,0.04), inset 0 0 60px rgba(0,0,0,0.4)',
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
            'radial-gradient(ellipse 60% 45% at 50% 0%, rgba(191,0,255,0.06) 0%, transparent 65%)',
        }}
      />

      {/* Header */}
      <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
        <h2
          style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: 900,
            letterSpacing: '0.18em',
            color: CYAN,
            textShadow: `0 0 20px ${CYAN}88, 0 0 40px ${CYAN}44`,
            fontFamily: 'monospace',
          }}
        >
          WHAT IF?
        </h2>
        <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em' }}>
          Simulate the planetary impact of collective action
        </p>
      </div>

      {/* Population slider */}
      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
            Population
          </span>
          <motion.span
            key={stopIndex}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace', color: CYAN, textShadow: `0 0 10px ${CYAN}88` }}
          >
            {formatPopulation(population)}
          </motion.span>
        </div>

        {/* Track */}
        <div
          ref={trackRef}
          onClick={handleTrackClick}
          style={{
            position: 'relative',
            height: '6px',
            borderRadius: '9999px',
            background: 'rgba(255,255,255,0.07)',
            cursor: 'pointer',
            margin: '0 10px',
          }}
        >
          {/* Full gradient fill (decorative) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '9999px',
              background: `linear-gradient(90deg, ${CYAN} 0%, #00ff88 33%, ${ORANGE} 66%, ${PURPLE} 100%)`,
              opacity: 0.2,
            }}
          />
          {/* Active fill */}
          <motion.div
            animate={{ width: `${trackPct}%` }}
            transition={{ type: 'spring', stiffness: 140, damping: 22 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              borderRadius: '9999px',
              background: `linear-gradient(90deg, ${CYAN}, ${PURPLE})`,
              boxShadow: `0 0 8px ${CYAN}88`,
            }}
          />

          {/* Stop dots */}
          {POP_STOPS.map((_, idx) => {
            const pct = (idx / SLIDER_MAX) * 100;
            const isActive = idx === stopIndex;
            const isPast = idx < stopIndex;
            return (
              <div
                key={idx}
                onClick={(e) => { e.stopPropagation(); setStopIndex(idx); }}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: `${pct}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 2,
                  padding: '8px',
                  cursor: 'pointer',
                }}
              >
                <motion.div
                  animate={{
                    width: isActive ? 14 : 8,
                    height: isActive ? 14 : 8,
                    background: isActive ? CYAN : isPast ? `${CYAN}88` : 'rgba(255,255,255,0.15)',
                    boxShadow: isActive ? `0 0 12px ${CYAN}, 0 0 4px ${CYAN}` : 'none',
                  }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  style={{ borderRadius: '50%' }}
                />
              </div>
            );
          })}

          {/* Draggable thumb */}
          <motion.div
            onPointerDown={handleThumbDrag}
            animate={{ left: `${trackPct}%` }}
            transition={{ type: 'spring', stiffness: 140, damping: 22 }}
            style={{
              position: 'absolute',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.3), ${CYAN})`,
              border: `2px solid ${CYAN}`,
              boxShadow: `0 0 16px ${CYAN}, 0 0 6px ${CYAN}`,
              cursor: 'grab',
              zIndex: 5,
              touchAction: 'none',
            }}
          />
        </div>

        {/* Stop labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', padding: '0 6px' }}>
          {['1M', '10M', '100M', '1B', '5B', '8.1B'].map((label, idx) => (
            <span
              key={idx}
              style={{
                fontSize: '0.6rem',
                fontFamily: 'monospace',
                color: idx === stopIndex ? CYAN : 'rgba(255,255,255,0.25)',
                textShadow: idx === stopIndex ? `0 0 8px ${CYAN}` : 'none',
                fontWeight: idx === stopIndex ? 700 : 400,
                transition: 'color 0.2s, text-shadow 0.2s',
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Action selector */}
      <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: '0.5rem' }}>
          Action
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {recommendations.map((rec) => {
            const isSelected = rec.id === selectedRecId;
            return (
              <motion.button
                key={rec.id}
                onClick={() => setSelectedRecId(rec.id)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  padding: '0.35rem 0.7rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: `1px solid ${isSelected ? GREEN : 'rgba(255,255,255,0.1)'}`,
                  background: isSelected
                    ? `linear-gradient(135deg, ${GREEN}18, ${GREEN}08)`
                    : 'rgba(255,255,255,0.03)',
                  color: isSelected ? GREEN : 'rgba(255,255,255,0.5)',
                  boxShadow: isSelected ? `0 0 12px ${GREEN}44, inset 0 0 12px ${GREEN}0a` : 'none',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <span>{rec.icon}</span>
                <span>{rec.title}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Results panel */}
      <AnimatePresence mode="wait">
        {selectedRec && (
          <motion.div
            key={`${selectedRecId}-${stopIndex}`}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              position: 'relative',
              borderRadius: '0.75rem',
              padding: '1rem 1.1rem',
              background: `linear-gradient(135deg, ${GREEN}0f, ${GREEN}05)`,
              border: `1px solid ${GREEN}22`,
              boxShadow: `inset 0 0 40px ${GREEN}08`,
            }}
          >
            {/* Section title */}
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
              If{' '}
              <span style={{ color: CYAN, fontWeight: 700, fontFamily: 'monospace' }}>
                {formatPopulation(population)}
              </span>{' '}
              people{' '}
              <span style={{ color: GREEN, fontWeight: 700 }}>{selectedRec.title.toLowerCase()}</span>:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.75rem' }}>
              {/* CO2 saved */}
              <div
                style={{
                  borderRadius: '0.5rem',
                  padding: '0.6rem 0.75rem',
                  background: 'rgba(0,0,0,0.25)',
                  border: `1px solid ${GREEN}1a`,
                }}
              >
                <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '0.2rem' }}>
                  CO&#x2082; saved
                </div>
                <motion.div
                  style={{
                    fontSize: '1rem',
                    fontWeight: 900,
                    fontFamily: 'monospace',
                    color: GREEN,
                    textShadow: `0 0 12px ${GREEN}99`,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {formatResult(animCO2, 'co2')}
                </motion.div>
              </div>

              {/* Material saved */}
              <div
                style={{
                  borderRadius: '0.5rem',
                  padding: '0.6rem 0.75rem',
                  background: 'rgba(0,0,0,0.25)',
                  border: `1px solid ${ORANGE}1a`,
                }}
              >
                <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '0.2rem' }}>
                  Material saved
                </div>
                <motion.div
                  style={{
                    fontSize: '1rem',
                    fontWeight: 900,
                    fontFamily: 'monospace',
                    color: ORANGE,
                    textShadow: `0 0 12px ${ORANGE}99`,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {formatResult(animMaterial, 'material')}
                </motion.div>
              </div>
            </div>

            {/* Equivalency */}
            {comparison && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  borderRadius: '0.5rem',
                  padding: '0.5rem 0.7rem',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>&#x2248;</span>
                <p style={{ margin: 0, fontSize: '0.75rem', color: WHITE, lineHeight: 1.4 }}>
                  That&apos;s equivalent to{' '}
                  <span style={{ color: CYAN, fontWeight: 700, textShadow: `0 0 8px ${CYAN}88` }}>
                    {comparison}
                  </span>
                  .
                </p>
              </motion.div>
            )}
          </motion.div>
        )}

        {recommendations.length === 0 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ textAlign: 'center', padding: '1rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}
          >
            No recommendations available for your current profile.
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
