'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserInputs, Scope, ElementSymbol, MaterialCategory, ElementalProfile } from '@/lib/types';
import { computeProfile, scaleProfile, getComparison, formatMass, computeImpactMetrics } from '@/lib/estimation-engine';
import { computeCarbonFootprint } from '@/lib/carbon';
import { computeRecommendations } from '@/lib/recommendations';
import { ELEMENT_MAP, FUN_FACTS } from '@/lib/elements';
import ImpactHero from '@/components/ImpactHero';
import PeriodicTable from '@/components/PeriodicTable';
import FlowDiagram from '@/components/FlowDiagram';
import ScaleSlider from '@/components/ScaleSlider';
import ComparisonView from '@/components/ComparisonView';
import ScaleVisualization from '@/components/ScaleVisualization';
import MolecularView from '@/components/MolecularView';
import RecommendationsView from '@/components/RecommendationsView';
import ProductScanner from '@/components/ProductScanner';
import ScenarioSimulator from '@/components/ScenarioSimulator';
import DataHub from '@/components/DataHub';
import Marketplace from '@/components/Marketplace';
import HumanSilhouette from '@/components/HumanSilhouette';

// Sustainable target: planetary boundary per capita
const WORLD_POP = 8.1e9;
const PLANET_CAP: Record<MaterialCategory, number> = {
  biomass: 20e12, metals: 10e12, minerals: 35e12, fossil_fuels: 2e12,
};
const targetFlows = {
  inbound: {
    biomass: PLANET_CAP.biomass / WORLD_POP,
    metals: PLANET_CAP.metals / WORLD_POP,
    minerals: PLANET_CAP.minerals / WORLD_POP,
    fossil_fuels: PLANET_CAP.fossil_fuels / WORLD_POP,
  },
  outbound: { biomass: 0, metals: 0, minerals: 0, fossil_fuels: 0 },
};
const sustainableTarget: ElementalProfile = {
  scope: 'person',
  name: 'Sustainable Target',
  confidence: 1.0,
  composition: {},
  flows: targetFlows,
  knownInputs: [],
  totalMass_kg: 0,
  annualThroughput_tonnes: Object.values(targetFlows.inbound).reduce((s, v) => s + v, 0) / 1000,
  carbon: computeCarbonFootprint(targetFlows),
};

const TABS = [
  { key: 'footprint' as const, label: 'MY FOOTPRINT', desc: 'Where your impact comes from' },
  { key: 'action' as const, label: 'TAKE ACTION', desc: 'What you can do about it' },
  { key: 'explore' as const, label: 'EXPLORE', desc: 'The science behind it all' },
];

type TabKey = 'footprint' | 'action' | 'explore';

// Category breakdown inline component
function CategoryBreakdown({ profile }: { profile: ElementalProfile }) {
  const carbon = profile.carbon;
  if (!carbon) return null;

  const categories = [
    { key: 'biomass', label: 'Food & Biomass', value: carbon.by_category.biomass, color: '#00ff88' },
    { key: 'fossil_fuels', label: 'Fossil Fuels & Transport', value: carbon.by_category.fossil_fuels, color: '#ff0040' },
    { key: 'metals', label: 'Metals & Manufacturing', value: carbon.by_category.metals, color: '#ff6b00' },
    { key: 'minerals', label: 'Minerals & Construction', value: carbon.by_category.minerals, color: '#00f0ff' },
  ];

  const total = categories.reduce((s, c) => s + c.value, 0);
  const maxVal = Math.max(...categories.map(c => c.value), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        borderRadius: '1rem',
        padding: '1.25rem',
        background: 'linear-gradient(135deg, rgba(0,6,20,0.97) 0%, rgba(10,0,20,0.97) 100%)',
        border: '1px solid rgba(0,240,255,0.12)',
        boxShadow: '0 0 40px rgba(0,0,0,0.5)',
        marginBottom: '1.5rem',
      }}
    >
      <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.7rem', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
        YOUR FOOTPRINT BY CATEGORY
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {categories.map((cat, idx) => {
          const pct = total > 0 ? (cat.value / total * 100) : 0;
          const barPct = maxVal > 0 ? (cat.value / maxVal * 100) : 0;
          return (
            <div key={cat.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.2rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.65)' }}>{cat.label}</span>
                <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: cat.color }}>
                  {(cat.value / 1000).toFixed(1)}t ({pct.toFixed(0)}%)
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 9999, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barPct}%` }}
                  transition={{ duration: 0.8, delay: idx * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                  style={{
                    height: '100%',
                    borderRadius: 9999,
                    background: `linear-gradient(90deg, ${cat.color}99, ${cat.color})`,
                    boxShadow: `0 0 8px ${cat.color}66`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '0.75rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', textAlign: 'right' }}>
        Total: {(total / 1000).toFixed(1)}t CO2e/yr
      </div>
    </motion.div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inputs, setInputs] = useState<UserInputs>({});
  const [currentScale, setCurrentScale] = useState<Scope>('person');
  const [selectedElement, setSelectedElement] = useState<ElementSymbol | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('footprint');
  const [exploreView, setExploreView] = useState<'elements' | 'molecules' | 'scan' | 'body'>('elements');
  const [showShareToast, setShowShareToast] = useState(false);
  const [marketplaceCategory, setMarketplaceCategory] = useState<string | null>(null);
  const marketplaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const urlCountry = searchParams.get('country');
    const urlTab = searchParams.get('tab') as TabKey | null;
    if (urlTab && ['footprint', 'action', 'explore'].includes(urlTab)) {
      setActiveTab(urlTab);
    }
    if (urlCountry) {
      const fromUrl: UserInputs = {
        country: searchParams.get('country') || undefined,
        income: searchParams.get('income') ? Number(searchParams.get('income')) : undefined,
        diet: searchParams.get('diet') as UserInputs['diet'] || undefined,
        housing: searchParams.get('housing') as UserInputs['housing'] || undefined,
        transport: searchParams.get('transport') as UserInputs['transport'] || undefined,
        age: searchParams.get('age') ? Number(searchParams.get('age')) : undefined,
        sex: searchParams.get('sex') as UserInputs['sex'] || undefined,
      };
      setInputs(fromUrl);
    } else {
      const stored = sessionStorage.getItem('userInputs');
      if (stored) setInputs(JSON.parse(stored));
      else setInputs({ country: 'US', income: 75000, diet: 'omnivore', housing: 'house', transport: 'car' });
    }
  }, []);

  const baseProfile = computeProfile(inputs);
  const profile = scaleProfile(baseProfile, currentScale);
  const nationalAvg = getComparison(inputs.country || 'US');
  const globalAvg = getComparison('GLOBAL');
  const recommendations = computeRecommendations(inputs);
  const metrics = computeImpactMetrics(baseProfile, sustainableTarget, globalAvg);

  const handleElementClick = useCallback((symbol: ElementSymbol) => {
    setSelectedElement(prev => prev === symbol ? null : symbol);
  }, []);

  const funFact = selectedElement ? FUN_FACTS.find(f => f.element === selectedElement) : null;
  const elementInfo = selectedElement ? ELEMENT_MAP[selectedElement] : null;
  const elementContribution = selectedElement ? profile.composition[selectedElement] : null;

  const handleFindSwaps = useCallback((category: string) => {
    setMarketplaceCategory(category);
    setActiveTab('action');
    setTimeout(() => {
      marketplaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, []);

  return (
    <div className="min-h-screen p-4 md:p-8 pb-16">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            <span className="glow-cyan">GLOBAL</span>{' '}
            <span className="text-[var(--text-muted)]">OPTIMIZATION</span>{' '}
            <span className="glow-orange">SYSTEM</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const params = new URLSearchParams();
              Object.entries(inputs).forEach(([k, v]) => { if (v !== undefined) params.set(k, String(v)); });
              const url = `${window.location.origin}/dashboard?${params.toString()}`;
              navigator.clipboard.writeText(url);
              setShowShareToast(true);
              setTimeout(() => setShowShareToast(false), 2000);
            }}
            className="px-4 py-2 text-sm border border-[var(--neon-green)] text-[var(--neon-green)] rounded-lg hover:bg-[rgba(0,255,136,0.1)] transition-colors"
          >
            Share Profile
          </button>
          <button
            onClick={() => router.push('/quiz')}
            className="px-4 py-2 text-sm border border-[var(--neon-cyan)] text-[var(--neon-cyan)] rounded-lg hover:bg-[rgba(0,240,255,0.1)] transition-colors"
          >
            Retake Quiz
          </button>
        </div>
      </motion.header>

      {/* Impact Hero — always visible */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="mb-6"
      >
        <ImpactHero
          profile={baseProfile}
          metrics={metrics}
          recommendations={recommendations}
          sustainableTarget={sustainableTarget}
          onTabSwitch={(tab) => setActiveTab(tab as TabKey)}
        />
      </motion.div>

      {/* Tab Navigation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="flex gap-3 mb-6"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 rounded-xl py-3 px-4 text-center transition-all duration-200"
            style={{
              background: activeTab === tab.key ? 'rgba(0,240,255,0.08)' : 'rgba(255,255,255,0.02)',
              border: activeTab === tab.key ? '1px solid rgba(0,240,255,0.4)' : '1px solid rgba(255,255,255,0.06)',
              boxShadow: activeTab === tab.key ? '0 0 16px rgba(0,240,255,0.15), inset 0 0 16px rgba(0,240,255,0.03)' : 'none',
            }}
          >
            <div style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.15em',
              color: activeTab === tab.key ? '#00f0ff' : 'rgba(255,255,255,0.5)',
              textShadow: activeTab === tab.key ? '0 0 8px rgba(0,240,255,0.5)' : 'none',
            }}>
              {tab.label}
            </div>
            <div style={{
              fontSize: '0.6rem',
              color: activeTab === tab.key ? 'rgba(0,240,255,0.6)' : 'rgba(255,255,255,0.25)',
              marginTop: '0.15rem',
            }}>
              {tab.desc}
            </div>
          </button>
        ))}
      </motion.div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {/* ═══ MY FOOTPRINT ═══ */}
        {activeTab === 'footprint' && (
          <motion.div
            key="footprint"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
          >
            <CategoryBreakdown profile={baseProfile} />

            <ComparisonView
              profile={baseProfile}
              nationalAvg={nationalAvg}
              globalAvg={globalAvg}
              sustainableTarget={sustainableTarget}
            />

            <div className="mt-6">
              <FlowDiagram profile={baseProfile} />
            </div>
          </motion.div>
        )}

        {/* ═══ TAKE ACTION ═══ */}
        {activeTab === 'action' && (
          <motion.div
            key="action"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
          >
            {baseProfile.carbon && (
              <RecommendationsView
                recommendations={recommendations}
                baselineCarbon={baseProfile.carbon}
                onFindSwaps={handleFindSwaps}
              />
            )}

            <div ref={marketplaceRef} className="mt-8">
              <h3 style={{ fontSize: '0.7rem', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>
                SWAP MARKETPLACE
              </h3>
              <Marketplace
                initialCategory={marketplaceCategory}
                userInputs={inputs}
              />
            </div>

            {baseProfile.carbon && (
              <div className="mt-8">
                <ScenarioSimulator
                  recommendations={recommendations}
                  baselineCarbon={baseProfile.carbon}
                />
              </div>
            )}

            <div className="mt-8">
              <h3 style={{ fontSize: '0.7rem', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>
                IMPROVE YOUR ACCURACY
              </h3>
              <DataHub autoProfile={null} />
            </div>
          </motion.div>
        )}

        {/* ═══ EXPLORE ═══ */}
        {activeTab === 'explore' && (
          <motion.div
            key="explore"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
          >
            {/* Scale Slider */}
            <div className="mb-6">
              <ScaleSlider currentScale={currentScale} onScaleChange={setCurrentScale} />
            </div>

            {currentScale === 'person' ? (
              <>
                {/* Sub-navigation for explore views */}
                <div className="flex gap-3 mb-6">
                  {([
                    { key: 'elements' as const, label: 'ELEMENTS' },
                    { key: 'molecules' as const, label: 'MOLECULES' },
                    { key: 'scan' as const, label: 'PRODUCT SCAN' },
                    { key: 'body' as const, label: 'BODY MAP' },
                  ]).map((v) => (
                    <button
                      key={v.key}
                      onClick={() => setExploreView(v.key)}
                      className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                        exploreView === v.key
                          ? 'bg-[rgba(0,240,255,0.1)] text-[var(--neon-cyan)] box-glow-cyan'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {exploreView === 'elements' && (
                    <motion.div
                      key="elements"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex gap-8"
                    >
                      <div className="flex-1">
                        <PeriodicTable profile={profile} onElementClick={handleElementClick} />
                      </div>

                      <AnimatePresence>
                        {selectedElement && elementInfo && (
                          <motion.div
                            initial={{ opacity: 0, x: 40, width: 0 }}
                            animate={{ opacity: 1, x: 0, width: 320 }}
                            exit={{ opacity: 0, x: 40, width: 0 }}
                            className="bg-[var(--bg-card)] rounded-xl p-6 border border-[rgba(255,255,255,0.1)] h-fit"
                            style={{ boxShadow: `0 0 30px ${elementInfo.color}22` }}
                          >
                            <div className="text-center mb-4">
                              <span className="text-6xl font-bold" style={{ color: elementInfo.color, textShadow: `0 0 20px ${elementInfo.color}` }}>
                                {elementInfo.symbol}
                              </span>
                              <p className="text-lg mt-2">{elementInfo.name}</p>
                              <p className="text-sm text-[var(--text-muted)]">#{elementInfo.number} &middot; {elementInfo.mass} u</p>
                            </div>

                            {elementContribution && (
                              <div className="space-y-3 mt-6">
                                <div className="flex justify-between text-sm">
                                  <span className="text-[var(--text-muted)]">In your body:</span>
                                  <span className="font-mono" style={{ color: elementInfo.color }}>
                                    {formatMass(elementContribution.mass_kg)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-[var(--text-muted)]">Percentage:</span>
                                  <span className="font-mono" style={{ color: elementInfo.color }}>
                                    {elementContribution.percentage.toFixed(4)}%
                                  </span>
                                </div>
                                <div className="w-full bg-[rgba(255,255,255,0.05)] rounded-full h-2 mt-2">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(elementContribution.percentage * 1.5, 100)}%` }}
                                    className="h-2 rounded-full"
                                    style={{ background: elementInfo.color }}
                                  />
                                </div>
                              </div>
                            )}

                            {funFact && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="mt-6 p-4 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)]"
                              >
                                <p className="text-sm text-[var(--text-muted)] italic">{funFact.fact}</p>
                              </motion.div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}

                  {exploreView === 'molecules' && baseProfile.molecules && baseProfile.carbon && (
                    <motion.div
                      key="molecules"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                    >
                      <MolecularView molecules={baseProfile.molecules} carbon={baseProfile.carbon} />
                    </motion.div>
                  )}

                  {exploreView === 'scan' && (
                    <motion.div
                      key="scan"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                    >
                      <ProductScanner />
                    </motion.div>
                  )}

                  {exploreView === 'body' && (
                    <motion.div
                      key="body"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                    >
                      <HumanSilhouette
                        profile={baseProfile}
                        scale={currentScale}
                        onRegionClick={(el) => handleElementClick(el as ElementSymbol)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <ScaleVisualization
                profile={profile}
                scale={currentScale}
                onElementClick={handleElementClick}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Impact fact ticker */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="fixed bottom-0 left-0 right-0 bg-[rgba(6,6,15,0.9)] border-t border-[rgba(255,255,255,0.05)] p-3 z-50"
      >
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <span className="text-xs text-[var(--neon-cyan)] font-mono">IMPACT</span>
          <span className="text-sm text-[var(--text-muted)]">
            The average American uses ~28 tonnes of materials per year — that&apos;s 2.1x the global average of 13.2 tonnes.
          </span>
        </div>
      </motion.div>

      {/* Share toast */}
      <AnimatePresence>
        {showShareToast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.22 }}
            className="fixed bottom-16 right-6 z-[60] px-4 py-2 rounded-lg text-sm font-mono"
            style={{
              background: 'rgba(0,255,136,0.12)',
              border: '1px solid var(--neon-green)',
              color: 'var(--neon-green)',
              boxShadow: '0 0 16px rgba(0,255,136,0.25)',
            }}
          >
            Link copied!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#06060f]" />}>
      <DashboardContent />
    </Suspense>
  );
}
