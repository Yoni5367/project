const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');
const { auth, requireRole, requireSubscription } = require('../middleware/auth');
const { getMaxRooms } = require('../config/plans');

// GET /api/listings  (public — with filters)
router.get('/', async (req, res) => {
  try {
    const { city, type, gender, maxPrice, minPrice, furnished, search, sort = 'newest', page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('listings')
      .select('*, users(name, verified)', { count: 'exact' })
      .eq('status', 'active')
      .range(offset, offset + limit - 1);

    if (city)      query = query.ilike('city', `%${city}%`);
    if (type)      query = query.eq('property_type', type);
    if (gender)    query = query.eq('preferred_gender', gender);
    if (maxPrice)  query = query.lte('price', maxPrice);
    if (minPrice)  query = query.gte('price', minPrice);
    if (furnished) query = query.eq('furnishing', furnished);
    if (search)    query = query.or(`title.ilike.%${search}%,neighborhood.ilike.%${search}%,city.ilike.%${search}%`);

    if (sort === 'price_asc')  query = query.order('price', { ascending: true });
    else if (sort === 'price_desc') query = query.order('price', { ascending: false });
    else query = query.order('created_at', { ascending: false });

    const { data, count, error } = await query;
    if (error) throw error;

    res.json({ listings: data, total: count, page: Number(page), pages: Math.ceil(count / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/listings/:id  (public)
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('*, users(id, name, verified, phone)')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Listing not found' });

    // Hide phone unless requester is accepted seeker
    if (data.users) data.users.phone = '***hidden***';

    res.json({ listing: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/listings  (provider — saves as DRAFT)
router.post('/', auth, requireRole('provider'), async (req, res) => {
  try {
    // Check room limit for provider's plan
    const planStr = req.user.subscription_plan || '';
    const parts = planStr.split('_');
    const tier = parts.length === 2 ? parts[1] : 'basic';
    const maxRooms = getMaxRooms('provider', tier);

    const { count: existingCount, error: countErr } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('provider_id', req.user.id);

    if (countErr) throw countErr;
    if (existingCount >= maxRooms) {
      return res.status(403).json({
        error: `Your ${tier} plan allows only ${maxRooms} listing(s). You have ${existingCount}. Please upgrade your subscription to add more.`,
        code: 'LIMIT_REACHED',
        limit: maxRooms,
        used: existingCount,
        upgrade_url: '/payment',
      });
    }
    const {
      title, property_type, price, city, subcity, neighborhood, landmark,
      furnishing, rooms_available, lease_duration, preferred_gender,
      preferred_occupation, age_min, age_max, smoking_allowed,
      pets_allowed, visitors_allowed, house_rules, deal_breakers,
      includes_wifi, includes_electricity, includes_water,
      move_in_date, photos
    } = req.body;

    // Normalize boolean fields: "yes"/"limited" -> true, "no" -> false
    const toBool = (v) => v === 'yes' || v === 'limited' || v === true;

    const { data, error } = await supabase.from('listings').insert([{
      provider_id: req.user.id,
      title, property_type, price, city, subcity, neighborhood, landmark,
      furnishing, rooms_available, lease_duration, preferred_gender,
      preferred_occupation, age_min, age_max,
      smoking_allowed: toBool(smoking_allowed),
      pets_allowed: toBool(pets_allowed),
      visitors_allowed, house_rules, deal_breakers,
      includes_wifi, includes_electricity, includes_water,
      move_in_date, photos: photos || [],
      status: 'draft',
    }]).select().single();

    if (error) throw error;
    res.status(201).json({ 
      message: 'Listing saved as draft. Please complete payment to publish.',
      listing: data,
      next_step: 'Pay subscription to activate listing'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/listings/:id  (owner only)
router.put('/:id', auth, requireRole('provider'), async (req, res) => {
  try {
    const { data: listing } = await supabase.from('listings').select('provider_id').eq('id', req.params.id).single();
    if (!listing || listing.provider_id !== req.user.id) return res.status(403).json({ error: 'Not your listing' });

    // Whitelist allowed fields to prevent mass assignment
    const {
      title, property_type, price, city, subcity, neighborhood, landmark,
      furnishing, rooms_available, lease_duration, preferred_gender,
      preferred_occupation, age_min, age_max, smoking_allowed,
      pets_allowed, visitors_allowed, house_rules, deal_breakers,
      includes_wifi, includes_electricity, includes_water,
      move_in_date, photos
    } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (property_type !== undefined) updateData.property_type = property_type;
    if (price !== undefined) updateData.price = price;
    if (city !== undefined) updateData.city = city;
    if (subcity !== undefined) updateData.subcity = subcity;
    if (neighborhood !== undefined) updateData.neighborhood = neighborhood;
    if (landmark !== undefined) updateData.landmark = landmark;
    if (furnishing !== undefined) updateData.furnishing = furnishing;
    if (rooms_available !== undefined) updateData.rooms_available = rooms_available;
    if (lease_duration !== undefined) updateData.lease_duration = lease_duration;
    if (preferred_gender !== undefined) updateData.preferred_gender = preferred_gender;
    if (preferred_occupation !== undefined) updateData.preferred_occupation = preferred_occupation;
    if (age_min !== undefined) updateData.age_min = age_min;
    if (age_max !== undefined) updateData.age_max = age_max;
    const toBool = (v) => v === 'yes' || v === 'limited' || v === true;
    if (smoking_allowed !== undefined) updateData.smoking_allowed = toBool(smoking_allowed);
    if (pets_allowed !== undefined) updateData.pets_allowed = toBool(pets_allowed);
    if (visitors_allowed !== undefined) updateData.visitors_allowed = visitors_allowed;
    if (house_rules !== undefined) updateData.house_rules = house_rules;
    if (deal_breakers !== undefined) updateData.deal_breakers = deal_breakers;
    if (includes_wifi !== undefined) updateData.includes_wifi = includes_wifi;
    if (includes_electricity !== undefined) updateData.includes_electricity = includes_electricity;
    if (includes_water !== undefined) updateData.includes_water = includes_water;
    if (move_in_date !== undefined) updateData.move_in_date = move_in_date;
    if (photos !== undefined) updateData.photos = photos;

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase.from('listings').update(updateData).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ listing: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update listing' });
  }
});

// DELETE /api/listings/:id  (owner only)
router.delete('/:id', auth, requireRole('provider'), async (req, res) => {
  try {
    const { data: listing } = await supabase.from('listings').select('provider_id').eq('id', req.params.id).single();
    if (!listing || listing.provider_id !== req.user.id) return res.status(403).json({ error: 'Not your listing' });

    await supabase.from('listings').delete().eq('id', req.params.id);
    res.json({ message: 'Listing deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/listings/provider/mine  (my listings)
router.get('/provider/mine', auth, requireRole('provider'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('provider_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Manually count applications per listing
    const listingIds = data.map(l => l.id);
    const { data: appCounts } = await supabase
      .from('applications')
      .select('listing_id, id', { count: 'exact' })
      .in('listing_id', listingIds);

    const countMap = {};
    if (appCounts) {
      appCounts.forEach(a => {
        countMap[a.listing_id] = (countMap[a.listing_id] || 0) + 1;
      });
    }

    const listingsWithCount = data.map(l => ({
      ...l,
      applications: [{ count: countMap[l.id] || 0 }],
    }));

    res.json({ listings: listingsWithCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/listings/:id/publish  (activate draft listing after payment)
router.post('/:id/publish', auth, requireRole('provider'), async (req, res) => {
  try {
    const { data: listing } = await supabase.from('listings').select('provider_id, status').eq('id', req.params.id).single();
    if (!listing || listing.provider_id !== req.user.id) return res.status(403).json({ error: 'Not your listing' });
    if (listing.status !== 'draft') return res.status(409).json({ error: 'Listing is not in draft status' });

    const { data, error } = await supabase.from('listings').update({ status: 'active' }).eq('id', req.params.id).select().single();
    if (error) throw error;
    
    res.json({ message: 'Listing published successfully', listing: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
