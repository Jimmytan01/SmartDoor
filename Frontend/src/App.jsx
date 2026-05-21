import { useState, useEffect } from "react";

function App() {
  const [page, setPage] = useState("Dashboard");
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);

  const [newName, setNewName] = useState("");
  const [newRfid, setNewRfid] = useState("");
  const [role, setRole] = useState("User");
  const [pin, setPin] = useState("");
  const [isWaitingScan, setIsWaitingScan] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [scanError, setScanError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deletingUserId, setDeletingUserId] = useState(null);

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
    return fetch("http://localhost:8080/api/users")
      .then(res => res.json())
      .then(data => setUsers(data || []));
  };

  const getLatestUnknownRecord = (payload) => {
    if (Array.isArray(payload)) {
      return payload[0] ?? null;
    }

    if (!payload || typeof payload !== "object") {
      return null;
    }

    if (Array.isArray(payload.data)) {
      return payload.data[0] ?? null;
    }

    if (payload.data && typeof payload.data === "object") {
      return payload.data;
    }

    if (payload.log && typeof payload.log === "object") {
      return payload.log;
    }

    return payload;
  };

  const normalizeRfidTag = (record) => {
    if (!record || typeof record !== "object") {
      return "";
    }

    const rawValue = record.rfid_tag
      ?? record.rfid
      ?? record.card_id
      ?? record.card_uid
      ?? record.uid;

    if (typeof rawValue === "number") {
      return String(rawValue);
    }

    if (typeof rawValue === "string") {
      return rawValue.trim();
    }

    return "";
  };

  const fetchLatestUnknownLog = () => {
    const url = `http://localhost:8080/api/logs/latest-unknown?t=${Date.now()}`;

    return fetch(url, { cache: "no-store" })
      .then(res => {
        // Endpoint scan sering balas 404/204 saat belum ada kartu yang tap.
        // Itu bukan error, cukup anggap "belum ada data".
        if (res.status === 404 || res.status === 204) {
          return null;
        }

        if (!res.ok) {
          throw new Error("Failed to read latest unknown card.");
        }

        return res.json();
      });
  };

  const startCardScan = () => {
    setScanError("");
    setScanMessage("Scanning... Tap kartu ke pintu");
    setIsWaitingScan(true);
  };

  const stopCardScan = () => {
    setIsWaitingScan(false);
    setScanMessage("");
  };

  useEffect(() => {
    if (!isWaitingScan) {
      return;
    }

    const intervalId = setInterval(() => {
      fetchLatestUnknownLog()
        .then(payload => {
          const latestRecord = getLatestUnknownRecord(payload);
          const latestRfid = normalizeRfidTag(latestRecord);

          if (!latestRfid) {
            return;
          }

          setNewRfid(latestRfid);
          setIsWaitingScan(false);
          setScanMessage("ID kartu terdeteksi.");
          setScanError("");
        })
        .catch(err => {
          setScanError(err.message);
        });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isWaitingScan]);

  useEffect(() => {
    if (page !== "User Management" && isWaitingScan) {
      setIsWaitingScan(false);
      setScanMessage("");
    }
  }, [page, isWaitingScan]);

  const addUser = () => {
    const normalizedName = newName.trim();
    const normalizedRfid = newRfid.trim();
    if (!normalizedName || !normalizedRfid) return;

    fetch("http://localhost:8080/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: normalizedName,
        rfid_tag: normalizedRfid,
        role: role
      })
    }).then(() => {
      setNewName("");
      setNewRfid("");
      setRole("User");
      setScanMessage("");
      setScanError("");
      fetchUsers();
    });
  };

  const updatePin = () => {
    if (!pin) return;

    fetch("http://localhost:8080/api/settings/pin", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ new_pin: pin })
    });
  };

  const deleteUser = (user) => {
    const userId = user?.id;
    const normalizedUserId = typeof userId === "number" || typeof userId === "string"
      ? String(userId)
      : "";

    if (!normalizedUserId) {
      setDeleteError("ID user tidak ditemukan.");
      return;
    }

    const isConfirmed = window.confirm(`Hapus user "${user.name}" secara permanen?`);
    if (!isConfirmed) return;

    setDeleteError("");
    setDeletingUserId(normalizedUserId);

    fetch(`http://localhost:8080/api/users/${encodeURIComponent(normalizedUserId)}`, {
      method: "DELETE"
    })
      .then(res => {
        if (!res.ok) {
          throw new Error("Gagal menghapus user.");
        }
      })
      .then(() => fetchUsers())
      .then(() => {
        setDeletingUserId(null);
      })
      .catch(err => {
        setDeletingUserId(null);
        setDeleteError(err.message);
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
          <h1 style={{ color: "#000000" }}>User Management</h1>

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
                placeholder="RFID (manual / scan)"
                style={input}
              />

              <button
                onClick={isWaitingScan ? stopCardScan : startCardScan}
                style={{
                  ...button,
                  minWidth: "120px",
                  background: isWaitingScan ? "#64748b" : "#0ea5e9"
                }}
              >
                {isWaitingScan ? "Stop Scan" : "Scan Kartu"}
              </button>

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

            {scanMessage && <p style={{ ...scanInfo, color: "#0f766e" }}>{scanMessage}</p>}
            {scanError && <p style={{ ...scanInfo, color: "#dc2626" }}>{scanError}</p>}
            {deleteError && <p style={{ ...scanInfo, color: "#dc2626" }}>{deleteError}</p>}

            <table style={table}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  <th style={th}>Name</th>
                  <th style={th}>RFID</th>
                  <th style={th}>Role</th>
                  <th style={th}>Action</th>
                </tr>
              </thead>

              <tbody>
                {users.map((u, i) => {
                  const hasUserId = typeof u.id === "number" || typeof u.id === "string";
                  const rowUserId = hasUserId ? String(u.id) : "";
                  const isDeleting = deletingUserId === rowUserId;

                  return (
                    <tr key={u.id ?? i} style={row}>
                      <td style={td}>{u.name}</td>
                      <td style={td}>{u.rfid_tag}</td>
                      <td style={td}>{u.role}</td>
                      <td style={td}>
                        <button
                          onClick={() => deleteUser(u)}
                          disabled={!hasUserId || isDeleting}
                          style={{
                            ...deleteButton,
                            opacity: !hasUserId || isDeleting ? 0.6 : 1,
                            cursor: !hasUserId || isDeleting ? "not-allowed" : "pointer"
                          }}
                        >
                          {isDeleting ? "Deleting..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      );
    }

    if (page === "Keypad Settings") {
      return (
        <>
          <h1 style={{ color: "#000000" }}>Keypad Settings</h1>

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
          <h1 style={{ color: "#000000" }}>Access Logs</h1>
          <div style={card}>{renderLogs()}</div>
        </>
      );
    }

    return (
      <>
        <h1 style={{ color: "#000000" }}>Dashboard</h1>

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
  padding: "30px",
  background: "#f8fafc",
  color: "#0f172a",
  fontFamily: "system-ui"
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
  marginTop: "20px",
  boxShadow: "0 4px 15px rgba(0,0,0,0.05)"
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
    textAlign: "center",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)"
  }}>
    <p style={{ color: "#1e293b", fontWeight: "600", fontSize: "14px", margin: "0 0 8px 0" }}>{title}</p>
    <h2 style={{ color: "#0f172a", margin: 0 }}>{value}</h2>
  </div>
);

const formGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr auto 1fr auto",
  gap: "10px",
  marginBottom: "20px"
};

const scanInfo = {
  margin: "0 0 8px 0",
  fontSize: "13px",
  fontWeight: "500"
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

const deleteButton = {
  background: "#dc2626",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  fontSize: "13px",
  fontWeight: "600"
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "10px"
};

const th = {
  textAlign: "left",
  padding: "14px 16px",
  fontSize: "14px",
  fontWeight: "700",
  color: "#1e293b"
};

const td = {
  padding: "14px 16px",
  fontSize: "14px",
  fontWeight: "500",
  color: "#334155"
};

const row = {
  borderBottom: "1px solid #e5e7eb",
  transition: "0.2s"
};

export default App;
