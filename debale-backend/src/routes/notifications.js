const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');
const { auth } = require('../middleware/auth');

// GET /api/notifications
router.get('/', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    const unread = data.filter(n => !n.read).length;
    res.json({ notifications: data, unread });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', auth, async (req, res) => {
  try {
    await supabase.from('notifications').update({ read: true })
      .eq('user_id', req.user.id).eq('read', false);
    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', auth, async (req, res) => {
  try {
    await supabase.from('notifications').update({ read: true })
      .eq('id', req.params.id).eq('user_id', req.user.id);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
