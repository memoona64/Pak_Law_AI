const test = require('node:test');
const assert = require('node:assert/strict');
const requireAdmin = require('../middleware/requireAdmin');

function fakeRes() {
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
  return res;
}

test('requireAdmin lets an admin user through', () => {
  const req = { user: { id: '1', role: 'admin' } };
  const res = fakeRes();
  let nextCalled = false;
  requireAdmin(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, null);
});

test('requireAdmin blocks a regular user with 403', () => {
  const req = { user: { id: '1', role: 'user' } };
  const res = fakeRes();
  let nextCalled = false;
  requireAdmin(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});

test('requireAdmin blocks a request with no req.user at all', () => {
  const req = {};
  const res = fakeRes();
  let nextCalled = false;
  requireAdmin(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});
