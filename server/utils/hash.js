// src/utils/hash.js
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12;
async function hashPassword(password) { return bcrypt.hash(password, SALT_ROUNDS); }
async function comparePassword(password, hash) { return bcrypt.compare(password, hash); }
module.exports = { hashPassword, comparePassword };
