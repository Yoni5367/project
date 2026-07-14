import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { housemateAPI } from '../services/api';

export default function HousemateMultiRoom() {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState(null);
  const [applying, setApplying] = useState(null);

  const fetchListings = async (city = '') => {
    setLoading(true);
    try {
      const params = {};
      if (city) params.city = city;
      const [listRes, groupRes] = await Promise.all([housemateAPI.getMultiRoom(params), housemateAPI.myGroup().catch(() => ({ group: null }))]);
      setListings(listRes.listings || []);
      setTotal(listRes.total || 0);
      setGroup(groupRes.group);
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchListings(); }, []);

  const handleApply = async (listingId) => {
    if (!group) { alert('You need a group first! Create one from the group page.'); navigate('/housemate-group'); return; }
    setApplying(listingId);
    try {
      await housemateAPI.applyAsGroup(group.id, listingId);
      alert('Group application submitted!');
      navigate('/housemate-group');
    } catch (e) { alert(e.message); }
    finally { setApplying(null); }
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '70px 24px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5, margin: 0 }}>Multi-Room Apartments</h1>
          <p style={{ color: '#6B7280', margin: '4px 0 0' }}>{total} available full apartments with multiple rooms</p>
        </div>
        <button onClick={() => navigate('/housemate-group')} style={{ background: '#E6F4F1', color: '#0E7C6B', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>My Group →</button>
      </div>

      <div style={{ marginBottom: 24 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') fetchListings(search); }} placeholder="Search by city..." style={{ width: '100%', maxWidth: 400, padding: '10px 14px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14 }} />
        <button onClick={() => fetchListings(search)} style={{ marginLeft: 8, background: '#0E7C6B', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Search</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60, color: '#6B7280' }}>Loading...</div>
      ) : listings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🏠</p>
          <p style={{ fontWeight: 600, fontSize: 18, color: '#374151' }}>No multi-room listings found</p>
          <p style={{ marginTop: 4 }}>Check back later for available full apartments.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {listings.map(l => (
            <div key={l.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
              {l.photos?.[0] ? (
                <img src={l.photos[0]} alt="" style={{ width: '100%', height: 160, objectFit: 'cover' }} />
              ) : (
                <div style={{ height: 160, background: '#E6F4F1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0E7C6B', fontSize: 40 }}>🏠</div>
              )}
              <div style={{ padding: 16 }}>
                <p style={{ fontWeight: 700, margin: 0, fontSize: 16 }}>{l.title}</p>
                <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0' }}>{l.city}{l.neighborhood ? `, ${l.neighborhood}` : ''}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0' }}>
                  <span style={{ fontWeight: 700, color: '#0E7C6B', fontSize: 16 }}>{l.price?.toLocaleString()} ETB</span>
                  <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 20, background: '#E6F4F1', color: '#0E7C6B', fontWeight: 600 }}>{l.open_slots} slots open</span>
                </div>
                {group ? (
                  <button onClick={() => handleApply(l.id)} disabled={applying === l.id} style={{ width: '100%', background: '#0E7C6B', color: '#fff', border: 'none', padding: '10px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13, opacity: applying === l.id ? 0.6 : 1, marginTop: 8 }}>
                    {applying === l.id ? 'Applying...' : 'Apply as Group'}
                  </button>
                ) : (
                  <p style={{ fontSize: 12, color: '#9CA3AF', margin: '8px 0 0', textAlign: 'center' }}>Form a group to apply</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
