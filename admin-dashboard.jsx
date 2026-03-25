import { useState, useEffect } from "react";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK_CLIENTS = [
  { id: "C001", name: "Apex Digital Ltd", director: "James Okafor", address: "MB-1042", plan: "Business Pro", status: "active", joinDate: "2024-01-15", hmrcVerified: true, idVerified: true, email: "j.okafor@apexdigital.co.uk", phone: "+44 7700 900142", pendingMail: 3 },
  { id: "C002", name: "Bright Futures CIC", director: "Priya Sharma", address: "MB-2017", plan: "Starter", status: "active", joinDate: "2024-03-02", hmrcVerified: true, idVerified: true, email: "priya@brightfutures.org", phone: "+44 7911 123456", pendingMail: 1 },
  { id: "C003", name: "Nova Consulting Ltd", director: "Tom Whitfield", address: "MB-3301", plan: "Business Pro", status: "suspended", joinDate: "2023-11-20", hmrcVerified: false, idVerified: true, email: "tom@novaconsulting.co.uk", phone: "+44 7800 654321", pendingMail: 7 },
  { id: "C004", name: "GreenLeaf Trading", director: "Aisha Mohammed", address: "MB-0885", plan: "Premium", status: "active", joinDate: "2024-05-10", hmrcVerified: true, idVerified: true, email: "aisha@greenleaf.co.uk", phone: "+44 7500 111222", pendingMail: 0 },
  { id: "C005", name: "Skyline Events Ltd", director: "Marcus Chen", address: "MB-1199", plan: "Starter", status: "pending_kyc", joinDate: "2025-01-03", hmrcVerified: false, idVerified: false, email: "marcus@skylineevents.co.uk", phone: "+44 7600 999888", pendingMail: 2 },
];

const MOCK_MAIL = [
  { id: "M001", clientId: "C001", clientName: "Apex Digital Ltd", sender: "HMRC", type: "Government", received: "2025-01-14", status: "awaiting_action", action: null, pages: 4, urgent: true },
  { id: "M002", clientId: "C001", clientName: "Apex Digital Ltd", sender: "Barclays Bank", type: "Financial", received: "2025-01-13", status: "scanned", action: "email", pages: 2, urgent: false },
  { id: "M003", clientId: "C002", clientName: "Bright Futures CIC", sender: "Companies House", type: "Government", received: "2025-01-14", status: "awaiting_action", action: null, pages: 1, urgent: false },
  { id: "M004", clientId: "C003", clientName: "Nova Consulting Ltd", sender: "HMRC - Self Assessment", type: "Government", received: "2025-01-12", status: "awaiting_action", action: null, pages: 8, urgent: true },
  { id: "M005", clientId: "C004", clientName: "GreenLeaf Trading", sender: "NatWest", type: "Financial", received: "2025-01-11", status: "forwarded", action: "post", pages: 3, urgent: false },
  { id: "M006", clientId: "C001", clientName: "Apex Digital Ltd", sender: "DVLA", type: "Government", received: "2025-01-10", status: "shredded", action: "shred", pages: 1, urgent: false },
  { id: "M007", clientId: "C005", clientName: "Skyline Events Ltd", sender: "Unknown Sender", type: "Other", received: "2025-01-09", status: "awaiting_action", action: null, pages: 2, urgent: false },
];

const MOCK_PAYMENTS = [
  { id: "PAY001", clientId: "C001", clientName: "Apex Digital Ltd", amount: 29.99, plan: "Business Pro", date: "2025-01-01", status: "paid", method: "card" },
  { id: "PAY002", clientId: "C002", clientName: "Bright Futures CIC", amount: 9.99, plan: "Starter", date: "2025-01-01", status: "paid", method: "card" },
  { id: "PAY003", clientId: "C004", clientName: "GreenLeaf Trading", amount: 49.99, plan: "Premium", date: "2025-01-01", status: "paid", method: "direct_debit" },
  { id: "PAY004", clientId: "C003", clientName: "Nova Consulting Ltd", amount: 29.99, plan: "Business Pro", date: "2024-12-01", status: "failed", method: "card" },
  { id: "PAY005", clientId: "C001", clientName: "Apex Digital Ltd", amount: 4.50, plan: "Scan & Email", date: "2025-01-13", status: "paid", method: "card" },
];

const STATS = {
  totalClients: 247,
  activeClients: 231,
  pendingKyc: 8,
  mailToday: 34,
  mailPending: 89,
  monthlyRevenue: 6284.50,
  pendingPayments: 3,
};

// ─── COLOURS & THEME ──────────────────────────────────────────────────────────
const C = {
  bg: "#F7FAFF",
  surface: "#FFFFFF",
  surfaceAlt: "#EEF6FF",
  border: "#D0DFF0",
  borderHover: "#74AFFF",
  accent: "#1555C8",
  accentDim: "#1040A0",
  accentGlow: "rgba(21,85,200,0.1)",
  green: "#10B981",
  greenDim: "#065F46",
  amber: "#F59E0B",
  amberDim: "#78350F",
  red: "#EF4444",
  redDim: "#7F1D1D",
  purple: "#8B5CF6",
  text: "#0A1628",
  textMuted: "#6B82A0",
  textDim: "#3B5280",
};

// ─── ICON COMPONENTS ──────────────────────────────────────────────────────────
const Icon = ({ d, size = 18, color = "currentColor", fill = "none", strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((path, i) => <path key={i} d={path} />) : <path d={d} />}
  </svg>
);

const icons = {
  dashboard: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  clients: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6",
  payments: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z M12 6v6l4 2",
  kyc: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  bell: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0",
  menu: "M3 12h18 M3 6h18 M3 18h18",
  close: "M18 6L6 18 M6 6l12 12",
  scan: "M3 7V5a2 2 0 0 1 2-2h2 M17 3h2a2 2 0 0 1 2 2v2 M21 17v2a2 2 0 0 1-2 2h-2 M7 21H5a2 2 0 0 1-2-2v-2",
  forward: "M22 2L11 13 M22 2l-7 20-4-9-9-4 20-7",
  shred: "M3 6h18 M8 6V4h8v2 M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6",
  check: "M20 6L9 17l-5-5",
  alert: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01",
  pound: "M8 12h8 M10 16V9a3 3 0 0 1 6 0",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  search: "M11 17.25a6.25 6.25 0 1 1 0-12.5 6.25 6.25 0 0 1 0 12.5z M16 16l3.5 3.5",
  plus: "M12 5v14 M5 12h14",
  refresh: "M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  building: "M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18 M2 22h20 M10 7h4 M10 11h4 M10 15h4",
};

// ─── REUSABLE UI ──────────────────────────────────────────────────────────────
const Badge = ({ label, color = C.accent, bg }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", padding: "2px 10px",
    borderRadius: 99, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
    color, background: bg || `${color}22`, textTransform: "uppercase",
  }}>{label}</span>
);

const statusBadge = (status) => {
  const map = {
    active: { label: "Active", color: C.green },
    suspended: { label: "Suspended", color: C.red },
    pending_kyc: { label: "KYC Pending", color: C.amber },
    paid: { label: "Paid", color: C.green },
    failed: { label: "Failed", color: C.red },
    awaiting_action: { label: "Awaiting Action", color: C.amber },
    scanned: { label: "Scanned", color: C.accent },
    forwarded: { label: "Forwarded", color: C.purple },
    shredded: { label: "Shredded", color: C.textMuted },
  };
  const s = map[status] || { label: status, color: C.textMuted };
  return <Badge label={s.label} color={s.color} />;
};

const Card = ({ children, style = {} }) => (
  <div style={{
    background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 16, padding: 24, ...style,
  }}>{children}</div>
);

const StatCard = ({ icon, label, value, sub, color = C.accent, trend }) => (
  <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div style={{ background: `${color}18`, borderRadius: 12, padding: 10, color }}>
        <Icon d={icons[icon]} size={20} color={color} />
      </div>
      {trend && <span style={{ fontSize: 12, color: trend > 0 ? C.green : C.red, fontWeight: 600 }}>
        {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
      </span>}
    </div>
    <div>
      <div style={{ fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: "-0.02em" }}>{value}</div>
      <div style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color, marginTop: 4 }}>{sub}</div>}
    </div>
  </Card>
);

const Input = ({ placeholder, value, onChange, icon, type = "text", style = {} }) => (
  <div style={{ position: "relative", ...style }}>
    {icon && <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.textMuted, pointerEvents: "none" }}>
      <Icon d={icons[icon]} size={16} />
    </div>}
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      style={{
        width: "100%", boxSizing: "border-box",
        background: C.surfaceAlt, border: `1px solid ${C.border}`,
        borderRadius: 10, padding: `10px ${icon ? 38 : 14}px 10px ${icon ? 38 : 14}px`,
        color: C.text, fontSize: 14, outline: "none",
        transition: "border-color 0.2s",
      }}
      onFocus={e => e.target.style.borderColor = C.accent}
      onBlur={e => e.target.style.borderColor = C.border}
    />
  </div>
);

const Btn = ({ children, onClick, variant = "primary", size = "md", icon, disabled = false }) => {
  const styles = {
    primary: { background: C.accent, color: "#fff", border: "none" },
    ghost: { background: "transparent", color: C.textDim, border: `1px solid ${C.border}` },
    danger: { background: C.red, color: "#fff", border: "none" },
    success: { background: C.green, color: "#fff", border: "none" },
  };
  const sizes = { sm: { padding: "6px 14px", fontSize: 12 }, md: { padding: "9px 20px", fontSize: 14 } };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: "inline-flex", alignItems: "center", gap: 6, cursor: disabled ? "not-allowed" : "pointer",
      borderRadius: 10, fontWeight: 600, transition: "opacity 0.2s, transform 0.1s",
      opacity: disabled ? 0.5 : 1, ...styles[variant], ...sizes[size],
    }}
      onMouseEnter={e => { if (!disabled) e.target.style.opacity = "0.85"; }}
      onMouseLeave={e => { e.target.style.opacity = "1"; }}>
      {icon && <Icon d={icons[icon]} size={14} />}{children}
    </button>
  );
};

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20,
        padding: 28, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer" }}>
            <Icon d={icons.close} size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// ─── PAGES ────────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const recentMail = MOCK_MAIL.slice(0, 5);
  const urgentMail = MOCK_MAIL.filter(m => m.urgent);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {urgentMail.length > 0 && (
        <div style={{
          background: `${C.amber}18`, border: `1px solid ${C.amber}44`,
          borderRadius: 14, padding: "14px 20px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <Icon d={icons.alert} size={18} color={C.amber} />
          <span style={{ color: C.amber, fontSize: 14, fontWeight: 600 }}>
            {urgentMail.length} urgent mail item{urgentMail.length > 1 ? "s" : ""} awaiting action — including HMRC correspondence
          </span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <StatCard icon="clients" label="Total Clients" value={STATS.totalClients} sub={`${STATS.activeClients} active`} color={C.accent} trend={8} />
        <StatCard icon="kyc" label="KYC Pending" value={STATS.pendingKyc} sub="Require verification" color={C.amber} />
        <StatCard icon="mail" label="Mail Today" value={STATS.mailToday} sub={`${STATS.mailPending} total pending`} color={C.purple} trend={12} />
        <StatCard icon="pound" label="Monthly Revenue" value={`£${STATS.monthlyRevenue.toLocaleString()}`} sub={`${STATS.pendingPayments} failed payments`} color={C.green} trend={5} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Card>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>Recent Mail Activity</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recentMail.map(m => (
              <div key={m.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", background: C.surfaceAlt, borderRadius: 10,
                border: `1px solid ${m.urgent ? C.amber + "44" : C.border}`,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{m.sender}</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>{m.clientName} · {m.received}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {m.urgent && <Badge label="Urgent" color={C.amber} />}
                  {statusBadge(m.status)}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>Plans Overview</div>
          {[
            { plan: "Premium", count: 42, price: "£49.99/mo", color: C.purple },
            { plan: "Business Pro", count: 118, price: "£29.99/mo", color: C.accent },
            { plan: "Starter", count: 87, price: "£9.99/mo", color: C.green },
          ].map(p => (
            <div key={p.plan} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: C.textDim }}>{p.plan}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{p.count} clients</span>
              </div>
              <div style={{ background: C.border, borderRadius: 99, height: 6 }}>
                <div style={{ width: `${(p.count / 247) * 100}%`, height: "100%", background: p.color, borderRadius: 99, transition: "width 1s ease" }} />
              </div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{p.price}</div>
            </div>
          ))}

          <div style={{ marginTop: 20, padding: "14px", background: C.surfaceAlt, borderRadius: 12, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>UK HMRC Compliance Status</div>
            <div style={{ display: "flex", gap: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.green }}>94%</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>Fully verified</div>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.amber }}>3%</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>KYC pending</div>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.red }}>3%</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>Non-compliant</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

const ClientsPage = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const filtered = MOCK_CLIENTS.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.director.toLowerCase().includes(search.toLowerCase()) ||
      c.address.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || c.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Input placeholder="Search clients, directors, mailbox…" value={search}
          onChange={e => setSearch(e.target.value)} icon="search" style={{ flex: 1, minWidth: 200 }} />
        <div style={{ display: "flex", gap: 8 }}>
          {["all", "active", "pending_kyc", "suspended"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: filter === f ? C.accent : C.surfaceAlt,
              color: filter === f ? "#fff" : C.textMuted,
              border: `1px solid ${filter === f ? C.accent : C.border}`,
            }}>
              {f === "all" ? "All" : f === "pending_kyc" ? "KYC Pending" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <Btn icon="plus" onClick={() => {}}>New Client</Btn>
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["Client / Director", "Mailbox", "Plan", "KYC", "HMRC", "Mail", "Status", ""].map(h => (
                  <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer", transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.surfaceAlt}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  onClick={() => setSelected(c)}>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>{c.director}</div>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ fontFamily: "monospace", fontSize: 13, color: C.accent }}>{c.address}</span>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ fontSize: 13, color: C.textDim }}>{c.plan}</span>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {c.idVerified
                      ? <Icon d={icons.check} size={16} color={C.green} />
                      : <Icon d={icons.alert} size={16} color={C.amber} />}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {c.hmrcVerified
                      ? <Icon d={icons.check} size={16} color={C.green} />
                      : <Icon d={icons.alert} size={16} color={C.red} />}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {c.pendingMail > 0
                      ? <Badge label={`${c.pendingMail} pending`} color={c.pendingMail > 3 ? C.red : C.amber} />
                      : <span style={{ fontSize: 12, color: C.textMuted }}>Clear</span>}
                  </td>
                  <td style={{ padding: "14px 16px" }}>{statusBadge(c.status)}</td>
                  <td style={{ padding: "14px 16px" }}>
                    <button style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer" }}
                      onClick={e => { e.stopPropagation(); setSelected(c); }}>
                      <Icon d={icons.eye} size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Client Profile">
        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: C.accentGlow, display: "flex", alignItems: "center", justifyContent: "center", color: C.accent, fontSize: 20, fontWeight: 800 }}>
                {selected.name.charAt(0)}
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: C.text }}>{selected.name}</div>
                <div style={{ fontSize: 13, color: C.textMuted }}>Director: {selected.director}</div>
              </div>
              <div style={{ marginLeft: "auto" }}>{statusBadge(selected.status)}</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                ["Mailbox", selected.address],
                ["Plan", selected.plan],
                ["Email", selected.email],
                ["Phone", selected.phone],
                ["Joined", selected.joinDate],
                ["Pending Mail", selected.pendingMail],
              ].map(([k, v]) => (
                <div key={k} style={{ background: C.surfaceAlt, borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{k}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: 1, background: `${C.green}18`, border: `1px solid ${C.green}33`, borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>ID Verification</div>
                <div style={{ color: selected.idVerified ? C.green : C.red, fontWeight: 700, fontSize: 13 }}>
                  {selected.idVerified ? "✓ Verified" : "✗ Not Verified"}
                </div>
              </div>
              <div style={{ flex: 1, background: `${C.accent}18`, border: `1px solid ${C.accent}33`, borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>HMRC Registered</div>
                <div style={{ color: selected.hmrcVerified ? C.green : C.red, fontWeight: 700, fontSize: 13 }}>
                  {selected.hmrcVerified ? "✓ Confirmed" : "✗ Unconfirmed"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <Btn variant="primary" size="sm">View Mail</Btn>
              <Btn variant="ghost" size="sm">Edit Client</Btn>
              {selected.status === "active"
                ? <Btn variant="danger" size="sm">Suspend</Btn>
                : <Btn variant="success" size="sm">Activate</Btn>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const MailPage = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [actionModal, setActionModal] = useState(null);
  const [mail, setMail] = useState(MOCK_MAIL);
  const [toast, setToast] = useState(null);

  const showToast = (msg, color = C.green) => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAction = (mailId, action) => {
    setMail(prev => prev.map(m => m.id === mailId ? { ...m, status: action === "scan" ? "scanned" : action === "forward" ? "forwarded" : "shredded", action } : m));
    setActionModal(null);
    showToast(`Mail ${action === "scan" ? "scanned & emailed" : action === "forward" ? "queued for posting" : "scheduled for shredding"} successfully`);
  };

  const filtered = mail.filter(m => {
    const matchSearch = m.sender.toLowerCase().includes(search.toLowerCase()) ||
      m.clientName.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || m.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {toast && (
        <div style={{
          position: "fixed", top: 24, right: 24, background: toast.color, color: "#fff",
          padding: "12px 20px", borderRadius: 12, fontWeight: 600, fontSize: 14, zIndex: 2000,
          boxShadow: `0 8px 32px ${toast.color}44`,
        }}>{toast.msg}</div>
      )}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Input placeholder="Search by sender or client…" value={search}
          onChange={e => setSearch(e.target.value)} icon="search" style={{ flex: 1, minWidth: 200 }} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["all", "awaiting_action", "scanned", "forwarded", "shredded"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "10px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: filter === f ? C.accent : C.surfaceAlt,
              color: filter === f ? "#fff" : C.textMuted,
              border: `1px solid ${filter === f ? C.accent : C.border}`, whiteSpace: "nowrap",
            }}>
              {f === "all" ? "All" : f === "awaiting_action" ? "Pending" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["Mail ID", "Sender", "Client", "Type", "Received", "Pages", "Status", "Actions"].map(h => (
                  <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id} style={{ borderBottom: `1px solid ${C.border}`, transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.surfaceAlt}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontFamily: "monospace", fontSize: 12, color: C.textMuted }}>{m.id}</span>
                      {m.urgent && <Badge label="!" color={C.amber} />}
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{m.sender}</div>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontSize: 12, color: C.textDim }}>{m.clientName}</div>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <Badge label={m.type} color={m.type === "Government" ? C.red : m.type === "Financial" ? C.accent : C.textMuted} />
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ fontSize: 12, color: C.textMuted }}>{m.received}</span>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ fontSize: 13, color: C.textDim }}>{m.pages}p</span>
                  </td>
                  <td style={{ padding: "14px 16px" }}>{statusBadge(m.status)}</td>
                  <td style={{ padding: "14px 16px" }}>
                    {m.status === "awaiting_action" ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button title="Scan & Email" onClick={() => handleAction(m.id, "scan")} style={{ background: `${C.accent}22`, border: "none", borderRadius: 8, padding: "6px 10px", color: C.accent, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Scan</button>
                        <button title="Post to Client" onClick={() => handleAction(m.id, "forward")} style={{ background: `${C.purple}22`, border: "none", borderRadius: 8, padding: "6px 10px", color: C.purple, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Post</button>
                        <button title="Shred" onClick={() => handleAction(m.id, "shred")} style={{ background: `${C.red}22`, border: "none", borderRadius: 8, padding: "6px 10px", color: C.red, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Shred</button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: C.textMuted }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const PaymentsPage = () => {
  const totalRevenue = MOCK_PAYMENTS.filter(p => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
  const failed = MOCK_PAYMENTS.filter(p => p.status === "failed");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <StatCard icon="pound" label="Total Collected" value={`£${totalRevenue.toFixed(2)}`} color={C.green} />
        <StatCard icon="alert" label="Failed Payments" value={failed.length} sub="Requires attention" color={C.red} />
        <StatCard icon="refresh" label="Pending Renewal" value={18} sub="Next 7 days" color={C.amber} />
      </div>

      {failed.length > 0 && (
        <div style={{ background: `${C.red}12`, border: `1px solid ${C.red}33`, borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.red, marginBottom: 10 }}>⚠ Failed Payments — Action Required</div>
          {failed.map(p => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{p.clientName}</div>
                <div style={{ fontSize: 12, color: C.textMuted }}>{p.plan} · {p.date}</div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>£{p.amount.toFixed(2)}</span>
                <Btn variant="primary" size="sm">Retry</Btn>
                <Btn variant="ghost" size="sm">Contact</Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, fontSize: 15, fontWeight: 700, color: C.text }}>Payment History</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["ID", "Client", "Plan / Service", "Amount", "Method", "Date", "Status"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_PAYMENTS.map(p => (
                <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}`, transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.surfaceAlt}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "13px 16px", fontFamily: "monospace", fontSize: 12, color: C.textMuted }}>{p.id}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 600, color: C.text }}>{p.clientName}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13, color: C.textDim }}>{p.plan}</td>
                  <td style={{ padding: "13px 16px", fontSize: 14, fontWeight: 700, color: C.text }}>£{p.amount.toFixed(2)}</td>
                  <td style={{ padding: "13px 16px" }}>
                    <Badge label={p.method === "card" ? "Card" : "Direct Debit"} color={C.accent} />
                  </td>
                  <td style={{ padding: "13px 16px", fontSize: 12, color: C.textMuted }}>{p.date}</td>
                  <td style={{ padding: "13px 16px" }}>{statusBadge(p.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const KYCPage = () => {
  const pending = MOCK_CLIENTS.filter(c => !c.idVerified || !c.hmrcVerified);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>UK Compliance Requirements</div>
        <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.7 }}>
          All clients must satisfy Anti-Money Laundering (AML) checks per the <strong style={{ color: C.textDim }}>Money Laundering, Terrorist Financing and Transfer of Funds Regulations 2017</strong>. HMRC registered mail addresses require Companies House verification and director ID validation.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 16 }}>
          {[
            { label: "Government Photo ID", desc: "Passport or Driving Licence", ok: true },
            { label: "Proof of Address", desc: "Utility bill < 3 months", ok: true },
            { label: "Companies House", desc: "Registered company number", ok: true },
            { label: "Director Verification", desc: "Live selfie + liveness check", ok: false },
          ].map(r => (
            <div key={r.label} style={{ background: C.surfaceAlt, borderRadius: 12, padding: "12px 14px", border: `1px solid ${r.ok ? C.green + "33" : C.amber + "33"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.textDim }}>{r.label}</span>
                <Icon d={r.ok ? icons.check : icons.alert} size={14} color={r.ok ? C.green : C.amber} />
              </div>
              <div style={{ fontSize: 11, color: C.textMuted }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Clients Requiring Attention ({pending.length})</div>
      {pending.map(c => (
        <Card key={c.id} style={{ border: `1px solid ${C.amber}44` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{c.name}</div>
              <div style={{ fontSize: 13, color: C.textMuted }}>Director: {c.director} · {c.email}</div>
              <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                {!c.idVerified && <Badge label="ID Not Verified" color={C.amber} />}
                {!c.hmrcVerified && <Badge label="HMRC Not Confirmed" color={C.red} />}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Btn variant="primary" size="sm" icon="kyc">Request KYC</Btn>
              <Btn variant="ghost" size="sm">Send Reminder</Btn>
              <Btn variant="danger" size="sm">Suspend</Btn>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

const SettingsPage = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
    {[
      {
        title: "Subscription Plans", items: [
          { label: "Starter — £9.99/month", desc: "1 mailbox address, up to 20 items/mo, digital notifications" },
          { label: "Business Pro — £29.99/month", desc: "1 mailbox address, unlimited items, scan & email (10 items/mo included)" },
          { label: "Premium — £49.99/month", desc: "Up to 3 addresses, unlimited items, priority scan & email, dedicated support" },
        ]
      },
      {
        title: "Add-on Services", items: [
          { label: "Scan & Email — £1.50/item", desc: "High-res scan sent within 2 business hours" },
          { label: "Recorded Post Forward — £3.50 + postage", desc: "Tracked forwarding to any UK/international address" },
          { label: "Certified Shredding — £0.50/item", desc: "BS EN 15713 compliant secure destruction with certificate" },
        ]
      },
      {
        title: "Payment Settings", items: [
          { label: "Stripe Integration", desc: "Live mode · Webhook configured · 3D Secure enabled" },
          { label: "Direct Debit (GoCardless)", desc: "Active · FCA authorised · BACS compliant" },
          { label: "VAT Configuration", desc: "20% standard rate · MTD-compliant reporting" },
        ]
      },
    ].map(section => (
      <Card key={section.title}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>{section.title}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {section.items.map(item => (
            <div key={item.label} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 16px", background: C.surfaceAlt, borderRadius: 12,
              border: `1px solid ${C.border}`, gap: 16,
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{item.label}</div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{item.desc}</div>
              </div>
              <Btn variant="ghost" size="sm">Edit</Btn>
            </div>
          ))}
        </div>
      </Card>
    ))}
  </div>
);

// ─── APP SHELL ────────────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "clients", label: "Clients", icon: "clients" },
  { id: "mail", label: "Mail", icon: "mail" },
  { id: "payments", label: "Payments", icon: "payments" },
  { id: "kyc", label: "KYC / Compliance", icon: "kyc" },
  { id: "settings", label: "Settings", icon: "settings" },
];

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const pageTitles = { dashboard: "Dashboard", clients: "Clients", mail: "Mail Handler", payments: "Payments", kyc: "KYC & Compliance", settings: "Settings" };
  const PageComponent = { dashboard: Dashboard, clients: ClientsPage, mail: MailPage, payments: PaymentsPage, kyc: KYCPage, settings: SettingsPage }[page];

  const Sidebar = () => (
    <div style={{
      width: 240, background: C.surface, borderRight: `1px solid ${C.border}`,
      display: "flex", flexDirection: "column", height: "100%", flexShrink: 0,
      ...(isMobile ? {
        position: "fixed", top: 0, left: sidebarOpen ? 0 : -260, zIndex: 500,
        height: "100vh", transition: "left 0.3s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: sidebarOpen ? "4px 0 40px rgba(0,0,0,0.6)" : "none",
      } : {}),
    }}>
      <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${C.border}` }}>
          <img src="data:image/jpeg;base64,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" alt="Prime Office Solutions Ltd" style={{ height: 38, width: "auto", display: "block", filter: "brightness(0) invert(1)" }} />
          <div style={{ fontSize: 10, color: C.textMuted, marginTop: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Admin Portal</div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
        {NAV.map(item => {
          const active = page === item.id;
          return (
            <button key={item.id} onClick={() => { setPage(item.id); setSidebarOpen(false); }} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12,
              padding: "11px 14px", borderRadius: 12, marginBottom: 2,
              background: active ? C.accentGlow : "transparent",
              border: active ? `1px solid ${C.accent}33` : "1px solid transparent",
              color: active ? C.accent : C.textMuted,
              cursor: "pointer", textAlign: "left", fontSize: 14, fontWeight: active ? 700 : 500,
              transition: "all 0.15s",
            }}>
              <Icon d={icons[item.icon]} size={17} color={active ? C.accent : C.textMuted} />
              {item.label}
              {item.id === "kyc" && <span style={{ marginLeft: "auto", background: C.amber, color: "#000", fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 99 }}>5</span>}
              {item.id === "mail" && <span style={{ marginLeft: "auto", background: C.red, color: "#fff", fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 99 }}>12</span>}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: "16px 20px", borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 99, background: C.accentGlow, display: "flex", alignItems: "center", justifyContent: "center", color: C.accent, fontWeight: 800, fontSize: 13 }}>A</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Admin</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>admin@primeofficesolutions.co.uk</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', 'Segoe UI', sans-serif", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; } 
        ::-webkit-scrollbar { width: 5px; height: 5px; } 
        ::-webkit-scrollbar-track { background: transparent; } 
        ::-webkit-scrollbar-thumb { background: #1E2535; border-radius: 99px; }
        input::placeholder { color: #475569; }
        button { font-family: inherit; }
      `}</style>

      {!isMobile && <Sidebar />}
      {isMobile && <Sidebar />}
      {isMobile && sidebarOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 499 }}
          onClick={() => setSidebarOpen(false)} />
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{
          background: C.surface, borderBottom: `1px solid ${C.border}`,
          padding: "16px 24px", display: "flex", alignItems: "center", gap: 16, flexShrink: 0,
        }}>
          {isMobile && (
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", padding: 4 }}>
              <Icon d={icons.menu} size={22} />
            </button>
          )}
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.text, letterSpacing: "-0.01em" }}>{pageTitles[page]}</div>
            <div style={{ fontSize: 12, color: C.textMuted }}>PrimeOfficeSolutions Ltd Admin · {new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
            <button style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", position: "relative" }}>
              <Icon d={icons.bell} size={20} />
              <span style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, background: C.red, borderRadius: 99, border: `2px solid ${C.surface}` }} />
            </button>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          <PageComponent />
        </main>
      </div>
    </div>
  );
}
