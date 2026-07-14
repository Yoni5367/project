const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');
const { auth } = require('../middleware/auth');

// PUT /api/users/profile  — update basic profile
router.put('/profile', auth, async (req, res) => {
  try {
    const allowed = ['name', 'phone', 'national_id'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const { data, error } = await supabase.from('users').update(updates).eq('id', req.user.id).select().single();
    if (error) throw error;
    const { password_hash: _, ...safe } = data;
    res.json({ user: safe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/seeker-profile  — update seeker-specific fields
router.put('/seeker-profile', auth, async (req, res) => {
  try {
    const allowed = [
      'age','gender','occupation','budget_min','budget_max','move_in_date',
      'city','subcity','neighborhood','sleep_schedule','cleanliness',
      'smoking','drinking','pets','housemate_gender','languages','intro',
      'emergency_name','emergency_phone','id_photo_url','id_photo_back_url',
    ];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const { data, error } = await supabase.from('users').update(updates).eq('id', req.user.id).select().single();
    if (error) throw error;
    const { password_hash: _, ...safe } = data;
    res.json({ user: safe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/saved  — seeker's saved listings
router.get('/saved', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('saved_listings')
      .select('*, listings(id, title, city, price, property_type, furnishing, status)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ saved: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/saved/:listingId
router.post('/saved/:listingId', auth, async (req, res) => {
  try {
    const { data: existing } = await supabase.from('saved_listings')
      .select('id').eq('user_id', req.user.id).eq('listing_id', req.params.listingId).single();

    if (existing) {
      await supabase.from('saved_listings').delete().eq('id', existing.id);
      return res.json({ saved: false, message: 'Removed from saved' });
    }

    await supabase.from('saved_listings').insert([{ user_id: req.user.id, listing_id: req.params.listingId }]);
    res.json({ saved: true, message: 'Added to saved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/report  — report a user or listing
router.post('/report', auth, async (req, res) => {
  try {
    const { target_type, target_id, reason, description } = req.body;
    await supabase.from('reports').insert([{
      reporter_id: req.user.id,
      target_type,
      target_id,
      reason,
      description,
      status: 'pending',
    }]);
    res.json({ message: 'Report submitted. Our team will review within 48 hours.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
