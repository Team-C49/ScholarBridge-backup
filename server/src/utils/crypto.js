// src/utils/crypto.js
const crypto = require('crypto');
require('dotenv').config();

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

const KEY_B64 = process.env.ENCRYPTION_KEY_BASE64 || '';
const KEY = Buffer.from(KEY_B64, 'base64');

function encrypt(plaintext) {
  if (!KEY || KEY.length !== 32) throw new Error('Encryption key not configured correctly.');
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv, { authTagLength: TAG_LEN });
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

function decrypt(b64) {
  if (!KEY || KEY.length !== 32) throw new Error('Encryption key not configured correctly.');
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
