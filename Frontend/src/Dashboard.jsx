import { useState } from "react";

function Dashboard() {

  const [logs] = useState([
    { name: "Defis", method: "RFID Card", time: "08:30", status: "Granted" },
    { name: "Budi", method: "Keypad PIN", time: "08:45", status: "Granted" },
    { name: "Unknown User", method: "RFID Card", time: "08:50", status: "Denied" }
  ]);

  return (
    <div style={container}>

      <h1 style={title}>🔐 Smart Door Dashboard</h1>

      {/* ===== STATS ===== */}
      <div style={statsContainer}>

        <Stat title="Door Status" value="Locked" color="#ef4444" />
        <Stat title="RFID Access" value="12 Users" color="#2563eb" />
        <Stat title="Keypad Access" value="5 Users" color="#9333ea" />
        <Stat title="Denied" value="2" color="#f59e0b" />

      </div>

      {/* ===== TABLE ===== */}
      <div style={tableCard}>

        <h2 style={{ marginBottom: "20px" }}>Access Logs</h2>

        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Name</th>
              <th style={th}>Method</th>
              <th style={th}>Time</th>
              <th style={th}>Status</th>
            </tr>
          </thead>

          <tbody>
            {logs.map((log, index) => (
              <tr key={index} style={row}>

                <td style={td}>{log.name}</td>
                <td style={td}>{log.method}</td>
                <td style={td}>{log.time}</td>

                <td style={td}>
                  <span style={{
                    ...badge,
                    background: log.status === "Granted" ? "#dcfce7" : "#fee2e2",
                    color: log.status === "Granted" ? "#16a34a" : "#dc2626"
                  }}>
                    {log.status === "Granted" ? "✔ Granted" : "✖ Denied"}
                  </span>
                </td>

              </tr>
            ))}
          </tbody>
        </table>

      </div>

    </div>
  );
}

/* ===== COMPONENT STAT ===== */

const Stat = ({ title, value, color }) => (
  <div style={card}>
    <span style={cardTitle}>{title}</span>
    <span style={{ ...cardValue, color }}>{value}</span>
  </div>
);

/* ===== STYLE ===== */

const container = {
  padding: "40px",
  background: "#f8fafc",
  minHeight: "100vh",
  fontFamily: "system-ui",
  color: "#0f172a"
};

const title = {
  fontSize: "32px",
  fontWeight: "700",
  marginBottom: "30px",
  color: "#0f172a"
};

const statsContainer = {
  display: "grid",
  gridTemplateColumns: "repeat(4,1fr)",
  gap: "20px",
  marginBottom: "30px"
};

const card = {
  background: "white",
  padding: "20px",
  borderRadius: "16px",
  boxShadow: "0 6px 18px rgba(0,0,0,0.05)",
  display: "flex",
  flexDirection: "column",
  gap: "10px"
};

const cardTitle = {
  fontSize: "14px",
  color: "#1e293b",
  fontWeight: "600"
};

const cardValue = {
  fontSize: "24px",
  fontWeight: "700"
};

const tableCard = {
  background: "white",
  padding: "25px",
  borderRadius: "18px",
  boxShadow: "0 6px 20px rgba(0,0,0,0.05)"
};

const table = {
  width: "100%",
  borderCollapse: "collapse"
};

const th = {
  textAlign: "left",
  padding: "12px",
  color: "#1e293b",
  fontWeight: "700",
  borderBottom: "1px solid #e2e8f0"
};

const td = {
  padding: "14px",
  borderBottom: "1px solid #f1f5f9",
  color: "#334155",
  fontWeight: "500"
};

const row = {
  transition: "0.2s"
};

const badge = {
  padding: "6px 12px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "600"
};

export default Dashboard;