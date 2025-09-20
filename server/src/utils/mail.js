// src/utils/mail.js
const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

async function sendMail({ to, subject, text, html }) {
  if (!transporter) {
    // dev fallback
    console.log('=== MAIL (dev fallback) ===');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Text:', text || html);
    console.log('===========================');
    return true;
  }
  return transporter.sendMail({ from: process.env.SMTP_USER, to, subject, text, html });
}

module.exports = { sendMail };



// src/utils/mail.js

// const nodemailer = require('nodemailer');
// require('dotenv').config();

// const MAIL_PROVIDER = process.env.MAIL_PROVIDER || 'smtp';
// const MAIL_FROM = process.env.MAIL_FROM || 'ScholarBridge <no-reply@scholarbridge.local>';

// /**
//  * createTransporter - returns a nodemailer transporter based on env
//  */
// async function createTransporter() {
//   if (MAIL_PROVIDER === 'ethereal') {
//     // create test account for dev (ethereal)
//     const testAccount = await nodemailer.createTestAccount();
//     return nodemailer.createTransport({
//       host: testAccount.smtp.host,
//       port: testAccount.smtp.port,
//       secure: testAccount.smtp.secure,
//       auth: { user: testAccount.user, pass: testAccount.pass }
//     });
//   }

//   // default: use SMTP from env
//   const host = process.env.SMTP_HOST;
//   const port = Number(process.env.SMTP_PORT || 587);
//   const user = process.env.SMTP_USER;
//   const pass = process.env.SMTP_PASS;

//   if (!host || !user) {
//     // no SMTP configured — return null so callers can fallback to console logging
//     return null;
//   }

//   const secure = port === 465; // use TLS for port 465
//   return nodemailer.createTransport({
//     host,
//     port,
//     secure,
//     auth: { user, pass },
//     tls: {
//       // do not fail on invalid certs in dev; in prod ensure valid certs
//       rejectUnauthorized: process.env.NODE_ENV === 'production'
//     }
//   });
// }

// /**
//  * sendMail - sends an email; returns nodemailer info or null if fallback used
//  * params: { to, subject, text, html }
//  */
// async function sendMail({ to, subject, text, html }) {
//   const transporter = await createTransporter();

//   if (!transporter) {
//     // DEV fallback: log to console (existing behavior)
//     console.log('=== MAIL (dev fallback) ===');
//     console.log('From:', MAIL_FROM);
//     console.log('To:', to);
//     console.log('Subject:', subject);
//     console.log('Text:', text || html);
//     console.log('===========================');
//     return null;
//   }

//   try {
//     const info = await transporter.sendMail({
//       from: MAIL_FROM,
//       to,
//       subject,
//       text,
//       html
//     });

//     // If using Ethereal, log the preview URL
//     if (MAIL_PROVIDER === 'ethereal') {
//       console.log('Ethereal preview URL: %s', nodemailer.getTestMessageUrl(info));
//     }

//     return info;
//   } catch (err) {
//     console.error('sendMail error', err);
//     throw err;
//   }
// }

// module.exports = { sendMail };
