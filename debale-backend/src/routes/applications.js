const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');
const { sendEmail, T } = require('../services/email');
const { auth, requireRole, requireSubscription } = require('../middleware/auth');
const { getMaxApplies } = require('../config/plans');

// POST /api/applications  (seeker applies to listing)
router.post('/', auth, requireRole('seeker'), requireSubscription, async (req, res) => {
  try {
    const { listing_id } = req.body;

    // Check apply limit for seeker's plan
    const planStr = req.user.subscription_plan || '';
    const parts = planStr.split('_');
    const tier = parts.length === 2 ? parts[1] : 'basic';
    const maxApplies = getMaxApplies('seeker', tier);

    const { count: usedCount, error: countErr } = await supabase
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .eq('seeker_id', req.user.id);

    if (countErr) throw countErr;
    if (usedCount >= maxApplies) {
      return res.status(403).json({
        error: `Your ${tier} plan allows only ${maxApplies} application(s). You have used ${usedCount}. Please upgrade your subscription to apply to more rooms.`,
        code: 'LIMIT_REACHED',
        limit: maxApplies,
        used: usedCount,
        upgrade_url: '/payment',
      });
    }

    // Check listing exists and is active
    const { data: listing } = await supabase.from('listings').select('*, users(name, email)').eq('id', listing_id).single();
    if (!listing || listing.status !== 'active') return res.status(404).json({ error: 'Listing not available' });

    // Check not already applied
    const { data: existing } = await supabase.from('applications')
      .select('id').eq('seeker_id', req.user.id).eq('listing_id', listing_id).single();
    if (existing) return res.status(409).json({ error: 'Already applied to this listing' });

    // Calculate match score
    const score = calculateMatchScore(req.user, listing);

    const { data: app, error } = await supabase.from('applications').insert([{
      seeker_id: req.user.id,
      listing_id,
      status: 'pending',
      match_score: score,
    }]).select().single();

    if (error) throw error;

    // Create notification for provider
    await supabase.from('notifications').insert([{
      user_id: listing.provider_id,
      type: 'application',
      title: 'New Application',
      body: `${req.user.name} applied to "${listing.title}". Match score: ${score}%`,
    }]);

    // Email provider
    const tmpl = T.applicationReceived(listing.users.name, req.user.name, listing.title);
    await sendEmail({ to: listing.users.email, ...tmpl });

    res.status(201).json({ message: 'Application submitted', application: app });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/applications/mine  (seeker's own applications)
router.get('/mine', auth, requireRole('seeker'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('applications')
      .select('*, listings(title, city, price, property_type, photos)')
      .eq('seeker_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ applications: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/applications/listing/:listingId  (provider sees applicants)
router.get('/listing/:listingId', auth, requireRole('provider'), async (req, res) => {
  try {
    // Verify listing belongs to provider
    const { data: listing } = await supabase.from('listings').select('provider_id, title').eq('id', req.params.listingId).single();
    if (!listing || listing.provider_id !== req.user.id) return res.status(403).json({ error: 'Not your listing' });

    const { data, error } = await supabase
      .from('applications')
      .select('*, users:seeker_id(id, name, email, phone, age, gender, occupation, budget_min, budget_max, sleep_schedule, cleanliness, smoking, drinking, pets, intro, languages, verified)')
      .eq('listing_id', req.params.listingId)
      .order('match_score', { ascending: false });

    if (error) throw error;
    res.json({ applicants: data, listing_title: listing.title });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/applications/:id  (get single application)
router.get('/:id', auth, async (req, res) => {
  try {
    const { data: app } = await supabase
      .from('applications')
      .select('*, listings!inner(title, price, city, subcity, neighborhood, lease_duration, house_rules, provider_id, users:provider_id(name, phone, email)), users:seeker_id(name, email)')
      .eq('id', req.params.id).single();

    if (!app) return res.status(404).json({ error: 'Application not found' });

    // Only provider or seeker can view
    if (app.listings.provider_id !== req.user.id && app.seeker_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json({ application: app });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/applications/:id/status  (provider updates status)
router.put('/:id/status', auth, requireRole('provider'), async (req, res) => {
  try {
    const { status } = req.body; // shortlist | reject | accept
    if (!['shortlist', 'rejected', 'accepted'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Verify provider owns this application's listing
    const { data: app } = await supabase
      .from('applications')
      .select('*, listings(provider_id, title, users:provider_id(phone)), users:seeker_id(name, email)')
      .eq('id', req.params.id).single();

    if (!app || app.listings.provider_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    await supabase.from('applications').update({ status }).eq('id', req.params.id);

    const seekerName = app.users.name;
    const seekerEmail = app.users.email;
    const roomTitle = app.listings.title;

    if (status === 'rejected') {
      await supabase.from('notifications').insert([{
        user_id: app.seeker_id,
        type: 'rejected',
        title: 'Application Update',
        body: `Your application to "${roomTitle}" was not selected.`,
      }]);
      const tmpl = T.applicationRejected(seekerName, roomTitle);
      await sendEmail({ to: seekerEmail, ...tmpl });
    }

    if (status === 'accepted') {
      // Reject all other pending applicants for this listing
      const { data: others } = await supabase
        .from('applications')
        .select('id, seeker_id, users:seeker_id(name, email)')
        .eq('listing_id', app.listing_id)
        .neq('id', req.params.id)
        .in('status', ['pending', 'shortlist', 'interview']);

      for (const other of others || []) {
        await supabase.from('applications').update({ status: 'rejected' }).eq('id', other.id);
        await supabase.from('notifications').insert([{
          user_id: other.seeker_id,
          type: 'rejected',
          title: 'Application Update',
          body: `Your application to "${roomTitle}" was not selected.`,
        }]);
        const tmpl = T.applicationRejected(other.users.name, roomTitle);
        await sendEmail({ to: other.users.email, ...tmpl });
      }

      // Mark listing as filled
      await supabase.from('listings').update({ status: 'filled' }).eq('id', app.listing_id);

      // Reveal phone to accepted seeker
      const providerPhone = app.listings.users?.phone || 'Contact through platform';

      await supabase.from('notifications').insert([{
        user_id: app.seeker_id,
        type: 'accepted',
        title: 'Application Accepted! 🎉',
        body: `Your application to "${roomTitle}" was accepted! Provider contact: ${providerPhone}`,
      }]);

      const tmpl = T.applicationAccepted(seekerName, roomTitle, providerPhone);
      await sendEmail({ to: seekerEmail, ...tmpl });
    }

    res.json({ message: `Application ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/applications/:id/interview  (schedule interview)
router.post('/:id/interview', auth, requireRole('provider'), async (req, res) => {
  try {
    const { scheduled_at } = req.body;

    const { data: app } = await supabase
      .from('applications')
      .select('*, listings(provider_id, title), users:seeker_id(name, email)')
      .eq('id', req.params.id).single();

    if (!app || app.listings.provider_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    await supabase.from('applications').update({ status: 'interview', interview_at: scheduled_at }).eq('id', req.params.id);

    const dateStr = new Date(scheduled_at).toLocaleString('en-ET', { dateStyle: 'full', timeStyle: 'short' });

    // Notify both parties
    for (const [userId, name, email] of [
      [app.seeker_id, app.users.name, app.users.email],
      [req.user.id, req.user.name, req.user.email],
    ]) {
      await supabase.from('notifications').insert([{
        user_id: userId,
        type: 'interview',
        title: 'Interview Scheduled',
        body: `Interview for "${app.listings.title}" — ${dateStr}`,
      }]);
      const tmpl = T.interviewScheduled(name, app.listings.title, dateStr);
      await sendEmail({ to: email, ...tmpl });
    }

    res.json({ message: 'Interview scheduled', scheduled_at });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Utility: basic match score calculation
function calculateMatchScore(seeker, listing) {
  let score = 60;
  if (seeker.budget_max && listing.price <= seeker.budget_max) score += 10;
  if (seeker.smoking === 'no' && listing.smoking_allowed === false) score += 5;
  if (listing.preferred_gender === 'any' || listing.preferred_gender === seeker.gender) score += 10;
  if (seeker.city && listing.city && seeker.city.toLowerCase() === listing.city.toLowerCase()) score += 10;
  if (seeker.pets === 'no_pets' && listing.pets_allowed === false) score += 5;
  return Math.min(score, 99);
}

module.exports = router;
