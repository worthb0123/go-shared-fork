<script>
  import { onMount, onDestroy } from 'svelte';
  import { createGaugeAssets } from './gauge-assets.js';

  export let itemCount = 0;
  export let itemSize = 160;
  export let gap = 16;
  export let height = 800;
  export let data = []; // Array of values
  export let configs = []; // Array of config objects
  export let scrollOptimization = true;
  export let tick = 0;
  
  let canvas;
  let ctx;
  let width = 0;
  let targetScrollTop = 0;
  let renderScrollTop = 0;
  let rafId;
  let scroller;
  let sprites;
  
  // Turbo Scroll State
  let wheelMomentum = 0;
  let lastWheelTime = 0;

  // Calculated layout
  $: cols = Math.floor((width + gap) / (itemSize + gap));
  $: rows = Math.ceil(itemCount / cols);
  $: totalHeight = rows * (itemSize + gap);
  
  // Colors for gauge
  const colorGreen = '#10b981';
  const colorYellow = '#f59e0b';
  const colorRed = '#ef4444';
  const colorBg = '#e5e7eb';
  const colorText = '#000000';
  const colorSubText = '#6b7280';

  function handleScroll(e) {
    targetScrollTop = e.target.scrollTop;
    requestRender();
  }

  function handleWheel(e) {
    // Turbo Scroll: Detect rapid wheel movement and exaggerate scrolling
    // Only enabled when optimizations are on
    if (!scrollOptimization) return;

    const now = performance.now();
    const dt = now - lastWheelTime;
    lastWheelTime = now;

    // Decay momentum: If user pauses or slows down (>50ms between ticks), reset
    if (dt > 50) {
        wheelMomentum = 0;
    }

    // Accumulate momentum (Simple Moving Average-ish)
    // We decay existing momentum slightly and add new impulse
    wheelMomentum = (wheelMomentum * 0.9) + Math.abs(e.deltaY);

    // Threshold for engaging "Turbo Mode"
    // Typical scroll click is ~100px. Fast spinning generates high frequency events.
    // A steady accumulation > 500 indicates intentional rapid scrolling.
    const threshold = 500;
    
    if (wheelMomentum > threshold) {
        // Calculate multiplier based on excess momentum
        // Scale down the excess to a reasonable multiplier (e.g. 0.02)
        const excess = wheelMomentum - threshold;
        const multiplier = excess * 0.02;
        
        // Safety Cap: Don't let it go infinitely crazy (max 50x speed)
        const safeMultiplier = Math.min(multiplier, 50);

        if (safeMultiplier > 1 && scroller) {
             // Apply boost directly to scroll position
             // Note: This adds to the browser's native scroll (we don't preventDefault)
             scroller.scrollTop += e.deltaY * safeMultiplier;
        }
    }
  }

  function resize() {
    if (!canvas) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    width = rect.width;
    // Set canvas logical size to match display size (times dpr for crispness)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    
    // Re-generate sprites if scale changed significantly? 
    // For now, just generate them once at high res (e.g. based on itemSize * dpr)
    if (!sprites) {
         sprites = createGaugeAssets(itemSize * dpr); // Generate at native resolution
    }
    
    requestRender();
  }

  // Gauge constants
  const minAngle = -100;
  const maxAngle = 100;
  const startAngleRad = (minAngle - 90) * Math.PI / 180;
  const endAngleRad = (maxAngle - 90) * Math.PI / 180;
  
  // Helper to map value to angle
  function getAngle(value, min, max) {
    const ratio = (value - min) / (max - min);
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    return ((clampedRatio * (maxAngle - minAngle)) + minAngle - 90) * Math.PI / 180;
  }

  function drawGauge(ctx, x, y, size, value, index) {
    const cx = x + size / 2;
    const cy = y + size / 2;
    // Scale internal drawing to match the 100x100 coordinate system of the SVG
    const scale = size / 100;
    
    // Get config or defaults
    const config = configs[index] || {};
    const minVal = config.displayMin ?? 0;
    const maxVal = config.displayMax ?? 100;
    const lowWarn = config.lowWarn ?? 10;
    const highWarn = config.highWarn ?? 90;
    const lowFault = config.lowFault ?? 5;
    const highFault = config.highFault ?? 95;
    const labelText = config.label || "TEMP"; // Need label

    // Configuration
    // Reduce scale for internal elements to create clearance
    // The sprites are designed for 100x100 fit. 
    // The background sprite is 200x200 (or whatever generated).
    // We draw it into size x size.
    
    // --- Color Theme Selection ---
    const themeIndex = index % 3;
    let activeColor;
    if (themeIndex === 0) activeColor = '#ef4444'; // Red
    else if (themeIndex === 1) activeColor = '#d946ef'; // Purple
    else activeColor = '#10b981'; // Green

    // Determine Active State Color (for Glow/Leds/Arcs)
    let stateColor = null;
    if (value >= highFault || value <= lowFault) stateColor = activeColor; // Fault
    else if (value >= highWarn || value <= lowWarn) stateColor = config.color || '#f59e0b'; // Warn
    
    // For the React component logic:
    // "activeColorRange" logic matches ranges. 
    // Here we simplify: if we are in a warn/fault zone, we light up.
    
    // --- 1. Background (Cached Sprite) ---
    if (sprites) {
        ctx.drawImage(sprites.background, x, y, size, size);
    }

    // --- 2. Corner LEDs (Active State) ---
    // Sprite has "off" state. If active, we draw "on" state on top.
    if (stateColor) {
        // Helper to draw active LED
        const drawActiveLed = (lx, ly) => {
             const px = x + lx * scale;
             const py = y + ly * scale;
             ctx.beginPath();
             ctx.arc(px, py, 3.2 * scale, 0, Math.PI*2);
             ctx.fillStyle = stateColor;
             ctx.fill();
             
             // Glossy overlay (simple white alpha)
             const grad = ctx.createRadialGradient(px-1*scale, py-1*scale, 0, px, py, 3.2*scale);
             grad.addColorStop(0, 'rgba(255,255,255,0.4)');
             grad.addColorStop(1, 'rgba(255,255,255,0)');
             ctx.fillStyle = grad;
             ctx.fill();
        };
        drawActiveLed(10, 10);
        drawActiveLed(90, 10);
        drawActiveLed(90, 90);
        drawActiveLed(10, 90);
        
        // --- Glow Effect (Behind ticks) ---
        // React uses a radial gradient in defs for glow.
        // We can draw it here on top of background but behind text.
        // cx=50 cy=63 r=31
        ctx.save();
        ctx.globalAlpha = 0.5;
        const gcx = x + 50 * scale;
        const gcy = y + 63 * scale;
        const gr = 31 * scale;
        const glow = ctx.createRadialGradient(gcx, gcy, 0, gcx, gcy, gr);
        glow.addColorStop(0, stateColor);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        
        // Clip to arc range? React does: 
        // <path d={describeArcPath...} fill={`url(#${glowId})`} />
        // It draws the glow ONLY inside the min/max angle arc.
        
        const startRad = (minAngle - 90) * Math.PI / 180;
        const endRad = (maxAngle - 90) * Math.PI / 180;
        
        ctx.beginPath();
        ctx.moveTo(gcx, gcy);
        ctx.arc(gcx, gcy, gr, startRad, endRad);
        ctx.closePath();
        ctx.fillStyle = glow;
        ctx.fill();
        ctx.restore();
    }

    // --- 3. Active Range Arcs ---
    // Draw the colored segments
    // React maps `colorRanges`. We infer them from lowWarn/HighWarn etc.
    // Geometry: gcx=50, gcy=63, gr1=27, gr2=31.
    const gcx = x + 50 * scale;
    const gcy = y + 63 * scale;
    const gr1 = 27 * scale;
    const gr2 = 31 * scale;
    const midR = (gr1 + gr2) / 2;
    const widthR = gr2 - gr1;

    ctx.lineCap = 'butt';
    ctx.lineWidth = widthR;
    
    function drawArcSeg(v1, v2, c) {
        if (v1 >= v2) return;
        const a1 = getAngle(v1, minVal, maxVal);
        const a2 = getAngle(v2, minVal, maxVal);
        ctx.beginPath();
        ctx.arc(gcx, gcy, midR, a1, a2);
        ctx.strokeStyle = c;
        ctx.stroke();
    }

    if (lowFault > minVal) drawArcSeg(minVal, lowFault, '#ef4444');
    if (lowWarn > lowFault) drawArcSeg(lowFault, lowWarn, '#f59e0b');
    if (highFault > highWarn) drawArcSeg(highWarn, highFault, '#f59e0b');
    if (maxVal > highFault) drawArcSeg(highFault, maxVal, '#ef4444');

    // --- 4. Text ---
    ctx.textAlign = 'center';
    
    // Min/Max
    ctx.font = `${6 * scale}px system-ui, sans-serif`;
    ctx.fillStyle = '#A9ABAF';
    ctx.fillText(Math.round(minVal), x + 24.5 * scale, y + 71 * scale);
    ctx.fillText(Math.round(maxVal), x + 75.5 * scale, y + 71 * scale);

    // Label (Top)
    // Split lines if needed (simple approach here)
    ctx.font = `bold ${10 * scale}px system-ui, sans-serif`;
    ctx.fillStyle = '#E8E6E7';
    // Use ID/Title if available or generic
    const title = `#${index + 1}`; 
    ctx.fillText(title, x + 50 * scale, y + 28 * scale);

    // Value (Bottom)
    ctx.font = `bold ${10 * scale}px system-ui, sans-serif`;
    ctx.fillStyle = '#A9ABAF';
    const valStr = Math.abs(value) < 10 && value % 1 !== 0 ? value.toFixed(1) : Math.floor(value).toString();
    ctx.fillText(valStr, x + 50 * scale, y + 79 * scale);

    // Units
    ctx.font = `bold ${6 * scale}px system-ui, sans-serif`;
    ctx.fillText('PSI', x + 50 * scale, y + 86 * scale);

    // --- 5. Needle (Rotated Sprite) ---
    if (sprites) {
        const needleAng = getAngle(value, minVal, maxVal);
        // Needle is pivoted at 50,63 (gcx, gcy)
        // Sprite is drawn at 0 degrees (UP) centered at 50,50.
        // We need to translate to pivot, rotate, then draw sprite such that its pivot matches.
        // Sprite Pivot: 50, 50.
        // Target Pivot: gcx, gcy.
        
        ctx.save();
        ctx.translate(gcx, gcy);
        ctx.rotate(needleAng); // needleAng is radians, 0 is RIGHT usually.
        // getAngle returns radians where 0 is Right. 
        // Our sprite is drawn UP (angle -90).
        // So we need to rotate by (needleAng + 90 deg).
        ctx.rotate(90 * Math.PI / 180); 
        
        // Draw sprite centered
        ctx.drawImage(sprites.needle, -size/2, -size/2, size, size);
        ctx.restore();
    }

    // --- 6. Glass Overlay (Cached Sprite) ---
    if (sprites) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.drawImage(sprites.glass, x, y, size, size);
        ctx.restore();
    }
  }

  function render() {
    if (!ctx || !width) return;
    
    // Smooth Scroll Interpolation
    let diff = targetScrollTop - renderScrollTop;
    const absDiff = Math.abs(diff);
    let animating = false;
    
    if (scrollOptimization) {
        // --- Optimized Physics ---
        // If very close, snap to finish
        if (absDiff < 1.0) {
            renderScrollTop = targetScrollTop;
        } else {
            animating = true;
            
            // Anti-Aliasing / Wagon Wheel Effect Correction
            const period = itemSize + gap;

            // 1. Large Discrepancy Teleport (Catch-up)
            // Reduced threshold significantly (2500 -> 600) to keep the view tight to the scrollbar.
            // This prevents the "waiting for 10 rows" feeling.
            const catchUpThreshold = 600; 
            if (absDiff > catchUpThreshold) {
                renderScrollTop = targetScrollTop - (Math.sign(diff) * catchUpThreshold);
                diff = targetScrollTop - renderScrollTop; // Recalculate diff
            }
            
            // 2. Base Lerp (Coasting Speed)
            // Increased to 0.35 for very snappy settling
            let step = diff * 0.35;
            
            // 3. Minimum Velocity Floor (Linear Finish)
            // Increased floor to ~20% of row height.
            // This ensures we hit the target with momentum and stop abruptly.
            const minVelocity = period * 0.2; 
            if (Math.abs(step) < minVelocity) {
                step = Math.sign(diff) * minVelocity;
                // Prevent overshoot if we are closer than minVelocity
                if (Math.abs(step) > Math.abs(diff)) {
                    step = diff;
                }
            }
            
            // Only apply correction if we are moving fast enough for aliasing to matter (> 1/2 period)
            if (Math.abs(step) > period * 0.5) {
                const turns = step / period;
                const nearestTurn = Math.round(turns);
                const remainder = step - (nearestTurn * period);
                
                // Check if we are in the "Forbidden Zone" (Aliasing or Stroboscopic Freeze)
                const isAliasing = Math.sign(remainder) !== Math.sign(step);
                const isFreezing = Math.abs(remainder) < period * 0.15; // 15% buffer
                
                if (isAliasing || isFreezing) {
                    // Boost speed to the next "Safe Zone" (e.g. 1.2x Period)
                    const safeBuffer = period * 0.25; 
                    step = (nearestTurn * period) + (Math.sign(step) * safeBuffer);
                }
            }
        
            renderScrollTop += step;
        }
    } else {
        // --- Unoptimized Physics (Standard Lerp) ---
        // This allows reproducing the "Wagon Wheel" effect
        if (absDiff < 0.5) {
            renderScrollTop = targetScrollTop;
        } else {
            animating = true;
            // Use the slower lerp (0.15) that caused the issue originally
            renderScrollTop += diff * 0.15;
        }
    }

    // Clear
    ctx.clearRect(0, 0, width, height);
    
    if (cols < 1) return;

    // Determine visible range using renderScrollTop
    const startRow = Math.max(0, Math.floor(renderScrollTop / (itemSize + gap)));
    const visibleRows = Math.ceil(height / (itemSize + gap)) + 1;
    const endRow = Math.min(rows, startRow + visibleRows);
    
    const startIndex = startRow * cols;
    const endIndex = Math.min(itemCount, endRow * cols);

    // Draw visible items
    for (let i = startIndex; i < endIndex; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      
      // Calculate local position relative to scroll
      // We draw relative to the canvas (0,0 is top-left of viewport)
      // Item Y is: (row * (size + gap)) - renderScrollTop
      
      const x = col * (itemSize + gap) + gap/2; // Center horizontally roughly? or just gap
      // Better centering:
      const totalRowWidth = cols * itemSize + (cols - 1) * gap;
      const marginX = (width - totalRowWidth) / 2;
      const drawX = marginX + col * (itemSize + gap);
      
      const y = row * (itemSize + gap) - renderScrollTop;
      
      // Optimization: Skip drawing if strictly outside bounds (though loop mostly handles this)
      if (y > height || y + itemSize < 0) continue;

      drawGauge(ctx, drawX, y, itemSize, data[i] ?? 0, i);
    }

    if (animating) {
        requestRender(); // Keep animating until settled
    }
  }

  function requestRender() {
    // If already pending, no need? 
    // Actually, for data updates we might want to force it.
    // For now, just call render directly or via RAF?
    // render();
    if (!rafId) {
        rafId = requestAnimationFrame(() => {
            rafId = null;
            try {
                render();
            } catch (e) {
                console.error('Render error:', e);
            }
        });
    }
  }

  // Reactive render when data changes
  $: if (data && ctx && tick >= 0) requestRender();
  $: if (itemCount && ctx) requestRender(); // Re-render if count changes
  $: if (configs && ctx) requestRender(); // Re-render if configs change

  onMount(() => {
    // Sprites generated in resize or on demand
    
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas.parentElement);
    resize();
    
    return () => {
      resizeObserver.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  });
</script>

<div class="canvas-container" style="height: {height}px;">
  <!-- We need a scrollable element to capture scroll events and creating the 'height' -->
  <div 
    class="scroller" 
    bind:this={scroller}
    on:scroll={handleScroll} 
    on:wheel|passive={handleWheel}
    style="height: 100%;"
  >
    <div class="phantom-height" style="height: {totalHeight}px;"></div>
  </div>
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .canvas-container {
    position: relative;
    width: 100%;
    overflow: hidden;
    background: #000;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .scroller {
    overflow-y: auto;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    z-index: 2; /* Scrollbar on top */
  }

  .phantom-height {
    width: 1px;
    opacity: 0;
  }

  canvas {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
    pointer-events: none; /* Let clicks pass through to scroller */
  }
</style>
