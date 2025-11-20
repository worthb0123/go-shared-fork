<script>
  import Publisher from './Publisher.svelte';
  import Subscriber from './Subscriber.svelte';
  import Inspector from './Inspector.svelte';
  import { onMount } from 'svelte';
  import { SharedWorkerClient } from '../client.js';

  let client = null;
  let error = '';

  onMount(async () => {
    try {
      client = new SharedWorkerClient('./worker.js');
    } catch (e) {
      error = 'Failed to initialize shared worker: ' + e.message;
    }
  });
</script>

<main>
  <h1>Shared Worker Multi-Tab Demo</h1>
  <p>Open this page in multiple tabs to see cross-tab communication.</p>

  {#if error}
    <div class="error-banner">{error}</div>
  {/if}

  {#if client}
    <div class="container">
      <Publisher {client} />
      <Subscriber {client} />
    </div>
    <div style="margin-top: 20px;">
      <Inspector {client} />
    </div>
  {:else}
    <div class="loading">Initializing shared worker...</div>
  {/if}
</main>

<style>
  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f5f5f5;
    margin: 0;
    padding: 0;
  }

  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
  }

  h1 {
    color: #333;
    margin-top: 0;
  }

  p {
    color: #666;
  }

  .container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  .error-banner {
    background: #f8d7da;
    color: #721c24;
    padding: 12px 16px;
    border-radius: 4px;
    margin-bottom: 20px;
    border: 1px solid #f5c6cb;
  }

  .loading {
    text-align: center;
    color: #666;
    padding: 40px;
    font-size: 16px;
  }

  @media (max-width: 768px) {
    .container {
      grid-template-columns: 1fr;
    }
  }
</style>
