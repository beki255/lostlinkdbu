const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const OTP = require('../models/OTP');
const AuditLog = require('../models/AuditLog');
const { sendEmail } = require('../services/emailService');
const { generateOTP } = require('../utils/helpers');
const { sendSuccess, sendCreated } = require('../utils/response');
const { AppError, ConflictError, NotFoundError } = require('../utils/errors');

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

exports.register = async (req, res, next) => {
  try {
    const { name, password } = req.body;
    const email = req.body.email?.toLowerCase().trim();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ConflictError('An account with this email already exists.');
    }

    const user = await User.create({ name, email, passwordHash: password });

    const otp = generateOTP();
    await OTP.create({
      email,
      otp,
      type: 'email_verification',
      expiresAt: new Date(Date.now() + config.otp.expiresIn),
    });

    if (config.env === 'development') {
      console.log('');
      console.log('[DEV] OTP for ' + email + ': ' + otp);
      console.log('');
    }

    const emailSent = await sendEmail({
      to: email,
      subject: 'Verify Your LostLink Account',
      otp,
      type: 'email_verification',
    });

    if (!emailSent) {
      await User.findByIdAndDelete(user._id);
      await OTP.deleteMany({ email, type: 'email_verification' });
      throw new AppError(
        'Unable to send verification email. Please check your email address or try again later.',
        500
      );
    }

    await AuditLog.create({
      action: 'USER_REGISTERED',
      resource: 'User',
      resourceId: user._id,
      performedBy: user._id,
      performedByRole: 'user',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    sendCreated(res, { userId: user._id }, 'Account created. Verification email sent.');
  } catch (error) {
    next(error);
  }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    const { otp } = req.body;
    const email = req.body.email?.toLowerCase().trim();

    const otpRecord = await OTP.findOne({
      email,
      otp,
      type: 'email_verification',
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      throw new AppError('Invalid or expired OTP.', 400);
    }

    otpRecord.isUsed = true;
    await otpRecord.save();

    await User.findOneAndUpdate({ email }, { isVerified: true });

    sendSuccess(res, null, 'Email verified successfully.');
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { password } = req.body;
    const email = req.body.email?.toLowerCase().trim();

    const user = await User.findOne({ email, isDeleted: false }).select('+passwordHash');
    if (!user) {
      throw new AppError('Invalid email or password.', 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401);
    }

    if (!user.isVerified) {
      throw new AppError('Please verify your email before logging in. Check your inbox for the verification code.', 403);
    }

    const token = generateToken(user._id, user.role);

    await AuditLog.create({
      action: 'USER_LOGIN',
      resource: 'User',
      resourceId: user._id,
      performedBy: user._id,
      performedByRole: user.role,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    sendSuccess(res, {
      token,
      user: user.toPublicJSON(),
    }, 'Login successful.');
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const email = req.body.email?.toLowerCase().trim();

    const user = await User.findOne({ email, isDeleted: false });
    if (!user) {
      return sendSuccess(res, null, 'If the email exists, an OTP has been sent.');
    }

    const otp = generateOTP();
    await OTP.create({
      email,
      otp,
      type: 'email_verification',
      expiresAt: new Date(Date.now() + config.otp.expiresIn),
    });

    if (config.env === 'development') {
      console.log('');
      console.log('[DEV] OTP for ' + email + ': ' + otp);
      console.log('');
    }

    const emailSent = await sendEmail({
      to: email,
      subject: 'Reset Your LostLink Password',
      otp,
      type: 'password_reset',
    });

    if (!emailSent && config.env === 'production') {
      return sendSuccess(res, null, 'If the email exists, an OTP has been sent.');
    }

    sendSuccess(res, null, 'If the email exists, an OTP has been sent.');
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { otp, password } = req.body;
    const email = req.body.email?.toLowerCase().trim();

    const otpRecord = await OTP.findOne({
      email,
      otp,
      type: 'password_reset',
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      throw new AppError('Invalid or expired OTP.', 400);
    }

    otpRecord.isUsed = true;
    await otpRecord.save();

    const user = await User.findOne({ email, isDeleted: false }).select('+passwordHash');
    if (!user) {
      throw new AppError('User not found.', 404);
    }

    user.passwordHash = password;
    await user.save();

    await AuditLog.create({
      action: 'PASSWORD_RESET',
      resource: 'User',
      resourceId: user._id,
      performedBy: user._id,
      performedByRole: user.role,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    sendSuccess(res, null, 'Password reset successful.');
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    sendSuccess(res, { user: req.user.toPublicJSON() });
  } catch (error) {
    next(error);
  }
};

exports.resendOtp = async (req, res, next) => {
  try {
    const email = req.body.email?.toLowerCase().trim();

    const user = await User.findOne({ email, isDeleted: false });
    if (!user) throw new NotFoundError('User');

    if (user.isVerified) {
      return sendSuccess(res, null, 'Email is already verified.');
    }

    await OTP.deleteMany({ email, type: 'email_verification', isUsed: false });

    const otp = generateOTP();
    await OTP.create({
      email,
      otp,
      type: 'email_verification',
      expiresAt: new Date(Date.now() + config.otp.expiresIn),
    });

    const emailSent = await sendEmail({
      to: email,
      subject: 'Verify Your LostLink Account',
      otp,
      type: 'email_verification',
    });

    if (!emailSent) {
      throw new AppError('Unable to send verification email. Please try again later.', 500);
    }

    sendSuccess(res, null, 'A new OTP has been sent to your email.');
  } catch (error) {
    next(error);
  }
};

const GOOGLE_CLIENT_ID = config.google.clientId;

exports.googleAuth = async (req, res, next) => {
  try {
    const { credential } = req.body;
    if (!credential) throw new AppError('Google credential is required.', 400);

    if (!GOOGLE_CLIENT_ID) {
      throw new AppError('Google authentication is not configured on the server.', 501);
    }

    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    const payload = await response.json();

    if (payload.error) {
      throw new AppError(`Google token verification failed: ${payload.error_description || payload.error}`, 401);
    }

    if (!payload.email) {
      throw new AppError('Google account must have a verified email address.', 401);
    }

    const expectedIssuers = ['accounts.google.com', 'https://accounts.google.com'];
    if (!expectedIssuers.includes(payload.iss)) {
      throw new AppError('Invalid token issuer.', 401);
    }

    if (payload.aud !== GOOGLE_CLIENT_ID) {
      throw new AppError('Token audience does not match this application.', 401);
    }

    const currentTime = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < currentTime) {
      throw new AppError('Google token has expired.', 401);
    }

    const { email, name, sub: googleId, picture } = payload;

    let user = await User.findOne({ email, isDeleted: false });

    if (!user) {
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        googleId,
        avatar: picture,
        isVerified: true,
      });

      await AuditLog.create({
        action: 'USER_REGISTERED_GOOGLE',
        resource: 'User',
        resourceId: user._id,
        performedBy: user._id,
        performedByRole: 'user',
        ipAddress: req.ip,
      });
    } else {
      if (!user.googleId) {
        user.googleId = googleId;
        if (picture) user.avatar = picture;
        user.isVerified = true;
        await user.save();
      }
    }

    const token = generateToken(user._id, user.role);

    await AuditLog.create({
      action: 'USER_LOGIN_GOOGLE',
      resource: 'User',
      resourceId: user._id,
      performedBy: user._id,
      performedByRole: user.role,
      ipAddress: req.ip,
    });

    sendSuccess(res, { token, user: user.toPublicJSON() }, 'Google authentication successful.');
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const allowedFields = ['name', 'phone', 'department', 'studentId'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    await AuditLog.create({
      action: 'PROFILE_UPDATED',
      resource: 'User',
      resourceId: user._id,
      performedBy: user._id,
      performedByRole: user.role,
      changes: { new: updates },
      ipAddress: req.ip,
    });

    sendSuccess(res, { user: user.toPublicJSON() }, 'Profile updated.');
  } catch (error) {
    next(error);
  }
};
