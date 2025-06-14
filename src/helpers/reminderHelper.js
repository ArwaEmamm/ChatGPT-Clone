const nodemailer = require('nodemailer');

// إعداد النقل (transport) لبريد Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.REMINDER_EMAIL_USER,   // من ملف env
    pass: process.env.REMINDER_EMAIL_PASS    // من ملف env
  }
});

// إرسال البريد الإلكتروني
async function sendReminderEmail(to, subject, text) {
  const mailOptions = {
    from: process.env.REMINDER_EMAIL_USER,
    to,
    subject,
    text
  };
  return transporter.sendMail(mailOptions);
}

module.exports = { sendReminderEmail };
