<script>
  export let client;

  let inspectData = null;
  let loading = false;
  let error = '';

  async function inspectWorker() {
    loading = true;
    error = '';
    try {
      inspectData = await client.inspect();
    } catch (e) {
      error = e.message;
      inspectData = null;
    } finally {
      loading = false;
    }
  }
</script>

<div class="panel">
  <h2>Worker Inspector</h2>
  <button on:click={inspectWorker} disabled={loading}>
    {loading ? 'Inspecting...' : 'Inspect Worker State'}
  </button>

  {#if error}
    <div class="error">{error}</div>
  {/if}

  {#if inspectData}
    <div class="inspection-results">
      <div class="stat-row">
        <span class="label">Total Channels:</span>
        <span class="value">{inspectData.totalChannels}</span>
      </div>
      <div class="stat-row">
        <span class="label">Channels with Data:</span>
        <span class="value">{inspectData.totalData}</span>
      </div>

      <h3>Subscriber Counts by Channel</h3>
      <div class="data-section">
        {#if Object.keys(inspectData.channels.subscriberCounts).length === 0}
          <p class="empty">No active subscriptions</p>
        {:else}
          {#each Object.entries(inspectData.channels.subscriberCounts) as [channel, count]}
            <div class="channel-stat">
              <span class="channel-name">{channel}</span>
              <span class="count">{count} subscriber{count !== 1 ? 's' : ''}</span>
            </div>
          {/each}
        {/if}
      </div>

      <h3>Data Store</h3>
      <div class="data-section">
        {#if Object.keys(inspectData.channels.dataStore).length === 0}
          <p class="empty">No data stored</p>
        {:else}
          {#each Object.entries(inspectData.channels.dataStore) as [channel, data]}
            <div class="data-item">
              <div class="channel-name">{channel}</div>
              <div class="data-value">
                <code>{data}</code>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
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
    margin-top: 16px;
    margin-bottom: 10px;
    border-bottom: 1px solid #eee;
    padding-bottom: 8px;
  }

  button {
    padding: 10px 16px;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    font-weight: 500;
  }

  button:hover:not(:disabled) {
    background: #218838;
  }

  button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  button:active:not(:disabled) {
    transform: scale(0.98);
  }

  .error {
    background: #f8d7da;
    color: #721c24;
    padding: 10px;
    border-radius: 4px;
    margin-top: 12px;
    border: 1px solid #f5c6cb;
  }

  .inspection-results {
    margin-top: 20px;
    padding: 16px;
    background: #f8f9fa;
    border-radius: 4px;
    border: 1px solid #dee2e6;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #e0e0e0;
  }

  .stat-row:last-of-type {
    border-bottom: none;
  }

  .label {
    font-weight: 500;
    color: #555;
  }

  .value {
    color: #007bff;
    font-weight: 600;
    font-family: monospace;
  }

  .data-section {
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 0;
    overflow: hidden;
  }

  .empty {
    padding: 12px;
    color: #999;
    font-size: 13px;
    margin: 0;
  }

  .channel-stat {
    display: flex;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid #f0f0f0;
    font-size: 13px;
  }

  .channel-stat:last-child {
    border-bottom: none;
  }

  .channel-name {
    font-weight: 500;
    color: #333;
    font-family: monospace;
  }

  .count {
    color: #666;
    background: #f0f0f0;
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 12px;
  }

  .data-item {
    padding: 12px;
    border-bottom: 1px solid #f0f0f0;
  }

  .data-item:last-child {
    border-bottom: none;
  }

  .data-value {
    margin-top: 8px;
  }

  code {
    background: #f5f5f5;
    padding: 8px;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    display: block;
    word-break: break-word;
    color: #333;
  }
</style>
