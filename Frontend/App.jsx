import { useState, useEffect } from "react";

function App() {
  const [page, setPage] = useState("Dashboard");
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);

  const [newName, setNewName] = useState("");
  const [newRfid, setNewRfid] = useState("");
  const [role, setRole] = useState("User");
  const [pin, setPin] = useState("");

  useEffect(() => {
    fetchLogs();
    fetchUsers();
  }, []);

  const fetchLogs = () => {
    fetch("http://localhost:8080/api/logs")
      .then(res => res.json())
      .then(data => setLogs(data || []));
  };

  const fetchUsers = () => {
    fetch("http://localhost:8080/api/users")
      .then(res => res.json())
      .then(data => setUsers(data || []));
  };

  const addUser = () => {
    if (!newName || !newRfid) return;

    fetch("http://localhost:8080/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: newName,
        rfid_tag: newRfid,
        role: role
      })
    }).then(() => {
      setNewName("");
      setNewRfid("");
      setRole("User");
      fetchUsers();
    });
  };

  const updatePin = () => {
    if (!pin) return;

    fetch("http://localhost:8080/api/settings/pin", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin })
    });
  };

  /* ================= LOG TABLE ================= */

  const renderLogs = () => {
    if (logs.length === 0) {
      return <p style={{ color: "#64748b" }}>No logs yet</p>;
    }

    return (
      <table style={table}>
        <thead>
          <tr style={{ background: "#f1f5f9" }}>
            <th style={th}>User</th>
            <th style={th}>Status</th>
          </tr>
        </thead>

        <tbody>
          {logs.map((log, i) => (
            <tr
              key={i}
              style={row}
              onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <td style={td}>{log.user_name || "Unknown"}</td>

              <td style={td}>
                <span style={{
                  padding: "6px 12px",
                  borderRadius: "999px",
                  fontSize: "12px",
                  fontWeight: "600",
                  background: log.status === "Denied" ? "#fee2e2" : "#dcfce7",
                  color: log.status === "Denied" ? "#dc2626" : "#16a34a"
                }}>
                  {log.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  /* ================= PAGE ================= */

  const renderPage = () => {

    if (page === "User Management") {
      return (
        <>
          <h1>User Management</h1>

          <div style={card}>
            <h3>Add User</h3>

            <div style={formGrid}>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Name"
                style={input}
              />

              <input
                value={newRfid}
                onChange={e => setNewRfid(e.target.value)}
                placeholder="RFID"
                style={input}
              />

              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                style={input}
              >
                <option>User</option>
                <option>Admin</option>
              </select>

              <button onClick={addUser} style={button}>
                Add
              </button>
            </div>

            <table style={table}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  <th style={th}>Name</th>
                  <th style={th}>RFID</th>
                  <th style={th}>Role</th>
                </tr>
              </thead>

              <tbody>
                {users.map((u, i) => (
                  <tr key={i} style={row}>
                    <td style={td}>{u.name}</td>
                    <td style={td}>{u.rfid_tag}</td>
                    <td style={td}>{u.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );
    }

    if (page === "Keypad Settings") {
      return (
        <>
          <h1>Keypad Settings</h1>

          <div style={card}>
            <input
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="New PIN"
              style={{ ...input, width: "100%", marginBottom: "10px" }}
            />

            <button onClick={updatePin} style={button}>
              Save PIN
            </button>
          </div>
        </>
      );
    }

    if (page === "Access Logs") {
      return (
        <>
          <h1>Access Logs</h1>
          <div style={card}>{renderLogs()}</div>
        </>
      );
    }

    return (
      <>
        <h1>Dashboard</h1>

        <div style={stats}>
          <Stat title="Users" value={users.length} />
          <Stat title="Access" value={logs.length} />
          <Stat title="Cards" value="22" />
          <Stat title="Response" value="0.3s" />
        </div>

        <div style={card}>
          <h3>Recent Logs</h3>
          {renderLogs()}
        </div>
      </>
    );
  };

  return (
    <div style={{ display: "flex", width: "100%" }}>

      {/* SIDEBAR */}
      <div style={sidebar}>
        <h2>🔐 SmartDoor</h2>

        {["Dashboard", "Access Logs", "User Management", "Keypad Settings"].map(menu => (
          <button
            key={menu}
            onClick={() => setPage(menu)}
            style={{
              ...menuBtn,
              background: page === menu ? "#2563eb" : "transparent"
            }}
          >
            {menu}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div style={content}>
        {renderPage()}
      </div>

    </div>
  );
}

/* ================= STYLE ================= */

const sidebar = {
  width: "260px",
  background: "#020617",
  color: "white",
  padding: "20px",
  height: "100vh"
};

const content = {
  flex: 1,
  padding: "30px"
};

const menuBtn = {
  width: "100%",
  padding: "12px",
  border: "none",
  color: "white",
  cursor: "pointer",
  textAlign: "left",
  borderRadius: "8px",
  marginBottom: "10px"
};

const card = {
  background: "white",
  padding: "20px",
  borderRadius: "12px",
  marginTop: "20px"
};

const stats = {
  display: "grid",
  gridTemplateColumns: "repeat(4,1fr)",
  gap: "10px"
};

const Stat = ({ title, value }) => (
  <div style={{
    background: "white",
    padding: "15px",
    borderRadius: "10px",
    textAlign: "center"
  }}>
    <p>{title}</p>
    <h2>{value}</h2>
  </div>
);

const formGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr auto",
  gap: "10px",
  marginBottom: "20px"
};

const input = {
  padding: "10px",
  border: "1px solid #ccc",
  borderRadius: "8px"
};

const button = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "10px",
  borderRadius: "8px",
  cursor: "pointer"
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "10px"
};

const th = {
  textAlign: "left",
  padding: "14px 16px",
  fontSize: "13px",
  fontWeight: "600",
  color: "#64748b"
};

const td = {
  padding: "14px 16px",
  fontSize: "14px",
  color: "#0f172a"
};

const row = {
  borderBottom: "1px solid #e5e7eb",
  transition: "0.2s"
};

export default App;