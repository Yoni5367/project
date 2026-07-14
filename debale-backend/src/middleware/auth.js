const jwt = require('jsonwebtoken');
const supabase = require('../services/supabase');

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.id)
      .single();

    if (error || !user) return res.status(401).json({ error: 'Invalid token' });
    if (user.status === 'banned') return res.status(403).json({ error: 'Account suspended' });
    // draft status allowed so users can complete registration & payment

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalid or expired' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}` });
  }
  next();
};

const requireSubscription = (req, res, next) => {
  if (!req.user.subscribed) {
    return res.status(402).json({ error: 'Active subscription required', code: 'SUBSCRIPTION_REQUIRED' });
  }
  const expires = new Date(req.user.subscription_expires_at);
  if (expires < new Date()) {
    return res.status(402).json({ error: 'Subscription expired', code: 'SUBSCRIPTION_EXPIRED' });
  }
  next();
};

module.exports = { auth, requireRole, requireSubscription };
