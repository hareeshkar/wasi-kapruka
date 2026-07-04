import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ChevronRight, ChevronLeft, Check, ArrowRight } from 'lucide-react';
import { KaprukaLogo } from '../lib/kapruka';
import WasiRobotAvatar from './WasiRobotAvatar';
import TourStepVisualizer, { type TourCity } from './tour/TourVisualizers';
import {
  TOUR_STEPS,
  TOUR_COPY,
  TOUR_UI,
  type TourLang,
} from './tour/tourSteps';

const STORAGE_KEY = 'wasi_product_tour_v3';

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
  lang?: TourLang;
  isSignedIn: boolean;
  open: boolean;
  onComplete: () => void;
  onSignIn: () => void;
  onTryPrompt?: (text: string) => void;
  onLangChange?: (lang: TourLang) => void;
}

const contentSlideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 20 : -20,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: {
      x: { type: 'spring' as const, stiffness: 380, damping: 34 },
      opacity: { duration: 0.2 },
    },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 20 : -20,
    opacity: 0,
    transition: {
      x: { type: 'spring' as const, stiffness: 380, damping: 34 },
      opacity: { duration: 0.14 },
    },
  }),
};

const LANG_LABELS: Record<TourLang, string> = {
  en: 'EN',
  si: 'සි',
  ta: 'த',
};

export default function ProductTour({
  lang: langProp = 'en',
  isSignedIn,
  open,
  onComplete,
  onSignIn,
  onTryPrompt,
  onLangChange,
}: ProductTourProps) {
  const totalSteps = TOUR_STEPS.length;
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [visible, setVisible] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [activeShelfItem, setActiveShelfItem] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<TourCity>('Kandy');
  const [displayLang, setDisplayLang] = useState<TourLang>(langProp);
  const prefersReducedMotion = useReducedMotion();

  const lang = displayLang;
  const step = TOUR_STEPS[stepIndex];
  const ui = TOUR_UI[lang] || TOUR_UI.en;
  const copy = TOUR_COPY[step][lang] || TOUR_COPY[step].en;
  const fontClass = lang === 'si' ? 'font-sinhala' : lang === 'ta' ? 'font-tamil' : '';
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;
  const isRememberStep = step === 'remember';

  useEffect(() => {
    setDisplayLang(langProp);
  }, [langProp]);

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
    setIsCompleted(false);
    setActiveShelfItem(null);
    setSelectedCity('Kandy');
  }, [isSignedIn, open]);

  const pickLang = useCallback((l: TourLang) => {
    setDisplayLang(l);
    onLangChange?.(l);
  }, [onLangChange]);

  const goTo = useCallback((index: number) => {
    setDirection(index > stepIndex ? 1 : index < stepIndex ? -1 : 0);
    setStepIndex(index);
    setActiveShelfItem(null);
  }, [stepIndex]);

  const goNext = useCallback(() => {
    if (stepIndex < totalSteps - 1) {
      goTo(stepIndex + 1);
    } else {
      setIsCompleted(true);
    }
  }, [stepIndex, totalSteps, goTo]);

  const goBack = useCallback(() => {
    if (isCompleted) {
      setIsCompleted(false);
      return;
    }
    if (stepIndex > 0) goTo(stepIndex - 1);
  }, [stepIndex, isCompleted, goTo]);

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
    if (step === 'deliver') setSelectedCity('Kandy');
    if (step === 'discover') setActiveShelfItem('cake');
    markProductTourComplete();
    onComplete();
    onTryPrompt?.(copy.examplePrompt);
  };

  const handleExampleDemo = () => {
    if (step === 'deliver') setSelectedCity('Kandy');
    if (step === 'discover') setActiveShelfItem('cake');
  };

  if (!open) return null;

  const title = isCompleted
    ? ui.readyTitle
    : isSignedIn && isRememberStep
      ? ui.readyTitle
      : copy.title;

  const lead = isCompleted
    ? ui.readyLead
    : isSignedIn && isRememberStep
      ? ui.signedInReady
      : copy.lead;

  const contentKey = isCompleted ? `done-${lang}` : `${step}-${lang}`;
  const visualKey = isCompleted ? 'completed' : `${step}-${lang}`;

  const visualTransition = prefersReducedMotion
    ? { duration: 0.2 }
    : { duration: 0.38, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-2 sm:p-4 transition-opacity duration-400 ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{
        background: 'rgba(26, 16, 40, 0.32)',
        backdropFilter: 'blur(14px) saturate(1.1)',
        WebkitBackdropFilter: 'blur(14px) saturate(1.1)',
      }}
      role="dialog"
      aria-modal="true"
      aria-label={ui.tourLabel}
    >
      <div
        className={`w-full max-w-[900px] ${fontClass} product-tour-card-enter`}
        style={{ maxHeight: 'min(94vh, 660px)' }}
      >
        <div className="relative flex flex-col h-full max-h-[inherit] rounded-2xl sm:rounded-3xl glass-bubble overflow-hidden border border-white/70 shadow-[0_24px_80px_rgba(64,41,112,0.18)]">
          <div className="foil-edge w-full flex-shrink-0" />

          {/* Header */}
          <header className="relative z-20 flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-ink/[0.06] flex-shrink-0 bg-white/60">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <KaprukaLogo className="h-5 sm:h-6 w-auto flex-shrink-0" />
              <div className="w-px h-5 bg-ink/10 flex-shrink-0" />
              <WasiRobotAvatar size={22} className="flex-shrink-0" />
              <div className="min-w-0 hidden xs:block sm:block">
                <p className="text-[11px] font-display font-semibold text-violet-deep leading-tight truncate">{ui.tourLabel}</p>
                <p className="text-[9px] font-mono text-ink-faint leading-none">{ui.stepOf(stepIndex + 1, totalSteps)}</p>
              </div>
            </div>

            <div className="flex p-0.5 rounded-xl bg-violet-tint/40 border border-violet/10 flex-shrink-0" role="group" aria-label="Tour language">
              {(['en', 'si', 'ta'] as const).map((l) => {
                const active = lang === l;
                return (
                  <button
                    key={l}
                    type="button"
                    onClick={() => pickLang(l)}
                    aria-pressed={active}
                    className={`relative min-w-[2.25rem] px-2.5 py-1.5 text-[10px] font-mono font-bold rounded-lg transition-colors duration-200 ${
                      active ? 'text-white' : 'text-ink-muted hover:text-violet'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="tourLangPill"
                        className="absolute inset-0 rounded-lg bg-violet shadow-sm"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10">{LANG_LABELS[l]}</span>
                  </button>
                );
              })}
            </div>
          </header>

          <div className="foil-thread mx-5 flex-shrink-0" />

          {/* Body */}
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 overflow-hidden">
            {/* Visual */}
            <div
              className="lg:col-span-7 px-4 sm:px-10 py-6 sm:py-8 flex items-center justify-center border-b lg:border-b-0 lg:border-r border-ink/[0.06] min-h-[240px] lg:min-h-0"
              style={{ background: 'linear-gradient(165deg, #FAF8FC 0%, #F3EFF8 55%, #EDE8F4 100%)' }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={visualKey}
                  initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -8 }}
                  transition={visualTransition}
                  className="w-full flex items-center justify-center"
                >
                  <TourStepVisualizer
                    step={step}
                    lang={lang}
                    completed={isCompleted}
                    activeShelfItem={activeShelfItem}
                    onHoverItem={setActiveShelfItem}
                    selectedCity={selectedCity}
                    onSelectCity={setSelectedCity}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Content */}
            <div className="lg:col-span-5 flex flex-col min-h-0 bg-white/85">
              <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 sm:py-6">
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={contentKey}
                    custom={direction}
                    variants={prefersReducedMotion ? undefined : contentSlideVariants}
                    initial={prefersReducedMotion ? undefined : 'enter'}
                    animate={prefersReducedMotion ? undefined : 'center'}
                    exit={prefersReducedMotion ? undefined : 'exit'}
                    className="space-y-4"
                  >
                    <div className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 bg-violet-tint/50 border border-violet/10">
                      <span className={`h-1.5 w-1.5 rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-violet-soft'}`} />
                      <span className="text-[10px] font-mono font-semibold text-violet uppercase tracking-wider">
                        {isCompleted ? ui.readyLabel : ui.stepOf(stepIndex + 1, totalSteps)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <h1 className="font-display text-xl sm:text-[1.65rem] font-bold text-violet-deep tracking-tight leading-[1.12]">
                        {title}
                      </h1>
                      <p className="text-[13px] text-ink-muted leading-relaxed">
                        {lead}
                      </p>
                    </div>

                    {!isCompleted && (
                      <>
                        <div className="grid grid-cols-1 gap-2 pt-1">
                          {copy.features.map((feature, i) => (
                            <div
                              key={`${lang}-${feature.label}-${i}`}
                              className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-ink/[0.06] hover:border-violet/15 hover:shadow-sm transition-all tour-feature-cell"
                            >
                              <div className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-violet-tint flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 text-violet" strokeWidth={3} />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-[11px] font-semibold text-ink leading-tight">{feature.label}</h4>
                                <p className="text-[10px] text-ink-faint mt-0.5 leading-snug">{feature.detail}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {copy.examplePrompt && (
                          <div className="rounded-xl border border-violet/10 bg-violet-tint/30 p-3 space-y-2">
                            <span className="text-[9px] font-mono font-bold text-violet/70 uppercase tracking-wider">{ui.tryExample}</span>
                            <button
                              type="button"
                              onClick={handleExampleDemo}
                              className="w-full text-left text-[11px] font-mono text-ink-muted bg-white/90 px-3 py-2 rounded-lg border border-ink/[0.06] hover:border-violet/25 hover:text-violet transition-all flex items-center justify-between gap-2"
                            >
                              <span className="truncate">&ldquo;{copy.examplePrompt}&rdquo;</span>
                              <ArrowRight className="w-3.5 h-3.5 text-violet-soft shrink-0" />
                            </button>
                            <button
                              type="button"
                              onClick={handleTryExample}
                              className="text-[10px] font-mono text-violet-soft hover:text-violet transition-colors"
                            >
                              {ui.sendToChat} →
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {isCompleted && (
                      <div className="space-y-2 pt-1">
                        <button
                          type="button"
                          onClick={handleFinish}
                          className="w-full py-3 px-4 rounded-xl font-display font-semibold text-sm text-white bg-violet hover:bg-violet-mid active:scale-[0.98] shadow-sm transition-all"
                        >
                          {ui.getStarted}
                        </button>
                        {!isSignedIn && (
                          <>
                            <button
                              type="button"
                              onClick={handleSignIn}
                              className="w-full py-3 px-4 rounded-xl font-display font-semibold text-sm text-violet border border-violet/20 bg-white hover:bg-violet-tint/40 transition-all"
                            >
                              {ui.signIn}
                            </button>
                            <button
                              type="button"
                              onClick={handleFinish}
                              className="w-full py-2 text-[11px] font-mono text-ink-faint hover:text-violet transition-colors"
                            >
                              {ui.continueGuest}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {!isCompleted && (
                <footer className="flex-shrink-0 px-5 sm:px-7 pb-5 pt-3 border-t border-ink/[0.06] flex items-center justify-between gap-2">
                  <div className="flex gap-1.5">
                    {TOUR_STEPS.map((stepId, idx) => (
                      <button
                        key={stepId}
                        type="button"
                        onClick={() => goTo(idx)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          idx === stepIndex ? 'w-5 bg-violet' : 'w-1.5 bg-violet/20 hover:bg-violet/45'
                        }`}
                        aria-label={ui.stepOf(idx + 1, totalSteps)}
                        aria-current={idx === stepIndex ? 'step' : undefined}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!isFirst && (
                      <button
                        type="button"
                        onClick={goBack}
                        className="p-2 rounded-xl text-ink-muted hover:text-violet hover:bg-violet-tint/40 transition-all flex items-center gap-0.5"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="hidden sm:inline text-[11px] font-mono font-semibold">{ui.back}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleFinish}
                      className="px-2.5 py-2 rounded-xl text-[11px] font-mono text-ink-faint hover:text-ink-muted transition-colors"
                    >
                      {ui.skip}
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      className="px-4 py-2 rounded-xl font-display font-semibold text-[12px] text-white bg-violet hover:bg-violet-mid active:scale-[0.98] shadow-sm transition-all flex items-center gap-1"
                    >
                      <span>{isLast ? ui.finish : ui.next}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </footer>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
