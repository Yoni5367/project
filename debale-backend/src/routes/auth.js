const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const he = require('he');
const router = express.Router();
const supabase = require('../services/supabase');
const { sendEmail, T } = require('../services/email');
const { auth } = require('../middleware/auth');
const { logger, security } = require('../services/logger');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const signResetToken = (id) =>
  jwt.sign({ id, purpose: 'reset' }, process.env.JWT_SECRET, { expiresIn: '1h' });

function validatePassword(password) {
  if (!password || password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  return null;
}

function sanitize(str) {
  return he.encode(String(str || ''));
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'name, email, password and role are required' });
    }
    if (!['seeker', 'provider'].includes(role)) {
      return res.status(400).json({ error: 'Role must be seeker or provider' });
    }

    const pwError = validatePassword(password);
    if (pwError) return res.status(400).json({ error: pwError });

    // Email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const { data: existing } = await supabase.from('users').select('id').eq('email', email).single();
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 12);

    const { data: user, error } = await supabase.from('users').insert([{
      name, email, phone, password_hash, role, status: 'draft',
      subscribed: false, verified: false,
    }]).select().single();

    if (error) throw error;

    const token = signToken(user.id);
    const { password_hash: _, ...safeUser } = user;

    logger.info('User registered', { userId: user.id, role });
    res.status(201).json({ message: 'Account created (draft). Complete payment to activate.', token, user: safeUser });
  } catch (err) {
    logger.error('Register error', { error: err.message });
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const { data: user } = await supabase.from('users').select('*').eq('email', email).single();
    if (!user) {
      security.loginFailed(email, req.ip);
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (user.status === 'banned') return res.status(403).json({ error: 'Account suspended. Contact support.' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      security.loginFailed(email, req.ip);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user.id);
    const { password_hash: _, ...safeUser } = user;

    security.loginSuccess(user.id, req.ip);
    res.json({ message: 'Login successful', token, user: safeUser });
  } catch (err) {
    logger.error('Login error', { error: err.message });
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  const { password_hash: _, ...safeUser } = req.user;
  res.json({ user: safeUser });
});

// PUT /api/auth/change-password
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    const pwError = validatePassword(newPassword);
    if (pwError) return res.status(400).json({ error: pwError });

    const { data: user } = await supabase.from('users').select('password_hash').eq('id', req.user.id).single();
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Current password incorrect' });

    const password_hash = await bcrypt.hash(newPassword, 12);
    await supabase.from('users').update({ password_hash }).eq('id', req.user.id);

    logger.info('Password changed', { userId: req.user.id });
    res.json({ message: 'Password updated' });
  } catch (err) {
    logger.error('Change password error', { error: err.message });
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    // Always return same message to prevent user enumeration
    const genericMessage = 'If an account with that email exists, a reset link has been sent.';

    const { data: user } = await supabase.from('users').select('id, name').eq('email', email).single();
    if (!user) {
      security.passwordReset(email, req.ip);
      return res.json({ message: genericMessage });
    }

    const token = signResetToken(user.id);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await supabase.from('users').update({
      reset_token: tokenHash,
      reset_token_expires: new Date(Date.now() + 3600000).toISOString(),
    }).eq('id', user.id);

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

    const html = `
      <div style="font-family:'Segoe UI',sans-serif;max-width:580px;margin:0 auto;background:#FAFAF7">
        <div style="background:#0E7C6B;padding:24px 32px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:white;margin:0;font-size:26px">debale</h1>
        </div>
        <div style="background:white;padding:32px;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 12px 12px">
          <h2 style="color:#111827;margin-top:0">Reset Your Password</h2>
          <p style="color:#6B7280;line-height:1.7">Hi <strong>${sanitize(user.name)}</strong>,</p>
          <p style="color:#6B7280;line-height:1.7">We received a request to reset your Debale account password. Click the button below to set a new password. This link expires in 1 hour.</p>
          <a href="${resetUrl}" style="display:inline-block;background:#0E7C6B;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;font-size:15px">Reset Password</a>
          <p style="color:#9CA3AF;font-size:13px;margin-top:24px">If you didn't request this, you can safely ignore this email.</p>
          <hr style="border:none;border-top:1px solid #F3F4F6;margin:28px 0">
          <p style="color:#9CA3AF;font-size:12px;margin:0">© 2025 Debale · Made in Ethiopia</p>
        </div>
      </div>`;

    await sendEmail({ to: email, subject: 'Reset Your Debale Password', html });

    security.passwordReset(email, req.ip);
    res.json({ message: genericMessage });
  } catch (err) {
    logger.error('Forgot password error', { error: err.message });
    res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });

    const pwError = validatePassword(password);
    if (pwError) return res.status(400).json({ error: pwError });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.purpose !== 'reset') throw new Error('Invalid token purpose');
    } catch {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const { data: user } = await supabase.from('users')
      .select('id, reset_token, reset_token_expires')
      .eq('id', decoded.id)
      .single();

    if (!user || user.reset_token !== tokenHash) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    if (new Date(user.reset_token_expires) < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    await supabase.from('users').update({
      password_hash,
      reset_token: null,
      reset_token_expires: null,
    }).eq('id', user.id);

    logger.info('Password reset completed', { userId: user.id });
    res.json({ message: 'Password reset successful. You can now sign in with your new password.' });
  } catch (err) {
    logger.error('Reset password error', { error: err.message });
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
