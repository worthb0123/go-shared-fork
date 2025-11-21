<script>
  import { onMount } from 'svelte';

  export let height = 800;
  export let rawData = [];
  export let displayData = [];
  export let configs = [];
  
  let canvas;
  let ctx;
  let width = 0;
  let scrollTop = 0;
  let rafId;

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

  function handleScroll(e) {
    scrollTop = e.target.scrollTop;
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
    
    // Fill Background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    const startRow = Math.floor(scrollTop / rowHeight);
    const visibleRows = Math.ceil(height / rowHeight) + 1;
    const endRow = Math.min(itemCount, startRow + visibleRows);

    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'middle';

    for (let i = startRow; i < endRow; i++) {
      const y = (i * rowHeight) - scrollTop;
      
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
  }

  function requestRender() {
    if (!rafId) {
        rafId = requestAnimationFrame(() => {
            render();
            rafId = null;
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
    <div class="scroller" on:scroll={handleScroll}>
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
