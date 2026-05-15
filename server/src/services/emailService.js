const nodemailer = require('nodemailer');
const config = require('../config');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  if (config.smtp.host && config.smtp.user) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  } else {
    // Use ethereal for development
    transporter = {
      sendMail: async (mailOptions) => {
        console.log('DEV EMAIL:', mailOptions.to, mailOptions.subject);
        console.log('Content preview:', mailOptions.html?.substring(0, 100));
      },
    };
  }

  return transporter;
};

const sendEmail = async ({ to, subject, html }) => {
  try {
    const t = getTransporter();
    await t.sendMail({
      from: `"LostLink DBU" <${config.smtp.user || 'noreply@lostlink.edu'}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error('Email send failed:', error.message);
    return false;
  }
};

module.exports = { sendEmail };
