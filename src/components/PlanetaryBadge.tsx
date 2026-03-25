'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatMass } from '@/lib/estimation-engine';

interface PlanetaryBadgeProps {
  value: number;       // current value in kg/yr or tonnes/yr
  target: number;      // sustainable target in same units
  unit?: string;       // display unit label
  compact?: boolean;   // if true, just show the dot + ratio
}

export default function PlanetaryBadge({ value, target, unit = '', compact = false }: PlanetaryBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (target <= 0) return null;

  const ratio = value / target;
  const status = ratio <= 1 ? 'green' : ratio <= 2 ? 'yellow' : 'red';
  const colors = {
    green: { bg: '#00ff88', text: '#00ff88', label: 'WITHIN LIMITS' },
    yellow: { bg: '#ffff00', text: '#ffff00', label: 'APPROACHING LIMIT' },
    red: { bg: '#ff0040', text: '#ff0040', label: 'OVER LIMIT' },
  };
  const c = colors[status];

  const ratioText = ratio <= 1
    ? '✓'
    : `${ratio.toFixed(1)}x`;

  return (
    <span
      className="relative inline-flex items-center gap-1 cursor-help"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Dot */}
      <span
        className="inline-block w-2 h-2 rounded-full flex-shrink-0"
        style={{
          background: c.bg,
          boxShadow: `0 0 6px ${c.bg}`,
        }}
      />

      {/* Ratio text */}
      {!compact && (
        <span
          className="text-[10px] font-mono font-bold"
          style={{ color: c.text }}
        >
          {ratioText}
        </span>
      )}

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none"
          >
            <div
              className="rounded-lg px-3 py-2 text-[10px] whitespace-nowrap"
              style={{
                background: 'rgba(6,6,15,0.95)',
                border: `1px solid ${c.bg}44`,
                boxShadow: `0 0 20px rgba(0,0,0,0.8), 0 0 8px ${c.bg}22`,
              }}
            >
              <div className="font-mono font-bold mb-1" style={{ color: c.text }}>
                {c.label}
              </div>
              <div className="flex gap-4 text-[var(--text-muted)]">
                <span>You: <span className="text-[var(--text-primary)]">{typeof value === 'number' && value > 1000 ? formatMass(value) : value.toFixed(1)} {unit}</span></span>
                <span>Target: <span style={{ color: '#00ff88' }}>{typeof target === 'number' && target > 1000 ? formatMass(target) : target.toFixed(1)} {unit}</span></span>
              </div>
              <div className="text-[var(--text-muted)] mt-1">
                Gap: <span style={{ color: ratio > 1 ? '#ff0040' : '#00ff88' }}>
                  {ratio > 1 ? `${((ratio - 1) * 100).toFixed(0)}% over` : `${((1 - ratio) * 100).toFixed(0)}% under`}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
