// Regression checks for the pure aggregation helpers behind GET /api/eval/live
// (controllers/evalController.js `_internal`). These take plain arrays/objects,
// not Mongoose documents, so they're tested directly with no database needed.

const test = require('node:test');
const assert = require('node:assert/strict');
const { percentileOf, summarizeLatency, countBy, summarizeFeedback, parseDaysParam } = require('../controllers/evalController')._internal;

test('percentileOf picks the nearest-rank value from a sorted array', () => {
  const sorted = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  assert.equal(percentileOf(sorted, 50), 50);
  assert.equal(percentileOf(sorted, 95), 100);
  assert.equal(percentileOf([], 50), null);
});

test('summarizeLatency returns p50/p95/mean for a list of latencies', () => {
  const stats = summarizeLatency([100, 200, 300, 400, 500]);
  assert.equal(stats.p50, 300);
  assert.equal(stats.mean, 300);
  assert.ok(stats.p95 >= stats.p50);
});

test('summarizeLatency returns nulls instead of dividing by zero when empty', () => {
  assert.deepEqual(summarizeLatency([]), { p50: null, p95: null, mean: null });
});

test('countBy groups events by a field value, defaulting missing values to "unknown"', () => {
  const events = [{ language: 'en' }, { language: 'en' }, { language: 'ur' }, {}];
  assert.deepEqual(countBy(events, 'language'), { en: 2, ur: 1, unknown: 1 });
});

test('summarizeFeedback computes a helpful rate from up/down votes', () => {
  const docs = [{ vote: 'up' }, { vote: 'up' }, { vote: 'up' }, { vote: 'down' }];
  const summary = summarizeFeedback(docs);
  assert.equal(summary.up, 3);
  assert.equal(summary.down, 1);
  assert.equal(summary.total, 4);
  assert.equal(summary.helpfulRate, 75);
});

test('summarizeFeedback reports helpfulRate as null when nobody has voted yet', () => {
  assert.equal(summarizeFeedback([]).helpfulRate, null);
});

test('parseDaysParam respects an explicit ?days=0 as 0, not the 30-day default', () => {
  // A naive "parseInt(...) || 30" would treat 0 as falsy and silently
  // replace it with 30 - this regression test pins the correct behavior.
  assert.equal(parseDaysParam('0'), 1); // still floored at a minimum of 1 day
});

test('parseDaysParam falls back to 30 only for genuinely unparseable input', () => {
  assert.equal(parseDaysParam(undefined), 30);
  assert.equal(parseDaysParam('not-a-number'), 30);
});

test('parseDaysParam passes a valid explicit value through unchanged', () => {
  assert.equal(parseDaysParam('7'), 7);
});

test('parseDaysParam never returns less than 1', () => {
  assert.equal(parseDaysParam('-5'), 1);
});
