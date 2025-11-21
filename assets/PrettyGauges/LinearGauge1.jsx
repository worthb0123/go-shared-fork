import React from 'react';

const LinearGauge = ({
  value = 0,
  min = 0,
  max = 100,
  orientation = 'vertical', // 'vertical' or 'horizontal'
  segments = 20,
  width = 100, // Default width/height depends on orientation usually, but we'll use these as bounds
  height = 300,
  gap = 2, // Gap between segments in px
  colorRanges = [
    { from: 0, to: 60, color: '#00FF00' },   // Green
    { from: 60, to: 80, color: '#FFFF00' },  // Yellow
    { from: 80, to: 100, color: '#FF0000' }  // Red
  ]
}) => {
  // Normalize value
  const clampedValue = Math.min(Math.max(value, min), max);
  const range = max - min;

  // Determine layout based on orientation
  const isVertical = orientation === 'vertical';
  
  // We need to calculate the size of each segment
  // Vertical: Stacked from bottom (min) to top (max)
  // Horizontal: Lined up from left (min) to right (max)
  
  const segmentLength = isVertical 
    ? (height - (segments - 1) * gap) / segments
    : (width - (segments - 1) * gap) / segments;
    
  const segmentBreadth = isVertical ? width : height;

  // Generate segments
  const segmentElements = [];
  for (let i = 0; i < segments; i++) {
    // Determine the value range this segment represents
    // For a 0-100 scale with 20 segments, each segment is 5 units.
    // Segment 0: 0-5, Segment 1: 5-10, etc.
    const segmentValueStart = min + (i * range) / segments;
    const segmentValueEnd = min + ((i + 1) * range) / segments;
    
    // Is this segment lit?
    // We light it up if the current value is greater than the *start* of this segment.
    // Alternative: strictly proportional. But for segmented displays, usually it fills up discrete blocks.
    // Let's say if value > segmentValueStart, it's lit.
    const isLit = clampedValue > segmentValueStart;
    
    // Determine color
    // Find the color range that applies to this segment (using its midpoint)
    const segmentMidpoint = (segmentValueStart + segmentValueEnd) / 2;
    const rangeConfig = colorRanges.find(r => segmentMidpoint >= r.from && segmentMidpoint <= r.to);
    
    // Default to White if no range matches (which appears as gray when unlit)
    const baseColor = rangeConfig ? rangeConfig.color : '#FFFFFF';
    
    // Calculate Position
    let x, y, w, h;
    
    if (isVertical) {
      // Bottom is min, Top is max.
      // i=0 is at the bottom.
      // SVG y coordinates start from top.
      // So i=0 should be at y = height - segmentLength
      // i=max should be at y = 0
      
      w = segmentBreadth;
      h = segmentLength;
      x = 0;
      y = height - ((i + 1) * segmentLength + i * gap); 
    } else {
      // Left is min, Right is max.
      w = segmentLength;
      h = segmentBreadth;
      x = i * (segmentLength + gap);
      y = 0;
    }

    // Style for Lit/Unlit
    const fill = isLit ? baseColor : baseColor;
    const opacity = isLit ? 1.0 : 0.2; // Unlit is just dimmer version of the color
    const filter = isLit ? 'url(#glow-filter)' : 'none'; // Optional glow for lit segments

    segmentElements.push(
      <rect
        key={i}
        x={x}
        y={y}
        width={w}
        height={h}
        fill={fill}
        opacity={opacity}
        rx={2} // Rounded corners
        ry={2}
      />
    );
  }

  return (
    <div style={{ display: 'inline-block', padding: '10px', background: '#111', borderRadius: '4px' }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
           {/* Simple glow filter for that LED look */}
          <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        {segmentElements}
      </svg>
    </div>
  );
};

export default LinearGauge;
