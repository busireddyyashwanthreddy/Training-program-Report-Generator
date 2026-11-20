import React from 'react';

interface MagicBusLogoProps {
  size?: number;
  variant?: 'light' | 'dark';
  className?: string;
}

const TAGLINE = 'Childhood to Livelihood';

// Optical character widths so curved tagline kerning matches real typography
function getCharWeight(ch: string): number {
  if (ch === ' ') return 0.55;
  if ('ijlI'.includes(ch)) return 0.45;
  if ('ft'.includes(ch)) return 0.62;
  if ('r'.includes(ch)) return 0.66;
  if ('C'.includes(ch)) return 1.02;
  if ('dho'.includes(ch)) return 0.94;
  if ('L'.includes(ch)) return 0.82;
  return 0.88;
}

export const MagicBusLogo: React.FC<MagicBusLogoProps> = ({
  size = 86,
  variant = 'light',
  className = '',
}) => {
  const cx = 100;
  const cy = 88;
  const textRadius = 83;
  const taglineColor = variant === 'dark' ? '#E6EEF8' : '#1E2A3A';

  // Distribute characters evenly across bottom arc from 146deg (left) to 34deg (right)
  const chars = TAGLINE.split('');
  const weights = chars.map(getCharWeight);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const startAngle = 146;
  const endAngle = 34;
  const totalSpan = startAngle - endAngle; // 112 deg

  let cumulative = 0;
  const placedChars = chars.map((ch, idx) => {
    const half = weights[idx] / 2;
    const midWeight = cumulative + half;
    cumulative += weights[idx];
    const angleDeg = startAngle - (midWeight / totalWeight) * totalSpan;
    const rad = (angleDeg * Math.PI) / 180;
    const x = cx + textRadius * Math.cos(rad);
    const y = cy + textRadius * Math.sin(rad);
    const rotate = angleDeg - 90;
    return { ch, x, y, rotate, key: `${idx}-${ch}` };
  });

  return (
    <svg
      width={size}
      height={size * (186 / 200)}
      viewBox="0 0 200 186"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Magic Bus India Foundation - Childhood to Livelihood"
    >
      {/* Outer golden yellow circle */}
      <circle cx={cx} cy={cy} r="72" fill="#FFD100" />
      {/* Inner dark ring */}
      <circle cx={cx} cy={cy} r="64.5" stroke="#1C2634" strokeWidth="2.2" fill="none" />

      {/* Stylized Red Magic Bus */}
      <g transform="translate(0, 2)">
        {/* Subtle wheel arch cutouts */}
        <path
          d="M54 48 C54 44.5 56.5 42.5 60 42.5 L117 42.5 C121 42.5 124 45 125.5 49 L128 57.5 L138.5 59.5 C142 60.2 144.5 63 144.5 66.8 L144.5 81.5 C144.5 83.2 143.2 84.5 141.5 84.5 L57 84.5 C55.2 84.5 54 83.2 54 81.5 Z"
          fill="#E11D25"
          stroke="#A81118"
          strokeWidth="1.2"
        />
        {/* Lower bus trim line */}
        <rect x="54.5" y="75.5" width="89.5" height="3.2" fill="#C4141B" />

        {/* 4 White Passenger Windows */}
        <rect x="59" y="48.5" width="11.2" height="12.5" rx="1.8" fill="#FFFFFF" stroke="#B91C1C" strokeWidth="0.6" />
        <rect x="73" y="48.5" width="11.2" height="12.5" rx="1.8" fill="#FFFFFF" stroke="#B91C1C" strokeWidth="0.6" />
        <rect x="87" y="48.5" width="11.2" height="12.5" rx="1.8" fill="#FFFFFF" stroke="#B91C1C" strokeWidth="0.6" />
        <rect x="101" y="48.5" width="11.2" height="12.5" rx="1.8" fill="#FFFFFF" stroke="#B91C1C" strokeWidth="0.6" />

        {/* Folding Passenger Door */}
        <rect x="114.5" y="54.5" width="5.5" height="22" rx="1" fill="#E5E9F0" stroke="#7F1D1D" strokeWidth="0.8" />
        <line x1="117.25" y1="54.5" x2="117.25" y2="76.5" stroke="#94A3B8" strokeWidth="0.7" />

        {/* Front Cab Windshield */}
        <path
          d="M122.2 48.5 L127.8 48.5 L130.5 60.5 L122.2 60.5 Z"
          fill="#FFFFFF"
          stroke="#B91C1C"
          strokeWidth="0.6"
        />

        {/* Headlight & Front Bumper */}
        <rect x="142" y="67" width="3" height="4.5" rx="1" fill="#FEF08A" />
        <rect x="139" y="81.5" width="7.2" height="3.2" rx="1.2" fill="#1C2634" />

        {/* Rear Wheel */}
        <circle cx="71" cy="84" r="9.4" fill="#FFD100" />
        <circle cx="71" cy="84" r="7.8" fill="#182230" />
        <circle cx="71" cy="84" r="3.4" fill="#FFD100" />
        <circle cx="71" cy="84" r="1.4" fill="#182230" />

        {/* Front Wheel */}
        <circle cx="128.5" cy="84" r="9.4" fill="#FFD100" />
        <circle cx="128.5" cy="84" r="7.8" fill="#182230" />
        <circle cx="128.5" cy="84" r="3.4" fill="#FFD100" />
        <circle cx="128.5" cy="84" r="1.4" fill="#182230" />
      </g>

      {/* Bold "Magic Bus" text inside yellow circle */}
      <text
        x={cx}
        y="115"
        textAnchor="middle"
        fill="#16202E"
        fontSize="19.5"
        fontWeight="800"
        letterSpacing="-0.2"
        fontFamily="'Plus Jakarta Sans', 'DM Sans', Arial, sans-serif"
      >
        Magic Bus
      </text>

      {/* Curved "Childhood to Livelihood" along outer lower arc */}
      {placedChars.map(({ ch, x, y, rotate, key }) => (
        <text
          key={key}
          x={x}
          y={y}
          fill={taglineColor}
          fontSize="14.2"
          fontWeight="600"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="'Plus Jakarta Sans', 'DM Sans', Arial, sans-serif"
          transform={`rotate(${rotate.toFixed(2)}, ${x.toFixed(2)}, ${y.toFixed(2)})`}
        >
          {ch}
        </text>
      ))}
    </svg>
  );
};
