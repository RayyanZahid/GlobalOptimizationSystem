'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ELEMENTS } from '@/lib/elements';
import { BODY_COMPOSITION } from '@/lib/elements';
import { ElementSymbol } from '@/lib/types';

// Mini periodic table for the background
function MiniElement({ symbol, delay, hasBody }: { symbol: string; delay: number; hasBody: boolean }) {
  const bodyPct = BODY_COMPOSITION[symbol as ElementSymbol] || 0;
  const glowIntensity = hasBody ? Math.min(bodyPct * 3, 1) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: hasBody ? 0.08 + glowIntensity * 0.3 : 0.03, scale: 1 }}
      transition={{ delay: delay * 0.02, duration: 0.8 }}
      className="w-8 h-8 md:w-10 md:h-10 rounded flex items-center justify-center text-[8px] md:text-[10px] font-mono"
      style={{
        background: hasBody ? `rgba(0, 240, 255, ${glowIntensity * 0.08})` : 'rgba(255,255,255,0.01)',
        border: `1px solid rgba(0, 240, 255, ${hasBody ? glowIntensity * 0.15 : 0.02})`,
        boxShadow: hasBody && glowIntensity > 0.1 ? `0 0 ${glowIntensity * 12}px rgba(0, 240, 255, ${glowIntensity * 0.15})` : 'none',
      }}
    >
      {symbol}
    </motion.div>
  );
}

// Static impact preview
function ImpactPreview() {
  const categories = [
    { label: 'Food & Biomass', pct: 28, color: '#00ff88' },
    { label: 'Fossil Fuels', pct: 38, color: '#ff0040' },
    { label: 'Metals', pct: 18, color: '#ff6b00' },
    { label: 'Minerals', pct: 16, color: '#00f0ff' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 2.0, duration: 0.8 }}
      className="mt-10 max-w-lg mx-auto"
      style={{
        borderRadius: '1rem',
        padding: '1.25rem',
        background: 'linear-gradient(135deg, rgba(0,6,18,0.95) 0%, rgba(6,0,20,0.95) 100%)',
        border: '1px solid rgba(0,240,255,0.15)',
        boxShadow: '0 0 40px rgba(0,0,0,0.5)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>
            AVERAGE US FOOTPRINT
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'monospace', color: '#ff0040', textShadow: '0 0 12px rgba(255,0,64,0.5)' }}>
              16.2t
            </span>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>CO2e/yr</span>
          </div>
        </div>
        <div className="text-right">
          <span style={{ fontSize: '1.2rem', fontWeight: 900, fontFamily: 'monospace', color: '#ff6b00', textShadow: '0 0 10px rgba(255,107,0,0.5)' }}>
            1.8
          </span>
          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', display: 'block' }}>Earths needed</span>
        </div>
      </div>

      {/* Mini breakdown bars */}
      <div className="flex flex-col gap-1.5">
        {categories.map((cat, idx) => (
          <div key={cat.label} className="flex items-center gap-2">
            <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', width: 90, flexShrink: 0 }}>{cat.label}</span>
            <div style={{ flex: 1, height: 4, borderRadius: 9999, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${cat.pct}%` }}
                transition={{ duration: 0.8, delay: 2.2 + idx * 0.1 }}
                style={{ height: '100%', borderRadius: 9999, background: cat.color, boxShadow: `0 0 6px ${cat.color}66` }}
              />
            </div>
            <span style={{ fontSize: '0.6rem', fontFamily: 'monospace', color: cat.color, width: 30, textAlign: 'right' }}>{cat.pct}%</span>
          </div>
        ))}
      </div>

      <div className="mt-3 text-center">
        <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>
          Take the quiz to see your personal breakdown
        </span>
      </div>
    </motion.div>
  );
}

export default function HomePage() {
  const router = useRouter();

  const topElements = ELEMENTS.slice(0, 54);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background mini periodic table — subtle */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="grid gap-1 opacity-30" style={{ gridTemplateColumns: 'repeat(18, minmax(0, 1fr))' }}>
          {topElements.map((el, i) => (
            <MiniElement
              key={el.symbol}
              symbol={el.symbol}
              delay={i}
              hasBody={!!BODY_COMPOSITION[el.symbol as ElementSymbol]}
            />
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center px-4 max-w-4xl">
        {/* Tagline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-4"
        >
          <span className="text-xs md:text-sm tracking-[0.3em] text-[var(--neon-cyan)] font-mono uppercase">
            Global Optimization System
          </span>
        </motion.div>

        {/* Hero title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="text-5xl md:text-8xl font-bold leading-tight mb-6"
        >
          <span className="text-white">Understand your </span>
          <span className="glow-cyan" style={{ color: 'var(--neon-cyan)' }}>impact</span>
          <span className="text-white">.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-lg md:text-xl text-[var(--text-muted)] max-w-2xl mx-auto mb-4"
        >
          See your carbon footprint, compare it to the world, and find{' '}
          <span className="text-[var(--neon-green)]">real ways to reduce it</span>.
        </motion.p>

        {/* The pitch line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="text-sm text-[var(--text-muted)] mb-10 italic"
        >
          Most footprint calculators give you a number. We give you a plan.
        </motion.p>

        {/* Dual CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8 }}
          className="flex gap-4 justify-center flex-wrap"
        >
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(0, 240, 255, 0.4)' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/quiz')}
            className="px-10 py-4 text-lg font-semibold rounded-xl bg-transparent border-2 border-[var(--neon-cyan)] text-[var(--neon-cyan)] hover:bg-[rgba(0,240,255,0.1)] transition-colors cursor-pointer"
            style={{ boxShadow: '0 0 20px rgba(0, 240, 255, 0.2)' }}
          >
            Calculate Your Footprint
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(255, 107, 0, 0.3)' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/analyze')}
            className="px-10 py-4 text-lg font-semibold rounded-xl bg-transparent border-2 cursor-pointer transition-colors"
            style={{
              borderColor: 'var(--neon-orange)',
              color: 'var(--neon-orange)',
              boxShadow: '0 0 15px rgba(255, 107, 0, 0.15)',
            }}
          >
            Analyze a Person
          </motion.button>
        </motion.div>

        {/* Impact Preview */}
        <ImpactPreview />

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.6 }}
          className="flex gap-12 justify-center mt-12"
        >
          <div className="text-center">
            <div className="text-2xl font-bold font-mono text-[var(--neon-red)]">16.2t</div>
            <div className="text-xs text-[var(--text-muted)]">Avg US Footprint</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold font-mono text-[var(--neon-green)]">2.5t</div>
            <div className="text-xs text-[var(--text-muted)]">Sustainable Target</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold font-mono text-[var(--neon-cyan)]">50+</div>
            <div className="text-xs text-[var(--text-muted)]">Actions Available</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
