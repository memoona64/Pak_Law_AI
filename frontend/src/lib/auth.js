// Shared helpers for where the login token/user live. "Keep me signed in"
// (Login.jsx) decides which storage is used at sign-in time: checked ->
// localStorage (survives closing the browser), unchecked -> sessionStorage
// (cleared when the tab/browser closes). Every other page just wants "the
// token, wherever it is" or "clear it everywhere on logout/expiry", so that
// logic lives here once instead of being repeated (and drifting) per page.

// Reads the saved token — sessionStorage first, then localStorage, so a page
// doesn't need to know which one login used.
export function getToken() {
  try {
    return sessionStorage.getItem('paklaw_token') || localStorage.getItem('paklaw_token');
  } catch {
    return null;
  }
}

// Reads the saved user object the same way (used for the sidebar's name/initials).
export function getStoredUser() {
  try {
    const raw = sessionStorage.getItem('paklaw_user') || localStorage.getItem('paklaw_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Saves the token/user to whichever storage "Keep me signed in" selected.
export function setToken(token, user, keepSignedIn) {
  const store = keepSignedIn ? localStorage : sessionStorage;
  try {
    store.setItem('paklaw_token', token);
    store.setItem('paklaw_user', JSON.stringify(user));
  } catch {
    /* best-effort only */
  }
}

// Clears the token/user from both storages — used on sign-out and on a 401
// (expired session), since we don't know here which one holds it.
export function clearToken() {
  try {
    sessionStorage.removeItem('paklaw_token');
    sessionStorage.removeItem('paklaw_user');
  } catch {
    /* best-effort only */
  }
  try {
    localStorage.removeItem('paklaw_token');
    localStorage.removeItem('paklaw_user');
  } catch {
    /* best-effort only */
  }
}
