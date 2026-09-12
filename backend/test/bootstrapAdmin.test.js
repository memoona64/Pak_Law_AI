// Regression checks for bootstrapAdmin.js. User is mocked directly
// (require() caches modules) — no real database needed.

const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const User = require('../models/User');
const ensureAdminAccount = require('../bootstrapAdmin');

function withEnv(vars, run) {
  const original = { ADMIN_EMAIL: process.env.ADMIN_EMAIL, ADMIN_PASSWORD: process.env.ADMIN_PASSWORD };
  Object.assign(process.env, vars);
  return run().finally(() => Object.assign(process.env, original));
}

function withMockedUser(mocks, run) {
  const original = { findOne: User.findOne, create: User.create };
  Object.assign(User, mocks);
  return run().finally(() => Object.assign(User, original));
}

test('does nothing when ADMIN_EMAIL/ADMIN_PASSWORD are not set', async () => {
  await withEnv({ ADMIN_EMAIL: '', ADMIN_PASSWORD: '' }, async () => {
    let called = false;
    await withMockedUser(
      { findOne: () => { called = true; return Promise.resolve(null); } },
      async () => {
        await ensureAdminAccount();
        assert.equal(called, false);
      }
    );
  });
});

test('creates the admin account with role admin when it does not exist yet', async () => {
  await withEnv({ ADMIN_EMAIL: 'Admin@Example.com', ADMIN_PASSWORD: 'hunter2' }, async () => {
    let created = null;
    await withMockedUser(
      {
        findOne: () => Promise.resolve(null),
        create: async (doc) => { created = doc; return { ...doc, _id: '1' }; },
      },
      async () => {
        await ensureAdminAccount();
        assert.equal(created.email, 'admin@example.com');
        assert.equal(created.role, 'admin');
        assert.ok(created.passwordHash); // never stores the plaintext password
      }
    );
  });
});

test('promotes an existing non-admin account instead of creating a duplicate', async () => {
  await withEnv({ ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: 'hunter2' }, async () => {
    let saved = false;
    const existingUser = {
      role: 'user',
      save: async function () { saved = true; },
    };
    let createCalled = false;
    await withMockedUser(
      {
        findOne: () => Promise.resolve(existingUser),
        create: async () => { createCalled = true; },
      },
      async () => {
        await ensureAdminAccount();
        assert.equal(existingUser.role, 'admin');
        assert.equal(saved, true);
        assert.equal(createCalled, false);
      }
    );
  });
});

test('leaves an already-admin account untouched (no save call)', async () => {
  await withEnv({ ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: 'hunter2' }, async () => {
    let saved = false;
    const existingUser = {
      role: 'admin',
      save: async function () { saved = true; },
    };
    await withMockedUser(
      { findOne: () => Promise.resolve(existingUser) },
      async () => {
        await ensureAdminAccount();
        assert.equal(saved, false);
      }
    );
  });
});
