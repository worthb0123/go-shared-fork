<script>
  import { onMount, onDestroy } from 'svelte';
  import { SharedWorkerClient } from '../client.js';
  import CanvasGrid from './CanvasGrid.svelte';
  import CanvasTable from './CanvasTable.svelte';
  import { registers, rawRegisters, registerConfigs } from './stores/registers.js';

  let client = null;
  let error = '';
  let selectedDevice = 1;
  let unsubscribe = null;
  let currentView = 'dashboard'; // 'dashboard' | 'debug'

  let gridHeight = 800;
  let itemSize = 200;
  let gap = 16;
  let registerValues = []; // Store register values by number (array index)
  let rawValues = []; // Store raw values
  let localConfigs = []; // Local mirror of configs for fast access
  let isScrolling = false;
  let scrollOptimization = true;
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

  function updateStores() {
       registers.set(registerValues);
       rawRegisters.set(rawValues);
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
        // Handle Config Update (Object with configs array)
        if (data && data.configs && Array.isArray(data.configs)) {
          const isFirstConfig = localConfigs.length === 0;
          localConfigs = data.configs;
          registerConfigs.set(data.configs);
          
          // Also ensure registerValues is large enough
          if (registerValues.length < localConfigs.length) {
             for (let i = registerValues.length; i < localConfigs.length; i++) {
                 registerValues[i] = 0;
                 rawValues[i] = 0;
             }
          }

          // If this is the first config we've received, the current registerValues 
          // (populated by the initial snapshot or defaults) are raw/unscaled.
          // We need to apply the configuration to them.
          if (isFirstConfig) {
              for (let i = 0; i < registerValues.length; i++) {
                  rawValues[i] = registerValues[i]; // Capture what was there as raw
                  const config = localConfigs[i];
                  if (config) {
                      registerValues[i] = registerValues[i] * config.scale + config.offset;
                  }
              }
          }
          
          updateStores();
          return;
        }

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
                 for (let i = registerValues.length; i <= idx; i++) {
                    registerValues[i] = 0;
                    rawValues[i] = 0;
                 }
              }
              
              // Apply config scale/offset
              rawValues[idx] = val;
              const config = localConfigs[idx];
              if (config) {
                  // Value = RawValue * Scale + Offset
                  registerValues[idx] = val * config.scale + config.offset;
              } else {
                  registerValues[idx] = val;
              }
              
            } else if (opcode === 2) { // Run
              const startIdx = data[ptr] | (data[ptr+1] << 8);
              const count = data[ptr+2];
              ptr += 3;
              
              // Grow array if needed
              if (startIdx + count > registerValues.length) {
                 for (let i = registerValues.length; i < startIdx + count; i++) {
                    registerValues[i] = 0;
                    rawValues[i] = 0;
                 }
              }
              
              for (let i = 0; i < count; i++) {
                const rawVal = data[ptr++];
                const idx = startIdx + i;
                
                rawValues[idx] = rawVal;
                const config = localConfigs[idx];
                if (config) {
                    registerValues[idx] = rawVal * config.scale + config.offset;
                } else {
                    registerValues[idx] = rawVal;
                }
              }
            }
          }
          
          // Trigger Svelte update
          updateStores();
        } 
      } catch (e) {
        console.error('Error processing device data:', e);
      }
    }, targetFPS);
  }

  onMount(async () => {
    try {
      client = new SharedWorkerClient('./worker.js');
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

      <label class="checkbox-label">
        <input type="checkbox" checked={scrollOptimization} on:change={(e) => scrollOptimization = e.currentTarget.checked}>
        Scroll Optimization
      </label>

      <div class="spacer"></div>

      <div class="view-toggle">
        <button class:active={currentView === 'dashboard'} on:click={() => currentView = 'dashboard'}>
          Dashboard
        </button>
        <button class:active={currentView === 'debug'} on:click={() => currentView = 'debug'}>
          Debug
        </button>
      </div>

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
        {#if currentView === 'dashboard'}
          <CanvasGrid
            itemCount={$registers.length}
            itemSize={itemSize}
            gap={gap}
            height={gridHeight}
            data={$registers}
            configs={$registerConfigs}
            scrollOptimization={scrollOptimization}
          />
        {:else}
          <CanvasTable
            height={gridHeight}
            rawData={$rawRegisters}
            displayData={$registers}
            configs={$registerConfigs}
            scrollOptimization={scrollOptimization}
          />
        {/if}
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
    background-color: #000;
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
    color: #eee;
  }

  p {
    margin: 0 0 16px 0;
    color: #999;
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 16px;
    padding: 16px;
    background: #1a1a1a;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    flex-wrap: wrap;
  }

  label {
    font-weight: 600;
    color: #eee;
  }

  select {
    padding: 8px 12px;
    border: 1px solid #444;
    background: #333;
    color: #eee;
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

  .view-toggle {
    display: flex;
    gap: 1px;
    background: #444;
    border-radius: 4px;
    padding: 2px;
  }

  .view-toggle button {
    background: transparent;
    border: none;
    color: #999;
    padding: 6px 16px;
    cursor: pointer;
    font-weight: 600;
    border-radius: 2px;
    transition: all 0.2s;
  }

  .view-toggle button.active {
    background: #666;
    color: #fff;
  }

  .view-toggle button:hover:not(.active) {
    color: #eee;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    user-select: none;
  }

  .checkbox-label input {
    width: 16px;
    height: 16px;
    cursor: pointer;
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
    background: #000;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    flex: 1;
    min-height: 0;
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
