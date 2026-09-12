/**
 * Admin Bootstrap
 * If ADMIN_EMAIL and ADMIN_PASSWORD are set in the environment, ensures that
 * account exists with role: 'admin' every time the server starts — so
 * there's always a known admin login without a separate manual step (see
 * promoteToAdmin.js for the alternative, one-off way to promote a different
 * account). Safe to run on every boot: creates the account once, then just
 * confirms the role on every later start. Unset either variable to turn
 * this off entirely.
 */

const bcrypt = require('bcrypt');
const User = require('./models/User');

async function ensureAdminAccount() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });

  if (existing) {
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      await existing.save();
      console.log(`[Admin Bootstrap] Promoted existing account ${normalizedEmail} to admin.`);
    }
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);
  await User.create({
    name: 'Admin',
    email: normalizedEmail,
    passwordHash,
    role: 'admin',
  });
  console.log(`[Admin Bootstrap] Created admin account ${normalizedEmail}.`);
}

module.exports = ensureAdminAccount;
