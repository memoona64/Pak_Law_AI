// Regression checks for the crisis-keyword trigger. "my husband is killing
// me" went untested and unmatched for a while — the violence-verb list only
// had "beating"/"hitting", not "killing" — before being caught by manual
// testing. Every phrase here is a real case that either was reported as
// missed, or is realistically close enough to one that it should be pinned
// down going forward.

import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesSafetyKeyword } from './safetyKeywords.js';

test('catches "my husband is killing me" (the exact phrase that was missed)', () => {
  assert.equal(matchesSafetyKeyword('my husband is killing me'), true);
});

test('catches other phrasings of someone currently trying to kill the user', () => {
  assert.equal(matchesSafetyKeyword('he is trying to kill me'), true);
  assert.equal(matchesSafetyKeyword('he will kill me'), true);
  assert.equal(matchesSafetyKeyword('someone is going to murder me'), true);
  assert.equal(matchesSafetyKeyword('she is strangling me'), true);
  assert.equal(matchesSafetyKeyword('they are choking me'), true);
});

test('still catches the original beating/hitting phrasing', () => {
  assert.equal(matchesSafetyKeyword('my husband is beating me'), true);
  assert.equal(matchesSafetyKeyword('he is hitting me'), true);
  assert.equal(matchesSafetyKeyword('I am being beaten'), true);
});

test('catches suicide/self-harm intent', () => {
  assert.equal(matchesSafetyKeyword('I want to kill myself'), true);
  assert.equal(matchesSafetyKeyword('I want to die'), true);
  assert.equal(matchesSafetyKeyword('I am suicidal'), true);
});

test('catches an arrest in progress', () => {
  assert.equal(matchesSafetyKeyword('police are arresting me'), true);
  assert.equal(matchesSafetyKeyword('I am being arrested right now'), true);
});

test('catches Roman Urdu phrasing', () => {
  assert.equal(matchesSafetyKeyword('meri giriftari ho rahi hai'), true);
  assert.equal(matchesSafetyKeyword('mujhe maar raha hai'), true);
  assert.equal(matchesSafetyKeyword('khud kushi karna chahta hoon'), true);
});

test('catches Urdu script phrasing', () => {
  assert.equal(matchesSafetyKeyword('گرفتاری ہو رہی ہے'), true);
  assert.equal(matchesSafetyKeyword('مجھے مار رہا ہے'), true);
});

test('does not flag ordinary legal questions', () => {
  assert.equal(matchesSafetyKeyword('What does Section 154 CrPC say about FIRs?'), false);
  assert.equal(matchesSafetyKeyword('How can a wife get khula in Pakistan?'), false);
  assert.equal(matchesSafetyKeyword('What is the punishment for theft?'), false);
});

test('does not flag a question merely discussing violence in the abstract', () => {
  assert.equal(matchesSafetyKeyword('What is the punishment for murder under Section 302?'), false);
  assert.equal(matchesSafetyKeyword('Can someone be charged for hitting another person?'), false);
});
