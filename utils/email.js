// utils/email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS   // Gmail App Password (not your main password)
  }
});

async function sendFeedbackNotification(feedback) {
  const stars = '⭐'.repeat(feedback.rating || 0);
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#2A4A3C;color:#fff;padding:24px;border-radius:8px 8px 0 0">
        <h2 style="margin:0;font-size:20px">📬 New Feedback — ProofCraft</h2>
      </div>
      <div style="background:#f9f9f9;padding:24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px 0;font-weight:bold;color:#555;width:120px">Name:</td><td style="padding:8px 0">${feedback.name}</td></tr>
          <tr><td style="padding:8px 0;font-weight:bold;color:#555">Email:</td><td style="padding:8px 0"><a href="mailto:${feedback.email}">${feedback.email}</a></td></tr>
          <tr><td style="padding:8px 0;font-weight:bold;color:#555">Subject:</td><td style="padding:8px 0">${feedback.subject}</td></tr>
          ${feedback.rating ? `<tr><td style="padding:8px 0;font-weight:bold;color:#555">Rating:</td><td style="padding:8px 0">${stars} (${feedback.rating}/5)</td></tr>` : ''}
        </table>
        <div style="margin-top:16px;padding:16px;background:#fff;border-left:4px solid #2A4A3C;border-radius:4px">
          <p style="margin:0;color:#333;line-height:1.6">${feedback.message}</p>
        </div>
        <p style="margin-top:16px;font-size:12px;color:#999">Received at ${new Date().toLocaleString('en-EG', { timeZone: 'Africa/Cairo' })}</p>
      </div>
    </div>`;

  await transporter.sendMail({
    from: `"ProofCraft Feedback" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    replyTo: feedback.email,
    subject: `[ProofCraft] New Feedback: ${feedback.subject}`,
    html
  });
}

async function sendWelcomeEmail(user) {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#2A4A3C;color:#fff;padding:28px;text-align:center;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:24px">Welcome to ProofCraft ✨</h1>
      </div>
      <div style="padding:28px;background:#fff;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px">
        <p style="font-size:16px">Hi <strong>${user.name}</strong>,</p>
        <p style="color:#555;line-height:1.7">You're all set! ProofCraft helps you turn your experience into structured proof that recruiters can trust. Here's how to get started:</p>
        <ul style="color:#555;line-height:2">
          <li>🎨 Build your professional CV with our template builder</li>
          <li>📝 Document your projects as structured case studies</li>
          <li>🔗 Share your work with a unique public link</li>
        </ul>
        <div style="text-align:center;margin-top:24px">
          <a href="https://proofcraft.online" style="background:#2A4A3C;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px">Get Started →</a>
        </div>
        <p style="margin-top:24px;font-size:12px;color:#aaa;text-align:center">ProofCraft — proofcraft.online</p>
      </div>
    </div>`;

  await transporter.sendMail({
    from: `"ProofCraft" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: 'Welcome to ProofCraft! 🚀',
    html
  });
}

module.exports = { sendFeedbackNotification, sendWelcomeEmail };
