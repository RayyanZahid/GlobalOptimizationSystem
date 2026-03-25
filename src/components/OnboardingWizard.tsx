'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserInputs } from '@/lib/types';
import { computeProfile } from '@/lib/estimation-engine';

// ─── Data ────────────────────────────────────────────────────────────────────

const COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'CN', name: 'China',         flag: '🇨🇳' },
  { code: 'IN', name: 'India',         flag: '🇮🇳' },
  { code: 'DE', name: 'Germany',       flag: '🇩🇪' },
  { code: 'GB', name: 'United Kingdom',flag: '🇬🇧' },
  { code: 'JP', name: 'Japan',         flag: '🇯🇵' },
  { code: 'BR', name: 'Brazil',        flag: '🇧🇷' },
  { code: 'FR', name: 'France',        flag: '🇫🇷' },
  { code: 'AU', name: 'Australia',     flag: '🇦🇺' },
  { code: 'CA', name: 'Canada',        flag: '🇨🇦' },
  { code: 'KR', name: 'South Korea',   flag: '🇰🇷' },
  { code: 'MX', name: 'Mexico',        flag: '🇲🇽' },
];

const INCOME_RANGES = [
  { label: 'Under $25,000',        value: 12500  },
  { label: '$25,000 – $50,000',    value: 37500  },
  { label: '$50,000 – $100,000',   value: 75000  },
  { label: '$100,000 – $200,000',  value: 150000 },
  { label: 'Over $200,000',        value: 250000 },
];

const DIET_OPTIONS: { value: UserInputs['diet']; label: string; icon: string; desc: string }[] = [
  { value: 'vegan',      label: 'Vegan',           icon: '🌿', desc: 'No animal products' },
  { value: 'vegetarian', label: 'Vegetarian',      icon: '🥗', desc: 'No meat or fish' },
  { value: 'omnivore',   label: 'Omnivore',        icon: '🍽️',  desc: 'Balanced diet' },
  { value: 'heavy_meat', label: 'Heavy Meat Eater',icon: '🥩', desc: 'Meat at most meals' },
];

const HOUSING_OPTIONS: { value: UserInputs['housing']; label: string; icon: string }[] = [
  { value: 'apartment',   label: 'Apartment',   icon: '🏢' },
  { value: 'house',       label: 'House',       icon: '🏠' },
  { value: 'large_house', label: 'Large House', icon: '🏡' },
];

const TRANSPORT_OPTIONS: { value: UserInputs['transport']; label: string; icon: string; desc: string }[] = [
  { value: 'transit',        label: 'Transit & Bike',  icon: '🚲', desc: 'Public transit / cycling' },
  { value: 'car',            label: 'Car',             icon: '🚗', desc: 'Standard vehicle' },
  { value: 'suv',            label: 'SUV / Truck',     icon: '🚙', desc: 'Large vehicle' },
  { value: 'frequent_flyer', label: 'Frequent Flyer',  icon: '✈️',  desc: '10+ flights per year' },
];

const ENERGY_SOURCE_OPTIONS: { value: UserInputs['energy_source']; label: string; icon: string }[] = [
  { value: 'gas',       label: 'Natural Gas', icon: '🔥' },
  { value: 'electric',  label: 'Electric',    icon: '⚡' },
  { value: 'heat_pump', label: 'Heat Pump',   icon: '♨️' },
  { value: 'oil',       label: 'Oil/Propane', icon: '🛢️' },
];

const FOOD_WASTE_OPTIONS: { value: UserInputs['food_waste']; label: string; icon: string; desc: string }[] = [
  { value: 'none',        label: 'Almost Nothing', icon: '♻️', desc: 'I compost or barely waste' },
  { value: 'some',        label: 'A Little',       icon: '🗑️', desc: 'Occasional leftovers tossed' },
  { value: 'significant', label: 'A Lot',          icon: '🗑️', desc: 'Food frequently goes bad' },
];

const FLIGHT_OPTIONS: { label: string; value: number }[] = [
  { label: '0 flights',   value: 0 },
  { label: '1-2 flights', value: 2 },
  { label: '3-5 flights', value: 4 },
  { label: '6-10 flights',value: 8 },
  { label: '10+ flights', value: 12 },
];

const SHOPPING_OPTIONS: { value: UserInputs['shopping_frequency']; label: string; icon: string; desc: string }[] = [
  { value: 'minimal',  label: 'Minimalist',      icon: '📦', desc: 'Buy only what I need' },
  { value: 'average',  label: 'Average',          icon: '🛍️', desc: 'Normal shopping habits' },
  { value: 'frequent', label: 'Frequent Shopper', icon: '🛒', desc: 'New clothes/electronics often' },
];

const SEX_OPTIONS: { value: UserInputs['sex']; label: string }[] = [
  { value: 'male',   label: 'Male'   },
  { value: 'female', label: 'Female' },
  { value: 'other',  label: 'Other'  },
];

// confidence gained per completed step (cumulative display)
const STEP_CONFIDENCE = [10, 20, 32, 42, 52, 60, 65];

// ─── Animation variants ───────────────────────────────────────────────────────

const slideVariants = {
  enter: { x: 80, opacity: 0 },
  center: { x: 0,  opacity: 1, transition: { duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] as [number,number,number,number] } },
  exit:  { x: -80, opacity: 0, transition: { duration: 0.28, ease: [0.55, 0, 1, 0.45] as [number,number,number,number] } },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepHeader({ step, question }: { step: number; question: string }) {
  return (
    <div className="mb-8">
      <p className="text-xs font-mono tracking-[0.3em] text-cyan-400/60 uppercase mb-2">
        Step {step} of 7
      </p>
      <h2 className="text-3xl font-bold text-white leading-tight">{question}</h2>
    </div>
  );
}

function QuizOption({
  selected,
  onClick,
  children,
  className = '',
  style,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`quiz-option ${selected ? 'selected' : ''} ${className}`}
      style={style}
    >
      {children}
    </motion.button>
  );
}

function NextButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <AnimatePresence>
      {!disabled && (
        <motion.button
          key="next-btn"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25 }}
          onClick={onClick}
          className="next-button"
        >
          Continue →
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  onComplete: (inputs: UserInputs) => void;
  onProgress: (inputs: UserInputs, step: number) => void;
  initialInputs?: Partial<UserInputs>;
}

export default function OnboardingWizard({ onComplete, onProgress, initialInputs }: Props) {
  const [step, setStep] = useState(initialInputs?.country ? 2 : 1);
  const [inputs, setInputs] = useState<UserInputs>({});

  // local step state — seed from initialInputs if provided
  const [country,   setCountry]   = useState<string | undefined>(initialInputs?.country);
  const [age,       setAge]       = useState(initialInputs?.age ?? 34);
  const [sex,       setSex]       = useState<UserInputs['sex']>(initialInputs?.sex);
  const [weight,    setWeight]    = useState(initialInputs?.weight_kg ? String(initialInputs.weight_kg) : '');
  const [income,    setIncome]    = useState<number | undefined>(initialInputs?.income);
  const [diet,      setDiet]      = useState<UserInputs['diet']>(initialInputs?.diet);
  const [housing,   setHousing]   = useState<UserInputs['housing']>(initialInputs?.housing);
  const [transport, setTransport] = useState<UserInputs['transport']>(initialInputs?.transport);
  const [energySource, setEnergySource] = useState<UserInputs['energy_source']>(initialInputs?.energy_source);
  const [monthlyKwh, setMonthlyKwh] = useState(initialInputs?.monthly_kwh ? String(initialInputs.monthly_kwh) : '');
  const [milesPerWeek, setMilesPerWeek] = useState(initialInputs?.miles_per_week ? String(initialInputs.miles_per_week) : '');
  const [flightsPerYear, setFlightsPerYear] = useState<number | undefined>(initialInputs?.flights_per_year);
  const [foodWaste, setFoodWaste] = useState<UserInputs['food_waste']>(initialInputs?.food_waste);
  const [shoppingFreq, setShoppingFreq] = useState<UserInputs['shopping_frequency']>(initialInputs?.shopping_frequency);

  // derived readiness per step
  const stepReady: Record<number, boolean> = {
    1: !!country,
    2: !!sex,
    3: income !== undefined,
    4: !!diet && !!foodWaste,
    5: !!housing && !!energySource,
    6: !!transport && flightsPerYear !== undefined,
    7: !!shoppingFreq,
  };

  function buildInputs(): UserInputs {
    return {
      country,
      age,
      sex,
      weight_kg: weight ? parseFloat(weight) : undefined,
      income,
      diet,
      housing,
      transport,
      energy_source: energySource,
      monthly_kwh: monthlyKwh ? parseFloat(monthlyKwh) : undefined,
      miles_per_week: milesPerWeek ? parseFloat(milesPerWeek) : undefined,
      flights_per_year: flightsPerYear,
      food_waste: foodWaste,
      shopping_frequency: shoppingFreq,
    };
  }

  function advance() {
    const current = buildInputs();
    onProgress(current, step);
    setInputs(current);

    if (step < 7) {
      setStep(s => s + 1);
    } else {
      onComplete(current);
    }
  }

  const progress = ((step - 1) / 7) * 100;
  const confidence = step > 1 ? STEP_CONFIDENCE[step - 2] : 0;

  return (
    <div className="wizard-overlay">
      {/* Styles injected via a style tag so no external CSS file is needed */}
      <style>{`
        .wizard-overlay {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
          padding: 1rem;
        }

        .wizard-card {
          background: rgba(6, 8, 20, 0.92);
          border: 1px solid rgba(0, 255, 255, 0.15);
          border-radius: 1.5rem;
          box-shadow:
            0 0 60px rgba(0, 255, 255, 0.06),
            0 0 120px rgba(0, 0, 0, 0.8),
            inset 0 1px 0 rgba(255,255,255,0.04);
          width: 100%;
          max-width: 640px;
          padding: 2.5rem;
          position: relative;
          overflow: hidden;
        }

        /* Subtle grid texture */
        .wizard-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(0,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,255,0.02) 1px, transparent 1px);
          background-size: 32px 32px;
          pointer-events: none;
        }

        /* Progress bar track */
        .progress-track {
          width: 100%;
          height: 3px;
          background: rgba(255,255,255,0.07);
          border-radius: 99px;
          margin-bottom: 2rem;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #00e5ff, #00ffcc);
          border-radius: 99px;
          box-shadow: 0 0 10px #00e5ff88;
          transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Step dots */
        .step-dots {
          display: flex;
          gap: 6px;
          align-items: center;
          margin-bottom: 2rem;
        }
        .step-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255,255,255,0.15);
          transition: all 0.3s ease;
        }
        .step-dot.active {
          background: #00e5ff;
          box-shadow: 0 0 8px #00e5ff;
          width: 20px;
          border-radius: 99px;
        }
        .step-dot.done {
          background: rgba(0, 229, 255, 0.4);
        }

        /* Quiz option base */
        .quiz-option {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.875rem 1.125rem;
          border-radius: 0.75rem;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          color: rgba(255,255,255,0.75);
          cursor: pointer;
          text-align: left;
          font-size: 0.9375rem;
          transition: border-color 0.2s, background 0.2s, color 0.2s, box-shadow 0.2s;
        }
        .quiz-option:hover {
          border-color: rgba(0,229,255,0.35);
          background: rgba(0,229,255,0.05);
          color: white;
        }
        .quiz-option.selected {
          border-color: #00e5ff;
          background: rgba(0,229,255,0.08);
          color: #00e5ff;
          box-shadow: 0 0 14px rgba(0,229,255,0.25), inset 0 0 20px rgba(0,229,255,0.04);
        }

        /* Country grid */
        .country-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
        }
        .country-option {
          flex-direction: column;
          align-items: center;
          gap: 0.375rem;
          padding: 0.75rem 0.5rem;
          font-size: 0.8125rem;
        }
        .country-flag {
          font-size: 2rem;
          line-height: 1;
        }

        /* Slider */
        .age-slider-wrap {
          margin: 1.5rem 0;
        }
        .age-value {
          font-size: 3rem;
          font-weight: 700;
          color: #00e5ff;
          text-shadow: 0 0 20px #00e5ff88;
          letter-spacing: -0.02em;
          line-height: 1;
          margin-bottom: 0.5rem;
        }
        .age-label {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          letter-spacing: 0.15em;
          margin-bottom: 1rem;
        }
        input[type=range] {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 4px;
          background: rgba(255,255,255,0.1);
          border-radius: 99px;
          outline: none;
          cursor: pointer;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #00e5ff;
          box-shadow: 0 0 12px #00e5ff, 0 0 24px #00e5ff88;
          border: 2px solid rgba(0,0,0,0.5);
          cursor: pointer;
        }
        input[type=range]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #00e5ff;
          box-shadow: 0 0 12px #00e5ff, 0 0 24px #00e5ff88;
          border: 2px solid rgba(0,0,0,0.5);
          cursor: pointer;
        }

        /* Weight input */
        .weight-input {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 0.625rem;
          padding: 0.625rem 1rem;
          color: white;
          font-size: 0.9375rem;
          width: 160px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .weight-input:focus {
          border-color: rgba(0,229,255,0.5);
          box-shadow: 0 0 10px rgba(0,229,255,0.15);
        }
        .weight-input::placeholder {
          color: rgba(255,255,255,0.25);
        }

        /* Sex pills */
        .sex-row {
          display: flex;
          gap: 0.5rem;
        }
        .sex-pill {
          flex: 1;
          padding: 0.625rem;
          text-align: center;
          border-radius: 0.625rem;
          font-size: 0.875rem;
          justify-content: center;
        }

        /* Diet grid */
        .diet-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.5rem;
        }
        .diet-option {
          flex-direction: column;
          align-items: flex-start;
          gap: 0.25rem;
          padding: 1rem;
        }
        .diet-icon { font-size: 1.5rem; }
        .diet-name { font-weight: 600; font-size: 0.9375rem; }
        .diet-desc { font-size: 0.75rem; opacity: 0.55; }

        /* Transport options */
        .transport-option {
          flex-direction: row;
          align-items: center;
        }
        .transport-icon { font-size: 1.25rem; min-width: 1.75rem; }

        /* Next button */
        .next-button {
          margin-top: 1.75rem;
          width: 100%;
          padding: 0.875rem;
          border-radius: 0.75rem;
          border: 1px solid #00e5ff;
          background: rgba(0, 229, 255, 0.1);
          color: #00e5ff;
          font-size: 1rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          cursor: pointer;
          box-shadow: 0 0 20px rgba(0,229,255,0.2), inset 0 0 30px rgba(0,229,255,0.04);
          transition: background 0.2s, box-shadow 0.2s;
        }
        .next-button:hover {
          background: rgba(0, 229, 255, 0.18);
          box-shadow: 0 0 32px rgba(0,229,255,0.35), inset 0 0 30px rgba(0,229,255,0.06);
        }

        /* Confidence badge */
        .confidence-badge {
          position: absolute;
          top: 1.5rem;
          right: 1.75rem;
          font-size: 0.7rem;
          font-family: monospace;
          letter-spacing: 0.15em;
          color: rgba(0,229,255,0.5);
          text-align: right;
        }
        .confidence-pct {
          font-size: 1.1rem;
          font-weight: 700;
          color: rgba(0,229,255,0.75);
          display: block;
        }

        /* Section label */
        .section-label {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          color: rgba(255,255,255,0.3);
          margin: 1rem 0 0.5rem;
        }
      `}</style>

      <div className="wizard-card">
        {/* Confidence badge */}
        {confidence > 0 && (
          <motion.div
            key={`conf-${step}`}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="confidence-badge"
          >
            PROFILE CONFIDENCE
            <span className="confidence-pct">{confidence}%</span>
            {step >= 3 && (() => {
              const preview = computeProfile(buildInputs());
              const co2t = preview.carbon ? (preview.carbon.total_co2e_kg_per_year / 1000).toFixed(1) : '—';
              return (
                <span style={{ display: 'block', marginTop: '0.3rem', fontSize: '0.65rem', color: '#ff0040', letterSpacing: '0.1em' }}>
                  ~{co2t}t CO2e/yr
                </span>
              );
            })()}
          </motion.div>
        )}

        {/* Progress bar */}
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Step dots */}
        <div className="step-dots">
          {[1,2,3,4,5,6,7].map(n => (
            <div
              key={n}
              className={`step-dot ${n === step ? 'active' : n < step ? 'done' : ''}`}
            />
          ))}
        </div>

        {/* Animated step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            {step === 1 && (
              <div>
                <StepHeader step={1} question="Where are you?" />
                <div className="country-grid">
                  {COUNTRIES.map(c => (
                    <QuizOption
                      key={c.code}
                      selected={country === c.code}
                      onClick={() => setCountry(c.code)}
                      className="country-option"
                    >
                      <span className="country-flag">{c.flag}</span>
                      <span>{c.name}</span>
                    </QuizOption>
                  ))}
                </div>
                <NextButton onClick={advance} disabled={!stepReady[1]} />
              </div>
            )}

            {step === 2 && (
              <div>
                <StepHeader step={2} question="Tell us about yourself." />

                {/* Age slider */}
                <div className="age-slider-wrap">
                  <div className="age-value">{age}</div>
                  <div className="age-label">Years old</div>
                  <input
                    type="range"
                    min={18}
                    max={90}
                    value={age}
                    onChange={e => setAge(Number(e.target.value))}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.375rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)' }}>18</span>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)' }}>90</span>
                  </div>
                </div>

                {/* Sex */}
                <p className="section-label">Biological sex</p>
                <div className="sex-row">
                  {SEX_OPTIONS.map(opt => (
                    <QuizOption
                      key={opt.value}
                      selected={sex === opt.value}
                      onClick={() => setSex(opt.value)}
                      className="sex-pill"
                    >
                      {opt.label}
                    </QuizOption>
                  ))}
                </div>

                {/* Weight (optional) */}
                <p className="section-label">Weight — optional</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="number"
                    placeholder="e.g. 70"
                    value={weight}
                    onChange={e => setWeight(e.target.value)}
                    className="weight-input"
                    min={30}
                    max={300}
                  />
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.875rem' }}>kg</span>
                </div>

                <NextButton onClick={advance} disabled={!stepReady[2]} />
              </div>
            )}

            {step === 3 && (
              <div>
                <StepHeader step={3} question="What's your annual income?" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {INCOME_RANGES.map(r => (
                    <QuizOption
                      key={r.value}
                      selected={income === r.value}
                      onClick={() => setIncome(r.value)}
                    >
                      <span style={{ fontSize: '1rem', minWidth: '1.25rem', opacity: income === r.value ? 1 : 0.4 }}>◆</span>
                      <span>{r.label}</span>
                    </QuizOption>
                  ))}
                </div>
                <NextButton onClick={advance} disabled={!stepReady[3]} />
              </div>
            )}

            {step === 4 && (
              <div>
                <StepHeader step={4} question="How do you eat?" />
                <div className="diet-grid">
                  {DIET_OPTIONS.map(opt => (
                    <QuizOption
                      key={opt.value}
                      selected={diet === opt.value}
                      onClick={() => setDiet(opt.value)}
                      className="diet-option"
                    >
                      <span className="diet-icon">{opt.icon}</span>
                      <span className="diet-name">{opt.label}</span>
                      <span className="diet-desc">{opt.desc}</span>
                    </QuizOption>
                  ))}
                </div>

                <p className="section-label">How much food do you throw away?</p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {FOOD_WASTE_OPTIONS.map(opt => (
                    <QuizOption
                      key={opt.value}
                      selected={foodWaste === opt.value}
                      onClick={() => setFoodWaste(opt.value)}
                      className="sex-pill"
                      style={{ flexDirection: 'column', gap: '0.25rem', padding: '0.75rem 0.5rem' } as React.CSSProperties}
                    >
                      <span style={{ fontSize: '1.25rem' }}>{opt.icon}</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{opt.label}</span>
                      <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>{opt.desc}</span>
                    </QuizOption>
                  ))}
                </div>

                <NextButton onClick={advance} disabled={!stepReady[4]} />
              </div>
            )}

            {step === 5 && (
              <div>
                <StepHeader step={5} question="Tell us about your home." />

                <p className="section-label">Housing type</p>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  {HOUSING_OPTIONS.map(opt => (
                    <QuizOption
                      key={opt.value}
                      selected={housing === opt.value}
                      onClick={() => setHousing(opt.value)}
                      className="sex-pill"
                      style={{ flexDirection: 'column', gap: '0.25rem', padding: '0.75rem 0.5rem' } as React.CSSProperties}
                    >
                      <span style={{ fontSize: '1.25rem' }}>{opt.icon}</span>
                      <span style={{ fontSize: '0.8rem' }}>{opt.label}</span>
                    </QuizOption>
                  ))}
                </div>

                <p className="section-label">What heats your home?</p>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  {ENERGY_SOURCE_OPTIONS.map(opt => (
                    <QuizOption
                      key={opt.value}
                      selected={energySource === opt.value}
                      onClick={() => setEnergySource(opt.value)}
                      className="sex-pill"
                      style={{ flexDirection: 'column', gap: '0.25rem', padding: '0.75rem 0.5rem' } as React.CSSProperties}
                    >
                      <span style={{ fontSize: '1.25rem' }}>{opt.icon}</span>
                      <span style={{ fontSize: '0.75rem' }}>{opt.label}</span>
                    </QuizOption>
                  ))}
                </div>

                <p className="section-label">Monthly electricity (kWh) — optional</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="number"
                    placeholder="e.g. 900"
                    value={monthlyKwh}
                    onChange={e => setMonthlyKwh(e.target.value)}
                    className="weight-input"
                    min={0}
                    max={10000}
                  />
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.875rem' }}>kWh</span>
                </div>

                <NextButton onClick={advance} disabled={!stepReady[5]} />
              </div>
            )}

            {step === 6 && (
              <div>
                <StepHeader step={6} question="How do you get around?" />

                <p className="section-label">Primary transport</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  {TRANSPORT_OPTIONS.map(opt => (
                    <QuizOption
                      key={opt.value}
                      selected={transport === opt.value}
                      onClick={() => setTransport(opt.value)}
                      className="transport-option"
                    >
                      <span className="transport-icon">{opt.icon}</span>
                      <div>
                        <div style={{ fontWeight: 600 }}>{opt.label}</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '0.1rem' }}>{opt.desc}</div>
                      </div>
                    </QuizOption>
                  ))}
                </div>

                <p className="section-label">Miles driven per week — optional</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    type="number"
                    placeholder="e.g. 150"
                    value={milesPerWeek}
                    onChange={e => setMilesPerWeek(e.target.value)}
                    className="weight-input"
                    min={0}
                    max={2000}
                  />
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.875rem' }}>mi/wk</span>
                </div>

                <p className="section-label">Flights per year</p>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {FLIGHT_OPTIONS.map(opt => (
                    <QuizOption
                      key={opt.value}
                      selected={flightsPerYear === opt.value}
                      onClick={() => setFlightsPerYear(opt.value)}
                      className="sex-pill"
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                    >
                      {opt.label}
                    </QuizOption>
                  ))}
                </div>

                <NextButton onClick={advance} disabled={!stepReady[6]} />
              </div>
            )}

            {step === 7 && (
              <div>
                <StepHeader step={7} question="How much do you buy?" />
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)', marginBottom: '1rem' }}>
                  Clothing, electronics, furniture, and other consumer goods.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {SHOPPING_OPTIONS.map(opt => (
                    <QuizOption
                      key={opt.value}
                      selected={shoppingFreq === opt.value}
                      onClick={() => setShoppingFreq(opt.value)}
                      className="transport-option"
                    >
                      <span className="transport-icon">{opt.icon}</span>
                      <div>
                        <div style={{ fontWeight: 600 }}>{opt.label}</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '0.1rem' }}>{opt.desc}</div>
                      </div>
                    </QuizOption>
                  ))}
                </div>
                <NextButton onClick={advance} disabled={!stepReady[7]} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
