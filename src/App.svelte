<script>
  import { onMount, onDestroy } from 'svelte';
  import { SharedWorkerClient } from '../client.js';
  import CanvasGrid from './CanvasGrid.svelte';
  import { registers } from './stores/registers.js';

  let client = null;
  let error = '';
  let selectedDevice = 1;
  let unsubscribe = null;

  let gridHeight = 800;
  let itemSize = 160;
  let gap = 16;
  let registerValues = []; // Store register values by number (array index)
  let isScrolling = false;
  // let scrollTimeout = null;
  // let scrollTimeoutMs = 300;
  // let lastScrollPosition = 0;
  // let scrollCheckInterval = null;
  // let isPointerDown = false;

  // Configurable target FPS
  let targetFPS = 60;
  let frameInterval = 1000 / targetFPS;
  $: frameInterval = 1000 / targetFPS;
  let lastRenderTime = 0;
  let pendingUpdates = null;
  let rafId = null;

  // Throttled render loop: Updates store only at target FPS
  function renderLoop(currentTime) {
    // Only update store if we have pending updates
    // We don't check isScrolling here because CanvasGrid handles its own scrolling efficiently
    // and updates to the store shouldn't break the scroll interaction on canvas.
    if (pendingUpdates) {
       registers.set(registerValues);
       pendingUpdates = null;
    }
    
    rafId = requestAnimationFrame(renderLoop);
  }

  // Scroll handling logic removed as it's now handled inside CanvasGrid or not needed due to performance

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
        // data is Uint8Array
        if (data instanceof Uint8Array) {
          let ptr = 0;
          while (ptr < data.length) {
            const opcode = data[ptr++];
            if (opcode === 1) { // Pair
              const idx = data[ptr] | (data[ptr+1] << 8);
              const val = data[ptr+2];
              ptr += 3;
              
              // Grow array if needed
              if (idx >= registerValues.length) {
                 for (let i = registerValues.length; i <= idx; i++) registerValues[i] = 0;
              }
              registerValues[idx] = val;
              
            } else if (opcode === 2) { // Run
              const startIdx = data[ptr] | (data[ptr+1] << 8);
              const count = data[ptr+2];
              ptr += 3;
              
              // Grow array if needed
              if (startIdx + count > registerValues.length) {
                 for (let i = registerValues.length; i < startIdx + count; i++) registerValues[i] = 0;
              }
              
              for (let i = 0; i < count; i++) {
                registerValues[startIdx + i] = data[ptr++];
              }
            }
          }
          
          // Trigger Svelte update via renderLoop
          pendingUpdates = true;
        } 
      } catch (e) {
        console.error('Error processing device data:', e);
      }
    }, targetFPS);
  }

  onMount(async () => {
    try {
      client = new SharedWorkerClient('./worker.js');
      // Start render loop
      rafId = requestAnimationFrame(renderLoop);
      // Initial subscribe
      subscribeToDevice(selectedDevice);
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
  });

  $: if (client && selectedDevice && targetFPS) {
    subscribeToDevice(selectedDevice);
  }
</script>

<main>
  <h1>Device Register Monitor</h1>
  <p style="font-size:0.9em; color:#666;">
    Live Data • Throttled @ {targetFPS} FPS • Canvas Rendering
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
        <!-- Higher FPS removed as per 10Hz cap, but keeping in UI if user wants to request it -->
        <option value={15}>15 FPS</option>
        <option value={30}>30 FPS</option>
        <option value={60}>60 FPS</option>
      </select>
    </div>

    {#if $registers.length === 0}
      <div class="loading">Loading device data...</div>
    {:else}
      <div 
        class="grid-wrapper" 
        bind:clientHeight={gridHeight}
      >
        <CanvasGrid
          itemCount={$registers.length}
          itemSize={itemSize}
          gap={gap}
          height={gridHeight}
          data={$registers}
        />
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
    flex: 1;
    min-height: 0;
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
