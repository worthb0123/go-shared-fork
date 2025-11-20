#!/bin/bash

# Build script for Go WASM shared worker

set -e

echo "Building Go WASM module..."

# Set environment variables for WASM compilation
export GOOS=js
export GOARCH=wasm

# Compile Go to WebAssembly
go build -o worker.wasm main.go

echo "✓ Built worker.wasm"

# Copy wasm_exec.js from Go installation
GOROOT=$(go env GOROOT)
cp "$GOROOT/misc/wasm/wasm_exec.js" .

echo "✓ Copied wasm_exec.js"
echo ""
echo "Build complete!"
echo ""
echo "To run the example:"
echo "  1. Start a web server: python3 -m http.server 8000"
echo "  2. Open: http://localhost:8000/example.html"
echo "  3. Open the same URL in multiple tabs to test multi-tab communication"
