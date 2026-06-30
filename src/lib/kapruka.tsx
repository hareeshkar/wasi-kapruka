/** Kapruka brand assets — reuse these constants everywhere. */
export const KAPRUKA = {
  /** Transparent logo URL (send-online-logo.png) — no background, fully transparent PNG */
  logo: '/static/image/send-online-logo.png?v3',
  logoAlt: 'Kapruka',
  violet: '#402970',
  violetMid: '#5B3E8A',
  gold: '#C9A84C',
} as const;

export function KaprukaLogo({ className = 'h-6 w-auto', style }: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <img
      src={KAPRUKA.logo}
      alt={KAPRUKA.logoAlt}
      className={className}
      draggable={false}
      style={style}
    />
  );
}
