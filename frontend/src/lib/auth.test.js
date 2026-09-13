// Regression checks for lib/auth.js - where the login token/user get stored.
// Runs with Node's built-in test runner (`node --test`), no browser or extra
// dependency needed: a tiny in-memory Storage shim stands in for the real
// localStorage/sessionStorage the browser would provide.

import test from 'node:test';
import assert from 'node:assert/strict';
import { getToken, getStoredUser, setToken, clearToken } from './auth.js';

class MemoryStorage {
  constructor() {
    this.data = new Map();
  }
  getItem(key) {
    return this.data.has(key) ? this.data.get(key) : null;
  }
  setItem(key, value) {
    this.data.set(key, String(value));
  }
  removeItem(key) {
    this.data.delete(key);
  }
}

function resetStorages() {
  globalThis.localStorage = new MemoryStorage();
  globalThis.sessionStorage = new MemoryStorage();
}

test('setToken with keepSignedIn=true stores in localStorage, not sessionStorage', () => {
  resetStorages();
  setToken('abc123', { name: 'Ali' }, true);
  assert.equal(localStorage.getItem('paklaw_token'), 'abc123');
  assert.equal(sessionStorage.getItem('paklaw_token'), null);
});

test('setToken with keepSignedIn=false stores in sessionStorage, not localStorage', () => {
  resetStorages();
  setToken('abc123', { name: 'Ali' }, false);
  assert.equal(sessionStorage.getItem('paklaw_token'), 'abc123');
  assert.equal(localStorage.getItem('paklaw_token'), null);
});

test('getToken finds a token regardless of which storage holds it', () => {
  resetStorages();
  localStorage.setItem('paklaw_token', 'from-local');
  assert.equal(getToken(), 'from-local');

  resetStorages();
  sessionStorage.setItem('paklaw_token', 'from-session');
  assert.equal(getToken(), 'from-session');
});

test('getStoredUser parses the saved user object back out', () => {
  resetStorages();
  setToken('abc123', { name: 'Ali', id: '1' }, true);
  assert.deepEqual(getStoredUser(), { name: 'Ali', id: '1' });
});

test('clearToken removes the token/user from both storages', () => {
  resetStorages();
  localStorage.setItem('paklaw_token', 'a');
  sessionStorage.setItem('paklaw_token', 'b');
  clearToken();
  assert.equal(getToken(), null);
  assert.equal(getStoredUser(), null);
});

test('getToken returns null when nothing was ever stored', () => {
  resetStorages();
  assert.equal(getToken(), null);
  assert.equal(getStoredUser(), null);
});
