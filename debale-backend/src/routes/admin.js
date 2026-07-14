const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');
const { auth, requireRole } = require('../middleware/auth');

// All admin routes require auth + admin role
router.use(auth, requireRole('admin'));

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [users, listings, payments, applications] = await Promise.all([
      supabase.from('users').select('id, role, status, subscribed', { count: 'exact' }),
      supabase.from('listings').select('id, status', { count: 'exact' }),
      supabase.from('payments').select('amount, status'),
      supabase.from('applications').select('id, status', { count: 'exact' }),
    ]);

    const revenue = (payments.data || [])
      .filter(p => p.status === 'completed')
      .reduce((s, p) => s + p.amount, 0);

    res.json({
      users: {
        total: users.count,
        seekers: (users.data || []).filter(u => u.role === 'seeker').length,
        providers: (users.data || []).filter(u => u.role === 'provider').length,
        active: (users.data || []).filter(u => u.status === 'active').length,
        subscribed: (users.data || []).filter(u => u.subscribed).length,
      },
      listings: {
        total: listings.count,
        active: (listings.data || []).filter(l => l.status === 'active').length,
        filled: (listings.data || []).filter(l => l.status === 'filled').length,
      },
      revenue_etb: revenue,
      matches: (applications.data || []).filter(a => a.status === 'accepted').length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { role, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let query = supabase.from('users')
      .select('id, name, email, phone, role, status, verified, subscribed, created_at', { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (role)   query = query.eq('role', role);
    if (status) query = query.eq('status', status);

    const { data, count, error } = await query;
    if (error) throw error;
    res.json({ users: data, total: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/users/:id/ban
router.put('/users/:id/ban', async (req, res) => {
  try {
    await supabase.from('users').update({ status: 'banned' }).eq('id', req.params.id);
    res.json({ message: 'User banned' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/users/:id/unban
router.put('/users/:id/unban', async (req, res) => {
  try {
    await supabase.from('users').update({ status: 'active' }).eq('id', req.params.id);
    res.json({ message: 'User unbanned' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/users/:id/verify
router.put('/users/:id/verify', async (req, res) => {
  try {
    await supabase.from('users').update({ verified: true }).eq('id', req.params.id);
    res.json({ message: 'User verified' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/listings
router.get('/listings', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('*, users:provider_id(name, email)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ listings: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/listings/:id
router.delete('/listings/:id', async (req, res) => {
  try {
    await supabase.from('listings').delete().eq('id', req.params.id);
    res.json({ message: 'Listing removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/reports
router.get('/reports', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*, users:reporter_id(name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ reports: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/reports/:id/resolve
router.put('/reports/:id/resolve', async (req, res) => {
  try {
    await supabase.from('reports').update({ status: 'resolved' }).eq('id', req.params.id);
    res.json({ message: 'Report resolved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/revenue
router.get('/revenue', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*, users(name, email, role)')
      .eq('status', 'completed')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const total = (data || []).reduce((s, p) => s + (p.amount || 0), 0);
    const thisMonth = (data || [])
      .filter(p => new Date(p.confirmed_at || p.created_at) >= startOfMonth)
      .reduce((s, p) => s + (p.amount || 0), 0);
    const agreementFees = (data || [])
      .filter(p => p.plan === 'agreement')
      .reduce((s, p) => s + (p.amount || 0), 0);

    res.json({
      payments: data,
      total: total,
      total_etb: total,
      this_month: thisMonth,
      agreement_fees: agreementFees,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
