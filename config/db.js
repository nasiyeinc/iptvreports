require('dotenv').config();
const mongoose = require('mongoose');
const createTunnel = require('./ssh');

let tunnelServer = null;

const connectDB = async () => {
  try {
    // Step 1: Start SSH Tunnel
    tunnelServer = await createTunnel();
    console.log("✅ SSH Tunnel Connected");

    // Step 2: Connect MongoDB
    const uri = `mongodb://127.0.0.1:27017/${process.env.MONGO_DB}`;

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000 ,
    });

    console.log("✅ MongoDB Connected Successfully");
    return true;
  } catch (error) {
    console.error("❌ Connection Failed:", error.message);
    throw error;
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (tunnelServer) {
      tunnelServer.close();
      console.log("✅ SSH Tunnel closed");
    }
    console.log("✅ Database disconnected");
  } catch (error) {
    console.error("Error during disconnect:", error);
  }
};

module.exports = { connectDB, disconnectDB };