<script>
  import { onMount, onDestroy } from 'svelte';

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
    const baseColor = config.color ?? '#f59e0b'; // Default amber if no color

    // Configuration
    const highlightColor = baseColor; 
    // Reduce scale for internal elements to create clearance
    const innerScale = scale * 0.92; 
    
    // Transform context to gauge top-left to make math easier? 
    // Or just work with offset. Let's work with offset.
    // Actually, translating the context is cleaner.
    ctx.save();
    ctx.translate(x, y);
    
    // --- 1. Background & Rim ---
    // Outer Rim Body
    ctx.beginPath();
    ctx.arc(50 * scale, 50 * scale, 48 * scale, 0, 2 * Math.PI);
    ctx.fillStyle = '#1a1c21'; // Dark background
    ctx.fill();
    
    // Background Glow (Restricted to Gauge Arc)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(50 * scale, 63 * scale); // Pivot
    // Arc from minAngle to maxAngle at a large radius
    ctx.arc(50 * scale, 63 * scale, 60 * scale, startAngleRad, endAngleRad); 
    ctx.closePath();
    ctx.clip(); // Restrict drawing to this wedge

    const gradient = ctx.createRadialGradient(50 * scale, 63 * scale, 10 * scale, 50 * scale, 63 * scale, 45 * scale);
    
    // Convert hex baseColor to rgba for gradient
    // Quick hex to rgb conversion
    let r=245, g=158, b=11;
    if (baseColor.startsWith('#')) {
        const hex = baseColor.substring(1);
        if (hex.length === 6) {
            r = parseInt(hex.substr(0,2), 16);
            g = parseInt(hex.substr(2,2), 16);
            b = parseInt(hex.substr(4,2), 16);
        }
    }
    
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.25)`); // Sharper/Brighter center
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);   // Fade out
    ctx.fillStyle = gradient;
    // Fill a large rect to cover the clipped area
    ctx.fillRect(0, 0, 100 * scale, 100 * scale);
    ctx.restore(); // Remove clip
    
    // Outer "Metallic" Bevel Rim
    // Simulating top-left light source
    const rimGradient = ctx.createLinearGradient(0, 0, 100 * scale, 100 * scale);
    rimGradient.addColorStop(0, '#999'); // Highlight top-left (Lighter)
    rimGradient.addColorStop(0.5, '#222');
    rimGradient.addColorStop(1, '#000'); // Shadow bottom-right
    
    ctx.beginPath();
    ctx.arc(50 * scale, 50 * scale, 48 * scale, 0, 2 * Math.PI);
    ctx.strokeStyle = rimGradient;
    ctx.lineWidth = 2.5 * scale;
    ctx.stroke();

    // Inner Highlight Ring (Colored circle inside the rim)
    ctx.beginPath();
    ctx.arc(50 * scale, 50 * scale, 46 * scale, 0, 2 * Math.PI);
    ctx.strokeStyle = highlightColor;
    ctx.lineWidth = 0.75 * scale; 
    ctx.stroke();

    // --- 2. Active/Warning Range Arcs ---
    // Use innerScale for these to shrink them away from the rim
    const arcR = 35 * innerScale; // Radius for the colored bars
    ctx.lineCap = 'butt';
    ctx.lineWidth = 3 * innerScale;
    
    // Helper to draw arc segment
    function drawRangeArc(startVal, endVal, color) {
        if (startVal >= endVal) return;
        const startRad = getAngle(startVal, minVal, maxVal);
        const endRad = getAngle(endVal, minVal, maxVal);
        ctx.beginPath();
        // Use scaled pivot center
        ctx.arc(50 * scale, 63 * scale, arcR, startRad, endRad);
        ctx.strokeStyle = color;
        ctx.stroke();
    }

    // Draw ranges
    // Low Fault (Min to LowFault)
    if (lowFault > minVal) drawRangeArc(minVal, lowFault, '#ef4444');
    // Low Warn (LowFault to LowWarn)
    if (lowWarn > lowFault) drawRangeArc(lowFault, lowWarn, '#f59e0b');
    
    // High Warn (HighWarn to HighFault)
    if (highFault > highWarn) drawRangeArc(highWarn, highFault, '#f59e0b');
    // High Fault (HighFault to Max)
    if (maxVal > highFault) drawRangeArc(highFault, maxVal, '#ef4444');
    
    // --- 3. Ticks ---
    const gr1 = 28 * innerScale; // Inner radius 
    const gr2 = 32 * innerScale; // Outer radius
    const tickCenter = { x: 50 * scale, y: 63 * scale };
    
    ctx.strokeStyle = '#A9ABAF';
    ctx.lineWidth = 1 * innerScale; 
    
    // Draw major ticks
    // Calculate step based on range
    const range = maxVal - minVal;
    let step = 20;
    if (range <= 10) step = 1;
    else if (range <= 50) step = 5;
    else if (range <= 100) step = 10;
    else step = 20;

    for (let val = minVal; val <= maxVal; val += step) {
        const angle = getAngle(val, minVal, maxVal); // Returns radians
        // wait, getAngle returns radians.
        // existing code expected angle in degrees loop?
        // "for (let ang = minAngle; ang <= maxAngle; ang += 20)"
        // Yes, existing code iterated angles. Now we iterate values.
        
        const x1 = tickCenter.x + gr1 * Math.cos(angle);
        const y1 = tickCenter.y + gr1 * Math.sin(angle);
        const x2 = tickCenter.x + gr2 * Math.cos(angle);
        const y2 = tickCenter.y + gr2 * Math.sin(angle);
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    // --- 4. Labels ---
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#A9ABAF'; 
    
    // Min/Max - positioned relative to the arc start/end
    // Calculate pos based on minAngle/maxAngle radii
    const labelR = 22 * innerScale; // Closer to center
    // Min
    let rad = (minAngle - 90) * Math.PI / 180;
    ctx.font = `${8 * innerScale}px system-ui, sans-serif`;
    ctx.fillText(Math.round(minVal), tickCenter.x + labelR * Math.cos(rad) + 2*scale, tickCenter.y + labelR * Math.sin(rad) - 2*scale);
    // Max
    rad = (maxAngle - 90) * Math.PI / 180;
    ctx.fillText(Math.round(maxVal), tickCenter.x + labelR * Math.cos(rad) - 2*scale, tickCenter.y + labelR * Math.sin(rad) - 2*scale);

    // Value (Main)
    ctx.fillStyle = '#E8E6E7'; 
    ctx.font = `bold ${16 * scale}px system-ui, sans-serif`;
    // Display Value
    let displayValue = value;
    // Format decimal if needed
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

    // --- 5. Needle ---
    const needleAng = getAngle(value, minVal, maxVal);
    const rTip = 35 * innerScale; 
    const rBase = -8 * innerScale; // Tail length
    const baseWidth = 3 * innerScale;
    
    // Needle pivot is at tickCenter (50, 63)
    const nCx = tickCenter.x;
    const nCy = tickCenter.y;

    // Needle Shape
    // Calculate perpendicular offset for base width
    const dx = Math.cos(needleAng);
    const dy = Math.sin(needleAng);
    const pdx = -dy * (baseWidth / 2);
    const pdy = dx * (baseWidth / 2);

    ctx.beginPath();
    // Tip
    ctx.moveTo(nCx + dx * rTip, nCy + dy * rTip);
    // Base Right
    ctx.lineTo(nCx + dx * rBase + pdx, nCy + dy * rBase + pdy);
    // Base Left
    ctx.lineTo(nCx + dx * rBase - pdx, nCy + dy * rBase - pdy);
    ctx.closePath();
    
    ctx.fillStyle = '#E8E6E7'; // White needle
    ctx.fill();

    // Pivot Cap
    ctx.beginPath();
    ctx.arc(nCx, nCy, 6 * innerScale, 0, 2 * Math.PI);
    ctx.fillStyle = '#0a0a0a'; // Black center
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1 * innerScale;
    ctx.stroke();

    ctx.restore();
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
