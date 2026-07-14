const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');
const { sendEmail, T } = require('../services/email');
const { auth } = require('../middleware/auth');
const PDFDocument = require('pdfkit');

// ═════════════════════════════════════════════════════════════════════
// GROUP AGREEMENT ROUTES (must be before parameterized :applicationId routes)
// ═════════════════════════════════════════════════════════════════════

// POST /api/agreements/group/:groupApplicationId/initiate
router.post('/group/:groupApplicationId/initiate', auth, async (req, res) => {
  try {
    const { gateway } = req.body;
    if (!['telebirr', 'cbe', 'dashen', 'awash'].includes(gateway)) {
      return res.status(400).json({ error: 'Invalid gateway' });
    }

    const { data: app } = await supabase
      .from('housemate_group_applications')
      .select('*, housemate_groups!inner(id, owner_id), listings!inner(id, title, price, provider_id, city, subcity, neighborhood, house_rules, lease_duration, users:provider_id(name, email, phone))')
      .eq('id', req.params.groupApplicationId).single();

    if (!app || app.status !== 'accepted') return res.status(400).json({ error: 'Group must be accepted first' });
    if (app.listings.provider_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the room provider can pay the agreement fee' });
    }

    const listingPrice = Number(app.listings.price) || 0;
    const amount = Math.round(listingPrice * 0.1);
    if (amount <= 0) return res.status(400).json({ error: 'Invalid listing price' });

    // Check not already paid
    const { data: existing } = await supabase.from('agreements')
      .select('id, paid').eq('group_application_id', req.params.groupApplicationId).single();

    if (existing?.paid) return res.status(409).json({ error: 'Agreement fee already paid' });

    const provider = app.listings.users || {};

    // Get all group members
    const { data: members } = await supabase
      .from('housemate_group_members')
      .select('user_id')
      .eq('group_id', app.housemate_groups.id);

    // Create or update agreement
    const agreementData = {
      group_application_id: req.params.groupApplicationId,
      group_id: app.housemate_groups.id,
      listing_id: app.listing_id,
      provider_id: app.listings.provider_id,
      gateway,
      status: 'pending',
      amount,
      generated_text: generateGroupAgreementText(app, members || [], provider),
    };

    let agreement;
    if (existing) {
      const { data, error: updErr } = await supabase.from('agreements').update(agreementData).eq('id', existing.id).select().single();
      if (updErr) return res.status(500).json({ error: updErr.message });
      agreement = data;
    } else {
      const { data, error: insErr } = await supabase.from('agreements').insert([agreementData]).select().single();
      if (insErr) return res.status(500).json({ error: insErr.message });
      agreement = data;
    }

    if (!agreement) return res.status(500).json({ error: 'Failed to create agreement - no data returned' });

    const reference = `GAG-${agreement.id.slice(0, 8).toUpperCase()}`;

    res.json({
      message: 'Group agreement payment initiated',
      agreement_id: agreement.id,
      reference, amount,
      listing_price: listingPrice,
      percentage: 10,
      gateway,
      provider_name: provider.name || '',
      listing_title: app.listings.title || '',
      member_count: (members || []).length + 1,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agreements/group/:groupApplicationId/confirm
router.post('/group/:groupApplicationId/confirm', auth, async (req, res) => {
  try {
    const { data: agreement } = await supabase.from('agreements')
      .select('*, housemate_group_applications!inner(listings!inner(provider_id))')
      .eq('group_application_id', req.params.groupApplicationId).single();

    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
    if (agreement.housemate_group_applications.listings.provider_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the provider can confirm' });
    }
    if (agreement.paid) return res.status(409).json({ error: 'Already confirmed' });

    const { data: updated, error } = await supabase.from('agreements').update({
      paid: true, paid_at: new Date(), status: 'paid',
    }).eq('id', agreement.id).select().single();

    if (error) throw error;
    res.json({ message: 'Payment confirmed', agreement: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agreements/group/:groupApplicationId
router.get('/group/:groupApplicationId', auth, async (req, res) => {
  try {
    const { data: agreement } = await supabase.from('agreements')
      .select('*, housemate_group_applications!inner(*, housemate_groups!inner(id, owner_id), listings!inner(id, title, city, price, house_rules, lease_duration, provider_id, users:provider_id(name, phone, email)))')
      .eq('group_application_id', req.params.groupApplicationId).single();

    // If no agreement yet, return group application info so frontend can show step 1
    if (!agreement) {
      const { data: app } = await supabase.from('housemate_group_applications')
        .select('*, housemate_groups!inner(id, owner_id), listings!inner(id, title, city, price, house_rules, lease_duration, provider_id, users:provider_id(name, phone, email))')
        .eq('id', req.params.groupApplicationId).single();
      if (!app) return res.status(404).json({ error: 'Group application not found' });
      const { data: members } = await supabase
        .from('housemate_group_members')
        .select('*, users(name, email)')
        .eq('group_id', app.housemate_groups.id);
      return res.json({
        agreement: null,
        group_application: app,
        members: members || [],
        provider_signed: false,
      });
    }

    // Get all group members with signature status
    const groupId = agreement.housemate_group_applications.housemate_groups?.id || agreement.group_id;
    const { data: members } = await supabase
      .from('housemate_group_members')
      .select('*, users(name, email)')
      .eq('group_id', groupId);

    const { data: signatures } = await supabase
      .from('group_agreement_signatures')
      .select('*')
      .eq('agreement_id', agreement.id);

    const signedUserIds = new Set((signatures || []).map(s => s.user_id));

    const enrichedMembers = (members || []).map(m => ({
      ...m,
      signed: signedUserIds.has(m.user_id),
      signed_at: (signatures || []).find(s => s.user_id === m.user_id)?.signed_at || null,
    }));

    // Check if provider signed
    const providerSigned = signedUserIds.has(agreement.provider_id);

    res.json({ agreement, members: enrichedMembers, provider_signed: providerSigned });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agreements/group/:groupApplicationId/sign
router.post('/group/:groupApplicationId/sign', auth, async (req, res) => {
  try {
    const { data: agreement } = await supabase.from('agreements')
      .select('*, housemate_group_applications!inner(*, housemate_groups!inner(id, owner_id), listings!inner(provider_id))')
      .eq('group_application_id', req.params.groupApplicationId).single();

    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
    if (!agreement.paid) return res.status(402).json({ error: 'Pay agreement fee first' });

    const gApp = agreement.housemate_group_applications;
    const groupId = gApp.housemate_groups?.id || agreement.group_id;
    const isProvider = gApp.listings.provider_id === req.user.id;
    const isOwner = gApp.housemate_groups?.owner_id === req.user.id;
    const isMember = await supabase.from('housemate_group_members')
      .select('id').eq('group_id', groupId).eq('user_id', req.user.id).maybeSingle()
      .then(r => !!r.data);

    if (!isProvider && !isOwner && !isMember) {
      return res.status(403).json({ error: 'Not authorized to sign' });
    }

    // Check duplicate
    const { data: existingSig } = await supabase.from('group_agreement_signatures')
      .select('id').eq('agreement_id', agreement.id).eq('user_id', req.user.id).maybeSingle();
    if (existingSig) return res.status(409).json({ error: 'Already signed' });

    await supabase.from('group_agreement_signatures').insert([{
      agreement_id: agreement.id,
      user_id: req.user.id,
    }]);

    // Notify others
    const { data: members } = await supabase
      .from('housemate_group_members')
      .select('user_id')
      .eq('group_id', groupId);

    const notifyIds = [gApp.listings.provider_id, ...(members || []).map(m => m.user_id)]
      .filter(id => id !== req.user.id);

    const uniqueIds = [...new Set(notifyIds)];
    const notifications = uniqueIds.map(id => ({
      user_id: id,
      type: 'agreement',
      title: `${req.user.name} signed the group agreement`,
      body: `One more signature needed for ${gApp.listings?.title || 'the agreement'}.`,
    }));
    if (notifications.length > 0) await supabase.from('notifications').insert(notifications);

    res.json({ message: 'Signed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agreements/group/:groupApplicationId/upload
router.post('/group/:groupApplicationId/upload', auth, async (req, res) => {
  try {
    const { file_url, file_name } = req.body;

    const { data: agreement } = await supabase.from('agreements')
      .select('*').eq('group_application_id', req.params.groupApplicationId).single();

    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
    if (!agreement.paid) return res.status(402).json({ error: 'Pay agreement fee first' });

    const { data: updated, error } = await supabase.from('agreements').update({
      signed_file_url: file_url,
      signed_file_name: file_name,
      status: 'signed',
      signed_at: new Date(),
    }).eq('id', agreement.id).select().single();

    if (error) throw error;

    // Get group application and notify all parties
    const { data: gApp } = await supabase
      .from('housemate_group_applications')
      .select('*, housemate_groups!inner(id, owner_id), listings!inner(title, provider_id, users:provider_id(name, email))')
      .eq('id', req.params.groupApplicationId)
      .single();

    if (gApp) {
      const { data: members } = await supabase
        .from('housemate_group_members')
        .select('user_id')
        .eq('group_id', gApp.housemate_groups.id);

      const notifyIds = [gApp.listings.provider_id, gApp.housemate_groups.owner_id, ...(members || []).map(m => m.user_id)];
      const uniqueIds = [...new Set(notifyIds)];
      const notifications = uniqueIds.map(id => ({
        user_id: id,
        type: 'agreement',
        title: 'Group Agreement Signed',
        body: `The group agreement for "${gApp.listings.title}" has been submitted.`,
      }));
      await supabase.from('notifications').insert(notifications);
    }

    res.json({ message: 'Signed agreement uploaded', agreement: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agreements/group/:groupApplicationId/pdf
router.get('/group/:groupApplicationId/pdf', auth, async (req, res) => {
  try {
    const { data: agreement } = await supabase.from('agreements')
      .select('*, housemate_group_applications!inner(*, housemate_groups!inner(id, owner_id), listings!inner(title, price, city, subcity, neighborhood, house_rules, lease_duration, users:provider_id(name, phone, email)))')
      .eq('group_application_id', req.params.groupApplicationId).single();

    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
    if (!agreement.paid) return res.status(402).json({ error: 'Pay agreement fee first' });

    const gApp = agreement.housemate_group_applications;
    const listing = gApp?.listings || {};
    const provider = listing.users || {};

    // Get all members
    const groupId = gApp.housemate_groups?.id || agreement.group_id;
    const { data: members } = await supabase
      .from('housemate_group_members')
      .select('*, users(name, email)')
      .eq('group_id', groupId);

    // Get signatures
    const { data: signatures } = await supabase
      .from('group_agreement_signatures')
      .select('*')
      .eq('agreement_id', agreement.id);

    const signedUserIds = new Set((signatures || []).map(s => s.user_id));

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Debale_Group_Agreement_${req.params.groupApplicationId.slice(0, 8)}.pdf"`);
    doc.pipe(res);

    doc.fontSize(22).font('Helvetica-Bold').text('GROUP HOUSEMATE AGREEMENT', { align: 'center' });
    doc.fontSize(11).font('Helvetica').fillColor('#666')
      .text('Powered by Debale Platform', { align: 'center' })
      .moveDown(2);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').stroke().moveDown(1.5);

    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000').text('PARTIES');
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica').fillColor('#333');
    doc.text(`Room Provider: ${provider.name || '—'}`);
    doc.text(`Phone: ${provider.phone || '—'}`);
    doc.text(`Email: ${provider.email || '—'}`);
    doc.moveDown(0.5);
    doc.text('Room Seekers (Group):');
    (members || []).forEach((m, i) => {
      doc.text(`  ${i + 1}. ${m.users?.name || 'Member'} (${m.users?.email || '—'})`);
    });
    doc.moveDown(1.5);

    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000').text('PROPERTY DETAILS');
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica').fillColor('#333');
    doc.text(`Property: ${listing.title || '—'}`);
    doc.text(`Location: ${[listing.city, listing.subcity, listing.neighborhood].filter(Boolean).join(', ') || '—'}`);
    doc.text(`Monthly Rent: ${listing.price ? `${Number(listing.price).toLocaleString()} ETB` : '—'}`);
    doc.text(`Lease Duration: ${listing.lease_duration || '3 months minimum'}`);
    doc.moveDown(1.5);

    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000').text('TERMS & CONDITIONS');
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica').fillColor('#333');
    const terms = [
      { title: '1. RENT PAYMENT', body: `All Room Seekers jointly agree to pay ${listing.price ? Number(listing.price).toLocaleString() : '—'} ETB monthly rent. Payment is due on the 1st of each month.` },
      { title: '2. SECURITY DEPOSIT', body: `A security deposit equivalent to one month's rent is required before move-in.` },
      { title: '3. LEASE DURATION', body: `The minimum lease period is ${listing.lease_duration || '3 months'}. 30 days written notice required.` },
      { title: '4. HOUSE RULES', body: listing.house_rules || 'Standard house rules apply.' },
      { title: '5. JOINT RESPONSIBILITY', body: 'All Room Seekers are jointly and severally responsible for rent payments and compliance with terms.' },
      { title: '6. UTILITIES', body: 'Shared equally among all Room Seekers.' },
    ];
    for (const t of terms) {
      if (doc.y > 650) doc.addPage();
      doc.font('Helvetica-Bold').fillColor('#000').text(t.title);
      doc.font('Helvetica').fillColor('#333').text(t.body);
      doc.moveDown(0.8);
    }

    if (doc.y > 600) doc.addPage();
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').stroke().moveDown(1.5);
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000').text('SIGNATURES');
    doc.moveDown(0.5);

    const now = new Date().toLocaleDateString('en-ET', { year: 'numeric', month: 'long', day: 'numeric' });

    doc.fontSize(11).font('Helvetica').fillColor('#333');
    const sigProvider = signedUserIds.has(agreement.provider_id) ? `✓ Signed (${now})` : '___________________________';
    doc.text(`Room Provider: ${sigProvider}`);
    doc.text(`  ${provider.name || 'Provider'}`).moveDown(0.8);

    (members || []).forEach((m) => {
      const memberName = m.users?.name || 'Member';
      const sig = signedUserIds.has(m.user_id) ? `✓ Signed (${now})` : '___________________________';
      doc.text(`Room Seeker (${memberName}): ${sig}`).moveDown(0.8);
    });

    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').stroke().moveDown(1);
    doc.fontSize(9).fillColor('#999').text('Generated by Debale Platform · debale.et', { align: 'center' });

    doc.end();

    // Store generated text
    if (!agreement.generated_text) {
      await supabase.from('agreements').update({
        generated_text: generateGroupAgreementText(gApp, members || [], provider),
      }).eq('id', agreement.id);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Helper: generate group agreement text ──
function generateGroupAgreementText(app, members, provider) {
  const listing = app.listings || {};
  const rent = listing.price ? `${Number(listing.price).toLocaleString()} ETB` : '—';
  const now = new Date().toLocaleDateString('en-ET', { year: 'numeric', month: 'long', day: 'numeric' });
  const memberNames = members.map((m, i) => `  ${i + 1}. ${m.users?.name || 'Member'}`).join('\n');

  return `
GROUP HOUSEMATE AGREEMENT
Generated by Debale Platform
Date: ${now}

ROOM PROVIDER: ${provider.name || 'Provider'}
ROOM SEEKERS:
${memberNames}

PROPERTY: ${listing.title || 'Room'}
LOCATION: ${[listing.city, listing.subcity, listing.neighborhood].filter(Boolean).join(', ') || '—'}
MONTHLY RENT: ${rent}
LEASE DURATION: ${listing.lease_duration || '3 months minimum'}

TERMS:
1. All Room Seekers jointly pay ${rent} monthly rent.
2. Security deposit of ${rent} required before move-in.
3. Minimum lease period: ${listing.lease_duration || '3 months'}. 30 days notice.
4. House rules must be followed.
5. Joint responsibility for rent and terms.
6. Utilities shared equally.

SIGNATURES:
Room Provider: ___________________  Date: ________
  ${provider.name || 'Provider'}

${memberNames.split('\n').map(n => `${n}: ___________________  Date: ________`).join('\n')}
`.trim();
}

// POST /api/agreements/:applicationId/initiate  — provider initiates 10% fee payment
router.post('/:applicationId/initiate', auth, async (req, res) => {
  try {
    const { gateway } = req.body;
    if (!['telebirr', 'cbe', 'dashen', 'awash'].includes(gateway)) {
      return res.status(400).json({ error: 'Invalid gateway' });
    }

    const { data: app } = await supabase.from('applications')
      .select('*, listings!inner(title, price, provider_id, users:provider_id(name)), users:seeker_id(name, email)')
      .eq('id', req.params.applicationId).single();

    if (!app || app.status !== 'accepted') return res.status(400).json({ error: 'Application must be accepted first' });
    if (app.listings.provider_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the room provider can pay the agreement fee' });
    }

    const listingPrice = Number(app.listings.price) || 0;
    const amount = Math.round(listingPrice * 0.1);
    if (amount <= 0) return res.status(400).json({ error: 'Invalid listing price' });

    // Check not already paid
    const { data: existing } = await supabase.from('agreements')
      .select('id, paid').eq('application_id', req.params.applicationId).single();

    if (existing?.paid) return res.status(409).json({ error: 'Agreement fee already paid' });

    // Create or update agreement record with pending status
    let agreement;
    if (existing) {
      const { data } = await supabase.from('agreements').update({
        gateway, status: 'pending',
      }).eq('id', existing.id).select().single();
      agreement = data;
    } else {
      const { data } = await supabase.from('agreements').insert([{
        application_id: req.params.applicationId,
        seeker_id: app.seeker_id,
        provider_id: app.listings.provider_id,
        gateway,
        status: 'pending',
        generated_text: generateAgreementText(app),
      }]).select().single();
      agreement = data;
    }

    const reference = `AGB-${agreement.id.slice(0, 8).toUpperCase()}`;

    res.json({
      message: 'Payment initiated',
      agreement_id: agreement.id,
      reference,
      amount,
      listing_price: listingPrice,
      percentage: 10,
      gateway,
      provider_name: app.listings.users?.name || '',
      seeker_name: app.users?.name || '',
      listing_title: app.listings.title || '',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agreements/:applicationId/confirm  — confirm payment and activate agreement
router.post('/:applicationId/confirm', auth, async (req, res) => {
  try {
    const { data: agreement } = await supabase.from('agreements')
      .select('*, applications!inner(listings!inner(provider_id))')
      .eq('application_id', req.params.applicationId).single();

    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
    if (agreement.applications.listings.provider_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the provider can confirm' });
    }
    if (agreement.paid) return res.status(409).json({ error: 'Already confirmed' });

    const { data: updated, error } = await supabase.from('agreements').update({
      paid: true,
      paid_at: new Date(),
      status: 'paid',
    }).eq('id', agreement.id).select().single();

    if (error) throw error;

    res.json({ message: 'Payment confirmed', agreement: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agreements/:applicationId  — get agreement details
router.get('/:applicationId', auth, async (req, res) => {
  try {
    const { data: agreement } = await supabase.from('agreements')
      .select('*, applications(*, listings!inner(title, city, price, house_rules, lease_duration, users:provider_id(name, phone)), users:seeker_id(name, email))')
      .eq('application_id', req.params.applicationId).single();

    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

    res.json({ agreement });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agreements/:applicationId/pdf  — download PDF agreement
router.get('/:applicationId/pdf', auth, async (req, res) => {
  try {
    const { data: agreement } = await supabase.from('agreements')
      .select('*, applications!inner(*, listings!inner(title, price, city, subcity, neighborhood, house_rules, lease_duration, users:provider_id(name, phone, email)), users:seeker_id(name, email))')
      .eq('application_id', req.params.applicationId).single();

    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
    if (!agreement.paid) return res.status(402).json({ error: 'Pay agreement fee first' });

    const app = agreement.applications;
    const listing = app?.listings || {};
    const provider = listing.users || {};
    const seeker = app?.users || {};

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Debale_Agreement_${req.params.applicationId.slice(0, 8)}.pdf"`);

    doc.pipe(res);

    // ── Header ──
    doc.fontSize(22).font('Helvetica-Bold').text('HOUSEMATE AGREEMENT', { align: 'center' });
    doc.fontSize(11).font('Helvetica').fillColor('#666')
      .text('Powered by Debale Platform', { align: 'center' })
      .moveDown(2);

    // ── Line ──
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').stroke().moveDown(1.5);

    // ── Parties ──
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000').text('PARTIES');
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica').fillColor('#333');
    doc.text(`Room Provider: ${provider.name || '—'}`);
    doc.text(`Phone: ${provider.phone || '—'}`);
    doc.text(`Email: ${provider.email || '—'}`);
    doc.moveDown(0.5);
    doc.text(`Room Seeker: ${seeker.name || '—'}`);
    doc.text(`Email: ${seeker.email || '—'}`);
    doc.moveDown(1.5);

    // ── Property ──
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000').text('PROPERTY DETAILS');
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica').fillColor('#333');
    doc.text(`Property: ${listing.title || '—'}`);
    doc.text(`Location: ${[listing.city, listing.subcity, listing.neighborhood].filter(Boolean).join(', ') || '—'}`);
    doc.text(`Monthly Rent: ${listing.price ? `${Number(listing.price).toLocaleString()} ETB` : '—'}`);
    doc.text(`Lease Duration: ${listing.lease_duration || '3 months minimum'}`);
    doc.moveDown(1.5);

    // ── Terms ──
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000').text('TERMS & CONDITIONS');
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica').fillColor('#333');

    const terms = [
      { title: '1. RENT PAYMENT', body: `The Room Seeker agrees to pay ${Number(listing.price).toLocaleString()} ETB monthly rent to the Room Provider. Payment is due on the 1st of each month. A late fee of 50 ETB applies after a 5-day grace period.` },
      { title: '2. SECURITY DEPOSIT', body: `A security deposit equivalent to one month's rent (${Number(listing.price).toLocaleString()} ETB) is required before move-in. The deposit will be returned within 14 days after move-out, less any deductions for damages.` },
      { title: '3. LEASE DURATION', body: `The minimum lease period is ${listing.lease_duration || '3 months'}. Either party must provide 30 days written notice to terminate.` },
      { title: '4. HOUSE RULES', body: listing.house_rules || 'No smoking indoors. No loud music after 10 PM. Keep common areas clean. Respect other housemates.' },
      { title: '5. UTILITIES', body: 'Electricity, water, and internet costs are shared equally among housemates unless otherwise agreed in writing.' },
      { title: '6. MAINTENANCE', body: 'The Room Provider is responsible for major repairs. The Room Seeker must report any issues promptly and keep the premises in good condition.' },
      { title: '7. SUBLETTING', body: 'The Room Seeker may not sublet or assign this agreement without written consent from the Room Provider.' },
      { title: '8. GOVERNING LAW', body: 'This agreement is governed by the laws of the Federal Democratic Republic of Ethiopia.' },
    ];

    for (const t of terms) {
      if (doc.y > 650) doc.addPage();
      doc.font('Helvetica-Bold').fillColor('#000').text(t.title);
      doc.font('Helvetica').fillColor('#333').text(t.body);
      doc.moveDown(0.8);
    }

    // ── Signatures ──
    if (doc.y > 600) doc.addPage();
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').stroke().moveDown(1.5);
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000').text('SIGNATURES');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica').fillColor('#333');

    const now = new Date().toLocaleDateString('en-ET', { year: 'numeric', month: 'long', day: 'numeric' });

    // Provider signature
    doc.text(`Room Provider: ___________________________  Date: ${now}`);
    doc.text(`  ${provider.name || 'Provider'}`).moveDown(0.8);

    // Seeker signature
    doc.text(`Room Seeker:   ___________________________  Date: ${now}`);
    doc.text(`  ${seeker.name || 'Seeker'}`).moveDown(1.5);

    // ── Footer ──
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').stroke().moveDown(1);
    doc.fontSize(9).fillColor('#999').text('Generated by Debale Platform · debale.et · This document is legally binding under Ethiopian law.', { align: 'center' });

    doc.end();

    // Store the generated text in DB if not already stored
    if (!agreement.generated_text) {
      const textContent = generateAgreementText({ listings: listing, users: seeker, provider_user: provider });
      await supabase.from('agreements').update({ generated_text: textContent }).eq('id', agreement.id);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agreements/:applicationId/upload  — upload signed agreement
router.post('/:applicationId/upload', auth, async (req, res) => {
  try {
    const { file_url, file_name } = req.body;

    const { data: agreement } = await supabase.from('agreements')
      .select('*').eq('application_id', req.params.applicationId).single();

    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
    if (!agreement.paid) return res.status(402).json({ error: 'Pay agreement fee first' });

    const { data: updated, error } = await supabase.from('agreements').update({
      signed_file_url: file_url,
      signed_file_name: file_name,
      status: 'signed',
      signed_at: new Date(),
    }).eq('id', agreement.id).select().single();

    if (error) throw error;

    // Notify both parties
    const { data: app } = await supabase.from('applications')
      .select('*, listings(title, provider_id, users:provider_id(name, email)), users:seeker_id(name, email)')
      .eq('id', req.params.applicationId).single();

    for (const [userId, name, email] of [
      [app.seeker_id, app.users.name, app.users.email],
      [app.listings.provider_id, app.listings.users.name, app.listings.users.email],
    ]) {
      await supabase.from('notifications').insert([{
        user_id: userId,
        type: 'agreement',
        title: 'Agreement Signed',
        body: `The housemate agreement for "${app.listings.title}" has been submitted.`,
      }]);
    }

    res.json({ message: 'Signed agreement uploaded', agreement: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function generateAgreementText(data) {
  const listing = data.listings || {};
  const seeker = data.users || data.seeker || {};
  const provider = data.provider_user || data.listings?.users || {};
  const rent = listing.price ? `${Number(listing.price).toLocaleString()} ETB` : '—';
  const now = new Date().toLocaleDateString('en-ET', { year: 'numeric', month: 'long', day: 'numeric' });

  return `
HOUSEMATE AGREEMENT
Generated by Debale Platform

Date: ${now}

ROOM PROVIDER: ${provider.name || 'Provider'}
ROOM SEEKER:   ${seeker.name || 'Seeker'}

PROPERTY: ${listing.title || 'Room'}
LOCATION: ${[listing.city, listing.subcity, listing.neighborhood].filter(Boolean).join(', ') || '—'}
MONTHLY RENT: ${rent}
LEASE DURATION: ${listing.lease_duration || '3 months minimum'}
HOUSE RULES: ${listing.house_rules || 'Standard house rules apply.'}

TERMS:
1. The Room Seeker agrees to pay ${rent} monthly rent.
2. A security deposit of ${rent} is required before move-in.
3. Minimum lease period: ${listing.lease_duration || '3 months'}. 30 days notice required.
4. House rules must be followed at all times.
5. Utilities shared equally among housemates.
6. Room Provider responsible for major repairs.
7. No subletting without written consent.
8. Governed by Ethiopian law.

SIGNATURES:
Room Provider: ___________________  Date: ________
  ${provider.name || 'Provider'}

Room Seeker:   ___________________  Date: ________
  ${seeker.name || 'Seeker'}
`.trim();
}

module.exports = router;
