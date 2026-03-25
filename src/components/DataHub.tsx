'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatMass } from '@/lib/estimation-engine';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AutoProfile {
  city?: string;
  state?: string;
  income?: number;
  housing?: string;
  transport?: string;
  commuteMode?: string;
  gridRegion?: string;
  gridCarbonIntensity?: number;
  confidence: number;
  sources: string[];
}

interface DataHubProps {
  autoProfile: AutoProfile | null;
  onDataParsed?: (type: string, data: any) => void;
}

type CardType = 'bank' | 'receipt' | 'home' | 'devices';

interface CardConfig {
  type: CardType;
  icon: string;
  title: string;
  placeholder: string;
  confidenceGain: number;
}

const CARDS: CardConfig[] = [
  {
    type: 'bank',
    icon: '📎',
    title: 'Bank Statement',
    placeholder:
      'Paste your bank transactions or statement summary here...\n\nExample:\nGrocery Store  $120.45\nGas Station    $48.00\nElectric Bill  $95.00\nRestaurant     $62.30',
    confidenceGain: 12,
  },
  {
    type: 'receipt',
    icon: '🧾',
    title: 'Grocery Receipt',
    placeholder:
      'Paste your grocery receipt here...\n\nExample:\nOrganic Apples  2 lbs  $4.99\nChicken Breast  1.5 lbs  $8.49\nWhole Milk  1 gal  $5.29\nBrown Rice  2 lbs  $3.99',
    confidenceGain: 8,
  },
  {
    type: 'home',
    icon: '🏠',
    title: 'Describe Your Home',
    placeholder:
      'Describe your home...\n\nExample:\n2-story house, 2,200 sq ft, built in 1985. Wood frame with brick exterior. 3 bedrooms, 2 bathrooms. Attached 2-car garage.',
    confidenceGain: 10,
  },
  {
    type: 'devices',
    icon: '📱',
    title: 'List Your Devices',
    placeholder:
      'List your electronic devices...\n\nExample:\niPhone 14 Pro\nMacBook Pro 14-inch (2023)\nIPad Air\nSamsung 65" TV\nPS5\nAirPods Pro',
    confidenceGain: 6,
  },
];

// ─── Result summary renderers ─────────────────────────────────────────────────

function BankSummary({ data }: { data: any }) {
  const cats = data.categories ?? {};
  const top = Object.entries(cats)
    .filter(([, v]) => (v as number) > 0)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 4);
  return (
    <div className="space-y-1">
      <p className="text-xs text-gray-400 mb-2">
        Monthly total: <span className="text-cyan-300 font-semibold">{data.currency} {(data.monthly_total ?? 0).toLocaleString()}</span>
      </p>
      {top.map(([key, val]) => (
        <div key={key} className="flex justify-between text-xs">
          <span className="text-gray-300 capitalize">{key.replace(/_/g, ' ')}</span>
          <span className="text-cyan-400 font-mono">{data.currency} {(val as number).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function ReceiptSummary({ data }: { data: any }) {
  const items: any[] = data.items ?? [];
  const topItems = items.slice(0, 4);
  return (
    <div className="space-y-1">
      <p className="text-xs text-gray-400 mb-2">
        Total food mass: <span className="text-cyan-300 font-semibold">{formatMass(data.total_kg ?? 0)}</span>
        {' · '}
        CO2e: <span className="text-orange-300 font-semibold">{(data.estimated_co2e_kg ?? 0).toFixed(1)} kg</span>
      </p>
      {topItems.map((item: any, i: number) => (
        <div key={i} className="flex justify-between text-xs">
          <span className="text-gray-300">{item.name}</span>
          <span className="text-cyan-400 font-mono">{formatMass(item.quantity_kg)}</span>
        </div>
      ))}
    </div>
  );
}

function HomeSummary({ data }: { data: any }) {
  const mats = data.materials ?? {};
  return (
    <div className="space-y-1">
      <p className="text-xs text-gray-400 mb-2">
        {data.sqft?.toLocaleString()} sqft · Built {data.year_built} · {data.stories} {data.stories === 1 ? 'story' : 'stories'}
        <br />
        Embodied carbon: <span className="text-orange-300 font-semibold">{(data.estimated_co2e_embodied_tonnes ?? 0).toFixed(1)} tonnes CO2e</span>
      </p>
      {mats.concrete_tonnes > 0 && (
        <div className="flex justify-between text-xs">
          <span className="text-gray-300">Concrete</span>
          <span className="text-cyan-400 font-mono">{formatMass(mats.concrete_tonnes * 1000)}</span>
        </div>
      )}
      {mats.wood_tonnes > 0 && (
        <div className="flex justify-between text-xs">
          <span className="text-gray-300">Wood</span>
          <span className="text-cyan-400 font-mono">{formatMass(mats.wood_tonnes * 1000)}</span>
        </div>
      )}
      {mats.steel_tonnes > 0 && (
        <div className="flex justify-between text-xs">
          <span className="text-gray-300">Steel</span>
          <span className="text-cyan-400 font-mono">{formatMass(mats.steel_tonnes * 1000)}</span>
        </div>
      )}
    </div>
  );
}

function DevicesSummary({ data }: { data: any }) {
  const devices: any[] = data.devices ?? [];
  return (
    <div className="space-y-1">
      <p className="text-xs text-gray-400 mb-2">
        Total mass: <span className="text-cyan-300 font-semibold">{formatMass(data.total_weight_kg ?? 0)}</span>
        {' · '}
        Mfg CO2e: <span className="text-orange-300 font-semibold">{(data.total_co2e_manufacturing_kg ?? 0).toFixed(0)} kg</span>
      </p>
      {devices.slice(0, 4).map((d: any, i: number) => (
        <div key={i} className="flex justify-between text-xs">
          <span className="text-gray-300">{d.name}</span>
          <span className="text-cyan-400 font-mono">{formatMass(d.weight_kg)}</span>
        </div>
      ))}
    </div>
  );
}

function ResultSummary({ type, data }: { type: CardType; data: any }) {
  if (type === 'bank') return <BankSummary data={data} />;
  if (type === 'receipt') return <ReceiptSummary data={data} />;
  if (type === 'home') return <HomeSummary data={data} />;
  if (type === 'devices') return <DevicesSummary data={data} />;
  return null;
}

// ─── Expandable card ──────────────────────────────────────────────────────────

function DataCard({
  config,
  onDataParsed,
}: {
  config: CardConfig;
  onDataParsed?: (type: string, data: any) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleSampleData(e: Event) {
      const { type, data } = (e as CustomEvent).detail;
      if (type === config.type) {
        setText(data);
        setExpanded(true);
        setResult(null);
        setError(null);
      }
    }
    window.addEventListener('load-sample-data', handleSampleData);
    return () => window.removeEventListener('load-sample-data', handleSampleData);
  }, [config.type]);

  async function handleAnalyze() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/parse-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: config.type, text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Analysis failed');
      setResult(data);
      onDataParsed?.(config.type, data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="rounded-xl border transition-all duration-300"
      style={{
        borderColor: expanded ? 'rgba(34,211,238,0.6)' : 'rgba(34,211,238,0.2)',
        borderStyle: expanded ? 'solid' : 'dashed',
        background: 'rgba(10,20,40,0.6)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left group"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{config.icon}</span>
          <span className="text-sm font-semibold text-white/90 group-hover:text-cyan-300 transition-colors">
            {config.title}
          </span>
          {result && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-xs font-mono px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(34,211,238,0.15)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.4)' }}
            >
              +{config.confidenceGain}% confidence
            </motion.span>
          )}
        </div>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-cyan-400/60 text-xs"
        >
          ▼
        </motion.span>
      </button>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-4 pb-4 space-y-3">
              {!result ? (
                <>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={config.placeholder}
                    rows={6}
                    className="w-full rounded-lg px-3 py-2 text-xs font-mono resize-none focus:outline-none focus:ring-1"
                    style={{
                      background: 'rgba(0,10,20,0.8)',
                      border: '1px solid rgba(34,211,238,0.25)',
                      color: 'rgba(255,255,255,0.85)',
                      outline: 'none',
                    }}
                    disabled={loading}
                  />
                  <button
                    onClick={handleAnalyze}
                    disabled={loading || !text.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: loading || !text.trim()
                        ? 'rgba(34,211,238,0.08)'
                        : 'rgba(34,211,238,0.15)',
                      border: '1px solid rgba(34,211,238,0.4)',
                      color: loading || !text.trim() ? 'rgba(34,211,238,0.4)' : '#22d3ee',
                      cursor: loading || !text.trim() ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {loading ? (
                      <>
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                          className="inline-block w-3 h-3 border border-cyan-400 border-t-transparent rounded-full"
                        />
                        Claude is analyzing...
                      </>
                    ) : (
                      'Analyze with AI'
                    )}
                  </button>
                  {error && (
                    <p className="text-xs text-red-400/80">{error}</p>
                  )}
                </>
              ) : (
                <motion.div
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="rounded-lg p-3"
                  style={{
                    background: 'rgba(34,211,238,0.05)',
                    border: '1px solid rgba(34,211,238,0.25)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-green-400 text-sm">✓</span>
                    <span className="text-xs font-semibold text-green-300">Parsed successfully</span>
                  </div>
                  <ResultSummary type={config.type} data={result} />
                  <button
                    onClick={() => { setResult(null); setText(''); setError(null); }}
                    className="mt-3 text-xs text-cyan-400/50 hover:text-cyan-400 transition-colors"
                  >
                    Re-enter data
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DataHub({ autoProfile, onDataParsed }: DataHubProps) {
  const autoConfidencePct = autoProfile ? Math.round(autoProfile.confidence * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Section 1: Auto-Detected */}
      <div
        className="rounded-xl p-4"
        style={{
          background: 'rgba(10,20,40,0.7)',
          border: '1px solid rgba(34,211,238,0.3)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-mono tracking-[0.2em] text-cyan-400/70 uppercase">
            Auto-Detected
          </h3>
          <span
            className="text-xs font-mono px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(34,211,238,0.12)',
              color: '#22d3ee',
              border: '1px solid rgba(34,211,238,0.3)',
            }}
          >
            {autoConfidencePct}% confidence
          </span>
        </div>

        {autoProfile ? (
          <div className="space-y-2">
            {(autoProfile.city || autoProfile.state) && (
              <AutoItem
                label="Location"
                value={[autoProfile.city, autoProfile.state].filter(Boolean).join(', ')}
                confidence="+15%"
              />
            )}
            {autoProfile.income != null && (
              <AutoItem
                label="Census income"
                value={`$${autoProfile.income.toLocaleString()} / yr`}
                confidence="+10%"
              />
            )}
            {autoProfile.housing && (
              <AutoItem
                label="Housing type"
                value={autoProfile.housing.replace(/_/g, ' ')}
                confidence="+8%"
              />
            )}
            {autoProfile.gridRegion && autoProfile.gridCarbonIntensity != null && (
              <AutoItem
                label="Grid"
                value={`${autoProfile.gridRegion} · ${autoProfile.gridCarbonIntensity} kg CO2/kWh`}
                confidence="+5%"
              />
            )}
            {autoProfile.commuteMode && (
              <AutoItem
                label="Commute"
                value={autoProfile.commuteMode}
                confidence="+8%"
              />
            )}
            {autoProfile.sources.length === 0 && (
              <p className="text-xs text-gray-500 italic">No data sources detected yet.</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-500 italic">Loading auto-detected data...</p>
        )}
      </div>

      {/* Section 2: Connect More Data */}
      <div>
        <h3 className="text-xs font-mono tracking-[0.2em] text-cyan-400/70 uppercase mb-3">
          Connect More Data
        </h3>
        <div className="space-y-2">
          {CARDS.map((card) => (
            <DataCard key={card.type} config={card} onDataParsed={onDataParsed} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Auto-detected row ────────────────────────────────────────────────────────

function AutoItem({
  label,
  value,
  confidence,
}: {
  label: string;
  value: string;
  confidence: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-green-400 text-xs flex-shrink-0">✓</span>
        <span className="text-xs text-gray-400 flex-shrink-0">{label}:</span>
        <span className="text-xs text-white/80 truncate">{value}</span>
      </div>
      <span className="text-xs font-mono text-cyan-500/70 flex-shrink-0">{confidence}</span>
    </div>
  );
}
