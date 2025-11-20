package main

import (
	"encoding/json"
	"sync"
	"syscall/js"
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

// Subscription represents a client's subscription to a channel
type Subscription struct {
	ClientID string
	Port     js.Value
}

// SharedWorker manages subscriptions and broadcasts data to subscribed clients
type SharedWorker struct {
	subscriptions map[string][]Subscription
	dataStore     map[string]json.RawMessage
	mu            sync.RWMutex
}

var worker *SharedWorker

func init() {
	worker = &SharedWorker{
		subscriptions: make(map[string][]Subscription),
		dataStore:     make(map[string]json.RawMessage),
	}
}

// Subscribe adds a client to a channel's subscription list
func (sw *SharedWorker) Subscribe(clientID string, channel string, port js.Value) Response {
	sw.mu.Lock()
	defer sw.mu.Unlock()

	sw.subscriptions[channel] = append(sw.subscriptions[channel], Subscription{
		ClientID: clientID,
		Port:     port,
	})

	// Send current data if available
	if data, ok := sw.dataStore[channel]; ok {
		response := Response{
			Type:    "data",
			Channel: channel,
			Data:    data,
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
