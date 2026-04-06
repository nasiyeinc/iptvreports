require('dotenv').config();
const mongoose = require('mongoose');
const createTunnel = require('./config/ssh');

const start = async () => {
  try {
    // Step 1: Start SSH Tunnel
    await createTunnel();
    console.log("✅ SSH Tunnel Connected");

    // Step 2: Connect MongoDB
    const uri = `mongodb://127.0.0.1:27018/${process.env.MONGO_DB}`;

    await mongoose.connect(uri);

    console.log("✅ MongoDB Connected Successfully");

    process.exit(0);
  } catch (error) {
    console.error("❌ Connection Failed:", error.message);
    process.exit(1);
  }
};

start();