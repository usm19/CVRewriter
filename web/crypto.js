'use strict';

/*
 * Per-person encryption for on-device Spaces.
 *
 * Each profile has a random 256-bit data key (DEK) that encrypts everything
 * the person saves (CV, working copy, tailored history) with AES-GCM. The
 * DEK is stored only wrapped: encrypted under a key derived from the
 * person's passphrase with PBKDF2-SHA-256 at 600,000 iterations (OWASP
 * guidance). The passphrase itself is never stored anywhere, so a wrong
 * passphrase fails cryptographically, not by an if-statement, and there is
 * no recovery without it.
 */

const subtle = globalThis.crypto.subtle;
const enc = new TextEncoder();
const dec = new TextDecoder();

export const SESSION_DAYS = 90;
const ITERATIONS = 600000;

const b64 = (bytes) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const rand = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n));

async function kekFrom(passphrase, salt, iterations) {
  const material = await subtle.importKey('raw', enc.encode(passphrase.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

/* New profile: fresh random DEK, wrapped under the passphrase. */
export async function createProfileKeys(passphrase) {
  const salt = rand(16), dekBytes = rand(32), iv = rand(12);
  const kek = await kekFrom(passphrase, salt, ITERATIONS);
  const wrapped = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, kek, dekBytes));
  return { v: 1, salt: b64(salt), iterations: ITERATIONS, iv: b64(iv), wrapped: b64(wrapped) };
}

/* Unlock: rejects on a wrong passphrase because the GCM tag cannot verify. */
export async function unlockDek(passphrase, profile) {
  const kek = await kekFrom(passphrase, unb64(profile.salt), profile.iterations);
  const dek = await subtle.decrypt({ name: 'AES-GCM', iv: unb64(profile.iv) }, kek, unb64(profile.wrapped));
  return new Uint8Array(dek);
}

const dekKey = (dekBytes) => subtle.importKey('raw', dekBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);

export async function encryptJson(dekBytes, obj) {
  const iv = rand(12);
  const data = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, await dekKey(dekBytes), enc.encode(JSON.stringify(obj))));
  return { iv: b64(iv), data: b64(data) };
}

export async function decryptJson(dekBytes, blob) {
  const plain = await subtle.decrypt({ name: 'AES-GCM', iv: unb64(blob.iv) }, await dekKey(dekBytes), unb64(blob.data));
  return JSON.parse(dec.decode(plain));
}

export const sessionValid = (session, now) =>
  !!(session && typeof session.expiresAt === 'number' && now < session.expiresAt);
