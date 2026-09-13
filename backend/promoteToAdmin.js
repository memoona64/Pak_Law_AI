/**
 * Promote-to-Admin One-Time Script
 * Sets one existing user's role to 'admin' by email. There's no in-app way
 * to do this on purpose (see models/User.js) - admin access gates the
 * evaluation/benchmark dashboard, so granting it has to be a deliberate,
 * out-of-band action, not something reachable from the app itself.
 *
 * Usage: node promoteToAdmin.js someone@example.com
 */

const dns = require('dns');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Some home routers refuse the DNS "SRV" lookup that mongodb+srv:// URIs need,
// even though normal lookups work fine (see config/db.js for the same fix).
dns.setServers(['8.8.8.8', '1.1.1.1']);

const User = require('./models/User');

const promote = async () => {
  const email = process.argv[2];
  if (!email) {
    console.log('Usage: node promoteToAdmin.js someone@example.com');
    process.exit(1);
  }

  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing in the environment variables.');
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('[Promote] Connected to MongoDB.');

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOneAndUpdate(
      { email: normalizedEmail },
      { role: 'admin' },
      { new: true }
    );

    if (!user) {
      console.log(`[Promote] No account found for ${normalizedEmail}.`);
      process.exit(1);
    }

    console.log(`[Promote] ${user.email} is now an admin.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Promote Error]', error.message);
    process.exit(1);
  }
};

promote();
