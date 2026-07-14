const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');
const { sendEmail, T } = require('../services/email');
const { auth, requireRole } = require('../middleware/auth');
const { PLANS, DURATIONS, TIERS, calcPrice, getMaxRooms, getMaxApplies, getMaxGroups, getMaxGroupApplies } = require('../config/plans');
const { logger, security } = require('../services/logger');

// GET /api/payments/plans  — return available plans & durations
router.get('/plans', auth, async (req, res) => {
  try {
    const role = req.user.role;
    const plans = PLANS[role];
    if (!plans) return res.status(400).json({ error: 'No plans for your role' });

    const result = {};
    for (const [tier, cfg] of Object.entries(plans)) {
      result[tier] = {
        ...cfg,
        durations: DURATIONS.map(d => {
          const pricing = calcPrice(role, tier, d.id);
          return { ...d, ...pricing };
        }),
      };
    }
    res.json({ plans: result, role, current_plan: req.user.subscription_plan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/initiate
router.post('/initiate', auth, async (req, res) => {
  try {
    const { planTier, duration, gateway } = req.body;
    if (!TIERS.includes(planTier)) return res.status(400).json({ error: 'Invalid plan tier' });
    if (!DURATIONS.find(d => d.id === duration)) return res.status(400).json({ error: 'Invalid duration' });
    if (!['telebirr', 'cbe', 'dashen', 'awash'].includes(gateway)) {
      return res.status(400).json({ error: 'Invalid gateway' });
    }

    const pricing = calcPrice(req.user.role, planTier, duration);
    if (!pricing) return res.status(400).json({ error: 'Invalid plan combination' });

    const planStr = `${req.user.role}_${planTier}`;
    const { data: payment, error } = await supabase.from('payments').insert([{
      user_id: req.user.id,
      plan: planStr,
      amount: pricing.total,
      gateway,
      status: 'pending',
    }]).select().single();

    if (error) throw error;

    res.json({
      message: 'Payment initiated',
      payment_id: payment.id,
      plan_tier: planTier,
      duration,
      amount: pricing.total,
      discount: pricing.discount,
      gateway,
      reference: `DBL-${payment.id.slice(0, 8).toUpperCase()}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/confirm
router.post('/confirm', auth, async (req, res) => {
  try {
    const { payment_id } = req.body;

    const { data: payment } = await supabase.from('payments')
      .select('*').eq('id', payment_id).eq('user_id', req.user.id).single();

    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    const planStr = payment.plan || `${req.user.role}_basic`;
    const parts = planStr.split('_');
    const planTier = parts.length >= 2 ? parts[1] : 'basic';

    // If already confirmed but user not subscribed, recover
    if (payment.status === 'completed') {
      if (!req.user.subscribed) {
        // Recover: apply the subscription update now
        const dur = DURATIONS[0];
        const now = new Date();
        const expires = new Date(now);
        expires.setMonth(expires.getMonth() + (dur?.months || 1));

        const maxRooms = getMaxRooms(req.user.role, planTier);
        const maxApplies = getMaxApplies(req.user.role, planTier);
        const maxGroups = getMaxGroups(req.user.role, planTier);
        const maxGroupApplies = getMaxGroupApplies(req.user.role, planTier);

        await updateUserSubscription(req.user.id, planStr, expires, maxRooms, maxApplies, maxGroups, maxGroupApplies, req.user.role, req);

        const { password_hash: _, ...safeUser } = req.user;
        return res.json({
          message: 'Subscription recovered. Active.',
          expires_at: expires.toISOString(),
          listings_activated: 0,
          max_rooms: maxRooms,
          max_applies: maxApplies,
          max_groups: maxGroups,
          max_group_applies: maxGroupApplies,
          user: { ...safeUser, subscribed: true },
        });
      }
      return res.status(409).json({ error: 'Already confirmed' });
    }

    const dur = DURATIONS[0];
    const now = new Date();
    const expires = new Date(now);
    expires.setMonth(expires.getMonth() + (dur?.months || 1));

    const maxRooms = getMaxRooms(req.user.role, planTier);
    const maxApplies = getMaxApplies(req.user.role, planTier);
    const maxGroups = getMaxGroups(req.user.role, planTier);
    const maxGroupApplies = getMaxGroupApplies(req.user.role, planTier);

    await supabase.from('payments').update({ status: 'completed', confirmed_at: now }).eq('id', payment_id);

    const user = await updateUserSubscription(req.user.id, planStr, expires, maxRooms, maxApplies, maxGroups, maxGroupApplies, req.user.role, req);

    if (req.user.role === 'provider') {
      const { data: draftListings } = await supabase
        .from('listings')
        .select('id')
        .eq('provider_id', req.user.id)
        .eq('status', 'draft');

      if (draftListings && draftListings.length > 0) {
        const canActivate = Math.min(draftListings.length, maxRooms || 999);
        const idsToActivate = draftListings.slice(0, canActivate).map(l => l.id);
        if (idsToActivate.length > 0) {
          await supabase.from('listings').update({ status: 'active' }).in('id', idsToActivate);
        }
        await supabase.from('users').update({ rooms_used: canActivate }).eq('id', req.user.id);
      }
    }

    // Notify user of plan limits
    const planLabel = planTier.charAt(0).toUpperCase() + planTier.slice(1);
    let bodyParts = [];
    if (req.user.role === 'seeker') {
      bodyParts.push(`Room applications: ${maxApplies >= 999 ? 'Unlimited' : maxApplies}`);
      bodyParts.push(`Create groups: ${maxGroups === 0 ? 'Not available' : maxGroups}`);
      bodyParts.push(`Group join requests: ${maxGroupApplies}`);
    } else {
      bodyParts.push(`Rooms: ${maxRooms >= 999 ? 'Unlimited' : maxRooms}`);
    }
    await supabase.from('notifications').insert([{
      user_id: req.user.id,
      type: 'subscription',
      title: `${planLabel} Plan Activated`,
      body: bodyParts.join(' · '),
    }]);

    const { password_hash: _, ...safeUser } = user;
    res.json({
      message: 'Payment confirmed. Subscription active.',
      expires_at: expires.toISOString(),
      listings_activated: 0,
      max_rooms: maxRooms,
      max_applies: maxApplies,
      max_groups: maxGroups,
      max_group_applies: maxGroupApplies,
      user: safeUser,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/bypass — admin only
router.post('/bypass', auth, requireRole('admin'), async (req, res) => {
  try {
    const { planTier } = req.body;
    const tier = planTier && TIERS.includes(planTier) ? planTier : 'basic';
    const now = new Date();
    const expires = new Date(now);
    expires.setMonth(expires.getMonth() + 1);
    security.paymentBypass(req.user.id, tier);

    const planStr = `${req.user.role}_${tier}`;
    const maxRooms = getMaxRooms(req.user.role, tier);
    const maxApplies = getMaxApplies(req.user.role, tier);
    const maxGroups = getMaxGroups(req.user.role, tier);
    const maxGroupApplies = getMaxGroupApplies(req.user.role, tier);

    const user = await updateUserSubscription(req.user.id, planStr, expires, maxRooms, maxApplies, maxGroups, maxGroupApplies, req.user.role, req);

    if (req.user.role === 'provider') {
      const { data: draftListings } = await supabase
        .from('listings')
        .select('id')
        .eq('provider_id', req.user.id)
        .eq('status', 'draft');

      if (draftListings && draftListings.length > 0) {
        const canActivate = Math.min(draftListings.length, maxRooms || 999);
        const idsToActivate = draftListings.slice(0, canActivate).map(l => l.id);
        if (idsToActivate.length > 0) {
          await supabase.from('listings').update({ status: 'active' }).in('id', idsToActivate);
        }
        await supabase.from('users').update({ rooms_used: canActivate }).eq('id', req.user.id);
      }
    }

    // Notify user of plan limits
    const planLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
    let bodyParts = [];
    if (req.user.role === 'seeker') {
      bodyParts.push(`Room applications: ${maxApplies >= 999 ? 'Unlimited' : maxApplies}`);
      bodyParts.push(`Create groups: ${maxGroups === 0 ? 'Not available' : maxGroups}`);
      bodyParts.push(`Group join requests: ${maxGroupApplies}`);
    } else {
      bodyParts.push(`Rooms: ${maxRooms >= 999 ? 'Unlimited' : maxRooms}`);
    }
    await supabase.from('notifications').insert([{
      user_id: req.user.id,
      type: 'subscription',
      title: `${planLabel} Plan Activated`,
      body: bodyParts.join(' · '),
    }]);

    const { password_hash: _, ...safeUser } = user;
    res.json({
      message: 'Subscription activated',
      user: safeUser,
      max_rooms: maxRooms,
      max_applies: maxApplies,
      max_groups: maxGroups,
      max_group_applies: maxGroupApplies,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/status
router.get('/status', auth, async (req, res) => {
  try {
    const { data: payments } = await supabase.from('payments')
      .select('*').eq('user_id', req.user.id).order('created_at', { ascending: false });

    const expires = req.user.subscription_expires_at ? new Date(req.user.subscription_expires_at) : null;
    const daysLeft = expires ? Math.max(0, Math.ceil((expires - new Date()) / (1000 * 60 * 60 * 24))) : 0;

    const planStr = req.user.subscription_plan || '';
    const parts = planStr.split('_');
    const planTier = parts.length === 2 ? parts[1] : 'basic';
    const role = req.user.role;
    const maxRooms = getMaxRooms(role, planTier);
    const maxApplies = getMaxApplies(role, planTier);
    const maxGroups = getMaxGroups(role, planTier);
    const maxGroupApplies = getMaxGroupApplies(role, planTier);

    // Compute actual usage from DB counts
    let roomsUsed = 0, appliesUsed = 0, groupsUsed = 0, groupAppliesUsed = 0;
    if (role === 'provider') {
      const { count: rc } = await supabase.from('listings')
        .select('id', { count: 'exact', head: true }).eq('provider_id', req.user.id);
      roomsUsed = rc || 0;
      if (req.user.rooms_used) roomsUsed = req.user.rooms_used;
    }
    if (role === 'seeker') {
      const { count: ac } = await supabase.from('applications')
        .select('id', { count: 'exact', head: true }).eq('seeker_id', req.user.id);
      appliesUsed = ac || 0;
      if (req.user.applies_used) appliesUsed = req.user.applies_used;

      const { count: gc } = await supabase.from('housemate_groups')
        .select('id', { count: 'exact', head: true }).eq('owner_id', req.user.id);
      groupsUsed = gc || 0;
      if (req.user.groups_used) groupsUsed = req.user.groups_used;

      const { count: gac } = await supabase.from('housemate_group_requests')
        .select('id', { count: 'exact', head: true }).eq('requester_id', req.user.id).in('status', ['pending', 'accepted']);
      groupAppliesUsed = gac || 0;
      if (req.user.group_applies_used) groupAppliesUsed = req.user.group_applies_used;
    }

    res.json({
      subscribed: req.user.subscribed,
      plan: req.user.subscription_plan || null,
      plan_tier: planTier,
      expires_at: req.user.subscription_expires_at || null,
      days_left: daysLeft,
      payments: payments || [],
      rooms_used: roomsUsed,
      applies_used: appliesUsed,
      max_rooms: maxRooms,
      max_applies: maxApplies,
      groups_used: groupsUsed,
      max_groups: maxGroups,
      group_applies_used: groupAppliesUsed,
      max_group_applies: maxGroupApplies,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Helper: update user subscription, retrying if new columns don't exist ──
async function updateUserSubscription(userId, planStr, expires, maxRooms, maxApplies, maxGroups, maxGroupApplies, role, req) {
  const baseUpdate = {
    subscribed: true,
    status: 'active',
    subscription_expires_at: expires.toISOString(),
    subscription_plan: planStr,
    rooms_used: 0,
    applies_used: 0,
  };
  const fullUpdate = { ...baseUpdate, groups_used: 0, group_applies_used: 0 };

  // Try with new columns first
  const { data: user, error } = await supabase.from('users').update(fullUpdate).eq('id', userId).select().single();
  if (error) {
    // If column not found, retry without new columns
    if (error.message && error.message.includes('group_applies_used')) {
      const { data: user2, error: err2 } = await supabase.from('users').update(baseUpdate).eq('id', userId).select().single();
      if (err2) throw err2;
      return user2;
    }
    throw error;
  }
  return user;
}

module.exports = router;
