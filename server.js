
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, "data.json");

// Initial login credentials
const USER_ID = "Abhi@12";
const PASSWORD = "Password@12";

const passwordHash = bcrypt.hashSync(PASSWORD, 10);

// Middleware
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 30 * 60 * 1000
    }
  })
);

// Initialize database
function initializeDatabase() {
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = [
      {
        id: 1,
        userId: "USR001",
        userName: "Rahul Sharma",
        loanAmount: 500000,
        collectionAmount: 500000,
        nocStatus: "Completed"
      },
      {
        id: 2,
        userId: "USR002",
        userName: "Priya Verma",
        loanAmount: 350000,
        collectionAmount: 200000,
        nocStatus: "Pending"
      },
      {
        id: 3,
        userId: "USR003",
        userName: "Amit Kumar",
        loanAmount: 750000,
        collectionAmount: 750000,
        nocStatus: "Completed"
      }
    ];

    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(initialData, null, 2)
    );
  }
}

initializeDatabase();

function readRecords() {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function writeRecords(records) {
  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(records, null, 2)
  );
}

// Authentication middleware
function authenticate(req, res, next) {
  if (!req.session.loggedIn) {
    return res.status(401).json({
      message: "Please login first."
    });
  }

  next();
}

// Login page
app.get("/", (req, res) => {
  res.send(loginPage);
});

// Login API
app.post("/api/login", async (req, res) => {
  const { userId, password } = req.body;

  if (
    userId !== USER_ID ||
    !password ||
    !(await bcrypt.compare(password, passwordHash))
  ) {
    return res.status(401).json({
      message: "Invalid User ID or Password."
    });
  }

  req.session.regenerate((err) => {
    if (err) {
      return res.status(500).json({
        message: "Unable to create session."
      });
    }

    req.session.loggedIn = true;
    req.session.userId = userId;

    res.json({
      success: true,
      message: "Login successful."
    });
  });
});

// Check login status
app.get("/api/session", authenticate, (req, res) => {
  res.json({
    loggedIn: true,
    userId: req.session.userId
  });
});

// Logout API
app.post("/api/logout", authenticate, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        message: "Logout failed."
      });
    }

    res.clearCookie("connect.sid");

    res.json({
      success: true,
      message: "Logged out successfully."
    });
  });
});

// Collection NOC page
app.get("/dashboard", authenticate, (req, res) => {
  res.send(dashboardPage);
});

// Get all records
app.get("/api/records", authenticate, (req, res) => {
  res.json(readRecords());
});

// Validate records before saving
function validateRecords(records) {
  if (!Array.isArray(records) || records.length > 10000) {
    return false;
  }

  const ids = new Set();

  return records.every((record) => {
    const valid =
      record &&
      Number.isInteger(record.id) &&
      record.id > 0 &&
      !ids.has(record.id) &&
      typeof record.userId === "string" &&
      record.userId.trim().length > 0 &&
      record.userId.length <= 50 &&
      typeof record.userName === "string" &&
      record.userName.trim().length > 0 &&
      record.userName.length <= 100 &&
      Number.isFinite(Number(record.loanAmount)) &&
      Number(record.loanAmount) >= 0 &&
      Number.isFinite(Number(record.collectionAmount)) &&
      Number(record.collectionAmount) >= 0 &&
      Number(record.loanAmount) <= 1000000000000 &&
      Number(record.collectionAmount) <= 1000000000000 &&
      ["Pending", "Completed", "In Progress"].includes(record.nocStatus);

    if (valid) ids.add(record.id);

    return valid;
  });
}

// Save all changes
app.put("/api/records", authenticate, (req, res) => {
  const records = req.body.records;

  if (!validateRecords(records)) {
    return res.status(400).json({
      message: "Invalid record data. Please check all fields."
    });
  }

  const cleanedRecords = records.map((record) => ({
    id: record.id,
    userId: record.userId.trim(),
    userName: record.userName.trim(),
    loanAmount: Number(record.loanAmount),
    collectionAmount: Number(record.collectionAmount),
    nocStatus: record.nocStatus
  }));

  try {
    writeRecords(cleanedRecords);

    res.json({
      success: true,
      message: "Changes saved successfully."
    });
  } catch (error) {
    res.status(500).json({
      message: "Unable to save records."
    });
  }
});

// Login HTML
const loginPage = `
<!DOCTYPE html>
<html>
<head>
<title>Test1 - Login</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: Arial, sans-serif;
  background: linear-gradient(135deg, #142d59, #2876b9);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-box {
  background: white;
  width: 90%;
  max-width: 400px;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 10px 35px rgba(0,0,0,.2);
}

h1 {
  text-align: center;
  color: #183b70;
  margin-bottom: 8px;
}

.subtitle {
  text-align: center;
  color: #777;
  margin-bottom: 30px;
}

label {
  display: block;
  margin: 15px 0 7px;
  font-weight: bold;
}

input {
  width: 100%;
  padding: 13px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 15px;
}

button {
  width: 100%;
  padding: 13px;
  margin-top: 25px;
  background: #1765b1;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
}

button:hover {
  background: #104b88;
}

#error {
  color: red;
  text-align: center;
  margin-top: 15px;
}
</style>
</head>

<body>

<div class="login-box">
  <h1>Test1</h1>
  <p class="subtitle">Welcome! Please sign in.</p>

  <form id="loginForm">
    <label>User ID</label>
    <input id="userId" type="text"
      placeholder="Enter User ID" required>

    <label>Password</label>
    <input id="password" type="password"
      placeholder="Enter Password" required>

    <button type="submit">Sign In</button>
    <p id="error"></p>
  </form>
</div>

<script>
document.getElementById("loginForm")
.addEventListener("submit", async function(e) {
  e.preventDefault();

  const userId = document.getElementById("userId").value;
  const password = document.getElementById("password").value;
  const error = document.getElementById("error");

  error.textContent = "";

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ userId, password })
    });

    const result = await response.json();

    if (response.ok) {
      window.location.href = "/dashboard";
    } else {
      error.textContent = result.message;
    }
  } catch (err) {
    error.textContent = "Unable to connect to server.";
  }
});
</script>

</body>
</html>
`;

// Dashboard HTML
const dashboardPage = `
<!DOCTYPE html>
<html>
<head>
<title>Test1 - Collection NOC</title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<style>
* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: Arial, sans-serif;
  background: #f1f4f9;
  color: #26364a;
}

.header {
  background: #183b70;
  color: white;
  padding: 18px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
}

.header h2 {
  margin: 0;
}

.logout {
  background: #e74c3c;
  border: none;
  color: white;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
}

.container {
  padding: 25px;
  max-width: 1500px;
  margin: auto;
}

.summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  margin-bottom: 25px;
}

.summary-card {
  background: white;
  padding: 20px;
  border-radius: 9px;
  box-shadow: 0 2px 8px #00000010;
}

.summary-card h3 {
  color: #777;
  margin: 0 0 10px;
  font-size: 14px;
}

.summary-card p {
  font-size: 25px;
  font-weight: bold;
  margin: 0;
}

.table-container {
  background: white;
  padding: 20px;
  border-radius: 9px;
  overflow-x: auto;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.toolbar h3 {
  margin: 0;
}

.action-btn {
  padding: 10px 15px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  color: white;
}

.add-btn { background: #198754; }
.save-btn { background: #1765b1; }
.delete-btn { background: #dc3545; }

table {
  width: 100%;
  min-width: 850px;
  border-collapse: collapse;
}

th {
  background: #eaf0f8;
  color: #183b70;
  padding: 14px 10px;
  text-align: left;
}

td {
  padding: 10px;
  border-bottom: 1px solid #eee;
}

td input, td select {
  width: 100%;
  padding: 9px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.status {
  font-weight: bold;
}

#message {
  margin-top: 15px;
  font-weight: bold;
}

@media(max-width: 700px) {
  .summary {
    grid-template-columns: 1fr;
  }

  .container {
    padding: 12px;
  }

  .header {
    padding: 15px;
  }
}
</style>
</head>

<body>

<div class="header">
  <h2>Collection NOC</h2>
  <button class="logout" onclick="logout()">Logout</button>
</div>

<div class="container">

  <div class="summary">
    <div class="summary-card">
      <h3>Total Users</h3>
      <p id="totalUsers">0</p>
    </div>

    <div class="summary-card">
      <h3>Total Loan Amount</h3>
      <p id="totalLoan">0</p>
    </div>

    <div class="summary-card">
      <h3>Total Collection Amount</h3>
      <p id="totalCollection">0</p>
    </div>
  </div>

  <div class="table-container">

    <div class="toolbar">
      <h3>Collection NOC Records</h3>

      <div>
        <button class="action-btn add-btn"
          onclick="addRecord()">+ Add Record</button>

        <button class="action-btn save-btn"
          onclick="saveRecords()">Save Changes</button>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>User ID</th>
          <th>User Name</th>
          <th>Loan Amount</th>
          <th>Collection Amount</th>
          <th>NOC Status</th>
          <th>Action</th>
        </tr>
      </thead>

      <tbody id="recordTable"></tbody>
    </table>

    <p id="message"></p>

  </div>
</div>

<script>
let records = [];
let nextId = 1;

function createCellInput(value, type, field) {
  const input = document.createElement("input");
  input.type = type;
  input.value = value;
  input.dataset.field = field;

  if (type === "number") {
    input.min = "0";
    input.step = "0.01";
  }

  input.addEventListener("input", () => {
    const row = input.closest("tr");
    const id = Number(row.dataset.id);
    const record = records.find(r => r.id === id);

    if (record) {
      record[field] = type === "number"
        ? input.value
        : input.value;
      updateSummary();
    }
  });

  return input;
}

function renderTable() {
  const tbody = document.getElementById("recordTable");
  tbody.replaceChildren();

  records.forEach(record => {
    const row = document.createElement("tr");
    row.dataset.id = record.id;

    const fields = [
      ["userId", "text"],
      ["userName", "text"],
      ["loanAmount", "number"],
      ["collectionAmount", "number"]
    ];

    fields.forEach(([field, type]) => {
      const td = document.createElement("td");
      td.appendChild(
        createCellInput(record[field], type, field)
      );
      row.appendChild(td);
    });

    const statusCell = document.createElement("td");
    const select = document.createElement("select");

    ["Pending", "In Progress", "Completed"].forEach(status => {
      const option = document.createElement("option");
      option.value = status;
      option.textContent = status;
      option.selected = record.nocStatus === status;
      select.appendChild(option);
    });

    select.addEventListener("change", () => {
      record.nocStatus = select.value;
    });

    statusCell.appendChild(select);
    row.appendChild(statusCell);

    const actionCell = document.createElement("td");
    const deleteButton = document.createElement("button");

    deleteButton.textContent = "Delete";
    deleteButton.className = "action-btn delete-btn";

    deleteButton.addEventListener("click", () => {
      if (confirm("Are you sure you want to delete this record?")) {
        records = records.filter(r => r.id !== record.id);
        renderTable();
        showMessage("Record removed. Click Save Changes to confirm.", "green");
      }
    });

    actionCell.appendChild(deleteButton);
    row.appendChild(actionCell);

    tbody.appendChild(row);
  });

  updateSummary();
}

function updateSummary() {
  const totalLoan = records.reduce(
    (sum, r) => sum + (Number(r.loanAmount) || 0), 0
  );

  const totalCollection = records.reduce(
    (sum, r) => sum + (Number(r.collectionAmount) || 0), 0
  );

  document.getElementById("totalUsers").textContent = records.length;

  document.getElementById("totalLoan").textContent =
    totalLoan.toLocaleString("en-IN");

  document.getElementById("totalCollection").textContent =
    totalCollection.toLocaleString("en-IN");
}

function addRecord() {
  records.push({
    id: nextId++,
    userId: "",
    userName: "",
    loanAmount: 0,
    collectionAmount: 0,
    nocStatus: "Pending"
  });

  renderTable();
  showMessage("New record added. Complete the details and save.", "green");
}

function showMessage(message, color) {
  const element = document.getElementById("message");
  element.textContent = message;
  element.style.color = color;
}

async function loadRecords() {
  try {
    const response = await fetch("/api/records");

    if (response.status === 401) {
      window.location.href = "/";
      return;
    }

    if (!response.ok) {
      throw new Error("Unable to load records.");
    }

    records = await response.json();

    nextId = records.reduce(
      (max, r) => Math.max(max, r.id), 0
    ) + 1;

    renderTable();
  } catch (error) {
    showMessage(error.message, "red");
  }
}

async function saveRecords() {
  try {
    const response = await fetch("/api/records", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ records })
    });

    const result = await response.json();

    if (response.status === 401) {
      window.location.href = "/";
      return;
    }

    if (!response.ok) {
      throw new Error(result.message || "Save failed.");
    }

    showMessage("All changes saved successfully!", "green");
    await loadRecords();

  } catch (error) {
    showMessage(error.message, "red");
  }
}

async function logout() {
  try {
    const response = await fetch("/api/logout", {
      method: "POST"
    });

    if (response.ok) {
      window.location.replace("/");
    } else {
      showMessage("Unable to logout. Please try again.", "red");
    }
  } catch (error) {
    showMessage("Server connection failed.", "red");
  }
}

// Check session and load dashboard
async function initializeDashboard() {
  try {
    const response = await fetch("/api/session");

    if (!response.ok) {
      window.location.replace("/");
      return;
    }

    await loadRecords();
  } catch (error) {
    window.location.replace("/");
  }
}

initializeDashboard();
</script>

</body>
</html>
`;

// Start server
app.listen(PORT, () => {
  console.log("--------------------------------");
  console.log("Test1 Application Started");
  console.log("URL: http://localhost:" + PORT);
  console.log("--------------------------------");
});
