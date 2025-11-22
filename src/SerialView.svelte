<script>
  import { onMount, onDestroy } from 'svelte';

  let supported = false;
  let port = null;
  let reader = null;
  let writer = null;
  let isConnected = false;
  let error = '';
  let ports = [];
  let selectedPortIndex = -1;

  // Modbus Inputs
  let nodeID = 1;
  let functionCode = 3;
  let address = 0;
  let quantity = 1;
  let baudRate = 9600;

  // Data Log
  let logs = [];
  let decodedRegisters = [];

  // CRC16-Modbus Lookup Table (or calc on fly)
  function calcCRC(buffer) {
    let crc = 0xFFFF;
    for (let pos = 0; pos < buffer.length; pos++) {
      crc ^= buffer[pos];
      for (let i = 8; i !== 0; i--) {
        if ((crc & 0x0001) !== 0) {
          crc >>= 1;
          crc ^= 0xA001;
        } else {
          crc >>= 1;
        }
      }
    }
    // Swap bytes for Modbus (Low byte first in wire?)
    // Modbus usually sends Low Byte then High Byte for CRC at end of frame? 
    // Actually standard says: Low Byte first, then High Byte.
    // So if CRC is 0xABCD, send 0xCD then 0xAB.
    return crc;
  }

  onMount(async () => {
    supported = 'serial' in navigator;
    if (supported) {
        // Get previously authorized ports
        ports = await navigator.serial.getPorts();
        if (ports.length > 0) {
            selectedPortIndex = 0;
        }
    }
  });

  onDestroy(async () => {
      if (isConnected) {
          await disconnect();
      }
  });

  async function requestPort() {
    try {
      const newPort = await navigator.serial.requestPort();
      // Refresh ports list
      ports = await navigator.serial.getPorts();
      // Select the new one
      selectedPortIndex = ports.findIndex(p => p === newPort);
    } catch (e) {
      error = e.message;
    }
  }

  async function connect() {
      if (selectedPortIndex < 0) return;
      
      try {
          port = ports[selectedPortIndex];
          await port.open({ baudRate });
          isConnected = true;
          error = '';
          // Note: We do not start a continuous read loop here anymore.
          // We will read only when we expect a response (Master/Slave model).
      } catch (e) {
          error = 'Connection failed: ' + e.message;
      }
  }

  async function disconnect() {
      if (port) {
          // accessing locked stream throws, but we shouldn't be locked if idle
          try {
            await port.close();
          } catch (e) {
            console.error("Error closing port:", e);
            // Sometimes require a reload if stuck
          }
      }
      port = null;
      isConnected = false;
  }

  // Removed continuous readLoop to prevent app freezing and ensure request/response sync

  function handleResponse(data, startAddress) {
      // Log RX
      const hex = Array.from(data).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
      logs = [{ type: 'rx', data: hex, time: new Date().toLocaleTimeString() }, ...logs].slice(0, 50);

      // Decode Modbus Frame
      if (data.length < 3) return;
      
      // [Node][Func][Bytes/Code]...
      const func = data[1];
      
      // Exception
      if (func & 0x80) {
          error = `Modbus Exception: Code ${data[2]}`;
          return;
      }
      
      // Read Holding/Input Registers
      if (func === 3 || func === 4) {
          const byteCount = data[2];
          // Safety check
          if (data.length < 3 + byteCount) return;
          
          const count = byteCount / 2;
          const regs = [];
          for (let i = 0; i < count; i++) {
              const val = (data[3 + i*2] << 8) | data[3 + i*2 + 1];
              regs.push({ address: startAddress + i, value: val });
          }
          decodedRegisters = regs;
      }
  }

  async function transmit() {
      if (!port || !port.writable || !port.readable) return;
      if (port.writable.locked || port.readable.locked) {
          error = 'Port is busy';
          return;
      }
      
      // Build Modbus Frame
      // [Node][Func][AddrHi][AddrLo][QtyHi][QtyLo][CRC_Lo][CRC_Hi]
      const buffer = new Uint8Array(8);
      buffer[0] = nodeID;
      buffer[1] = functionCode;
      buffer[2] = (address >> 8) & 0xFF;
      buffer[3] = address & 0xFF;
      buffer[4] = (quantity >> 8) & 0xFF;
      buffer[5] = quantity & 0xFF;
      
      const crc = calcCRC(buffer.subarray(0, 6));
      buffer[6] = crc & 0xFF;
      buffer[7] = (crc >> 8) & 0xFF;
      
      // 1. Write Request
      const writer = port.writable.getWriter();
      try {
          await writer.write(buffer);
          const hex = Array.from(buffer).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
          logs = [{ type: 'tx', data: hex, time: new Date().toLocaleTimeString() }, ...logs].slice(0, 50);
      } catch (e) {
          error = 'Write error: ' + e.message;
          writer.releaseLock();
          return;
      } finally {
          writer.releaseLock();
      }

      // 2. Read Response (Transaction)
      const reader = port.readable.getReader();
      let received = new Uint8Array(0);
      let timer;
      
      try {
          // Create a promise that rejects after timeout
          const timeoutMs = 2000;
          const timeoutPromise = new Promise((_, reject) => {
              timer = setTimeout(() => reject(new Error('Timeout')), timeoutMs);
          });

          // Reading loop
          const readLoopPromise = async () => {
              while (true) {
                  const { value, done } = await reader.read();
                  if (done) break;
                  if (value) {
                      // Append data
                      const next = new Uint8Array(received.length + value.length);
                      next.set(received);
                      next.set(value, received.length);
                      received = next;

                      // Check if we have a full frame
                      // Check Header
                      if (received.length >= 2) {
                          const func = received[1];
                          
                          // Exception Frame: [Node][Func|0x80][Code][CRC][CRC] (5 bytes)
                          if (func & 0x80) {
                              if (received.length >= 5) break;
                          } else {
                              // Normal Frame: [Node][Func][Bytes][Data...][CRC][CRC]
                              // Func 3/4
                              if (func === 3 || func === 4) {
                                  if (received.length >= 3) {
                                      const byteCount = received[2];
                                      const expectedLen = 3 + byteCount + 2;
                                      if (received.length >= expectedLen) break;
                                  }
                              } else {
                                  // Unknown function, wait for timeout or assume generic length?
                                  // For now we rely on timeout if unknown function
                              }
                          }
                      }
                  }
              }
          };

          // Race the read against the timeout
          await Promise.race([readLoopPromise(), timeoutPromise]);
          
          // Process Data
          handleResponse(received, address);

      } catch (e) {
          error = e.message;
      } finally {
          clearTimeout(timer);
          // Cleanup: Cancel reader (which stops the read loop) and release
          try {
            await reader.cancel();
          } catch (e) {
            console.warn("Reader cancel failed", e);
          }
          reader.releaseLock();
      }
  }
</script>

<div class="serial-view">
  {#if !supported}
    <div class="error-banner">Web Serial API is not supported in this browser.</div>
  {:else}
    <div class="controls-row">
        {#if !isConnected}
            <button on:click={requestPort}>Request Port</button>
            {#if ports.length > 0}
                <select bind:value={selectedPortIndex}>
                    {#each ports as p, i}
                        <!-- SerialPort objects don't have stable IDs we can see easily, using index -->
                        <option value={i}>Port {i + 1}</option>
                    {/each}
                </select>
                <select bind:value={baudRate}>
                    <option value={9600}>9600</option>
                    <option value={19200}>19200</option>
                    <option value={115200}>115200</option>
                </select>
                <button on:click={connect}>Connect</button>
            {/if}
        {:else}
            <div class="status">Connected to Port {selectedPortIndex + 1}</div>
            <button on:click={disconnect}>Disconnect</button>
        {/if}
    </div>

    {#if error}
        <div class="error-banner">{error}</div>
    {/if}

    <div class="modbus-form" class:disabled={!isConnected}>
        <h3>Modbus Request</h3>
        <div class="form-row">
            <label>
                Node ID
                <input type="number" bind:value={nodeID} min="1" max="247">
            </label>
            <label>
                Function
                <select bind:value={functionCode}>
                    <option value={3}>03 Read Holding Registers</option>
                    <option value={4}>04 Read Input Registers</option>
                </select>
            </label>
            <label>
                Address
                <input type="number" bind:value={address} min="0" max="65535">
            </label>
            <label>
                Quantity
                <input type="number" bind:value={quantity} min="1" max="125">
            </label>
            <button on:click={transmit} disabled={!isConnected}>Transmit</button>
        </div>
    </div>

    <div class="log-container">
        <h3>Communication Log</h3>
        <div class="log-table">
            <div class="log-header">
                <span>Time</span>
                <span>Dir</span>
                <span>Data (Hex)</span>
            </div>
            <div class="log-body">
                {#each logs as log}
                    <div class="log-row" class:tx={log.type === 'tx'} class:rx={log.type === 'rx'}>
                        <span>{log.time}</span>
                        <span class="badge">{log.type.toUpperCase()}</span>
                        <span class="mono">{log.data}</span>
                    </div>
                {/each}
            </div>
        </div>
    </div>

    {#if decodedRegisters.length > 0}
        <div class="results-container">
            <h3>Decoded Registers</h3>
            <div class="results-grid">
                {#each decodedRegisters as reg}
                    <div class="result-card">
                        <div class="res-addr">Address: {reg.address}</div>
                        <div class="res-val">{reg.value}</div>
                        <div class="res-hex">0x{reg.value.toString(16).toUpperCase().padStart(4, '0')}</div>
                    </div>
                {/each}
            </div>
        </div>
    {/if}
  {/if}
</div>

<style>
  .serial-view {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 20px;
    background: #111;
    height: 100%;
    overflow: auto;
    color: #eee;
  }

  .controls-row {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 10px;
    background: #222;
    border-radius: 4px;
  }

  .modbus-form {
    background: #222;
    padding: 15px;
    border-radius: 4px;
  }
  
  .modbus-form.disabled {
      opacity: 0.5;
      pointer-events: none;
  }

  .form-row {
      display: flex;
      gap: 15px;
      align-items: flex-end;
      flex-wrap: wrap;
  }

  label {
      display: flex;
      flex-direction: column;
      gap: 5px;
      font-size: 12px;
      color: #999;
  }

  h3 {
      margin: 0 0 10px 0;
      font-size: 16px;
      border-bottom: 1px solid #444;
      padding-bottom: 5px;
  }

  input, select, button {
      padding: 8px 12px;
      background: #333;
      border: 1px solid #444;
      color: #eee;
      border-radius: 4px;
  }

  button {
      cursor: pointer;
      background: #444;
      font-weight: bold;
  }
  
  button:hover {
      background: #555;
  }

  button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
  }

  .error-banner {
    background: #721c24;
    color: #f8d7da;
    padding: 10px;
    border-radius: 4px;
  }

  .log-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 300px;
      background: #222;
      border-radius: 4px;
      padding: 15px;
  }

  .log-table {
      display: flex;
      flex-direction: column;
      flex: 1;
      border: 1px solid #333;
  }

  .log-header {
      display: grid;
      grid-template-columns: 100px 60px 1fr;
      padding: 8px;
      background: #333;
      font-weight: bold;
      font-size: 12px;
  }

  .log-body {
      flex: 1;
      overflow-y: auto;
  }

  .log-row {
      display: grid;
      grid-template-columns: 100px 60px 1fr;
      padding: 6px 8px;
      border-bottom: 1px solid #333;
      font-size: 13px;
  }

  .log-row.tx { color: #4ade80; } /* Green for TX */
  .log-row.rx { color: #60a5fa; } /* Blue for RX */

  .mono {
      font-family: monospace;
  }
  
  .badge {
      font-weight: bold;
      font-size: 10px;
      background: #333;
      padding: 2px 6px;
      border-radius: 2px;
      display: inline-block;
      text-align: center;
      width: fit-content;
  }

  .results-container {
      background: #222;
      padding: 15px;
      border-radius: 4px;
  }

  .results-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 10px;
  }

  .result-card {
      background: #333;
      padding: 10px;
      border-radius: 4px;
      text-align: center;
      border: 1px solid #444;
  }

  .res-addr {
      font-size: 11px;
      color: #999;
      margin-bottom: 4px;
  }

  .res-val {
      font-size: 18px;
      font-weight: bold;
      color: #fff;
  }

  .res-hex {
      font-size: 11px;
      color: #666;
      font-family: monospace;
      margin-top: 2px;
  }
</style>
