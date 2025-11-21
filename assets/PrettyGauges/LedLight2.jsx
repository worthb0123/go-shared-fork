import React from 'react';

const LedLight2 = ({ size = 100, lit = true }) => {
  return (
    <div style={{ display: "inline-block", width: size, aspectRatio: '1 / 1' }}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
        {/* 1. Base/Mounting Surface shadow (drop shadow behind the component) */}
        <circle cx="50" cy="52" r="49" fill="black" opacity="0.8" filter="blur(3px)" />

        {/* 2. Main Bezel Body (The dark matte plastic ring) */}
        <circle cx="50" cy="50" r="49" fill="url(#led2-bezel-surface)" />
        {/* Subtle noise overlay for matte texture */}
        <circle cx="50" cy="50" r="49" fill="black" opacity="0.3" filter="url(#led2-noise-texture)" style={{ mixBlendMode: 'overlay' }}/>

        {/* 3. Chamfered Edge (The transition from bezel to the hole) */}
        {/* This creates the 'dip' effect. We use a thick stroke to create the slope */}
        <circle cx="50" cy="50" r="39" fill="none" stroke="url(#led2-bezel-chamfer)" strokeWidth="8" />
        
        {/* 4. The 'Well' / Recess (Deep black hole where the light sits) */}
        <circle cx="50" cy="50" r="36" fill="#000000" />
        {/* Strong inner shadow to really push it back */}
        <circle cx="50" cy="50" r="36" fill="url(#led2-recess-shadow)" />

        {/* 5. The Light Body (The glowing glass or matte plastic) */}
        <circle cx="50" cy="50" r="30" fill={lit ? "url(#led2-glow-body)" : "url(#led-off-matte)"} />
        {!lit && (
          /* Matte texture for off state */
          <circle cx="50" cy="50" r="30" fill="black" opacity="0.3" filter="url(#led-off-noise)" style={{ mixBlendMode: 'overlay' }} />
        )}

        {/* 6. Glass Edge Rim (The sharp ring where glass meets metal) */}
        {lit && (
          <circle cx="50" cy="50" r="29.5" fill="none" stroke="url(#led2-glass-rim)" strokeWidth="1" opacity="0.8" />
        )}

        {/* 7. Inner Shadow (Simulating the glass being set slightly inside or having thickness) */}
        {/* When OFF, we want a very subtle shadow to show it's recessed, but not glossy glass thickness */}
        <circle cx="50" cy="50" r="30" fill="none" stroke="black" strokeWidth={2} opacity={lit ? 0.3 : 0.6} />

        {/* 8. Top Specular Highlight (The dome reflection) - ONLY WHEN LIT */}
        {lit && (
          <ellipse cx="50" cy="28" rx="20" ry="12" fill="url(#led2-dome-highlight)" />
        )}

        {/* 9. Bottom Caustic/Bounce light (Light trapped in the bottom glass curve) - ONLY WHEN LIT */}
        {lit && (
          <circle cx="50" cy="50" r="28" fill="url(#led2-bottom-bounce)" style={{ mixBlendMode: 'screen' }} />
        )}
      </svg>
    </div>
  );
};

export default LedLight2;
