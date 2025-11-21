import React from 'react';

const LinearGauge2 = ({
  value = 0,
  min = 0,
  max = 100,
  orientation = 'vertical', // 'vertical' or 'horizontal'
  width = 100,
  height = 300,
  colorRanges = []
}) => {
  // Normalize value
  const clampedValue = Math.min(Math.max(value, min), max);
  
  // Check if the current value is inside any color range
  const activeRange = colorRanges.find(r => clampedValue >= r.from && clampedValue <= r.to);
  
  // If we are in a "danger" or "warning" zone, we might want to glow.
  // The prompt suggests lighting up the border with a glow similar to the radial gauges.
  // We'll use the active range's color for the glow.
  const glowColor = activeRange ? activeRange.color : null;
  const glowId = React.useId();

  const isVertical = orientation === 'vertical';

  // Padding for the needle/glow to not get clipped
  const padding = 4; 
  const trackWidth = isVertical ? width - padding * 2 : width - padding * 2;
  const trackHeight = isVertical ? height - padding * 2 : height - padding * 2;

  // Scale function
  const percent = (clampedValue - min) / (max - min);
  
  // Calculate tick marks
  // We'll draw major ticks at 0, 25, 50, 75, 100%
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div style={{ display: 'inline-block', padding: '10px', background: '#1a1a1a', borderRadius: '4px' }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
           {/* Gradient for the track background - metallic/dark look */}
           <linearGradient id="track-gradient-v" x1="0" y1="0" x2="1" y2="0">
             <stop offset="0%" stopColor="#333" />
             <stop offset="20%" stopColor="#111" />
             <stop offset="80%" stopColor="#111" />
             <stop offset="100%" stopColor="#333" />
           </linearGradient>
           
           <linearGradient id="track-gradient-h" x1="0" y1="0" x2="0" y2="1">
             <stop offset="0%" stopColor="#333" />
             <stop offset="20%" stopColor="#111" />
             <stop offset="80%" stopColor="#111" />
             <stop offset="100%" stopColor="#333" />
           </linearGradient>
           
           {/* Glow filter/gradient for the border when active */}
           {glowColor && (
             <filter id={`glow-${glowId}`} x="-50%" y="-50%" width="200%" height="200%">
               <feGaussianBlur stdDeviation="4" result="coloredBlur" />
               <feMerge>
                 <feMergeNode in="coloredBlur" />
                 <feMergeNode in="SourceGraphic" />
               </feMerge>
             </filter>
           )}
        </defs>

        {/* Border Glow - Only visible if value is in a color range */}
        {glowColor && (
          <rect
            x={padding}
            y={padding}
            width={width - padding * 2}
            height={height - padding * 2}
            fill="none"
            stroke={glowColor}
            strokeWidth="3"
            filter={`url(#glow-${glowId})`}
            rx="4"
          />
        )}

        {/* Main Track Background */}
        <rect 
          x={isVertical ? width/2 - 10 : padding + 10} 
          y={isVertical ? padding + 10 : height/2 - 10} 
          width={isVertical ? 20 : width - padding*2 - 20} 
          height={isVertical ? height - padding*2 - 20 : 20} 
          fill={isVertical ? "url(#track-gradient-v)" : "url(#track-gradient-h)"}
          stroke="#444"
          strokeWidth="1"
          rx="2"
        />

        {/* Color Ranges on the track */}
        {colorRanges.map((range, i) => {
           const startPct = Math.max(0, Math.min(1, (range.from - min) / (max - min)));
           const endPct = Math.max(0, Math.min(1, (range.to - min) / (max - min)));
           
           if (isVertical) {
             // Bottom is 0% (y = height - padding - 10)
             // Top is 100% (y = padding + 10)
             const trackTop = padding + 10;
             const trackBottom = height - padding - 10;
             const trackLen = trackBottom - trackTop;
             
             const y = trackBottom - (endPct * trackLen);
             const h = (endPct - startPct) * trackLen;
             
             return (
               <rect 
                 key={i}
                 x={width/2 - 8}
                 y={y}
                 width={16}
                 height={h}
                 fill={range.color}
                 opacity="0.5"
               />
             )
           } else {
             // Left is 0% (x = padding + 10)
             const trackLeft = padding + 10;
             const trackRight = width - padding - 10;
             const trackLen = trackRight - trackLeft;
             
             const x = trackLeft + (startPct * trackLen);
             const w = (endPct - startPct) * trackLen;
             
             return (
               <rect 
                 key={i}
                 x={x}
                 y={height/2 - 8}
                 width={w}
                 height={16}
                 fill={range.color}
                 opacity="0.5"
               />
             )
           }
        })}

        {/* Ticks */}
        {ticks.map(t => {
           if (isVertical) {
             const trackTop = padding + 10;
             const trackBottom = height - padding - 10;
             const y = trackBottom - (t * (trackBottom - trackTop));
             return (
               <line 
                 key={t} 
                 x1={width/2 - 12} y1={y} x2={width/2 + 12} y2={y} 
                 stroke="#666" strokeWidth="1" 
               />
             );
           } else {
             const trackLeft = padding + 10;
             const trackRight = width - padding - 10;
             const x = trackLeft + (t * (trackRight - trackLeft));
             return (
               <line 
                 key={t} 
                 x1={x} y1={height/2 - 12} x2={x} y2={height/2 + 12} 
                 stroke="#666" strokeWidth="1" 
               />
             );
           }
        })}

        {/* Needle */}
        {isVertical ? (
           // Vertical needle: A horizontal bar or pointer moving up/down
           <g transform={`translate(0, ${ (height - padding - 10) - (percent * (height - padding*2 - 20)) })`}>
             {/* Pointer Line */}
             <line x1={width/2 - 18} y1={0} x2={width/2 + 18} y2={0} stroke="white" strokeWidth="2" />
             {/* Glow/Tip */}
             <rect x={width/2 - 20} y={-2} width={40} height={4} fill="white" opacity="0.2" />
           </g>
        ) : (
           // Horizontal needle: A vertical bar or pointer moving left/right
           <g transform={`translate(${ (padding + 10) + (percent * (width - padding*2 - 20)) }, 0)`}>
              <line x1={0} y1={height/2 - 18} x2={0} y2={height/2 + 18} stroke="white" strokeWidth="2" />
              <rect x={-2} y={height/2 - 20} width={4} height={40} fill="white" opacity="0.2" />
           </g>
        )}
      </svg>
    </div>
  );
};

export default LinearGauge2;
