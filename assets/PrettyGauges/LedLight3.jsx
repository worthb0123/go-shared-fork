import React from 'react';

const LedLight3 = ({ size = 100, lit = true }) => {
  return (
    <div style={{ display: "inline-block", width: size, aspectRatio: '1 / 1' }}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
        {/* 1. Outer Shadow (Drop shadow on the background) */}
        <circle cx="50" cy="50" r="49" fill="black" opacity="0.6" filter="blur(3px)" />

        {/* 2. Main Bezel Body */}
        {/* Darker, cleaner matte finish */}
        <circle cx="50" cy="50" r="48" fill="url(#led3-bezel-dark)" />
        {/* Subtle bevel light at top left */}
        <path d="M 50 2 A 48 48 0 0 0 50 98 A 48 48 0 0 0 50 2" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.05" />

        {/* 3. Inner Recess Ring (The wide black gap) */}
        <circle cx="50" cy="50" r="36" fill="#000000" />
        
        {/* 4. Recess wall shadow */}
        {/* A subtle gradient stroke inside the recess to show depth */}
        <circle cx="50" cy="50" r="36" fill="none" stroke="#111" strokeWidth="2" opacity="0.5" />

        {/* 5. The Light Sphere */}
        {/* Slightly smaller to leave that black gap */}
        <circle cx="50" cy="50" r="32" fill={lit ? "url(#led3-glow-sphere)" : "url(#led-off-matte)"} />
        {!lit && (
          /* Matte texture overlay */
          <circle cx="50" cy="50" r="32" fill="black" opacity="0.3" filter="url(#led-off-noise)" style={{ mixBlendMode: 'overlay' }} />
        )}

        {/* 6. Glass Reflections */}
        {/* Soft ambient wash - Only when lit or very faint */}
        {lit && (
          <circle cx="50" cy="50" r="32" fill="url(#led3-soft-reflection)" />
        )}
        
        {/* Sharp Top Reflection (The "window" gloss) - Smoother curve */}
        {/* In the reference, the unlit version is FLAT, no gloss reflections */}
        {lit && (
          <>
            <path d="M 25 35 Q 50 15 75 35 Q 50 25 25 35 Z" fill="white" opacity="0.15" filter="blur(1px)" />
            <path d="M 28 34 Q 50 18 72 34 Q 50 28 28 34 Z" fill="white" opacity="0.3" />
          </>
        )}

        {/* 7. Bottom Bounce Light */}
        {lit && (
          <circle cx="50" cy="50" r="30" fill="none" stroke="url(#led2-glass-rim)" strokeWidth="0.5" opacity="0.4" />
        )}
      </svg>
    </div>
  );
};

export default LedLight3;
