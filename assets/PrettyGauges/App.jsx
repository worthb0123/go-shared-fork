import React from 'react';
import RadialGaugeSVGDefs from './RadialGaugeSVGDefs';
import LedLightSVGDefs from './LedLightSVGDefs';
import RadialGauge from './RadialGauge';
import RadialGaugeDark from './RadialGaugeDark';
import RadialGaugeDark2 from './RadialGaugeDark2';
import LinearGauge1 from './LinearGauge1';
import LinearGauge2 from './LinearGauge2';
import LedLight from './LedLight';
import LedLight2 from './LedLight2';
import LedLight3 from './LedLight3';
import LedLight4 from './LedLight4';

const deviceSensors = [
  {
    "key": "FuelGasPressure",
    "label": "Fuel Gas\nPressure",
    "units": "PSI",
    "displayMin": 0,
    "displayMax": 500,
    "sampleValue": 212,
    "colorRanges": [
      { "from": 0, "to": 50, "color": "#FF0000" },
      { "from": 450, "to": 500, "color": "#FFA500" }
    ]
  },
  {
    "key": "FuelGasFlowRate",
    "label": "Fuel Gas\nFlow Rate",
    "units": "MMSCFD",
    "displayMin": 0,
    "displayMax": 10,
    "sampleValue": 6.2,
    "colorRanges": []
  },
  {
    "key": "AirIntakePressure",
    "label": "Air Intake\nPressure",
    "units": "PSI",
    "displayMin": 10,
    "displayMax": 20,
    "sampleValue": 18.4,
    "colorRanges": [
      { "from": 10, "to": 12, "color": "#FFA500" },
      { "from": 18, "to": 20, "color": "#FFA500" }
    ]
  },
  {
    "key": "AirIntakeTemperature",
    "label": "Air Intake\nTemperature",
    "units": "deg F",
    "displayMin": -50,
    "displayMax": 200,
    "sampleValue": -8,
    "colorRanges": [
      { "from": -50, "to": 0, "color": "#00BFFF" },
      { "from": 150, "to": 200, "color": "#FFA500" }
    ]
  },
  {
    "key": "CombustionChamberPressure",
    "label": "Combustion\nChamber Pressure",
    "units": "PSI",
    "displayMin": 0,
    "displayMax": 500,
    "sampleValue": 300,
    "colorRanges": [
      { "from": 450, "to": 500, "color": "#FF0000" }
    ]
  },
  {
    "key": "CylinderHeadTemperature",
    "label": "Cylinder Head\nTemperature",
    "units": "deg F",
    "displayMin": 0,
    "displayMax": 500,
    "sampleValue": 350,
    "colorRanges": [
      { "from": 450, "to": 500, "color": "#FF0000" }
    ]
  },
  {
    "key": "ExhaustGasTemperature",
    "label": "Exhaust Gas\nTemperature",
    "units": "deg F",
    "displayMin": 0,
    "displayMax": 1500,
    "sampleValue": 850,
    "colorRanges": [
      { "from": 1200, "to": 1500, "color": "#FF0000" }
    ]
  },
  {
    "key": "ExhaustGasOxygen",
    "label": "Exhaust Gas\nOxygen",
    "units": "%",
    "displayMin": 0,
    "displayMax": 21,
    "sampleValue": 7,
    "colorRanges": [
      { "from": 0, "to": 3, "color": "#FFA500" },
      { "from": 18, "to": 21, "color": "#FFA500" }
    ]
  },
  {
    "key": "EngineRPM",
    "label": "Engine RPM",
    "units": "RPM",
    "displayMin": 0,
    "displayMax": 4000,
    "sampleValue": 2500,
    "colorRanges": [
      { "from": 3500, "to": 4000, "color": "#FF0000" }
    ]
  },
  {
    "key": "IgnitionTiming",
    "label": "Ignition Timing",
    "units": "deg BTDC",
    "displayMin": -10,
    "displayMax": 50,
    "sampleValue": 25,
    "colorRanges": []
  },
  {
    "key": "EngineLoad",
    "label": "Engine Load",
    "units": "%",
    "displayMin": 0,
    "displayMax": 110,
    "sampleValue": 75,
    "colorRanges": [
      { "from": 100, "to": 110, "color": "#FF0000" }
    ]
  },
  {
    "key": "EngineOilPressure",
    "label": "Engine Oil\nPressure",
    "units": "PSI",
    "displayMin": 0,
    "displayMax": 100,
    "sampleValue": 50,
    "colorRanges": [
      { "from": 0, "to": 15, "color": "#FF0000" }
    ]
  },
  {
    "key": "EngineOilTemperature",
    "label": "Engine Oil\nTemperature",
    "units": "deg F",
    "displayMin": 0,
    "displayMax": 300,
    "sampleValue": 180,
    "colorRanges": [
      { "from": 250, "to": 300, "color": "#FF0000" }
    ]
  },
  {
    "key": "CoolantTemperature",
    "label": "Coolant\nTemperature",
    "units": "deg F",
    "displayMin": 0,
    "displayMax": 250,
    "sampleValue": 195,
    "colorRanges": [
      { "from": 220, "to": 250, "color": "#FF0000" }
    ]
  },
  {
    "key": "CoolantPressure",
    "label": "Coolant\nPressure",
    "units": "PSI",
    "displayMin": 0,
    "displayMax": 50,
    "sampleValue": 25,
    "colorRanges": [
      { "from": 40, "to": 50, "color": "#FFA500" }
    ]
  },
  {
    "key": "VibrationLevel",
    "label": "Vibration\nLevel",
    "units": "in/sec",
    "displayMin": 0,
    "displayMax": 2,
    "sampleValue": 1.7,
    "colorRanges": [
      { "from": 1.5, "to": 2, "color": "#FF0000" }
    ]
  }
];

function App() {

  return (
    <>
      <RadialGaugeSVGDefs />
      <LedLightSVGDefs />
      <div style={{ transform: "scale(1)", background: "#E0DBD8", padding: "10rem" }}>
        {/*
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
          <circle cx="51.5" cy="51.5" r="45.5" stroke="#999895" strokeWidth="5" fill="none" />
          <circle cx="51" cy="51" r="44.5" stroke="#999895" strokeWidth="5" fill="none" />
          <circle cx="50" cy="50" r="48" stroke="black" strokeWidth="1" fill="none" />
          <circle cx="50" cy="50" r="46.75" stroke="url(#u01JRN9714WDMNZ7A067CDBVGXD)" strokeWidth="2" fill="none" />
          <circle cx="50" cy="50" r="44.75" stroke="url(#u01JRN9714WYJ50MCSHR0HQX6C8)" strokeWidth="2" fill="none" />
          <circle cx="50" cy="50" r="42.75" stroke="black" strokeWidth="2" fill="none" />
          <circle cx="50" cy="50" r="42.75" stroke="url(#u01JRN9714WDBRB7JCGWBY94CZN)" strokeWidth="1" fill="none" />
          <text x="50" y="79" textAnchor="middle" fontSize="16" fontWeight="bold" fill="black">
            150
          </text>
          <text x="50" y="86" textAnchor="middle" fontSize="7" fontWeight="bold" fill="black">
            ppm
          </text>
        </svg>

        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
          <rect x="2" y="2" width="96" height="96" rx="15" ry="15" stroke="black" strokeWidth="1" fill="none" />
          <rect x="3.25" y="3.25" width="93.5" height="93.5" rx="14" ry="14" stroke="url(#u01JRN9714WDMNZ7A067CDBVGXD)" strokeWidth="2" fill="none" />
          <rect x="5.25" y="5.25" width="89.5" height="89.5" rx="12" ry="12" stroke="url(#u01JRN9714WYJ50MCSHR0HQX6C8)" strokeWidth="2" fill="none" />
          <rect x="7.25" y="7.25" width="85.5" height="85.5" rx="10" ry="10" stroke="black" strokeWidth="2" fill="none" />
          <rect x="7.25" y="7.25" width="85.5" height="85.5" rx="10" ry="10" stroke="url(#u01JRN9714WDBRB7JCGWBY94CZN)" strokeWidth="1" fill="none" />
        </svg>
        */}
        <div>
          <RadialGauge value={15} label="Temperature" units="deg f" />
          <RadialGauge
            value={65}
            label="Pressure"
            units="psi"
            size={200}
            colorRanges={[
              { from: 0, to: 20, color: "green" },
              { from: 80, to: 100, color: "red" }
            ]}
          />
          <RadialGauge value={90} label="CO Level" units="ppm" />
        </div>

      </div>

      <br/>

      <div style={{ transform: "scale(1)", background: "#0F0F0D", padding: "10rem"  }}>
        <div>
          <RadialGaugeDark value={15} label="Temperature" units="deg f" />
          <RadialGaugeDark
            value={65}
            label="Pressure"
            units="psi"
            size={200}
            colorRanges={[
              { from: 0, to: 20, color: "green" },
              { from: 80, to: 100, color: "red" }
            ]}
          />
          <RadialGaugeDark value={90} label="CO Level" units="ppm" />
        </div>
      </div>

      <br/>

      <div style={{ transform: "scale(1)", background: "#090E13", padding: "10rem"  }}>
        <div>
          <RadialGaugeDark2 value={15} label="Temperature" units="deg f" />
          <RadialGaugeDark2
            value={65}
            label="Pressure"
            units="psi"
            size={200}
            colorRanges={[
              { from: 0, to: 20, color: "green" },
              { from: 80, to: 100, color: "red" }
            ]}
          />
          <RadialGaugeDark2 value={90} label="CO Level" units="ppm" />
        </div>
      </div>

      <br/>

      <div style={{ transform: "scale(1)", background: "#0F0F0D", padding: "10rem"  }}>
        <div>
          <LedLight size={100} />
          <LedLight2 size={100} />
          <LedLight3 size={100} />
          <LedLight4 size={100} />
        </div>
        <div>
          <br/>
          <LedLight size={100} lit={false} />
          <LedLight2 size={100} lit={false} />
          <LedLight3 size={100} lit={false} />
          <LedLight4 size={100} lit={false} />
        </div>
      </div>

      <br/>

      <div style={{ transform: "scale(1)", background: "#222", padding: "5rem" }}>
        <h2 style={{ color: '#ccc', fontFamily: 'sans-serif', marginBottom: '2rem' }}>Linear Gauges 1 (Rectangles) - Vertical</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3rem', justifyContent: 'center' }}>
          {deviceSensors.map((sensor) => (
            <div key={sensor.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <LinearGauge1 
                value={sensor.sampleValue} 
                min={sensor.displayMin} 
                max={sensor.displayMax} 
                colorRanges={sensor.colorRanges}
                orientation="vertical" 
                width={40} 
                height={200} 
              />
              <div style={{ color: '#ccc', fontSize: '0.8rem', whiteSpace: 'pre-wrap', textAlign: 'center' }}>
                {sensor.label}
              </div>
              <div style={{ color: 'white', fontSize: '0.9rem', fontWeight: 'bold' }}>
                {sensor.sampleValue} <span style={{ fontSize: '0.7rem', fontWeight: 'normal', color: '#888'}}>{sensor.units}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ transform: "scale(1)", background: "#1a1a1a", padding: "5rem" }}>
        <h2 style={{ color: '#ccc', fontFamily: 'sans-serif', marginBottom: '2rem' }}>Linear Gauges 1 (Rectangles) - Horizontal</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
          {deviceSensors.map((sensor) => (
            <div key={sensor.key} style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ width: '120px', textAlign: 'right', color: '#ccc', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
                {sensor.label}
              </div>
              <LinearGauge1 
                  value={sensor.sampleValue} 
                  min={sensor.displayMin} 
                  max={sensor.displayMax}
                  colorRanges={sensor.colorRanges} 
                  orientation="horizontal" 
                  width={300} 
                  height={30}
                  segments={30} 
              />
               <div style={{ width: '80px', color: 'white', fontSize: '0.9rem', fontWeight: 'bold' }}>
                {sensor.sampleValue} <span style={{ fontSize: '0.7rem', fontWeight: 'normal', color: '#888'}}>{sensor.units}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ transform: "scale(1)", background: "#222", padding: "5rem" }}>
        <h2 style={{ color: '#ccc', fontFamily: 'sans-serif', marginBottom: '2rem' }}>Linear Gauges 2 (Needle + Glow) - Vertical</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3rem', justifyContent: 'center' }}>
          {deviceSensors.map((sensor) => (
            <div key={sensor.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <LinearGauge2 
                value={sensor.sampleValue} 
                min={sensor.displayMin} 
                max={sensor.displayMax} 
                colorRanges={sensor.colorRanges}
                orientation="vertical" 
                width={50} 
                height={200} 
              />
              <div style={{ color: '#ccc', fontSize: '0.8rem', whiteSpace: 'pre-wrap', textAlign: 'center' }}>
                {sensor.label}
              </div>
              <div style={{ color: 'white', fontSize: '0.9rem', fontWeight: 'bold' }}>
                {sensor.sampleValue} <span style={{ fontSize: '0.7rem', fontWeight: 'normal', color: '#888'}}>{sensor.units}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ transform: "scale(1)", background: "#1a1a1a", padding: "5rem" }}>
        <h2 style={{ color: '#ccc', fontFamily: 'sans-serif', marginBottom: '2rem' }}>Linear Gauges 2 (Needle + Glow) - Horizontal</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
          {deviceSensors.map((sensor) => (
            <div key={sensor.key} style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ width: '120px', textAlign: 'right', color: '#ccc', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
                {sensor.label}
              </div>
              <LinearGauge2 
                  value={sensor.sampleValue} 
                  min={sensor.displayMin} 
                  max={sensor.displayMax}
                  colorRanges={sensor.colorRanges} 
                  orientation="horizontal" 
                  width={300} 
                  height={50} 
              />
               <div style={{ width: '80px', color: 'white', fontSize: '0.9rem', fontWeight: 'bold' }}>
                {sensor.sampleValue} <span style={{ fontSize: '0.7rem', fontWeight: 'normal', color: '#888'}}>{sensor.units}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <br/>

      <div style={{ background: "#E0DBD8", paddingTop: '5rem', paddingBottom: '5rem' }}>
        {deviceSensors.map(({ key, label, units, displayMin, displayMax, sampleValue, colorRanges }) => {
          return (
            <RadialGauge
              key={key}
              label={label}
              units={units}
              min={displayMin}
              max={displayMax}
              value={sampleValue}
              colorRanges={colorRanges}
              size={200}
            />
          )
        })}
      </div>
      <div style={{ background: "#0F0F0D", paddingTop: '5rem', paddingBottom: '5rem'  }}>
        {deviceSensors.map(({ key, label, units, displayMin, displayMax, sampleValue, colorRanges }) => {
          return (
            <RadialGaugeDark
              key={key}
              label={label}
              units={units}
              min={displayMin}
              max={displayMax}
              value={sampleValue}
              colorRanges={colorRanges}
              size={200}
            />
          )
        })}
      </div>
      <div style={{ background: "#090E13", paddingTop: '5rem', paddingBottom: '5rem'  }}>
        {deviceSensors.map(({ key, label, units, displayMin, displayMax, sampleValue, colorRanges }) => {
          return (
            <RadialGaugeDark2
              key={key}
              label={label}
              units={units}
              min={displayMin}
              max={displayMax}
              value={sampleValue}
              colorRanges={colorRanges}
              size={200}
            />
          )
        })}
      </div>
    </>
  );
}

export default App;
