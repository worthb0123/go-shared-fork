package main

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"strings"
	"sync"
	"syscall/js"
	"time"
)

// Message represents a message passed between tabs and the worker
type Message struct {
	Type      string          `json:"type"`
	ClientID  string          `json:"clientId"`
	Channel   string          `json:"channel"`
	Data      json.RawMessage `json:"data"`
	RequestID int             `json:"requestId"`
	FPS       int             `json:"fps"` // Requested FPS
}

// Response represents a response sent back to clients
type Response struct {
	Type      string          `json:"type"`
	RequestID int             `json:"requestId"`
	Channel   string          `json:"channel"`
	Data      json.RawMessage `json:"data"`
	Error     string          `json:"error,omitempty"`
}

// Register represents a single register with internal and published values
type Register struct {
	Published      int     `json:"published"`
	Internal       float64 `json:"internal"`
	IncDec         float64 `json:"incDec"`
	PrevPublished  int     `json:"prevPublished"`
}

// Device represents a device with registers
type Device struct {
	ID        int         `json:"id"`
	Registers []Register  `json:"registers"`
}

// RegisterData is the public register data sent to clients (only what's needed for display)
type RegisterData struct {
	Number int `json:"number"`
	Value  int `json:"value"`
}

// DeviceData is the data structure sent to subscribers
type DeviceData struct {
	ID        int   `json:"id"`
	Registers []int `json:"registers"`
}

// Subscription represents a client's subscription to a channel
type Subscription struct {
	ClientID       string
	Port           js.Value
	TargetInterval time.Duration
	LastSent       time.Time
	LastKnownState []int
}

// SharedWorker manages subscriptions and broadcasts data to subscribed clients
type SharedWorker struct {
	subscriptions map[string][]Subscription
	dataStore     map[string]json.RawMessage
	devices       map[int]*Device // Device ID -> Device
	ticker        *time.Ticker
	stopChan      chan bool
	mu            sync.RWMutex
}

var worker *SharedWorker

func init() {
	worker = &SharedWorker{
		subscriptions: make(map[string][]Subscription),
		dataStore:     make(map[string]json.RawMessage),
		devices:       make(map[int]*Device),
		stopChan:      make(chan bool),
	}
	
	// Initialize devices
	rand.Seed(time.Now().UnixNano())
	for deviceID := 1; deviceID <= 2; deviceID++ {
		device := &Device{
			ID:        deviceID,
			Registers: make([]Register, 10000),
		}
		// Initialize registers with random values and incDec
		for i := 0; i < 10000; i++ {
			published := rand.Intn(100) + 1
			incDec := (rand.Float64() * 4) - 2 // Random between -2.0 and 2.0
			
			// Force small values to be 0.1 or -0.1
			if incDec > -0.1 && incDec < 0.1 {
				if incDec < 0 {
					incDec = -0.1
				} else {
					incDec = 0.1
				}
			}
			
			device.Registers[i] = Register{
				Published:     published,
				Internal:      float64(published),
				IncDec:        incDec,
				PrevPublished: published,
			}
		}
		worker.devices[deviceID] = device
	}
	
	// Start publishing devices
	go worker.StartPhysicsLoop()
}

// UpdatePhysics updates the internal state of a device (physics only)
func (sw *SharedWorker) UpdatePhysics(deviceID int) {
	sw.mu.Lock()
	device, ok := sw.devices[deviceID]
	sw.mu.Unlock()

	if !ok {
		return
	}

	sw.mu.Lock()
	defer sw.mu.Unlock()

	// Physics runs at 10Hz (100ms)
	// Previously IncDec was added every 100ms.
	// To maintain speed: IncDec * 1.0
	dtFactor := 1.0

	for i := 0; i < len(device.Registers); i++ {
		// Add incDec to internal value
		device.Registers[i].Internal += device.Registers[i].IncDec * dtFactor

		// Calculate new published value (floor of internal)
		newPublished := int(device.Registers[i].Internal)

		// Wrap values to keep them in 1-100 range
		if newPublished > 100 {
			newPublished = 1
			device.Registers[i].Internal = 1
		} else if newPublished < 1 {
			newPublished = 100
			device.Registers[i].Internal = 100
		}

		device.Registers[i].Published = newPublished
	}
}

// StartPhysicsLoop starts the physics simulation loop at 10Hz
func (sw *SharedWorker) StartPhysicsLoop() {
	// 10 FPS = 100ms
	ticker := time.NewTicker(100 * time.Millisecond)
	broadcastTicker := time.NewTicker(10 * time.Millisecond) // Check broadcast queue often

	go func() {
		for {
			select {
			case <-broadcastTicker.C:
				sw.Broadcast()
			case <-sw.stopChan:
				return
			}
		}
	}()

	for {
		select {
		case <-ticker.C:
			sw.UpdatePhysics(1)
			sw.UpdatePhysics(2)
		case <-sw.stopChan:
			ticker.Stop()
			broadcastTicker.Stop()
			return
		}
	}
}

// Broadcast checks all subscriptions and sends updates if needed
func (sw *SharedWorker) Broadcast() {
	sw.mu.Lock()
	defer sw.mu.Unlock()

	now := time.Now()

	for channel, subs := range sw.subscriptions {
		// Only handle device channels for now
		if !strings.HasPrefix(channel, "device_") {
			continue
		}

		var deviceID int
		if _, err := fmt.Sscanf(channel, "device_%d", &deviceID); err != nil {
			continue
		}
		
		device, ok := sw.devices[deviceID]
		if !ok {
			continue
		}

		// Current state for diffing
		currentState := make([]int, len(device.Registers))
		for i := range device.Registers {
			currentState[i] = device.Registers[i].Published
		}

		for i := range subs {
			sub := &subs[i] // Pointer to update LastSent
			if now.Sub(sub.LastSent) >= sub.TargetInterval {
				
				// Initialize LastKnownState if nil (should happen on Subscribe, but just in case)
				if sub.LastKnownState == nil {
					sub.LastKnownState = make([]int, len(currentState))
					// Assume client has nothing (all zeros)
				}

				// Generate delta
				deltaBuf := EncodeDelta(currentState, sub.LastKnownState)

				if len(deltaBuf) > 0 {
					// HACK: We can't easily mix JSON control messages and Raw Binary messages on the same port 
					// unless we handle it on client.
					// Let's just send the raw Uint8Array. Client check `typeof data`.
					// Convert Go []byte to JS Uint8Array
					
					uint8Array := js.Global().Get("Uint8Array").New(len(deltaBuf))
					js.CopyBytesToJS(uint8Array, deltaBuf)
					sub.Port.Call("postMessage", uint8Array)

					// Update LastKnownState
					copy(sub.LastKnownState, currentState)
				}
				
				sub.LastSent = now
			}
		}
	}
}

// EncodeDelta generates a binary delta buffer
func EncodeDelta(current, prev []int) []byte {
	var buf []byte
	
	i := 0
	for i < len(current) {
		// Skip unchanged
		if i < len(prev) && current[i] == prev[i] {
			i++
			continue
		}

		// Found a change at i
		// Determine if it's a run or isolated
		runStart := i
		runLen := 0
		
		// Look ahead for continuous changes (run)
		// A "run" is a sequence of changed values.
		// But wait, the protocol supports "Run of sequential registers".
		// We can send *any* sequence of registers as a run, even if some didn't change?
		// No, that wastes bandwidth.
		// We should only encode *changed* values.
		// If we have changed, changed, changed -> Run.
		// If we have changed, unchanged, changed -> Pair, Pair (or Run if unchanged is short?)
		
		// Simple greedy approach:
		// Find consecutive changes.
		for i < len(current) && runLen < 255 {
			if i < len(prev) && current[i] == prev[i] {
				break
			}
			runLen++
			i++
		}

		// If runLen >= 2, encode as Run (0x02)
		// If runLen == 1, encode as Pair (0x01)
		if runLen >= 2 {
			// Opcode 0x02: [2] [IdxLo] [IdxHi] [Count] [Val...]
			buf = append(buf, 2)
			buf = append(buf, byte(runStart&0xFF), byte(runStart>>8))
			buf = append(buf, byte(runLen))
			for k := 0; k < runLen; k++ {
				buf = append(buf, byte(current[runStart+k]))
			}
		} else if runLen == 1 {
			// Opcode 0x01: [1] [IdxLo] [IdxHi] [Val]
			buf = append(buf, 1)
			buf = append(buf, byte(runStart&0xFF), byte(runStart>>8))
			buf = append(buf, byte(current[runStart]))
		}
	}
	return buf
}

// GetDeviceSnapshot returns a full snapshot as a binary Run
func (sw *SharedWorker) GetDeviceSnapshot(deviceID int) ([]byte, []int, error) {
	sw.mu.RLock()
	defer sw.mu.RUnlock()

	device, ok := sw.devices[deviceID]
	if !ok {
		return nil, nil, fmt.Errorf("device not found")
	}

	state := make([]int, len(device.Registers))
	for i, reg := range device.Registers {
		state[i] = reg.Published
	}

	// Create binary snapshot (One giant run)
	// Since count is byte (max 255), we need multiple runs
	var buf []byte
	for i := 0; i < len(state); i += 255 {
		count := 255
		if i+count > len(state) {
			count = len(state) - i
		}
		
		// Opcode 0x02 (Run)
		buf = append(buf, 2)
		buf = append(buf, byte(i&0xFF), byte(i>>8))
		buf = append(buf, byte(count))
		for k := 0; k < count; k++ {
			buf = append(buf, byte(state[i+k]))
		}
	}

	return buf, state, nil
}

// Subscribe adds a client to a channel's subscription list
func (sw *SharedWorker) Subscribe(clientID string, channel string, port js.Value, fps int) Response {
	sw.mu.Lock()
	
	// Max cap at 10 FPS (100ms) for physics loop
	if fps > 10 {
		fps = 10
	}
	
	interval := time.Second / 10 // Default 10 FPS
	if fps > 0 {
		interval = time.Second / time.Duration(fps)
	}

	sw.subscriptions[channel] = append(sw.subscriptions[channel], Subscription{
		ClientID:       clientID,
		Port:           port,
		TargetInterval: interval,
		LastSent:       time.Now(), // Start now
	})
	sw.mu.Unlock()

	// Send current data if available
	// For devices, send a full snapshot. For others, use dataStore.
	var initialData json.RawMessage
	var err error

	if strings.HasPrefix(channel, "device_") {
		var deviceID int
		if _, scanErr := fmt.Sscanf(channel, "device_%d", &deviceID); scanErr == nil {
			var snapshotBuf []byte
			var state []int
			snapshotBuf, state, err = sw.GetDeviceSnapshot(deviceID)
			
			if err == nil {
				// Update subscription with state
				// Re-acquire lock to find subscription and update it
				// Note: This is inefficient (O(N) scan), but Subscribe is rare.
				sw.mu.Lock()
				for i := range sw.subscriptions[channel] {
					if sw.subscriptions[channel][i].ClientID == clientID {
						sw.subscriptions[channel][i].LastKnownState = state
						break
					}
				}
				sw.mu.Unlock()

				// Send binary snapshot
				uint8Array := js.Global().Get("Uint8Array").New(len(snapshotBuf))
				js.CopyBytesToJS(uint8Array, snapshotBuf)
				port.Call("postMessage", uint8Array)
				
				// We sent the data, so no need to send JSON response with Data
				initialData = nil
			} else {
				initialData = nil
			}
		}
	} else {
		sw.mu.RLock()
		if data, ok := sw.dataStore[channel]; ok {
			initialData = data
		}
		sw.mu.RUnlock()
	}

	if initialData != nil {
		response := Response{
			Type:    "data",
			Channel: channel,
			Data:    initialData,
		}
		sw.sendToPort(port, response)
	}

	return Response{
		Type: "subscribed",
	}
}

// Unsubscribe removes a client from a channel's subscription list
func (sw *SharedWorker) Unsubscribe(clientID string, channel string) Response {
	sw.mu.Lock()
	defer sw.mu.Unlock()

	if subs, ok := sw.subscriptions[channel]; ok {
		filtered := []Subscription{}
		for _, sub := range subs {
			if sub.ClientID != clientID {
				filtered = append(filtered, sub)
			}
		}
		sw.subscriptions[channel] = filtered
	}

	return Response{
		Type: "unsubscribed",
	}
}

// Publish updates data for a channel and broadcasts to all subscribers
func (sw *SharedWorker) Publish(channel string, data json.RawMessage) Response {
	sw.mu.Lock()
	sw.dataStore[channel] = data
	subs := sw.subscriptions[channel]
	sw.mu.Unlock()

	// Broadcast to all subscribers
	response := Response{
		Type:    "data",
		Channel: channel,
		Data:    data,
	}

	for _, sub := range subs {
		sw.sendToPort(sub.Port, response)
	}

	return Response{
		Type: "published",
	}
}

// GetData retrieves current data for a channel
func (sw *SharedWorker) GetData(channel string) (json.RawMessage, bool) {
	sw.mu.RLock()
	defer sw.mu.RUnlock()
	data, ok := sw.dataStore[channel]
	return data, ok
}

// Inspect returns the current state of the worker for debugging
func (sw *SharedWorker) Inspect() map[string]interface{} {
	sw.mu.RLock()
	defer sw.mu.RUnlock()

	// Count subscribers per channel
	subscriberCounts := make(map[string]int)
	for channel, subs := range sw.subscriptions {
		subscriberCounts[channel] = len(subs)
	}

	// Prepare data preview (convert RawMessage to string for display)
	dataPreview := make(map[string]string)
	for channel, data := range sw.dataStore {
		dataPreview[channel] = string(data)
	}

	return map[string]interface{}{
		"channels": map[string]interface{}{
			"subscriberCounts": subscriberCounts,
			"dataStore":        dataPreview,
		},
		"totalChannels": len(sw.subscriptions),
		"totalData":     len(sw.dataStore),
	}
}

// sendToPort sends a response to a specific MessagePort
func (sw *SharedWorker) sendToPort(port js.Value, resp Response) {
	data, _ := json.Marshal(resp)
	port.Call("postMessage", js.ValueOf(string(data)))
}

// ClientHandler holds message handler reference to prevent GC
type ClientHandler struct {
	handler js.Func
}

var handlers []*ClientHandler

// HandleConnect handles new client connections via MessagePort
func HandleConnect(this js.Value, args []js.Value) interface{} {
	if len(args) == 0 {
		return nil
	}
	
	event := args[0]
	ports := event.Get("ports")
	
	if ports.Length() == 0 {
		return nil
	}
	
	port := ports.Index(0)
	clientID := js.Global().Get("Math").Call("random").String()

	// Create message handler - keep reference to prevent GC
	handler := &ClientHandler{}
	handler.handler = js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		if len(args) == 0 {
			return nil
		}
		
		msgEvent := args[0]
		msgStr := msgEvent.Get("data").String()
		
		var msg Message
		if err := json.Unmarshal([]byte(msgStr), &msg); err != nil {
			resp := Response{
				Type:  "error",
				Error: "unmarshal error: " + err.Error(),
			}
			worker.sendToPort(port, resp)
			return nil
		}

		msg.ClientID = clientID

		var resp Response
		resp.RequestID = msg.RequestID

		if msg.Type == "subscribe" {
			resp = worker.Subscribe(clientID, msg.Channel, port, msg.FPS)
		} else if msg.Type == "unsubscribe" {
			resp = worker.Unsubscribe(clientID, msg.Channel)
		} else if msg.Type == "publish" {
			resp = worker.Publish(msg.Channel, msg.Data)
		} else if msg.Type == "get" {
			if data, ok := worker.GetData(msg.Channel); ok {
				resp = Response{
					Type:    "data",
					Channel: msg.Channel,
					Data:    data,
				}
			} else {
				resp = Response{
					Type:  "error",
					Error: "channel not found",
				}
			}
		} else if msg.Type == "inspect" {
			inspectData := worker.Inspect()
			inspectJSON, _ := json.Marshal(inspectData)
			resp = Response{
				Type: "inspect",
				Data: inspectJSON,
			}
		} else {
			resp = Response{
				Type:  "error",
				Error: "unknown message type",
			}
		}

		resp.RequestID = msg.RequestID
		worker.sendToPort(port, resp)
		return nil
	})

	// Store handler reference to prevent garbage collection
	handlers = append(handlers, handler)

	// Set up message handler
	port.Set("onmessage", handler.handler)
	port.Call("start")

	return nil
}

func main() {
	js.Global().Set("goOnConnect", js.FuncOf(HandleConnect))
	select {}
}
