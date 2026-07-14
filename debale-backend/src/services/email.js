const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'Debale <noreply@debale.et>',
      to, subject, html
    });
    console.log(`✉️  Email sent to ${to}`);
  } catch (err) {
    console.error('Email error:', err.message);
  }
};

const base = (content) => `
<div style="font-family:'Segoe UI',sans-serif;max-width:580px;margin:0 auto;background:#FAFAF7">
  <div style="background:#0E7C6B;padding:24px 32px;border-radius:12px 12px 0 0;text-align:center">
    <h1 style="color:white;margin:0;font-size:26px;letter-spacing:-0.5px">debale</h1>
    <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px">Ethiopia's Housemate Platform 🇪🇹</p>
  </div>
  <div style="background:white;padding:32px;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 12px 12px">
    ${content}
    <hr style="border:none;border-top:1px solid #F3F4F6;margin:28px 0">
    <p style="color:#9CA3AF;font-size:12px;margin:0">© 2025 Debale · Made in Ethiopia 🇪🇹</p>
  </div>
</div>`;

const btn = (text, url, color = '#0E7C6B') =>
  `<a href="${url}" style="display:inline-block;background:${color};color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;font-size:15px">${text}</a>`;

const T = {
  welcome: (name) => ({
    subject: 'Welcome to Debale! 🏠',
    html: base(`
      <h2 style="color:#111827;margin-top:0">Welcome, ${name}! 👋</h2>
      <p style="color:#6B7280;line-height:1.7">Your Debale account is ready. Browse rooms across Ethiopia and subscribe to start applying or listing.</p>
      ${btn('Browse Rooms →', `${process.env.FRONTEND_URL}/browse`)}
    `)
  }),

  applicationReceived: (providerName, seekerName, roomTitle) => ({
    subject: `New Application — "${roomTitle}"`,
    html: base(`
      <h2 style="color:#0E7C6B;margin-top:0">New Application 📬</h2>
      <p>Hi <strong>${providerName}</strong>,</p>
      <p style="color:#6B7280"><strong>${seekerName}</strong> just applied to your listing <strong>"${roomTitle}"</strong>. Review their profile and decide.</p>
      ${btn('Review Applicants →', `${process.env.FRONTEND_URL}/applicants`)}
    `)
  }),

  applicationAccepted: (seekerName, roomTitle, phone) => ({
    subject: `🎉 Your application was accepted!`,
    html: base(`
      <h2 style="color:#10B981;margin-top:0">Congratulations! 🎉</h2>
      <p>Hi <strong>${seekerName}</strong>,</p>
      <p style="color:#6B7280">Your application for <strong>"${roomTitle}"</strong> was <strong>accepted</strong>!</p>
      <div style="background:#D1FAE5;border-radius:10px;padding:14px 18px;margin:20px 0">
        <p style="margin:0;font-weight:600;font-size:15px">📞 Provider contact: ${phone}</p>
      </div>
      <p style="color:#6B7280">Complete the housemate agreement to finalise your move-in.</p>
      ${btn('Sign Agreement →', `${process.env.FRONTEND_URL}/agreement`)}
    `)
  }),

  applicationRejected: (seekerName, roomTitle) => ({
    subject: `Update on your application for "${roomTitle}"`,
    html: base(`
      <h2 style="color:#374151;margin-top:0">Application Update</h2>
      <p>Hi <strong>${seekerName}</strong>,</p>
      <p style="color:#6B7280">Your application for <strong>"${roomTitle}"</strong> was not selected this time. Don't be discouraged — there are many more rooms available.</p>
      ${btn('Browse More Rooms →', `${process.env.FRONTEND_URL}/browse`)}
    `)
  }),

  interviewScheduled: (name, roomTitle, dateTime) => ({
    subject: `Interview Scheduled — "${roomTitle}"`,
    html: base(`
      <h2 style="color:#7C3AED;margin-top:0">📅 Interview Scheduled</h2>
      <p>Hi <strong>${name}</strong>,</p>
      <p style="color:#6B7280">An interview has been scheduled for <strong>"${roomTitle}"</strong>.</p>
      <div style="background:#EDE9FE;border-radius:10px;padding:16px 20px;margin:20px 0">
        <p style="margin:0;font-size:20px;font-weight:700;color:#7C3AED">📅 ${dateTime}</p>
      </div>
      <p style="color:#6B7280;font-size:14px">You will receive a reminder 1 hour before.</p>
    `)
  }),

  subscriptionExpiry: (name, daysLeft) => ({
    subject: `Your subscription expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
    html: base(`
      <h2 style="color:#C9970C;margin-top:0">⏰ Subscription Expiring</h2>
      <p>Hi <strong>${name}</strong>,</p>
      <p style="color:#6B7280">Your Debale subscription expires in <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong>. Renew to keep full access.</p>
      ${btn('Renew Now →', `${process.env.FRONTEND_URL}/payment`, '#C9970C')}
    `)
  }),

  agreementReady: (name, roomTitle) => ({
    subject: `Agreement ready — "${roomTitle}"`,
    html: base(`
      <h2 style="color:#0E7C6B;margin-top:0">📄 Agreement Ready</h2>
      <p>Hi <strong>${name}</strong>,</p>
      <p style="color:#6B7280">Your housemate agreement for <strong>"${roomTitle}"</strong> has been generated. Download, sign, and submit it to complete your match.</p>
      ${btn('View Agreement →', `${process.env.FRONTEND_URL}/agreement`)}
    `)
  }),
};

module.exports = { sendEmail, T };
