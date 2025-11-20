<script>
  export let client;

  let channel = 'counter';
  let data = '{"value": 1}';
  let logs = [];
  let logId = 0;

  function addLog(message) {
    logs = [
      { id: logId++, time: new Date().toLocaleTimeString(), message },
      ...logs.slice(0, 19)
    ];
  }

  function publish() {
    if (!channel) {
      showStatus('error', 'Channel name required');
      return;
    }

    try {
      const parsedData = JSON.parse(data);
      client.publish(channel, parsedData);
      showStatus('success', `Published to "${channel}"`);
      addLog(`Published: ${JSON.stringify(parsedData)}`);
    } catch (e) {
      showStatus('error', 'Invalid JSON: ' + e.message);
    }
  }

  let statusType = '';
  let statusMessage = '';

  function showStatus(type, message) {
    statusType = type;
    statusMessage = message;
  }
</script>

<div class="panel">
  <h2>Publisher</h2>
  
  <div class="controls">
    <input 
      type="text" 
      placeholder="Channel name" 
      bind:value={channel}
    />
    <input 
      type="text" 
      placeholder="Data (JSON)" 
      bind:value={data}
    />
    <button on:click={publish}>Publish</button>
  </div>

  {#if statusMessage}
    <div class="status" class:success={statusType === 'success'} class:error={statusType === 'error'}>
      {statusMessage}
    </div>
  {/if}

  <h3>Log</h3>
  <div class="log">
    {#each logs as entry (entry.id)}
      <div class="log-entry">
        [{entry.time}] {entry.message}
      </div>
    {/each}
  </div>
</div>

<style>
  .panel {
    background: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  h2 {
    margin-top: 0;
    color: #333;
  }

  h3 {
    font-size: 14px;
    color: #555;
    margin-top: 20px;
    margin-bottom: 10px;
  }

  .controls {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  input {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    flex: 1;
    min-width: 120px;
  }

  input:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
  }

  button {
    padding: 8px 16px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    white-space: nowrap;
  }

  button:hover {
    background: #0056b3;
  }

  button:active {
    transform: scale(0.98);
  }

  .status {
    padding: 10px;
    border-radius: 4px;
    margin-bottom: 12px;
    font-size: 14px;
  }

  .status.success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }

  .status.error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }

  .log {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    padding: 10px;
    max-height: 300px;
    overflow-y: auto;
    font-size: 12px;
    font-family: monospace;
  }

  .log-entry {
    padding: 5px 0;
    border-bottom: 1px solid #e0e0e0;
    color: #333;
  }

  .log-entry:last-child {
    border-bottom: none;
  }
</style>
