import React from 'react';

interface LogoProps {
  className?: string;
  iconSize?: 'sm' | 'md' | 'lg' | number;
  showText?: boolean;
  textSize?: string;
  glow?: boolean;
  textColor?: string;
}

export default function Logo({
  className = '',
  iconSize = 'md',
  showText = true,
  textSize = 'text-xl',
  glow = true,
  textColor = 'text-[#00e5c6]'
}: LogoProps) {
  
  // Map friendly size labels to precise dimensions
  let width = 32;
  let height = 24;
  
  if (typeof iconSize === 'number') {
    width = iconSize;
    height = Math.round(iconSize * 0.75);
  } else {
    switch (iconSize) {
      case 'sm':
        width = 24;
        height = 18;
        break;
      case 'lg':
        width = 44;
        height = 33;
        break;
      case 'md':
      default:
        width = 32;
        height = 24;
        break;
    }
  }

  // The premium bright turquoise color matching the uploaded logo exactly
  const brandColor = '#00e5c6';

  return (
    <div className={`flex items-center gap-2.5 cursor-pointer select-none ${className}`}>
      {/* Three distinct curved "J" swooshes matching the user's logo precisely */}
      <svg 
        width={width} 
        height={height} 
        viewBox="0 0 48 36" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={glow ? "drop-shadow-[0_0_15px_rgba(0,229,198,0.6)]" : ""}
      >
        {/* J1 Swoosh */}
        <path 
          d="M 8,0 H 19 V 24 Q 19,36 0,36 Q 5.5,31.5 8,24 Z" 
          fill={brandColor} 
        />
        
        {/* J2 Swoosh */}
        <path 
          d="M 22,0 H 33 V 24 Q 33,36 14,36 Q 19.5,31.5 22,24 Z" 
          fill={brandColor} 
        />
        
        {/* J3 Swoosh */}
        <path 
          d="M 36,0 H 47 V 24 Q 47,36 28,36 Q 33.5,31.5 36,24 Z" 
          fill={brandColor} 
        />
      </svg>

      {showText && (
        <span className={`font-display font-semibold ${textSize} tracking-tight ${textColor} ${glow ? 'text-glow-teal' : ''}`}>
          Joamedic
        </span>
      )}
    </div>
  );
}
