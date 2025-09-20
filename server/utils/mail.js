// src/utils/mail.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

async function sendMail({ to, subject, text, html }) {
  if (!transporter) {
    console.log('Mail transport not configured');
    return;
  }
  return transporter.sendMail({ from: process.env.SMTP_USER, to, subject, text, html });
}
module.exports = { sendMail };
