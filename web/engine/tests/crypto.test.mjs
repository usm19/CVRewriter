import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProfileKeys, unlockDek, encryptJson, decryptJson, sessionValid, SESSION_DAYS } from '../../crypto.js';

test('a profile round-trips data under its own passphrase', async () => {
  const prof = await createProfileKeys('correct horse battery');
  const dek = await unlockDek('correct horse battery', prof);
  const blob = await encryptJson(dek, { name: 'Priya', cv: 'lines' });
  assert.doesNotMatch(JSON.stringify(blob), /Priya|lines/);      /* actually encrypted */
  const back = await decryptJson(dek, blob);
  assert.deepEqual(back, { name: 'Priya', cv: 'lines' });
});

test('the wrong passphrase cannot unlock a profile', async () => {
  const prof = await createProfileKeys('johns secret phrase');
  await assert.rejects(() => unlockDek('davids guess', prof));
});

test('one profile cannot decrypt another profile’s data', async () => {
  const john = await createProfileKeys('johns secret phrase');
  const david = await createProfileKeys('davids own phrase');
  const dekJ = await unlockDek('johns secret phrase', john);
  const dekD = await unlockDek('davids own phrase', david);
  const blob = await encryptJson(dekJ, { history: ['admin job CV'] });
  await assert.rejects(() => decryptJson(dekD, blob));
});

test('two profiles with the same passphrase still have different keys', async () => {
  const a = await createProfileKeys('same phrase');
  const b = await createProfileKeys('same phrase');
  assert.notEqual(a.salt, b.salt);
  assert.notEqual(a.wrapped, b.wrapped);
});

test('a session lasts ninety days and not a minute longer', () => {
  const login = Date.parse('2026-08-02T12:00:00Z');
  const s = { expiresAt: login + SESSION_DAYS * 86400000 };
  assert.equal(SESSION_DAYS, 90);
  assert.ok(sessionValid(s, login + 89 * 86400000));
  assert.ok(!sessionValid(s, login + 90 * 86400000 + 60000));
  assert.ok(!sessionValid(null, login));
  assert.ok(!sessionValid({}, login));
});
