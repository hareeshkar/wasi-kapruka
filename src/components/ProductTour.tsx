import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import TourAnimationViewport from './tour/TourAnimationViewport';
import {
  TOUR_STEPS,
  TOUR_COPY,
  TOUR_UI,
} from './tour/tourSteps';

const STORAGE_KEY = 'wasi_product_tour_v2';

export function isProductTourComplete(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markProductTourComplete(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch { /* private mode */ }
}

interface ProductTourProps {
  lang?: 'en' | 'si' | 'ta';
  isSignedIn: boolean;
  open: boolean;
  onComplete: () => void;
  onSignIn: () => void;
  onTryPrompt?: (text: string) => void;
}

export default function ProductTour({
  lang = 'en',
  isSignedIn,
  open,
  onComplete,
  onSignIn,
  onTryPrompt,
}: ProductTourProps) {
  const steps = TOUR_STEPS;
  const totalSteps = steps.length;

  const [stepIndex, setStepIndex] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [direction, setDirection] = useState(1);
  const [visible, setVisible] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const step = steps[stepIndex];
  const ui = TOUR_UI[lang] || TOUR_UI.en;
  const copy = TOUR_COPY[step][lang] || TOUR_COPY[step].en;
  const fontClass = lang === 'si' ? 'font-sinhala' : lang === 'ta' ? 'font-tamil' : '';
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;
  const isRememberStep = step === 'remember';

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open]);

  useEffect(() => {
    setStepIndex(0);
    setDirection(1);
    setAnimKey((k) => k + 1);
  }, [isSignedIn]);

  const goTo = useCallback((index: number) => {
    setDirection(index > stepIndex ? 1 : index < stepIndex ? -1 : 0);
    setStepIndex(index);
    setAnimKey((k) => k + 1);
  }, [stepIndex]);

  const goNext = useCallback(() => {
    if (stepIndex < totalSteps - 1) {
      goTo(stepIndex + 1);
    }
  }, [stepIndex, totalSteps, goTo]);

  const goBack = useCallback(() => {
    if (stepIndex > 0) {
      goTo(stepIndex - 1);
    }
  }, [stepIndex, goTo]);

  // Block-level transition is a pure fade — the inner per-element stagger
  // (in TourAnimationViewport / feature grid) carries all the movement, so
  // the two motion systems don't compete.
  const stepVariants = {
    enter: { opacity: 0 },
    center: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const handleFinish = () => {
    markProductTourComplete();
    onComplete();
  };

  const handleSignIn = () => {
    markProductTourComplete();
    onComplete();
    onSignIn();
  };

  const handleTryExample = () => {
    if (!copy.examplePrompt) return;
    markProductTourComplete();
    onComplete();
    onTryPrompt?.(copy.examplePrompt);
  };

  if (!open) return null;

  const rememberTitle = isSignedIn && isRememberStep ? 'You\'re all set' : copy.title;
  const rememberLead = isSignedIn && isRememberStep ? ui.signedInReady : copy.lead;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 sm:p-4 transition-[opacity,backdrop-filter] duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{
        background: visible ? 'rgba(22, 12, 42, 0.58)' : 'rgba(22, 12, 42, 0)',
        backdropFilter: visible ? 'blur(14px) saturate(1.15)' : 'blur(0px)',
        WebkitBackdropFilter: visible ? 'blur(14px) saturate(1.15)' : 'blur(0px)',
      }}
      role="dialog"
      aria-modal="true"
      aria-label={ui.tourLabel}
    >
      <div className={`w-full max-w-[420px] ${fontClass}`}>
        <div
          className="product-tour-card-enter relative flex flex-col max-h-[min(92vh,640px)] rounded-2xl overflow-hidden shadow-2xl bg-[#FAF8FC] border border-white/60 grain"
          style={{ boxShadow: '0 28px 90px rgba(64,41,112,0.28), 0 0 0 1px rgba(64,41,112,0.06)' }}
        >
          {/* Gift-tag foil edge */}
          <div className="foil-edge w-full flex-shrink-0" />

          {/* Production grid header */}
          <header className="grid grid-cols-[1fr_auto] grid-rows-[auto_auto] gap-x-3 px-5 pt-4 pb-3 flex-shrink-0">
            <p className="col-start-1 row-start-1 text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-violet/55">
              {ui.tourLabel}
            </p>
            <button
              type="button"
              onClick={handleFinish}
              className="col-start-2 row-start-1 row-span-2 self-start text-[10px] font-mono font-semibold text-ink-faint hover:text-violet px-2 py-1 -mr-2 rounded-lg hover:bg-violet/5 cursor-pointer transition-colors"
            >
              {ui.skip}
            </button>
            <p className="col-start-1 row-start-2 editorial-number !text-[12px]">
              {ui.stepOf(stepIndex + 1, totalSteps)}
            </p>
          </header>

          {/* Gift-tag thread divider — the signature detail */}
          <div className="foil-thread mx-5 mb-1 flex-shrink-0" />

          <motion.div layout transition={{ duration: prefersReducedMotion ? 0 : 0.38, ease: [0.22, 1, 0.36, 1] }} style={{ overflow: 'hidden' }} className="min-h-0">
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={step}
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: prefersReducedMotion ? 0.18 : 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Animation orchestrator viewport */}
                <TourAnimationViewport step={step} animKey={animKey} />

                {/* Content grid */}
                <div className="px-5 py-4 max-h-[44vh] overflow-y-auto">
                  <div className="space-y-1.5">
                    <h2
                      className={`font-display text-[1.35rem] font-bold text-violet-deep leading-[1.15] ${lang === 'en' ? 'tracking-tight' : ''}`}
                    >
                      {rememberTitle}
                    </h2>
                    <p className="text-[12.5px] text-ink-muted leading-relaxed">{rememberLead}</p>
                  </div>

                  <dl className="grid grid-cols-2 gap-2 mt-4">
                    {copy.features.map((f) => (
                      <div
                        key={f.label}
                        className="rounded-xl bg-white/80 border border-ink/[0.05] px-2.5 py-2 tour-feature-cell"
                      >
                        <dt className="text-[10px] font-mono font-bold text-violet leading-tight">{f.label}</dt>
                        <dd className="text-[9px] font-mono text-ink-faint mt-0.5 leading-snug">{f.detail}</dd>
                      </div>
                    ))}
                  </dl>

                  {copy.examplePrompt && !isLast && (
                    <button
                      type="button"
                      onClick={handleTryExample}
                      className="mt-4 w-full text-left rounded-xl px-3 py-2.5 bg-violet-tint/50 border border-violet/10 hover:border-violet/25 hover:bg-violet-tint transition-all cursor-pointer group"
                    >
                      <span className="block text-[8px] font-mono font-bold uppercase tracking-wider text-violet/60 mb-1">
                        {ui.tryExample}
                      </span>
                      <span className="block text-[11px] font-mono text-ink-muted group-hover:text-violet leading-snug">
                        &ldquo;{copy.examplePrompt}&rdquo;
                      </span>
                    </button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Footer: progress + navigation */}
          <footer className="flex-shrink-0 px-5 pb-5 pt-3 border-t border-ink/[0.06] space-y-3">
            <div className="flex justify-center gap-1.5" role="tablist" aria-label="Tour progress">
              {steps.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => goTo(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    i === stepIndex ? 'w-5 bg-violet seal-dot-active' : 'w-1.5 bg-violet/20 hover:bg-violet/45'
                  }`}
                  aria-label={`${ui.stepOf(i + 1, totalSteps)}`}
                  aria-current={i === stepIndex ? 'step' : undefined}
                />
              ))}
            </div>

            {isLast && !isSignedIn ? (
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={handleSignIn}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-display font-semibold text-sm text-white cursor-pointer bg-violet hover:bg-violet-mid active:scale-[0.98] shadow-sm"
                >
                  {ui.signIn}
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleFinish}
                  className="w-full py-2 text-[11px] font-mono font-medium text-ink-faint hover:text-violet cursor-pointer transition-colors"
                >
                  {ui.continueGuest}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={isFirst}
                  className="flex items-center justify-center gap-1 py-2.5 px-3 rounded-xl font-mono text-[12px] font-semibold border border-ink/10 text-ink-muted hover:border-violet/20 hover:text-violet cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  {ui.back}
                </button>
                <button
                  type="button"
                  onClick={isLast ? handleFinish : goNext}
                  className="flex items-center justify-center gap-1 py-2.5 px-3 rounded-xl font-display font-semibold text-sm text-white cursor-pointer bg-violet hover:bg-violet-mid active:scale-[0.98] shadow-sm"
                >
                  {isLast ? ui.getStarted : ui.next}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </footer>
        </div>
      </div>
    </div>
  );
}
