require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const { connectDB, disconnectDB } = require("./config/db");

const app = express();
app.use(cors());
app.use(express.json());

// Connect to database with SSH tunnel
connectDB().catch(err => {
  console.error("Failed to connect to database:", err);
  process.exit(1);
});

// API Routes (VIEW ONLY + User Management)
app.use("/api", require("./routes/api"));

// Serve static frontend files
app.use(express.static(path.join(__dirname, "frontend")));
app.use("/css", express.static(path.join(__dirname, "frontend/css")));
app.use("/js", express.static(path.join(__dirname, "frontend/js")));
app.use("/components", express.static(path.join(__dirname, "frontend/components")));
app.use("/pages", express.static(path.join(__dirname, "frontend/pages")));

// Routes for HTML pages
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "pages", "login.html"));
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "pages", "dashboard.html"));
});

app.get("/customers", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "pages", "customers.html"));
});

app.get("/reports", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "pages", "reports.html"));
});

app.get("/summary", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "pages", "summary.html"));
});

app.get("/role-access", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "pages", "role-access.html"));
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await disconnectDB();
  process.exit(0);
});

const PORT = process.env.PORT || 7000 ;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 View Only Mode - No Insert/Update/Delete for main data`);
  console.log(`👥 User Management - Full CRUD operations available`);
  console.log(`📁 Current directory: ${__dirname}`);
  console.log(`📁 Frontend path: ${path.join(__dirname, "frontend", "pages")}`);
});