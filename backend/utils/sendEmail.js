const nodemailer = require("nodemailer");

async function sendEmail(to, { subject, html }) {
  const transporter = nodemailer.createTransport({
    service: "Gmail", // or your provider
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    html,
  });
}

module.exports = sendEmail;
