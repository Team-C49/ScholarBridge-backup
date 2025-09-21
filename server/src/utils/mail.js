// src/utils/mail.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const MAIL_FROM = process.env.MAIL_FROM || `ScholarBridge <${process.env.SMTP_USER}>`;
const NODE_ENV = process.env.NODE_ENV || 'development';

async function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user) return null;

  const secure = port === 465; // true for 465, false for 587 (STARTTLS)
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: NODE_ENV === 'production' }
  });
}

async function sendMail({ to, subject, text, html }) {
  const transporter = await createTransporter();
  if (!transporter) {
    if (NODE_ENV === 'production') throw new Error('Mail transporter not configured in production.');
    console.log('DEV MAIL FALLBACK:');
    console.log('From:', MAIL_FROM);
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Text:', text || html);
    return null;
  }

  try {
    const info = await transporter.sendMail({
      from: MAIL_FROM,
      to,
      subject,
      text,
      html,
    });
    return info;
  } catch (err) {
    console.error('sendMail error:', err && err.message ? err.message : err);
    throw err;
  }
}

module.exports = { sendMail };
















// // src/utils/mail.js
// const nodemailer = require('nodemailer');
// require('dotenv').config();

// let transporter = null;
// if (process.env.SMTP_HOST && process.env.SMTP_USER) {
//   transporter = nodemailer.createTransport({
//     host: process.env.SMTP_HOST,
//     port: Number(process.env.SMTP_PORT || 587),
//     secure: false,
//     auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
//   });
// }

// async function sendMail({ to, subject, text, html }) {
//   if (!transporter) {
//     // dev fallback
//     console.log('=== MAIL (dev fallback) ===');
//     console.log('To:', to);
//     console.log('Subject:', subject);
//     console.log('Text:', text || html);
//     console.log('===========================');
//     return true;
//   }
//   return transporter.sendMail({ from: process.env.SMTP_USER, to, subject, text, html });
// }

// module.exports = { sendMail };




