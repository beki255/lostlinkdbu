const { sendEmail } = require('./src/services/emailService');
const config = require('./src/config');

async function test() {
  console.log('Testing email for:', config.smtp.user);
  try {
    await sendEmail({
      to: 'eyobbegashaw075@gmail.com',
      subject: 'LostLink SMTP Test',
      otp: '123456',
      type: 'email_verification'
    });
    console.log('Test email sent successfully!');
  } catch (err) {
    console.error('Test email failed:', err.message);
  }
  process.exit(0);
}

test();
