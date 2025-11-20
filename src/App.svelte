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

  // Configurable target FPS
  let targetFPS = 60;
  let frameInterval = 1000 / targetFPS;
  $: frameInterval = 1000 / targetFPS;
  let lastRenderTime = 0;
  let pendingUpdates = null;
  let rafId = null;

  // Throttled render loop: Updates store only at target FPS
  function renderLoop(currentTime) {
    if (currentTime - lastRenderTime >= frameInterval && pendingUpdates) {
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
    </div>

    {#if $registers.length === 0}
      <div class="loading">Loading device data...</div>
    {:else}
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

  select {
    padding: 8px 12px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 16px;
    cursor: pointer;
  }

  select:hover {
    border-color: #999;
  }

  select:focus {
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
