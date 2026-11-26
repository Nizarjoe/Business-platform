// F1: password hashing, session tokens, and cookies. WebCrypto only, so the
// same code runs on Node 22 and on Cloudflare Workers.
const subtle = globalThis.crypto.subtle;
const enc = new TextEncoder();

// Workers caps PBKDF2 at 100,000 iterations.
const PBKDF2_ITERATIONS = 100000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_PASSWORD = 10;

const b64u = bytes => Buffer.from(bytes).toString('base64url');
const fromB64u = s => new Uint8Array(Buffer.from(String(s), 'base64url'));

async function derive(password, salt, iterations) {
  const key = await subtle.importKey('raw', enc.encode(String(password)), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

async function hashPassword(password) {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, PBKDF2_ITERATIONS);
  return { alg: 'pbkdf2-sha256', iter: PBKDF2_ITERATIONS, salt: b64u(salt), hash: b64u(hash) };
}

function sameBytes(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// Users without a record still pay for one derivation, so timing does not
// reveal which usernames exist.
const DUMMY = { alg: 'pbkdf2-sha256', iter: PBKDF2_ITERATIONS, salt: 'AAAAAAAAAAAAAAAAAAAAAA', hash: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' };
async function verifyPassword(password, record) {
  const rec = record && record.hash && record.salt ? record : DUMMY;
  const got = await derive(password, fromB64u(rec.salt), Math.min(Number(rec.iter) || PBKDF2_ITERATIONS, PBKDF2_ITERATIONS));
  return rec !== DUMMY && sameBytes(got, fromB64u(rec.hash));
}

async function sameSecret(a, b) {
  const [x, y] = await Promise.all([subtle.digest('SHA-256', enc.encode(String(a))), subtle.digest('SHA-256', enc.encode(String(b)))]);
  return sameBytes(new Uint8Array(x), new Uint8Array(y));
}

function newToken() {
  return b64u(globalThis.crypto.getRandomValues(new Uint8Array(32)));
}

async function tokenHash(token) {
  return b64u(new Uint8Array(await subtle.digest('SHA-256', enc.encode(String(token)))));
}

// __Host- needs Secure, so plain-http local development uses a plain name.
function cookieName(secure) { return secure ? '__Host-bp_sess' : 'bp_sess'; }

function sessionCookie(token, secure) {
  return `${cookieName(secure)}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${secure ? '; Secure' : ''}`;
}

function clearCookie(secure) {
  return `${cookieName(secure)}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;
}

function readCookie(header) {
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (k === '__Host-bp_sess' || k === 'bp_sess') return part.slice(i + 1).trim() || null;
  }
  return null;
}

function passwordProblem(pw) {
  if (typeof pw !== 'string' || pw.length < MIN_PASSWORD) return `Password minimal ${MIN_PASSWORD} karakter`;
  if (pw.length > 200) return 'Password terlalu panjang';
  return null;
}

module.exports = {
  hashPassword, verifyPassword, sameSecret, newToken, tokenHash,
  sessionCookie, clearCookie, readCookie, passwordProblem,
  SESSION_TTL_MS, PBKDF2_ITERATIONS
};
