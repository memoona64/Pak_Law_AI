/**
 * Admin-Only Access Middleware
 * Blocks any request whose authenticated user isn't role: 'admin'. Must run
 * after middleware/auth.js (protect), which is what populates req.user.
 *
 * Used to keep the evaluation/benchmark dashboard (/api/eval/*) off the
 * regular user side of the app entirely - not just hidden from the nav,
 * but actually unreachable by a non-admin account even if they call the
 * API directly.
 */
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
};

module.exports = requireAdmin;
