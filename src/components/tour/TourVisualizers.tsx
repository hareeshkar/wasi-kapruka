import React, { useId } from 'react';
import WasiRobotAvatar from '../WasiRobotAvatar';
import type { TourLang, TourStepId } from './tourSteps';
import './tourViz.css';

export type TourCity = 'Colombo' | 'Kandy' | 'Galle' | 'Jaffna';

/* Gift-tag atelier palette — exact app tokens (index.css @theme), nothing invented */
const P = {
  paper: '#FFFFFF',
  paperWarm: '#FAFAF8',
  violet: '#402970',
  violetDeep: '#2D1B69',
  violetMid: '#5B3E8A',
  violetSoft: '#7B5EA7',
  violetLight: '#EDE5F8',
  violetTint: '#F7F4FD',
  gold: '#C9A84C',
  goldBright: '#E8C96B',
  goldLight: '#F8F3E2',
  goldSoft: 'rgba(201, 168, 76, 0.14)',
  ink: '#212529',
  inkMuted: '#6B6578',
  inkFaint: '#B0A8BC',
  stroke: 'rgba(64, 41, 112, 0.08)',
  strokeMid: 'rgba(64, 41, 112, 0.16)',
  strokeActive: 'rgba(91, 62, 138, 0.35)',
  violetWash: 'rgba(123, 94, 167, 0.06)',
  success: '#2D9F5D',
  successSoft: 'rgba(45, 159, 93, 0.10)',
} as const;

interface Props {
  step: TourStepId;
  lang: TourLang;
  completed?: boolean;
  activeShelfItem: string | null;
  onHoverItem: (item: string | null) => void;
  selectedCity: TourCity;
  onSelectCity: (city: TourCity) => void;
}

export default function TourStepVisualizer(props: Props) {
  if (props.completed) return <CompletedVisualizer />;
  switch (props.step) {
    case 'welcome': return <WelcomeVisualizer lang={props.lang} />;
    case 'discover': return <DiscoverVisualizer activeItem={props.activeShelfItem} onHoverItem={props.onHoverItem} />;
    case 'multimodal': return <MultimodalVisualizer />;
    case 'deliver': return <DeliverVisualizer selectedCity={props.selectedCity} onSelectCity={props.onSelectCity} />;
    case 'checkout': return <CheckoutVisualizer />;
    case 'track': return <TrackVisualizer />;
    case 'remember': return <RememberVisualizer />;
    default: return null;
  }
}

/* ── Shared frame: a warm paper gift tag — eyelet, gold thread, one sheen ── */
function VisualFrame({
  children,
  label,
  threaded = true,
}: {
  children: React.ReactNode;
  label?: string;
  threaded?: boolean;
}) {
  return (
    <div className="relative w-full max-w-[320px] mx-auto">
      <div
        className="relative rounded-[28px] overflow-hidden"
        style={{
          background: `radial-gradient(120% 90% at 50% 8%, ${P.paper} 0%, #FBF9FC 58%, #F3EFF8 100%)`,
          boxShadow: '0 1px 0 rgba(255,255,255,0.95) inset, 0 16px 36px rgba(64,41,112,0.06), 0 2px 6px rgba(64,41,112,0.03)',
          border: `1px solid ${P.stroke}`,
        }}
      >
        <div className="absolute inset-0 tviz-sheen pointer-events-none" />
        <svg width="100%" height="100%" viewBox="0 0 360 360" fill="none" className="block">
          {threaded && (
            <g>
              {/* Eyelet */}
              <circle cx="34" cy="30" r="6.5" fill={P.paper} stroke={P.gold} strokeWidth="1.25" />
              <circle cx="34" cy="30" r="2.5" fill="#F3EFF8" stroke={P.strokeMid} strokeWidth="0.5" />
              {/* Foil thread with a gentle sag */}
              <path d="M 40.5 30 C 150 36, 250 24, 360 29" stroke={P.gold} strokeWidth="1" opacity="0.65" />
            </g>
          )}
          {children}
        </svg>
      </div>
      {label && (
        <p className="mt-3.5 text-center text-[10px] font-semibold tracking-wider uppercase tviz-mono" style={{ color: P.violetMid, opacity: 0.8 }}>
          {label}
        </p>
      )}
    </div>
  );
}

/* A wax seal: stitched outer ring, warm gold-light face */
function WaxSeal({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r + 6} fill="none" stroke={P.gold} strokeWidth="1" strokeDasharray="2 5" opacity="0.7" />
      <circle cx={cx} cy={cy} r={r} fill={P.goldLight} stroke={P.gold} strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={r - 6} fill={P.paper} stroke={P.goldSoft} strokeWidth="1" className="tviz-pulse" />
    </g>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   Scene 1 — Welcome: Wasi on a wax seal, three language coins on threads
   ─────────────────────────────────────────────────────────────────────── */
function WelcomeVisualizer({ lang }: { lang: TourLang }) {
  const greetings: Record<TourLang, string> = {
    en: 'Hello!',
    si: 'ආයුබෝවන්',
    ta: 'வணக்கம்',
  };
  const langs: { id: TourLang; label: string; x: number; y: number }[] = [
    { id: 'en', label: 'EN', x: 88, y: 104 },
    { id: 'si', label: 'සිං', x: 180, y: 68 },
    { id: 'ta', label: 'த', x: 272, y: 104 },
  ];
  return (
    <VisualFrame>
      {/* Threads from coins down to the seal */}
      {langs.map((l) => (
        <path
          key={`thread-${l.id}`}
          d={`M ${l.x} ${l.y + 20} Q ${(l.x + 180) / 2} ${(l.y + 176) / 2 + 12} 180 156`}
          fill="none"
          stroke={lang === l.id ? P.gold : P.strokeMid}
          strokeWidth={lang === l.id ? 1.25 : 0.75}
          strokeDasharray={lang === l.id ? '0' : '2 4'}
          opacity={lang === l.id ? 0.8 : 0.7}
        />
      ))}

      {/* Language coins */}
      {langs.map((l) => {
        const active = lang === l.id;
        return (
          <g key={l.id} transform={`translate(${l.x}, ${l.y})`}>
            {active && <circle r="26" fill={P.goldSoft} className="tviz-ping" />}
            <circle r="20" fill={P.paper} stroke={active ? P.gold : P.strokeMid} strokeWidth={active ? 1.5 : 1} />
            {active && <circle r="16" fill="none" stroke={P.goldSoft} strokeWidth="3" />}
            <text
              x="0" y="4"
              fill={active ? P.violet : P.inkMuted}
              fontSize={l.id === 'en' ? 10 : 12}
              fontWeight={active ? 700 : 500}
              textAnchor="middle"
              className="tviz-sans"
            >
              {l.label}
            </text>
          </g>
        );
      })}

      {/* Central seal with the Wasi robot */}
      <WaxSeal cx={180} cy={196} r={44} />
      <foreignObject x="156" y="172" width="48" height="48">
        <div className="flex items-center justify-center w-full h-full tviz-float">
          <WasiRobotAvatar size={40} />
        </div>
      </foreignObject>

      {/* Greeting in the display serif */}
      <text
        x="180" y="288"
        fill={P.violetDeep}
        fontSize={lang === 'en' ? 24 : 20}
        fontWeight="600"
        fontStyle="italic"
        textAnchor="middle"
        className="tviz-serif"
      >
        {greetings[lang]}
      </text>
      <text x="180" y="312" fill={P.inkFaint} fontSize="8.5" textAnchor="middle" letterSpacing="0.16em" className="tviz-mono">
        ONE ASSISTANT · THREE LANGUAGES
      </text>
    </VisualFrame>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   Scene 2 — Discover: a fanned hand of gift cards, like swatches at an
   atelier counter. Hovering a card lifts it out of the fan.
   ─────────────────────────────────────────────────────────────────────── */
type ShelfItem = 'cake' | 'flowers' | 'perfume';

function DiscoverVisualizer({
  activeItem,
  onHoverItem,
}: {
  activeItem: string | null;
  onHoverItem: (item: string | null) => void;
}) {
  const items: { id: ShelfItem; angle: number; title: string; price: string; swatch: string }[] = [
    { id: 'cake', angle: -18, title: 'Ribbon Cake', price: 'Rs. 4,950', swatch: P.goldLight },
    { id: 'flowers', angle: 0, title: 'Fresh Roses', price: 'Rs. 3,800', swatch: P.violetLight },
    { id: 'perfume', angle: 18, title: 'Gift Set', price: 'Rs. 12,500', swatch: '#FDF6EC' },
  ];

  const CardArt = ({ id }: { id: ShelfItem }) => {
    if (id === 'cake') {
      return (
        <g>
          <rect x="-20" y="-4" width="40" height="22" rx="5" fill={P.paper} stroke={P.violetMid} strokeWidth="1.3" />
          <path d="M-20 -1 Q-10 4 0 -1 T20 -1" fill="none" stroke={P.gold} strokeWidth="1.75" strokeLinecap="round" />
          <line x1="0" y1="-4" x2="0" y2="-15" stroke={P.violetSoft} strokeWidth="1.2" />
          <circle cx="0" cy="-18" r="3" fill={P.goldBright} />
        </g>
      );
    }
    if (id === 'flowers') {
      return (
        <g>
          <path d="M-10 16 L-5 -2 L5 -2 L10 16 Z" fill="none" stroke={P.violetMid} strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M0 -2 Q-9 -13 -5 -20" fill="none" stroke={P.violetSoft} strokeWidth="1.2" strokeLinecap="round" />
          <path d="M0 -2 Q9 -13 5 -20" fill="none" stroke={P.violetSoft} strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="-5" cy="-20" r="4.5" fill={P.paper} stroke={P.gold} strokeWidth="1.2" />
          <circle cx="5" cy="-20" r="4.5" fill={P.paper} stroke={P.violetSoft} strokeWidth="1.2" />
        </g>
      );
    }
    return (
      <g>
        <rect x="-12" y="-6" width="24" height="21" rx="5" fill={P.paper} stroke={P.violetMid} strokeWidth="1.3" />
        <rect x="-7" y="2" width="14" height="10" rx="1.5" fill={P.goldSoft} stroke={P.gold} strokeWidth="0.6" />
        <rect x="-4" y="-11" width="8" height="5" fill={P.violetSoft} stroke={P.violetMid} strokeWidth="0.8" />
        <rect x="-6" y="-15" width="12" height="4" rx="1.5" fill={P.gold} />
      </g>
    );
  };

  return (
    <VisualFrame label="Hover a gift to compare">
      {/* The catalog count is the headline */}
      <text x="180" y="92" fill={P.violetDeep} fontSize="30" fontWeight="600" textAnchor="middle" className="tviz-serif" style={{ fontVariantNumeric: 'tabular-nums' }}>
        120,000+
      </text>
      <text x="180" y="112" fill={P.inkFaint} fontSize="8" textAnchor="middle" letterSpacing="0.2em" className="tviz-mono">
        GIFTS IN THE KAPRUKA CATALOG
      </text>

      {/* Fanned hand of cards, pivoting from below the frame */}
      {items.map(({ id, angle, title, price, swatch }) => {
        const active = activeItem === id;
        const dim = activeItem !== null && activeItem !== id;
        return (
          <g key={id} transform={`rotate(${angle} 180 470)`}>
            <g
              className="cursor-pointer"
              onMouseEnter={() => onHoverItem(id)}
              onMouseLeave={() => onHoverItem(null)}
              style={{
                opacity: dim ? 0.45 : 1,
                transform: active ? 'translateY(-18px)' : 'translateY(0)',
                transition: 'transform 0.32s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.25s ease',
              }}
            >
              <rect
                x="124" y="140" width="112" height="164" rx="14"
                fill={P.paper}
                stroke={active ? P.strokeActive : P.strokeMid}
                strokeWidth={active ? 1.5 : 1}
                style={{
                  filter: active
                    ? 'drop-shadow(0 18px 36px rgba(64,41,112,0.16))'
                    : 'drop-shadow(0 6px 14px rgba(64,41,112,0.07))',
                  transition: 'filter 0.32s ease',
                }}
              />
              {/* Swatch field with the gift illustration */}
              <rect x="132" y="148" width="96" height="88" rx="9" fill={swatch} stroke={P.stroke} strokeWidth="0.5" />
              <g transform="translate(180, 196)" className={active ? 'tviz-float' : undefined}>
                <CardArt id={id} />
              </g>
              {/* Foil hairline — lights up on the chosen card */}
              <line x1="138" y1="248" x2="222" y2="248" stroke={active ? P.gold : P.strokeMid} strokeWidth="0.75" style={{ transition: 'stroke 0.25s ease' }} />
              <text x="180" y="268" fill={P.ink} fontSize="12" fontWeight="600" textAnchor="middle" className="tviz-serif">
                {title}
              </text>
              <text x="180" y="286" fill={active ? P.violet : P.inkMuted} fontSize="9.5" fontWeight="700" textAnchor="middle" className="tviz-mono">
                {price}
              </text>
            </g>
          </g>
        );
      })}
    </VisualFrame>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   Scene 3 — Multimodal: say it, show it, or type it — one note card
   ─────────────────────────────────────────────────────────────────────── */
function MultimodalVisualizer() {
  const uid = useId().replace(/:/g, '');
  const bars = [10, 18, 26, 20, 12, 24, 16, 10, 14, 20, 26, 14];
  return (
    <VisualFrame label="Say it, show it, or type it">
      <defs>
        <linearGradient id={`${uid}-wave`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={P.violetSoft} />
          <stop offset="100%" stopColor={P.gold} />
        </linearGradient>
        <clipPath id={`${uid}-photo`}>
          <rect x="134" y="148" width="58" height="38" rx="3" />
        </clipPath>
      </defs>

      {/* Note card */}
      <rect x="52" y="58" width="256" height="244" rx="18" fill={P.paper} stroke={P.stroke} strokeWidth="1" style={{ filter: 'drop-shadow(0 6px 18px rgba(64,41,112,0.05))' }} />

      {/* Row 1 — Say */}
      <text x="74" y="104" fill={P.inkFaint} fontSize="7.5" fontWeight="700" letterSpacing="0.18em" className="tviz-mono">SAY</text>
      <g transform="translate(134, 100)">
        {bars.map((h, i) => (
          <rect
            key={i}
            x={i * 12}
            y={-h / 2}
            width="4.5"
            height={h}
            rx="2.25"
            fill={`url(#${uid}-wave)`}
            className="tviz-wave"
            style={{ animationDelay: `${i * 0.07}s` }}
          />
        ))}
      </g>
      <line x1="70" y1="130" x2="290" y2="130" stroke={P.stroke} strokeWidth="1" />

      {/* Row 2 — Show */}
      <text x="74" y="170" fill={P.inkFaint} fontSize="7.5" fontWeight="700" letterSpacing="0.18em" className="tviz-mono">SHOW</text>
      <g>
        <rect x="130" y="144" width="66" height="52" rx="5" fill={P.paper} stroke={P.strokeMid} strokeWidth="1" style={{ filter: 'drop-shadow(0 3px 8px rgba(64,41,112,0.06))' }} />
        <rect x="134" y="148" width="58" height="38" rx="3" fill={P.violetLight} />
        <g clipPath={`url(#${uid}-photo)`}>
          <path d="M138 186 L154 166 L164 176 L176 162 L192 186 Z" fill={P.violetSoft} opacity="0.55" />
          <circle cx="180" cy="158" r="5" fill={P.goldBright} />
          <rect x="140" y="144" width="14" height="46" fill="rgba(255,255,255,0.55)" transform="skewX(-14)" className="tviz-shimmer" />
        </g>
      </g>
      {/* Wasi reads the photo */}
      <g transform="translate(232, 170)">
        <path d="M-28 0 H-8" stroke={P.gold} strokeWidth="1" strokeDasharray="2 3" opacity="0.8" />
        <circle r="16" fill={P.goldLight} stroke={P.gold} strokeWidth="1" />
        <foreignObject x="-12" y="-12" width="24" height="24">
          <div className="flex items-center justify-center w-full h-full">
            <WasiRobotAvatar size={22} />
          </div>
        </foreignObject>
      </g>
      <line x1="70" y1="214" x2="290" y2="214" stroke={P.stroke} strokeWidth="1" />

      {/* Row 3 — Type */}
      <text x="74" y="256" fill={P.inkFaint} fontSize="7.5" fontWeight="700" letterSpacing="0.18em" className="tviz-mono">TYPE</text>
      <g>
        <rect x="130" y="238" width="158" height="28" rx="14" fill={P.violetTint} stroke={P.stroke} strokeWidth="0.75" />
        <text x="144" y="256" fill={P.inkMuted} fontSize="9" className="tviz-mono">birthday cake for amma</text>
        <rect x="272" y="245" width="1.5" height="14" fill={P.violet} className="tviz-caret" />
      </g>
    </VisualFrame>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   Scene 4 — Deliver: the island itself. A stylized Sri Lanka silhouette;
   tapping a city draws the courier route from Colombo and a parcel rides it.
   ─────────────────────────────────────────────────────────────────────── */
function DeliverVisualizer({
  selectedCity,
  onSelectCity,
}: {
  selectedCity: TourCity;
  onSelectCity: (city: TourCity) => void;
}) {
  const uid = useId().replace(/:/g, '');

  const ISLAND =
    'M 176 62 C 150 70, 152 96, 160 112 C 148 140, 138 170, 136 205 ' +
    'C 134 240, 140 272, 156 296 C 172 318, 208 318, 224 300 ' +
    'C 246 278, 252 236, 248 196 C 244 156, 226 110, 200 80 C 192 70, 184 62, 176 62 Z';

  const origin = { cx: 142, cy: 210 };
  const destinations: Record<Exclude<TourCity, 'Colombo'>, { cx: number; cy: number; controlX: number; controlY: number; labelX: number; labelY: number }> = {
    Jaffna: { cx: 170, cy: 86, controlX: 138, controlY: 145, labelX: 196, labelY: 82 },
    Kandy: { cx: 198, cy: 196, controlX: 168, controlY: 192, labelX: 224, labelY: 194 },
    Galle: { cx: 164, cy: 288, controlX: 140, controlY: 252, labelX: 116, labelY: 306 },
  };
  const destinationKeys = Object.keys(destinations) as Exclude<TourCity, 'Colombo'>[];

  const routePath = (city: TourCity) => {
    const d = destinations[city];
    return `M ${origin.cx} ${origin.cy} Q ${d.controlX} ${d.controlY} ${d.cx} ${d.cy}`;
  };

  return (
    <VisualFrame label="Tap a city to preview the route">
      <defs>
        <linearGradient id={`${uid}-route`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={P.violetSoft} />
          <stop offset="100%" stopColor={P.gold} />
        </linearGradient>
      </defs>

      {/* The island — one confident shape */}
      <path d={ISLAND} fill={P.violetTint} stroke={P.violetSoft} strokeWidth="1.25" strokeLinejoin="round" opacity="0.9" />
      <path d={ISLAND} fill="none" stroke={P.gold} strokeWidth="0.75" strokeDasharray="1.5 5" opacity="0.65" transform="translate(6 7)" />

      {/* Chart furniture */}
      <text x="292" y="130" fill={P.inkFaint} fontSize="8" letterSpacing="0.28em" className="tviz-mono" transform="rotate(90 292 130)">
        SRI LANKA
      </text>
      <text x="66" y="76" fill={P.inkFaint} fontSize="8" letterSpacing="0.16em" className="tviz-mono">
        ISLAND-WIDE
      </text>
      <line x1="66" y1="84" x2="122" y2="84" stroke={P.gold} strokeWidth="0.75" opacity="0.7" />

      {/* Chosen route draws itself; a parcel rides it */}
      {selectedCity !== 'Colombo' && (
        <g>
          <path
            d={routePath(selectedCity)}
            fill="none"
            stroke={`url(#${uid}-route)`}
            strokeWidth="2.5"
            strokeLinecap="round"
            pathLength="1"
            className="tviz-route"
          />
          <g>
            <animateMotion dur="2.4s" repeatCount="indefinite" path={routePath(selectedCity)} rotate="auto" />
            <rect x="-5" y="-5" width="10" height="10" rx="1.5" fill={P.gold} />
            <line x1="0" y1="-5" x2="0" y2="5" stroke={P.paper} strokeWidth="1.2" />
            <line x1="-5" y1="0" x2="5" y2="0" stroke={P.paper} strokeWidth="1.2" />
          </g>
        </g>
      )}

      {/* Colombo — the gifting studio, always the origin */}
      <g transform={`translate(${origin.cx}, ${origin.cy})`}>
        <circle r="10" fill={P.goldLight} stroke={P.gold} strokeWidth="1.25" />
        <circle r="14" fill="none" stroke={P.gold} strokeWidth="0.75" strokeDasharray="2 4" opacity="0.75" />
        <rect x="-3.5" y="-3.5" width="7" height="6" rx="1" fill={P.paper} stroke={P.violetMid} strokeWidth="1" />
        <line x1="0" y1="-3.5" x2="0" y2="2.5" stroke={P.violetMid} strokeWidth="0.9" />
        <text x="-18" y="4" fill={P.violetDeep} fontSize="11" fontWeight="600" textAnchor="end" className="tviz-serif">Colombo</text>
      </g>

      {/* Destination cities */}
      {destinationKeys.map((key) => {
        const { cx, cy, labelX, labelY } = destinations[key];
        const active = selectedCity === key;
        return (
          <g key={key} className="cursor-pointer" onClick={() => onSelectCity(key)}>
            <circle cx={cx} cy={cy} r="20" fill="transparent" />
            {active && <circle cx={cx} cy={cy} r="11" fill={P.goldSoft} className="tviz-ping" style={{ transformOrigin: `${cx}px ${cy}px` }} />}
            <circle cx={cx} cy={cy} r={active ? 5.5 : 4} fill={active ? P.gold : P.paper} stroke={active ? P.violet : P.violetSoft} strokeWidth="1.25" />
            <text
              x={labelX} y={labelY}
              fill={active ? P.violet : P.inkMuted}
              fontSize="11"
              fontWeight="600"
              textAnchor={labelX < cx ? 'end' : 'start'}
              className="tviz-serif"
            >
              {key}
            </text>
          </g>
        );
      })}
    </VisualFrame>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   Scene 5 — Checkout: the price-lock dial, engraved like a pocket watch
   ─────────────────────────────────────────────────────────────────────── */
function CheckoutVisualizer() {
  const uid = useId().replace(/:/g, '');
  const ticks = Array.from({ length: 60 }, (_, i) => i);
  return (
    <VisualFrame>
      <defs>
        <linearGradient id={`${uid}-arc`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={P.violetMid} />
          <stop offset="100%" stopColor={P.gold} />
        </linearGradient>
        <radialGradient id={`${uid}-aura`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={P.gold} stopOpacity="0.1" />
          <stop offset="100%" stopColor={P.paper} stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="180" cy="192" r="128" fill={`url(#${uid}-aura)`} />

      {/* Engraved minute ticks */}
      <g transform="rotate(-90 180 192)">
        {ticks.map((i) => {
          const major = i % 5 === 0;
          const len = major ? 8 : 4;
          const a = (i / 60) * Math.PI * 2;
          const r1 = 116;
          const r2 = 116 - len;
          return (
            <line
              key={i}
              x1={180 + Math.cos(a) * r1}
              y1={192 + Math.sin(a) * r1}
              x2={180 + Math.cos(a) * r2}
              y2={192 + Math.sin(a) * r2}
              stroke={major ? P.violetMid : P.strokeMid}
              strokeWidth={major ? 1.5 : 0.75}
              opacity={major ? 0.8 : 0.5}
            />
          );
        })}
      </g>

      <circle cx="180" cy="192" r="98" stroke={P.stroke} strokeWidth="6" fill="none" />
      <circle
        cx="180" cy="192" r="98"
        stroke={`url(#${uid}-arc)`}
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="431 185"
        transform="rotate(-90 180 192)"
        className="tviz-arc"
      />

      <text x="180" y="164" fill={P.inkFaint} fontSize="8.5" textAnchor="middle" letterSpacing="0.2em" className="tviz-mono">PRICE LOCK</text>
      <text
        x="180" y="212"
        fill={P.violetDeep}
        fontSize="44"
        fontWeight="600"
        textAnchor="middle"
        className="tviz-serif"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        58:42
      </text>
      <text x="180" y="234" fill={P.inkMuted} fontSize="9.5" textAnchor="middle" className="tviz-sans">minutes remaining</text>

      {/* Padlock chip */}
      <g transform="translate(252, 110)">
        <rect x="-18" y="-18" width="36" height="36" rx="11" fill={P.goldLight} stroke={P.gold} strokeWidth="0.75" />
        <rect x="-6" y="-1" width="12" height="9" rx="1.5" fill="none" stroke={P.violetMid} strokeWidth="1.5" />
        <path d="M-4 -1 V-6 C-4 -9, 4 -9, 4 -6 V-1" fill="none" stroke={P.violetMid} strokeWidth="1.5" />
        <circle cx="0" cy="3" r="1.5" fill={P.violetMid} />
      </g>
    </VisualFrame>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   Scene 6 — Track: one continuous gold thread winds from the studio to the
   door. Knots are milestones; the parcel bobs where it currently is.
   ─────────────────────────────────────────────────────────────────────── */
function TrackVisualizer() {
  const uid = useId().replace(/:/g, '');

  const THREAD =
    'M 60 110 C 180 60, 300 120, 240 170 C 190 208, 90 210, 96 258 C 100 292, 200 288, 296 268';

  const knots = [
    { x: 60, y: 110, title: 'Wrapped', sub: 'Gifting studio, Colombo', labelX: 46, labelY: 134, anchor: 'start' as const, done: true },
    { x: 240, y: 170, title: 'Picked up', sub: 'Kapruka Express', labelX: 256, labelY: 188, anchor: 'start' as const, done: true },
    { x: 96, y: 258, title: 'On the way', sub: 'Near Kandy', labelX: 28, labelY: 228, anchor: 'start' as const, done: false },
    { x: 296, y: 268, title: 'Your door', sub: '', labelX: 296, labelY: 296, anchor: 'middle' as const, done: false },
  ];

  return (
    <VisualFrame label="Follow it all the way to the door">
      <defs>
        <linearGradient id={`${uid}-prog`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={P.violetMid} />
          <stop offset="100%" stopColor={P.gold} />
        </linearGradient>
      </defs>

      {/* The journey still to come — loose, dashed */}
      <path d={THREAD} fill="none" stroke={P.strokeMid} strokeWidth="1.25" strokeDasharray="3 6" strokeLinecap="round" />

      {/* The journey so far — the thread pulls taut in gold (drawn to ~70%) */}
      <path
        d={THREAD}
        fill="none"
        stroke={`url(#${uid}-prog)`}
        strokeWidth="2.5"
        strokeLinecap="round"
        pathLength="100"
        strokeDasharray="70 100"
        strokeDashoffset="70"
        className="tviz-fill"
        style={{ '--tviz-fill-len': 70 } as React.CSSProperties}
      />

      {/* Milestone knots */}
      {knots.map(({ x, y, title, sub, labelX, labelY, anchor, done }, i) => (
        <g key={title} className="tviz-pop" style={{ animationDelay: `${i * 0.14}s` }}>
          {i === 2 ? (
            /* The parcel, mid-journey */
            <g transform={`translate(${x}, ${y})`} className="tviz-bob">
              <circle r="13" fill={P.goldLight} stroke={P.gold} strokeWidth="1.25" />
              <rect x="-4.5" y="-4.5" width="9" height="9" rx="1.5" fill={P.gold} />
              <line x1="0" y1="-4.5" x2="0" y2="4.5" stroke={P.paper} strokeWidth="1" />
              <line x1="-4.5" y1="0" x2="4.5" y2="0" stroke={P.paper} strokeWidth="1" />
            </g>
          ) : i === 3 ? (
            /* Home — a small doorway */
            <g transform={`translate(${x}, ${y})`}>
              <path d="M-9 8 V-4 Q0 -12 9 -4 V8 Z" fill={P.paper} stroke={P.violetMid} strokeWidth="1.25" strokeLinejoin="round" />
              <circle cx="3.5" cy="1" r="1" fill={P.gold} />
            </g>
          ) : (
            <g transform={`translate(${x}, ${y})`}>
              <circle r="8" fill={P.paper} stroke={P.violetMid} strokeWidth="1.25" />
              <g className="tviz-check" style={{ animationDelay: `${0.3 + i * 0.14}s` }}>
                <path d="M-3 0 L-0.5 2.5 L3.5 -2.5" fill="none" stroke={P.violetMid} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </g>
          )}
          <text x={labelX} y={labelY} fill={done ? P.ink : P.violet} fontSize="11.5" fontWeight="600" textAnchor={anchor} className="tviz-serif">
            {title}
          </text>
          {sub && (
            <text x={labelX} y={labelY + 13} fill={P.inkFaint} fontSize="8" textAnchor={anchor} className="tviz-sans">
              {sub}
            </text>
          )}
        </g>
      ))}

      {/* The promise, in the display serif */}
      <text x="180" y="332" fill={P.violetDeep} fontSize="17" fontWeight="600" fontStyle="italic" textAnchor="middle" className="tviz-serif">
        Arriving today, by 6 PM
      </text>
    </VisualFrame>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   Scene 7 — Remember: an open gift box; the details you mention drift in
   as keepsakes, written in Wasi's hand.
   ─────────────────────────────────────────────────────────────────────── */
function RememberVisualizer() {
  const notes = [
    { text: 'Amma loves lilies', x: 92, y: 92, delay: '0s' },
    { text: 'Birthday · Aug 12', x: 246, y: 78, delay: '0.5s' },
    { text: '42 Lake Rd, Kandy', x: 260, y: 148, delay: '0.25s' },
  ];

  return (
    <VisualFrame label="Wasi keeps the details, you keep chatting">
      {/* Handwritten keepsakes drifting toward the box */}
      {notes.map((n) => (
        <g key={n.text}>
          <g className="tviz-float" style={{ animationDelay: n.delay }}>
            <text x={n.x} y={n.y} fill={P.violetDeep} fontSize="13" fontWeight="500" fontStyle="italic" textAnchor="middle" className="tviz-serif">
              {n.text}
            </text>
          </g>
          <path
            d={`M ${n.x} ${n.y + 8} Q ${(n.x + 180) / 2} ${(n.y + 210) / 2 + 16} 180 208`}
            fill="none"
            stroke={P.strokeMid}
            strokeWidth="0.9"
            strokeDasharray="2 5"
          />
          <circle r="2.5" fill={P.goldBright}>
            <animateMotion dur="2.8s" repeatCount="indefinite" path={`M ${n.x} ${n.y + 8} Q ${(n.x + 180) / 2} ${(n.y + 210) / 2 + 16} 180 208`} />
          </circle>
        </g>
      ))}

      {/* The gift box that keeps them */}
      <g>
        {/* Lid, tilted open */}
        <g transform="rotate(-10 128 208)">
          <rect x="116" y="196" width="128" height="18" rx="4" fill={P.paper} stroke={P.violetMid} strokeWidth="1.25" />
          <rect x="172" y="196" width="10" height="18" fill={P.gold} opacity="0.9" />
        </g>
        {/* Bow */}
        <g transform="translate(170, 186) rotate(-10)">
          <path d="M0 0 C-12 -12, -22 -2, -8 4 Z" fill="none" stroke={P.gold} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M0 0 C12 -12, 22 -2, 8 4 Z" fill="none" stroke={P.gold} strokeWidth="1.5" strokeLinejoin="round" />
          <circle cx="0" cy="1" r="2.5" fill={P.gold} />
        </g>
        {/* Body */}
        <rect x="126" y="216" width="108" height="82" rx="6" fill={P.violetLight} stroke={P.violetMid} strokeWidth="1.25" />
        <rect x="174" y="216" width="12" height="82" fill={P.gold} opacity="0.9" />
        <rect x="126" y="216" width="108" height="82" rx="6" fill="none" stroke={P.violetMid} strokeWidth="1.25" />
      </g>

      {/* Wasi minds the box */}
      <foreignObject x="242" y="240" width="52" height="52">
        <div className="flex items-center justify-center w-full h-full tviz-float" style={{ animationDelay: '0.3s' }}>
          <WasiRobotAvatar size={46} />
        </div>
      </foreignObject>
    </VisualFrame>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   Completed — the gift is sealed: gold wax stamp with Wasi
   ─────────────────────────────────────────────────────────────────────── */
function CompletedVisualizer() {
  return (
    <VisualFrame>
      {/* Sealed stamp */}
      <circle cx="180" cy="150" r="58" fill={P.goldSoft} className="tviz-ping" />
      <circle cx="180" cy="150" r="54" fill="none" stroke={P.gold} strokeWidth="1" strokeDasharray="2 5" opacity="0.75" />
      <circle cx="180" cy="150" r="46" fill={P.goldLight} stroke={P.gold} strokeWidth="1.5" />
      <g className="tviz-check" style={{ animationDelay: '0.25s' }}>
        <path d="M162 150 L175 163 L199 137" fill="none" stroke={P.violetDeep} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      <text x="180" y="242" fill={P.violetDeep} fontSize="22" fontWeight="600" fontStyle="italic" textAnchor="middle" className="tviz-serif">
        All wrapped up
      </text>

      <foreignObject x="156" y="258" width="48" height="48">
        <div className="flex items-center justify-center w-full h-full tviz-float">
          <WasiRobotAvatar size={40} />
        </div>
      </foreignObject>
    </VisualFrame>
  );
}
