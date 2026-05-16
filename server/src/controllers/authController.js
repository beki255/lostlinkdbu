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

    // Try to send email in background, don't fail registration
    sendEmail({
      to: email,
      subject: '[LostLink] Verify Your Account',
      otp,
      type: 'email_verification',
    }).catch(err => console.error('[Register] Background email failed:', err.message));

    await AuditLog.create({
      action: 'USER_REGISTERED',
      resource: 'User',
      resourceId: user._id,
      performedBy: user._id,
      performedByRole: 'user',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    const token = generateToken(user._id, user.role);
    sendCreated(res, { token, user: user.toPublicJSON() }, 'Account created successfully.');
  } catch (error) {
    next(error);
  }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    const { otp } = req.body;
    const email = (req.body.email || '').toString().toLowerCase().trim();

    if (!email || !otp) {
      throw new AppError('Email and OTP are required.', 400);
    }

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

    const user = await User.findOneAndUpdate({ email }, { isVerified: true }, { new: true });
    if (!user) throw new NotFoundError('User');

    const token = generateToken(user._id, user.role);

    // Background audit log
    AuditLog.create({
      action: 'EMAIL_VERIFIED',
      resource: 'User',
      resourceId: user._id,
      performedBy: user._id,
      performedByRole: user.role,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    }).catch(e => console.error('[VerifyEmail] Audit log fail:', e.message));

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully.',
      data: {
        token,
        user: user.toPublicJSON(),
      }
    });
  } catch (error) {
    console.error('[CRITICAL] VerifyEmail Error:', error);
    next(error);
  }
};

exports.login = async (req, res, next) => {
  console.log('[Login] Attempt starting...');
  try {
    const { password } = req.body;
    const email = (req.body.email || '').toString().toLowerCase().trim();

    console.log('[Login] User lookup for:', email);
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email, isDeleted: false }).select('+passwordHash');
    if (!user) {
      console.log('[Login] User not found:', email);
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    console.log('[Login] Comparing password...');
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('[Login] Password mismatch for:', email);
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (user.status === 'banned') {
      return res.status(403).json({ success: false, message: 'Your account has been banned.' });
    }

    // Direct Verification check with redirect
    if (!user.isVerified) {
      console.log('[Login] User not verified, handling redirect...');
      const otp = generateOTP();
      try {
        await OTP.deleteMany({ email, type: 'email_verification', isUsed: false });
        await OTP.create({
          email,
          otp,
          type: 'email_verification',
          expiresAt: new Date(Date.now() + (5 * 60 * 1000)), // 5 mins
        });
        sendEmail({
          to: email,
          subject: '[LostLink] Verify Your Account',
          otp,
          type: 'email_verification',
        }).catch(e => console.error('[Login] Bg Email Fail:', e.message));

        return res.status(403).json({
          success: false,
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Please verify your email.',
          email,
        });
      } catch (otpErr) {
        console.error('[Login] OTP/Email block failed, but continuing login:', otpErr.message);
      }
    }

    console.log('[Login] Generating token...');
    const token = generateToken(user._id, user.role);
    
    console.log('[Login] Success for:', email);
    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: user.toPublicJSON(),
      }
    });
  } catch (error) {
    console.error('[CRITICAL] Login Controller Crash:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error during login.',
      debug: error.message 
    });
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
      type: 'password_reset',
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

    const token = generateToken(user._id, user.role);

    sendSuccess(res, { token, user: user.toPublicJSON() }, 'Password reset successful and logged in.');
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
    const email = (req.body.email || '').toString().toLowerCase().trim();
    if (!email) throw new AppError('Email is required.', 400);

    const user = await User.findOne({ email, isDeleted: false });
    if (!user) {
      // Still return success to prevent email enumeration, or return 404 in dev
      return res.status(200).json({ success: true, message: 'If the account exists, a new code has been sent.' });
    }

    const type = req.body.type || 'email_verification';
    if (type === 'email_verification' && user.isVerified) {
      return res.status(200).json({ success: true, message: 'Email is already verified.' });
    }

    const otp = generateOTP();
    await OTP.deleteMany({ email, type, isUsed: false });
    await OTP.create({
      email,
      otp,
      type,
      expiresAt: new Date(Date.now() + (config.otp.expiresIn || 300000)),
    });

    sendEmail({
      to: email,
      subject: type === 'password_reset' ? '[LostLink] Reset Your Password' : '[LostLink] Verify Your Account',
      otp,
      type,
    }).catch(err => console.error('[ResendOTP] Background email fail:', err.message));

    return res.status(200).json({ 
      success: true, 
      message: 'A new verification code has been sent to your email.' 
    });
  } catch (error) {
    console.error('[CRITICAL] ResendOTP Error:', error);
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
      if (user.status === 'banned') {
        throw new AppError('Your account has been banned. Please contact support.', 403);
      }
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
    const allowedFields = ['name', 'phone', 'department', 'studentId', 'avatar'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // Handle avatar upload from file
    if (req.file) {
      updates.avatar = req.file.path;
    }

    // Mandatory fields check for regular users
    if (req.user.role === 'user') {
      const studentId = req.body.studentId || req.user.studentId;
      const department = req.body.department || req.user.department;

      if (!studentId) throw new AppError('Student ID is mandatory for lost and found users.', 400);
      if (!department) throw new AppError('Department is mandatory for lost and found users.', 400);

      // Student ID format validation
      // Format: dbu + YY (Ethiopian Year) + XXXX (4-digit number)
      // YY must be <= current Ethiopian year (last 2 digits)
      
      const idRegex = /^dbu(\d{2})(\d{4})$/i;
      const match = String(studentId).match(idRegex);
      
      if (!match) {
        throw new AppError('Invalid Student ID format. Expected format: dbuYYXXXX (e.g., dbu180001)', 400);
      }

      const idYear = parseInt(match[1]);
      
      // Calculate current Ethiopian year (roughly Gregorian - 8)
      // For May 2026, it's 2018 EC.
      const currentGregorianYear = new Date().getFullYear();
      const currentGregorianMonth = new Date().getMonth(); // 0-indexed
      
      // Ethiopian New Year is around Sept 11/12 (Month 8 in JS)
      let currentEthiopianYear = currentGregorianYear - 8;
      if (currentGregorianMonth > 8 || (currentGregorianMonth === 8 && new Date().getDate() >= 11)) {
        // We are past Sept 11, so it's a new Ethiopian year (actually Gregorian - 7)
        // Wait, Jan 2026 is 2018 EC. Sept 2026 starts 2019 EC.
        // So from Jan to Sept, it's Gregorian - 8.
        // From Sept to Dec, it's Gregorian - 7.
        currentEthiopianYear = currentGregorianYear - 7;
      }
      
      const currentEthYear2Digits = currentEthiopianYear % 100;

      if (idYear > currentEthYear2Digits) {
        throw new AppError(`Student ID year (${idYear}) cannot be in the future. Current Ethiopian year last two digits: ${currentEthYear2Digits}`, 400);
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

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError('Current password and new password are required.', 400);
    }

    if (newPassword.length < 6) {
      throw new AppError('New password must be at least 6 characters long.', 400);
    }

    // Get user with password hash
    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!user) throw new NotFoundError('User');

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new AppError('Current password is incorrect.', 401);
    }

    // Update password
    user.passwordHash = newPassword;
    await user.save();

    await AuditLog.create({
      action: 'PASSWORD_CHANGED',
      resource: 'User',
      resourceId: user._id,
      performedBy: user._id,
      performedByRole: user.role,
      ipAddress: req.ip,
    });

    sendSuccess(res, null, 'Password changed successfully.');
  } catch (error) {
    next(error);
  }
};
