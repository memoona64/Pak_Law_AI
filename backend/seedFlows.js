/**
 * Guided Procedure Flows One-Time Seed Script
 * Reads data/flows.json, clears the existing Flow collection, and seeds initial records.
 */

const dns = require('dns');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Some home routers refuse the DNS "SRV" lookup that mongodb+srv:// URIs need,
// even though normal lookups work fine (see config/db.js for the same fix).
dns.setServers(['8.8.8.8', '1.1.1.1']);

const Flow = require('./models/Flow');

const seedFlows = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing in the environment variables.');
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('[Seed] Connected to MongoDB.');

    const filePath = path.join(__dirname, 'data', 'flows.json');
    const fileData = fs.readFileSync(filePath, 'utf8');
    const parsedData = JSON.parse(fileData);

    await Flow.deleteMany({});
    console.log('[Seed] Cleared existing Flow collection.');

    const insertedFlows = await Flow.insertMany(parsedData.flows);
    console.log(`[Seed] Successfully seeded ${insertedFlows.length} procedure flows.`);

    await mongoose.disconnect();
    console.log('[Seed] Disconnected from MongoDB.');
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error] Failed to seed guided flows:', error);
    process.exit(1);
  }
};

seedFlows();