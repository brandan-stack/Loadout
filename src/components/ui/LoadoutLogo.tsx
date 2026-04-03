interface LoadoutLogoProps {
  /** Width in px — height scales proportionally (viewBox 220×60) */
  width?: number;
  className?: string;
}

export function LoadoutLogo({ width = 176, className = "" }: LoadoutLogoProps) {
  const height = Math.round((width / 220) * 60);
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 220 60"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Loadout"
      role="img"
    >
      <defs>
        <linearGradient id="ll-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
        <filter id="ll-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Icon — rounded square with gradient + glow */}
      <rect x="5" y="10" width="40" height="40" rx="10" fill="url(#ll-grad)" filter="url(#ll-glow)" />

      {/* Cube wireframe */}
      <polygon points="15,25 25,20 35,25 25,30" fill="none" stroke="white" strokeWidth="1.5" opacity="0.9" />
      <polygon points="15,25 25,30 25,40 15,35" fill="none" stroke="white" strokeWidth="1.5" opacity="0.7" />
      <polygon points="35,25 25,30 25,40 35,35" fill="none" stroke="white" strokeWidth="1.5" opacity="0.7" />

      {/* Wordmark */}
      <text
        x="60" y="32"
        fontFamily="'Space Grotesk', Arial, sans-serif"
        fontSize="18"
        fill="white"
        fontWeight="700"
        letterSpacing="1"
      >
        LOADOUT
      </text>

      {/* Tagline */}
      <text
        x="60" y="48"
        fontFamily="'Manrope', Arial, sans-serif"
        fontSize="9.5"
        fill="#94a3b8"
        letterSpacing="1.5"
      >
        FIELD PARTS TRACKING
      </text>
    </svg>
  );
}
