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
	ID        int             `json:"id"`
	Registers []RegisterData  `json:"registers"`
}

// Subscription represents a client's subscription to a channel
type Subscription struct {
	ClientID string
	Port     js.Value
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
			Registers: make([]Register, 1000),
		}
		// Initialize registers with random values and incDec
		for i := 0; i < 1000; i++ {
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
	go worker.StartPublishing()
}

// UpdateDevice updates the registers of a device and publishes only changed values
func (sw *SharedWorker) UpdateDevice(deviceID int) {
	sw.mu.Lock()
	device, ok := sw.devices[deviceID]
	sw.mu.Unlock()
	
	if !ok {
		return
	}
	
	sw.mu.Lock()
	changedRegisters := []RegisterData{}
	
	// Update internal values and track changes
	for i := 0; i < len(device.Registers); i++ {
		// Add incDec to internal value
		device.Registers[i].Internal += device.Registers[i].IncDec
		
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
		
		// Only include if published value changed
		if newPublished != device.Registers[i].Published {
			device.Registers[i].Published = newPublished
			changedRegisters = append(changedRegisters, RegisterData{
				Number: i,
				Value:  newPublished,
			})
		}
	}
	
	// Only publish if there are changes
	if len(changedRegisters) > 0 {
		// Marshal only changed registers
		deviceData := DeviceData{
			ID:        deviceID,
			Registers: changedRegisters,
		}
		data, _ := json.Marshal(deviceData)
		sw.mu.Unlock()
		
		// Publish to channel
		channel := fmt.Sprintf("device_%d", deviceID)
		sw.Publish(channel, data)
	} else {
		sw.mu.Unlock()
	}
}

// StartPublishing starts the publishing loop that updates devices every 100ms
func (sw *SharedWorker) StartPublishing() {
	sw.ticker = time.NewTicker(100 * time.Millisecond)
	defer sw.ticker.Stop()
	
	for {
		select {
		case <-sw.ticker.C:
			sw.UpdateDevice(1)
			sw.UpdateDevice(2)
		case <-sw.stopChan:
			return
		}
	}
}

// GetDeviceSnapshot returns a full snapshot of a device's registers
func (sw *SharedWorker) GetDeviceSnapshot(deviceID int) ([]byte, error) {
	sw.mu.RLock()
	defer sw.mu.RUnlock()

	device, ok := sw.devices[deviceID]
	if !ok {
		return nil, fmt.Errorf("device not found")
	}

	allRegisters := make([]RegisterData, len(device.Registers))
	for i, reg := range device.Registers {
		allRegisters[i] = RegisterData{
			Number: i,
			Value:  reg.Published,
		}
	}

	deviceData := DeviceData{
		ID:        deviceID,
		Registers: allRegisters,
	}

	return json.Marshal(deviceData)
}

// Subscribe adds a client to a channel's subscription list
func (sw *SharedWorker) Subscribe(clientID string, channel string, port js.Value) Response {
	sw.mu.Lock()
	sw.subscriptions[channel] = append(sw.subscriptions[channel], Subscription{
		ClientID: clientID,
		Port:     port,
	})
	sw.mu.Unlock()

	// Send current data if available
	// For devices, send a full snapshot. For others, use dataStore.
	var initialData json.RawMessage
	var err error

	if strings.HasPrefix(channel, "device_") {
		var deviceID int
		if _, scanErr := fmt.Sscanf(channel, "device_%d", &deviceID); scanErr == nil {
			initialData, err = sw.GetDeviceSnapshot(deviceID)
			if err != nil {
				// Log error or ignore? For now, if device not found, we send nothing
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
			resp = worker.Subscribe(clientID, msg.Channel, port)
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
