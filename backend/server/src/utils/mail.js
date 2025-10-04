// src/utils/mail.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const MAIL_FROM = process.env.MAIL_FROM || 'ScholarBridge <no-reply@scholarbridge.local>';

/**
 * createTransporter - returns a nodemailer transporter based on env
 */
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    // no SMTP configured — return null so callers can fallback to console logging
    console.warn('SMTP not fully configured. Missing SMTP_HOST, SMTP_USER, or SMTP_PASS');
    return null;
  }

  const secure = port === 465; // use TLS for port 465
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: {
      // do not fail on invalid certs in dev; in prod ensure valid certs
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
  });
}

/**
 * sendMail - sends an email; returns nodemailer info or null if fallback used
 * params: { to, subject, text, html }
 */
async function sendMail({ to, subject, text, html }) {
  const transporter = createTransporter();

  if (!transporter) {
    // DEV fallback: log to console (existing behavior)
    console.log('=== MAIL (dev fallback) ===');
    console.log('From:', MAIL_FROM);
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Text:', text || html);
    console.log('===========================');
    return null;
  }

  try {
    const info = await transporter.sendMail({
      from: MAIL_FROM,
      to,
      subject,
      text,
      html
    });

    console.log('Email sent successfully to:', to);
    return info;
  } catch (err) {
    console.error('sendMail error:', err);
    throw err;
  }
}

/**
 * Send OTP email with styled HTML template
 */
async function sendOTPEmail(email, otp, expirationMinutes = 15) {
  const subject = `${process.env.APP_NAME || 'ScholarBridge'} - Email Verification`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
            .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${process.env.APP_NAME || 'ScholarBridge'}</h1>
                <p>Email Verification Required</p>
            </div>
            <div class="content">
                <h2>Welcome to ScholarBridge!</h2>
                <p>Thank you for starting your registration. To complete your account setup, please verify your email address using the OTP code below:</p>
                
                <div class="otp-box">
                    <p>Your verification code is:</p>
                    <div class="otp-code">${otp}</div>
                </div>
                
                <div class="warning">
                    <strong>⏰ Important:</strong> This code will expire in ${expirationMinutes} minutes for security reasons.
                </div>
                
                <p>If you didn't request this verification, please ignore this email or contact our support team.</p>
                
                <p>Best regards,<br>The ScholarBridge Team</p>
            </div>
            <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>&copy; ${new Date().getFullYear()} ScholarBridge. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;

  const textContent = `
Welcome to ${process.env.APP_NAME || 'ScholarBridge'}!

Your email verification code is: ${otp}

This code will expire in ${expirationMinutes} minutes.

If you didn't request this verification, please ignore this email.

Best regards,
The ScholarBridge Team
  `;

  return sendMail({
    to: email,
    subject,
    text: textContent,
    html: htmlContent
  });
}

module.exports = { sendMail, sendOTPEmail };