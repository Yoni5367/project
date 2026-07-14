import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { listingsAPI, applicationsAPI, usersAPI } from '../services/api';
import { Search, SlidersHorizontal, MapPin, Wifi, Zap, Droplets, Users, Bookmark, BadgeCheck, Home } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Browse() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [saved, setSaved] = useState([]);
  const [applied, setApplied] = useState([]);
  const [applying, setApplying] = useState(null);
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({ city: '', type: '', maxPrice: '', furnished: '', gender: '' });

  // Fetch listings from real API
  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      try {
        const params = {};
        if (search) params.search = search;
        if (filters.city) params.city = filters.city;
        if (filters.type) params.type = filters.type;
        if (filters.maxPrice) params.maxPrice = filters.maxPrice;
        if (filters.furnished) params.furnished = filters.furnished;
        if (filters.gender) params.gender = filters.gender;

        const { listings: data, total: t } = await listingsAPI.browse(params);
        setListings(data || []);
        setTotal(t || 0);
      } catch (err) {
        console.error('Browse error:', err.message);
      } finally {
        setLoading(false);
      }
    };
    const debounce = setTimeout(fetchListings, 400);
    return () => clearTimeout(debounce);
  }, [search, filters]);

  const handleApply = async (listingId) => {
    if (!user) { navigate('/login'); return; }
    if (!user.subscribed) { navigate('/payment'); return; }
    setApplying(listingId);
    try {
      await applicationsAPI.apply(listingId);
      setApplied(prev => [...prev, listingId]);
    } catch (err) {
      alert(err.message);
    } finally {
      setApplying(null);
    }
  };

  const handleSave = async (listingId) => {
    if (!user) { navigate('/login'); return; }
    try {
      const { saved: isSaved } = await usersAPI.toggleSaved(listingId);
      setSaved(prev => isSaved ? [...prev, listingId] : prev.filter(id => id !== listingId));
    } catch (err) {
      console.error(err);
    }
  };

  const canApply = user?.subscribed;

  return (
    <div style={{ paddingTop: 70, minHeight: '100vh', background: 'var(--cream)' }}>
      {/* Hero search */}
      <div style={{ background: 'linear-gradient(135deg,var(--teal) 0%,#0A5C4F 100%)', padding: '48px 0 60px' }}>
        <div className="container" style={{ textAlign: 'center', color: 'white' }}>
          <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 8 }}>{t('browse_title')}</h1>
          <p style={{ opacity: 0.85, marginBottom: 32 }}>{t('browse_sub')}</p>
          <div style={{ maxWidth: 560, margin: '0 auto', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }}/>
            <input className="form-input" style={{ paddingLeft: 50, height: 52, borderRadius: 12, fontSize: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
              placeholder={t('search_placeholder')} value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '32px 24px' }}>
        {/* Banners */}
        {user && !user.subscribed && (
          <div style={{ background: 'var(--gold-light)', border: '1px solid var(--gold-mid)', borderRadius: 10, padding: '14px 20px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 14 }}> <strong>Subscribe</strong> to apply for rooms.</p>
            <Link to="/payment" className="btn btn-gold btn-sm">Subscribe Now</Link>
          </div>
        )}
        {!user && (
          <div style={{ background: 'var(--teal-light)', border: '1px solid var(--teal-mid)', borderRadius: 10, padding: '14px 20px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 14 }}> <strong>Sign up</strong> to apply for rooms.</p>
            <Link to="/register" className="btn btn-primary btn-sm">Join Free</Link>
          </div>
        )}

        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ fontSize: 14, color: 'var(--gray-500)' }}>{loading ? 'Loading...' : `${total} rooms found`}</p>
          <button onClick={() => setShowFilter(!showFilter)} className="btn btn-outline btn-sm">
            <SlidersHorizontal size={14}/> {t('filter')}
          </button>
        </div>

        {/* Filters */}
        {showFilter && (
          <div style={{ background: 'white', borderRadius: 12, padding: 20, marginBottom: 24, border: '1px solid var(--gray-200)', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
            {[
              ['city', 'City', [['','Any City'],['Addis Ababa','Addis Ababa'],['Dire Dawa','Dire Dawa'],['Bahir Dar','Bahir Dar'],['Hawassa','Hawassa']]],
              ['gender', 'Gender', [['','Any'],['male_only','Male Only'],['female_only','Female Only']]],
              ['type', 'Room Type', [['','All Types'],['Single Room','Single Room'],['Shared Apartment','Shared Apt'],['Studio','Studio'],['Full Apartment','Full Apt']]],
              ['furnished', 'Furnishing', [['','All'],['Fully Furnished','Fully Furnished'],['Semi-Furnished','Semi'],['Unfurnished','Unfurnished']]],
            ].map(([key, label, opts]) => (
              <div key={key} className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{label}</label>
                <select className="form-input form-select" value={filters[key]} onChange={e => setFilters({ ...filters, [key]: e.target.value })}>
                  {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}

        {/* Listings grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ background: 'white', borderRadius: 16, height: 360, border: '1px solid var(--gray-100)', overflow: 'hidden' }}>
                <div style={{ height: 190, background: 'var(--gray-100)', animation: 'pulse 1.5s infinite' }}/>
                <div style={{ padding: 20 }}>
                  <div style={{ height: 18, background: 'var(--gray-100)', borderRadius: 6, marginBottom: 10 }}/>
                  <div style={{ height: 14, background: 'var(--gray-100)', borderRadius: 6, width: '60%' }}/>
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--gray-400)' }}>
            <p style={{ fontSize: 48, marginBottom: 12 }}>🏠</p>
            <p style={{ fontSize: 18, fontWeight: 600 }}>No rooms found</p>
            <p style={{ fontSize: 14, marginTop: 4 }}>Try adjusting your filters</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
            {listings.map(room => (
              <div key={room.id} className="card" style={{ transition: 'transform 0.2s,box-shadow 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
                <div style={{ height: 190, background: 'var(--teal-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                  {room.photos?.length > 0
                    ? <img src={room.photos[0]} alt={room.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                    : <div style={{ opacity: 0.2, fontSize: 72 }}>🏠</div>
                  }
                  <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6 }}>
                    {room.users?.verified && <span className="badge badge-teal" style={{ fontSize: 11 }}><BadgeCheck size={10}/> Verified</span>}
                    <span className="badge badge-gold" style={{ fontSize: 11 }}>{room.property_type}</span>
                  </div>
                  <button onClick={() => handleSave(room.id)}
                    style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '50%', background: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <Bookmark size={14} fill={saved.includes(room.id) ? 'var(--gold)' : 'none'} color={saved.includes(room.id) ? 'var(--gold)' : 'var(--gray-400)'}/>
                  </button>
                </div>
                <div style={{ padding: '18px 20px' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, lineHeight: 1.3 }}>{room.title}</h3>
                  <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={12}/>{room.city}{room.neighborhood ? `, ${room.neighborhood}` : ''}
                  </p>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                    {room.includes_wifi && <span style={{ fontSize: 11, color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: 3 }}><Wifi size={11}/>WiFi</span>}
                    {room.includes_electricity && <span style={{ fontSize: 11, color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: 3 }}><Zap size={11}/>Elec</span>}
                    {room.includes_water && <span style={{ fontSize: 11, color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: 3 }}><Droplets size={11}/>Water</span>}
                    <span style={{ fontSize: 11, color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: 3 }}><Users size={11}/>{room.preferred_gender || 'Any'}</span>
                      <span style={{display:'flex',alignItems:'center',gap:5,fontSize:14,color:'var(--teal)',fontWeight:800}}><Home size={14}/>{room.rooms_available||1} room{room.rooms_available!==1?'s':''}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div><span style={{ fontSize: 22, fontWeight: 700, color: 'var(--teal)' }}>{room.price?.toLocaleString()}</span><span style={{ fontSize: 12, color: 'var(--gray-400)' }}> ETB/mo</span></div>
                    <span className="badge badge-green" style={{ fontSize: 11 }}>{room.furnishing || 'Available'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Link to={`/listing/${room.id}`} className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center' }}>Details</Link>
                    {applied.includes(room.id)
                      ? <button disabled className="btn btn-sm" style={{ flex: 1, justifyContent: 'center', background: 'var(--green-light)', color: 'var(--green)', border: 'none' }}>✓ Applied</button>
                      : <button onClick={() => handleApply(room.id)} disabled={applying === room.id}
                          className={`btn btn-sm ${canApply ? 'btn-primary' : ''}`}
                          style={{ flex: 1, justifyContent: 'center', ...(!canApply && { background: 'var(--gray-100)', color: 'var(--gray-400)', border: 'none', cursor: 'not-allowed' }) }}>
                          {applying === room.id ? '...' : canApply ? t('apply_now') : 'Subscribe'}
                        </button>
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}
