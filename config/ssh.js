require('dotenv').config();
const tunnel = require('tunnel-ssh');

const createTunnel = () => {
  return new Promise((resolve, reject) => {
    const config = {
      username: process.env.SSH_USER,
      password: process.env.SSH_PASSWORD,
      host: process.env.SSH_HOST,
      port: Number(process.env.SSH_PORT),
      dstHost: '127.0.0.1',
      dstPort: 27017,
      localHost: '127.0.0.1',
      localPort: 27017,
      keepAlive: true,
      retryMax: 3
    };

    console.log("🔄 Establishing SSH tunnel...");
    
    tunnel(config, (error, server) => {
      if (error) {
        console.error("❌ SSH ERROR:", error.message);
        reject(error);
      } else {
        console.log("✅ SSH Tunnel Ready on port 27017");
        resolve(server);
      }
    });
  });
};

module.exports = createTunnel;