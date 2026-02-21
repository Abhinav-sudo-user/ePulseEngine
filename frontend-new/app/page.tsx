"use client";

import { useState, useEffect, CSSProperties } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

interface Device {
  device_id: string;
  battery: number;
  temperature: number;
  status: string;
  updated_at: string;
}

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

interface StatItem {
  label: string;
  val: number;
  color: string;
  bg: string;
  bd: string;
  sub: string;
}

interface HealthItem {
  label: string;
  val: number;
  color: string;
}

// ── Radial ring ───────────────────────────────────────────────────────────────
function RadialRing({ pct, dark, critical }: { pct: number; dark: boolean, critical: boolean }) {
  const size = 110, stroke = 8, r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const [dash, setDash] = useState(0);
  useEffect(() => { 
    const t = setTimeout(() => setDash((pct / 100) * circ), 400); 
    return () => clearTimeout(t); 
  }, [pct, circ]);
  
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <defs>
        <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={critical ? "#ef4444" : "#6366f1"} />
          <stop offset="100%" stopColor={critical ? "#f87171" : "#06b6d4"} />
        </linearGradient>
      </defs>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"} strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="url(#rg)" strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
        style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)" }} />
    </svg>
  );
}

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({ color, seed = 0 }: { color: string; seed?: number }) {
  const bars = Array.from({ length: 16 }, (_, i) => 15 + (Math.sin(i * 0.8 + seed) * 0.5 + 0.5) * 85);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 28, marginTop: 8 }}>
      {bars.map((h, i) => (
        <div key={i} style={{
          flex: 1, height: `${h}%`, borderRadius: 2,
          background: color, opacity: 0.5 + (i / bars.length) * 0.5,
          animation: `barRise 0.5s ease both`, animationDelay: `${i * 25}ms`,
        }} />
      ))}
    </div>
  );
}

// ── Battery bar ───────────────────────────────────────────────────────────────
function BatteryBar({ pct }: { pct: number }) {
  const [w, setW] = useState(0);
  useEffect(() => { 
    const t = setTimeout(() => setW(pct), 300); 
    return () => clearTimeout(t); 
  }, [pct]);
  const color = pct > 60 ? "#22c55e" : pct > 30 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ height: 4, background: "rgba(128,128,128,0.15)", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${w}%`, background: color, borderRadius: 10, transition: "width 1s cubic-bezier(0.4,0,0.2,1)" }} />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [dark, setDark] = useState<boolean>(true);
  const [devices, setDevices] = useState<Device[]>([]);
  const [error, setError] = useState(false);
  
  const [filter, setFilter] = useState<"all" | "online" | "offline" | "warning">("all");
  const [searchQuery, setSearchQuery] = useState(""); 
  const [activeNav, setActiveNav] = useState<string>("Dashboard");
  const [hovered, setHovered] = useState<string | null>(null);
  const [tick, setTick] = useState<number>(0);

  // 🔌 REAL API POLLING LOGIC
  // 🔌 REAL API POLLING LOGIC
  useEffect(() => {
    const fetchFleet = async () => {
      try {
        // 1. Add a timestamp query to the URL so it looks like a brand new request every time
        const res = await fetch(`${API_BASE}/api/devices?t=${Date.now()}`, {
          // 2. Tell Next.js absolutely no caching
          cache: "no-store", 
          headers: { 
            "Bypass-Tunnel-Reminder": "true",
            // 3. Tell the browser absolutely no caching
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache"
          },
        });
        
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setDevices(data || []);
        setError(false);
        setTick(prev => prev + 1);
      } catch (err) {
        console.error("Dashboard Fetch Error:", err);
        setError(true);
      }
    };

    fetchFleet();
    const interval = setInterval(fetchFleet, 3000);
    return () => clearInterval(interval);
  }, []);

  // 🧮 STATS LOGIC
  const total = devices.length;
  const online = devices.filter(d => d.status === "online").length;
  const offline = total - online;
  const warnings = devices.filter(d => d.temperature >= 80 || d.battery <= 20).length;
  const uptime = total > 0 ? Math.round((online / total) * 100) : 100;
  
  const isFleetCritical = total > 0 && (offline / total) >= 0.5;
  
  const filtered = devices.filter(d => {
    let matchesCategory = true;
    if (filter === "online") matchesCategory = d.status === "online";
    if (filter === "offline") matchesCategory = d.status !== "online";
    if (filter === "warning") matchesCategory = d.temperature >= 80 || d.battery <= 20;
    const matchesSearch = d.device_id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // 👉 NEW: Unified Alerts Array (Includes Offline Devices)
  const activeAlerts = devices.filter(d => d.temperature >= 80 || d.battery <= 20 || d.status !== "online");

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

  const accent: Record<string, string> = { online: "#22c55e", offline: "#ef4444", warning: "#f59e0b", primary: "#6366f1", cyan: "#06b6d4" };
  
  const systemStatusColor = error || isFleetCritical ? accent.offline : accent.online;
  const systemStatusText = error ? "Disconnected" : isFleetCritical ? "Error" : "Live";

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: ${t.bg}; font-family: 'Plus Jakarta Sans', sans-serif; }
    @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
    @keyframes slideDown { from { opacity:0; transform:translateY(-16px); } to { opacity:1; transform:translateY(0); } }
    @keyframes barRise { from { transform:scaleY(0); transform-origin:bottom; } to { transform:scaleY(1); } }
    @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
    @keyframes spin { to { transform:rotate(360deg); } }
    @keyframes cardIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 10px; }

    .layout-wrapper { display: flex; flex: 1; flex-direction: row; }
    .sidebar { width: 280px; border-left: 1px solid ${t.border}; padding: 2rem 1.25rem; display: flex; flex-direction: column; gap: 1.25rem; }
    .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.9rem; }
    .top-row-grid { display: grid; grid-template-columns: 1fr; gap: 1.25rem; margin-bottom: 1.25rem; }
    .device-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(265px, 1fr)); gap: 0.9rem; }
    
    @media (max-width: 1024px) {
      .layout-wrapper { flex-direction: column; }
      .sidebar { width: 100%; border-left: none; border-top: 1px solid ${t.border}; flex-direction: row; flex-wrap: wrap; justify-content: center; }
      .sidebar > div { flex: 1; min-width: 250px; }
      .top-row-grid { grid-template-columns: 1fr; }
    }
    
    @media (max-width: 768px) {
      .stat-grid { grid-template-columns: repeat(1, 1fr); }
      .nav-tabs { display: none !important; }
      .nav-search { display: none !important; }
    }
  `;

  const card = (extra: CSSProperties = {}): CSSProperties => ({
    background: t.surface,
    border: `1px solid ${isFleetCritical ? "rgba(239,68,68,0.3)" : t.border}`,
    borderRadius: 16,
    boxShadow: t.cardShadow,
    transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
    ...extra,
  });

  // 🧩 REUSABLE UI BLOCKS
  
  // 1. Alerts Mapped List
  const alertFeedItems = activeAlerts.map(d => {
    const isOffline = d.status !== "online";
    const isHot = d.temperature >= 80;
    const isLowBatt = d.battery <= 20;

    let title = "Warning";
    let color = accent.warning;
    let sub = "";
    let icon = "⚠️";

    if (isOffline) {
      title = "Device Offline";
      color = accent.offline;
      sub = "Connection lost";
      icon = "🔌";
    } else if (isHot) {
      title = "Critical Temperature";
      color = accent.offline;
      sub = `${Math.round(d.temperature)}°C detected`;
      icon = "🔥";
    } else if (isLowBatt) {
      title = "Low Battery";
      color = accent.warning;
      sub = `${Math.round(d.battery)}% remaining`;
      icon = "🔋";
    }

    return (
      <div key={d.device_id} style={{
        background: dark ? `${color}15` : `${color}10`,
        border: `1px solid ${color}40`, borderRadius: 8, padding: "0.6rem 0.8rem",
        display: "flex", justifyContent: "space-between", alignItems: "center"
      }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: color, fontFamily: "'JetBrains Mono', monospace" }}>{d.device_id} - {title}</div>
          <div style={{ fontSize: 11, color: t.muted, marginTop: 2 }}>{sub}</div>
        </div>
        <div style={{ fontSize: 16 }}>{icon}</div>
      </div>
    );
  });

  // 2. Status Banner
  const statusBannerNode = (
    error ? (
      <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.4)", color: "#ef4444", padding: "12px 16px", borderRadius: 12, marginBottom: "1rem", display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
        ⚠️ Backend connection lost. Attempting to reconnect...
      </div>
    ) : isFleetCritical ? (
      <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.5)", color: "#ef4444", padding: "12px 16px", borderRadius: 12, marginBottom: "1rem", display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, animation: "pulse 2s infinite" }}>
        🚨 CRITICAL: {Math.round((offline/total)*100)}% of the fleet is currently OFFLINE. Immediate triage required.
      </div>
    ) : total > 0 ? (
      <div style={{ background: dark ? "rgba(34,197,94,0.08)" : "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.2)", color: accent.online, padding: "12px 16px", borderRadius: 12, marginBottom: "1rem", display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
        ✅ All systems nominal. Fleet operation is stable.
      </div>
    ) : null
  );

  // 3. Fleet Analysis Graph
  const fleetAnalysisNode = (
    <div className="top-row-grid" style={{ animation: "fadeUp 0.6s ease both 0.2s" }}>
      <div style={{ ...card(), padding: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: isFleetCritical ? accent.offline : "linear-gradient(135deg,#6366f1,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="white" stroke="none"><path d="M3 18v-6h3v6H3zm4.5-12v12h3V6h-3zM12 10v8h3v-8h-3zm4.5-3v11h3V7h-3z"/></svg>
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Fleet Analysis</span>
          </div>
        </div>

        <div className="stat-grid">
          {([
            { label: "Online", sub: "active pings", val: online, color: accent.online, bg: dark?"rgba(34,197,94,0.08)":"rgba(34,197,94,0.06)", bd: dark?"rgba(34,197,94,0.2)":"rgba(34,197,94,0.15)" },
            { label: "Offline", sub: "silent devices", val: offline, color: accent.offline, bg: dark?"rgba(239,68,68,0.08)":"rgba(239,68,68,0.06)", bd: dark?"rgba(239,68,68,0.2)":"rgba(239,68,68,0.15)" },
            { label: "Warnings", sub: "anomalies", val: warnings, color: accent.warning, bg: dark?"rgba(245,158,11,0.08)":"rgba(245,158,11,0.06)", bd: dark?"rgba(245,158,11,0.2)":"rgba(245,158,11,0.15)" },
          ] as StatItem[]).map((s, i) => (
            <div key={s.label} style={{
              background: s.bg, border: `1px solid ${s.bd}`,
              borderRadius: 12, padding: "0.9rem",
              animation: `cardIn 0.5s ease both ${i * 70}ms`,
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: s.color, marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: s.color, lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>{s.val}</div>
              <div style={{ fontSize: 11, color: s.color, opacity: 0.6, marginBottom: 2 }}>{s.sub}</div>
              <Sparkline color={s.color} seed={i * 2.1} />
            </div>
          ))}
        </div>

        <div style={{
          marginTop: "0.9rem", border: `1px solid ${t.border}`,
          borderRadius: 10, padding: "0.75rem 1rem",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: t.surface2,
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: t.muted }}>Throughput</span>
          <div>
            <span style={{ fontSize: 22, fontWeight: 700, color: t.text, fontFamily: "'JetBrains Mono', monospace" }}>{(online > 0 ? (online * 0.3) : 0).toFixed(1)}</span>
            <span style={{ fontSize: 11, color: t.muted, marginLeft: 4 }}>req/sec</span>
          </div>
        </div>
      </div>
    </div>
  );

  // 4. Device Fleet Grid
  const deviceFleetNode = (
    <div style={{ animation: "fadeUp 0.6s ease both 0.35s" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.muted} strokeWidth="2" strokeLinecap="round">
            <rect x="2" y="7" width="20" height="15" rx="2"/><path d="M16 2H8l-2 5h12l-2-5z"/>
          </svg>
          <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Device Fleet</span>
          <span style={{ fontSize: 12, color: t.muted }}>({filtered.length} / {total})</span>
        </div>
        
        {/* Filters */}
        <div style={{ display: "flex", gap: 4, background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 10, padding: 4, overflowX: "auto" }}>
          {["all","online","offline","warning"].map(f => (
            <button key={f} onClick={() => setFilter(f as any)} style={{
              padding: "5px 14px", borderRadius: 7, cursor: "pointer", border: "none",
              fontFamily: "inherit", fontSize: 12, fontWeight: 500,
              textTransform: "capitalize",
              background: filter === f ? "#6366f1" : "transparent",
              color: filter === f ? "white" : t.muted,
              transition: "all 0.2s",
            }}>{f}</button>
          ))}
        </div>
      </div>

      <div className="device-grid">
        {filtered.length === 0 ? (
          <div style={{
            gridColumn: "1/-1", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", padding: "4rem",
            border: `1.5px dashed ${t.border}`, borderRadius: 16,
          }}>
            {searchQuery ? (
              <>
                <div style={{ fontSize: 24, marginBottom: 12 }}>🔍</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.muted }}>No devices matching "{searchQuery}"</div>
              </>
            ) : (
              <>
                <div style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${t.border}`, borderTopColor: "#6366f1", animation: "spin 1s linear infinite", marginBottom: 12 }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: t.muted }}>{error ? "Waiting for connection..." : "No devices found"}</div>
              </>
            )}
          </div>
        ) : filtered.map((device, idx) => {
          const isOnline = device.status === "online";
          const isHot = device.temperature >= 80;
          // const pingTime = new Date(device.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          let pingTime = "Unknown";
if (device.updated_at) {
  const parsedDate = new Date(device.updated_at);
  // Check if the date is actually valid before formatting
  if (!isNaN(parsedDate.getTime())) {
    pingTime = parsedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
}
          const isHovered = hovered === device.device_id;

          return (
            <div
              key={device.device_id}
              onMouseEnter={() => setHovered(device.device_id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: t.surface,
                border: `1px solid ${isHovered ? "rgba(99,102,241,0.4)" : t.border}`,
                borderRadius: 14,
                padding: "1.1rem",
                opacity: isOnline ? 1 : 0.55,
                animation: `cardIn 0.45s ease both ${Math.min(idx * 50, 500)}ms`,
                transform: isHovered ? "translateY(-3px)" : "translateY(0)",
                boxShadow: isHovered ? t.cardShadowHov : t.cardShadow,
                transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
                cursor: "default",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.9rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: isOnline
                      ? (dark ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.1)")
                      : (dark ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.08)"),
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={isOnline ? accent.online : accent.offline} strokeWidth="2" strokeLinecap="round">
                      {isOnline
                        ? <><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></>
                        : <><circle cx="12" cy="12" r="10"/><path d="M4.9 4.9l14.2 14.2"/></>}
                    </svg>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: t.text, fontFamily: "'JetBrains Mono', monospace" }}>{device.device_id}</span>
                </div>
                <div style={{
                  display: "flex", alignItems: "center", gap: 5,
                  borderRadius: 20, padding: "3px 10px",
                  background: isOnline ? (dark?"rgba(34,197,94,0.1)":"rgba(34,197,94,0.08)") : (dark?"rgba(239,68,68,0.1)":"rgba(239,68,68,0.07)"),
                  border: `1px solid ${isOnline ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.2)"}`,
                  fontSize: 11, fontWeight: 600,
                  color: isOnline ? accent.online : accent.offline,
                }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: isOnline ? accent.online : accent.offline, animation: isOnline ? "pulse 1.5s infinite" : "none" }} />
                  {isOnline ? "Online" : "Dead"}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: t.muted }}>Battery</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: device.battery > 60 ? accent.online : device.battery > 30 ? accent.warning : accent.offline, fontFamily: "'JetBrains Mono', monospace" }}>
                      {Math.round(device.battery)}%
                    </span>
                  </div>
                  <BatteryBar pct={device.battery} />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: t.muted }}>Temperature</span>
                  <span style={{
                    fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                    color: isHot ? accent.warning : t.text,
                    background: isHot ? (dark?"rgba(245,158,11,0.1)":"rgba(245,158,11,0.08)") : "transparent",
                    padding: isHot ? "2px 7px" : "0",
                    borderRadius: isHot ? 6 : 0,
                    border: isHot ? "1px solid rgba(245,158,11,0.25)" : "none",
                  }}>
                    {Math.round(device.temperature)}°C {isHot ? "↑" : ""}
                  </span>
                </div>

               
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // 5. Fleet Health (Radial Ring)
  const fleetHealthNode = (
    <div style={{ animation: "fadeUp 0.6s ease both 0.3s" }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: t.muted, marginBottom: "0.9rem" }}>Fleet Health</div>
      <div style={{ display: "flex", gap: "0.9rem", alignItems: "center" }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <RadialRing pct={uptime} dark={dark} critical={isFleetCritical} />
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: isFleetCritical ? accent.offline : t.text, fontFamily: "'JetBrains Mono', monospace" }}>{uptime}%</span>
            <span style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: t.muted }}>Uptime</span>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.55rem" }}>
          {([
            { label: "Online", val: online, color: accent.online },
            { label: "Offline", val: offline, color: accent.offline },
            { label: "Warning", val: warnings, color: accent.warning },
          ] as HealthItem[]).map((h) => (
            <div key={h.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: h.color }} />
                <span style={{ fontSize: 12, color: t.muted, fontWeight: 500 }}>{h.label}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: t.text, fontFamily: "'JetBrains Mono', monospace" }}>{h.val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );


  // 6. Stat Cards
  const statCardsNode = (
    <>
      {([
        { label: "Total Devices", val: total, accent: false },
        { label: "Est. Total Pings", val: (online * 42) + (tick * online), accent: true }, 
      ] as { label: string; val: number; accent: boolean }[]).map((s, i) => {
        
        // 1. Generate the card styles
        const cardStyles = card({ animation: `fadeUp 0.6s ease both ${0.4 + i * 0.1}s` });
        
        // 2. Destructure to separate the shorthand 'border' from the rest of the styles
        const { border, ...restCardStyles } = cardStyles as any;

        return (
          <div key={s.label} style={{
            ...restCardStyles,
            padding: "0.9rem 1rem",
            // 3. Apply the individual borders to avoid the shorthand conflict
            borderTop: border,
            borderRight: border,
            borderBottom: border,
            borderLeft: `3px solid ${s.accent ? "#6366f1" : accent.online}`,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: t.muted, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.accent ? "#6366f1" : t.text, fontFamily: "'JetBrains Mono', monospace" }}>{s.val}</div>
          </div>
        );
      })}
    </>
  );

  return (
    <>
      <style>{css}</style>
      <div style={{ minHeight: "100vh", background: t.bg, color: t.text, display: "flex", flexDirection: "column" }}>

        {/* ── NAV ── */}
        <nav style={{
          display: "flex", alignItems: "center", padding: "0 1.5rem", height: 56,
          background: t.navBg, backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${t.border}`,
          position: "sticky", top: 0, zIndex: 100,
          animation: "slideDown 0.5s ease both",
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
            <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em", color: t.text }}>PulseEngine</span>
          </div>

          <div className="nav-tabs" style={{ display: "flex", gap: 4, marginLeft: 24 }}>
            {["Dashboard", "Devices", "Analytics", "Alerts"].map(nav => (
              <button key={nav} onClick={() => setActiveNav(nav)} style={{
                padding: "5px 14px", borderRadius: 8, cursor: "pointer", border: "none",
                fontFamily: "inherit", fontSize: 13, fontWeight: 500,
                background: activeNav === nav ? (dark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.1)") : "transparent",
                color: activeNav === nav ? "#6366f1" : t.muted,
                transition: "all 0.2s",
              }}>{nav}</button>
            ))}
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <div className="nav-search" style={{
              display: "flex", alignItems: "center", gap: 8,
              background: t.surface2, border: `1px solid ${t.border}`,
              borderRadius: 10, padding: "6px 14px", fontSize: 13, color: t.muted,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input 
                type="text" 
                placeholder="Search device ID..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ background: "transparent", border: "none", outline: "none", color: t.text, width: "130px", fontSize: 13, fontFamily: "inherit" }}
              />
            </div>

            {/* Dynamic Live / Error Pill */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              border: `1px solid ${systemStatusColor}40`, borderRadius: 20,
              padding: "4px 12px", fontSize: 12, color: systemStatusColor,
              background: `${systemStatusColor}15`,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: systemStatusColor, animation: "pulse 1.5s infinite" }} />
              {systemStatusText}
            </div>

            <button onClick={() => setDark(d => !d)} style={{
              width: 36, height: 36, borderRadius: 10, border: `1px solid ${t.border}`,
              background: t.surface2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, transition: "all 0.2s",
            }}>
              {dark ? "☀️" : "🌙"}
            </button>
          </div>
        </nav>

        {/* ── CONDITIONAL VIEWS BASE ON NAVBAR ── */}
        <div className="layout-wrapper">
          
          {/* 1. DASHBOARD VIEW (Default) */}
          {activeNav === "Dashboard" && (
            <>
              <main style={{ flex: 1, padding: "2rem 1.75rem", overflowY: "auto" }}>
                {statusBannerNode}
                <div style={{ marginBottom: "1.75rem", animation: "fadeUp 0.6s ease both 0.1s" }}>
                  <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", color: t.text, marginBottom: 4 }}>
                    Good monitoring, <span style={{ background: "linear-gradient(90deg,#6366f1,#06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Fleet.</span>
                  </h1>
                  <p style={{ fontSize: 13, color: t.muted }}>Connect your simulator to start monitoring devices.</p>
                </div>
                {fleetAnalysisNode}
                {deviceFleetNode}
              </main>

              <aside className="sidebar" style={{ background: dark ? "rgba(15,17,23,0.6)" : "rgba(255,255,255,0.6)", backdropFilter: "blur(10px)" }}>
                {fleetHealthNode}
                {statCardsNode}
                {/* Embedded Sidebar Alert Feed */}
                <div style={{ ...card({ animation: "fadeUp 0.6s ease both 0.6s", flex: 1 }), padding: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.9rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ fontSize: 14 }}>⚡</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Alert Feed</span>
                      <div style={{
                        minWidth: 18, height: 18, borderRadius: 9, padding: "0 5px",
                        background: activeAlerts.length > 0 ? accent.offline : (dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"),
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 700,
                        color: activeAlerts.length > 0 ? "white" : t.muted,
                      }}>{activeAlerts.length}</div>
                    </div>
                  </div>
                  {activeAlerts.length === 0 ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: t.muted }}>
                      <span style={{ color: accent.online }}>✓</span> No alerts. All systems nominal.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                      {alertFeedItems}
                    </div>
                  )}
                </div>
              </aside>
            </>
          )}

          {/* 2. DEVICES VIEW */}
          {activeNav === "Devices" && (
            <main style={{ flex: 1, padding: "2rem 1.75rem", overflowY: "auto" }}>
              <div style={{ marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: t.text }}>Device Management</h2>
                <p style={{ fontSize: 13, color: t.muted }}>Monitor, filter, and search your entire connected fleet.</p>
              </div>
              {deviceFleetNode}
            </main>
          )}

          {/* 3. ANALYTICS VIEW */}
          {activeNav === "Analytics" && (
            <main style={{ flex: 1, padding: "2rem 1.75rem", overflowY: "auto" }}>
              <div style={{ marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: t.text }}>System Analytics</h2>
                <p style={{ fontSize: 13, color: t.muted }}>Deep dive into fleet performance and historical data.</p>
              </div>
              
              {fleetAnalysisNode}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', marginTop: '1.25rem' }}>
                <div style={{ ...card(), padding: "1.5rem" }}>
                  {fleetHealthNode}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {statCardsNode}
                </div>
              </div>
            </main>
          )}

          {/* 4. ALERTS VIEW */}
          {activeNav === "Alerts" && (
            <main style={{ flex: 1, padding: "2rem 1.75rem", overflowY: "auto" }}>
              <div style={{ maxWidth: 800, margin: "0 auto" }}>
                <div style={{ marginBottom: "1.5rem" }}>
                  <h2 style={{ fontSize: 24, fontWeight: 700, color: t.text }}>Active Alerts</h2>
                  <p style={{ fontSize: 13, color: t.muted }}>Immediate triage required for the following devices.</p>
                </div>

                <div style={{ ...card(), padding: "1.5rem" }}>
                  {activeAlerts.length === 0 ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: accent.online, fontWeight: 600 }}>
                      ✓ All systems nominal. No active alerts.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {alertFeedItems}
                    </div>
                  )}
                </div>
              </div>
            </main>
          )}

        </div>
      </div>
    </>
  );
}