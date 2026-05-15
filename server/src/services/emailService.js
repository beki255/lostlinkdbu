const nodemailer = require('nodemailer');
const config = require('../config');

let transporter = null;
let transportReady = false;

const buildTransport = () => {
  if (!config.smtp.host || !config.smtp.user) {
    return null;
  }

  const useSSL = config.smtp.port === 465;

  const transport = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: useSSL,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
    tls: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    debug: config.env === 'development',
    logger: config.env === 'development',
  });

  return transport;
};

const verifyConnection = async (transport) => {
  try {
    await transport.verify();
    return true;
  } catch (err) {
    console.error('[SMTP] Verification failed:', err.message);
    if (err.response) console.error('[SMTP] Server response:', err.response);
    if (err.code) console.error('[SMTP] Error code:', err.code);
    return false;
  }
};

const ensureTransporter = async () => {
  if (transportReady && transporter) {
    try {
      await transporter.verify();
      return transporter;
    } catch {
      console.warn('[Email] Cached transport stale, reconnecting...');
      transportReady = false;
      transporter = null;
    }
  }

  if (!config.smtp.host || !config.smtp.user || !config.smtp.pass) {
    throw new Error(
      'SMTP not fully configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env'
    );
  }

  console.log('[SMTP] Connecting to', config.smtp.host + ':' + config.smtp.port, 'as', config.smtp.user);

  const transport = buildTransport();
  if (!transport) {
    throw new Error('Failed to build SMTP transport');
  }

  const ok = await verifyConnection(transport);
  if (!ok) {
    throw new Error(
      'SMTP connection failed for ' + config.smtp.user +
      ' at ' + config.smtp.host + ':' + config.smtp.port + '. ' +
      'Check that the app password is correct and 2FA is enabled on the Google account.'
    );
  }

  transporter = transport;
  transportReady = true;
  console.log('[Email] SMTP connected and ready:', config.smtp.user);
  return transporter;
};

const buildOtpHtml = (otp, type = 'email_verification') => {
  const isVerification = type === 'email_verification';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:20px 0">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden">
        <tr>
          <td style="background:#0057B8;padding:24px;text-align:center">
            <span style="color:#ffffff;font-size:28px;font-weight:bold">LostLink DBU</span>
          </td>
        </tr>
        <tr><td style="padding:32px 24px">
          <h2 style="margin:0 0 8px;font-size:20px;color:#1f2937">${isVerification ? 'Verify Your Email' : 'Reset Your Password'}</h2>
          <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.5">
            ${isVerification
              ? 'Enter this code to activate your LostLink account.<br>It expires in 5 minutes.'
              : 'Enter this code to reset your LostLink password.<br>It expires in 5 minutes.'}
          </p>
          <div style="background:#f3f4f6;border-radius:8px;padding:16px;text-align:center;margin-bottom:20px">
            <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#0057B8;font-family:monospace">${otp}</span>
          </div>
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center">
            ${isVerification
              ? 'If you did not create an account, ignore this email.'
              : 'If you did not request a password reset, ignore this email.'}
          </p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px;text-align:center">
          <span style="font-size:11px;color:#9ca3af">LostLink DBU — University Lost & Found System</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
};

const sendEmail = async ({ to, subject, otp, type }) => {
  try {
    const t = await ensureTransporter();

    const info = await t.sendMail({
      from: '"LostLink DBU" <' + config.smtp.from + '>',
      to,
      subject,
      html: buildOtpHtml(otp, type),
    });

    if (otp) {
      console.log('[Email] OTP sent successfully to ' + to + ' (messageId: ' + info.messageId + ')');
    }

    return true;
  } catch (error) {
    console.error('[Email] Delivery failed for ' + to + ': ' + error.message);
    if (error.code) console.error('[Email] SMTP code:', error.code);
    if (error.response) console.error('[Email] SMTP response:', error.response);
    return false;
  }
};

module.exports = { sendEmail, getTransporter: ensureTransporter };
