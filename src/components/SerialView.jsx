import React, { useState, useEffect, useRef } from 'react';
import './SerialView.css';

const SerialView = () => {
  const [supported, setSupported] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const [ports, setPorts] = useState([]);
  const [selectedPortIndex, setSelectedPortIndex] = useState(-1);
  
  // Modbus Inputs
  const [nodeID, setNodeID] = useState(1);
  const [functionCode, setFunctionCode] = useState(3);
  const [address, setAddress] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [baudRate, setBaudRate] = useState(9600);

  const [logs, setLogs] = useState([]);
  const [decodedRegisters, setDecodedRegisters] = useState([]);

  const portRef = useRef(null);

  function calcCRC(buffer) {
    let crc = 0xFFFF;
    for (let pos = 0; pos < buffer.length; pos++) {
      crc ^= buffer[pos];
      for (let i = 8; i !== 0; i--) {
        if ((crc & 0x0001) !== 0) {
          crc >>= 1;
          crc ^= 0xA001;
        } else {
          crc >>= 1;
        }
      }
    }
    return crc;
  }

  useEffect(() => {
    const isSupported = 'serial' in navigator;
    setSupported(isSupported);
    if (isSupported) {
      navigator.serial.getPorts().then(p => {
        setPorts(p);
        if (p.length > 0) {
          setSelectedPortIndex(0);
        }
      });
    }
    
    return () => {
      // Cleanup handled by ref check?
      // We can't easily async await in cleanup, but we should try to close if connected.
      if (portRef.current && portRef.current.readable) {
          // It's hard to close synchronously. 
          // Best effort? 
          // The browser usually handles this on tab close, but component unmount?
          // We call disconnect inside the component logic when needed.
          // But we can't await here.
      }
    };
  }, []);

  // Effect to handle component unmount cleanup
  useEffect(() => {
      return () => {
          if (portRef.current) {
              // Attempt close - note this might fail if locked
              portRef.current.close().catch(e => console.error("Close error on unmount", e));
          }
      };
  }, []);


  async function requestPort() {
    try {
      const newPort = await navigator.serial.requestPort();
      const p = await navigator.serial.getPorts();
      setPorts(p);
      setSelectedPortIndex(p.findIndex(port => port === newPort));
    } catch (e) {
      setError(e.message);
    }
  }

  async function connect() {
      if (selectedPortIndex < 0) return;
      
      try {
          const port = ports[selectedPortIndex];
          await port.open({ baudRate });
          portRef.current = port;
          setIsConnected(true);
          setError('');
      } catch (e) {
          setError('Connection failed: ' + e.message);
      }
  }

  async function disconnect() {
      if (portRef.current) {
          try {
            await portRef.current.close();
          } catch (e) {
            console.error("Error closing port:", e);
          }
      }
      portRef.current = null;
      setIsConnected(false);
  }

  function handleResponse(data, startAddress) {
      // Log RX
      const hex = Array.from(data).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
      setLogs(prev => [{ type: 'rx', data: hex, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));

      // Decode Modbus Frame
      if (data.length < 3) return;
      
      const func = data[1];
      
      if (func & 0x80) {
          setError(`Modbus Exception: Code ${data[2]}`);
          return;
      }
      
      if (func === 3 || func === 4) {
          const byteCount = data[2];
          if (data.length < 3 + byteCount) return;
          
          const count = byteCount / 2;
          const regs = [];
          for (let i = 0; i < count; i++) {
              const val = (data[3 + i*2] << 8) | data[3 + i*2 + 1];
              regs.push({ address: startAddress + i, value: val });
          }
          setDecodedRegisters(regs);
      }
  }

  async function transmit() {
      const port = portRef.current;
      if (!port || !port.writable || !port.readable) return;
      if (port.writable.locked || port.readable.locked) {
          setError('Port is busy');
          return;
      }
      
      const buffer = new Uint8Array(8);
      buffer[0] = nodeID;
      buffer[1] = functionCode;
      buffer[2] = (address >> 8) & 0xFF;
      buffer[3] = address & 0xFF;
      buffer[4] = (quantity >> 8) & 0xFF;
      buffer[5] = quantity & 0xFF;
      
      const crc = calcCRC(buffer.subarray(0, 6));
      buffer[6] = crc & 0xFF;
      buffer[7] = (crc >> 8) & 0xFF;
      
      const writer = port.writable.getWriter();
      try {
          await writer.write(buffer);
          const hex = Array.from(buffer).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
          setLogs(prev => [{ type: 'tx', data: hex, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
      } catch (e) {
          setError('Write error: ' + e.message);
          writer.releaseLock();
          return;
      } finally {
          writer.releaseLock();
      }

      const reader = port.readable.getReader();
      let received = new Uint8Array(0);
      let timer;
      
      try {
          const timeoutMs = 2000;
          const timeoutPromise = new Promise((_, reject) => {
              timer = setTimeout(() => reject(new Error('Timeout')), timeoutMs);
          });

          const readLoopPromise = async () => {
              while (true) {
                  const { value, done } = await reader.read();
                  if (done) break;
                  if (value) {
                      const next = new Uint8Array(received.length + value.length);
                      next.set(received);
                      next.set(value, received.length);
                      received = next;

                      if (received.length >= 2) {
                          const func = received[1];
                          if (func & 0x80) {
                              if (received.length >= 5) break;
                          } else {
                              if (func === 3 || func === 4) {
                                  if (received.length >= 3) {
                                      const byteCount = received[2];
                                      const expectedLen = 3 + byteCount + 2;
                                      if (received.length >= expectedLen) break;
                                  }
                              }
                          }
                      }
                  }
              }
          };

          await Promise.race([readLoopPromise(), timeoutPromise]);
          
          handleResponse(received, address);

      } catch (e) {
          setError(e.message);
      } finally {
          clearTimeout(timer);
          try {
            await reader.cancel();
          } catch (e) {
            console.warn("Reader cancel failed", e);
          }
          reader.releaseLock();
      }
  }

  return (
    <div className="serial-view">
      {!supported ? (
        <div className="error-banner">Web Serial API is not supported in this browser.</div>
      ) : (
        <>
          <div className="controls-row">
            {!isConnected ? (
                <>
                    <button onClick={requestPort}>Request Port</button>
                    {ports.length > 0 && (
                        <>
                            <select 
                                value={selectedPortIndex} 
                                onChange={(e) => setSelectedPortIndex(Number(e.target.value))}
                            >
                                {ports.map((p, i) => (
                                    <option key={i} value={i}>Port {i + 1}</option>
                                ))}
                            </select>
                            <select 
                                value={baudRate} 
                                onChange={(e) => setBaudRate(Number(e.target.value))}
                            >
                                <option value={9600}>9600</option>
                                <option value={19200}>19200</option>
                                <option value={115200}>115200</option>
                            </select>
                            <button onClick={connect}>Connect</button>
                        </>
                    )}
                </>
            ) : (
                <>
                    <div className="status">Connected to Port {selectedPortIndex + 1}</div>
                    <button onClick={disconnect}>Disconnect</button>
                </>
            )}
          </div>

          {error && <div className="error-banner">{error}</div>}

          <div className={`modbus-form ${!isConnected ? 'disabled' : ''}`}>
            <h3>Modbus Request</h3>
            <div className="form-row">
                <label>
                    Node ID
                    <input type="number" value={nodeID} min="1" max="247" onChange={(e) => setNodeID(Number(e.target.value))} />
                </label>
                <label>
                    Function
                    <select value={functionCode} onChange={(e) => setFunctionCode(Number(e.target.value))}>
                        <option value={3}>03 Read Holding Registers</option>
                        <option value={4}>04 Read Input Registers</option>
                    </select>
                </label>
                <label>
                    Address
                    <input type="number" value={address} min="0" max="65535" onChange={(e) => setAddress(Number(e.target.value))} />
                </label>
                <label>
                    Quantity
                    <input type="number" value={quantity} min="1" max="125" onChange={(e) => setQuantity(Number(e.target.value))} />
                </label>
                <button onClick={transmit} disabled={!isConnected}>Transmit</button>
            </div>
          </div>

          <div className="log-container">
            <h3>Communication Log</h3>
            <div className="log-table">
                <div className="log-header">
                    <span>Time</span>
                    <span>Dir</span>
                    <span>Data (Hex)</span>
                </div>
                <div className="log-body">
                    {logs.map((log, i) => (
                        <div key={i} className={`log-row ${log.type}`}>
                            <span>{log.time}</span>
                            <span className="badge">{log.type.toUpperCase()}</span>
                            <span className="mono">{log.data}</span>
                        </div>
                    ))}
                </div>
            </div>
          </div>

          {decodedRegisters.length > 0 && (
            <div className="results-container">
                <h3>Decoded Registers</h3>
                <div className="results-grid">
                    {decodedRegisters.map((reg, i) => (
                        <div key={i} className="result-card">
                            <div className="res-addr">Address: {reg.address}</div>
                            <div className="res-val">{reg.value}</div>
                            <div className="res-hex">0x{reg.value.toString(16).toUpperCase().padStart(4, '0')}</div>
                        </div>
                    ))}
                </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SerialView;
