import React, { useEffect, useRef, useMemo } from 'react';
import './CanvasGrid.css';

const CanvasGrid = ({
  itemCount = 0,
  itemSize = 160,
  gap = 16,
  height = 800,
  data = [],
  configs = [],
  scrollOptimization = true,
  tick = 0
}) => {
  const canvasRef = useRef(null);
  const scrollerRef = useRef(null);
  const requestRef = useRef(null);
  
  // State stored in refs to avoid re-renders/stale closures in RAF
  const stateRef = useRef({
    width: 0,
    targetScrollTop: 0,
    renderScrollTop: 0,
    wheelMomentum: 0,
    lastWheelTime: 0,
    ctx: null
  });

  // Calculated layout
  // We need these in the render loop, so maybe calc them there or update refs?
  // Or just calc on fly. `width` changes on resize.
  // Let's use refs for layout params that change
  
  const handleScroll = (e) => {
    stateRef.current.targetScrollTop = e.target.scrollTop;
    requestRender();
  };

  const handleWheel = (e) => {
    if (!scrollOptimization) return;

    const now = performance.now();
    const dt = now - stateRef.current.lastWheelTime;
    stateRef.current.lastWheelTime = now;

    if (dt > 50) {
        stateRef.current.wheelMomentum = 0;
    }

    stateRef.current.wheelMomentum = (stateRef.current.wheelMomentum * 0.9) + Math.abs(e.deltaY);

    const threshold = 500;
    
    if (stateRef.current.wheelMomentum > threshold) {
        const excess = stateRef.current.wheelMomentum - threshold;
        const multiplier = Math.min(excess * 0.02, 50); // Safety Cap (max 50x speed)

        if (multiplier > 1 && scrollerRef.current) {
             scrollerRef.current.scrollTop += e.deltaY * multiplier;
        }
    }
  };

  const resize = () => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.parentElement.getBoundingClientRect();
    const width = rect.width;
    stateRef.current.width = width;
    
    const dpr = window.devicePixelRatio || 1;
    canvasRef.current.width = width * dpr;
    canvasRef.current.height = height * dpr;
    canvasRef.current.style.width = `${width}px`;
    canvasRef.current.style.height = `${height}px`;
    
    const ctx = canvasRef.current.getContext('2d');
    ctx.scale(dpr, dpr);
    stateRef.current.ctx = ctx;
    
    requestRender();
  };

  const requestRender = () => {
    if (!requestRef.current) {
      requestRef.current = requestAnimationFrame(() => {
        requestRef.current = null;
        render();
      });
    }
  };

  // Render Loop
  const render = () => {
    const { ctx, width, targetScrollTop, renderScrollTop } = stateRef.current;
    if (!ctx || !width) return;

    // Smooth Scroll Interpolation
    let diff = targetScrollTop - renderScrollTop;
    const absDiff = Math.abs(diff);
    let animating = false;
    let newRenderScrollTop = renderScrollTop;

    if (scrollOptimization) {
        if (absDiff < 1.0) {
            newRenderScrollTop = targetScrollTop;
        } else {
            animating = true;
            const catchUpThreshold = 600; 
            if (absDiff > catchUpThreshold) {
                newRenderScrollTop = targetScrollTop - (Math.sign(diff) * catchUpThreshold);
                diff = targetScrollTop - newRenderScrollTop;
            }
            
            let step = diff * 0.35;
            const period = itemSize + gap;
            const minVelocity = period * 0.2; 
            if (Math.abs(step) < minVelocity) {
                step = Math.sign(diff) * minVelocity;
                if (Math.abs(step) > Math.abs(diff)) {
                    step = diff;
                }
            }
            
            if (Math.abs(step) > period * 0.5) {
                const turns = step / period;
                const nearestTurn = Math.round(turns);
                const remainder = step - (nearestTurn * period);
                const isAliasing = Math.sign(remainder) !== Math.sign(step);
                const isFreezing = Math.abs(remainder) < period * 0.15;
                
                if (isAliasing || isFreezing) {
                    const safeBuffer = period * 0.25; 
                    step = (nearestTurn * period) + (Math.sign(step) * safeBuffer);
                }
            }
            newRenderScrollTop += step;
        }
    } else {
        if (absDiff < 0.5) {
            newRenderScrollTop = targetScrollTop;
        } else {
            animating = true;
            newRenderScrollTop += diff * 0.15;
        }
    }

    stateRef.current.renderScrollTop = newRenderScrollTop;

    // Clear
    ctx.clearRect(0, 0, width, height);
    
    const cols = Math.floor((width + gap) / (itemSize + gap));
    if (cols < 1) return;
    
    const rows = Math.ceil(itemCount / cols);

    const startRow = Math.max(0, Math.floor(newRenderScrollTop / (itemSize + gap)));
    const visibleRows = Math.ceil(height / (itemSize + gap)) + 1;
    const endRow = Math.min(rows, startRow + visibleRows);
    
    const startIndex = startRow * cols;
    const endIndex = Math.min(itemCount, endRow * cols);

    // Draw visible items
    for (let i = startIndex; i < endIndex; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      
      const totalRowWidth = cols * itemSize + (cols - 1) * gap;
      const marginX = (width - totalRowWidth) / 2;
      const drawX = marginX + col * (itemSize + gap);
      
      const y = row * (itemSize + gap) - newRenderScrollTop;
      
      if (y > height || y + itemSize < 0) continue;

      drawGauge(ctx, drawX, y, itemSize, data[i] ?? 0, i, configs);
    }

    if (animating) {
        requestRender();
    }
  };

  // Drawing Helper
  const drawGauge = (ctx, x, y, size, value, index, configs) => {
    const cx = x + size / 2;
    const cy = y + size / 2;
    const scale = size / 100;
    
    const config = configs[index] || {};
    const minVal = config.displayMin ?? 0;
    const maxVal = config.displayMax ?? 100;
    const lowWarn = config.lowWarn ?? 10;
    const highWarn = config.highWarn ?? 90;
    const lowFault = config.lowFault ?? 5;
    const highFault = config.highFault ?? 95;
    const baseColor = config.color ?? '#f59e0b';

    const highlightColor = baseColor; 
    const innerScale = scale * 0.92; 
    
    ctx.save();
    ctx.translate(x, y);
    
    // Background & Rim
    ctx.beginPath();
    ctx.arc(50 * scale, 50 * scale, 48 * scale, 0, 2 * Math.PI);
    ctx.fillStyle = '#1a1c21';
    ctx.fill();
    
    // Background Glow
    const minAngle = -100;
    const maxAngle = 100;
    const startAngleRad = (minAngle - 90) * Math.PI / 180;
    const endAngleRad = (maxAngle - 90) * Math.PI / 180;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(50 * scale, 63 * scale); 
    ctx.arc(50 * scale, 63 * scale, 60 * scale, startAngleRad, endAngleRad); 
    ctx.closePath();
    ctx.clip(); 

    const gradient = ctx.createRadialGradient(50 * scale, 63 * scale, 10 * scale, 50 * scale, 63 * scale, 45 * scale);
    
    let r=245, g=158, b=11;
    if (baseColor.startsWith('#')) {
        const hex = baseColor.substring(1);
        if (hex.length === 6) {
            r = parseInt(hex.substring(0,2), 16);
            g = parseInt(hex.substring(2,4), 16); // Fix subst index
            b = parseInt(hex.substring(4,6), 16);
        }
    }
    
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.25)`); 
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);   
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 100 * scale, 100 * scale);
    ctx.restore(); 
    
    const rimGradient = ctx.createLinearGradient(0, 0, 100 * scale, 100 * scale);
    rimGradient.addColorStop(0, '#999'); 
    rimGradient.addColorStop(0.5, '#222');
    rimGradient.addColorStop(1, '#000'); 
    
    ctx.beginPath();
    ctx.arc(50 * scale, 50 * scale, 48 * scale, 0, 2 * Math.PI);
    ctx.strokeStyle = rimGradient;
    ctx.lineWidth = 2.5 * scale;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(50 * scale, 50 * scale, 46 * scale, 0, 2 * Math.PI);
    ctx.strokeStyle = highlightColor;
    ctx.lineWidth = 0.75 * scale; 
    ctx.stroke();

    // Active/Warning Range Arcs
    const arcR = 35 * innerScale; 
    ctx.lineCap = 'butt';
    ctx.lineWidth = 3 * innerScale;
    
    const getAngle = (value, min, max) => {
      const ratio = (value - min) / (max - min);
      const clampedRatio = Math.max(0, Math.min(1, ratio));
      return ((clampedRatio * (maxAngle - minAngle)) + minAngle - 90) * Math.PI / 180;
    };

    const drawRangeArc = (startVal, endVal, color) => {
        if (startVal >= endVal) return;
        const startRad = getAngle(startVal, minVal, maxVal);
        const endRad = getAngle(endVal, minVal, maxVal);
        ctx.beginPath();
        ctx.arc(50 * scale, 63 * scale, arcR, startRad, endRad);
        ctx.strokeStyle = color;
        ctx.stroke();
    }

    if (lowFault > minVal) drawRangeArc(minVal, lowFault, '#ef4444');
    if (lowWarn > lowFault) drawRangeArc(lowFault, lowWarn, '#f59e0b');
    if (highFault > highWarn) drawRangeArc(highWarn, highFault, '#f59e0b');
    if (maxVal > highFault) drawRangeArc(highFault, maxVal, '#ef4444');
    
    // Ticks
    const gr1 = 28 * innerScale; 
    const gr2 = 32 * innerScale; 
    const tickCenter = { x: 50 * scale, y: 63 * scale };
    
    ctx.strokeStyle = '#A9ABAF';
    ctx.lineWidth = 1 * innerScale; 
    
    const range = maxVal - minVal;
    let step = 20;
    if (range <= 10) step = 1;
    else if (range <= 50) step = 5;
    else if (range <= 100) step = 10;
    else step = 20;

    for (let val = minVal; val <= maxVal; val += step) {
        const angle = getAngle(val, minVal, maxVal);
        
        const x1 = tickCenter.x + gr1 * Math.cos(angle);
        const y1 = tickCenter.y + gr1 * Math.sin(angle);
        const x2 = tickCenter.x + gr2 * Math.cos(angle);
        const y2 = tickCenter.y + gr2 * Math.sin(angle);
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    // Labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#A9ABAF'; 
    
    const labelR = 22 * innerScale; 
    let rad = (minAngle - 90) * Math.PI / 180;
    ctx.font = `${8 * innerScale}px system-ui, sans-serif`;
    ctx.fillText(Math.round(minVal), tickCenter.x + labelR * Math.cos(rad) + 2*scale, tickCenter.y + labelR * Math.sin(rad) - 2*scale);
    rad = (maxAngle - 90) * Math.PI / 180;
    ctx.fillText(Math.round(maxVal), tickCenter.x + labelR * Math.cos(rad) - 2*scale, tickCenter.y + labelR * Math.sin(rad) - 2*scale);

    // Value (Main)
    ctx.fillStyle = '#E8E6E7'; 
    ctx.font = `bold ${16 * scale}px system-ui, sans-serif`;
    
    const valueStr = (Math.abs(value) < 10 && value % 1 !== 0) ? value.toFixed(1) : Math.floor(value).toString();
    
    ctx.fillText(valueStr, 50 * scale, 75 * scale);
    
    // Units
    ctx.fillStyle = '#A9ABAF';
    ctx.font = `bold ${8 * scale}px system-ui, sans-serif`;
    ctx.fillText('PSI', 50 * scale, 85 * scale);

    // Title
    ctx.fillStyle = '#E8E6E7';
    ctx.font = `bold ${10 * scale}px system-ui, sans-serif`;
    ctx.fillText(`#${index}`, 50 * scale, 22 * scale);

    // Needle
    const needleAng = getAngle(value, minVal, maxVal);
    const rTip = 35 * innerScale; 
    const rBase = -8 * innerScale; 
    const baseWidth = 3 * innerScale;
    
    const nCx = tickCenter.x;
    const nCy = tickCenter.y;

    const dx = Math.cos(needleAng);
    const dy = Math.sin(needleAng);
    const pdx = -dy * (baseWidth / 2);
    const pdy = dx * (baseWidth / 2);

    ctx.beginPath();
    ctx.moveTo(nCx + dx * rTip, nCy + dy * rTip);
    ctx.lineTo(nCx + dx * rBase + pdx, nCy + dy * rBase + pdy);
    ctx.lineTo(nCx + dx * rBase - pdx, nCy + dy * rBase - pdy);
    ctx.closePath();
    
    ctx.fillStyle = '#E8E6E7'; 
    ctx.fill();

    ctx.beginPath();
    ctx.arc(nCx, nCy, 6 * innerScale, 0, 2 * Math.PI);
    ctx.fillStyle = '#0a0a0a'; 
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1 * innerScale;
    ctx.stroke();

    ctx.restore();
  };

  // Resize Observer Effect
  useEffect(() => {
    const resizeObserver = new ResizeObserver(resize);
    if (canvasRef.current) {
      resizeObserver.observe(canvasRef.current.parentElement);
      resize();
    }
    return () => {
      resizeObserver.disconnect();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [height]); // Re-bind if height prop changes

  // Data update triggers render
  useEffect(() => {
    requestRender();
  }, [tick, itemCount, configs, height]);

  // Calculate total height for scroller
  const totalHeight = useMemo(() => {
    if (stateRef.current.width === 0) return 0;
    const cols = Math.floor((stateRef.current.width + gap) / (itemSize + gap));
    if (cols < 1) return 0;
    const rows = Math.ceil(itemCount / cols);
    return rows * (itemSize + gap);
  }, [itemCount, itemSize, gap, stateRef.current.width, tick]); 
  // ^ tick dependency included because width might update? No, width updates via resize. 
  // But totalHeight needs to be updated when width updates. 
  // Since width is in ref, it doesn't trigger memo re-calc unless we have a state.
  // Let's make width a state?
  const [widthState, setWidthState] = React.useState(0);
  // Modify resize to setWidthState
  // Actually, let's just calc totalHeight in render or use a state for it.
  // Or better:
  const cols = widthState > 0 ? Math.floor((widthState + gap) / (itemSize + gap)) : 1;
  const rows = Math.ceil(itemCount / cols);
  const calculatedTotalHeight = rows * (itemSize + gap);

  // Overwrite resize to set widthState
  const resizeWithState = () => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.parentElement.getBoundingClientRect();
      setWidthState(rect.width);
      stateRef.current.width = rect.width;
      
      const dpr = window.devicePixelRatio || 1;
      canvasRef.current.width = rect.width * dpr;
      canvasRef.current.height = height * dpr;
      canvasRef.current.style.width = `${rect.width}px`;
      canvasRef.current.style.height = `${height}px`;
      
      const ctx = canvasRef.current.getContext('2d');
      ctx.scale(dpr, dpr);
      stateRef.current.ctx = ctx;
      
      requestRender();
  };

  // Replace the resize effect
  useEffect(() => {
    const resizeObserver = new ResizeObserver(resizeWithState);
    if (canvasRef.current) {
      resizeObserver.observe(canvasRef.current.parentElement);
      resizeWithState();
    }
    return () => {
      resizeObserver.disconnect();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [height]);

  return (
    <div className="canvas-container" style={{ height: `${height}px` }}>
      <div 
        className="scroller" 
        ref={scrollerRef}
        onScroll={handleScroll} 
        onWheel={handleWheel}
        style={{ height: '100%' }}
      >
        <div className="phantom-height" style={{ height: `${calculatedTotalHeight}px` }}></div>
      </div>
      <canvas ref={canvasRef}></canvas>
    </div>
  );
};

export default CanvasGrid;
