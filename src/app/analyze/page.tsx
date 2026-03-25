'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import type { PersonDossier, SourceResult, SourceType } from '@/lib/types';
import { computeProfile } from '@/lib/estimation-engine';
import PeriodicTable from '@/components/PeriodicTable';
import DataHub from '@/components/DataHub';
import { SAMPLE_DATA, type SampleDataType } from '@/data/sample-dumps';

// ─── Source Icons ────────────────────────────────────────────────────────────

const SOURCE_ICONS: Record<SourceType, string> = {
  linkedin: 'in',
  google: 'G',
  company: 'Co',
  personal_site: 'W',
  twitter: 'X',
  github: '<>',
  news: 'N',
  property: 'P',
  salary: '$',
};

const SOURCE_COLORS: Record<SourceType, string> = {
  linkedin: '#0077b5',
  google: '#4285f4',
  company: '#ff6b00',
  personal_site: '#00ff88',
  twitter: '#e8e8f0',
  github: '#c9d1d9',
  news: '#ffaa00',
  property: '#ff0040',
  salary: '#00f0ff',
};

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AnalyzePage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [dossier, setDossier] = useState<PersonDossier | null>(null);
  const [activeSources, setActiveSources] = useState<Map<string, SourceResult>>(new Map());
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  const eventSourceRef = useRef<AbortController | null>(null);

  const handleScan = useCallback(async () => {
    if (!url.includes('linkedin.com/in/')) {
      setError('Enter a LinkedIn profile URL to start');
      return;
    }

    setScanning(true);
    setError('');
    setDossier(null);
    setActiveSources(new Map());
    setComplete(false);

    const controller = new AbortController();
    eventSourceRef.current = controller;

    try {
      const res = await fetch('/api/person-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start analysis');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let eventType = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7);
          } else if (line.startsWith('data: ') && eventType) {
            try {
              const data = JSON.parse(line.slice(6));
              handleSSEEvent(eventType, data);
            } catch { /* skip malformed */ }
            eventType = '';
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'Analysis failed');
      }
    } finally {
      setScanning(false);
    }
  }, [url]);

  const handleSSEEvent = useCallback((event: string, data: unknown) => {
    switch (event) {
      case 'source_status':
        setActiveSources(prev => {
          const next = new Map(prev);
          const s = data as SourceResult;
          next.set(s.type, s);
          return next;
        });
        break;
      case 'source_complete':
        setActiveSources(prev => {
          const next = new Map(prev);
          const s = data as SourceResult;
          next.set(s.type, s);
          return next;
        });
        break;
      case 'dossier':
        setDossier(data as PersonDossier);
        break;
      case 'complete':
        setDossier(data as PersonDossier);
        setComplete(true);
        break;
      case 'error':
        setError((data as { message: string }).message);
        break;
    }
  }, []);

  const handleUseProfile = useCallback(() => {
    if (!dossier) return;
    sessionStorage.setItem('userInputs', JSON.stringify(dossier.mappedInputs));
    sessionStorage.setItem('personDossier', JSON.stringify(dossier));
    router.push('/dashboard');
  }, [dossier, router]);

  // When DataHub parses a file, fold the results into the dossier
  const handleDataParsed = useCallback((type: string, data: Record<string, unknown>) => {
    setDossier(prev => {
      if (!prev) return prev;
      const d = { ...prev, signals: [...prev.signals], lifestyle: { ...prev.lifestyle, reasoning: [...prev.lifestyle.reasoning] }, sources: [...prev.sources] };
      const confidenceGains: Record<string, number> = { bank: 0.12, receipt: 0.08, home: 0.10, devices: 0.06 };
      d.overallConfidence = Math.min(0.98, d.overallConfidence + (confidenceGains[type] || 0.05));
      d.lastUpdated = new Date().toISOString();

      if (type === 'bank') {
        const cats = (data.categories || {}) as Record<string, number>;
        const monthly = (data.monthly_total as number) || 0;
        // Refine income estimate from spending
        if (monthly > 0) {
          const annualSpend = monthly * 12;
          // Rough: income ≈ spending / 0.7 (30% savings rate)
          const incomeEst = Math.round(annualSpend / 0.7);
          if (incomeEst > d.lifestyle.estimatedIncome) {
            d.lifestyle.estimatedIncome = incomeEst;
            d.lifestyle.incomeConfidence = Math.min(0.9, d.lifestyle.incomeConfidence + 0.25);
          }
        }
        // Infer transport from gas spending
        if ((cats.gas_stations || 0) > 100) {
          d.lifestyle.inferredTransport = 'car';
          d.lifestyle.reasoning.push(`Bank data: $${cats.gas_stations}/mo on fuel → car transport confirmed`);
        }
        // Infer diet from restaurant vs grocery ratio
        const foodOut = (cats.restaurants || 0);
        const foodIn = (cats.groceries || 0);
        if (foodOut > foodIn * 2) {
          d.lifestyle.reasoning.push(`Bank data: restaurant spend ($${foodOut}) >> groceries ($${foodIn}) → frequent dining out`);
        }
        // Infer shopping
        if ((cats.shopping || 0) > monthly * 0.15) {
          d.lifestyle.inferredShopping = 'frequent';
          d.lifestyle.reasoning.push(`Bank data: ${Math.round(((cats.shopping || 0) / monthly) * 100)}% of budget on shopping → frequent shopper`);
        }
        d.signals.push({ category: 'finance', signal: 'Monthly spending', value: `$${monthly.toLocaleString()}`, source: 'linkedin' as SourceType, confidence: 0.8 });
      }

      if (type === 'receipt') {
        const co2e = (data.estimated_co2e_kg as number) || 0;
        const items = (data.items || []) as Array<{ category?: string }>;
        const meatItems = items.filter(i => i.category === 'meat').length;
        const totalItems = items.length;
        if (totalItems > 0) {
          const meatRatio = meatItems / totalItems;
          if (meatRatio === 0) {
            d.lifestyle.inferredDiet = 'vegetarian';
            d.lifestyle.reasoning.push('Receipt data: no meat items found → vegetarian diet');
          } else if (meatRatio > 0.3) {
            d.lifestyle.inferredDiet = 'heavy_meat';
            d.lifestyle.reasoning.push(`Receipt data: ${Math.round(meatRatio * 100)}% meat items → heavy meat diet`);
          }
        }
        d.signals.push({ category: 'food', signal: 'Grocery CO2e', value: `${co2e.toFixed(1)} kg/trip`, source: 'linkedin' as SourceType, confidence: 0.7 });
      }

      if (type === 'home') {
        const sqft = (data.sqft as number) || 0;
        const embodied = (data.estimated_co2e_embodied_tonnes as number) || 0;
        if (sqft > 2000) {
          d.lifestyle.inferredHousing = 'large_house';
          d.lifestyle.reasoning.push(`Home data: ${sqft.toLocaleString()} sqft → large house`);
        } else if (sqft > 800) {
          d.lifestyle.inferredHousing = 'house';
          d.lifestyle.reasoning.push(`Home data: ${sqft.toLocaleString()} sqft → house`);
        } else {
          d.lifestyle.inferredHousing = 'apartment';
          d.lifestyle.reasoning.push(`Home data: ${sqft.toLocaleString()} sqft → apartment`);
        }
        d.signals.push({ category: 'housing', signal: 'Embodied carbon', value: `${embodied.toFixed(1)} tonnes CO2e`, source: 'linkedin' as SourceType, confidence: 0.85 });
      }

      if (type === 'devices') {
        const mfgCo2e = (data.total_co2e_manufacturing_kg as number) || 0;
        const devices = (data.devices || []) as Array<{ name?: string }>;
        const count = devices.length;
        if (count >= 8) {
          d.lifestyle.techFootprint = 'high';
          d.lifestyle.reasoning.push(`Device data: ${count} devices, ${mfgCo2e.toFixed(0)} kg manufacturing CO2e → high tech footprint`);
        } else if (count >= 4) {
          d.lifestyle.techFootprint = 'moderate';
          d.lifestyle.reasoning.push(`Device data: ${count} devices → moderate tech footprint`);
        } else {
          d.lifestyle.techFootprint = 'low';
          d.lifestyle.reasoning.push(`Device data: ${count} devices → low tech footprint`);
        }
        d.signals.push({ category: 'tech', signal: 'Device manufacturing', value: `${mfgCo2e.toFixed(0)} kg CO2e`, source: 'linkedin' as SourceType, confidence: 0.8 });
      }

      // Re-map inputs
      d.mappedInputs = {
        country: d.lifestyle.inferredCountry,
        income: d.lifestyle.estimatedIncome,
        housing: d.lifestyle.inferredHousing,
        transport: d.lifestyle.inferredTransport,
        diet: d.lifestyle.inferredDiet,
        shopping_frequency: d.lifestyle.inferredShopping,
        flights_per_year: d.lifestyle.inferredFlightsPerYear,
        energy_source: d.lifestyle.inferredEnergySource,
        food_waste: 'some',
      };

      return d;
    });
  }, []);

  // Compute live profile from current mapped inputs
  const profile = dossier?.mappedInputs ? computeProfile(dossier.mappedInputs) : null;

  return (
    <div className="min-h-screen relative">
      {/* Background periodic table */}
      {profile && (
        <div className="fixed inset-0 opacity-10 pointer-events-none scale-75">
          <PeriodicTable profile={profile} onElementClick={() => {}} />
        </div>
      )}

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold font-mono tracking-wider mb-2"
            style={{ color: 'var(--neon-cyan)' }}>
            PERSON ANALYSIS
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Deep-scan a person's digital footprint to model their material impact
          </p>
        </motion.div>

        {/* URL Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-xl mx-auto mb-8"
        >
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(''); }}
              placeholder="https://linkedin.com/in/username"
              onKeyDown={(e) => e.key === 'Enter' && !scanning && handleScan()}
              disabled={scanning}
              className="flex-1 px-4 py-3 rounded-lg font-mono text-sm outline-none"
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(0, 240, 255, 0.2)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              onClick={handleScan}
              disabled={scanning || !url}
              className="px-6 py-3 rounded-lg font-mono text-sm tracking-wider whitespace-nowrap"
              style={{
                background: scanning ? 'rgba(0, 240, 255, 0.05)' : 'rgba(0, 240, 255, 0.15)',
                border: '1px solid var(--neon-cyan)',
                color: 'var(--neon-cyan)',
                boxShadow: scanning ? 'none' : '0 0 20px rgba(0, 240, 255, 0.2)',
                opacity: !url || scanning ? 0.5 : 1,
                cursor: scanning || !url ? 'not-allowed' : 'pointer',
              }}
            >
              {scanning ? 'SCANNING...' : 'DEEP SCAN'}
            </button>
          </div>
          {error && (
            <p className="text-sm mt-2" style={{ color: 'var(--neon-red, #ff4444)' }}>{error}</p>
          )}
        </motion.div>

        {/* Source Pipeline */}
        {activeSources.size > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-xl mx-auto mb-8"
          >
            <div className="flex flex-wrap gap-2 justify-center">
              {Array.from(activeSources.values()).map((source) => (
                <SourcePill key={source.type} source={source} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Main Content */}
        <AnimatePresence>
          {dossier && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-4"
            >
              {/* Left Column: Identity + Professional */}
              <div className="space-y-4">
                <IdentityCard dossier={dossier} />
                <ExperienceCard dossier={dossier} />
                <WebPresenceCard dossier={dossier} />
              </div>

              {/* Center Column: Signals + Reasoning */}
              <div className="space-y-4">
                <LifestyleCard dossier={dossier} />
                <SignalsCard dossier={dossier} />
              </div>

              {/* Right Column: Footprint + Actions */}
              <div className="space-y-4">
                <FootprintCard dossier={dossier} profile={profile} />
                <ConfidenceCard dossier={dossier} complete={complete} />
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleUseProfile}
                    className="w-full py-3 rounded-lg font-mono text-sm tracking-wider"
                    style={{
                      background: 'rgba(0, 240, 255, 0.15)',
                      border: '1px solid var(--neon-cyan)',
                      color: 'var(--neon-cyan)',
                      boxShadow: '0 0 20px rgba(0, 240, 255, 0.2)',
                      cursor: 'pointer',
                    }}
                  >
                    VIEW FULL DASHBOARD
                  </button>
                  <button
                    onClick={() => {
                      if (dossier.mappedInputs) {
                        sessionStorage.setItem('userInputs', JSON.stringify(dossier.mappedInputs));
                      }
                      router.push('/quiz');
                    }}
                    className="w-full py-3 rounded-lg font-mono text-sm tracking-wider"
                    style={{
                      background: 'rgba(255, 170, 0, 0.1)',
                      border: '1px solid rgba(255, 170, 0, 0.4)',
                      color: 'var(--neon-orange, #ffaa00)',
                      cursor: 'pointer',
                    }}
                  >
                    REFINE IN QUIZ
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Data Dump Section — always visible after scan starts */}
        {(dossier || scanning) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-mono tracking-wider" style={{ color: 'var(--neon-cyan)' }}>
                BOOST CONFIDENCE
              </h2>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Paste real data to sharpen the model
              </span>
            </div>

            {/* Sample data quick-load buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-xs font-mono self-center" style={{ color: 'var(--text-muted)' }}>
                LOAD SAMPLE:
              </span>
              {(Object.keys(SAMPLE_DATA) as SampleDataType[]).map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    const sample = SAMPLE_DATA[key];
                    // Find the textarea and fill it by dispatching to the DataHub
                    const event = new CustomEvent('load-sample-data', {
                      detail: { type: key, data: sample.data },
                    });
                    window.dispatchEvent(event);
                  }}
                  className="px-3 py-1 rounded-full text-xs font-mono transition-all hover:brightness-125"
                  style={{
                    background: 'rgba(0, 240, 255, 0.08)',
                    border: '1px solid rgba(0, 240, 255, 0.2)',
                    color: 'var(--neon-cyan)',
                    cursor: 'pointer',
                  }}
                >
                  {SAMPLE_DATA[key].label}
                </button>
              ))}
            </div>

            <DataHub
              autoProfile={null}
              onDataParsed={handleDataParsed}
            />
          </motion.div>
        )}
      </div>

      {/* Sticky bottom CTA — visible once dossier exists */}
      {dossier && dossier.name && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 z-30"
          style={{
            background: 'linear-gradient(transparent, rgba(6, 6, 15, 0.95) 30%)',
            paddingTop: '2rem',
          }}
        >
          <div className="max-w-2xl mx-auto px-4 pb-6 flex gap-3">
            <button
              onClick={handleUseProfile}
              className="flex-1 py-3 rounded-lg font-mono text-sm tracking-wider"
              style={{
                background: 'rgba(0, 240, 255, 0.15)',
                border: '1px solid var(--neon-cyan)',
                color: 'var(--neon-cyan)',
                boxShadow: '0 0 20px rgba(0, 240, 255, 0.3)',
                cursor: 'pointer',
              }}
            >
              VIEW FULL DASHBOARD →
            </button>
            <div className="flex items-center gap-2 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              <span style={{ color: 'var(--neon-cyan)' }}>{Math.round(dossier.overallConfidence * 100)}%</span>
              confidence
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SourcePill({ source }: { source: SourceResult }) {
  const isActive = source.status === 'scraping' || source.status === 'analyzing';
  const isDone = source.status === 'done';
  const isFailed = source.status === 'failed';
  const color = SOURCE_COLORS[source.type] || '#00f0ff';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono"
      style={{
        background: `${color}10`,
        border: `1px solid ${color}${isDone ? '60' : isFailed ? '30' : '40'}`,
        color: isFailed ? 'var(--text-muted)' : color,
        opacity: isFailed ? 0.5 : 1,
      }}
    >
      {isActive && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-3 h-3 rounded-full"
          style={{ border: `1.5px solid ${color}`, borderTopColor: 'transparent' }}
        />
      )}
      {isDone && <span style={{ color }}>✓</span>}
      {isFailed && <span>✗</span>}
      <span>{SOURCE_ICONS[source.type]}</span>
      <span>{source.label}</span>
      {source.status === 'analyzing' && <span style={{ opacity: 0.6 }}>analyzing...</span>}
    </motion.div>
  );
}

function GlassCard({ children, color = '0, 240, 255', className = '' }: { children: React.ReactNode; color?: string; className?: string }) {
  return (
    <div
      className={`rounded-xl p-5 ${className}`}
      style={{
        background: `rgba(${color}, 0.03)`,
        border: `1px solid rgba(${color}, 0.12)`,
        backdropFilter: 'blur(10px)',
      }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children, color = 'var(--neon-cyan)' }: { children: React.ReactNode; color?: string }) {
  return (
    <h3 className="text-xs font-mono tracking-wider mb-3" style={{ color }}>{children}</h3>
  );
}

function IdentityCard({ dossier }: { dossier: PersonDossier }) {
  return (
    <GlassCard>
      <div className="flex items-start gap-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
          style={{
            background: 'rgba(0, 240, 255, 0.1)',
            border: '2px solid var(--neon-cyan)',
            boxShadow: '0 0 20px rgba(0, 240, 255, 0.15)',
          }}
        >
          {dossier.photoInitial}
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold truncate" style={{ color: 'var(--text-primary)' }}>
            {dossier.name}
          </h2>
          <p className="text-sm truncate" style={{ color: 'var(--neon-cyan)' }}>
            {dossier.headline}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {dossier.location}
          </p>
        </div>
      </div>
      {dossier.summary && (
        <p className="text-sm mt-3" style={{ color: 'var(--text-muted)' }}>
          {dossier.summary}
        </p>
      )}
    </GlassCard>
  );
}

function ExperienceCard({ dossier }: { dossier: PersonDossier }) {
  if (!dossier.experience.length && !dossier.education.length) return null;
  return (
    <GlassCard>
      {dossier.experience.length > 0 && (
        <>
          <SectionLabel>EXPERIENCE</SectionLabel>
          <div className="space-y-2 mb-4">
            {dossier.experience.slice(0, 4).map((exp, i) => (
              <div key={i} className="text-sm">
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{exp.title}</span>
                <span style={{ color: 'var(--text-muted)' }}> at {exp.company}</span>
                <span className="text-xs ml-1" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>({exp.duration})</span>
              </div>
            ))}
          </div>
        </>
      )}
      {dossier.education.length > 0 && (
        <>
          <SectionLabel>EDUCATION</SectionLabel>
          <div className="space-y-1">
            {dossier.education.map((ed, i) => (
              <div key={i} className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {ed.degree} — {ed.school}
              </div>
            ))}
          </div>
        </>
      )}
    </GlassCard>
  );
}

function WebPresenceCard({ dossier }: { dossier: PersonDossier }) {
  const links = [
    dossier.webPresence.linkedin && { label: 'LinkedIn', icon: 'in', url: dossier.webPresence.linkedin, color: '#0077b5' },
    dossier.webPresence.twitter && { label: 'Twitter/X', icon: 'X', url: dossier.webPresence.twitter, color: '#e8e8f0' },
    dossier.webPresence.github && { label: 'GitHub', icon: '<>', url: dossier.webPresence.github, color: '#c9d1d9' },
    dossier.webPresence.personalSite && { label: 'Website', icon: 'W', url: dossier.webPresence.personalSite, color: '#00ff88' },
    dossier.webPresence.companyPage && { label: 'Company', icon: 'Co', url: dossier.webPresence.companyPage, color: '#ff6b00' },
  ].filter(Boolean) as Array<{ label: string; icon: string; url: string; color: string }>;

  if (!links.length) return null;

  return (
    <GlassCard>
      <SectionLabel>WEB PRESENCE</SectionLabel>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <a
            key={link.label}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono no-underline transition-all hover:brightness-125"
            style={{
              background: `${link.color}15`,
              border: `1px solid ${link.color}40`,
              color: link.color,
            }}
          >
            <span className="font-bold">{link.icon}</span>
            <span>{link.label}</span>
          </a>
        ))}
        {dossier.webPresence.otherUrls.length > 0 && (
          <span className="flex items-center px-3 py-1.5 rounded-full text-xs font-mono"
            style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            +{dossier.webPresence.otherUrls.length} more
          </span>
        )}
      </div>
    </GlassCard>
  );
}

function LifestyleCard({ dossier }: { dossier: PersonDossier }) {
  const l = dossier.lifestyle;
  const signals = [
    { label: 'INCOME', value: `$${l.estimatedIncome.toLocaleString()}`, color: 'var(--neon-cyan)', confidence: l.incomeConfidence },
    { label: 'COUNTRY', value: l.inferredCountry, color: 'var(--neon-cyan)' },
    { label: 'HOUSING', value: (l.inferredHousing || 'house').replace(/_/g, ' '), color: 'var(--neon-green, #00ff88)' },
    { label: 'TRANSPORT', value: (l.inferredTransport || 'car').replace(/_/g, ' '), color: 'var(--neon-red, #ff0040)' },
    { label: 'DIET', value: l.inferredDiet || 'omnivore', color: 'var(--neon-orange, #ffaa00)' },
    { label: 'SHOPPING', value: l.inferredShopping || 'average', color: 'var(--neon-orange, #ffaa00)' },
    { label: 'FLIGHTS/YR', value: String(l.inferredFlightsPerYear), color: 'var(--neon-red, #ff0040)' },
    l.techFootprint && { label: 'TECH', value: l.techFootprint, color: '#7c3aed' },
    l.sustainabilityAwareness && { label: 'ECO AWARE', value: l.sustainabilityAwareness, color: 'var(--neon-green, #00ff88)' },
    l.travelIntensity && { label: 'TRAVEL', value: l.travelIntensity, color: 'var(--neon-red, #ff0040)' },
  ].filter(Boolean) as Array<{ label: string; value: string; color: string; confidence?: number }>;

  return (
    <GlassCard color="255, 170, 0">
      <SectionLabel color="var(--neon-orange, #ffaa00)">INFERRED LIFESTYLE</SectionLabel>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {signals.map((s) => (
          <div key={s.label}>
            <div className="text-[10px] font-mono tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {s.label}
            </div>
            <div className="text-sm font-medium capitalize" style={{ color: s.color }}>
              {s.value}
              {s.confidence !== undefined && (
                <span className="text-[10px] ml-1" style={{ color: 'var(--text-muted)' }}>
                  {Math.round(s.confidence * 100)}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Reasoning */}
      {l.reasoning.length > 0 && (
        <div className="pt-3" style={{ borderTop: '1px solid rgba(255, 170, 0, 0.1)' }}>
          <div className="text-[10px] font-mono mb-2" style={{ color: 'var(--text-muted)' }}>REASONING</div>
          <ul className="space-y-1">
            {l.reasoning.map((r, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="text-xs flex gap-2"
                style={{ color: 'var(--text-muted)' }}
              >
                <span style={{ color: 'var(--neon-orange, #ffaa00)' }}>-</span>
                {r}
              </motion.li>
            ))}
          </ul>
        </div>
      )}
    </GlassCard>
  );
}

function SignalsCard({ dossier }: { dossier: PersonDossier }) {
  if (!dossier.signals.length) return null;

  return (
    <GlassCard color="0, 255, 136">
      <SectionLabel color="var(--neon-green, #00ff88)">CONSUMPTION SIGNALS</SectionLabel>
      <div className="space-y-2">
        {dossier.signals.map((sig, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-start gap-2 text-xs"
          >
            <span
              className="px-1.5 py-0.5 rounded font-mono shrink-0"
              style={{
                background: `${SOURCE_COLORS[sig.source]}20`,
                color: SOURCE_COLORS[sig.source],
                fontSize: '9px',
              }}
            >
              {SOURCE_ICONS[sig.source]}
            </span>
            <div>
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{sig.signal}</span>
              <span className="ml-1" style={{ color: 'var(--text-muted)' }}>— {sig.value}</span>
              <div className="mt-0.5 h-1 rounded-full" style={{ width: `${sig.confidence * 100}%`, background: `${SOURCE_COLORS[sig.source]}40`, maxWidth: 80 }} />
            </div>
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );
}

function FootprintCard({ dossier, profile }: { dossier: PersonDossier; profile: ReturnType<typeof computeProfile> | null }) {
  if (!profile) return null;

  const carbon = profile.carbon;
  const co2e = carbon?.total_co2e_tonnes ?? 0;
  const earths = co2e / 2.5;

  return (
    <GlassCard color="255, 0, 64">
      <SectionLabel color="var(--neon-red, #ff0040)">MATERIAL FOOTPRINT</SectionLabel>

      <div className="text-center mb-4">
        <div className="text-4xl font-bold font-mono" style={{ color: 'var(--neon-red, #ff0040)' }}>
          {profile.annualThroughput_tonnes.toFixed(1)}
        </div>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>tonnes / year</div>
      </div>

      {co2e > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="text-center">
            <div className="text-lg font-bold font-mono" style={{ color: earths > 1.5 ? 'var(--neon-red, #ff0040)' : 'var(--neon-green, #00ff88)' }}>
              {earths.toFixed(1)}
            </div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>EARTHS</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold font-mono" style={{ color: 'var(--neon-orange, #ffaa00)' }}>
              {co2e.toFixed(1)}
            </div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>t CO2e</div>
          </div>
        </div>
      )}

      {/* Material breakdown bar */}
      <div className="space-y-1">
        {(['biomass', 'fossil_fuels', 'metals', 'minerals'] as const).map(cat => {
          const val = profile.flows.inbound[cat];
          const total = Object.values(profile.flows.inbound).reduce((a, b) => a + b, 0);
          const pct = total > 0 ? (val / total) * 100 : 0;
          const colors = { biomass: '#00ff88', fossil_fuels: '#ff0040', metals: '#ff6b00', minerals: '#00f0ff' };
          return (
            <div key={cat} className="flex items-center gap-2 text-[10px]">
              <span className="w-16 text-right font-mono" style={{ color: 'var(--text-muted)' }}>
                {cat.replace(/_/g, ' ')}
              </span>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="h-full rounded-full"
                  style={{ background: colors[cat] }}
                />
              </div>
              <span className="w-8 text-right font-mono" style={{ color: colors[cat] }}>
                {Math.round(pct)}%
              </span>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

function ConfidenceCard({ dossier, complete }: { dossier: PersonDossier; complete: boolean }) {
  const doneSources = dossier.sources.filter(s => s.status === 'done').length;
  const totalSources = dossier.sources.length;

  return (
    <GlassCard>
      <SectionLabel>ANALYSIS CONFIDENCE</SectionLabel>
      <div className="flex items-center gap-3 mb-2">
        <div className="text-2xl font-bold font-mono" style={{ color: 'var(--neon-cyan)' }}>
          {Math.round(dossier.overallConfidence * 100)}%
        </div>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {doneSources}/{totalSources} sources analyzed
          {!complete && <span className="ml-1" style={{ color: 'var(--neon-cyan)' }}>scanning...</span>}
        </div>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0, 240, 255, 0.1)' }}>
        <motion.div
          animate={{ width: `${dossier.overallConfidence * 100}%` }}
          transition={{ duration: 0.5 }}
          className="h-full rounded-full"
          style={{ background: 'var(--neon-cyan)', boxShadow: '0 0 10px rgba(0, 240, 255, 0.4)' }}
        />
      </div>
    </GlassCard>
  );
}
