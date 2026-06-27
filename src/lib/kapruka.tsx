/** Kapruka brand assets — reuse these constants everywhere. */
export const KAPRUKA = {
  /** Transparent logo URL (send-online-logo.png) — no background, fully transparent PNG */
  logo: '/static/image/send-online-logo.png?v3',
  logoAlt: 'Kapruka',
  violet: '#402970',
  violetMid: '#5B3E8A',
  gold: '#C9A84C',
} as const;

/**
 * Reusable Kapruka logo component.
 * The source PNG is fully transparent — we add a subtle background pill
 * so it reads well on white/light surfaces.
 */
export function KaprukaLogo({ className = 'h-6 w-auto', variant = 'default', style }: {
  className?: string;
  variant?: 'default' | 'light' | 'dark';
  style?: React.CSSProperties;
}) {
  const bgMap = {
    default: 'rgba(64,41,112,0.06)',
    light: 'rgba(255,255,255,0.12)',
    dark: 'rgba(64,41,112,0.10)',
  };

  return (
    <div
      className={`inline-flex items-center rounded-md px-2 py-1 ${className}`}
      style={{ background: bgMap[variant], ...style }}
    >
      <img
        src={KAPRUKA.logo}
        alt={KAPRUKA.logoAlt}
        className="h-full w-auto"
        draggable={false}
      />
    </div>
  );
}
