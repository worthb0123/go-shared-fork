import React, { useMemo } from 'react';

const Gauge = ({
  value = 0,
  min = 0,
  max = 100,
  label = '',
  units = 'PSI',
  size = 200,
  color = '#f59e0b'
}) => {
  // Dimensions
  const strokeWidth = 12;
  const radius = 80; // Internal radius for the arc
  const centerX = 100;
  const centerY = 100; // Semi-circle sits on the bottom half roughly? 
  // "semi-circle ... min on left and max on right" usually means top-half semi-circle.
  // Let's position center at (100, 110) to give room for text below, or (100, 100) and use 180 degree arc.
  // Let's use a 180 degree arc from -180 to 0? Or 180 to 360?
  // Standard gauge: 9 o'clock (min) to 3 o'clock (max) going clockwise.
  // That is 180 degrees.
  
  // SVG ViewBox 0 0 200 200
  
  // Clamp value
  const clampedValue = Math.max(min, Math.min(max, value));
  
  // Calculate percentage (0 to 1)
  const range = max - min;
  const percent = range > 0 ? (clampedValue - min) / range : 0;
  
  // Arc angles (degrees)
  // Min: 180 (Left)
  // Max: 0 (Right) (SVG coordinates: 0 is 3 o'clock, 90 is 6 o'clock)
  // We want Top Half. 
  // 180 (Left) -> 270 (Top) -> 360/0 (Right).
  // So Angle range is 180 to 360.
  
  // Actually, easier to think in standard math angles and convert to SVG path commands.
  // Let's use a helper for path description.
  
  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = (angleInDegrees - 180) * Math.PI / 180.0; 
    // SVG 0 is 3 o'clock. We want min at 9 o'clock (180 deg).
    // But cos(180) = -1. 
    
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  }

  // Let's stick to a simple convention:
  // Min Angle: -180 (Left)
  // Max Angle: 0 (Right)
  // Wait, in SVG coords:
  // 0 deg = 3 o'clock (Right)
  // 180 deg = 9 o'clock (Left)
  // -180 deg = 9 o'clock (Left)
  // -90 deg = 12 o'clock (Top)
  
  // So we want arc from 180 to 360 (or 0).
  const startAngle = 180;
  const endAngle = 360;
  
  // Value Angle
  const valueAngle = startAngle + (percent * (endAngle - startAngle));

  const describeArc = (x, y, radius, startAngle, endAngle) => {
      const start = polarToCartesian(x, y, radius, endAngle);
      const end = polarToCartesian(x, y, radius, startAngle);
      const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
      const d = [
          "M", start.x, start.y, 
          "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
      ].join(" ");
      return d;       
  }

  // Helper specific to our 180->360 coord system where we want to draw from left (180) to right (360)
  // But `describeArc` usually draws from start to end.
  // If start=180, end=360.
  // polar(180) -> (-r, 0)
  // polar(360) -> (r, 0)
  
  const bgPath = useMemo(() => {
      // M -80 0 A 80 80 0 0 1 80 0 (relative to center)
      // Center is 100, 120 (moved down to fit arc in top)
      // Left point: 20, 120
      // Right point: 180, 120
      // Top point: 100, 40
      return `M 20 120 A 80 80 0 0 1 180 120`; 
  }, []);

  const valuePath = useMemo(() => {
      // Calculate end point for value
      // Angle goes from 180 (min) to 360 (max)
      // percent 0 -> 180 deg -> (-1, 0)
      // percent 0.5 -> 270 deg -> (0, -1)
      // percent 1 -> 360 deg -> (1, 0)
      
      const angleRad = (180 + (percent * 180)) * (Math.PI / 180);
      const x = 100 + 80 * Math.cos(angleRad);
      const y = 120 + 80 * Math.sin(angleRad);
      
      // Large arc flag: if percent > 0.5 (more than 90 degrees), use 1, else 0?
      // wait, simple arc logic:
      // From start (20, 120) to (x, y)
      // Radius 80
      // Sweep flag 1 (clockwise)
      
      // If value is min, path is a point or empty.
      if (percent <= 0) return '';
      
      return `M 20 120 A 80 80 0 0 1 ${x} ${y}`;
  }, [percent]);

  // Needle
  // Center 100, 120
  // Tip at angle
  const needleRotation = (percent * 180) - 90; // 0% -> -90deg (points left?), wait.
  // 0% corresponds to 180 deg in our circle math (Left).
  // CSS rotate 0 is usually pointing Up (if using transform) or Right (standard).
  // Let's assume standard right.
  // We want to point Left at 0%. So -180 deg.
  // Right at 100%. So 0 deg.
  // Let's just calculate coordinates for the line.
  
  const needleTipX = 100 + 70 * Math.cos((180 + percent * 180) * Math.PI / 180);
  const needleTipY = 120 + 70 * Math.sin((180 + percent * 180) * Math.PI / 180);

  return (
    <div style={{ width: size, height: size, position: 'relative', color: '#eee' }}>
      <svg width="100%" height="100%" viewBox="0 0 200 200">
        {/* Background Arc */}
        <path 
            d={bgPath} 
            fill="none" 
            stroke="#333" 
            strokeWidth={strokeWidth} 
            strokeLinecap="round" 
        />
        
        {/* Value Arc */}
        <path 
            d={valuePath} 
            fill="none" 
            stroke={color} 
            strokeWidth={strokeWidth} 
            strokeLinecap="round" 
        />

        {/* Ticks? Simple ones. */}
        {/* Min/Max Labels */}
        <text x="20" y="145" textAnchor="middle" fill="#666" fontSize="12" fontFamily="sans-serif">{Math.round(min)}</text>
        <text x="180" y="145" textAnchor="middle" fill="#666" fontSize="12" fontFamily="sans-serif">{Math.round(max)}</text>

        {/* Value Text */}
        <text x="100" y="100" textAnchor="middle" fill="#fff" fontSize="28" fontWeight="bold" fontFamily="sans-serif">
            {value % 1 !== 0 ? value.toFixed(1) : Math.floor(value)}
        </text>
        <text x="100" y="120" textAnchor="middle" fill="#999" fontSize="12" fontFamily="sans-serif">{units}</text>

        {/* Label/ID */}
        <text x="100" y="155" textAnchor="middle" fill="#ccc" fontSize="14" fontWeight="600" fontFamily="sans-serif">{label}</text>
      </svg>
    </div>
  );
};

export default React.memo(Gauge);
