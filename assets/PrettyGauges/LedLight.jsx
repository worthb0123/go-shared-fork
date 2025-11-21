import React from 'react';

const LedLight = ({ size = 100, lit = true }) => {
  return (
    <div style={{ display: "inline-block", width: size, aspectRatio: '1 / 1' }}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
        {/* Deep Recess Shadow (To make it look sunk in) */}
        <circle cx="50" cy="50" r="49" fill="black" opacity="0.8" filter="blur(2px)" />

        {/* Outer Bezel */}
        <circle cx="50" cy="50" r="48" fill="url(#led-bezel-gradient)" stroke="#050505" strokeWidth="1" />
        
        {/* Inner dark recessed ring */}
        <circle cx="50" cy="50" r="38" fill="#050505" stroke="#333" strokeWidth="0.5" />
        {/* Inner shadow to fake depth */}
        <circle cx="50" cy="50" r="38" fill="url(#led2-recess-shadow)" opacity="0.8" />

        {/* The Light Sphere */}
        <circle cx="50" cy="50" r="30" fill={lit ? "url(#led-glow-cyan)" : "url(#led-off-matte)"} />
        {!lit && (
          /* Matte texture overlay for OFF state */
          <circle cx="50" cy="50" r="30" fill="black" opacity="0.4" filter="url(#led-off-noise)" style={{ mixBlendMode: 'overlay' }} />
        )}

        {/* Inner shadow for the light edge (inset look) */}
        <circle cx="50" cy="50" r="30" fill="none" stroke={lit ? "url(#led-inner-shadow)" : "#000"} strokeWidth="2" opacity={lit ? 1 : 0.5} />

        {/* Glassy Reflection / Highlight - Only show when LIT */}
        {lit && (
          <circle cx="50" cy="50" r="28" fill="url(#led-glass-shine)" />
        )}
      </svg>
    </div>
  );
};

export default LedLight;
