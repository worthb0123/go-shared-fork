import React from 'react';

const LedLight4 = ({ size = 100, lit = true }) => {
  return (
    <div style={{ display: "inline-block", width: size, aspectRatio: '1 / 1' }}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
        {/* 1. Mounting Shadow */}
        <circle cx="50" cy="51" r="49" fill="black" opacity="0.8" filter="blur(2px)" />

        {/* 2. Thin Sharp Bezel */}
        <circle cx="50" cy="50" r="48" fill="url(#led4-bezel-sharp)" stroke="#050505" strokeWidth="0.5" />
        
        {/* 3. Dark Recess (Minimal gap for this design, just a thin dark line) */}
        <circle cx="50" cy="50" r="40" fill="black" />

        {/* 4. The Light Disc */}
        {/* The main body fill - Flatter, uniform brightness */}
        <circle cx="50" cy="50" r="38" fill={lit ? "url(#led4-glow-flat)" : "url(#led-off-matte)"} />
        
        {!lit && (
          /* Matte texture for off state */
          <circle cx="50" cy="50" r="38" fill="black" opacity="0.3" filter="url(#led-off-noise)" style={{ mixBlendMode: 'overlay' }} />
        )}

        {/* 5. The Chamfered Edge Highlight */}
        {/* Instead of a glow ring, this is a solid stroke that catches the light */}
        {lit && (
          <circle cx="50" cy="50" r="37.5" fill="none" stroke="url(#led4-edge-highlight)" strokeWidth="2.5" />
        )}
        
        {/* 6. Subtle inner shadow to ground the edge */}
        {lit && (
            <circle cx="50" cy="50" r="36.5" fill="none" stroke="#008888" strokeWidth="1" opacity="0.3" />
        )}

      </svg>
    </div>
  );
};

export default LedLight4;
