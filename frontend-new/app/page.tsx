"use client"

import { useState, useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";; 

interface Device {
  device_id: string;
  battery: number;
  temperature: number;
  status: string;
  updated_at: string; 
}

export default function Dashboard() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchFleet = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/devices`, {
            headers: { "Bypass-Tunnel-Reminder": "true" } // Bypasses Localtunnel warnings
        });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setDevices(data);
        setError(false);
      } catch (err) {
        console.error("Dashboard Fetch Error:", err);
        setError(true);
      }
    };

    fetchFleet(); 
    const interval = setInterval(fetchFleet, 3000); 
    return () => clearInterval(interval);
  }, []);

  const total = devices.length;
  const online = devices.filter(d => d.status === "online").length;
  const offline = total - online;

  const boxStyle = {
    border: "2px solid black",
    boxShadow: "4px 4px black",
    borderRadius: 5,
    boxSizing: "border-box" as const,
  };

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#e8e8e8",
      padding: "40px 20px",
      fontFamily: "sans-serif",
      color: "#323232"
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 20,
          marginBottom: 40,
          paddingBottom: 20,
          borderBottom: "4px solid black"
        }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 900, margin: "0 0 5px 0", letterSpacing: "-1px" }}>
              FLEET COMMAND
            </h1>
            <p style={{ color: "#666", margin: 0, fontWeight: 600 }}>
              Live B2B Telemetry & Shock-Absorber Status
            </p>
          </div>

          <div style={{ display: "flex", gap: 15 }}>
            <div style={{ ...boxStyle, backgroundColor: "beige", padding: "10px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#666", textTransform: "uppercase" }}>Total Nodes</div>
              <div style={{ fontSize: 24, fontWeight: 900, fontFamily: "'Courier New', monospace" }}>{total}</div>
            </div>
            <div style={{ ...boxStyle, backgroundColor: "#e6ffe6", padding: "10px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#1a7a3a", textTransform: "uppercase" }}>Online</div>
              <div style={{ fontSize: 24, fontWeight: 900, fontFamily: "'Courier New', monospace", color: "#1a7a3a" }}>{online}</div>
            </div>
            <div style={{ ...boxStyle, backgroundColor: "#ffe6e6", padding: "10px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#cc2200", textTransform: "uppercase" }}>Offline</div>
              <div style={{ fontSize: 24, fontWeight: 900, fontFamily: "'Courier New', monospace", color: "#cc2200" }}>{offline}</div>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ ...boxStyle, backgroundColor: "#ffcccc", padding: 15, marginBottom: 30, color: "#cc2200", fontWeight: 700 }}>
            ⚠️ ERROR: Cannot connect to Go ingestion server. Check backend terminal.
          </div>
        )}

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 25
        }}>
          {devices.map(device => {
            const isOnline = device.status === "online";
            const pingTime = new Date(device.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            return (
              <div key={device.device_id} style={{
                ...boxStyle,
                backgroundColor: isOnline ? "lightblue" : "#d9d9d9",
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 15,
                opacity: isOnline ? 1 : 0.7,
                transition: "all 0.3s ease"
              }}>
                
                {/* Card Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 900, fontSize: 18, fontFamily: "'Courier New', monospace", maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {device.device_id}
                  </div>
                  
                  {/* Status Pill */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6,
                    border: "2px solid black",
                    borderRadius: 20, padding: "3px 10px",
                    backgroundColor: "beige",
                    boxShadow: "2px 2px black",
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      backgroundColor: isOnline ? "#00cc55" : "#cc2200",
                      boxShadow: isOnline ? "0 0 6px #00cc55" : "none",
                    }} />
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#323232", textTransform: "uppercase" }}>
                      {isOnline ? "Online" : "Dead"}
                    </span>
                  </div>
                </div>

                <div style={{
                  border: "2px solid black",
                  backgroundColor: "beige",
                  borderRadius: 5,
                  padding: "10px 14px",
                  fontFamily: "'Courier New', monospace",
                  fontSize: 14,
                  lineHeight: 1.8,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#666", fontWeight: 700 }}>BATTERY:</span>
                    <span style={{ color: device.battery <= 20 ? "#cc2200" : "#323232", fontWeight: 900 }}>
                      {device.battery}%
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#666", fontWeight: 700 }}>TEMP:</span>
                    <span style={{ color: device.temperature >= 80 ? "#cc7700" : "#323232", fontWeight: 900 }}>
                      {device.temperature}°C
                    </span>
                  </div>
                </div>

                <div style={{ borderTop: "2px solid black", paddingTop: 10, marginTop: 5, display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700 }}>
                  <span style={{ color: "#666" }}>LAST HEARTBEAT:</span>
                  <span style={{ color: isOnline ? "#1a7a3a" : "#cc2200", fontFamily: "'Courier New', monospace" }}>
                    {pingTime}
                  </span>
                </div>

              </div>
            );
          })}

          {devices.length === 0 && !error && (
            <div style={{
              ...boxStyle,
              gridColumn: "1 / -1",
              backgroundColor: "beige",
              padding: 40,
              textAlign: "center",
              borderStyle: "dashed",
            }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#666" }}>NO DEVICES CONNECTED</div>
              <div style={{ fontSize: 14, color: "#888", marginTop: 5 }}>Awaiting first telemetry ping from ingestion server...</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}