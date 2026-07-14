const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');
const { auth } = require('../middleware/auth');

// ── Helper: fetch group application conversations for a user ──
async function getGroupConversations(userId) {
  // Find group applications where user is the group owner or the listing provider
  // and status is 'accepted' or 'interview'

  // As group owner (via housemate_groups.owner_id)
  const { data: asOwner } = await supabase
    .from('housemate_group_applications')
    .select('*, housemate_groups!inner(id, owner_id), listings!inner(id, title, provider_id)')
    .in('status', ['accepted', 'interview'])
    .order('applied_at', { ascending: false });

  const relevant = (asOwner || []).filter(app => {
    const isOwner = app.housemate_groups?.owner_id === userId;
    const isProvider = app.listings?.provider_id === userId;
    return isOwner || isProvider;
  });

  if (relevant.length === 0) return [];

  const conversations = await Promise.all(relevant.map(async (app) => {
    const isOwner = userId === app.housemate_groups?.owner_id;
    const otherUserId = isOwner ? app.listings?.provider_id : app.housemate_groups?.owner_id;

    const { data: otherUser } = await supabase
      .from('users')
      .select('name, phone')
      .eq('id', otherUserId)
      .single();

    // Latest message
    const { data: lastMsg } = await supabase
      .from('messages')
      .select('content, created_at')
      .eq('group_application_id', app.id)
      .order('created_at', { ascending: false })
      .limit(1);

    const { data: unreadCount } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .eq('group_application_id', app.id)
      .eq('read', false)
      .neq('sender_id', userId);

    // All messages
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('group_application_id', app.id)
      .order('created_at', { ascending: true });

    return {
      id: app.id,
      group_application_id: app.id,
      other_user_id: otherUserId,
      other_user: { name: otherUser?.name || 'Group Owner', phone: otherUser?.phone || '' },
      other_name: otherUser?.name || 'Group Owner',
      listing_title: app.listings?.title || 'Room',
      listing: { title: app.listings?.title || 'Room' },
      last_message: lastMsg?.[0]?.content || '',
      last_message_at: lastMsg?.[0]?.created_at || null,
      unread: unreadCount?.length || 0,
      messages: (msgs || []).map(m => ({
        id: m.id,
        sender_id: m.sender_id,
        from: m.sender_id === userId ? 'me' : 'other',
        sender: m.sender_id === userId ? 'me' : 'other',
        text: m.content,
        content: m.content,
        time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        created_at: m.created_at,
      })),
      _isGroupConv: true,
    };
  }));

  return conversations;
}

// ── Helper: verify user is part of a group application ──
async function verifyGroupAppAccess(groupApplicationId, userId) {
  const { data: app } = await supabase
    .from('housemate_group_applications')
    .select('*, housemate_groups!inner(id, owner_id), listings!inner(id, title, provider_id)')
    .eq('id', groupApplicationId)
    .single();
  if (!app) return null;
  if (app.status !== 'accepted' && app.status !== 'interview') return null;
  const isParty = app.housemate_groups?.owner_id === userId || app.listings?.provider_id === userId;
  if (!isParty) return null;
  return app;
}

// GET /api/messages  — list all conversation threads for current user
router.get('/', auth, async (req, res) => {
  try {
    // ── Regular application conversations (existing) ──
    const { data: asSeeker } = await supabase
      .from('applications')
      .select('id, status, listing_id, seeker_id')
      .eq('seeker_id', req.user.id)
      .in('status', ['accepted', 'interview'])
      .order('updated_at', { ascending: false });

    const { data: asProvider } = await supabase
      .from('applications')
      .select('id, status, listing_id, seeker_id')
      .in('status', ['accepted', 'interview'])
      .order('updated_at', { ascending: false });

    const providerAppIds = (asProvider || []).map(a => a.id);
    let providerFiltered = [];
    if (providerAppIds.length > 0) {
      const { data: listings } = await supabase
        .from('listings')
        .select('id')
        .eq('provider_id', req.user.id)
        .in('id', (asProvider || []).map(a => a.listing_id));

      const ownedListingIds = new Set((listings || []).map(l => l.id));
      providerFiltered = (asProvider || []).filter(a => ownedListingIds.has(a.listing_id));
    }

    const apps = [...(asSeeker || []), ...providerFiltered];

    const conversations = await Promise.all(apps.map(async (app) => {
      const isSeeker = req.user.id === app.seeker_id;
      const otherId = isSeeker ? null : app.seeker_id;

      const { data: listing } = await supabase
        .from('listings')
        .select('title, provider_id')
        .eq('id', app.listing_id)
        .single();

      const otherUserId = isSeeker ? listing?.provider_id : app.seeker_id;
      const { data: otherUser } = await supabase
        .from('users')
        .select('name, phone')
        .eq('id', otherUserId)
        .single();

      const { data: lastMsg } = await supabase
        .from('messages')
        .select('content, created_at')
        .eq('application_id', app.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const { data: unreadCount } = await supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .eq('application_id', app.id)
        .eq('read', false)
        .neq('sender_id', req.user.id);

      return {
        id: app.id,
        application_id: app.id,
        other_user_id: otherUserId,
        other_user: { name: otherUser?.name || 'User', phone: otherUser?.phone || '' },
        other_name: otherUser?.name || 'User',
        listing_title: listing?.title || 'Room',
        listing: { title: listing?.title || 'Room' },
        last_message: lastMsg?.[0]?.content || '',
        last_message_at: lastMsg?.[0]?.created_at || null,
        unread: unreadCount?.length || 0,
      };
    }));

    // Fetch messages for each regular conversation
    const result = await Promise.all(conversations.map(async (conv) => {
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('application_id', conv.id)
        .order('created_at', { ascending: true });

      return {
        ...conv,
        messages: (msgs || []).map(m => ({
          id: m.id,
          sender_id: m.sender_id,
          from: m.sender_id === req.user.id ? 'me' : 'other',
          sender: m.sender_id === req.user.id ? 'me' : 'other',
          text: m.content,
          content: m.content,
          time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          created_at: m.created_at,
        })),
      };
    }));

    // ── Group application conversations ──
    const groupConvs = await getGroupConversations(req.user.id);

    // Merge and sort by last message time
    const all = [...result, ...groupConvs].sort((a, b) => {
      const ta = a.last_message_at || a.messages?.[a.messages.length - 1]?.created_at || '';
      const tb = b.last_message_at || b.messages?.[b.messages.length - 1]?.created_at || '';
      return tb.localeCompare(ta);
    });

    res.json({ conversations: all, threads: all });
  } catch (err) {
    console.error('Messages list error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/messages/:applicationId
router.get('/:applicationId', auth, async (req, res) => {
  try {
    // Try regular application first
    const { data: app } = await supabase.from('applications')
      .select('seeker_id, listing_id, status')
      .eq('id', req.params.applicationId).single();

    if (app) {
      if (app.status !== 'accepted' && app.status !== 'interview') {
        return res.status(403).json({ error: 'Messaging only available after interview or acceptance' });
      }
      const { data: listing } = await supabase.from('listings')
        .select('provider_id')
        .eq('id', app.listing_id)
        .single();
      const isParty = req.user.id === app.seeker_id || req.user.id === listing?.provider_id;
      if (!isParty) return res.status(403).json({ error: 'Forbidden' });

      const { data: messages, error } = await supabase
        .from('messages')
        .select('*, users:sender_id(name)')
        .eq('application_id', req.params.applicationId)
        .order('created_at', { ascending: true });
      if (error) throw error;

      await supabase.from('messages')
        .update({ read: true })
        .eq('application_id', req.params.applicationId)
        .neq('sender_id', req.user.id);

      return res.json({ messages });
    }

    // Try group application
    const groupApp = await verifyGroupAppAccess(req.params.applicationId, req.user.id);
    if (!groupApp) return res.status(404).json({ error: 'Conversation not found' });

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*, users:sender_id(name)')
      .eq('group_application_id', req.params.applicationId)
      .order('created_at', { ascending: true });
    if (error) throw error;

    await supabase.from('messages')
      .update({ read: true })
      .eq('group_application_id', req.params.applicationId)
      .neq('sender_id', req.user.id);

    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/messages/:applicationId
router.post('/:applicationId', auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Message content required' });

    // Try regular application first
    const { data: app } = await supabase.from('applications')
      .select('seeker_id, listing_id, status')
      .eq('id', req.params.applicationId).single();

    if (app) {
      if (app.status !== 'accepted' && app.status !== 'interview') {
        return res.status(403).json({ error: 'Messaging only after interview or acceptance' });
      }
      const { data: listing } = await supabase.from('listings')
        .select('provider_id')
        .eq('id', app.listing_id)
        .single();
      const isParty = req.user.id === app.seeker_id || req.user.id === listing?.provider_id;
      if (!isParty) return res.status(403).json({ error: 'Forbidden' });

      const receiverId = req.user.id === app.seeker_id ? listing?.provider_id : app.seeker_id;

      const { data: msg, error } = await supabase.from('messages').insert([{
        application_id: req.params.applicationId,
        sender_id: req.user.id,
        receiver_id: receiverId,
        content: content.trim(),
        read: false,
      }]).select('*, users:sender_id(name)').single();
      if (error) throw error;

      await supabase.from('notifications').insert([{
        user_id: receiverId,
        type: 'message',
        title: `New message from ${req.user.name}`,
        body: content.length > 60 ? content.slice(0, 57) + '...' : content,
      }]);

      return res.status(201).json({ message: msg });
    }

    // Try group application
    const groupApp = await verifyGroupAppAccess(req.params.applicationId, req.user.id);
    if (!groupApp) return res.status(404).json({ error: 'Conversation not found' });

    const isOwner = req.user.id === groupApp.housemate_groups?.owner_id;
    const receiverId = isOwner ? groupApp.listings?.provider_id : groupApp.housemate_groups?.owner_id;

    const { data: msg, error } = await supabase.from('messages').insert([{
      group_application_id: req.params.applicationId,
      sender_id: req.user.id,
      receiver_id: receiverId,
      content: content.trim(),
      read: false,
    }]).select('*, users:sender_id(name)').single();
    if (error) throw error;

    await supabase.from('notifications').insert([{
      user_id: receiverId,
      type: 'message',
      title: `New message from ${req.user.name}`,
      body: content.length > 60 ? content.slice(0, 57) + '...' : content,
    }]);

    res.status(201).json({ message: msg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
