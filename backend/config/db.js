/**
 * Database Configuration Module
 * Handles connection establishing to MongoDB database via Mongoose.
 */

const dns = require('dns');
const mongoose = require('mongoose');

// Some home routers refuse the DNS "SRV" lookup that mongodb+srv:// URIs need,
// even though normal lookups work fine. Point Node's DNS resolver at public
// DNS servers so the Atlas connection string can be resolved.
// Note: dns.setServers() changes Node's resolver for the ENTIRE process, not
// just this Mongo connection — any other outbound call this app ever makes
// (a future third-party API, a webhook) will also resolve through 8.8.8.8/
// 1.1.1.1 instead of whatever DNS the host is configured to use.
//
// This alone isn't always enough — some networks block SRV/TXT-type DNS
// queries outright, to ANY resolver, while ordinary lookups still work
// fine ("querySrv ETIMEOUT ..." even with the override above). If that
// happens, the real fix is switching MONGO_URI in .env to Atlas's standard
// (non-SRV) connection string, which only needs ordinary hostname lookups
// for the three shard hosts — see the comment in .env.example.
dns.setServers(['8.8.8.8', '1.1.1.1']);

/**
 * Connects to MongoDB database using URI specified in environment configuration.
 * Implements a fail-fast strategy by terminating the application process if the
 * initial database connection attempt fails.
 * 
 * @async
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Database Error] Connection failed: ${error.message}`);
    // Fail fast: App cannot process requests without a database connection
    process.exit(1);
  }
};

module.exports = connectDB;