/**
 * Database Configuration Module
 * Handles connection establishing to MongoDB database via Mongoose.
 */

const mongoose = require('mongoose');

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