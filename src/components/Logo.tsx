type LogoProps = {
  size?: number;
  variant?: 'dark' | 'light';
};

export function Logo({ size = 30, variant = 'dark' }: LogoProps) {
  const textColor = variant === 'light' ? '#ffffff' : '#1a1a1a';
  const accentColor = '#ff7a1a';
  const greenColor = '#1ba27a';
  const wordmarkSize = size * 0.6;

  return (
    <svg
      width={size * 5.2}
      height={size}
      viewBox="0 0 156 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="everydaytask"
    >
      {/* Symbol: rounded square with checkmark + subtle tricolour accent */}
      <rect x="0" y="0" width="30" height="30" rx="8" fill="#1a1a1a" />
      {/* Saffron top accent */}
      <rect x="0" y="0" width="30" height="3" rx="8" fill={accentColor} />
      {/* Green bottom accent */}
      <rect x="0" y="27" width="30" height="3" rx="8" fill={greenColor} />
      {/* Checkmark */}
      <path
        d="M8 15.5 L13 20.5 L22 10.5"
        stroke="#ffffff"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Wordmark */}
      <text
        x="38"
        y="21"
        fontFamily="Manrope, system-ui, sans-serif"
        fontSize={wordmarkSize}
        fontWeight="800"
        fill={textColor}
        letterSpacing="-0.03em"
      >
        everyday
        <tspan fill={accentColor}>task</tspan>
      </text>
    </svg>
  );
}

export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 30 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="everydaytask"
    >
      <rect x="0" y="0" width="30" height="30" rx="8" fill="#1a1a1a" />
      <rect x="0" y="0" width="30" height="3" rx="8" fill="#ff7a1a" />
      <rect x="0" y="27" width="30" height="3" rx="8" fill="#1ba27a" />
      <path
        d="M8 15.5 L13 20.5 L22 10.5"
        stroke="#ffffff"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
