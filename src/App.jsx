import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { SharedWorkerClient } from '../client.js';
import CanvasGrid from './components/CanvasGrid.jsx';
import CanvasTable from './components/CanvasTable.jsx';
import SerialView from './components/SerialView.jsx';
import './App.css';

function App() {
  const [client, setClient] = useState(null);
  const [error, setError] = useState('');
  const [selectedDevice, setSelectedDevice] = useState(1);
  const [currentView, setCurrentView] = useState('dashboard');
  const [scrollOptimization, setScrollOptimization] = useState(true);
  const [targetFPS, setTargetFPS] = useState(60);
  const [gridHeight, setGridHeight] = useState(800);

  // Data refs (mutable for performance)
  const registerValuesRef = useRef([]);
  const rawValuesRef = useRef([]);
  const localConfigsRef = useRef([]);
  const [tick, setTick] = useState(0);

  const gridWrapperRef = useRef(null);

  // Observe grid wrapper height
  useLayoutEffect(() => {
    if (!gridWrapperRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setGridHeight(entry.contentRect.height);
      }
    });
    observer.observe(gridWrapperRef.current);
    return () => observer.disconnect();
  }, [currentView, client]);

  useEffect(() => {
    try {
      const c = new SharedWorkerClient('./worker.js');
      setClient(c);
    } catch (e) {
      setError('Failed to initialize shared worker: ' + e.message);
    }
  }, []);

  useEffect(() => {
    if (!client || !selectedDevice) return;

    const channel = `device_${selectedDevice}`;
    const unsubscribe = client.subscribe(channel, (data) => {
      try {
        // Config Update
        if (data && data.configs && Array.isArray(data.configs)) {
          const isFirstConfig = localConfigsRef.current.length === 0;
          localConfigsRef.current = data.configs;
          
          // Ensure registerValues is large enough
          if (registerValuesRef.current.length < localConfigsRef.current.length) {
             for (let i = registerValuesRef.current.length; i < localConfigsRef.current.length; i++) {
                 if (registerValuesRef.current[i] === undefined) {
                     registerValuesRef.current[i] = 0;
                     rawValuesRef.current[i] = 0;
                 }
             }
          }

          if (isFirstConfig) {
              for (let i = 0; i < registerValuesRef.current.length; i++) {
                  rawValuesRef.current[i] = registerValuesRef.current[i];
                  const config = localConfigsRef.current[i];
                  if (config) {
                      registerValuesRef.current[i] = registerValuesRef.current[i] * config.scale + config.offset;
                  }
              }
          }
          
          setTick(t => t + 1);
          return;
        }

        // Data Update (Uint8Array)
        if (data instanceof Uint8Array) {
          let ptr = 0;
          const regVals = registerValuesRef.current;
          const rawVals = rawValuesRef.current;
          const configs = localConfigsRef.current;

          while (ptr < data.length) {
            const opcode = data[ptr++];
            if (opcode === 1) { // Pair
              const idx = data[ptr] | (data[ptr+1] << 8);
              const val = data[ptr+2];
              ptr += 3;
              
              // Grow array if needed
              if (idx >= regVals.length) {
                 for (let i = regVals.length; i <= idx; i++) {
                    regVals[i] = 0;
                    rawVals[i] = 0;
                 }
              }
              
              rawVals[idx] = val;
              const config = configs[idx];
              if (config) {
                  regVals[idx] = val * config.scale + config.offset;
              } else {
                  regVals[idx] = val;
              }
              
            } else if (opcode === 2) { // Run
              const startIdx = data[ptr] | (data[ptr+1] << 8);
              const count = data[ptr+2];
              ptr += 3;
              
              if (startIdx + count > regVals.length) {
                 for (let i = regVals.length; i < startIdx + count; i++) {
                    regVals[i] = 0;
                    rawVals[i] = 0;
                 }
              }
              
              for (let i = 0; i < count; i++) {
                const rawVal = data[ptr++];
                const idx = startIdx + i;
                
                rawVals[idx] = rawVal;
                const config = configs[idx];
                if (config) {
                    regVals[idx] = rawVal * config.scale + config.offset;
                } else {
                    regVals[idx] = rawVal;
                }
              }
            }
          }
          
          setTick(t => t + 1);
        } 
      } catch (e) {
        console.error('Error processing device data:', e);
      }
    }, targetFPS);

    return () => {
      unsubscribe();
    };
  }, [client, selectedDevice, targetFPS]);

  const handleDeviceChange = (e) => {
    setSelectedDevice(parseInt(e.target.value));
  };

  return (
    <main>
      <h1>Device Register Monitor</h1>
      <p style={{fontSize:'0.9em', color:'#666'}}>
        Live Data • Throttled @ {targetFPS} FPS • Canvas Rendering
      </p>

      {error && <div className="error-banner">{error}</div>}

      {client ? (
        <>
          <div className="controls">
            <label htmlFor="device-select">Select Device:</label>
            <select id="device-select" value={selectedDevice} onChange={handleDeviceChange}>
              <option value={1}>Device 1</option>
              <option value={2}>Device 2</option>
            </select>

            <div className="spacer"></div>

            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={scrollOptimization} 
                onChange={(e) => setScrollOptimization(e.target.checked)} 
              />
              Scroll Optimization
            </label>

            <div className="spacer"></div>

            <div className="view-toggle">
              <button 
                className={currentView === 'dashboard' ? 'active' : ''} 
                onClick={() => setCurrentView('dashboard')}
              >
                Dashboard
              </button>
              <button 
                className={currentView === 'debug' ? 'active' : ''} 
                onClick={() => setCurrentView('debug')}
              >
                Debug
              </button>
              <button 
                className={currentView === 'serial' ? 'active' : ''} 
                onClick={() => setCurrentView('serial')}
              >
                Serial
              </button>
            </div>

            <div className="spacer"></div>

            <label htmlFor="fps-select">Target FPS:</label>
            <select id="fps-select" value={targetFPS} onChange={(e) => setTargetFPS(Number(e.target.value))}>
              <option value={2}>2 FPS</option>
              <option value={4}>4 FPS</option>
              <option value={10}>10 FPS</option>
              <option value={15}>15 FPS</option>
              <option value={30}>30 FPS</option>
              <option value={60}>60 FPS</option>
            </select>
          </div>

          {registerValuesRef.current.length === 0 && currentView !== 'serial' ? (
            <div className="loading">Loading device data...</div>
          ) : (
            <div 
              className="grid-wrapper" 
              ref={gridWrapperRef}
            >
              {currentView === 'dashboard' && (
                <CanvasGrid
                  itemCount={registerValuesRef.current.length}
                  itemSize={200}
                  gap={16}
                  height={gridHeight}
                  data={registerValuesRef.current}
                  configs={localConfigsRef.current}
                  scrollOptimization={scrollOptimization}
                  tick={tick}
                />
              )}
              {currentView === 'debug' && (
                <CanvasTable
                  height={gridHeight}
                  rawData={rawValuesRef.current}
                  displayData={registerValuesRef.current}
                  configs={localConfigsRef.current}
                  scrollOptimization={scrollOptimization}
                  tick={tick}
                />
              )}
              {currentView === 'serial' && (
                <SerialView />
              )}
            </div>
          )}
        </>
      ) : (
        <div className="loading">Initializing shared worker...</div>
      )}
    </main>
  );
}

export default App;
