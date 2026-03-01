import { useState, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid
} from "recharts";
import {
  Shield, PhoneOff, AlertTriangle, Users, Activity,
  Search, ChevronRight, Radio, Zap, Bell, Eye, TrendingUp, Wifi, WifiOff
} from "lucide-react";

// ─── API CLIENT ───────────────────────────────────────────────────────────────
const BASE_URL = "https://spamshield-backend-8cc0.onrender.com";

const api = {
  async checkNumber(number, isInContacts = false) {
    try {
      const res = await fetch(`${BASE_URL}/api/check-number`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number,
          is_in_contacts: isInContacts,
          call_time: new Date().toISOString()
        })
      });
      return res.json();
    } catch (e) { return null; }
  },

  async reportSpam(number, category, durationSeconds = 30) {
    try {
      const res = await fetch(`${BASE_URL}/api/report-spam`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number,
          reported_by: "dashboard-user",
          category,
          call_duration_seconds: durationSeconds,
          call_time: new Date().toISOString()
        })
      });
      return res.json();
    } catch (e) { return null; }
  },

  async getStats() {
    try {
      const res = await fetch(`${BASE_URL}/api/stats`);
      return res.json();
    } catch (e) { return null; }
  },

  async getRecentReports(limit = 20) {
    try {
      const res = await fetch(`${BASE_URL}/api/recent-reports?limit=${limit}`);
      return res.json();
    } catch (e) { return null; }
  }
};

// ─── MOCK FALLBACK DATA ───────────────────────────────────────────────────────
const MOCK_STATS = {
  total_numbers_tracked: 0,
  confirmed_spam_numbers: 0,
  total_community_reports: 0,
  total_audio_analyses: 0,
  spam_categories: { bank: 0, loan: 0, insurance: 0, investment: 0, scam: 0 }
};

const MOCK_TREND = [
  { time: "06:00", calls: 12 }, { time: "08:00", calls: 45 },
  { time: "10:00", calls: 134 }, { time: "12:00", calls: 189 },
  { time: "14:00", calls: 210 }, { time: "16:00", calls: 178 },
  { time: "18:00", calls: 98 }, { time: "20:00", calls: 34 },
  { time: "22:00", calls: 9 },
];

const MOCK_WEEKLY = [
  { day: "Mon", blocked: 340, screened: 120 },
  { day: "Tue", blocked: 290, screened: 98 },
  { day: "Wed", blocked: 410, screened: 145 },
  { day: "Thu", blocked: 380, screened: 130 },
  { day: "Fri", blocked: 460, screened: 167 },
  { day: "Sat", blocked: 190, screened: 60 },
  { day: "Sun", blocked: 110, screened: 40 },
];

const CAT_COLORS = {
  loan: "#f97316", bank: "#3b82f6", insurance: "#22c55e",
  investment: "#a855f7", scam: "#ef4444", other: "#64748b", unknown: "#6b7280"
};

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────
function PulseDot({ color = "#22c55e" }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", width: 10, height: 10 }}>
      <span style={{
        position: "absolute", inset: 0, borderRadius: "50%", background: color,
        opacity: 0.4, animation: "ping 1.4s cubic-bezier(0,0,0.2,1) infinite"
      }} />
      <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "block" }} />
    </span>
  );
}

function ScoreBadge({ score }) {
  const color = score >= 0.7 ? "#ef4444" : score >= 0.4 ? "#f97316" : "#22c55e";
  const label = score >= 0.7 ? "HIGH" : score >= 0.4 ? "MED" : "LOW";
  return (
    <span style={{
      background: color + "22", color, border: `1px solid ${color}55`,
      borderRadius: 4, padding: "2px 8px", fontSize: 11,
      fontFamily: "'Courier New', monospace", fontWeight: 700, letterSpacing: 1
    }}>{label} {Math.round(score * 100)}%</span>
  );
}

// ─── NUMBER CHECKER ───────────────────────────────────────────────────────────
function NumberChecker() {
  const [number, setNumber] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const checkNumber = async () => {
    if (!number.trim()) return;
    setLoading(true);
    setResult(null);
    setError("");
    const data = await api.checkNumber(number.trim());
    if (data) {
      setResult(data);
    } else {
      setError("Could not reach server. Check your connection.");
    }
    setLoading(false);
  };

  const riskColor = result
    ? result.risk_level === "HIGH" ? "#ef4444"
      : result.risk_level === "MEDIUM" ? "#f97316" : "#22c55e"
    : "#3b82f6";

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <Search size={14} color="#64748b" />
        <span style={styles.cardTitle}>NUMBER INTELLIGENCE</span>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          value={number}
          onChange={e => setNumber(e.target.value)}
          onKeyDown={e => e.key === "Enter" && checkNumber()}
          placeholder="+91-XXXXX-XXXXX"
          style={{ ...styles.input, flex: 1 }}
        />
        <button onClick={checkNumber} style={styles.btn} disabled={loading}>
          {loading ? "..." : "SCAN"}
        </button>
      </div>

      {error && (
        <div style={{ color: "#ef4444", fontSize: 12, fontFamily: "monospace", marginBottom: 8 }}>
          ❌ {error}
        </div>
      )}

      {result && (
        <div style={{
          border: `1px solid ${riskColor}33`, borderLeft: `3px solid ${riskColor}`,
          borderRadius: 6, padding: 14, background: riskColor + "08",
          animation: "fadeIn 0.3s ease"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ color: "#94a3b8", fontSize: 12, fontFamily: "monospace" }}>{result.number}</span>
            <ScoreBadge score={result.spam_score} />
          </div>
          <div style={{ color: riskColor, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
            {result.recommendation}
          </div>
          <div style={{ borderTop: "1px solid #1e293b", paddingTop: 8 }}>
            {result.reasons && result.reasons.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <ChevronRight size={11} color="#64748b" />
                <span style={{ color: "#64748b", fontSize: 11 }}>{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── LIVE FEED ────────────────────────────────────────────────────────────────
function LiveFeed({ recentReports }) {
  const [feed, setFeed] = useState([]);

  useEffect(() => {
    if (recentReports && recentReports.length > 0) {
      setFeed(recentReports.slice(0, 10).map(r => ({
        number: r.number,
        category: r.category,
        duration: r.duration,
        time: new Date(r.time).toLocaleTimeString("en-IN"),
        score: 0.75
      })));
    }
  }, [recentReports]);

  return (
    <div style={styles.card}>
      <div style={{ ...styles.cardHeader, justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Radio size={14} color="#ef4444" />
          <span style={styles.cardTitle}>LIVE THREAT FEED</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <PulseDot color="#ef4444" />
          <span style={{ color: "#ef4444", fontSize: 10, fontFamily: "monospace" }}>LIVE</span>
        </div>
      </div>

      {feed.length === 0 ? (
        <div style={{ color: "#334155", fontSize: 12, fontFamily: "monospace", padding: "20px 0", textAlign: "center" }}>
          No reports yet — waiting for community data...
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
          {feed.map((item, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 10px", borderRadius: 5,
              border: "1px solid transparent",
            }}>
              <PhoneOff size={12} color={CAT_COLORS[item.category] || "#6b7280"} style={{ flexShrink: 0 }} />
              <span style={{ color: "#94a3b8", fontSize: 11, fontFamily: "monospace", flex: 1 }}>
                {item.number}
              </span>
              <span style={{
                background: (CAT_COLORS[item.category] || "#6b7280") + "22",
                color: CAT_COLORS[item.category] || "#6b7280",
                border: `1px solid ${CAT_COLORS[item.category] || "#6b7280"}44`,
                borderRadius: 3, padding: "1px 6px", fontSize: 10,
                fontFamily: "monospace", textTransform: "uppercase"
              }}>{item.category}</span>
              <span style={{ color: "#475569", fontSize: 10, width: 70, textAlign: "right" }}>{item.time}</span>
              <ScoreBadge score={item.score} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState(MOCK_STATS);
  const [recentReports, setRecentReports] = useState([]);
  const [apiConnected, setApiConnected] = useState(false);
  const [reportNumber, setReportNumber] = useState("");
  const [reportCat, setReportCat] = useState("loan");
  const [reportMsg, setReportMsg] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

  // ── LIVE DATA LOADER ──────────────────────────────────────────────────────
  useEffect(() => {
    const loadLiveData = async () => {
      try {
        const [liveStats, liveReports] = await Promise.all([
          api.getStats(),
          api.getRecentReports(20)
        ]);
        if (liveStats) { setStats(liveStats); setApiConnected(true); }
        if (liveReports) setRecentReports(liveReports);
      } catch (e) {
        setApiConnected(false);
      }
    };
    loadLiveData();
    const interval = setInterval(loadLiveData, 30000);
    return () => clearInterval(interval);
  }, []);

  const pieData = Object.entries(stats.spam_categories || {}).map(([name, value]) => ({
    name, value: value || 0, color: CAT_COLORS[name] || "#6b7280"
  })).filter(d => d.value > 0);

  const detectionRate = stats.total_numbers_tracked > 0
    ? Math.round((stats.confirmed_spam_numbers / stats.total_numbers_tracked) * 100)
    : 0;

  const submitReport = async () => {
    if (!reportNumber.trim()) return;
    setReportLoading(true);
    const result = await api.reportSpam(reportNumber.trim(), reportCat);
    setReportLoading(false);
    if (result) {
      setReportMsg("✓ Report submitted. Thank you for protecting the community!");
      setReportNumber("");
      setTimeout(() => setReportMsg(""), 4000);
      // Refresh stats
      const liveStats = await api.getStats();
      if (liveStats) setStats(liveStats);
    } else {
      setReportMsg("✗ Could not submit. Check your connection.");
      setTimeout(() => setReportMsg(""), 3000);
    }
  };

  return (
    <div style={styles.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0a0f1a; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 2px; }
        @keyframes ping { 0% { transform: scale(1); opacity: 0.4; } 80%,100% { transform: scale(2.5); opacity: 0; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scanline { 0% { top: -2px; } 100% { top: 100%; } }
        button:hover { opacity: 0.85; }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      {/* SCANLINE */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999, overflow: "hidden" }}>
        <div style={{
          position: "absolute", left: 0, right: 0, height: 1,
          background: "linear-gradient(transparent, #3b82f608, transparent)",
          animation: "scanline 10s linear infinite"
        }} />
      </div>

      {/* SIDEBAR */}
      <aside style={styles.sidebar}>
        <div style={{ padding: "24px 20px 28px", borderBottom: "1px solid #0f172a" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: "linear-gradient(135deg, #ef4444, #b91c1c)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 20px #ef444440"
            }}>
              <Shield size={18} color="white" />
            </div>
            <div>
              <div style={{ color: "#f1f5f9", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: 2 }}>
                SPAM<span style={{ color: "#ef4444" }}>SHIELD</span>
              </div>
              <div style={{ color: "#1e293b", fontSize: 9, fontFamily: "monospace", letterSpacing: 2 }}>v1.0 · INDIA</div>
            </div>
          </div>
        </div>

        {/* API STATUS */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #0f172a" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <PulseDot color={apiConnected ? "#22c55e" : "#ef4444"} />
            <span style={{ color: apiConnected ? "#22c55e" : "#ef4444", fontSize: 10, fontFamily: "monospace", letterSpacing: 1 }}>
              {apiConnected ? "API CONNECTED" : "API OFFLINE"}
            </span>
          </div>
          <div style={{ color: "#1e293b", fontSize: 9, fontFamily: "monospace" }}>
            {apiConnected ? "LIVE DATA · SYNCING" : "SHOWING CACHED DATA"}
          </div>
        </div>

        {/* NAV */}
        <nav style={{ padding: "16px 12px", flex: 1 }}>
          {[
            { id: "overview", icon: <Activity size={15} />, label: "OVERVIEW" },
            { id: "checker", icon: <Search size={15} />, label: "NUMBER CHECK" },
            { id: "feed", icon: <Radio size={15} />, label: "LIVE FEED" },
            { id: "report", icon: <Bell size={15} />, label: "REPORT SPAM" },
            { id: "analytics", icon: <TrendingUp size={15} />, label: "ANALYTICS" },
          ].map(({ id, icon, label }) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              ...styles.navBtn,
              background: activeTab === id ? "#ef444412" : "transparent",
              borderLeft: activeTab === id ? "2px solid #ef4444" : "2px solid transparent",
              color: activeTab === id ? "#ef4444" : "#475569",
            }}>
              {icon}
              <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, letterSpacing: 1, fontSize: 12 }}>
                {label}
              </span>
            </button>
          ))}
        </nav>

        {/* BOTTOM STAT */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid #0f172a" }}>
          <div style={{ color: "#1e293b", fontSize: 9, fontFamily: "monospace", marginBottom: 6, letterSpacing: 1 }}>
            COMMUNITY REPORTS
          </div>
          <div style={{ color: "#f1f5f9", fontFamily: "'Rajdhani', sans-serif", fontSize: 26, fontWeight: 700 }}>
            {(stats.total_community_reports || 0).toLocaleString()}
          </div>
          <div style={{ color: "#334155", fontSize: 10 }}>total submissions</div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={styles.main}>
        {/* TOPBAR */}
        <div style={styles.topbar}>
          <div>
            <div style={{ color: "#f1f5f9", fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, fontSize: 20, letterSpacing: 1 }}>
              {activeTab === "overview" ? "MISSION CONTROL"
                : activeTab === "checker" ? "NUMBER INTELLIGENCE"
                  : activeTab === "feed" ? "LIVE THREAT FEED"
                    : activeTab === "report" ? "COMMUNITY REPORTING"
                      : "ANALYTICS"}
            </div>
            <div style={{ color: "#334155", fontSize: 10, fontFamily: "monospace" }}>
              {new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {apiConnected
                ? <Wifi size={14} color="#22c55e" />
                : <WifiOff size={14} color="#ef4444" />}
              <span style={{ color: apiConnected ? "#22c55e" : "#ef4444", fontSize: 10, fontFamily: "monospace" }}>
                {apiConnected ? "LIVE" : "OFFLINE"}
              </span>
            </div>
            <div style={styles.topStat}>
              <span style={{ color: "#ef4444", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 22 }}>
                {(stats.confirmed_spam_numbers || 0).toLocaleString()}
              </span>
              <span style={{ color: "#475569", fontSize: 10 }}>SPAM NUMBERS</span>
            </div>
            <div style={styles.topStat}>
              <span style={{ color: "#f97316", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 22 }}>
                {detectionRate}%
              </span>
              <span style={{ color: "#475569", fontSize: 10 }}>DETECTION RATE</span>
            </div>
          </div>
        </div>

        {/* ── OVERVIEW ──────────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div style={styles.content}>
            {/* STAT CARDS */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
              {[
                { label: "NUMBERS TRACKED", value: (stats.total_numbers_tracked || 0).toLocaleString(), icon: <Eye size={16} />, color: "#3b82f6" },
                { label: "CONFIRMED SPAM", value: (stats.confirmed_spam_numbers || 0).toLocaleString(), icon: <AlertTriangle size={16} />, color: "#ef4444" },
                { label: "COMMUNITY REPORTS", value: (stats.total_community_reports || 0).toLocaleString(), icon: <Users size={16} />, color: "#f97316" },
                { label: "AUDIO ANALYSES", value: (stats.total_audio_analyses || 0).toLocaleString(), icon: <Zap size={16} />, color: "#a855f7" },
              ].map(({ label, value, icon, color }) => (
                <div key={label} style={{ ...styles.card, borderTop: `2px solid ${color}`, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#334155", fontSize: 10, fontFamily: "monospace", letterSpacing: 1 }}>{label}</span>
                    <span style={{ color }}>{icon}</span>
                  </div>
                  <div style={{ color: "#f1f5f9", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 28 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* CHARTS ROW */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <Activity size={14} color="#64748b" />
                  <span style={styles.cardTitle}>SPAM CALL VOLUME — TODAY (IST)</span>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={MOCK_TREND}>
                    <CartesianGrid stroke="#0f172a" strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fill: "#334155", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#334155", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#0a0f1a", border: "1px solid #1e293b", borderRadius: 6, color: "#f1f5f9", fontSize: 11 }} />
                    <Line type="monotone" dataKey="calls" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#ef4444" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <AlertTriangle size={14} color="#64748b" />
                  <span style={styles.cardTitle}>SPAM CATEGORIES</span>
                </div>
                {pieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={62} dataKey="value" paddingAngle={3}>
                          {pieData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="transparent" />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: "#0a0f1a", border: "1px solid #1e293b", fontSize: 11, color: "#f1f5f9" }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {pieData.map(({ name, color }) => (
                        <div key={name} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
                          <span style={{ color: "#475569", fontSize: 10, textTransform: "capitalize" }}>{name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ color: "#334155", fontSize: 11, fontFamily: "monospace", padding: "30px 0", textAlign: "center" }}>
                    No category data yet
                  </div>
                )}
              </div>
            </div>

            {/* BOTTOM ROW */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <TrendingUp size={14} color="#64748b" />
                  <span style={styles.cardTitle}>THIS WEEK — BLOCKED VS SCREENED</span>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={MOCK_WEEKLY} barSize={16}>
                    <CartesianGrid stroke="#0f172a" strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fill: "#334155", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#334155", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#0a0f1a", border: "1px solid #1e293b", fontSize: 11, color: "#f1f5f9" }} />
                    <Bar dataKey="blocked" fill="#ef4444" radius={[3, 3, 0, 0]} name="Blocked" />
                    <Bar dataKey="screened" fill="#f97316" radius={[3, 3, 0, 0]} name="Screened" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <PhoneOff size={14} color="#64748b" />
                  <span style={styles.cardTitle}>RECENT COMMUNITY REPORTS</span>
                </div>
                {recentReports.length === 0 ? (
                  <div style={{ color: "#334155", fontSize: 11, fontFamily: "monospace", padding: "20px 0", textAlign: "center" }}>
                    No reports yet — be the first to report!
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {recentReports.slice(0, 6).map((item, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #0f172a" }}>
                        <span style={{ color: "#64748b", fontSize: 11, fontFamily: "monospace", flex: 1 }}>{item.number}</span>
                        <span style={{ color: CAT_COLORS[item.category] || "#6b7280", fontSize: 9, fontFamily: "monospace", textTransform: "uppercase", width: 60 }}>{item.category}</span>
                        <span style={{ color: "#334155", fontSize: 10 }}>{item.duration}s</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── NUMBER CHECKER ────────────────────────────────────────────────── */}
        {activeTab === "checker" && (
          <div style={{ ...styles.content, maxWidth: 620 }}>
            <NumberChecker />
            <div style={{ ...styles.card, marginTop: 12 }}>
              <div style={styles.cardHeader}>
                <Zap size={14} color="#64748b" />
                <span style={styles.cardTitle}>HOW THE SCORE IS CALCULATED</span>
              </div>
              {[
                ["Not in contacts", "+20%", "#3b82f6"],
                ["Peak spam hours (10am–7pm weekday)", "+15%", "#f97316"],
                ["Community reports (×10% each, max 40%)", "+40%", "#ef4444"],
                ["Short call history (robocall pattern)", "+15%", "#a855f7"],
                ["First time calling", "+10%", "#22c55e"],
              ].map(([label, weight, color]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #0f172a", alignItems: "center" }}>
                  <span style={{ color: "#64748b", fontSize: 12 }}>{label}</span>
                  <span style={{ color, fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>{weight}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── LIVE FEED ─────────────────────────────────────────────────────── */}
        {activeTab === "feed" && (
          <div style={styles.content}>
            <LiveFeed recentReports={recentReports} />
          </div>
        )}

        {/* ── REPORT SPAM ───────────────────────────────────────────────────── */}
        {activeTab === "report" && (
          <div style={{ ...styles.content, maxWidth: 560 }}>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <Bell size={14} color="#64748b" />
                <span style={styles.cardTitle}>SUBMIT SPAM REPORT</span>
              </div>
              <p style={{ color: "#475569", fontSize: 12, marginBottom: 20, lineHeight: 1.7 }}>
                Received a spam call? Report it anonymously. Your report helps protect
                thousands of other Indian users from the same number.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={styles.label}>PHONE NUMBER</label>
                  <input value={reportNumber} onChange={e => setReportNumber(e.target.value)}
                    placeholder="+91-XXXXX-XXXXX" style={{ ...styles.input, width: "100%" }} />
                </div>
                <div>
                  <label style={styles.label}>SPAM CATEGORY</label>
                  <select value={reportCat} onChange={e => setReportCat(e.target.value)}
                    style={{ ...styles.input, width: "100%", cursor: "pointer" }}>
                    <option value="loan">Loan / Finance</option>
                    <option value="bank">Bank / Credit Card</option>
                    <option value="insurance">Insurance</option>
                    <option value="investment">Investment / Trading</option>
                    <option value="scam">Scam / Fraud</option>
                    <option value="other">Other Promotional</option>
                  </select>
                </div>
                <button onClick={submitReport} disabled={reportLoading} style={{
                  ...styles.btn, width: "100%", padding: "12px",
                  fontSize: 13, fontFamily: "'Rajdhani', sans-serif", letterSpacing: 2
                }}>
                  {reportLoading ? "SUBMITTING..." : "SUBMIT REPORT"}
                </button>
                {reportMsg && (
                  <div style={{
                    color: reportMsg.startsWith("✓") ? "#22c55e" : "#ef4444",
                    background: reportMsg.startsWith("✓") ? "#22c55e10" : "#ef444410",
                    border: `1px solid ${reportMsg.startsWith("✓") ? "#22c55e33" : "#ef444433"}`,
                    borderRadius: 6, padding: "10px 14px", fontSize: 12,
                    fontFamily: "monospace", animation: "fadeIn 0.3s ease"
                  }}>{reportMsg}</div>
                )}
              </div>
            </div>

            <div style={{ ...styles.card, marginTop: 12 }}>
              <div style={styles.cardHeader}>
                <Users size={14} color="#64748b" />
                <span style={styles.cardTitle}>COMMUNITY IMPACT</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  [(stats.total_community_reports || 0).toLocaleString(), "Reports submitted"],
                  [(stats.confirmed_spam_numbers || 0).toLocaleString(), "Numbers confirmed spam"],
                  ["5+", "Reports needed to auto-block"],
                  ["8", "Languages supported"],
                ].map(([val, label]) => (
                  <div key={label} style={{ padding: 12, background: "#0a0f1a", borderRadius: 6 }}>
                    <div style={{ color: "#f97316", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 22 }}>{val}</div>
                    <div style={{ color: "#475569", fontSize: 11 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── ANALYTICS ─────────────────────────────────────────────────────── */}
        {activeTab === "analytics" && (
          <div style={styles.content}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <TrendingUp size={14} color="#64748b" />
                  <span style={styles.cardTitle}>WEEKLY CALL PATTERN</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={MOCK_WEEKLY} barSize={20}>
                    <CartesianGrid stroke="#0f172a" strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fill: "#334155", fontSize: 11, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#334155", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#0a0f1a", border: "1px solid #1e293b", fontSize: 11, color: "#f1f5f9" }} />
                    <Bar dataKey="blocked" fill="#ef4444" radius={[4, 4, 0, 0]} name="Blocked" />
                    <Bar dataKey="screened" fill="#f97316" radius={[4, 4, 0, 0]} name="Screened" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <Activity size={14} color="#64748b" />
                  <span style={styles.cardTitle}>HOURLY SPAM PEAK</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={MOCK_TREND}>
                    <CartesianGrid stroke="#0f172a" strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fill: "#334155", fontSize: 11, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#334155", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#0a0f1a", border: "1px solid #1e293b", fontSize: 11, color: "#f1f5f9" }} />
                    <Line type="monotone" dataKey="calls" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 5, fill: "#3b82f6" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CATEGORY BREAKDOWN */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {Object.entries(stats.spam_categories || {}).map(([name, value]) => (
                <div key={name} style={{ ...styles.card, borderLeft: `3px solid ${CAT_COLORS[name] || "#6b7280"}` }}>
                  <div style={{ color: "#334155", fontSize: 9, fontFamily: "monospace", letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>
                    {name} SPAM
                  </div>
                  <div style={{ color: CAT_COLORS[name] || "#6b7280", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 32 }}>
                    {(value || 0).toLocaleString()}
                  </div>
                  <div style={{ color: "#475569", fontSize: 11 }}>confirmed numbers</div>
                  <div style={{ marginTop: 8, height: 3, borderRadius: 2, background: "#0a0f1a", overflow: "hidden" }}>
                    <div style={{
                      width: `${Math.round(((value || 0) / Math.max(...Object.values(stats.spam_categories || { x: 1 }))) * 100)}%`,
                      height: "100%", background: CAT_COLORS[name] || "#6b7280", borderRadius: 2,
                      transition: "width 0.6s ease"
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = {
  root: { display: "flex", minHeight: "100vh", background: "#060b14", fontFamily: "'JetBrains Mono', monospace" },
  sidebar: {
    width: 220, flexShrink: 0, background: "#080d18",
    borderRight: "1px solid #0f172a", display: "flex",
    flexDirection: "column", position: "sticky", top: 0, height: "100vh",
  },
  navBtn: {
    display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
    width: "100%", border: "none", cursor: "pointer", borderRadius: 5,
    marginBottom: 2, transition: "all 0.15s ease",
  },
  main: { flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" },
  topbar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "16px 24px", borderBottom: "1px solid #0f172a",
    background: "#080d18", position: "sticky", top: 0, zIndex: 10,
  },
  topStat: { display: "flex", flexDirection: "column", alignItems: "flex-end" },
  content: { padding: 20, flex: 1 },
  card: { background: "#080d18", border: "1px solid #0f172a", borderRadius: 8, padding: 16 },
  cardHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 14 },
  cardTitle: { color: "#334155", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1.5 },
  input: {
    background: "#060b14", border: "1px solid #1e293b", borderRadius: 5,
    padding: "9px 12px", color: "#94a3b8", fontSize: 12,
    fontFamily: "'JetBrains Mono', monospace", outline: "none", width: "100%",
  },
  btn: {
    background: "#ef4444", border: "none", borderRadius: 5, padding: "9px 18px",
    color: "white", fontSize: 11, cursor: "pointer",
    fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1,
    fontWeight: 600, transition: "opacity 0.15s", whiteSpace: "nowrap",
  },
  label: { color: "#334155", fontSize: 9, fontFamily: "monospace", letterSpacing: 1.5, display: "block", marginBottom: 6 }
};