'use client';

import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scope } from '@/lib/types';

interface ScaleSliderProps {
  currentScale: Scope;
  onScaleChange: (scale: Scope) => void;
}

interface StopConfig {
  scope: Scope;
  label: string;
  shortLabel: string;
  population: string;
  color: string;
  glowColor: string;
}

const STOPS: StopConfig[] = [
  {
    scope: 'person',
    label: 'Me',
    shortLabel: 'Me',
    population: '1 person',
    color: '#00f0ff',
    glowColor: 'rgba(0,240,255,0.6)',
  },
  {
    scope: 'city',
    label: 'My City',
    shortLabel: 'City',
    population: '500K',
    color: '#00ff88',
    glowColor: 'rgba(0,255,136,0.6)',
  },
  {
    scope: 'country',
    label: 'My Country',
    shortLabel: 'Country',
    population: '331M',
    color: '#ff6b00',
    glowColor: 'rgba(255,107,0,0.6)',
  },
  {
    scope: 'planet',
    label: 'Earth',
    shortLabel: 'Earth',
    population: '8.1B',
    color: '#bf00ff',
    glowColor: 'rgba(191,0,255,0.6)',
  },
];

// Only person/city/country/planet are valid slider stops
const VALID_SCOPES: Scope[] = ['person', 'city', 'country', 'planet'];

function getStopIndex(scope: Scope): number {
  const idx = VALID_SCOPES.indexOf(scope);
  return idx >= 0 ? idx : 0;
}

export default function ScaleSlider({ currentScale, onScaleChange }: ScaleSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const activeIdx = getStopIndex(currentScale);
  const activeStop = STOPS[activeIdx];

  return (
    <div
      className="relative rounded-2xl p-6"
      style={{
        background: 'linear-gradient(135deg, rgba(0,8,20,0.97) 0%, rgba(8,0,20,0.97) 100%)',
        border: '1px solid rgba(0,240,255,0.15)',
        boxShadow: '0 0 40px rgba(0,0,0,0.5), inset 0 0 40px rgba(0,0,0,0.3)',
      }}
    >
      {/* Ambient glow that shifts with active stop */}
      <motion.div
        className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden"
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="absolute top-0 w-32 h-32 rounded-full blur-3xl"
          animate={{
            left: `${(activeIdx / (STOPS.length - 1)) * 100}%`,
            background: activeStop.glowColor,
            x: '-50%',
          }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          style={{ opacity: 0.12 }}
        />
      </motion.div>

      {/* Header */}
      <div className="relative mb-6">
        <h3
          className="text-base font-black tracking-[0.2em] uppercase mb-1"
          style={{ color: '#ffffff' }}
        >
          Scale
        </h3>
        <div className="flex items-baseline gap-2">
          <motion.span
            key={activeStop.scope}
            className="text-xs font-semibold tracking-wide"
            style={{ color: activeStop.color }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {activeStop.label}
          </motion.span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            —
          </span>
          <motion.span
            key={`pop-${activeStop.scope}`}
            className="text-xs font-mono"
            style={{ color: 'rgba(255,255,255,0.45)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {activeStop.population}
          </motion.span>
        </div>
      </div>

      {/* Track + stops */}
      <div className="relative px-2 pb-8">
        {/* Track line */}
        <div ref={trackRef} className="relative h-1 rounded-full mx-4" style={{ background: 'rgba(255,255,255,0.08)' }}>
          {/* Gradient fill */}
          <div
            className="scale-track absolute inset-0 rounded-full"
            style={{
              background: 'linear-gradient(90deg, #00f0ff 0%, #00ff88 33%, #ff6b00 66%, #bf00ff 100%)',
              opacity: 0.35,
            }}
          />

          {/* Active fill up to current index */}
          <motion.div
            className="absolute top-0 left-0 h-full rounded-full"
            animate={{
              width: `${(activeIdx / (STOPS.length - 1)) * 100}%`,
              background: `linear-gradient(90deg, #00f0ff, ${activeStop.color})`,
            }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            style={{ boxShadow: `0 0 8px ${activeStop.color}88` }}
          />

          {/* Stops */}
          {STOPS.map((stop, idx) => {
            const isActive = idx === activeIdx;
            const isPast = idx < activeIdx;
            const pct = (idx / (STOPS.length - 1)) * 100;

            return (
              <div
                key={stop.scope}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer group"
                style={{ left: `${pct}%`, zIndex: 10, padding: '12px' }}
                onClick={(e) => { e.stopPropagation(); onScaleChange(stop.scope); }}
              >
                {/* Outer glow ring for active */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 2.2, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ duration: 0.35 }}
                      style={{
                        background: stop.glowColor,
                        filter: 'blur(6px)',
                      }}
                    />
                  )}
                </AnimatePresence>

                {/* Circle */}
                <motion.div
                  className="relative rounded-full border-2 transition-transform duration-150 group-hover:scale-125"
                  animate={{
                    width: isActive ? 18 : 12,
                    height: isActive ? 18 : 12,
                    borderColor: isActive ? stop.color : isPast ? `${stop.color}88` : 'rgba(255,255,255,0.2)',
                    background: isActive
                      ? stop.color
                      : isPast
                      ? `${stop.color}44`
                      : 'rgba(255,255,255,0.05)',
                    boxShadow: isActive ? `0 0 16px ${stop.color}, 0 0 4px ${stop.color}` : 'none',
                  }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                />

                {/* Label below */}
                <div
                  className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 pointer-events-none"
                  style={{ minWidth: '56px' }}
                >
                  <motion.span
                    className="text-xs font-semibold tracking-wide whitespace-nowrap text-center"
                    animate={{
                      color: isActive ? stop.color : 'rgba(255,255,255,0.35)',
                      fontWeight: isActive ? 700 : 400,
                    }}
                    transition={{ duration: 0.25 }}
                  >
                    {stop.label}
                  </motion.span>
                  <motion.span
                    className="text-xs font-mono whitespace-nowrap text-center"
                    animate={{
                      color: isActive ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)',
                    }}
                    transition={{ duration: 0.25 }}
                    style={{ fontSize: '10px' }}
                  >
                    {stop.population}
                  </motion.span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scale description bar */}
      <motion.div
        key={activeStop.scope}
        className="relative mt-2 rounded-xl px-4 py-3 flex items-center gap-3"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          background: `linear-gradient(135deg, ${activeStop.color}10, ${activeStop.color}06)`,
          border: `1px solid ${activeStop.color}22`,
        }}
      >
        <motion.div
          className="w-2 h-2 rounded-full flex-shrink-0"
          animate={{ background: activeStop.color, boxShadow: `0 0 8px ${activeStop.color}` }}
        />
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-bold tracking-wide" style={{ color: activeStop.color }}>
            {activeStop.label.toUpperCase()}
          </span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Population: {activeStop.population}
          </span>
        </div>
        <div className="ml-auto flex gap-1">
          {STOPS.map((s, i) => (
            <div
              key={s.scope}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: i <= activeIdx ? s.color : 'rgba(255,255,255,0.12)',
                boxShadow: i === activeIdx ? `0 0 6px ${s.color}` : 'none',
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
