interface ClassPulseLogoProps {
  size?: number;
  className?: string;
  /** When true, the trailing dot pulses to suggest a live signal. */
  animated?: boolean;
  /** When true, render as inline mark on a transparent background (no rounded square). */
  inline?: boolean;
}

export default function ClassPulseLogo({
  size = 32,
  className = "",
  animated = false,
  inline = false,
}: ClassPulseLogoProps) {
  const gradId = `cp-bg-${size}`;
  const glowId = `cp-glow-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="ClassPulse AI"
      role="img"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF8C2A" />
          <stop offset="100%" stopColor="#FF6A00" />
        </linearGradient>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {!inline && <rect width="100" height="100" rx="22" fill={`url(#${gradId})`} />}
      <path
        d="M 14 50 H 36 L 42 50 L 46 32 L 54 70 L 58 40 L 64 50 H 86"
        stroke={inline ? "currentColor" : "white"}
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        filter={inline ? undefined : `url(#${glowId})`}
      />
      <circle cx="86" cy="50" r="8" fill={inline ? "currentColor" : "white"} opacity="0.25">
        {animated && (
          <animate
            attributeName="r"
            values="8;14;8"
            dur="1.8s"
            repeatCount="indefinite"
          />
        )}
      </circle>
      <circle cx="86" cy="50" r="3.5" fill={inline ? "currentColor" : "white"} />
    </svg>
  );
}
