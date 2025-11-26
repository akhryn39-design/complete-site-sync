import React from 'react';

interface ASIconProps {
  className?: string;
}

export const ASIcon: React.FC<ASIconProps> = ({ className = "w-6 h-6" }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="asGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 1 }} />
          <stop offset="50%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: 'hsl(var(--secondary))', stopOpacity: 1 }} />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Circular background with gradient */}
      <circle cx="50" cy="50" r="45" fill="url(#asGradient)" opacity="0.15" />
      
      {/* Letter A */}
      <text
        x="30"
        y="70"
        fontFamily="'Inter', system-ui, sans-serif"
        fontSize="48"
        fontWeight="800"
        fill="url(#asGradient)"
        filter="url(#glow)"
        style={{ letterSpacing: '-2px' }}
      >
        A
      </text>
      
      {/* Letter S */}
      <text
        x="55"
        y="70"
        fontFamily="'Inter', system-ui, sans-serif"
        fontSize="48"
        fontWeight="800"
        fill="url(#asGradient)"
        filter="url(#glow)"
        style={{ letterSpacing: '-2px' }}
      >
        S
      </text>
    </svg>
  );
};
