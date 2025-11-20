<script>
  import { onMount, onDestroy } from 'svelte';
  import { SharedWorkerClient } from '../client.js';
  import RadialGauge from './RadialGauge.svelte';
  import { Grid } from 'svelte-virtual';
  import { registers } from './stores/registers.js';

  let client = null;
  let error = '';
  let selectedDevice = 1;
  let unsubscribe = null;

  let gridHeight = 800;
  let itemSize = 160;
  let gap = 16;
  let registerValues = new Map(); // Store register values by number
  let isScrolling = false;
  let scrollTimeout = null;
  let scrollTimeoutMs = 1500;
  let gridContainerElement = null;
  let lastScrollPosition = 0;
  let scrollCheckInterval = null;
  let isPointerDown = false;

  // Configurable target FPS
  let targetFPS = 60;
  let frameInterval = 1000 / targetFPS;
  $: frameInterval = 1000 / targetFPS;
  let lastRenderTime = 0;
  let pendingUpdates = null;
  let rafId = null;

  // Throttled render loop: Updates store only at target FPS
  function renderLoop(currentTime) {
    if (!isScrolling && currentTime - lastRenderTime >= frameInterval && pendingUpdates) {
      // Update individual register values from changes
      for (const regData of pendingUpdates) {
        registerValues.set(regData.number, regData.value);
      }
      // Update the store with a new array to trigger reactivity
      registers.set(Array.from(registerValues.values()));
      pendingUpdates = null;
      lastRenderTime = currentTime;
    }
    rafId = requestAnimationFrame(renderLoop);
  }

  function handleScroll() {
    isScrolling = true;
    // Clear existing timeout if user is still scrolling
    if (scrollTimeout) clearTimeout(scrollTimeout);
    // Set timeout to detect when scrolling has stopped
    scrollTimeout = setTimeout(() => {
      // Only resume updates if pointer is not down (scrollbar is released)
      if (!isPointerDown) {
        isScrolling = false;
      }
      scrollTimeout = null;
    }, scrollTimeoutMs);
  }

  function handlePointerDown() {
    isPointerDown = true;
    handleScroll(); // Pause updates immediately when pointer down
  }

  function handlePointerUp() {
    isPointerDown = false;
    // If still scrolling, let the timeout resume updates
    // If not scrolling anymore, resume updates immediately
    if (!isScrolling) {
      isScrolling = false;
    }
  }

  function calculateGridHeight() {
    if (!gridContainerElement) return;
    // Get the position of the grid from the top of the viewport
    const rect = gridContainerElement.getBoundingClientRect();
    // Calculate available height: viewport height minus the grid's top position
    // This ensures the grid fits exactly within the remaining viewport
    const availableHeight = window.innerHeight - rect.top;
    // Set grid height to available space (no overflow)
    gridHeight = Math.max(200, availableHeight);
  }

  function handleDeviceChange(event) {
    selectedDevice = parseInt(event.target.value);
    subscribeToDevice(selectedDevice);
  }

  function subscribeToDevice(deviceID) {
    if (!client) return;

    // Unsubscribe from previous device
    if (unsubscribe) {
      unsubscribe();
    }

    const channel = `device_${deviceID}`;

    unsubscribe = client.subscribe(channel, (data) => {
      try {
        // Data is already parsed by client.js
        const deviceData = typeof data === 'string' ? JSON.parse(data) : data;
        pendingUpdates = deviceData.registers;
      } catch (e) {
        console.error('Error processing device data:', e);
      }
    });
  }

  onMount(async () => {
    try {
      client = new SharedWorkerClient('./worker.js');
      // Start render loop
      rafId = requestAnimationFrame(renderLoop);
      // Initial subscribe
      subscribeToDevice(selectedDevice);
      
      // Calculate initial grid height
      setTimeout(() => calculateGridHeight(), 100);
      
      // Set up window resize listener
      const handleWindowResize = () => {
        calculateGridHeight();
      };
      window.addEventListener('resize', handleWindowResize);
      
      return () => {
        window.removeEventListener('resize', handleWindowResize);
      };
    } catch (e) {
      error = 'Failed to initialize shared worker: ' + e.message;
    }
  });

  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe();
    }
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
  });

  $: if (client && selectedDevice) {
    subscribeToDevice(selectedDevice);
  }
</script>

<main>
  <h1>Device Register Monitor</h1>
  <p style="font-size:0.9em; color:#666;">
    Live Data • Throttled @ {targetFPS} FPS • Virtual Scrolling
  </p>

  {#if error}
    <div class="error-banner">{error}</div>
  {/if}

  {#if client}
    <div class="controls">
      <label for="device-select">Select Device:</label>
      <select id="device-select" value={selectedDevice} on:change={handleDeviceChange}>
        <option value={1}>Device 1</option>
        <option value={2}>Device 2</option>
      </select>

      <div class="spacer"></div>

      <label for="fps-select">Target FPS:</label>
      <select id="fps-select" bind:value={targetFPS}>
        <option value={2}>2 FPS</option>
        <option value={4}>4 FPS</option>
        <option value={10}>10 FPS</option>
        <option value={15}>15 FPS</option>
        <option value={30}>30 FPS</option>
        <option value={60}>60 FPS</option>
      </select>

      <label for="scroll-timeout-input">Scroll Pause (ms):</label>
      <input
        id="scroll-timeout-input"
        type="number"
        bind:value={scrollTimeoutMs}
        min="0"
        max="5000"
        step="100"
      />
    </div>

    {#if $registers.length === 0}
      <div class="loading">Loading device data...</div>
    {:else}
      <div 
        class="grid-wrapper" 
        bind:this={gridContainerElement} 
        style="height: {gridHeight}px;"
        on:wheel={handleScroll}
        on:scroll={handleScroll}
      >
        <Grid
          itemCount={$registers.length}
          itemHeight={itemSize + gap}
          itemWidth={itemSize + gap}
          height={gridHeight}
          overscan={2}
        >
          {#snippet item({ index, style })}
            <div class="gauge-wrapper" {style}>
              <RadialGauge
                registerNumber={index}
                value={$registers[index]}
              />
            </div>
          {/snippet}
        </Grid>
      </div>
    {/if}
  {:else}
    <div class="loading">Initializing shared worker...</div>
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: system-ui, -apple-system, sans-serif;
    background-color: #f5f5f5;
  }

  :global(#app) {
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

  main {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 20px;
    overflow: hidden;
  }

  h1 {
    margin: 0 0 8px 0;
    font-size: 28px;
    color: #333;
  }

  p {
    margin: 0 0 16px 0;
    color: #666;
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 16px;
    padding: 16px;
    background: white;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    flex-wrap: wrap;
  }

  label {
    font-weight: 600;
    color: #333;
  }

  select,
  input[type='number'] {
    padding: 8px 12px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 16px;
    cursor: pointer;
  }

  input[type='number'] {
    cursor: text;
    width: 100px;
  }

  select:hover,
  input[type='number']:hover {
    border-color: #999;
  }

  select:focus,
  input[type='number']:focus {
    outline: none;
    border-color: #0066cc;
    box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
  }

  .spacer {
    flex: 1;
  }

  .error-banner {
    background: #f8d7da;
    color: #721c24;
    padding: 12px 16px;
    border-radius: 4px;
    margin-bottom: 16px;
    border: 1px solid #f5c6cb;
  }

  .loading {
    text-align: center;
    color: #666;
    padding: 40px;
    font-size: 16px;
  }

  .grid-wrapper {
    background: white;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .gauge-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  @media (max-width: 768px) {
    main {
      padding: 12px;
    }

    .controls {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
    }

    .spacer {
      display: none;
    }

    label,
    select {
      width: 100%;
    }
  }
</style>
