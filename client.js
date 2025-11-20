// Client library for connecting to the shared worker
// Each tab uses this to connect and subscribe to channels

export class SharedWorkerClient {
  constructor(workerUrl = './worker.js') {
    console.log('Creating SharedWorkerClient');
    this.worker = new SharedWorker(workerUrl);
    this.port = this.worker.port;
    this.requestId = 0;
    this.pendingRequests = new Map();
    this.subscriptions = new Map();
    
    console.log('SharedWorker created, setting up port');
    
    // Set up message handler
    this.port.onmessage = (event) => this.handleMessage(event);
    this.port.onmessageerror = (event) => {
      console.error('Port message error:', event);
    };
    this.port.start();
    
    console.log('SharedWorkerClient initialized');
  }

  /**
   * Subscribe to a channel and receive updates
   * @param {string} channel - The channel name
   * @param {Function} callback - Called when data is received
   * @returns {Function} Unsubscribe function
   */
  subscribe(channel, callback) {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }
    
    const callbacks = this.subscriptions.get(channel);
    callbacks.add(callback);
    
    // Send subscribe message
    this.send({
      type: 'subscribe',
      channel: channel
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
    console.log('Client received:', event.data);
    let message;
    try {
      message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    } catch (e) {
      console.error('Failed to parse message:', e);
      return;
    }

    console.log('Parsed message:', message, 'Pending requests:', this.pendingRequests.size);

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
    if (message.type === 'data' && message.channel) {
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
