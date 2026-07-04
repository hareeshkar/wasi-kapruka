import React from 'react';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import { Search, Mic, Camera, MapPin, Truck, ShieldCheck, Lock, Check } from 'lucide-react';
import WasiRobotAvatar from '../WasiRobotAvatar';
import type { TourStepId } from './tourSteps';

interface Props {
  step: TourStepId;
  animKey: number;
}

/* ── Shared motion grammar — one grammar, every step ─────────────────────────
   Spring-out entrance, gentle stagger, no gradients, no glow. Consistency
   across all seven steps is the signature, not any single ornament. */
const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.075, delayChildren: 0.04 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 8, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 360, damping: 30 } },
};
const itemReduced: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2 } },
};

const CATEGORY_SWATCHES = [
  { tint: '#402970' },
  { tint: '#C9A84C' },
  { tint: '#7B5EA7' },
  { tint: '#B0A8BC' },
  { tint: '#E8C96B' },
  { tint: '#5B3E8A' },
];

export default function TourAnimationViewport({ step, animKey }: Props) {
  const prefersReducedMotion = useReducedMotion();
  const itemVariant = prefersReducedMotion ? itemReduced : item;

  return (
    <div
      key={`${step}-${animKey}`}
      className="relative mx-5 mt-3 rounded-xl overflow-hidden border border-ink/5 tour-viewport-bg"
      style={{ height: 148 }}
      aria-hidden
    >
      <motion.div
        className="relative h-full"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {step === 'welcome' && (
          <div className="relative h-full flex flex-col items-center justify-center gap-3">
            <motion.div variants={itemVariant} className="tour-anim-float">
              <WasiRobotAvatar size={52} />
            </motion.div>
            <div className="flex gap-2">
              {['EN', 'SI', 'TA'].map((l) => (
                <motion.span
                  key={l}
                  variants={itemVariant}
                  className="text-[9px] font-mono font-bold px-2.5 py-1 rounded-full bg-white/90 text-violet border border-violet/15 shadow-sm"
                >
                  {l}
                </motion.span>
              ))}
            </div>
          </div>
        )}

        {step === 'discover' && (
          <div className="relative h-full px-5 py-4 flex flex-col justify-center gap-2.5">
            <motion.div variants={itemVariant} className="flex items-center gap-1.5">
              <Search className="w-3 h-3 text-violet/60" strokeWidth={2.25} />
              <span className="text-[8px] font-mono font-bold text-violet/60 uppercase tracking-wider">
                64+ categories &middot; 120,000+ products
              </span>
            </motion.div>
            <div className="grid grid-cols-6 gap-1.5">
              {CATEGORY_SWATCHES.map((c, i) => (
                <motion.div
                  key={i}
                  variants={itemVariant}
                  className="aspect-square rounded-lg"
                  style={{ background: `${c.tint}1A`, border: `1px solid ${c.tint}33` }}
                />
              ))}
            </div>
            <motion.div
              variants={itemVariant}
              className="rounded-lg bg-white/85 border border-ink/[0.06] px-2.5 py-1.5 text-[10px] font-mono text-ink-muted"
            >
              &ldquo;Birthday cakes under Rs. 5,000&rdquo;
            </motion.div>
          </div>
        )}

        {step === 'multimodal' && (
          <div className="relative h-full flex items-center justify-center gap-5 px-4">
            <motion.div variants={itemVariant} className="flex items-end gap-[3px] h-8">
              {[0.4, 0.7, 1, 0.65, 0.45, 0.8, 0.55].map((h, i) => (
                <span
                  key={i}
                  className="w-[3px] rounded-full bg-violet"
                  style={{
                    height: `${h * 100}%`,
                    animation: prefersReducedMotion ? undefined : `tourWave 1.1s ease-in-out ${i * 0.1}s infinite`,
                  }}
                />
              ))}
            </motion.div>
            <div className="flex flex-col gap-2">
              <motion.div variants={itemVariant} className="w-11 h-11 rounded-xl bg-white/85 border border-ink/[0.06] flex items-center justify-center">
                <Mic className="w-4 h-4 text-violet" strokeWidth={1.75} />
              </motion.div>
              <motion.div variants={itemVariant} className="w-11 h-11 rounded-xl bg-white/85 border border-ink/[0.06] flex items-center justify-center">
                <Camera className="w-4 h-4 text-violet" strokeWidth={1.75} />
              </motion.div>
            </div>
            <motion.div
              variants={itemVariant}
              className="absolute bottom-3 right-4 rounded-2xl rounded-br-sm px-2.5 py-1.5 bg-violet-tint border border-violet/10 text-[9px] font-mono text-ink-muted max-w-[120px]"
            >
              Amma ku gift ekak…
            </motion.div>
          </div>
        )}

        {step === 'deliver' && (
          <div className="relative h-full px-5 py-4 flex flex-col justify-center gap-3">
            <div className="relative flex items-center">
              <motion.span variants={itemVariant} className="w-2 h-2 rounded-full bg-violet flex-shrink-0" />
              <svg className="flex-1 h-3 mx-1.5" viewBox="0 0 100 12" preserveAspectRatio="none">
                <motion.line
                  x1="0" y1="6" x2="100" y2="6"
                  stroke="rgba(64,41,112,0.25)" strokeWidth="1.5" strokeDasharray="3 3"
                  variants={itemVariant}
                />
              </svg>
              <motion.span variants={itemVariant} className="flex items-center gap-1 flex-shrink-0">
                <MapPin className="w-3 h-3 text-violet" strokeWidth={2.25} />
                <span className="text-[10px] font-mono font-semibold text-violet">Kandy</span>
              </motion.span>
              {!prefersReducedMotion && (
                <motion.span
                  className="absolute left-0 top-1/2 -translate-y-1/2"
                  initial={{ left: '0%' }}
                  animate={{ left: '86%' }}
                  transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                >
                  <Truck className="w-3.5 h-3.5 text-gold" strokeWidth={2} />
                </motion.span>
              )}
            </div>
            <motion.div
              variants={itemVariant}
              className="rounded-lg bg-white/85 border border-ink/[0.06] px-2.5 py-1.5 text-[10px] font-mono text-ink-muted"
            >
              Gift message on the card &middot; delivery fee checked upfront
            </motion.div>
          </div>
        )}

        {step === 'checkout' && (
          <div className="relative h-full flex items-center justify-center gap-5 px-4">
            <motion.div variants={itemVariant} className="relative w-16 h-16">
              <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(64,41,112,0.1)" strokeWidth="4" />
                <circle
                  cx="32" cy="32" r="26" fill="none" stroke="#C9A84C" strokeWidth="4"
                  strokeLinecap="round" strokeDasharray="163" strokeDashoffset="40"
                  className="tour-anim-timer-stroke"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-violet">58:42</span>
            </motion.div>
            <div className="space-y-1.5">
              <motion.p variants={itemVariant} className="font-display text-lg font-bold text-violet-deep leading-none">Rs. 8,150</motion.p>
              <motion.div variants={itemVariant} className="flex items-center gap-1">
                <span className="seal-badge-gold w-3.5 h-3.5">
                  <Lock className="w-2 h-2 text-violet-deep" strokeWidth={2.5} />
                </span>
                <span className="text-[9px] font-mono text-emerald-600 font-semibold">Price locked</span>
              </motion.div>
            </div>
          </div>
        )}

        {step === 'track' && (
          <div className="relative h-full px-5 py-4 flex flex-col justify-center">
            <div className="relative pl-4 space-y-3">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-violet/15" />
              <motion.div
                className="absolute left-[7px] top-2 w-px bg-violet origin-top"
                style={{ height: 'calc(100% - 16px)' }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: prefersReducedMotion ? 0.2 : 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
              />
              {['Confirmed', 'Prepared', 'Delivered'].map((label, i) => (
                <motion.div key={label} variants={itemVariant} className="flex items-center gap-2 relative">
                  {i === 2 ? (
                    <span className="seal-badge-gold w-3.5 h-3.5 flex-shrink-0 z-10">
                      <Check className="w-2 h-2 text-violet-deep" strokeWidth={3} />
                    </span>
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full flex-shrink-0 z-10 bg-violet-soft" />
                  )}
                  <span className={`text-[10px] font-mono ${i === 2 ? 'text-ink font-semibold' : 'text-ink-faint'}`}>{label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {step === 'remember' && (
          <div className="relative h-full flex items-center justify-center gap-4 px-4">
            <motion.div variants={itemVariant}>
              <div className="seal-badge-gold w-14 h-14">
                <ShieldCheck className="w-6 h-6 text-violet-deep" strokeWidth={1.75} />
              </div>
            </motion.div>
            <div className="space-y-2">
              {['History', 'Cart', 'Taste'].map((l) => (
                <motion.div key={l} variants={itemVariant} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                  <span className="text-[10px] font-mono text-ink-muted">{l} saved</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
