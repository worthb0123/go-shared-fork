<script>
  import { onMount, onDestroy } from 'svelte';

  export let itemCount = 0;
  export let itemSize = 160;
  export let gap = 16;
  export let height = 800;
  export let data = []; // Array of values
  
  let canvas;
  let ctx;
  let width = 0;
  let scrollTop = 0;
  let rafId;
  
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
    scrollTop = e.target.scrollTop;
    requestRender();
  }

  function handleWheel(e) {
    // Forward wheel events to scroll container if needed
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

  function drawGauge(ctx, x, y, size, value, index) {
    const cx = x + size / 2;
    const cy = y + size / 2;
    const radius = size / 2 - 5; // 5 is half stroke width
    const startAngle = -Math.PI / 2;
    
    // Background Circle
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = colorBg;
    ctx.lineWidth = 10;
    ctx.stroke();

    // Value Arc
    const percentage = Math.max(0, Math.min(100, value));
    const endAngle = startAngle + (2 * Math.PI * (percentage / 100));
    
    let color = colorGreen;
    if (percentage >= 33) color = colorYellow;
    if (percentage >= 66) color = colorRed;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.strokeStyle = color;
    ctx.lineWidth = 10;
    ctx.stroke();

    // Text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Value
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillStyle = colorText;
    ctx.fillText(Math.floor(value), cx, cy);
    
    // Index
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = colorSubText;
    ctx.fillText(`#${index}`, cx, cy + 15);
  }

  function render() {
    if (!ctx || !width) return;
    
    // Clear
    ctx.clearRect(0, 0, width, height);
    
    if (cols < 1) return;

    // Determine visible range
    const startRow = Math.floor(scrollTop / (itemSize + gap));
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
      // Item Y is: (row * (size + gap)) - scrollTop
      
      const x = col * (itemSize + gap) + gap/2; // Center horizontally roughly? or just gap
      // Better centering:
      const totalRowWidth = cols * itemSize + (cols - 1) * gap;
      const marginX = (width - totalRowWidth) / 2;
      const drawX = marginX + col * (itemSize + gap);
      
      const y = row * (itemSize + gap) - scrollTop;
      
      // Optimization: Skip drawing if strictly outside bounds (though loop mostly handles this)
      if (y > height || y + itemSize < 0) continue;

      drawGauge(ctx, drawX, y, itemSize, data[i] ?? 0, i);
    }
  }

  function requestRender() {
    // If already pending, no need? 
    // Actually, for data updates we might want to force it.
    // For now, just call render directly or via RAF?
    // render();
    if (!rafId) {
        rafId = requestAnimationFrame(() => {
            render();
            rafId = null;
        });
    }
  }

  // Reactive render when data changes
  $: if (data && ctx) requestRender();
  $: if (itemCount && ctx) requestRender(); // Re-render if count changes

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
  <div class="scroller" on:scroll={handleScroll} style="height: 100%;">
    <div class="phantom-height" style="height: {totalHeight}px;"></div>
  </div>
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .canvas-container {
    position: relative;
    width: 100%;
    overflow: hidden;
    background: white;
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
