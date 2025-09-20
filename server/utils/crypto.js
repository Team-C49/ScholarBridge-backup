// src/utils/crypto.js
const crypto = require('crypto');
const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY = Buffer.from(process.env.ENCRYPTION_KEY_BASE64 || '', 'base64');
if (KEY.length !== 32) throw new Error('ENCRYPTION_KEY_BASE64 must be base64 of 32 bytes');

function encrypt(plaintext) {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv, { authTagLength: TAG_LEN });
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

function decrypt(b64) {
  const data = Buffer.from(b64, 'base64');
  const iv = data.slice(0, IV_LEN);
  const tag = data.slice(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = data.slice(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, KEY, iv, { authTagLength: TAG_LEN });
  decipher.setAuthTag(tag);
  const out = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return out.toString('utf8');
}

function maskBank(accountNumber) {
  if (!accountNumber) return null;
  const s = String(accountNumber);
  return `XXXX-XXXX-${s.slice(-4)}`;
}

module.exports = { encrypt, decrypt, maskBank };
