'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { UserInputs } from '@/lib/types';
import { computeProfile } from '@/lib/estimation-engine';
import { useAutoProfile } from '@/lib/use-auto-profile';
import OnboardingWizard from '@/components/OnboardingWizard';
import LinkedInImport from '@/components/LinkedInImport';
import PeriodicTable from '@/components/PeriodicTable';

export default function QuizPage() {
  const router = useRouter();
  const [inputs, setInputs] = useState<UserInputs>({});
  const [showDetecting, setShowDetecting] = useState(true);
  const [showLinkedIn, setShowLinkedIn] = useState(false);
  const { autoProfile, loading, asUserInputs } = useAutoProfile();

  // When auto-profile loads, seed the inputs
  useEffect(() => {
    if (!loading && autoProfile) {
      const autoInputs = asUserInputs();
      setInputs(autoInputs);

      // Show the detection result for 2 seconds, then show quiz
      setTimeout(() => setShowDetecting(false), 2500);
    }
    if (!loading && !autoProfile) {
      setShowDetecting(false);
    }
  }, [loading, autoProfile]);

  const profile = computeProfile(inputs);

  const handleProgress = useCallback((newInputs: UserInputs) => {
    setInputs(newInputs);
  }, []);

  const handleComplete = useCallback((finalInputs: UserInputs) => {
    sessionStorage.setItem('userInputs', JSON.stringify(finalInputs));
    router.push('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background periodic table that sharpens as quiz progresses */}
      <div className="absolute inset-0 opacity-20 pointer-events-none scale-75">
        <PeriodicTable profile={profile} onElementClick={() => {}} />
      </div>

      <AnimatePresence mode="wait">
        {showDetecting && loading ? (
          /* Detecting state */
          <motion.div
            key="detecting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-10 text-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 mx-auto mb-6 rounded-full border-2 border-[var(--neon-cyan)] border-t-transparent"
            />
            <p className="text-lg text-[var(--neon-cyan)] font-mono tracking-wider">
              DETECTING YOUR LOCATION...
            </p>
            <p className="text-sm text-[var(--text-muted)] mt-2">
              Inferring your material profile from public data
            </p>
          </motion.div>
        ) : showDetecting && autoProfile ? (
          /* Show what we detected */
          <motion.div
            key="detected"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10 text-center max-w-md"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center text-2xl"
              style={{
                background: 'rgba(0, 240, 255, 0.1)',
                border: '2px solid var(--neon-cyan)',
                boxShadow: '0 0 30px rgba(0, 240, 255, 0.3)',
              }}
            >
              ✓
            </motion.div>
            <p className="text-lg font-bold text-[var(--neon-cyan)] mb-4">
              WE ALREADY KNOW SOME THINGS
            </p>
            <div className="space-y-2 text-left inline-block">
              {autoProfile.city && autoProfile.state && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex gap-3 text-sm"
                >
                  <span className="text-[var(--neon-cyan)] w-24 text-right font-mono">LOCATION</span>
                  <span className="text-[var(--text-primary)]">{autoProfile.city}, {autoProfile.state}</span>
                </motion.div>
              )}
              {autoProfile.income && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex gap-3 text-sm"
                >
                  <span className="text-[var(--neon-orange)] w-24 text-right font-mono">AREA INCOME</span>
                  <span className="text-[var(--text-primary)]">${autoProfile.income.toLocaleString()} median</span>
                </motion.div>
              )}
              {autoProfile.housing && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex gap-3 text-sm"
                >
                  <span className="text-[var(--neon-green)] w-24 text-right font-mono">HOUSING</span>
                  <span className="text-[var(--text-primary)]">{autoProfile.housing} ({autoProfile.medianRooms} rooms avg)</span>
                </motion.div>
              )}
              {autoProfile.commuteMode && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex gap-3 text-sm"
                >
                  <span className="text-[var(--neon-red)] w-24 text-right font-mono">COMMUTE</span>
                  <span className="text-[var(--text-primary)]">{autoProfile.commuteMode}</span>
                </motion.div>
              )}
              {autoProfile.sources.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="pt-3 text-xs text-[var(--text-muted)] text-center"
                >
                  Sources: {autoProfile.sources.join(', ')} — Confidence: {Math.round(autoProfile.confidence * 100)}%
                </motion.div>
              )}
            </div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-xs text-[var(--text-muted)] mt-6"
            >
              Refine your profile to increase accuracy...
            </motion.p>
          </motion.div>
        ) : (
          /* Quiz or LinkedIn Import */
          showLinkedIn ? (
          <motion.div
            key="linkedin"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 w-full max-w-2xl px-4"
          >
            <LinkedInImport
              onUseInputs={(linkedInputs) => {
                setInputs(linkedInputs);
                setShowLinkedIn(false);
              }}
              onBack={() => setShowLinkedIn(false)}
            />
          </motion.div>
          ) : (
          <motion.div
            key="quiz"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 w-full max-w-2xl px-4"
          >
            <OnboardingWizard
              onComplete={handleComplete}
              onProgress={handleProgress}
              initialInputs={autoProfile ? asUserInputs() : undefined}
            />
            <button
              onClick={() => setShowLinkedIn(true)}
              className="block mx-auto mt-6 text-sm font-mono tracking-wider transition-all hover:opacity-100"
              style={{ color: 'var(--neon-cyan)', opacity: 0.6 }}
            >
              Or import from LinkedIn
            </button>
          </motion.div>
          )
        )}
      </AnimatePresence>

      {/* Confidence indicator */}
      <motion.div
        className="fixed bottom-8 left-1/2 -translate-x-1/2 text-sm z-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <span className="text-[var(--text-muted)]">Profile Confidence: </span>
        <span className="glow-cyan font-mono text-lg">
          {Math.round(profile.confidence * 100)}%
        </span>
      </motion.div>
    </div>
  );
}
