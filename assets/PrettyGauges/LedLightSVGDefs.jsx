import React from 'react';

const LedLightSVGDefs = () => {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        {/* LedLight Common */}
        <linearGradient id="led-bezel-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#333" />
          <stop offset="50%" stopColor="#111" />
          <stop offset="100%" stopColor="#000" />
        </linearGradient>
        
        <linearGradient id="led-inner-shadow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#000" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#333" stopOpacity="0.2" />
        </linearGradient>

        <radialGradient id="led-glow-cyan" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" stopColor="#E0FFFF" /> {/* Almost white center */}
          <stop offset="40%" stopColor="#00FFFF" /> {/* Bright cyan */}
          <stop offset="85%" stopColor="#008B8B" /> {/* Darker cyan edge */}
          <stop offset="100%" stopColor="#004040" /> {/* Dark edge */}
        </radialGradient>
        
        <linearGradient id="led-glass-shine" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity="0.4" />
          <stop offset="50%" stopColor="white" stopOpacity="0.0" />
        </linearGradient>

        {/* OFF State Gradients */}
        <radialGradient id="led-off-glass" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" stopColor="#222" />
          <stop offset="100%" stopColor="#000" />
        </radialGradient>

        <linearGradient id="led-off-matte" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1a1a1a" />
          <stop offset="100%" stopColor="#111111" />
        </linearGradient>
        <filter id="led-off-noise">
           <feTurbulence type="fractalNoise" baseFrequency="1.5" numOctaves="3" stitchTiles="stitch" />
           <feColorMatrix type="saturate" values="0" />
           <feComponentTransfer>
             <feFuncA type="linear" slope="0.05" /> 
           </feComponentTransfer>
           <feComposite operator="in" in2="SourceGraphic" />
        </filter>

        {/* LedLight2 - High Fidelity */}
        <filter id="led2-noise-texture">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.1" /> 
          </feComponentTransfer>
          <feComposite operator="in" in2="SourceGraphic" />
        </filter>

        <linearGradient id="led2-bezel-surface" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2a3035" />
          <stop offset="100%" stopColor="#151a1f" />
        </linearGradient>
        
        <linearGradient id="led2-bezel-chamfer" x1="0%" y1="0%" x2="100%" y2="100%">
           <stop offset="0%" stopColor="#556066" />
           <stop offset="50%" stopColor="#1a2025" />
           <stop offset="100%" stopColor="#05070a" />
        </linearGradient>

        <radialGradient id="led2-recess-shadow" cx="50%" cy="50%" r="50%">
          <stop offset="80%" stopColor="#000" stopOpacity="1" />
          <stop offset="100%" stopColor="#1a2025" stopOpacity="1" />
        </radialGradient>

        <radialGradient id="led2-glow-body" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" stopColor="#ffffff" />      {/* White hot center */}
          <stop offset="25%" stopColor="#aaffff" />     {/* Very light cyan */}
          <stop offset="50%" stopColor="#00ffff" />     {/* Pure cyan */}
          <stop offset="85%" stopColor="#008888" />     {/* Darker teal */}
          <stop offset="100%" stopColor="#002222" />    {/* Deep edge */}
        </radialGradient>

        <linearGradient id="led2-glass-rim" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#00ffff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#004444" stopOpacity="0.5" />
        </linearGradient>

        <linearGradient id="led2-dome-highlight" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity="0.7" />
          <stop offset="15%" stopColor="white" stopOpacity="0.1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>

        <radialGradient id="led2-bottom-bounce" cx="50%" cy="80%" r="60%" fx="50%" fy="80%">
          <stop offset="0%" stopColor="#00ffff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#00ffff" stopOpacity="0" />
        </radialGradient>

        {/* LedLight3 - Photorealistic Refinements */}
        <radialGradient id="led3-glow-sphere" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" stopColor="#f0ffff" />      {/* Soft white center */}
          <stop offset="20%" stopColor="#00ffff" />     {/* Pure cyan */}
          <stop offset="60%" stopColor="#00a0a0" />     {/* Medium teal */}
          <stop offset="85%" stopColor="#003030" />     {/* Dark teal shadow */}
          <stop offset="100%" stopColor="#000505" />    {/* Almost black edge */}
        </radialGradient>

        <linearGradient id="led3-soft-reflection" x1="30%" y1="10%" x2="70%" y2="80%">
          <stop offset="0%" stopColor="white" stopOpacity="0.5" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
        
        <linearGradient id="led3-top-highlight" x1="50%" y1="0%" x2="50%" y2="100%">
           <stop offset="0%" stopColor="white" stopOpacity="0.6" />
           <stop offset="20%" stopColor="white" stopOpacity="0.1" />
           <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>

        <linearGradient id="led3-bezel-dark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#222" />
          <stop offset="100%" stopColor="#080808" />
        </linearGradient>

        {/* LedLight4 - Sharp Chamfer Edge Refinement */}
        <linearGradient id="led4-bezel-sharp" x1="0%" y1="0%" x2="100%" y2="100%">
           <stop offset="0%" stopColor="#333" />
           <stop offset="100%" stopColor="#050505" />
        </linearGradient>

        <radialGradient id="led4-glow-flat" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" stopColor="#ccffff" />    {/* Bright center */}
          <stop offset="60%" stopColor="#00ffff" />   {/* Pure cyan */}
          <stop offset="100%" stopColor="#00cccc" />  {/* Slightly deeper cyan at edge, but still bright */}
        </radialGradient>

        <linearGradient id="led4-edge-highlight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00ffff" stopOpacity="0.5" />
          <stop offset="20%" stopColor="#ffffff" stopOpacity="0.9" /> {/* Hotspot top-left */}
          <stop offset="50%" stopColor="#00ffff" stopOpacity="0.8" />
          <stop offset="80%" stopColor="#008888" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#004444" stopOpacity="0.4" />
        </linearGradient>

      </defs>
    </svg>
  );
}

export default LedLightSVGDefs;
