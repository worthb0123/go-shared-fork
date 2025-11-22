import React, { useEffect, useRef, useState } from 'react';
import './CanvasTable.css';

const CanvasTable = ({
  height = 800,
  rawData = [],
  displayData = [],
  configs = [],
  scrollOptimization = true,
  tick = 0
}) => {
  const canvasRef = useRef(null);
  const scrollerRef = useRef(null);
  const requestRef = useRef(null);
  
  const stateRef = useRef({
    width: 0,
    targetScrollTop: 0,
    renderScrollTop: 0,
    wheelMomentum: 0,
    lastWheelTime: 0,
    ctx: null
  });

  const [widthState, setWidthState] = useState(0);

  const rowHeight = 30;
  const fontSize = 13;
  const fontFamily = 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace';
  
  const itemCount = Math.max(rawData.length, displayData.length, configs.length);
  const totalHeight = itemCount * rowHeight;

  const columns = [
    { name: 'ID', width: 60, align: 'right', get: (i) => i },
    { name: 'Raw', width: 60, align: 'right', get: (i) => rawData[i] ?? '-' },
    { name: 'Final', width: 80, align: 'right', get: (i) => (displayData[i] !== undefined ? (displayData[i] % 1 !== 0 ? displayData[i].toFixed(1) : displayData[i]) : '-') },
    { name: 'Min', width: 60, align: 'right', get: (i) => configs[i]?.displayMin ?? '-' },
    { name: 'Max', width: 60, align: 'right', get: (i) => configs[i]?.displayMax ?? '-' },
    { name: 'L.Warn', width: 70, align: 'right', get: (i) => configs[i]?.lowWarn !== undefined ? Math.round(configs[i].lowWarn) : '-' },
    { name: 'H.Warn', width: 70, align: 'right', get: (i) => configs[i]?.highWarn !== undefined ? Math.round(configs[i].highWarn) : '-' },
    { name: 'L.Fault', width: 70, align: 'right', get: (i) => configs[i]?.lowFault !== undefined ? Math.round(configs[i].lowFault) : '-' },
    { name: 'H.Fault', width: 70, align: 'right', get: (i) => configs[i]?.highFault !== undefined ? Math.round(configs[i].highFault) : '-' },
    { name: 'Scale', width: 60, align: 'right', get: (i) => configs[i]?.scale?.toFixed(1) ?? '-' },
    { name: 'Offset', width: 60, align: 'right', get: (i) => configs[i]?.offset?.toFixed(1) ?? '-' },
    { name: 'Color', width: 80, align: 'left', get: (i) => configs[i]?.color ?? '-' },
  ];

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
        const multiplier = Math.min(excess * 0.02, 50);

        if (multiplier > 1 && scrollerRef.current) {
             scrollerRef.current.scrollTop += e.deltaY * multiplier;
        }
    }
  };

  const handleScroll = (e) => {
    stateRef.current.targetScrollTop = e.target.scrollTop;
    requestRender();
  };

  const resize = () => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.parentElement.getBoundingClientRect();
    setWidthState(rect.width);
    stateRef.current.width = rect.width;
    
    const dpr = window.devicePixelRatio || 1;
    canvasRef.current.width = rect.width * dpr;
    canvasRef.current.height = height * dpr;
    canvasRef.current.style.width = `${rect.width}px`;
    canvasRef.current.style.height = `${height}px`;
    
    const ctx = canvasRef.current.getContext('2d', { alpha: false });
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
            const catchUpThreshold = 200; 
            if (absDiff > catchUpThreshold) {
                newRenderScrollTop = targetScrollTop - (Math.sign(diff) * catchUpThreshold);
                diff = targetScrollTop - newRenderScrollTop;
            }

            let step = diff * 0.35;
            const period = rowHeight;
            const minVelocity = period * 0.3; 
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

    // Fill Background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    const startRow = Math.max(0, Math.floor(newRenderScrollTop / rowHeight));
    const visibleRows = Math.ceil(height / rowHeight) + 1;
    const endRow = Math.min(itemCount, startRow + visibleRows);

    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'middle';

    for (let i = startRow; i < endRow; i++) {
      const y = (i * rowHeight) - newRenderScrollTop;
      
      // Row Background
      if (i % 2 === 1) {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, y, width, rowHeight);
      }

      let x = 10; 
      
      for (let col of columns) {
        const val = col.get(i);
        
        ctx.fillStyle = '#ccc';
        if (col.name === 'Color' && val !== '-') {
            ctx.fillStyle = val;
        } else if (col.name === 'Final') {
            ctx.fillStyle = '#fff';
        }

        let drawX = x;
        if (col.align === 'right') {
            drawX = x + col.width - 10; 
            ctx.textAlign = 'right';
        } else {
            ctx.textAlign = 'left';
        }

        ctx.fillText(val, drawX, y + rowHeight / 2);
        
        x += col.width;
      }
      
      ctx.fillStyle = '#222';
      ctx.fillRect(0, y + rowHeight - 1, width, 1);
    }

    if (animating) {
        requestRender();
    }
  };

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
  }, [height]);

  useEffect(() => {
    requestRender();
  }, [tick, itemCount, configs, height, rawData, displayData]); // Dependencies for re-render

  return (
    <div className="table-view" style={{ height: `${height}px` }}>
      <div className="header-row">
        {columns.map((col, i) => (
          <div key={i} className="header-cell" style={{ width: `${col.width}px`, textAlign: col.align }}>
            {col.name}
          </div>
        ))}
      </div>

      <div className="canvas-container">
        <div 
          className="scroller" 
          ref={scrollerRef}
          onScroll={handleScroll}
          onWheel={handleWheel}
        >
            <div className="phantom-height" style={{ height: `${totalHeight}px` }}></div>
        </div>
        <canvas ref={canvasRef}></canvas>
      </div>
    </div>
  );
};

export default CanvasTable;
