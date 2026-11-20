import React from 'react';

interface FedExLogoProps {
  width?: number;
  customLogo?: string;
}

const FEDEX_DEFAULT_SVG_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg width="260" height="84" viewBox="0 0 260 84" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="260" height="84" fill="transparent"/>
    <text x="12" y="62" font-family="Arial Black, Helvetica Neue, Arial, sans-serif" font-weight="900" font-size="66" letter-spacing="-4.2">
      <tspan fill="#4D148C">Fed</tspan><tspan fill="#FF6600">Ex</tspan>
    </text>
    <text x="235" y="29" font-family="Arial, sans-serif" font-weight="700" font-size="13" fill="#4D148C">&#174;</text>
  </svg>`
)}`;

/**
 * Institutional FedEx logo lockup.
 * Uses a pre-encoded SVG data URI by default so html2canvas PDF/PNG exports
 * render identically with zero cross-origin or font issues, while allowing an
 * optional custom uploaded logo image override.
 */
export const FedExLogo: React.FC<FedExLogoProps> = ({ width = 148, customLogo }) => {
  const height = Math.round(width * (84 / 260));

  if (customLogo) {
    return (
      <div
        style={{
          width: `${width}px`,
          height: `${Math.max(height, 58)}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <img
          src={customLogo}
          alt="FedEx Logo"
          referrerPolicy="no-referrer"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </div>
    );
  }

  return (
    <img
      src={FEDEX_DEFAULT_SVG_URI}
      alt="FedEx Logo"
      width={width}
      height={height}
      style={{
        display: 'block',
        width: `${width}px`,
        height: `${height}px`,
        objectFit: 'contain',
      }}
    />
  );
};
