'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { PersonAnalysis, UserInputs } from '@/lib/types';

interface LinkedInImportProps {
  onUseInputs: (inputs: UserInputs) => void;
  onBack: () => void;
}

export default function LinkedInImport({ onUseInputs, onBack }: LinkedInImportProps) {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<PersonAnalysis | null>(null);

  const handleScan = async () => {
    if (!url.includes('linkedin.com/in/')) {
      setError('Please enter a valid LinkedIn profile URL');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/linkedin-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to analyze profile');
      }

      const data: PersonAnalysis = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleUseProfile = () => {
    if (!result) return;
    sessionStorage.setItem('userInputs', JSON.stringify(result.mappedInputs));
    router.push('/dashboard');
  };

  const handleRefineInQuiz = () => {
    if (!result) return;
    onUseInputs(result.mappedInputs);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <AnimatePresence mode="wait">
        {!result ? (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Header */}
            <div className="text-center mb-8">
              <h2
                className="text-2xl font-bold font-mono tracking-wider mb-2"
                style={{ color: 'var(--neon-cyan)' }}
              >
                LINKEDIN IMPORT
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Paste a LinkedIn profile URL to auto-generate a material footprint
              </p>
            </div>

            {/* URL Input */}
            <div
              className="rounded-xl p-6 mb-4"
              style={{
                background: 'rgba(0, 240, 255, 0.03)',
                border: '1px solid rgba(0, 240, 255, 0.15)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <label
                className="block text-xs font-mono tracking-wider mb-3"
                style={{ color: 'var(--neon-cyan)' }}
              >
                PROFILE URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setError(''); }}
                placeholder="https://linkedin.com/in/username"
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleScan()}
                className="w-full px-4 py-3 rounded-lg font-mono text-sm outline-none"
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(0, 240, 255, 0.2)',
                  color: 'var(--text-primary)',
                }}
              />

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm mt-2"
                  style={{ color: 'var(--neon-red, #ff4444)' }}
                >
                  {error}
                </motion.p>
              )}

              <button
                onClick={handleScan}
                disabled={loading || !url}
                className="w-full mt-4 py-3 rounded-lg font-mono text-sm tracking-wider transition-all"
                style={{
                  background: loading ? 'rgba(0, 240, 255, 0.1)' : 'rgba(0, 240, 255, 0.15)',
                  border: '1px solid var(--neon-cyan)',
                  color: 'var(--neon-cyan)',
                  boxShadow: loading ? 'none' : '0 0 20px rgba(0, 240, 255, 0.2)',
                  opacity: !url ? 0.5 : 1,
                  cursor: loading || !url ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'SCANNING PROFILE...' : 'SCAN PROFILE'}
              </button>
            </div>

            {/* Loading animation */}
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-12 h-12 mx-auto mb-4 rounded-full"
                  style={{
                    border: '2px solid var(--neon-cyan)',
                    borderTopColor: 'transparent',
                  }}
                />
                <p className="text-sm font-mono" style={{ color: 'var(--neon-cyan)' }}>
                  SCRAPING LINKEDIN PROFILE...
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Extracting career data and inferring lifestyle signals
                </p>
              </motion.div>
            )}

            {/* Back link */}
            <button
              onClick={onBack}
              className="block mx-auto mt-4 text-sm font-mono transition-opacity hover:opacity-100"
              style={{ color: 'var(--text-muted)', opacity: 0.7 }}
            >
              Back to quiz
            </button>
          </motion.div>
        ) : (
          /* Results */
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Profile card */}
            <div
              className="rounded-xl p-6 mb-4"
              style={{
                background: 'rgba(0, 240, 255, 0.03)',
                border: '1px solid rgba(0, 240, 255, 0.15)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <div className="flex items-start gap-4 mb-4">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
                  style={{
                    background: 'rgba(0, 240, 255, 0.1)',
                    border: '2px solid var(--neon-cyan)',
                  }}
                >
                  {result.profile.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {result.profile.name}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--neon-cyan)' }}>
                    {result.profile.headline}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {result.profile.location}
                  </p>
                </div>
              </div>

              {result.profile.summary && (
                <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                  {result.profile.summary}
                </p>
              )}

              {/* Experience */}
              {result.profile.experience.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-mono tracking-wider mb-2" style={{ color: 'var(--neon-cyan)' }}>
                    EXPERIENCE
                  </h4>
                  <div className="space-y-1">
                    {result.profile.experience.slice(0, 3).map((exp, i) => (
                      <div key={i} className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        <span className="font-medium">{exp.title}</span>
                        <span style={{ color: 'var(--text-muted)' }}> at {exp.company} ({exp.duration})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Inferred signals */}
            <div
              className="rounded-xl p-6 mb-4"
              style={{
                background: 'rgba(255, 170, 0, 0.03)',
                border: '1px solid rgba(255, 170, 0, 0.15)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <h4 className="text-xs font-mono tracking-wider mb-4" style={{ color: 'var(--neon-orange, #ffaa00)' }}>
                INFERRED LIFESTYLE SIGNALS
              </h4>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <Signal label="INCOME" value={`$${result.lifestyleSignals.estimatedIncome.toLocaleString()}`} confidence={result.lifestyleSignals.incomeConfidence} />
                <Signal label="COUNTRY" value={result.lifestyleSignals.inferredCountry} />
                <Signal label="HOUSING" value={result.lifestyleSignals.inferredHousing || 'house'} />
                <Signal label="TRANSPORT" value={result.lifestyleSignals.inferredTransport || 'car'} />
                <Signal label="DIET" value={result.lifestyleSignals.inferredDiet || 'omnivore'} />
                <Signal label="SHOPPING" value={result.lifestyleSignals.inferredShopping || 'average'} />
                <Signal label="FLIGHTS/YR" value={String(result.lifestyleSignals.inferredFlightsPerYear)} />
              </div>

              {/* Reasoning */}
              {result.lifestyleSignals.reasoning.length > 0 && (
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255, 170, 0, 0.1)' }}>
                  <h5 className="text-xs font-mono mb-2" style={{ color: 'var(--text-muted)' }}>REASONING</h5>
                  <ul className="space-y-1">
                    {result.lifestyleSignals.reasoning.map((r, i) => (
                      <li key={i} className="text-xs flex gap-2" style={{ color: 'var(--text-muted)' }}>
                        <span style={{ color: 'var(--neon-orange, #ffaa00)' }}>-</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleUseProfile}
                className="flex-1 py-3 rounded-lg font-mono text-sm tracking-wider transition-all"
                style={{
                  background: 'rgba(0, 240, 255, 0.15)',
                  border: '1px solid var(--neon-cyan)',
                  color: 'var(--neon-cyan)',
                  boxShadow: '0 0 20px rgba(0, 240, 255, 0.2)',
                  cursor: 'pointer',
                }}
              >
                USE THIS PROFILE
              </button>
              <button
                onClick={handleRefineInQuiz}
                className="flex-1 py-3 rounded-lg font-mono text-sm tracking-wider transition-all"
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

            {/* Scan another */}
            <button
              onClick={() => { setResult(null); setUrl(''); }}
              className="block mx-auto mt-4 text-sm font-mono transition-opacity hover:opacity-100"
              style={{ color: 'var(--text-muted)', opacity: 0.7 }}
            >
              Scan a different profile
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Signal({ label, value, confidence }: { label: string; value: string; confidence?: number }) {
  return (
    <div className="text-sm">
      <span className="text-xs font-mono block mb-0.5" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
        {value.replace(/_/g, ' ')}
      </span>
      {confidence !== undefined && (
        <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>
          ({Math.round(confidence * 100)}%)
        </span>
      )}
    </div>
  );
}
