// Shared Worker JavaScript bridge for Go WASM
// This file runs as a shared worker and initializes the Go WASM module

console.log('Shared worker script loaded');

// Load Go WASM runtime - must use importScripts for classic workers
importScripts('./wasm_exec.js');
console.log('wasm_exec.js loaded, Go class available:', typeof Go);

let goInstance = null;
let wasmReady = false;
const pendingConnections = [];

// Load and instantiate the WASM module
async function initWasm() {
  try {
    console.log('Starting WASM initialization');
    
    const go = new Go();
    goInstance = go;
    console.log('Go instance created');
    
    console.log('Fetching WASM');
    const response = await fetch('./worker.wasm');
    const buffer = await response.arrayBuffer();
    console.log('WASM buffer loaded, size:', buffer.byteLength);
    
    console.log('About to instantiate WASM with imports');
    const wasmModule = await WebAssembly.instantiate(buffer, go.importObject);
    console.log('WASM instantiated');
    
    go.run(wasmModule.instance);
    console.log('Go instance running');
    
    wasmReady = true;
    console.log('Worker ready for connections');
    
    // Process any pending connections
    while (pendingConnections.length > 0) {
      const event = pendingConnections.shift();
      console.log('Processing pending connection');
      if (typeof globalThis.goOnConnect === 'function') {
        globalThis.goOnConnect(event);
      }
    }
  } catch (err) {
    console.error('Failed to load WASM module:', err);
    console.error('Error stack:', err.stack);
  }
}

// Initialize WASM immediately
initWasm();

// Set up onconnect handler - this must be set synchronously
// Call Go's onconnect handler when a client connects
onconnect = function(event) {
  console.log('onconnect event fired!', event);
  
  if (wasmReady) {
    console.log('WASM ready, calling goOnConnect');
    if (typeof globalThis.goOnConnect === 'function') {
      globalThis.goOnConnect(event);
    } else {
      console.log('No goOnConnect handler found');
    }
  } else {
    console.log('WASM not ready, queuing connection');
    pendingConnections.push(event);
  }
};

// Export for debugging/testing
if (typeof globalThis !== 'undefined') {
  globalThis.sharedWorker = {
    initialized: true
  };
}
