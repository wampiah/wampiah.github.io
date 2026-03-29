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
  bg: "#0A0D14",
  surface: "#111520",
  surfaceAlt: "#161B28",
  border: "#1E2535",
  borderHover: "#2A3450",
  accent: "#3B82F6",
  accentDim: "#1D4ED8",
  accentGlow: "rgba(59,130,246,0.15)",
  green: "#10B981",
  greenDim: "#065F46",
  amber: "#F59E0B",
  amberDim: "#78350F",
  red: "#EF4444",
  redDim: "#7F1D1D",
  purple: "#8B5CF6",
  text: "#E2E8F0",
  textMuted: "#64748B",
  textDim: "#94A3B8",
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
      <div style={{ padding: "24px 20px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon d={icons.building} size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.text, letterSpacing: "-0.01em" }}>MailVault UK</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>Admin Portal</div>
          </div>
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
            <div style={{ fontSize: 11, color: C.textMuted }}>admin@mailvault.co.uk</div>
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
            <div style={{ fontSize: 12, color: C.textMuted }}>MailVault UK Admin · {new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
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
