const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');
const { auth, requireRole } = require('../middleware/auth');
const { getMaxGroups, getMaxGroupApplies } = require('../config/plans');

// ── Helper: compute compatibility between two intake profiles (fallback) ──
function computeCompatibility(a, b) {
  let total = 0;
  let max = 0;
  max += 30;
  if (a.languages?.length && b.languages?.length) {
    const overlap = a.languages.filter(l => b.languages.includes(l)).length;
    total += (overlap / Math.max(a.languages.length, b.languages.length)) * 30;
  } else if (!a.languages?.length && !b.languages?.length) {
    total += 15;
  }
  max += 20;
  const socMap = { 'very_social': 3, 'balanced': 2, 'prefers_quiet': 1 };
  const sa = socMap[a.sociability] || 2;
  const sb = socMap[b.sociability] || 2;
  total += (1 - Math.abs(sa - sb) / 3) * 20;
  max += 15;
  if (a.sleep_schedule && b.sleep_schedule) {
    total += a.sleep_schedule === b.sleep_schedule ? 15 : 5;
  } else {
    total += 7;
  }
  max += 15;
  if (a.cleanliness && b.cleanliness) {
    const cMap = { 'tidy': 3, 'moderate': 2, 'relaxed': 1 };
    const ca = cMap[a.cleanliness] || 2;
    const cb = cMap[b.cleanliness] || 2;
    total += (1 - Math.abs(ca - cb) / 3) * 15;
  } else {
    total += 7;
  }
  max += 10;
  if (a.smoking && b.smoking) {
    total += a.smoking === b.smoking ? 10 : 0;
  } else {
    total += 5;
  }
  max += 10;
  if (a.guests_habit && b.guests_habit) {
    const gMap = { 'frequent': 3, 'occasional': 2, 'rarely': 1 };
    const ga = gMap[a.guests_habit] || 2;
    const gb = gMap[b.guests_habit] || 2;
    total += (1 - Math.abs(ga - gb) / 3) * 10;
  } else {
    total += 5;
  }
  return max > 0 ? Math.round((total / max) * 100) : 50;
}

// ── Helper: Groq-powered AI compatibility scoring ──
async function groqCompatibility(a, b) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  const profileA = `Languages: ${JSON.stringify(a.languages)}, Sociability: ${a.sociability}, Sleep: ${a.sleep_schedule}, Cleanliness: ${a.cleanliness}, Smoking: ${a.smoking}, Guests: ${a.guests_habit}, Lifestyle notes: ${a.lifestyle_notes || 'none'}`;
  const profileB = `Languages: ${JSON.stringify(b.languages)}, Sociability: ${b.sociability}, Sleep: ${b.sleep_schedule}, Cleanliness: ${b.cleanliness}, Smoking: ${b.smoking}, Guests: ${b.guests_habit}, Lifestyle notes: ${b.lifestyle_notes || 'none'}`;
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{
          role: 'user',
          content: `Rate housemate compatibility between these two people on a scale of 0-100. Consider language overlap, sociability compatibility, sleep schedule similarity, cleanliness alignment, smoking habits, and guest preferences.

Person A: ${profileA}
Person B: ${profileB}

Respond with ONLY valid JSON in this exact format, no other text:
{"score": <number 0-100>, "explanation": "<1 short sentence why they match>"}`,
        }],
        max_tokens: 150,
        temperature: 0.3,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) return null;
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    return { score: Math.round(Math.min(100, Math.max(0, parsed.score))), explanation: parsed.explanation };
  } catch {
    return null;
  }
}

// ── Helper: notify all group members ──
async function notifyGroupMembers(groupId, title, body) {
  const { data: members } = await supabase.from('housemate_group_members').select('user_id').eq('group_id', groupId);
  if (!members) return;
  const notifications = members.map(m => ({ user_id: m.user_id, type: 'group', title, body }));
  await supabase.from('notifications').insert(notifications);
}

// ════════════════════════════════════════════════════════════════
// INTAKE
// ════════════════════════════════════════════════════════════════

// POST /api/housemate/intake — submit/update matching questionnaire
router.post('/intake', auth, async (req, res) => {
  try {
    const { languages, sociability, lifestyle_notes, sleep_schedule, cleanliness, smoking, guests_habit, budget_min, budget_max, preferred_city } = req.body;
    const payload = {
      user_id: req.user.id, languages, sociability, lifestyle_notes,
      sleep_schedule, cleanliness, smoking, guests_habit,
      budget_min, budget_max, preferred_city,
    };
    const { data, error } = await supabase.from('housemate_intake').upsert(payload, { onConflict: 'user_id' }).select().single();
    if (error) throw error;
    res.json({ intake: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/housemate/intake — get current user's intake
router.get('/intake', auth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('housemate_intake').select('*').eq('user_id', req.user.id).single();
    if (error && error.code !== 'PGRST116') throw error;
    res.json({ intake: data || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// SUGGESTIONS
// ════════════════════════════════════════════════════════════════

// GET /api/housemate/suggestions — get AI-suggested compatible seekers
router.get('/suggestions', auth, async (req, res) => {
  try {
    // Get current user's intake
    const { data: myIntake } = await supabase.from('housemate_intake').select('*').eq('user_id', req.user.id).single();
    if (!myIntake) return res.status(400).json({ error: 'Please complete your intake questionnaire first' });

    // Get all other seekers with intake profiles
    const { data: others } = await supabase
      .from('housemate_intake')
      .select('*, users!inner(id, name, id_photo_url)')
      .neq('user_id', req.user.id);

    if (!others || others.length === 0) return res.json({ suggestions: [] });

    // Get existing suggestions to avoid recomputing
    const { data: existing } = await supabase
      .from('housemate_suggestions')
      .select('suggested_user_id, compatibility_pct, ai_explanation, status')
      .eq('seeker_id', req.user.id);

    const existingMap = {};
    if (existing) existing.forEach(s => { existingMap[s.suggested_user_id] = s; });

    // Generate suggestions for each other seeker
    // Pre-filter with rule-based scoring to limit Groq calls
    let candidates = [];
    for (const other of others) {
      if (myIntake.budget_max && other.budget_min && myIntake.budget_max < other.budget_min) continue;
      if (other.budget_max && myIntake.budget_min && other.budget_max < myIntake.budget_min) continue;
      if (myIntake.preferred_city && other.preferred_city && myIntake.preferred_city !== other.preferred_city) continue;
      const cached = existingMap[other.user_id];
      if (cached && cached.status === 'declined') continue;
      candidates.push({ ...other, _cached: cached, _rulePct: computeCompatibility(myIntake, other) });
    }

    // Sort by rule-based score, take top 15 for Groq evaluation
    candidates.sort((a, b) => b._rulePct - a._rulePct);
    const topCandidates = candidates.slice(0, 15);

    const suggestions = [];
    for (const other of topCandidates) {
      const cached = other._cached;
      let pct, explanation;
      if (cached && cached.status === 'pending') {
        pct = cached.compatibility_pct;
        explanation = cached.ai_explanation;
      } else {
        // Try Groq first, fall back to rule-based
        const groqResult = await groqCompatibility(myIntake, other);
        if (groqResult) {
          pct = groqResult.score;
          explanation = groqResult.explanation;
        } else {
          pct = other._rulePct;
          explanation = 'Compatibility scored based on shared preferences.';
        }
        await supabase.from('housemate_suggestions').upsert({
          seeker_id: req.user.id, suggested_user_id: other.user_id,
          compatibility_pct: pct, ai_explanation: explanation, status: 'pending',
        }, { onConflict: 'seeker_id,suggested_user_id' });
      }
      suggestions.push({
        id: other.user_id, name: other.users?.name,
        user: { id: other.user_id, name: other.users?.name, photo: other.users?.id_photo_url },
        compatibility_pct: pct,
        ai_explanation: explanation,
        languages: other.languages || [],
        sociability: other.sociability || '',
        sleep_schedule: other.sleep_schedule || '',
        cleanliness: other.cleanliness || '',
        smoking: other.smoking || '',
        guests_habit: other.guests_habit || '',
        lifestyle_notes: other.lifestyle_notes || '',
        budget_min: other.budget_min || null,
        budget_max: other.budget_max || null,
        preferred_city: other.preferred_city || '',
      });
    }

    // Add remaining candidates (beyond top 15) with rule-based scores
    for (const other of candidates.slice(15)) {
      const cached = other._cached;
      let pct, explanation;
      if (cached && cached.status === 'pending') {
        pct = cached.compatibility_pct;
        explanation = cached.ai_explanation;
      } else {
        pct = other._rulePct;
        explanation = 'Compatibility scored based on shared preferences.';
        await supabase.from('housemate_suggestions').upsert({
          seeker_id: req.user.id, suggested_user_id: other.user_id,
          compatibility_pct: pct, ai_explanation: explanation, status: 'pending',
        }, { onConflict: 'seeker_id,suggested_user_id' });
      }
      suggestions.push({
        id: other.user_id, name: other.users?.name,
        user: { id: other.user_id, name: other.users?.name, photo: other.users?.id_photo_url },
        compatibility_pct: pct,
        ai_explanation: explanation,
        languages: other.languages || [],
        sociability: other.sociability || '',
        sleep_schedule: other.sleep_schedule || '',
        cleanliness: other.cleanliness || '',
        smoking: other.smoking || '',
        guests_habit: other.guests_habit || '',
        lifestyle_notes: other.lifestyle_notes || '',
        budget_min: other.budget_min || null,
        budget_max: other.budget_max || null,
        preferred_city: other.preferred_city || '',
      });
    }

    suggestions.sort((a, b) => b.compatibility_pct - a.compatibility_pct);
    res.json({ suggestions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/housemate/seekers — list all seekers who filled intake
router.get('/seekers', auth, async (req, res) => {
  try {
    const { data: seekers } = await supabase
      .from('housemate_intake')
      .select('*, users!inner(id, name, id_photo_url)')
      .neq('user_id', req.user.id);
    const list = (seekers || []).map(s => ({
      id: s.user_id,
      name: s.users?.name,
      photo: s.users?.id_photo_url,
      languages: s.languages,
      sociability: s.sociability,
      sleep_schedule: s.sleep_schedule,
      cleanliness: s.cleanliness,
      smoking: s.smoking,
      guests_habit: s.guests_habit,
      lifestyle_notes: s.lifestyle_notes,
      budget_min: s.budget_min,
      budget_max: s.budget_max,
      preferred_city: s.preferred_city,
    }));
    res.json({ seekers: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/housemate/suggestions/:userId/accept
router.post('/suggestions/:userId/accept', auth, async (req, res) => {
  try {
    const targetUserId = req.params.userId;

    // Mark suggestion as accepted
    const { error: sugErr } = await supabase.from('housemate_suggestions')
      .update({ status: 'accepted' })
      .eq('seeker_id', req.user.id)
      .eq('suggested_user_id', targetUserId);
    if (sugErr) throw sugErr;

    // Check if user already has a forming group
    const { data: myMembership } = await supabase
      .from('housemate_group_members')
      .select('group_id')
      .eq('user_id', req.user.id);

    let groupId;
    if (myMembership && myMembership.length > 0) {
      // Verify group is still forming
      const { data: group } = await supabase
        .from('housemate_groups')
        .select('id, status')
        .eq('id', myMembership[0].group_id)
        .single();
      if (group && group.status === 'forming') {
        groupId = group.id;
      }
    }

    if (groupId) {
      // Add to existing group
      await supabase.from('housemate_group_members').insert({ group_id: groupId, user_id: targetUserId });
    } else {
      // Create new group with both users
      const { data: newGroup } = await supabase.from('housemate_groups').insert({ status: 'forming' }).select().single();
      groupId = newGroup.id;
      await supabase.from('housemate_group_members').insert([
        { group_id: groupId, user_id: req.user.id },
        { group_id: groupId, user_id: targetUserId },
      ]);
    }

    // Notify the accepted user
    await supabase.from('notifications').insert([{
      user_id: targetUserId,
      type: 'housemate_group',
      title: `${req.user.name} accepted your suggestion!`,
      body: `You've been added to a housemate group. Check your dashboard.`,
    }]);

    res.json({ group_id: groupId, message: 'Accepted and added to group' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/housemate/suggestions/:userId/decline
router.post('/suggestions/:userId/decline', auth, async (req, res) => {
  try {
    await supabase.from('housemate_suggestions')
      .update({ status: 'declined' })
      .eq('seeker_id', req.user.id)
      .eq('suggested_user_id', req.params.userId);
    res.json({ message: 'Declined' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// GROUPS
// ════════════════════════════════════════════════════════════════

// GET /api/housemate/groups/mine
router.get('/groups/mine', auth, async (req, res) => {
  try {
    const { data: memberships } = await supabase
      .from('housemate_group_members')
      .select('group_id')
      .eq('user_id', req.user.id);

    if (!memberships || memberships.length === 0) return res.json({ group: null });

    const groupId = memberships[0].group_id;
    const { data: group } = await supabase.from('housemate_groups').select('*').eq('id', groupId).single();
    if (!group) return res.json({ group: null });

    const { data: members } = await supabase
      .from('housemate_group_members')
      .select('user_id, joined_at, users!inner(id, name, id_photo_url, email, phone)')
      .eq('group_id', groupId);

    // Fetch owner info
    let ownerUser = null;
    if (group.owner_id) {
      const { data: ou } = await supabase.from('users').select('id, name, id_photo_url').eq('id', group.owner_id).single();
      ownerUser = ou;
    }

    // Fetch pending join requests (if current user is owner)
    let pendingRequests = [];
    if (group.owner_id === req.user.id) {
      const { data: reqs } = await supabase
        .from('housemate_group_requests')
        .select('*, users!inner(id, name, id_photo_url)')
        .eq('group_id', groupId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      pendingRequests = (reqs || []).map(r => ({
        id: r.id,
        user_id: r.users?.id,
        name: r.users?.name,
        photo: r.users?.id_photo_url,
        status: r.status,
        created_at: r.created_at,
      }));
    }

    // If group has a target listing, fetch it
    let listing = null;
    if (group.target_listing_id) {
      const { data: l } = await supabase.from('listings').select('*').eq('id', group.target_listing_id).single();
      listing = l;
    }

    // If group has applied, fetch application status
    let application = null;
    if (group.target_listing_id) {
      const { data: app } = await supabase.from('housemate_group_applications')
        .select('*').eq('group_id', groupId).single();
      application = app;
    }

    res.json({
      group: {
        ...group,
        owner: ownerUser,
        members: (members || []).map(m => ({ id: m.user_id, ...m.users, joined_at: m.joined_at })),
        pending_requests: pendingRequests,
        listing,
        application,
        is_full: members?.length >= (group.max_members || 2),
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/housemate/groups/:groupId/add
router.post('/groups/:groupId/add', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    const groupId = req.params.groupId;

    // Verify user is member of this group
    const { data: membership } = await supabase
      .from('housemate_group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', req.user.id)
      .single();
    if (!membership) return res.status(403).json({ error: 'Not a member of this group' });

    // Check group is still forming
    const { data: group } = await supabase.from('housemate_groups').select('status').eq('id', groupId).single();
    if (!group || group.status !== 'forming') return res.status(400).json({ error: 'Group is no longer forming' });

    // Check not already a member
    const { data: existing } = await supabase.from('housemate_group_members')
      .select('id').eq('group_id', groupId).eq('user_id', userId).single();
    if (existing) return res.status(409).json({ error: 'Already a member' });

    await supabase.from('housemate_group_members').insert({ group_id: groupId, user_id: userId });

    // Notify all members
    await notifyGroupMembers(groupId, 'New group member', `${req.user.name} added a new member to the group.`);

    // Notify the added user
    await supabase.from('notifications').insert([{
      user_id: userId, type: 'housemate_group',
      title: `You've been added to a housemate group`,
      body: `${req.user.name} added you to their group.`,
    }]);

    res.json({ message: 'Member added' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/housemate/groups/create — create a named group (group-first flow)
router.post('/groups/create', auth, async (req, res) => {
  try {
    const { name, max_members } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Group name is required' });
    const max = parseInt(max_members) || 2;
    if (max < 2 || max > 4) return res.status(400).json({ error: 'max_members must be 2–4' });

    // Check subscription limit: max owned groups
    const planStr = req.user.subscription_plan || '';
    const planParts = planStr.split('_');
    const planTier = planParts.length === 2 ? planParts[1] : 'basic';
    const maxGroups = getMaxGroups(req.user.role, planTier);
    if (maxGroups < 1) return res.status(403).json({ error: 'Your plan does not allow creating groups. Upgrade to Standard or Premium.' });
    const { count: ownedCount } = await supabase
      .from('housemate_groups')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', req.user.id);
    if (ownedCount >= maxGroups) return res.status(403).json({ error: `You can only own ${maxGroups} group(s) on your plan. Upgrade to create more.` });

    // Check user doesn't already belong to a forming group
    const { data: existingMember } = await supabase
      .from('housemate_group_members')
      .select('group_id')
      .eq('user_id', req.user.id);
    if (existingMember && existingMember.length > 0) {
      const { data: existingGroup } = await supabase
        .from('housemate_groups')
        .select('id, status')
        .eq('id', existingMember[0].group_id)
        .single();
      if (existingGroup && existingGroup.status === 'forming') {
        return res.status(400).json({ error: 'You already belong to a forming group' });
      }
    }

    // Create group
    const { data: group, error } = await supabase
      .from('housemate_groups')
      .insert({ name: name.trim(), max_members: max, owner_id: req.user.id, status: 'forming' })
      .select()
      .single();
    if (error) throw error;

    // Add creator as first member
    await supabase.from('housemate_group_members').insert({ group_id: group.id, user_id: req.user.id });

    res.status(201).json({ group });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/housemate/groups/public — list groups with available spots
router.get('/groups/public', auth, async (req, res) => {
  try {
    // Get all forming groups
    const { data: groups } = await supabase
      .from('housemate_groups')
      .select('*')
      .eq('status', 'forming')
      .order('created_at', { ascending: false });

    if (!groups || groups.length === 0) return res.json({ groups: [] });

    // Get current user's intake for compatibility scoring
    const { data: myIntake } = await supabase
      .from('housemate_intake')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    // For each group, count members and get owner info + intake
    const enriched = [];
    for (const g of groups) {
      // Skip groups without an owner (old groups pre-migration)
      if (!g.owner_id) continue;

      const { count: memberCount } = await supabase
        .from('housemate_group_members')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', g.id);

      // Skip groups with no spots
      if (memberCount >= (g.max_members || 2)) continue;

      // Get owner info
      const { data: owner } = await supabase
        .from('users')
        .select('id, name, id_photo_url')
        .eq('id', g.owner_id)
        .single();

      if (!owner) continue;

      // Skip groups owned by or containing the current user
      if (owner.id === req.user.id) continue;

      const { data: membership } = await supabase
        .from('housemate_group_members')
        .select('id')
        .eq('group_id', g.id)
        .eq('user_id', req.user.id)
        .single();
      if (membership) continue;

      // Get owner's full intake for compatibility + display
      const { data: intake } = await supabase
        .from('housemate_intake')
        .select('*')
        .eq('user_id', owner.id)
        .single();

      // Compute compatibility percentage
      let compatibility_pct = null;
      if (myIntake && intake) {
        compatibility_pct = computeCompatibility(myIntake, intake);
      }

      // Check if current user already has a pending request for this group
      const { data: existingReq } = await supabase
        .from('housemate_group_requests')
        .select('id, status')
        .eq('group_id', g.id)
        .eq('requester_id', req.user.id)
        .single();

      enriched.push({
        id: g.id,
        name: g.name,
        owner: { id: owner.id, name: owner.name, photo: owner.id_photo_url },
        member_count: memberCount,
        max_members: g.max_members || 2,
        compatibility_pct,
        preferred_city: intake?.preferred_city || '',
        budget_min: intake?.budget_min || null,
        budget_max: intake?.budget_max || null,
        languages: intake?.languages || [],
        sociability: intake?.sociability || '',
        sleep_schedule: intake?.sleep_schedule || '',
        cleanliness: intake?.cleanliness || '',
        smoking: intake?.smoking || '',
        guests_habit: intake?.guests_habit || '',
        lifestyle_notes: intake?.lifestyle_notes || '',
        created_at: g.created_at,
        request_status: existingReq?.status || null,
        request_id: existingReq?.id || null,
      });
    }

    res.json({ groups: enriched });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/housemate/groups/request-join — request to join a group
router.post('/groups/request-join', auth, async (req, res) => {
  try {
    const { group_id } = req.body;
    if (!group_id) return res.status(400).json({ error: 'group_id required' });

    // Verify group exists, is forming, and has space
    const { data: group } = await supabase.from('housemate_groups').select('*').eq('id', group_id).single();
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.status !== 'forming') return res.status(400).json({ error: 'Group is no longer forming' });

    const { count: memberCount } = await supabase
      .from('housemate_group_members')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', group_id);
    if (memberCount >= (group.max_members || 2)) {
      return res.status(400).json({ error: 'Group is full' });
    }

    // Check not already a member
    const { data: existingMember } = await supabase
      .from('housemate_group_members')
      .select('id')
      .eq('group_id', group_id)
      .eq('user_id', req.user.id)
      .single();
    if (existingMember) return res.status(409).json({ error: 'Already a member of this group' });

    // Check for existing request
    const { data: existingReq } = await supabase
      .from('housemate_group_requests')
      .select('id, status')
      .eq('group_id', group_id)
      .eq('requester_id', req.user.id)
      .single();

    if (existingReq) {
      if (existingReq.status === 'pending') return res.status(409).json({ error: 'Join request already pending' });
      if (existingReq.status === 'accepted') return res.status(409).json({ error: 'Already a member' });
      // Rejected — allow requesting again (update the request)
      await supabase.from('housemate_group_requests')
        .update({ status: 'pending', created_at: new Date() })
        .eq('id', existingReq.id);
      return res.json({ message: 'Join request sent', request_id: existingReq.id });
    }

    // Check subscription limit: max group join requests
    const planStr = req.user.subscription_plan || '';
    const planParts = planStr.split('_');
    const planTier = planParts.length === 2 ? planParts[1] : 'basic';
    const maxGroupApplies = getMaxGroupApplies(req.user.role, planTier);
    const { count: requestCount } = await supabase
      .from('housemate_group_requests')
      .select('id', { count: 'exact', head: true })
      .eq('requester_id', req.user.id)
      .in('status', ['pending', 'accepted']);
    if (requestCount >= maxGroupApplies) return res.status(403).json({ error: `You can only apply to ${maxGroupApplies} group(s) on your plan. Upgrade to send more requests.` });

    // Create the join request
    const { data: request, error } = await supabase
      .from('housemate_group_requests')
      .insert({ group_id, requester_id: req.user.id, status: 'pending' })
      .select()
      .single();
    if (error) throw error;

    // Notify the group owner
    if (group.owner_id) {
      await supabase.from('notifications').insert([{
        user_id: group.owner_id,
        type: 'housemate_group',
        title: `${req.user.name} wants to join your group!`,
        body: `They want to join "${group.name}". Review their request in your group page.`,
      }]);
    }

    res.status(201).json({ request });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/housemate/groups/:groupId/requests — get pending requests (owner only)
router.get('/groups/:groupId/requests', auth, async (req, res) => {
  try {
    const groupId = req.params.groupId;

    // Verify user is the owner
    const { data: group } = await supabase.from('housemate_groups').select('owner_id').eq('id', groupId).single();
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.owner_id !== req.user.id) return res.status(403).json({ error: 'Only the group owner can view requests' });

    const { data: requests } = await supabase
      .from('housemate_group_requests')
      .select('*, users!inner(id, name, id_photo_url)')
      .eq('group_id', groupId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    res.json({
      requests: (requests || []).map(r => ({
        id: r.id,
        user_id: r.users?.id,
        name: r.users?.name,
        photo: r.users?.id_photo_url,
        status: r.status,
        created_at: r.created_at,
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/housemate/groups/:groupId/members — list members of a group (for providers)
router.get('/groups/:groupId/members', auth, async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const { data: members } = await supabase
      .from('housemate_group_members')
      .select('user_id, joined_at, users!inner(id, name, id_photo_url)')
      .eq('group_id', groupId);
    res.json({
      members: (members || []).map(m => ({
        id: m.users?.id,
        name: m.users?.name,
        photo: m.users?.id_photo_url,
        joined_at: m.joined_at,
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/housemate/groups/:groupId/handle-request — accept/reject a join request
router.put('/groups/:groupId/handle-request', auth, async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const { request_id, action } = req.body;
    if (!request_id || !['accept', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'request_id and action (accept|reject) required' });
    }

    // Verify user is the owner
    const { data: group } = await supabase.from('housemate_groups').select('*').eq('id', groupId).single();
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.owner_id !== req.user.id) return res.status(403).json({ error: 'Only the group owner can handle requests' });

    // Get the request
    const { data: joinReq } = await supabase
      .from('housemate_group_requests')
      .select('*')
      .eq('id', request_id)
      .eq('group_id', groupId)
      .eq('status', 'pending')
      .single();
    if (!joinReq) return res.status(404).json({ error: 'Pending request not found' });

    if (action === 'accept') {
      // Check group still has space
      const { count: memberCount } = await supabase
        .from('housemate_group_members')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', groupId);
      if (memberCount >= (group.max_members || 2)) {
        await supabase.from('housemate_group_requests')
          .update({ status: 'rejected' })
          .eq('id', request_id);
        return res.status(400).json({ error: 'Group is now full. Request auto-rejected.' });
      }

      // Accept request and add to members
      await supabase.from('housemate_group_requests').update({ status: 'accepted' }).eq('id', request_id);
      await supabase.from('housemate_group_members').insert({ group_id: groupId, user_id: joinReq.requester_id });

      // Notify the requester
      await supabase.from('notifications').insert([{
        user_id: joinReq.requester_id,
        type: 'housemate_group',
        title: `You're in "${group.name}"!`,
        body: `${req.user.name} accepted your request to join the group.`,
      }]);

      res.json({ message: 'Request accepted', user_id: joinReq.requester_id });
    } else {
      // Reject
      await supabase.from('housemate_group_requests').update({ status: 'rejected' }).eq('id', request_id);

      await supabase.from('notifications').insert([{
        user_id: joinReq.requester_id,
        type: 'housemate_group',
        title: `Join request declined`,
        body: `${req.user.name} declined your request to join "${group.name}".`,
      }]);

      res.json({ message: 'Request rejected' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// GROUP CHAT
// ════════════════════════════════════════════════════════════════

// GET /api/housemate/groups/:groupId/messages
router.get('/groups/:groupId/messages', auth, async (req, res) => {
  try {
    const groupId = req.params.groupId;

    // Verify user is a member
    const { data: membership } = await supabase
      .from('housemate_group_members')
      .select('id').eq('group_id', groupId).eq('user_id', req.user.id).single();
    if (!membership) return res.status(403).json({ error: 'Not a member of this group' });

    const { data: messages, error } = await supabase
      .from('housemate_group_messages')
      .select('*, users:sender_id(id, name)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });
    if (error) throw error;

    res.json({ messages: messages || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/housemate/groups/:groupId/messages
router.post('/groups/:groupId/messages', auth, async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Message content required' });

    // Verify user is a member
    const { data: membership } = await supabase
      .from('housemate_group_members')
      .select('id').eq('group_id', groupId).eq('user_id', req.user.id).single();
    if (!membership) return res.status(403).json({ error: 'Not a member of this group' });

    const { data: msg, error } = await supabase
      .from('housemate_group_messages')
      .insert([{ group_id: groupId, sender_id: req.user.id, content: content.trim() }])
      .select('*, users:sender_id(id, name)').single();
    if (error) throw error;

    // Notify other members
    const { data: members } = await supabase
      .from('housemate_group_members')
      .select('user_id').eq('group_id', groupId).neq('user_id', req.user.id);
    if (members) {
      const notifications = members.map(m => ({
        user_id: m.user_id, type: 'group_message',
        title: `New message in your group`,
        body: `${req.user.name}: ${content.length > 60 ? content.slice(0, 57) + '...' : content}`,
      }));
      await supabase.from('notifications').insert(notifications);
    }

    res.status(201).json({ message: msg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// MULTI-ROOM LISTINGS
// ════════════════════════════════════════════════════════════════

// GET /api/listings/multi-room (mounted under /api/housemate)
router.get('/multi-room', async (req, res) => {
  try {
    const { city, sort = 'newest', page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('listings')
      .select('*, users(name, verified)', { count: 'exact' })
      .eq('status', 'active')
      .in('property_type', ['Full Apartment', 'full_apartment', 'apartment', 'Apartment'])
      .gt('rooms_available', 1)
      .range(offset, offset + limit - 1);

    if (city) query = query.ilike('city', `%${city}%`);

    if (sort === 'price_asc') query = query.order('price', { ascending: true });
    else if (sort === 'price_desc') query = query.order('price', { ascending: false });
    else query = query.order('created_at', { ascending: false });

    const { data, count, error } = await query;
    if (error) throw error;

    // Compute open slot count per listing (pending group applications fill slots too)
    const listingIds = (data || []).map(l => l.id);
    let filledCounts = {};
    if (listingIds.length > 0) {
      // Count accepted individual applications per listing
      const { data: acceptedIndiv } = await supabase
        .from('applications')
        .select('listing_id')
        .in('listing_id', listingIds)
        .eq('status', 'accepted');
      if (acceptedIndiv) {
        acceptedIndiv.forEach(a => {
          filledCounts[a.listing_id] = (filledCounts[a.listing_id] || 0) + 1;
        });
      }
      // Count accepted group applications
      const { data: acceptedGroups } = await supabase
        .from('housemate_group_applications')
        .select('listing_id, group_id')
        .in('listing_id', listingIds)
        .eq('status', 'accepted');
      if (acceptedGroups) {
        for (const ga of acceptedGroups) {
          const { count: memberCount } = await supabase
            .from('housemate_group_members')
            .select('id', { count: 'exact', head: true })
            .eq('group_id', ga.group_id);
          filledCounts[ga.listing_id] = (filledCounts[ga.listing_id] || 0) + (memberCount || 0);
        }
      }
    }

    const listings = (data || []).map(l => ({
      ...l,
      open_slots: Math.max(0, (l.rooms_available || 1) - (filledCounts[l.id] || 0)),
    }));

    res.json({ listings, total: count, page: Number(page), pages: Math.ceil((count || 0) / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// GROUP APPLICATION
// ════════════════════════════════════════════════════════════════

// POST /api/housemate/groups/:groupId/apply
router.post('/groups/:groupId/apply', auth, async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const { listing_id } = req.body;

    // Verify user is a member
    const { data: membership } = await supabase
      .from('housemate_group_members')
      .select('id').eq('group_id', groupId).eq('user_id', req.user.id).single();
    if (!membership) return res.status(403).json({ error: 'Not a member of this group' });

    // Verify group is forming
    const { data: group } = await supabase.from('housemate_groups').select('*').eq('id', groupId).single();
    if (!group || group.status !== 'forming') return res.status(400).json({ error: 'Group is no longer forming' });

    // Verify listing exists and has room
    const { data: listing } = await supabase.from('listings').select('*').eq('id', listing_id).single();
    if (!listing || listing.status !== 'active') return res.status(404).json({ error: 'Listing not available' });

    // Count current group members
    const { count: memberCount } = await supabase
      .from('housemate_group_members')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', groupId);

    if (memberCount > (listing.rooms_available || 1)) {
      return res.status(400).json({ error: `Group too large. Listing has ${listing.rooms_available} rooms available.` });
    }

    // Create the group application
    const { data: app, error } = await supabase
      .from('housemate_group_applications')
      .insert([{ group_id: groupId, listing_id, status: 'pending' }])
      .select().single();
    if (error) throw error;

    // Update group status
    await supabase.from('housemate_groups').update({ status: 'applying', target_listing_id: listing_id }).eq('id', groupId);

    // Notify all members
    await notifyGroupMembers(groupId, 'Application submitted',
      `Your group applied to ${listing.title}. Waiting for the provider's response.`);

    // Notify provider
    await supabase.from('notifications').insert([{
      user_id: listing.provider_id, type: 'housemate_group',
      title: `New group application received`,
      body: `A group of ${memberCount} seekers applied to ${listing.title}.`,
    }]);

    res.status(201).json({ application: app });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/housemate/group-applications — list pending group apps for provider's listings
router.get('/group-applications', auth, requireRole('provider'), async (req, res) => {
  try {
    // Get provider's listings
    const { data: listings } = await supabase
      .from('listings')
      .select('id, title')
      .eq('provider_id', req.user.id);

    if (!listings || listings.length === 0) return res.json({ applications: [] });

    const listingIds = listings.map(l => l.id);
    const listingMap = {};
    listings.forEach(l => { listingMap[l.id] = l.title; });

    const { data: apps, error } = await supabase
      .from('housemate_group_applications')
      .select('*, housemate_groups!inner(id, status)')
      .in('listing_id', listingIds)
      .in('status', ['pending', 'interview', 'accepted'])
      .order('applied_at', { ascending: false });

    if (error) throw error;

    // Enrich with member counts
    const enriched = await Promise.all((apps || []).map(async (app) => {
      const { count } = await supabase
        .from('housemate_group_members')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', app.housemate_groups.id);
      return {
        ...app,
        listing_title: listingMap[app.listing_id] || 'Unknown',
        member_count: count || 0,
      };
    }));

    res.json({ applications: enriched });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/housemate/group-applications/:id/status
router.put('/group-applications/:id/status', auth, requireRole('provider'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['accepted', 'rejected'].includes(status)) return res.status(400).json({ error: 'Status must be accepted or rejected' });

    // Get the application with group + listing info
    const { data: app } = await supabase
      .from('housemate_group_applications')
      .select('*, housemate_groups!inner(id, target_listing_id), listings!inner(id, title, provider_id, rooms_available)')
      .eq('id', req.params.id)
      .single();
    if (!app) return res.status(404).json({ error: 'Application not found' });
    if (app.listings.provider_id !== req.user.id) return res.status(403).json({ error: 'Not your listing' });
    if (app.status !== 'pending') return res.status(409).json({ error: 'Application already decided' });

    const groupId = app.housemate_groups.id;
    const listingId = app.listings.id;

    // Get all members
    const { data: members } = await supabase
      .from('housemate_group_members')
      .select('user_id')
      .eq('group_id', groupId);

    await supabase.from('housemate_group_applications')
      .update({ status, decided_at: new Date() })
      .eq('id', req.params.id);

    if (status === 'accepted') {
      // Mark listing as filled
      await supabase.from('listings').update({ status: 'filled' }).eq('id', listingId);

      // Update group status
      await supabase.from('housemate_groups').update({ status: 'accepted' }).eq('id', groupId);

      // Reveal provider contact to all group members
      const provider = await supabase.from('users').select('name, email, phone').eq('id', req.user.id).single();

      await notifyGroupMembers(groupId, '🏠 Group accepted!',
        `Your group was accepted to ${app.listings.title}! Contact ${provider.data?.name} at ${provider.data?.email || provider.data?.phone || 'via app'}.`);

      // Notify group owner that messaging is available with provider
      const ownerId = app.housemate_groups.owner_id;
      await supabase.from('notifications').insert([{
        user_id: ownerId,
        type: 'message',
        title: 'Chat with provider',
        body: `You can now message ${provider.data?.name} about ${app.listings.title} in Messages.`,
      }]);

      // Reject other pending applications for this listing
      await supabase.from('housemate_group_applications')
        .update({ status: 'rejected', decided_at: new Date() })
        .eq('listing_id', listingId)
        .eq('status', 'pending')
        .neq('id', req.params.id);

      await supabase.from('applications')
        .update({ status: 'rejected' })
        .eq('listing_id', listingId)
        .eq('status', 'pending');
    } else {
      // Rejected
      await supabase.from('housemate_groups').update({ status: 'forming' }).eq('id', groupId);
      await notifyGroupMembers(groupId, 'Application not accepted',
        `Your group's application to ${app.listings.title} was not accepted. You can apply elsewhere.`);
    }

    res.json({ message: `Group application ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/housemate/group-applications/:id/interview
router.post('/group-applications/:id/interview', auth, requireRole('provider'), async (req, res) => {
  try {
    const { scheduled_at } = req.body;
    if (!scheduled_at) return res.status(400).json({ error: 'scheduled_at is required' });

    // Verify provider owns this application's listing
    const { data: app } = await supabase
      .from('housemate_group_applications')
      .select('*, housemate_groups!inner(id, owner_id), listings!inner(id, title, provider_id)')
      .eq('id', req.params.id)
      .single();
    if (!app) return res.status(404).json({ error: 'Application not found' });
    if (app.listings.provider_id !== req.user.id) return res.status(403).json({ error: 'Not your listing' });
    if (app.status !== 'pending') return res.status(409).json({ error: 'Application already decided' });

    await supabase.from('housemate_group_applications')
      .update({ status: 'interview', interview_at: scheduled_at })
      .eq('id', req.params.id);

    // Notify group owner
    const ownerId = app.housemate_groups.owner_id;
    await supabase.from('notifications').insert([{
      user_id: ownerId,
      type: 'interview',
      title: `Interview Scheduled — "${app.listings.title}"`,
      body: `Your group has an interview on ${new Date(scheduled_at).toLocaleString()}`,
    }]);

    // Notify other group members
    await notifyGroupMembers(app.housemate_groups.id, 'Interview Scheduled',
      `Your group has an interview for ${app.listings.title} on ${new Date(scheduled_at).toLocaleString()}.`);

    // Notify owner that messaging is available
    await supabase.from('notifications').insert([{
      user_id: ownerId,
      type: 'message',
      title: 'Chat with provider',
      body: `You can now message the provider about ${app.listings.title} in Messages.`,
    }]);

    res.json({ message: 'Interview scheduled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
