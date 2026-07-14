const PLANS = {
  provider: {
    basic:    { label: 'Basic',    pricePerMonth: 200, maxRooms: 1,    maxApplies: 0 },
    standard: { label: 'Standard', pricePerMonth: 400, maxRooms: 4,    maxApplies: 0 },
    premium:  { label: 'Premium',  pricePerMonth: 750, maxRooms: 999,  maxApplies: 0 },
  },
  seeker: {
    basic:    { label: 'Basic',    pricePerMonth: 150, maxRooms: 0, maxApplies: 5,  maxGroups: 0, maxGroupApplies: 3  },
    standard: { label: 'Standard', pricePerMonth: 300, maxRooms: 0, maxApplies: 10, maxGroups: 1, maxGroupApplies: 5  },
    premium:  { label: 'Premium',  pricePerMonth: 600, maxRooms: 0, maxApplies: 999, maxGroups: 2, maxGroupApplies: 7 },
  },
};

const DURATIONS = [
  { id: '1month', months: 1,  label: '1 Month',  save: null },
  { id: '3month', months: 3,  label: '3 Months', save: 0.10 },
  { id: '6month', months: 6,  label: '6 Months', save: 0.17 },
];

const TIERS = ['basic', 'standard', 'premium'];

function getPlan(role, tier) {
  return PLANS[role]?.[tier] || null;
}

function calcPrice(role, tier, durationId) {
  const plan = getPlan(role, tier);
  const dur = DURATIONS.find(d => d.id === durationId);
  if (!plan || !dur) return null;
  const base = plan.pricePerMonth * dur.months;
  const discount = dur.save ? Math.round(base * dur.save) : 0;
  return { total: base - discount, discount, months: dur.months };
}

function getMaxRooms(role, tier) {
  if (role !== 'provider') return 0;
  return getPlan(role, tier)?.maxRooms || 0;
}

function getMaxApplies(role, tier) {
  if (role !== 'seeker') return 0;
  return getPlan(role, tier)?.maxApplies || 0;
}

function getMaxGroups(role, tier) {
  if (role !== 'seeker') return 0;
  return getPlan(role, tier)?.maxGroups || 0;
}

function getMaxGroupApplies(role, tier) {
  if (role !== 'seeker') return 0;
  return getPlan(role, tier)?.maxGroupApplies || 0;
}

module.exports = { PLANS, DURATIONS, TIERS, getPlan, calcPrice, getMaxRooms, getMaxApplies, getMaxGroups, getMaxGroupApplies };
