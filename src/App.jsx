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

const CAT_COLORS = {
  loan: "#f97316", bank: "#3b82f6", insurance: "#22c55e",
  investment: "#a855f7", scam: "#ef4444", other: "#64748b"
};
const CAT_LABELS = {
  loan: "Loan", bank: "Bank", insurance: "Insurance",
  investment: "Investment", scam: "Scam", other: "Other"
};
const HOURLY = [
  { t: "6a", v: 8 }, { t: "8a", v: 42 }, { t: "10a", v: 138 },
  { t: "12p", v: 195 }, { t: "2p", v: 215 }, { t: "4p", v: 182 },
  { t: "6p", v: 94 }, { t: "8p", v: 31 }, { t: "10p", v: 7 },
];
const WEEKLY = [
  { d: "M", b: 340, s: 120 }, { d: "T", b: 290, s: 98 },
  { d: "W", b: 410, s: 145 }, { d: "T", b: 380, s: 130 },
  { d: "F", b: 460, s: 167 }, { d: "S", b: 190, s: 60 },
  { d: "S", b: 110, s: 40 },
];
const EMPTY = {
  total_numbers_tracked: 0, confirmed_spam_numbers: 0,
  total_community_reports: 0, total_audio_analyses: 0,
  spam_categories: {}
};
const TABS = [
  { id: "overview",  icon: <Activity size={15} />,  label: "Overview" },
  { id: "checker",   icon: <Search size={15} />,     label: "Number Check" },
  { id: "feed",      icon: <Radio size={15} />,      label: "Live Feed" },
  { id: "report",    icon: <Bell size={15} />,       label: "Report Spam" },
  { id: "analytics", icon: <TrendingUp size={15} />, label: "Analytics" },
];

function useIsMobile() {
  const [mob, setMob] = useState(window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMob(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mob;
}

function fmt(dt) {
  try {
    return new Date(dt).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata", day: "2-digit",
      month: "short", hour: "2-digit", minute: "2-digit"
    });
  } catch { return dt; }
}

const TT = {
  contentStyle: { background: "#0d1424", border: "1px solid #1a2332", borderRadius: 6, color: "#f1f5f9", fontSize: 11 },
  itemStyle: { color: "#94a3b8" }
};

function PulseDot({ color = "#22c55e" }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8, flexShrink: 0 }}>
      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color, opacity: 0.4, animation: "ping 1.5s ease infinite" }} />
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "block" }} />
    </span>
  );
}

function ScoreBadge({ score }) {
  const color = score >= 0.7 ? "#ef4444" : score >= 0.4 ? "#f97316" : "#22c55e";
  const label = score >= 0.7 ? "HIGH" : score >= 0.4 ? "MED" : "LOW";
  return (
    <span style={{ background: color + "20", color, border: `1px solid ${color}50`, borderRadius: 4, padding: "2px 7px", fontSize: 10, fontFamily: "monospace", fontWeight: 700, whiteSpace: "nowrap" }}>
      {label} {Math.round(score * 100)}%
    </span>
  );
}

function CatPill({ cat }) {
  const color = CAT_COLORS[cat] || "#64748b";
  return (
    <span style={{ background: color + "20", color, border: `1px solid ${color}40`, borderRadius: 4, padding: "2px 7px", fontSize: 10, fontFamily: "monospace", textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {CAT_LABELS[cat] || cat}
    </span>
  );
}

function SecTitle({ icon, title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
      <span style={{ color: "#4a5568", flexShrink: 0 }}>{icon}</span>
      <span style={{ color: "#2d3748", fontSize: 10, fontFamily: "monospace", letterSpacing: 1.5, textTransform: "uppercase" }}>{title}</span>
    </div>
  );
}

function StatCard({ label, value, icon, color, sub }) {
  const mob = useIsMobile();
  return (
    <div style={{ background: "#0d1424", border: "1px solid #1a2332", borderTop: `2px solid ${color}`, borderRadius: 10, padding: mob ? "12px 12px" : "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: mob ? 4 : 8 }}>
        <span style={{ color: "#4a5568", fontSize: mob ? 9 : 10, fontFamily: "monospace", letterSpacing: 0.5, textTransform: "uppercase", lineHeight: 1.3 }}>{label}</span>
        <span style={{ color, opacity: 0.7 }}>{icon}</span>
      </div>
      <div style={{ color: "#f1f5f9", fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: mob ? 22 : 28, lineHeight: 1 }}>{value}</div>
      {sub && !mob && <div style={{ color: "#2d3748", fontSize: 10, fontFamily: "monospace", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function OverviewTab({ stats, reports }) {
  const mob = useIsMobile();
  const pieData = Object.entries(stats.spam_categories || {})
    .map(([n, v]) => ({ name: n, value: v || 0, color: CAT_COLORS[n] || "#6b7280" }))
    .filter(d => d.value > 0);
  const maxV = Math.max(...pieData.map(d => d.value), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(4,1fr)", gap: 10 }}>
        <StatCard label="Tracked" value={(stats.total_numbers_tracked || 0).toLocaleString()} icon={<Eye size={mob ? 13 : 16} />} color="#3b82f6" sub="Unique callers" />
        <StatCard label="Confirmed Spam" value={(stats.confirmed_spam_numbers || 0).toLocaleString()} icon={<AlertTriangle size={mob ? 13 : 16} />} color="#ef4444" sub="≥5 reports" />
        <StatCard label="Reports" value={(stats.total_community_reports || 0).toLocaleString()} icon={<Users size={mob ? 13 : 16} />} color="#f97316" sub="By community" />
        <StatCard label="Audio Scans" value={(stats.total_audio_analyses || 0).toLocaleString()} icon={<Zap size={mob ? 13 : 16} />} color="#a855f7" sub="Whisper STT" />
      </div>

      <div style={CD}>
        <SecTitle icon={<Activity size={13} />} title="Spam Volume Today (IST)" />
        <ResponsiveContainer width="100%" height={mob ? 140 : 180}>
          <LineChart data={HOURLY}>
            <CartesianGrid stroke="#1a2332" strokeDasharray="4 4" />
            <XAxis dataKey="t" tick={{ fill: "#4a5568", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#4a5568", fontSize: 10 }} axisLine={false} tickLine={false} width={26} />
            <Tooltip {...TT} />
            <Line type="monotone" dataKey="v" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#ef4444" }} name="Calls" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {pieData.length > 0 && (
        <div style={CD}>
          <SecTitle icon={<AlertTriangle size={13} />} title="By Category" />
          {mob ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pieData.map(({ name, value, color }) => (
                <div key={name}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ color: "#64748b", fontSize: 12 }}>{CAT_LABELS[name]}</span>
                    <span style={{ color, fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>{value}</span>
                  </div>
                  <div style={{ height: 5, background: "#1a2332", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${Math.round((value / maxV) * 100)}%`, height: "100%", background: color, borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
              <ResponsiveContainer width={180} height={150}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={62} dataKey="value" paddingAngle={3}>
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} stroke="transparent" />)}
                  </Pie>
                  <Tooltip {...TT} formatter={(v, n) => [v, CAT_LABELS[n] || n]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {pieData.map(({ name, value, color }) => (
                  <div key={name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
                    <span style={{ color: "#64748b", fontSize: 12 }}>{CAT_LABELS[name]}</span>
                    <span style={{ color, fontFamily: "monospace", fontSize: 12, fontWeight: 700, marginLeft: "auto", paddingLeft: 12 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={CD}>
        <SecTitle icon={<PhoneOff size={13} />} title="Recent Reports" />
        {reports.length === 0 ? (
          <div style={{ color: "#2d3748", fontSize: 12, textAlign: "center", padding: "20px 0" }}>No reports yet</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {reports.slice(0, 6).map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid #0f172a", flexWrap: "wrap" }}>
                <span style={{ color: "#94a3b8", fontSize: 12, fontFamily: "monospace", flex: 1, minWidth: 110 }}>{r.number}</span>
                <CatPill cat={r.category} />
                <span style={{ color: "#2d3748", fontSize: 10, fontFamily: "monospace", flexShrink: 0 }}>{fmt(r.time)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CheckerTab() {
  const [number, setNumber] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const scan = async () => {
    if (!number.trim()) return;
    setLoading(true); setResult(null); setError("");
    const data = await api.checkNumber(number.trim());
    if (data?.spam_score !== undefined) setResult(data);
    else setError("Could not reach server. Try again.");
    setLoading(false);
  };

  const rc = result ? (result.risk_level === "HIGH" ? "#ef4444" : result.risk_level === "MEDIUM" ? "#f97316" : "#22c55e") : "#3b82f6";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={CD}>
        <SecTitle icon={<Search size={13} />} title="Scan a Number" />
        <p style={{ color: "#4a5568", fontSize: 13, marginBottom: 14, lineHeight: 1.6 }}>
          Check any Indian number against our live community spam database.
        </p>
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <input value={number} onChange={e => setNumber(e.target.value)}
            onKeyDown={e => e.key === "Enter" && scan()}
            placeholder="+91-XXXXX-XXXXX" style={{ ...IN, flex: 1 }} />
          <button onClick={scan} disabled={loading || !number.trim()} style={{ ...BT, minWidth: 72, opacity: loading || !number.trim() ? 0.5 : 1, cursor: loading || !number.trim() ? "not-allowed" : "pointer" }}>
            {loading ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> : "SCAN"}
          </button>
        </div>
        {error && <div style={{ color: "#ef4444", background: "#ef444410", border: "1px solid #ef444430", borderRadius: 6, padding: "10px 12px", fontSize: 12, marginBottom: 10 }}>❌ {error}</div>}
        {result && (
          <div style={{ border: `1px solid ${rc}30`, borderLeft: `4px solid ${rc}`, borderRadius: 8, padding: 14, background: rc + "08", animation: "fadeIn 0.3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
              <span style={{ color: "#64748b", fontSize: 12, fontFamily: "monospace" }}>{result.number}</span>
              <ScoreBadge score={result.spam_score} />
            </div>
            <div style={{ color: rc, fontWeight: 700, fontSize: 13, marginBottom: 10 }}>{result.recommendation}</div>
            <div style={{ borderTop: "1px solid #1a2332", paddingTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              {result.reasons?.map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                  <ChevronRight size={11} color="#4a5568" style={{ marginTop: 2, flexShrink: 0 }} />
                  <span style={{ color: "#64748b", fontSize: 12, lineHeight: 1.5 }}>{r}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        {[["LOW", "0–39%", "#22c55e", "Allow"], ["MEDIUM", "40–69%", "#f97316", "Screen"], ["HIGH", "70–100%", "#ef4444", "Block"]].map(([level, range, color, action]) => (
          <div key={level} style={{ flex: 1, background: color + "10", border: `1px solid ${color}30`, borderRadius: 8, padding: "10px 6px", textAlign: "center" }}>
            <div style={{ color, fontWeight: 700, fontSize: 11, fontFamily: "monospace" }}>{level}</div>
            <div style={{ color: "#4a5568", fontSize: 10, margin: "3px 0" }}>{range}</div>
            <div style={{ color: "#2d3748", fontSize: 10 }}>{action}</div>
          </div>
        ))}
      </div>

      <div style={CD}>
        <SecTitle icon={<Zap size={13} />} title="Scoring Factors" />
        {[
          ["Not in contacts", "+20%", "#3b82f6"],
          ["Peak hours (10am–7pm weekday)", "+15%", "#f97316"],
          ["Community reports (×10%, max 40%)", "+40%", "#ef4444"],
          ["Short call history (<30s avg)", "+15%", "#a855f7"],
          ["First time calling", "+10%", "#22c55e"],
        ].map(([label, weight, color]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid #0f172a", gap: 8 }}>
            <span style={{ color: "#64748b", fontSize: 12 }}>{label}</span>
            <span style={{ color, fontFamily: "monospace", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{weight}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeedTab({ reports }) {
  return (
    <div style={CD}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Radio size={13} color="#4a5568" />
          <span style={{ color: "#2d3748", fontSize: 10, fontFamily: "monospace", letterSpacing: 1.5 }}>COMMUNITY FEED</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <PulseDot color="#ef4444" />
          <span style={{ color: "#ef4444", fontSize: 10, fontFamily: "monospace" }}>LIVE · 30s refresh</span>
        </div>
      </div>
      {reports.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <Radio size={32} color="#1a2332" style={{ marginBottom: 12 }} />
          <div style={{ color: "#2d3748", fontSize: 12 }}>No reports yet</div>
          <div style={{ color: "#1a2332", fontSize: 11, marginTop: 6 }}>Reports from the Android app appear here</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {reports.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: "#060b14", border: "1px solid #1a2332", flexWrap: "wrap" }}>
              <PhoneOff size={13} color={CAT_COLORS[r.category] || "#6b7280"} style={{ flexShrink: 0 }} />
              <span style={{ color: "#94a3b8", fontSize: 12, fontFamily: "monospace", flex: 1, minWidth: 100 }}>{r.number}</span>
              <CatPill cat={r.category} />
              <span style={{ color: "#2d3748", fontSize: 10, fontFamily: "monospace", display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                <Clock size={9} />{fmt(r.time)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportTab({ stats, onSuccess }) {
  const [number, setNumber] = useState("");
  const [cat, setCat] = useState("loan");
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!number.trim()) { setMsg({ text: "Please enter a phone number.", type: "error" }); return; }
    setLoading(true); setMsg({ text: "", type: "" });
    const r = await api.reportSpam(number.trim(), cat);
    setLoading(false);
    if (r) {
      setMsg({ text: "✓ Reported! Thank you for protecting the community.", type: "ok" });
      setNumber(""); onSuccess();
      setTimeout(() => setMsg({ text: "", type: "" }), 5000);
    } else {
      setMsg({ text: "✗ Could not submit. Check your connection.", type: "error" });
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={CD}>
        <SecTitle icon={<Bell size={13} />} title="Submit Spam Report" />
        <p style={{ color: "#4a5568", fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
          Report a spam call anonymously. Shared instantly with the SpamShield community.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={LB}>PHONE NUMBER</label>
            <input value={number} onChange={e => setNumber(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()}
              placeholder="+91-XXXXX-XXXXX" style={{ ...IN, width: "100%" }} />
          </div>
          <div>
            <label style={LB}>SPAM CATEGORY</label>
            <select value={cat} onChange={e => setCat(e.target.value)} style={{ ...IN, width: "100%", cursor: "pointer" }}>
              <option value="loan">🏦 Loan / Finance</option>
              <option value="bank">💳 Bank / Credit Card</option>
              <option value="insurance">🛡️ Insurance</option>
              <option value="investment">📈 Investment / Trading</option>
              <option value="scam">⚠️ Scam / Fraud</option>
              <option value="other">📞 Other Promotional</option>
            </select>
          </div>
          <button onClick={submit} disabled={loading} style={{ ...BT, width: "100%", padding: "13px", fontSize: 13, letterSpacing: 2, opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "SUBMITTING..." : "SUBMIT REPORT"}
          </button>
          {msg.text && (
            <div style={{ color: msg.type === "ok" ? "#22c55e" : "#ef4444", background: msg.type === "ok" ? "#22c55e10" : "#ef444410", border: `1px solid ${msg.type === "ok" ? "#22c55e30" : "#ef444430"}`, borderRadius: 8, padding: "12px 14px", fontSize: 13, animation: "fadeIn 0.3s ease" }}>
              {msg.text}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          [(stats.total_community_reports || 0).toLocaleString(), "Total reports", "#f97316"],
          [(stats.confirmed_spam_numbers || 0).toLocaleString(), "Confirmed spam", "#ef4444"],
          ["5+", "Reports to block", "#3b82f6"],
          ["8", "Languages", "#22c55e"],
        ].map(([val, lbl, color]) => (
          <div key={lbl} style={{ background: "#060b14", borderRadius: 8, padding: "13px 12px", border: "1px solid #1a2332" }}>
            <div style={{ color, fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 22, lineHeight: 1 }}>{val}</div>
            <div style={{ color: "#2d3748", fontSize: 11, marginTop: 4 }}>{lbl}</div>
          </div>
        ))}
      </div>

      <div style={{ ...CD, borderColor: "#22c55e30" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <CheckCircle size={14} color="#22c55e" />
          <span style={{ color: "#22c55e", fontSize: 11, fontFamily: "monospace" }}>ANONYMOUS & SECURE</span>
        </div>
        <p style={{ color: "#4a5568", fontSize: 12, lineHeight: 1.7, margin: 0 }}>
          Only the number, category, and anonymous device ID are stored. No personal info ever.
        </p>
      </div>
    </div>
  );
}

function AnalyticsTab({ stats }) {
  const mob = useIsMobile();
  const cats = Object.entries(stats.spam_categories || {});
  const maxV = Math.max(...cats.map(([, v]) => v || 0), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={CD}>
        <SecTitle icon={<TrendingUp size={13} />} title="Weekly — Blocked vs Screened" />
        <ResponsiveContainer width="100%" height={mob ? 155 : 210}>
          <BarChart data={WEEKLY} barSize={mob ? 11 : 16} barGap={3}>
            <CartesianGrid stroke="#1a2332" strokeDasharray="4 4" />
            <XAxis dataKey="d" tick={{ fill: "#4a5568", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#4a5568", fontSize: 10 }} axisLine={false} tickLine={false} width={26} />
            <Tooltip {...TT} />
            {!mob && <Legend wrapperStyle={{ fontSize: 11, color: "#4a5568" }} />}
            <Bar dataKey="b" fill="#ef4444" radius={[3, 3, 0, 0]} name="Blocked" />
            <Bar dataKey="s" fill="#f97316" radius={[3, 3, 0, 0]} name="Screened" />
          </BarChart>
        </ResponsiveContainer>
        {mob && (
          <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
            {[["Blocked", "#ef4444"], ["Screened", "#f97316"]].map(([l, c]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
                <span style={{ color: "#4a5568", fontSize: 11 }}>{l}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={CD}>
        <SecTitle icon={<Activity size={13} />} title="Hourly Spam Pattern (IST)" />
        <ResponsiveContainer width="100%" height={mob ? 145 : 190}>
          <LineChart data={HOURLY}>
            <CartesianGrid stroke="#1a2332" strokeDasharray="4 4" />
            <XAxis dataKey="t" tick={{ fill: "#4a5568", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#4a5568", fontSize: 10 }} axisLine={false} tickLine={false} width={26} />
            <Tooltip {...TT} />
            <Line type="monotone" dataKey="v" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#3b82f6" }} name="Calls" />
          </LineChart>
        </ResponsiveContainer>
        <div style={{ color: "#2d3748", fontSize: 11, marginTop: 8 }}>📍 Peak: 10am–4pm IST</div>
      </div>

      {cats.length > 0 && (
        <div style={CD}>
          <SecTitle icon={<AlertTriangle size={13} />} title="Live Category Breakdown" />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {cats.map(([name, value]) => (
              <div key={name}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <span style={{ color: "#64748b", fontSize: 12 }}>{CAT_LABELS[name] || name}</span>
                  <span style={{ color: CAT_COLORS[name] || "#6b7280", fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 18 }}>{(value || 0).toLocaleString()}</span>
                </div>
                <div style={{ height: 5, background: "#1a2332", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${Math.round(((value || 0) / maxV) * 100)}%`, height: "100%", background: CAT_COLORS[name] || "#6b7280", borderRadius: 3, transition: "width 0.8s ease" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BottomNav({ active, setActive }) {
  return (
    <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100, background: "#0d1424", borderTop: "1px solid #1a2332", display: "flex", height: 58 }}>
      {TABS.map(({ id, icon, label }) => (
        <button key={id} onClick={() => setActive(id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, background: "none", border: "none", cursor: "pointer", color: active === id ? "#ef4444" : "#2d3748", borderTop: active === id ? "2px solid #ef4444" : "2px solid transparent", transition: "all 0.15s", padding: "4px 2px", fontFamily: "'JetBrains Mono',monospace" }}>
          {icon}
          <span style={{ fontSize: 8, letterSpacing: 0.3, textTransform: "uppercase" }}>{label.split(" ")[0]}</span>
        </button>
      ))}
    </nav>
  );
}

export default function App() {
  const [tab, setTab] = useState("overview");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [stats, setStats] = useState(EMPTY);
  const [reports, setReports] = useState([]);
  const [connected, setConnected] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const mob = useIsMobile();

  const load = useCallback(async (spin = false) => {
    if (spin) setSyncing(true);
    const [s, r] = await Promise.all([api.getStats(), api.getRecentReports(20)]);
    if (s) { setStats(s); setConnected(true); setLastSync(new Date()); }
    else setConnected(false);
    if (r) setReports(r);
    if (spin) setSyncing(false);
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [load]);

  const detRate = stats.total_numbers_tracked > 0
    ? Math.round((stats.confirmed_spam_numbers / stats.total_numbers_tracked) * 100) : 0;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#060b14", fontFamily: "'JetBrains Mono',monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:#060b14;overflow-x:hidden;}
        ::-webkit-scrollbar{width:3px;height:3px;}
        ::-webkit-scrollbar-thumb{background:#1a2332;border-radius:2px;}
        @keyframes ping{0%,100%{transform:scale(1);opacity:0.5;}50%{transform:scale(2.2);opacity:0;}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
        @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
        input:focus,select:focus{outline:none;border-color:#ef4444!important;box-shadow:0 0 0 2px #ef444418;}
        button:hover:not(:disabled){opacity:0.8!important;}
      `}</style>

      {!mob && (
        <aside style={{ width: 220, flexShrink: 0, background: "#0d1424", borderRight: "1px solid #1a2332", display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, height: "100vh", overflowY: "auto", zIndex: 50 }}>
          <div style={{ padding: "20px 18px 16px", borderBottom: "1px solid #1a2332" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg,#ef4444,#991b1b)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px #ef444430", flexShrink: 0 }}>
                <Shield size={20} color="white" />
              </div>
              <div>
                <div style={{ color: "#f1f5f9", fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: 1 }}>SPAM<span style={{ color: "#ef4444" }}>SHIELD</span></div>
                <div style={{ color: "#1a2332", fontSize: 8, letterSpacing: 2 }}>v1.0 · INDIA 🇮🇳</div>
              </div>
            </div>
          </div>
          <div style={{ padding: "11px 18px", borderBottom: "1px solid #1a2332" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
              <PulseDot color={connected ? "#22c55e" : "#ef4444"} />
              <span style={{ color: connected ? "#22c55e" : "#ef4444", fontSize: 10 }}>{connected ? "API CONNECTED" : "OFFLINE"}</span>
            </div>
            <div style={{ color: "#1a2332", fontSize: 9 }}>{lastSync ? `Synced ${lastSync.toLocaleTimeString("en-IN")}` : "Connecting..."}</div>
          </div>
          <nav style={{ padding: "10px", flex: 1 }}>
            {TABS.map(({ id, icon, label }) => (
              <button key={id} onClick={() => setTab(id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", width: "100%", border: "none", cursor: "pointer", borderRadius: 7, marginBottom: 3, background: tab === id ? "#ef444415" : "transparent", borderLeft: tab === id ? "2px solid #ef4444" : "2px solid transparent", color: tab === id ? "#ef4444" : "#4a5568", transition: "all 0.15s", fontFamily: "'Rajdhani',sans-serif", fontWeight: 600, fontSize: 13 }}>
                {icon}{label}
              </button>
            ))}
          </nav>
          <div style={{ padding: "14px 18px", borderTop: "1px solid #1a2332" }}>
            <div style={{ color: "#1a2332", fontSize: 9, letterSpacing: 1, marginBottom: 4 }}>COMMUNITY</div>
            <div style={{ color: "#f1f5f9", fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 26, lineHeight: 1 }}>{(stats.total_community_reports || 0).toLocaleString()}</div>
            <div style={{ color: "#2d3748", fontSize: 10, marginTop: 3 }}>total reports</div>
          </div>
        </aside>
      )}

      {mob && drawerOpen && (
        <>
          <div onClick={() => setDrawerOpen(false)} style={{ position: "fixed", inset: 0, background: "#000000bb", zIndex: 60 }} />
          <aside style={{ position: "fixed", top: 0, left: 0, width: 240, height: "100vh", background: "#0d1424", borderRight: "1px solid #1a2332", zIndex: 70, display: "flex", flexDirection: "column", animation: "fadeIn 0.2s ease" }}>
            <div style={{ padding: "16px", borderBottom: "1px solid #1a2332", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 7, background: "linear-gradient(135deg,#ef4444,#991b1b)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Shield size={17} color="white" />
                </div>
                <span style={{ color: "#f1f5f9", fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: 1 }}>SPAM<span style={{ color: "#ef4444" }}>SHIELD</span></span>
              </div>
              <button onClick={() => setDrawerOpen(false)} style={{ background: "none", border: "none", color: "#4a5568", cursor: "pointer", padding: 4 }}><X size={18} /></button>
            </div>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid #1a2332", display: "flex", alignItems: "center", gap: 7 }}>
              <PulseDot color={connected ? "#22c55e" : "#ef4444"} />
              <span style={{ color: connected ? "#22c55e" : "#ef4444", fontSize: 10 }}>{connected ? "API CONNECTED" : "OFFLINE"}</span>
            </div>
            <nav style={{ padding: "10px", flex: 1 }}>
              {TABS.map(({ id, icon, label }) => (
                <button key={id} onClick={() => { setTab(id); setDrawerOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px", width: "100%", border: "none", cursor: "pointer", borderRadius: 7, marginBottom: 3, background: tab === id ? "#ef444415" : "transparent", borderLeft: tab === id ? "2px solid #ef4444" : "2px solid transparent", color: tab === id ? "#ef4444" : "#4a5568", fontFamily: "'Rajdhani',sans-serif", fontWeight: 600, fontSize: 14 }}>
                  {icon}{label}
                </button>
              ))}
            </nav>
            <div style={{ padding: "14px 16px", borderTop: "1px solid #1a2332" }}>
              <div style={{ color: "#f1f5f9", fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 24 }}>{(stats.total_community_reports || 0).toLocaleString()}</div>
              <div style={{ color: "#2d3748", fontSize: 10, marginTop: 2 }}>community reports</div>
            </div>
          </aside>
        </>
      )}

      <div style={{ flex: 1, marginLeft: mob ? 0 : 220, display: "flex", flexDirection: "column", minHeight: "100vh", minWidth: 0, paddingBottom: mob ? 62 : 0 }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: mob ? "0 12px" : "0 20px", height: mob ? 52 : 58, background: "#0d1424", borderBottom: "1px solid #1a2332", position: "sticky", top: 0, zIndex: 30, gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {mob && (
              <button onClick={() => setDrawerOpen(true)} style={{ background: "none", border: "none", color: "#4a5568", cursor: "pointer", padding: 4, flexShrink: 0 }}>
                <Menu size={19} />
              </button>
            )}
            <div>
              <div style={{ color: "#f1f5f9", fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: mob ? 14 : 16, letterSpacing: 0.5 }}>
                {TABS.find(t => t.id === tab)?.label.toUpperCase()}
              </div>
              {!mob && <div style={{ color: "#2d3748", fontSize: 10 }}>
                {new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "2-digit", month: "short", year: "numeric" })} IST
              </div>}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: mob ? 8 : 14, flexShrink: 0 }}>
            <button onClick={() => load(true)} style={{ background: "none", border: "1px solid #1a2332", borderRadius: 6, color: "#4a5568", cursor: "pointer", padding: mob ? "5px 7px" : "5px 10px", display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
              <RefreshCw size={11} style={{ animation: syncing ? "spin 1s linear infinite" : "none" }} />
              {!mob && (syncing ? "Syncing" : "Refresh")}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {connected ? <Wifi size={13} color="#22c55e" /> : <WifiOff size={13} color="#ef4444" />}
              <span style={{ color: connected ? "#22c55e" : "#ef4444", fontSize: 11 }}>{connected ? "Live" : "Offline"}</span>
            </div>
            {!mob && (
              <div style={{ display: "flex", gap: 14 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#ef4444", fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 18, lineHeight: 1 }}>{(stats.confirmed_spam_numbers || 0).toLocaleString()}</div>
                  <div style={{ color: "#2d3748", fontSize: 9 }}>SPAM NUMS</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#f97316", fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 18, lineHeight: 1 }}>{detRate}%</div>
                  <div style={{ color: "#2d3748", fontSize: 9 }}>DETECTION</div>
                </div>
              </div>
            )}
          </div>
        </header>

        <main style={{ flex: 1, padding: mob ? "12px 10px" : "20px", overflowX: "hidden" }}>
          {tab === "overview"  && <OverviewTab stats={stats} reports={reports} />}
          {tab === "checker"   && <CheckerTab />}
          {tab === "feed"      && <FeedTab reports={reports} />}
          {tab === "report"    && <ReportTab stats={stats} onSuccess={() => load()} />}
          {tab === "analytics" && <AnalyticsTab stats={stats} />}
        </main>
      </div>

      {mob && <BottomNav active={tab} setActive={setTab} />}
    </div>
  );
}

const CD = { background: "#0d1424", border: "1px solid #1a2332", borderRadius: 10, padding: "14px" };
const IN = { background: "#060b14", border: "1px solid #1a2332", borderRadius: 7, padding: "10px 12px", color: "#94a3b8", fontSize: 13, outline: "none", transition: "border-color 0.15s", width: "100%" };
const BT = { background: "linear-gradient(135deg,#ef4444,#b91c1c)", border: "none", borderRadius: 7, padding: "10px 14px", color: "white", fontSize: 12, cursor: "pointer", fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1, fontWeight: 600, transition: "opacity 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 };
const LB = { color: "#2d3748", fontSize: 10, letterSpacing: 1.5, display: "block", marginBottom: 7, textTransform: "uppercase" };