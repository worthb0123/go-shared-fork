<script>
  import { onMount } from 'svelte';

  export let height = 800;
  export let rawData = [];
  export let displayData = [];
  export let configs = [];
  
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

  const rowHeight = 30;
  const fontSize = 13;
  const fontFamily = 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace';
  
  $: itemCount = Math.max(rawData.length, displayData.length, configs.length);
  $: totalHeight = itemCount * rowHeight;

  // Column definition
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

  function handleWheel(e) {
    const now = performance.now();
    const dt = now - lastWheelTime;
    lastWheelTime = now;

    if (dt > 50) {
        wheelMomentum = 0;
    }

    wheelMomentum = (wheelMomentum * 0.9) + Math.abs(e.deltaY);

    const threshold = 500;
    
    if (wheelMomentum > threshold) {
        const excess = wheelMomentum - threshold;
        const multiplier = Math.min(excess * 0.02, 50);

        if (multiplier > 1 && scroller) {
             scroller.scrollTop += e.deltaY * multiplier;
        }
    }
  }

  function handleScroll(e) {
    targetScrollTop = e.target.scrollTop;
    requestRender();
  }

  function resize() {
    if (!canvas) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    width = rect.width;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    ctx = canvas.getContext('2d', { alpha: false }); // Optimization
    ctx.scale(dpr, dpr);
    
    requestRender();
  }

  function render() {
    if (!ctx || !width) return;
    
    // Smooth Scroll Interpolation
    let diff = targetScrollTop - renderScrollTop;
    const absDiff = Math.abs(diff);
    let animating = false;

    if (absDiff < 1.0) {
        renderScrollTop = targetScrollTop;
    } else {
        animating = true;

        // 1. Teleport / Catch-up
        // Tightened to ~200px (approx 6-7 rows)
        const catchUpThreshold = 200; 
        if (absDiff > catchUpThreshold) {
            renderScrollTop = targetScrollTop - (Math.sign(diff) * catchUpThreshold);
            diff = targetScrollTop - renderScrollTop;
        }

        // 2. Faster Coasting
        let step = diff * 0.35;
        
        // Anti-Aliasing Correction
        const period = rowHeight;

        // 3. Minimum Velocity Floor
        const minVelocity = period * 0.3; // 30% of row height
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
        
        renderScrollTop += step;
    }

    // Fill Background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    const startRow = Math.max(0, Math.floor(renderScrollTop / rowHeight));
    const visibleRows = Math.ceil(height / rowHeight) + 1;
    const endRow = Math.min(itemCount, startRow + visibleRows);

    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'middle';

    for (let i = startRow; i < endRow; i++) {
      const y = (i * rowHeight) - renderScrollTop;
      
      // Row Background (Alternating)
      if (i % 2 === 1) {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, y, width, rowHeight);
      }

      // Selection/Highlight (optional - maybe hover later)
      
      // Draw Cells
      let x = 10; // Left padding
      
      for (let col of columns) {
        const val = col.get(i);
        
        // Colorize specific columns?
        ctx.fillStyle = '#ccc';
        if (col.name === 'Color' && val !== '-') {
            ctx.fillStyle = val;
        } else if (col.name === 'Final') {
            ctx.fillStyle = '#fff'; // Bright white for value
        }

        // Align
        let drawX = x;
        if (col.align === 'right') {
            drawX = x + col.width - 10; // Right padding inside cell
            ctx.textAlign = 'right';
        } else {
            ctx.textAlign = 'left';
        }

        ctx.fillText(val, drawX, y + rowHeight / 2);
        
        x += col.width;
      }
      
      // Horizontal grid line (subtle)
      ctx.fillStyle = '#222';
      ctx.fillRect(0, y + rowHeight - 1, width, 1);
    }

    if (animating) {
        requestRender();
    }
  }

  function requestRender() {
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

  $: if (rawData && ctx) requestRender();
  $: if (displayData && ctx) requestRender();
  $: if (configs && ctx) requestRender();

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

<div class="table-view" style="height: {height}px;">
  <!-- HTML Header for layout simplicity -->
  <div class="header-row">
    {#each columns as col}
      <div class="header-cell" style="width: {col.width}px; text-align: {col.align};">
        {col.name}
      </div>
    {/each}
  </div>

  <div class="canvas-container">
    <div 
      class="scroller" 
      bind:this={scroller}
      on:scroll={handleScroll}
      on:wheel|passive={handleWheel}
    >
        <div class="phantom-height" style="height: {totalHeight}px;"></div>
    </div>
    <canvas bind:this={canvas}></canvas>
  </div>
</div>

<style>
  .table-view {
    display: flex;
    flex-direction: column;
    background: #000;
    border: 1px solid #333;
    border-radius: 4px;
    overflow: hidden;
  }

  .header-row {
    display: flex;
    background: #222;
    border-bottom: 1px solid #444;
    padding-left: 10px; /* Match canvas padding */
    flex-shrink: 0;
    height: 30px;
    align-items: center;
  }

  .header-cell {
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 12px;
    font-weight: bold;
    color: #999;
    padding: 0 5px;
    box-sizing: border-box;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .canvas-container {
    flex: 1;
    position: relative;
    overflow: hidden;
    background: #000;
  }

  .scroller {
    overflow-y: auto;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2;
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
    pointer-events: none;
  }
</style>
