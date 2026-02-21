"use client";

import { useState, useEffect, useRef, CSSProperties } from "react";

// 🔌 CONFIGURE YOUR BACKEND URL HERE
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

const generateId = (name: string) => {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  const suffix = Array.from({ length: 4 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
  const prefix = name?.trim().split(/\s+/)[0].slice(0, 8) || "Node";
  return `${prefix}-${suffix}`;
};

const getTime = () => new Date().toTimeString().slice(0, 8);

// ─── Theme Setup ───────────────────────────────────────────────
interface ThemeTokens {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  borderHov: string;
  text: string;
  muted: string;
  navBg: string;
  cardShadow: string;
  cardShadowHov: string;
}

const accent = { online: "#22c55e", offline: "#ef4444", warning: "#f59e0b", primary: "#6366f1", cyan: "#06b6d4" };

interface ThemeProps {
  t: ThemeTokens;
  dark: boolean;
}

// ─── Control Panel ───────────────────────────────────────────────
function ControlPanel({ deviceName, hardwareId, t, dark }: { deviceName: string, hardwareId: string } & ThemeProps) {
  const [battery, setBattery] = useState(52);
  const [temp, setTemp] = useState(25);
  const [online, setOnline] = useState(true);
  const [lastPulse, setLastPulse] = useState("Waiting...");
  const [killed, setKilled] = useState(false);
  
  const pulseRef = useRef<NodeJS.Timeout | null>(null);

  // Store latest slider values in a ref so setInterval always sees the newest data
  const stateRef = useRef({ battery, temp });
  useEffect(() => {
    stateRef.current = { battery, temp };
  }, [battery, temp]);

  const sendPulse = async () => {
    try {
      await fetch(`${API_BASE}/api/heartbeat`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Bypass-Tunnel-Reminder": "true" 
        },
        body: JSON.stringify({
          device_id: hardwareId,
          battery: stateRef.current.battery,
          temperature: stateRef.current.temp,
          status: online ? "online" : "offline" // 👈 Explicitly send the status!
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

  const isHot = temp >= 80;
  const isLowBat = battery <= 20;

  return (
    <div style={{
      background: t.surface,
      border: `1px solid ${t.border}`,
      borderRadius: 16,
      boxShadow: t.cardShadow,
      width: "100%",
      maxWidth: 420,
      padding: "1.75rem",
      animation: "fadeUp 0.6s ease both 0.1s",
      display: "flex",
      flexDirection: "column",
      gap: "1.5rem"
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #6366f1, #06b6d4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 14px rgba(99,102,241,0.3)",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: t.text }}>Simulator</div>
            <div style={{ fontSize: 12, color: t.muted }}>Control Panel</div>
          </div>
        </div>
        
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          border: `1px solid ${online ? accent.online : accent.offline}40`, borderRadius: 20,
          padding: "4px 12px", fontSize: 12, fontWeight: 600,
          color: online ? accent.online : accent.offline,
          background: online ? (dark ? "rgba(34,197,94,0.1)" : "rgba(34,197,94,0.08)") : (dark ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.08)"),
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: online ? accent.online : accent.offline, animation: online ? "pulse 1.5s infinite" : "none" }} />
          {online ? "Broadcasting" : "Offline"}
        </div>
      </div>

      {/* Device Info Box */}
      <div style={{
        background: t.surface2,
        border: `1px solid ${t.border}`,
        borderRadius: 12,
        padding: "1rem",
        display: "flex", flexDirection: "column", gap: "0.5rem",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: t.muted, fontWeight: 600 }}>Device ID</span>
          <span style={{ fontSize: 13, color: t.text, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{hardwareId}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: t.muted, fontWeight: 600 }}>Name</span>
          <span style={{ fontSize: 13, color: t.text, fontWeight: 600 }}>{deviceName}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: `1px solid ${t.border}` }}>
          <span style={{ fontSize: 12, color: t.muted, fontWeight: 600 }}>Last Pulse</span>
          <span style={{ fontSize: 13, color: accent.primary, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{lastPulse}</span>
        </div>
      </div>

      {/* Battery Slider */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: t.muted, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Battery Level</span>
          <span style={{ color: isLowBat ? accent.offline : accent.online, fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{battery}%</span>
        </div>
        <input type="range" min={0} max={100} value={battery} onChange={e => setBattery(+e.target.value)} className="modern-slider" />
      </div>

      {/* Temp Slider */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: t.muted, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Temperature</span>
          <span style={{ color: isHot ? accent.offline : (temp > 60 ? accent.warning : t.text), fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{temp}°C</span>
        </div>
        <input type="range" min={-20} max={100} value={temp} onChange={e => setTemp(+e.target.value)} className="modern-slider" />
      </div>

      {/* Kill / Revive Button */}
      <div style={{ marginTop: "0.5rem" }}>
        {!killed ? (
          <button onClick={handleKill} style={{
            width: "100%", padding: "12px", borderRadius: 10,
            background: "linear-gradient(135deg, #ef4444, #b91c1c)", border: "none",
            color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 14px rgba(239, 68, 68, 0.4)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "all 0.2s",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
            PULL KILL SWITCH
          </button>
        ) : (
          <button onClick={handleRevive} style={{
            width: "100%", padding: "12px", borderRadius: 10,
            background: "linear-gradient(135deg, #22c55e, #15803d)", border: "none",
            color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 14px rgba(34, 197, 94, 0.4)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "all 0.2s",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            REVIVE DEVICE
          </button>
        )}
        <p style={{ color: t.muted, fontSize: 11, textAlign: "center", marginTop: 12, fontWeight: 500 }}>
          {killed ? "Heartbeats stopped. Dashboard will mark as offline." : "Dashboard expects pulses every 30s to stay online."}
        </p>
      </div>
    </div>
  );
}

// ─── Initialize Device ───────────────────────────────────────────
function InitializeDevice({ onConnect, t }: { onConnect: (name: string, id: string) => void } & ThemeProps) {
  const [deviceName, setDeviceName] = useState("");
  const [hardwareId, setHardwareId] = useState(() => generateId(""));
  const [connecting, setConnecting] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDeviceName(val);
    setHardwareId(generateId(val));
  };

  const handleConnect = async () => {
    if (!deviceName.trim() || connecting) return;
    setConnecting(true);

    try {
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
        localStorage.setItem("pulse_device_id", hardwareId);
        localStorage.setItem("pulse_device_name", deviceName);
        onConnect(deviceName, hardwareId);
      } else {
        alert("Registration failed on server");
        setConnecting(false);
      }
    } catch (err) {
      console.error(err);
      alert("Network Error. Is the server running?");
      setConnecting(false);
    }
  };

  const canSubmit = deviceName.trim() && !connecting;

  const inputStyle: CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    background: t.surface2, border: `1px solid ${t.border}`,
    color: t.text, fontSize: 14, outline: "none",
    transition: "border 0.2s", fontFamily: "inherit"
  };

  return (
    <div style={{
      background: t.surface, border: `1px solid ${t.border}`,
      borderRadius: 16, boxShadow: t.cardShadow,
      width: "100%", maxWidth: 400, padding: "2rem",
      animation: "fadeUp 0.6s ease both 0.1s",
    }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, margin: "0 auto 1rem",
          background: "linear-gradient(135deg, #6366f1, #06b6d4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 20px rgba(99,102,241,0.3)",
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: t.text, marginBottom: 4 }}>Initialize Device</h2>
        <p style={{ fontSize: 13, color: t.muted }}>Connect this simulator to PulseEngine</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div>
          <label style={{ display: "block", color: t.muted, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Device Name</label>
          <input
            style={inputStyle}
            placeholder="e.g., Sensor-Alpha"
            value={deviceName}
            onChange={handleNameChange}
            onFocus={(e) => e.target.style.borderColor = accent.primary}
            onBlur={(e) => e.target.style.borderColor = t.border}
          />
        </div>

        <div>
          <label style={{ display: "block", color: t.muted, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Generated Hardware ID</label>
          <div style={{ ...inputStyle, background: t.surface, color: accent.primary, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
            {hardwareId}
          </div>
        </div>

        <button
          onClick={handleConnect}
          disabled={!canSubmit}
          style={{
            marginTop: "1rem", width: "100%", padding: "12px", borderRadius: 10,
            background: canSubmit ? "linear-gradient(135deg, #6366f1, #06b6d4)" : t.surface2,
            border: canSubmit ? "none" : `1px solid ${t.border}`,
            color: canSubmit ? "white" : t.muted,
            fontSize: 14, fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed",
            boxShadow: canSubmit ? "0 4px 14px rgba(99,102,241,0.4)" : "none",
            transition: "all 0.2s",
          }}
        >
          {connecting ? "Connecting..." : "Link to Dashboard →"}
        </button>
      </div>
    </div>
  );
}

// ─── Root ────────────────────────────────────────────────────────
export default function App() {
  const [dark, setDark] = useState<boolean>(true);
  const [connected, setConnected] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [hardwareId, setHardwareId] = useState("");
  const [isMounted, setIsMounted] = useState(false);

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

  const t: ThemeTokens = {
    bg:        dark ? "#0f1117" : "#f4f6fb",
    surface:   dark ? "#1a1d27" : "#ffffff",
    surface2:  dark ? "#22263a" : "#f0f3fa",
    border:    dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)",
    borderHov: dark ? "rgba(99,102,241,0.5)"  : "rgba(99,102,241,0.4)",
    text:      dark ? "#e2e8f0" : "#1e2130",
    muted:     dark ? "#64748b" : "#94a3b8",
    navBg:     dark ? "rgba(15,17,23,0.85)"   : "rgba(255,255,255,0.85)",
    cardShadow: dark ? "0 4px 24px rgba(0,0,0,0.4)" : "0 4px 24px rgba(0,0,0,0.08)",
    cardShadowHov: dark ? "0 12px 40px rgba(0,0,0,0.6)" : "0 12px 40px rgba(99,102,241,0.12)",
  };

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: ${t.bg}; font-family: 'Plus Jakarta Sans', sans-serif; transition: background 0.3s; }
    @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
    @keyframes slideDown { from { opacity:0; transform:translateY(-16px); } to { opacity:1; transform:translateY(0); } }
    @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
    
    /* Modern Slider Styles */
    .modern-slider {
      -webkit-appearance: none;
      width: 100%; height: 6px; border-radius: 3px;
      background: ${t.surface2}; border: 1px solid ${t.border};
      outline: none; transition: background .2s;
    }
    .modern-slider::-webkit-slider-thumb {
      -webkit-appearance: none; appearance: none;
      width: 16px; height: 16px; border-radius: 50%;
      background: ${accent.primary}; cursor: pointer;
      box-shadow: 0 0 10px rgba(99,102,241,0.5);
    }
    .modern-slider::-moz-range-thumb {
      width: 16px; height: 16px; border-radius: 50%;
      background: ${accent.primary}; cursor: pointer; border: none;
      box-shadow: 0 0 10px rgba(99,102,241,0.5);
    }
  `;

  if (!isMounted) return null;

  return (
    <>
      <style>{css}</style>
      <div style={{ minHeight: "100vh", background: t.bg, color: t.text, display: "flex", flexDirection: "column" }}>
        
        {/* Navbar */}
        <nav style={{
          display: "flex", alignItems: "center", padding: "0 1.5rem", height: 56,
          background: t.navBg, backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${t.border}`,
          position: "sticky", top: 0, zIndex: 100,
          animation: "slideDown 0.5s ease both",
          justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: "linear-gradient(135deg, #6366f1, #06b6d4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 14px rgba(99,102,241,0.4)",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em", color: t.text }}>PulseEngine <span style={{ color: t.muted, fontWeight: 500 }}>| Simulator</span></span>
          </div>

          <button onClick={() => setDark(d => !d)} style={{
            width: 36, height: 36, borderRadius: 10, border: `1px solid ${t.border}`,
            background: t.surface2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, transition: "all 0.2s", color: t.text
          }}>
            {dark ? "☀️" : "🌙"}
          </button>
        </nav>

        {/* Main Content */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", flex: 1, padding: "2rem"
        }}>
          {connected
            ? <ControlPanel deviceName={deviceName} hardwareId={hardwareId} t={t} dark={dark} />
            : <InitializeDevice onConnect={handleConnect} t={t} dark={dark} />
          }
        </div>

        {/* Emergency Reset Button */}
        {connected && (
          <button 
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            style={{ 
              position: 'fixed', bottom: 20, right: 20, fontSize: 12, fontWeight: 600, 
              color: t.muted, cursor: 'pointer', background: t.surface2, 
              border: `1px solid ${t.border}`, borderRadius: 8, padding: "6px 12px",
              boxShadow: t.cardShadow
            }}
          >
            Reset Simulator
          </button>
        )}
      </div>
    </>
  );
}