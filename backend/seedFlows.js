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

// Prints which database this script is about to wipe (host + db name only,
// no credentials) so it's never ambiguous which MONGO_URI got picked up.
function describeTarget(mongoUri) {
  try {
    const url = new URL(mongoUri);
    return `${url.hostname}${url.pathname}`;
  } catch {
    return '(unparseable MONGO_URI)';
  }
}

const seedFlows = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing in the environment variables.');
    }

    // This script deletes every existing Flow document before reseeding.
    // Requiring an explicit --yes is cheap insurance against running it
    // against a shared/production MONGO_URI by mistake.
    if (!process.argv.includes('--yes')) {
      console.log(`[Seed] This will DELETE all existing Flow documents in: ${describeTarget(process.env.MONGO_URI)}`);
      console.log('[Seed] Re-run with --yes to actually do this: node seedFlows.js --yes');
      process.exit(1);
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