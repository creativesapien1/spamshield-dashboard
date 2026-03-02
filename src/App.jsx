import { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Legend
} from "recharts";
import {
  Shield, PhoneOff, AlertTriangle, Users, Activity, Search,
  ChevronRight, Radio, Zap, Bell, Eye, TrendingUp, Wifi,
  WifiOff, Menu, X, RefreshCw, Clock, CheckCircle
} from "lucide-react";

// ─── API ──────────────────────────────────────────────────────────────────────
const BASE_URL = "https://spamshield-backend-8cc0.onrender.com";

const api = {
  async checkNumber(number, isInContacts = false) {
    try {
      const res = await fetch(`${BASE_URL}/api/check-number`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number, is_in_contacts: isInContacts, call_time: new Date().toISOString() })
      });
      return res.json();
    } catch { return null; }
  },
  async reportSpam(number, category, durationSeconds = 30) {
    try {
      const res = await fetch(`${BASE_URL}/api/report-spam`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number, reported_by: "dashboard-user", category, call_duration_seconds: durationSeconds, call_time: new Date().toISOString() })
      });
      return res.json();
    } catch { return null; }
  },
  async getStats() {
    try { const res = await fetch(`${BASE_URL}/api/stats`); return res.json(); } catch { return null; }
  },
  async getRecentReports(limit = 20) {
    try { const res = await fetch(`${BASE_URL}/api/recent-reports?limit=${limit}`); return res.json(); } catch { return null; }
  }
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CAT_COLORS = {
  loan: "#f97316", bank: "#3b82f6", insurance: "#22c55e",
  investment: "#a855f7", scam: "#ef4444", other: "#64748b"
};

const CAT_LABELS = {
  loan: "Loan / Finance", bank: "Bank / Credit Card",
  insurance: "Insurance", investment: "Investment",
  scam: "Scam / Fraud", other: "Other"
};

const HOURLY_TREND = [
  { time: "6am", calls: 8 }, { time: "8am", calls: 42 },
  { time: "10am", calls: 138 }, { time: "12pm", calls: 195 },
  { time: "2pm", calls: 215 }, { time: "4pm", calls: 182 },
  { time: "6pm", calls: 94 }, { time: "8pm", calls: 31 },
  { time: "10pm", calls: 7 },
];

const WEEKLY = [
  { day: "Mon", blocked: 340, screened: 120 },
  { day: "Tue", blocked: 290, screened: 98 },
  { day: "Wed", blocked: 410, screened: 145 },
  { day: "Thu", blocked: 380, screened: 130 },
  { day: "Fri", blocked: 460, screened: 167 },
  { day: "Sat", blocked: 190, screened: 60 },
  { day: "Sun", blocked: 110, screened: 40 },
];

const EMPTY_STATS = {
  total_numbers_tracked: 0, confirmed_spam_numbers: 0,
  total_community_reports: 0, total_audio_analyses: 0,
  spam_categories: {}
};

const TABS = [
  { id: "overview",  icon: <Activity size={16} />,   label: "Overview" },
  { id: "checker",   icon: <Search size={16} />,      label: "Number Check" },
  { id: "feed",      icon: <Radio size={16} />,       label: "Live Feed" },
  { id: "report",    icon: <Bell size={16} />,        label: "Report Spam" },
  { id: "analytics", icon: <TrendingUp size={16} />,  label: "Analytics" },
];

// ─── SMALL REUSABLE COMPONENTS ────────────────────────────────────────────────
function PulseDot({ color = "#22c55e", size = 10 }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", width: size, height: size, flexShrink: 0 }}>
      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color, opacity: 0.4, animation: "ping 1.5s ease infinite" }} />
      <span style={{ width: size, height: size, borderRadius: "50%", background: color, display: "block" }} />
    </span>
  );
}

function ScoreBadge({ score }) {
  const color = score >= 0.7 ? "#ef4444" : score >= 0.4 ? "#f97316" : "#22c55e";
  const label = score >= 0.7 ? "HIGH" : score >= 0.4 ? "MED" : "LOW";
  return (
    <span style={{
      background: color + "20", color, border: `1px solid ${color}50`,
      borderRadius: 4, padding: "3px 8px", fontSize: 11,
      fontFamily: "monospace", fontWeight: 700, letterSpacing: 0.5, whiteSpace: "nowrap"
    }}>{label} · {Math.round(score * 100)}%</span>
  );
}

function StatCard({ label, value, icon, color, subtitle }) {
  return (
    <div style={{
      background: "#0d1424", border: "1px solid #1a2332",
      borderTop: `3px solid ${color}`, borderRadius: 10,
      padding: "18px 20px", display: "flex", flexDirection: "column", gap: 8
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ color: "#4a5568", fontSize: 11, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase" }}>{label}</span>
        <span style={{ color, opacity: 0.8 }}>{icon}</span>
      </div>
      <div style={{ color: "#f1f5f9", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 32, lineHeight: 1 }}>{value}</div>
      {subtitle && <div style={{ color: "#2d3748", fontSize: 10, fontFamily: "monospace" }}>{subtitle}</div>}
    </div>
  );
}

function SectionHeader({ icon, title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <span style={{ color: "#4a5568" }}>{icon}</span>
      <span style={{ color: "#2d3748", fontSize: 10, fontFamily: "monospace", letterSpacing: 2, textTransform: "uppercase" }}>{title}</span>
    </div>
  );
}

const ttStyle = {
  contentStyle: { background: "#0d1424", border: "1px solid #1a2332", borderRadius: 8, color: "#f1f5f9", fontSize: 12 },
  itemStyle: { color: "#94a3b8" }
};

// ─── OVERVIEW ─────────────────────────────────────────────────────────────────
function OverviewTab({ stats, recentReports }) {
  const pieData = Object.entries(stats.spam_categories || {})
    .map(([name, value]) => ({ name, value: value || 0, color: CAT_COLORS[name] || "#6b7280" }))
    .filter(d => d.value > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
        <StatCard label="Numbers Tracked" value={(stats.total_numbers_tracked || 0).toLocaleString()} icon={<Eye size={18} />} color="#3b82f6" subtitle="Unique callers seen" />
        <StatCard label="Confirmed Spam" value={(stats.confirmed_spam_numbers || 0).toLocaleString()} icon={<AlertTriangle size={18} />} color="#ef4444" subtitle="≥5 community reports" />
        <StatCard label="Community Reports" value={(stats.total_community_reports || 0).toLocaleString()} icon={<Users size={18} />} color="#f97316" subtitle="Submitted by users" />
        <StatCard label="Audio Analyses" value={(stats.total_audio_analyses || 0).toLocaleString()} icon={<Zap size={18} />} color="#a855f7" subtitle="Whisper STT scans" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
        <div style={card}>
          <SectionHeader icon={<Activity size={14} />} title="Spam Volume Today (IST)" />
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={HOURLY_TREND}>
              <CartesianGrid stroke="#1a2332" strokeDasharray="4 4" />
              <XAxis dataKey="time" tick={{ fill: "#4a5568", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#4a5568", fontSize: 11 }} axisLine={false} tickLine={false} width={35} />
              <Tooltip {...ttStyle} />
              <Line type="monotone" dataKey="calls" stroke="#ef4444" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "#ef4444", stroke: "#0d1424", strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={card}>
          <SectionHeader icon={<AlertTriangle size={14} />} title="Spam by Category" />
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} stroke="transparent" />)}
                  </Pie>
                  <Tooltip {...ttStyle} formatter={(v, n) => [v, CAT_LABELS[n] || n]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
                {pieData.map(({ name, value, color }) => (
                  <div key={name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                    <span style={{ color: "#4a5568", fontSize: 11 }}>{CAT_LABELS[name] || name}: <span style={{ color }}>{value}</span></span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ color: "#2d3748", fontSize: 12, textAlign: "center", padding: "40px 0" }}>No category data yet</div>
          )}
        </div>
      </div>

      <div style={card}>
        <SectionHeader icon={<PhoneOff size={14} />} title="Recent Community Reports" />
        {recentReports.length === 0 ? (
          <div style={{ color: "#2d3748", fontSize: 12, textAlign: "center", padding: "30px 0" }}>No reports yet — be the first to report!</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 480 }}>
              <thead>
                <tr>
                  {["Phone Number", "Category", "Duration", "Reported At"].map(h => (
                    <th key={h} style={{ color: "#2d3748", fontFamily: "monospace", fontSize: 10, letterSpacing: 1, textAlign: "left", padding: "8px 12px", borderBottom: "1px solid #1a2332", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentReports.slice(0, 8).map((item, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #0f172a" }}>
                    <td style={{ padding: "10px 12px", color: "#94a3b8", fontFamily: "monospace" }}>{item.number}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ background: (CAT_COLORS[item.category] || "#6b7280") + "20", color: CAT_COLORS[item.category] || "#6b7280", border: `1px solid ${CAT_COLORS[item.category] || "#6b7280"}40`, borderRadius: 4, padding: "2px 8px", fontSize: 10, fontFamily: "monospace", textTransform: "uppercase" }}>
                        {item.category}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", color: "#4a5568", fontFamily: "monospace" }}>{item.duration}s</td>
                    <td style={{ padding: "10px 12px", color: "#2d3748", fontFamily: "monospace", fontSize: 11 }}>
                      {new Date(item.time).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "short", timeStyle: "short" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── NUMBER CHECKER ───────────────────────────────────────────────────────────
function CheckerTab() {
  const [number, setNumber] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const checkNumber = async () => {
    if (!number.trim()) return;
    setLoading(true); setResult(null); setError("");
    const data = await api.checkNumber(number.trim());
    if (data && data.spam_score !== undefined) setResult(data);
    else setError("Could not reach server. Please try again.");
    setLoading(false);
  };

  const riskColor = result ? (result.risk_level === "HIGH" ? "#ef4444" : result.risk_level === "MEDIUM" ? "#f97316" : "#22c55e") : "#3b82f6";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={card}>
          <SectionHeader icon={<Search size={14} />} title="Scan a Number" />
          <p style={{ color: "#4a5568", fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
            Enter any Indian mobile number to check its spam probability against our live community database.
          </p>
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <input value={number} onChange={e => setNumber(e.target.value)} onKeyDown={e => e.key === "Enter" && checkNumber()}
              placeholder="+91-XXXXX-XXXXX" style={{ ...inputStyle, flex: 1 }} />
            <button onClick={checkNumber} disabled={loading || !number.trim()} style={{ ...btnStyle, minWidth: 80, opacity: loading || !number.trim() ? 0.5 : 1, cursor: loading || !number.trim() ? "not-allowed" : "pointer" }}>
              {loading ? <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> : "SCAN"}
            </button>
          </div>

          {error && <div style={{ color: "#ef4444", background: "#ef444410", border: "1px solid #ef444430", borderRadius: 6, padding: "10px 14px", fontSize: 12, fontFamily: "monospace" }}>❌ {error}</div>}

          {result && (
            <div style={{ border: `1px solid ${riskColor}30`, borderLeft: `4px solid ${riskColor}`, borderRadius: 8, padding: 16, background: riskColor + "08", animation: "fadeIn 0.3s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ color: "#64748b", fontSize: 12, fontFamily: "monospace" }}>{result.number}</span>
                <ScoreBadge score={result.spam_score} />
              </div>
              <div style={{ color: riskColor, fontWeight: 700, fontSize: 14, marginBottom: 12 }}>{result.recommendation}</div>
              <div style={{ borderTop: "1px solid #1a2332", paddingTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                {result.reasons && result.reasons.map((r, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <ChevronRight size={12} color="#4a5568" style={{ marginTop: 2, flexShrink: 0 }} />
                    <span style={{ color: "#64748b", fontSize: 12, lineHeight: 1.5 }}>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={card}>
        <SectionHeader icon={<Zap size={14} />} title="Scoring Guide" />
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {[
            ["Not in your contacts", "+20%", "#3b82f6", "Unknown numbers start with base suspicion"],
            ["Calling during peak hours (10am–7pm weekday)", "+15%", "#f97316", "Most spam calls happen in business hours"],
            ["Community reports (×10% each, max 40%)", "+40%", "#ef4444", "Crowdsourced intelligence from users"],
            ["Short call history (under 30s avg)", "+15%", "#a855f7", "Robocall pattern — quick hangups"],
            ["First time this number called", "+10%", "#22c55e", "New unknown numbers get base suspicion"],
          ].map(([label, weight, color, desc]) => (
            <div key={label} style={{ padding: "12px 0", borderBottom: "1px solid #0f172a" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ color: "#94a3b8", fontSize: 13 }}>{label}</span>
                <span style={{ color, fontFamily: "monospace", fontSize: 13, fontWeight: 700, flexShrink: 0, marginLeft: 12 }}>{weight}</span>
              </div>
              <span style={{ color: "#2d3748", fontSize: 11 }}>{desc}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
          {[["LOW", "0–39%", "#22c55e", "Allow"], ["MEDIUM", "40–69%", "#f97316", "Screen"], ["HIGH", "70–100%", "#ef4444", "Block"]].map(([level, range, color, action]) => (
            <div key={level} style={{ flex: 1, background: color + "10", border: `1px solid ${color}30`, borderRadius: 8, padding: "10px", textAlign: "center" }}>
              <div style={{ color, fontWeight: 700, fontSize: 12, fontFamily: "monospace" }}>{level}</div>
              <div style={{ color: "#4a5568", fontSize: 10, margin: "2px 0" }}>{range}</div>
              <div style={{ color: "#2d3748", fontSize: 10 }}>{action}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── LIVE FEED ────────────────────────────────────────────────────────────────
function FeedTab({ recentReports }) {
  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Radio size={14} color="#4a5568" />
          <span style={{ color: "#2d3748", fontSize: 10, fontFamily: "monospace", letterSpacing: 2 }}>COMMUNITY THREAT FEED</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <PulseDot color="#ef4444" />
          <span style={{ color: "#ef4444", fontSize: 10, fontFamily: "monospace" }}>LIVE · AUTO-REFRESH 30s</span>
        </div>
      </div>

      {recentReports.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px 20px" }}>
          <Radio size={36} color="#1a2332" style={{ marginBottom: 16 }} />
          <div style={{ color: "#2d3748", fontSize: 13, fontFamily: "monospace" }}>Waiting for community reports...</div>
          <div style={{ color: "#1a2332", fontSize: 11, marginTop: 8 }}>Reports submitted from the Android app will appear here</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {recentReports.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 8, background: "#060b14", border: "1px solid #1a2332", flexWrap: "wrap" }}>
              <PhoneOff size={14} color={CAT_COLORS[item.category] || "#6b7280"} style={{ flexShrink: 0 }} />
              <span style={{ color: "#94a3b8", fontSize: 12, fontFamily: "monospace", flex: 1, minWidth: 130 }}>{item.number}</span>
              <span style={{ background: (CAT_COLORS[item.category] || "#6b7280") + "20", color: CAT_COLORS[item.category] || "#6b7280", border: `1px solid ${CAT_COLORS[item.category] || "#6b7280"}40`, borderRadius: 4, padding: "3px 10px", fontSize: 10, fontFamily: "monospace", textTransform: "uppercase", flexShrink: 0 }}>
                {CAT_LABELS[item.category] || item.category}
              </span>
              <span style={{ color: "#2d3748", fontSize: 11, fontFamily: "monospace", flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
                <Clock size={10} />
                {new Date(item.time).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "short", timeStyle: "short" })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── REPORT SPAM ──────────────────────────────────────────────────────────────
function ReportTab({ stats, onReportSuccess }) {
  const [number, setNumber] = useState("");
  const [category, setCategory] = useState("loan");
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!number.trim()) { setMsg({ text: "Please enter a phone number.", type: "error" }); return; }
    setLoading(true); setMsg({ text: "", type: "" });
    const result = await api.reportSpam(number.trim(), category);
    setLoading(false);
    if (result) {
      setMsg({ text: "✓ Report submitted! Thank you for protecting the community.", type: "success" });
      setNumber("");
      onReportSuccess();
      setTimeout(() => setMsg({ text: "", type: "" }), 5000);
    } else {
      setMsg({ text: "✗ Could not submit. Check your connection and try again.", type: "error" });
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
      <div style={card}>
        <SectionHeader icon={<Bell size={14} />} title="Submit Spam Report" />
        <p style={{ color: "#4a5568", fontSize: 13, marginBottom: 20, lineHeight: 1.7 }}>
          Received a promotional or spam call? Report it anonymously below.
          Your report is immediately shared with the entire SpamShield community.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>PHONE NUMBER *</label>
            <input value={number} onChange={e => setNumber(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()}
              placeholder="+91-XXXXX-XXXXX" style={{ ...inputStyle, width: "100%" }} />
          </div>
          <div>
            <label style={labelStyle}>SPAM CATEGORY *</label>
            <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle, width: "100%", cursor: "pointer" }}>
              <option value="loan">🏦 Loan / Finance</option>
              <option value="bank">💳 Bank / Credit Card</option>
              <option value="insurance">🛡️ Insurance</option>
              <option value="investment">📈 Investment / Trading</option>
              <option value="scam">⚠️ Scam / Fraud</option>
              <option value="other">📞 Other Promotional</option>
            </select>
          </div>
          <button onClick={submit} disabled={loading} style={{ ...btnStyle, width: "100%", padding: "14px", fontSize: 13, letterSpacing: 2, opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "SUBMITTING..." : "SUBMIT REPORT"}
          </button>
          {msg.text && (
            <div style={{ color: msg.type === "success" ? "#22c55e" : "#ef4444", background: msg.type === "success" ? "#22c55e10" : "#ef444410", border: `1px solid ${msg.type === "success" ? "#22c55e30" : "#ef444430"}`, borderRadius: 8, padding: "12px 16px", fontSize: 13, fontFamily: "monospace", animation: "fadeIn 0.3s ease" }}>
              {msg.text}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={card}>
          <SectionHeader icon={<Users size={14} />} title="Community Impact" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              [(stats.total_community_reports || 0).toLocaleString(), "Total reports", "#f97316"],
              [(stats.confirmed_spam_numbers || 0).toLocaleString(), "Confirmed spam numbers", "#ef4444"],
              ["5+", "Reports to auto-block", "#3b82f6"],
              ["8", "Languages supported", "#22c55e"],
            ].map(([val, lbl, color]) => (
              <div key={lbl} style={{ background: "#060b14", borderRadius: 8, padding: "14px", border: "1px solid #1a2332" }}>
                <div style={{ color, fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 26 }}>{val}</div>
                <div style={{ color: "#2d3748", fontSize: 11, marginTop: 2 }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...card, borderColor: "#22c55e30" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <CheckCircle size={16} color="#22c55e" />
            <span style={{ color: "#22c55e", fontSize: 12, fontFamily: "monospace" }}>ANONYMOUS & SECURE</span>
          </div>
          <p style={{ color: "#4a5568", fontSize: 12, lineHeight: 1.7, margin: 0 }}>
            Reports never include your personal information. We only store the reported number, category,
            and an anonymous device ID. No names, no contacts, no location.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
function AnalyticsTab({ stats }) {
  const cats = Object.entries(stats.spam_categories || {});
  const maxVal = Math.max(...cats.map(([, v]) => v || 0), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
        <div style={card}>
          <SectionHeader icon={<TrendingUp size={14} />} title="Weekly Blocked vs Screened" />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={WEEKLY} barSize={18} barGap={4}>
              <CartesianGrid stroke="#1a2332" strokeDasharray="4 4" />
              <XAxis dataKey="day" tick={{ fill: "#4a5568", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#4a5568", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip {...ttStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#4a5568", paddingTop: 8 }} />
              <Bar dataKey="blocked" fill="#ef4444" radius={[4, 4, 0, 0]} name="Blocked" />
              <Bar dataKey="screened" fill="#f97316" radius={[4, 4, 0, 0]} name="Screened" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={card}>
          <SectionHeader icon={<Activity size={14} />} title="Hourly Spam Pattern (IST)" />
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={HOURLY_TREND}>
              <CartesianGrid stroke="#1a2332" strokeDasharray="4 4" />
              <XAxis dataKey="time" tick={{ fill: "#4a5568", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#4a5568", fontSize: 11 }} axisLine={false} tickLine={false} width={35} />
              <Tooltip {...ttStyle} />
              <Line type="monotone" dataKey="calls" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "#3b82f6" }} />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ color: "#2d3748", fontSize: 11, marginTop: 8, fontFamily: "monospace" }}>
            📍 Peak: 10am–4pm IST — highest spam activity window
          </div>
        </div>
      </div>

      {cats.length > 0 && (
        <div style={card}>
          <SectionHeader icon={<AlertTriangle size={14} />} title="Live Category Breakdown" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            {cats.map(([name, value]) => (
              <div key={name} style={{ background: "#060b14", borderRadius: 8, padding: 16, border: `1px solid ${CAT_COLORS[name] || "#1a2332"}30` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ color: "#4a5568", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, fontFamily: "monospace" }}>{CAT_LABELS[name] || name}</span>
                  <span style={{ color: CAT_COLORS[name] || "#6b7280", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 26 }}>{(value || 0).toLocaleString()}</span>
                </div>
                <div style={{ height: 6, background: "#1a2332", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${Math.round(((value || 0) / maxVal) * 100)}%`, height: "100%", background: CAT_COLORS[name] || "#6b7280", borderRadius: 3, transition: "width 0.8s ease" }} />
                </div>
                <div style={{ color: "#2d3748", fontSize: 10, marginTop: 6, fontFamily: "monospace" }}>
                  {Math.round(((value || 0) / maxVal) * 100)}% of top category
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [recentReports, setRecentReports] = useState([]);
  const [apiConnected, setApiConnected] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const loadData = useCallback(async (showSpinner = false) => {
    if (showSpinner) setSyncing(true);
    const [liveStats, liveReports] = await Promise.all([api.getStats(), api.getRecentReports(20)]);
    if (liveStats) { setStats(liveStats); setApiConnected(true); setLastSync(new Date()); }
    else setApiConnected(false);
    if (liveReports) setRecentReports(liveReports);
    if (showSpinner) setSyncing(false);
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const detectionRate = stats.total_numbers_tracked > 0
    ? Math.round((stats.confirmed_spam_numbers / stats.total_numbers_tracked) * 100) : 0;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#060b14", fontFamily: "'JetBrains Mono', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow-x: hidden; background: #060b14; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #060b14; }
        ::-webkit-scrollbar-thumb { background: #1a2332; border-radius: 2px; }
        @keyframes ping { 0%,100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(2.2); opacity: 0; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        button:hover:not(:disabled) { opacity: 0.85 !important; }
        input:focus, select:focus { outline: none; border-color: #ef4444 !important; box-shadow: 0 0 0 2px #ef444420; }
        .nav-btn:hover { background: #ef444410 !important; color: #ef4444 !important; }
        .sidebar { transition: transform 0.25s ease; }
        .main-content { margin-left: 240px; }
        .mobile-overlay { display: none; }
        .hamburger { display: none !important; }
        @media (max-width: 900px) {
          .sidebar { position: fixed !important; transform: translateX(-100%); z-index: 50; }
          .sidebar.open { transform: translateX(0); }
          .main-content { margin-left: 0 !important; }
          .mobile-overlay { display: block; }
          .hamburger { display: flex !important; }
        }
      `}</style>

      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div className="mobile-overlay" onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "#000000bb", zIndex: 40 }} />
      )}

      {/* SIDEBAR */}
      <aside className={`sidebar${sidebarOpen ? " open" : ""}`} style={{
        width: 240, background: "#0d1424", borderRight: "1px solid #1a2332",
        display: "flex", flexDirection: "column", height: "100vh",
        position: "fixed", top: 0, left: 0, overflowY: "auto"
      }}>
        {/* LOGO */}
        <div style={{ padding: "22px 20px 18px", borderBottom: "1px solid #1a2332" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #ef4444, #991b1b)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px #ef444440", flexShrink: 0 }}>
              <Shield size={22} color="white" />
            </div>
            <div>
              <div style={{ color: "#f1f5f9", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: 1 }}>
                SPAM<span style={{ color: "#ef4444" }}>SHIELD</span>
              </div>
              <div style={{ color: "#1a2332", fontSize: 9, letterSpacing: 2 }}>v1.0 · INDIA 🇮🇳</div>
            </div>
          </div>
        </div>

        {/* STATUS */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #1a2332" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <PulseDot color={apiConnected ? "#22c55e" : "#ef4444"} />
            <span style={{ color: apiConnected ? "#22c55e" : "#ef4444", fontSize: 10, letterSpacing: 1 }}>
              {apiConnected ? "API CONNECTED" : "API OFFLINE"}
            </span>
          </div>
          <div style={{ color: "#1a2332", fontSize: 9, letterSpacing: 0.5 }}>
            {lastSync ? `Synced ${lastSync.toLocaleTimeString("en-IN")}` : "Connecting..."}
          </div>
        </div>

        {/* NAV */}
        <nav style={{ padding: "12px", flex: 1 }}>
          {TABS.map(({ id, icon, label }) => (
            <button key={id} className="nav-btn" onClick={() => { setActiveTab(id); setSidebarOpen(false); }} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "11px 14px",
              width: "100%", border: "none", cursor: "pointer", borderRadius: 8, marginBottom: 4,
              background: activeTab === id ? "#ef444415" : "transparent",
              borderLeft: activeTab === id ? "3px solid #ef4444" : "3px solid transparent",
              color: activeTab === id ? "#ef4444" : "#4a5568",
              transition: "all 0.15s ease", fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 600, fontSize: 14, letterSpacing: 0.5
            }}>
              {icon} {label}
            </button>
          ))}
        </nav>

        {/* COMMUNITY COUNT */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid #1a2332" }}>
          <div style={{ color: "#1a2332", fontSize: 9, letterSpacing: 1, marginBottom: 6 }}>COMMUNITY REPORTS</div>
          <div style={{ color: "#f1f5f9", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 30, lineHeight: 1 }}>
            {(stats.total_community_reports || 0).toLocaleString()}
          </div>
          <div style={{ color: "#2d3748", fontSize: 10, marginTop: 4 }}>total submissions</div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="main-content" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh", minWidth: 0 }}>
        {/* TOPBAR */}
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 20px", height: 64, background: "#0d1424",
          borderBottom: "1px solid #1a2332", position: "sticky", top: 0, zIndex: 30,
          gap: 12, flexWrap: "wrap"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button className="hamburger" onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "none", color: "#4a5568", cursor: "pointer", padding: 6, borderRadius: 6 }}>
              <Menu size={20} />
            </button>
            <div>
              <div style={{ color: "#f1f5f9", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 17, letterSpacing: 0.5 }}>
                {TABS.find(t => t.id === activeTab)?.label.toUpperCase()}
              </div>
              <div style={{ color: "#2d3748", fontSize: 10 }}>
                {new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "2-digit", month: "short", year: "numeric" })} IST
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
            <button onClick={() => loadData(true)} style={{ background: "none", border: "1px solid #1a2332", borderRadius: 6, color: "#4a5568", cursor: "pointer", padding: "6px 12px", display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontFamily: "monospace" }}>
              <RefreshCw size={12} style={{ animation: syncing ? "spin 1s linear infinite" : "none" }} />
              {syncing ? "Syncing" : "Refresh"}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {apiConnected ? <Wifi size={14} color="#22c55e" /> : <WifiOff size={14} color="#ef4444" />}
              <span style={{ color: apiConnected ? "#22c55e" : "#ef4444", fontSize: 11 }}>{apiConnected ? "Live" : "Offline"}</span>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#ef4444", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 20, lineHeight: 1 }}>{(stats.confirmed_spam_numbers || 0).toLocaleString()}</div>
                <div style={{ color: "#2d3748", fontSize: 9, letterSpacing: 0.5 }}>SPAM NUMS</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#f97316", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 20, lineHeight: 1 }}>{detectionRate}%</div>
                <div style={{ color: "#2d3748", fontSize: 9, letterSpacing: 0.5 }}>DETECTION</div>
              </div>
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main style={{ flex: 1, padding: "24px 20px", overflowX: "hidden" }}>
          {activeTab === "overview"  && <OverviewTab stats={stats} recentReports={recentReports} />}
          {activeTab === "checker"   && <CheckerTab />}
          {activeTab === "feed"      && <FeedTab recentReports={recentReports} />}
          {activeTab === "report"    && <ReportTab stats={stats} onReportSuccess={() => loadData()} />}
          {activeTab === "analytics" && <AnalyticsTab stats={stats} />}
        </main>
      </div>
    </div>
  );
}

// ─── SHARED STYLES ────────────────────────────────────────────────────────────
const card = {
  background: "#0d1424", border: "1px solid #1a2332", borderRadius: 12, padding: "20px"
};
const inputStyle = {
  background: "#060b14", border: "1px solid #1a2332", borderRadius: 8,
  padding: "11px 14px", color: "#94a3b8", fontSize: 13, outline: "none",
  transition: "border-color 0.15s, box-shadow 0.15s", width: "100%"
};
const btnStyle = {
  background: "linear-gradient(135deg, #ef4444, #b91c1c)", border: "none",
  borderRadius: 8, padding: "11px 20px", color: "white", fontSize: 12,
  cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1,
  fontWeight: 600, transition: "opacity 0.15s",
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8
};
const labelStyle = {
  color: "#2d3748", fontSize: 10, letterSpacing: 1.5,
  display: "block", marginBottom: 8, textTransform: "uppercase"
};
