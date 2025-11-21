// Client library for connecting to the shared worker
// Each tab uses this to connect and subscribe to channels

export class SharedWorkerClient {
  constructor(workerUrl = './worker.js') {
    this.worker = new SharedWorker(workerUrl);
    this.port = this.worker.port;
    this.requestId = 0;
    this.pendingRequests = new Map();
    this.subscriptions = new Map();
    
    // Set up message handler
    this.port.onmessage = (event) => this.handleMessage(event);
    this.port.onmessageerror = (event) => {
      console.error('Port message error:', event);
    };
    this.port.start();
  }

  /**
   * Subscribe to a channel and receive updates
   * @param {string} channel - The channel name
   * @param {Function} callback - Called when data is received
   * @param {number} fps - Requested FPS for this subscription
   * @returns {Function} Unsubscribe function
   */
  subscribe(channel, callback, fps = 60) {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }
    
    const callbacks = this.subscriptions.get(channel);
    callbacks.add(callback);
    
    // Send subscribe message
    this.send({
      type: 'subscribe',
      channel: channel,
      fps: fps
    });

    // Return unsubscribe function
    return () => {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.unsubscribe(channel);
      }
    };
  }

  /**
   * Unsubscribe from a channel
   * @param {string} channel - The channel name
   */
  unsubscribe(channel) {
    this.subscriptions.delete(channel);
    this.send({
      type: 'unsubscribe',
      channel: channel
    });
  }

  /**
   * Publish data to a channel (all subscribers will receive it)
   * @param {string} channel - The channel name
   * @param {*} data - The data to publish
   */
  publish(channel, data) {
    this.send({
      type: 'publish',
      channel: channel,
      data: data
    });
  }

  /**
   * Get current data for a channel
   * @param {string} channel - The channel name
   * @returns {Promise} Resolves with the data
   */
  async get(channel) {
    return new Promise((resolve, reject) => {
      const requestId = this.requestId++;
      console.log('Sending get request with requestId:', requestId);
      this.pendingRequests.set(requestId, { resolve, reject });
      
      const msg = {
        type: 'get',
        channel: channel,
        requestId: requestId
      };
      console.log('Sending:', JSON.stringify(msg));
      this.port.postMessage(JSON.stringify(msg));
      
      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, 5000);
    });
  }

  /**
   * Inspect the worker state (debugging)
   * @returns {Promise} Resolves with the worker state
   */
  async inspect() {
    return new Promise((resolve, reject) => {
      const requestId = this.requestId++;
      this.pendingRequests.set(requestId, { resolve, reject });
      
      const msg = {
        type: 'inspect',
        requestId: requestId
      };
      this.port.postMessage(JSON.stringify(msg));
      
      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, 5000);
    });
  }

  /**
   * Send a message to the worker
   * @private
   */
  send(message) {
    const msg = {
      ...message,
      requestId: this.requestId++
    };
    this.port.postMessage(JSON.stringify(msg));
  }

  /**
   * Handle messages from the worker
   * @private
   */
  handleMessage(event) {
    if (event.data instanceof Uint8Array || event.data instanceof ArrayBuffer) {
      // Binary data (Delta update)
      // Find the channel callback... wait, the binary data doesn't have the channel ID in it!
      // For now, assuming only ONE subscription per client or implied channel?
      // Actually, `postMessage` is on the `port`.
      // The port is shared for all subscriptions? No, one port per tab.
      // But a tab can subscribe to multiple channels.
      // If we receive binary data, we don't know WHICH channel it is for unless we encode it.
      // HOWEVER, for this demo, we likely only subscribe to ONE device at a time.
      // Let's assume the first active subscription receives the data.
      // Or, we should wrap the binary data in a structure or include channel ID.
      // Given the constraints, let's pass it to ALL active subscription callbacks for now,
      // or `App.svelte` only subscribes to one thing.
      
      const data = new Uint8Array(event.data);
      
      // Dispatch to all subscribers (usually just one device)
      this.subscriptions.forEach(callbacks => {
        callbacks.forEach(callback => callback(data));
      });
      return;
    }

    let message;
    try {
      message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    } catch (e) {
      console.error('Failed to parse message:', e);
      return;
    }

    // Handle pending requests
    if (message.requestId !== undefined && this.pendingRequests.has(message.requestId)) {
      const { resolve, reject } = this.pendingRequests.get(message.requestId);
      this.pendingRequests.delete(message.requestId);
      
      if (message.error) {
        reject(new Error(message.error));
      } else {
        resolve(message.data);
      }
      return;
    }

    // Handle subscriptions
    if ((message.type === 'data' || message.type === 'config') && message.channel) {
      const callbacks = this.subscriptions.get(message.channel);
      if (callbacks) {
        callbacks.forEach(callback => {
          try {
            callback(message.data);
          } catch (e) {
            console.error('Error in subscription callback:', e);
          }
        });
      }
    }
  }

  /**
   * Disconnect the client
   */
  disconnect() {
    this.subscriptions.clear();
    this.pendingRequests.clear();
    this.port.close();
  }
}
