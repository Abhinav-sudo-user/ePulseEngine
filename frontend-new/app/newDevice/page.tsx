"use client"

import { useState, useEffect, useRef } from "react";

// 🔌 CONFIGURE YOUR BACKEND URL HERE
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";; 

const generateId = (name: string) => {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  const suffix = Array.from({ length: 4 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
  const prefix = name?.trim().split(/\s+/)[0].slice(0, 8) || "Node";
  return `${prefix}-${suffix}`;
};

const getTime = () => new Date().toTimeString().slice(0, 8);

// ─── Control Panel ───────────────────────────────────────────────
function ControlPanel({ deviceName, hardwareId }: { deviceName: string, hardwareId: string }) {
  const [battery, setBattery] = useState(52);
  const [temp, setTemp] = useState(25);
  const [online, setOnline] = useState(true);
  const [lastPulse, setLastPulse] = useState("Waiting...");
  const [killed, setKilled] = useState(false);
  
  const pulseRef = useRef<NodeJS.Timeout | null>(null);

  // 🛠️ The Fix: Store latest slider values in a ref so setInterval always sees the newest data
  const stateRef = useRef({ battery, temp });
  useEffect(() => {
    stateRef.current = { battery, temp };
  }, [battery, temp]);

  // The Real Heartbeat Engine
  const sendPulse = async () => {
    try {
      await fetch(`${API_BASE}/api/heartbeat`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Bypass-Tunnel-Reminder": "true" // Bypasses Localtunnel warnings!
        },
        body: JSON.stringify({
          device_id: hardwareId,
          battery: stateRef.current.battery,
          temperature: stateRef.current.temp
        })
      });
      setLastPulse(getTime());
    } catch (err) {
      console.error("Pulse Network Error", err);
    }
  };

  useEffect(() => {
    if (!online) return;
    
    sendPulse(); // Send initial pulse immediately
    
    // Loop every 10 seconds (Perfect for your 30s Redis TTL)
    pulseRef.current = setInterval(() => sendPulse(), 10000); 
    
    return () => clearInterval(pulseRef.current!);
  }, [online, hardwareId]);

  const handleKill = () => {
    setKilled(true);
    setOnline(false);  
    if (pulseRef.current) clearInterval(pulseRef.current);
  };

  const handleRevive = () => {
    setKilled(false);
    setOnline(true); 
  };

  // UI remains exactly as you designed it
  return (
    <div style={{
      padding: 20,
      background: "lightblue",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      gap: 20,
      borderRadius: 5,
      border: "2px solid black",
      boxShadow: "4px 4px black",
      width: 290,
      boxSizing: "border-box",
    }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
        <div style={{ color: "#323232", fontWeight: 900, fontSize: 20 }}>Control Panel</div>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          border: `2px solid ${online ? "black" : "black"}`,
          borderRadius: 20, padding: "3px 10px",
          backgroundColor: "beige",
          boxShadow: "2px 2px black",
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            backgroundColor: online ? "#00cc55" : "#cc2200",
            boxShadow: online ? "0 0 6px #00cc55" : "0 0 6px #cc2200",
          }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#323232" }}>
            {online ? "Online" : "Offline"}
          </span>
        </div>
      </div>

      {/* Device Info Box */}
      <div style={{
        width: "100%",
        borderRadius: 5,
        border: "2px solid black",
        backgroundColor: "beige",
        boxShadow: "4px 4px black",
        padding: "10px 14px",
        boxSizing: "border-box",
        fontFamily: "'Courier New', monospace",
        fontSize: 14,
        lineHeight: 1.8,
      }}>
        <div style={{ color: "#666" }}>ID: <span style={{ color: "#323232", fontWeight: 700 }}>{hardwareId}</span></div>
        <div style={{ color: "#666" }}>Last Pulse: <span style={{ color: "#1a7a3a", fontWeight: 700 }}>{lastPulse}</span></div>
        <div style={{ color: "#666" }}>Name: <span style={{ color: "#323232", fontWeight: 700 }}>{deviceName}</span></div>
      </div>

      {/* Battery Slider */}
      <div style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ color: "#666", fontSize: 14, fontWeight: 600 }}>Simulate Battery</span>
          <span style={{ color: "#cc7700", fontSize: 14, fontWeight: 700 }}>{battery}%</span>
        </div>
        <input type="range" min={0} max={100} value={battery}
          onChange={e => setBattery(+e.target.value)}
          style={{ width: "100%", accentColor: "black", cursor: "pointer", height: 4 }} />
      </div>

      {/* Temp Slider */}
      <div style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ color: "#666", fontSize: 14, fontWeight: 600 }}>Simulate Temp</span>
          <span style={{ color: "#cc7700", fontSize: 14, fontWeight: 700 }}>{temp}°C</span>
        </div>
        <input type="range" min={-20} max={100} value={temp}
          onChange={e => setTemp(+e.target.value)}
          style={{ width: "100%", accentColor: "black", cursor: "pointer", height: 4 }} />
      </div>

      {/* Divider */}
      <div style={{ width: "100%", borderTop: "2px solid black", margin: "0 0 -4px 0" }} />

      {/* Kill / Revive Button */}
      {!killed ? (
        <div style={{ width: "100%" }}>
          <button onClick={handleKill} style={{
            width: "100%", height: 44,
            borderRadius: 5,
            border: "2px solid black",
            background: "#cc2200",
            boxShadow: "4px 4px black",
            color: "#fff",
            fontSize: 15, fontWeight: 900, letterSpacing: 2,
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            textTransform: "uppercase",
          }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "rgba(255,200,200,0.7)" }} />
            PULL KILL SWITCH
          </button>
          <p style={{ color: "#666", fontSize: 12, textAlign: "center", margin: "8px 0 0 0" }}>
            Stops heartbeats. Dashboard will show offline after 30s.
          </p>
        </div>
      ) : (
        <div style={{ width: "100%" }}>
          <button onClick={handleRevive} style={{
            width: "100%", height: 44,
            borderRadius: 5,
            border: "2px solid black",
            background: "#1a7a3a",
            boxShadow: "4px 4px black",
            color: "#fff",
            fontSize: 15, fontWeight: 900, letterSpacing: 2,
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            textTransform: "uppercase",
          }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "rgba(200,255,200,0.7)" }} />
            REVIVE DEVICE
          </button>
          <p style={{ color: "#666", fontSize: 12, textAlign: "center", margin: "8px 0 0 0" }}>
            Heartbeats stopped. Click to reconnect device.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Initialize Device ───────────────────────────────────────────
function InitializeDevice({ onConnect }: { onConnect: (name: string, id: string) => void }) {
  const [deviceName, setDeviceName] = useState("");
  const [hardwareId, setHardwareId] = useState(() => generateId(""));
  const [connecting, setConnecting] = useState(false);
  const [btnActive, setBtnActive] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDeviceName(val);
    setHardwareId(generateId(val));
  };

  const handleConnect = async () => {
    if (!deviceName.trim() || connecting) return;
    setConnecting(true);

    try {
      // THE REAL REGISTRATION API CALL
      const res = await fetch(`${API_BASE}/api/register`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Bypass-Tunnel-Reminder": "true" 
        },
        body: JSON.stringify({
          device_id: hardwareId,
          battery: 52, 
          temperature: 25, 
          status: "online"
        })
      });

      if (res.ok || res.status === 409) {
        // Save to browser memory so it survives refreshes!
        localStorage.setItem("pulse_device_id", hardwareId);
        localStorage.setItem("pulse_device_name", deviceName);
        onConnect(deviceName, hardwareId);
      } else {
        alert("Registration failed on Go Server");
        setConnecting(false);
      }
    } catch (err) {
      console.error(err);
      alert("Network Error. Is the Go server running?");
      setConnecting(false);
    }
  };

  const canSubmit = deviceName.trim() && !connecting;

  const boxStyle = {
    width: "100%",
    height: 40,
    borderRadius: 5,
    border: "2px solid black",
    backgroundColor: "beige",
    boxShadow: "4px 4px black",
    fontSize: 15,
    fontWeight: 600,
    color: "#323232",
    padding: "5px 10px",
    boxSizing: "border-box" as const,
    outline: "none",
    fontFamily: "'Courier New', monospace",
  };

  return (
    <div style={{
      padding: 20,
      background: "lightblue",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      gap: 20,
      borderRadius: 5,
      border: "2px solid black",
      boxShadow: "4px 4px black",
      width: 290,
      boxSizing: "border-box",
    }}>
      {/* Title */}
      <div style={{ marginBottom: 5 }}>
        <div style={{ color: "#323232", fontWeight: 900, fontSize: 20 }}>
          Initialize Device,
        </div>
        <div style={{ color: "#666", fontWeight: 600, fontSize: 17 }}>
          connect to PulseEngine
        </div>
      </div>

      {/* Device Name */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
        <label style={{ color: "#666", fontSize: 13, fontWeight: 600 }}>Device Name</label>
        <input
          style={boxStyle}
          placeholder="e.g., Abhinav-Node"
          value={deviceName}
          onChange={handleNameChange}
        />
      </div>

      {/* Hardware ID */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
        <label style={{ color: "#666", fontSize: 13, fontWeight: 600 }}>Generated Hardware ID</label>
        <div style={{ ...boxStyle, color: "#1a7a3a", display: "flex", alignItems: "center", letterSpacing: "0.5px" }}>
          {hardwareId}
        </div>
      </div>

      {/* Button */}
      <button
        onClick={handleConnect}
        onMouseDown={() => canSubmit && setBtnActive(true)}
        onMouseUp={() => setBtnActive(false)}
        onMouseLeave={() => setBtnActive(false)}
        disabled={!canSubmit}
        style={{
          marginTop: 30,
          width: "100%",
          height: 40,
          borderRadius: 5,
          border: "2px solid black",
          backgroundColor: "beige",
          boxShadow: btnActive ? "0px 0px black" : "4px 4px black",
          transform: btnActive ? "translate(3px, 3px)" : "none",
          fontSize: 15,
          fontWeight: 600,
          color: "#323232",
          cursor: canSubmit ? "pointer" : "not-allowed",
          opacity: canSubmit ? 1 : 0.45,
          whiteSpace: "nowrap",
          transition: "box-shadow 0.08s, transform 0.08s",
          boxSizing: "border-box",
        }}
      >
        {connecting ? "Connecting..." : "Connect to PulseEngine →"}
      </button>
    </div>
  );
}

// ─── Root ────────────────────────────────────────────────────────
export default function App() {
  const [connected, setConnected] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [hardwareId, setHardwareId] = useState("");
  const [isMounted, setIsMounted] = useState(false); // Prevents Next.js Hydration Errors

  // Boot Sequence: Check memory to see if already registered
  useEffect(() => {
    setIsMounted(true);
    const savedId = localStorage.getItem("pulse_device_id");
    const savedName = localStorage.getItem("pulse_device_name");
    
    if (savedId && savedName) {
      setDeviceName(savedName);
      setHardwareId(savedId);
      setConnected(true);
    }
  }, []);

  const handleConnect = (name: string, id: string) => {
    setDeviceName(name);
    setHardwareId(id);
    setConnected(true);
  };

  if (!isMounted) return null; // Wait for client-side load

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      backgroundColor: "#e8e8e8",
    }}>
      {connected
        ? <ControlPanel deviceName={deviceName} hardwareId={hardwareId} />
        : <InitializeDevice onConnect={handleConnect} />
      }
      
      {/* Hidden Emergency Reset Button for Testing */}
      {connected && (
          <button 
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            style={{ position: 'absolute', bottom: 20, right: 20, fontSize: 12, color: '#999', cursor: 'pointer', background: 'none', border: 'none' }}
          >
            Reset Device
          </button>
      )}
    </div>
  );
}