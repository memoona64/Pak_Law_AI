// Regression checks for controllers/feedbackController.js: a user must own
// the message they're voting on, and repeat votes update rather than stack.
// Conversation/Feedback are mocked directly (require() caches modules) — no
// real database needed.

const test = require('node:test');
const assert = require('node:assert/strict');
const Conversation = require('../models/Conversation');
const Feedback = require('../models/Feedback');
const feedbackController = require('../controllers/feedbackController');

function fakeReqRes(body) {
  const req = { body, user: { id: 'user1' } };
  const res = {
    statusCode: null,
    send() {
      return this;
    },
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

function withMocks(conversationExists, feedbackUpdate, run) {
  const originalExists = Conversation.exists;
  const originalUpdate = Feedback.findOneAndUpdate;
  Conversation.exists = conversationExists;
  Feedback.findOneAndUpdate = feedbackUpdate;
  return run().finally(() => {
    Conversation.exists = originalExists;
    Feedback.findOneAndUpdate = originalUpdate;
  });
}

test('createFeedback rejects a messageId the user does not own with 404, never touching Feedback', async () => {
  let feedbackWasCalled = false;
  await withMocks(
    async () => null, // no matching conversation/message for this user
    async () => {
      feedbackWasCalled = true;
    },
    async () => {
      const { req, res } = fakeReqRes({ messageId: '507f1f77bcf86cd799439011', vote: 'up' });
      await feedbackController.createFeedback(req, res, () => {});
      assert.equal(res.statusCode, 404);
      assert.equal(feedbackWasCalled, false);
    }
  );
});

test('createFeedback upserts by (userId, messageId) instead of always inserting', async () => {
  let updateArgs = null;
  await withMocks(
    async () => true, // user owns this message
    async (filter, update, options) => {
      updateArgs = { filter, update, options };
    },
    async () => {
      const { req, res } = fakeReqRes({ messageId: '507f1f77bcf86cd799439011', vote: 'down' });
      await feedbackController.createFeedback(req, res, () => {});
      assert.equal(res.statusCode, 204);
      assert.deepEqual(updateArgs.filter, { userId: 'user1', messageId: '507f1f77bcf86cd799439011' });
      assert.equal(updateArgs.update.vote, 'down');
      assert.equal(updateArgs.options.upsert, true);
    }
  );
});

test('createFeedback returns 404 (not 500) for a malformed messageId', async () => {
  await withMocks(
    async () => {
      const err = new Error('Cast to ObjectId failed');
      err.name = 'CastError';
      throw err;
    },
    async () => {},
    async () => {
      const { req, res } = fakeReqRes({ messageId: 'not-an-object-id', vote: 'up' });
      let passedToNext = null;
      await feedbackController.createFeedback(req, res, (err) => {
        passedToNext = err;
      });
      assert.equal(res.statusCode, 404);
      assert.equal(passedToNext, null);
    }
  );
});
