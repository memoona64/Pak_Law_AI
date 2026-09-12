// Regression checks for controllers/authController.js's email-case handling.
// User/mongoose methods are mocked directly (require() caches modules, so
// patching User.findOne/User.create here reaches the same object
// authController.js imports) — no real database needed.

const test = require('node:test');
const assert = require('node:assert/strict');

// authController.js signs a JWT on every successful register/login; give it
// something to sign with so that step doesn't throw in a bare test process.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const User = require('../models/User');
const authController = require('../controllers/authController');

function fakeReqRes(body) {
  const req = { body };
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return { req, res };
}

function withMockedUser(mocks, run) {
  const original = { findOne: User.findOne, create: User.create };
  Object.assign(User, mocks);
  return run().finally(() => Object.assign(User, original));
}

test('register() looks up an existing user by lowercased email, not the raw casing submitted', async () => {
  let lookedUpWith = null;
  await withMockedUser(
    {
      findOne: (query) => {
        lookedUpWith = query.email;
        return Promise.resolve(null); // no existing user
      },
      create: async (doc) => ({ _id: { toString: () => 'user1' }, ...doc }),
    },
    async () => {
      const { req, res } = fakeReqRes({
        name: 'Ali',
        email: 'Test@Example.COM',
        password: 'hunter2',
      });
      await authController.register(req, res, () => {});
      assert.equal(lookedUpWith, 'test@example.com');
      assert.equal(res.statusCode, 201);
    }
  );
});

test('register() returns 409 (not a raw 500) when User.create hits the unique-index race', async () => {
  await withMockedUser(
    {
      findOne: () => Promise.resolve(null),
      create: async () => {
        const err = new Error('E11000 duplicate key error collection: paklaw.users index: email_1');
        err.code = 11000;
        throw err;
      },
    },
    async () => {
      const { req, res } = fakeReqRes({
        name: 'Ali',
        email: 'test@example.com',
        password: 'hunter2',
      });
      let passedToNext = null;
      await authController.register(req, res, (err) => {
        passedToNext = err;
      });
      assert.equal(res.statusCode, 409);
      assert.equal(passedToNext, null); // handled here, not forwarded to errorHandler
    }
  );
});

test('login() looks up the user by lowercased email regardless of submitted casing', async () => {
  const original = User.findOne;
  let capturedEmail = null;
  User.findOne = (query) => {
    capturedEmail = query.email;
    return { select: () => Promise.resolve(null) }; // user not found -> 401
  };
  try {
    const { req, res } = fakeReqRes({ email: 'ALI@Example.com', password: 'x' });
    await authController.login(req, res, () => {});
    assert.equal(capturedEmail, 'ali@example.com');
    assert.equal(res.statusCode, 401);
  } finally {
    User.findOne = original;
  }
});
