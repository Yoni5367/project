import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listingsAPI, applicationsAPI, usersAPI } from '../services/api';
import { MapPin, Wifi, Zap, Droplets, Users, Home, Calendar, ArrowLeft, Bookmark, BadgeCheck, Check, X, Phone, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ListingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [galleryIdx, setGalleryIdx] = useState(null);
  const photos = room?.photos || [];

  const openGallery = useCallback((idx) => setGalleryIdx(idx), []);
  const closeGallery = useCallback(() => setGalleryIdx(null), []);
  const prevPhoto = useCallback(() => setGalleryIdx(i => (i > 0 ? i - 1 : photos.length - 1)), [photos.length]);
  const nextPhoto = useCallback(() => setGalleryIdx(i => (i < photos.length - 1 ? i + 1 : 0)), [photos.length]);

  useEffect(() => {
    if (galleryIdx === null) return;
    const handler = (e) => {
      if (e.key === 'Escape') closeGallery();
      if (e.key === 'ArrowLeft') prevPhoto();
      if (e.key === 'ArrowRight') nextPhoto();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [galleryIdx, closeGallery, prevPhoto, nextPhoto]);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const data = await listingsAPI.get(id);
        setRoom(data.listing || data);
      } catch (err) {
        console.error('Failed to load listing:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchListing();
  }, [id]);

  const handleApply = async () => {
    if(!user) { navigate('/login'); return; }
    if(!user.subscribed) { navigate('/payment'); return; }
    setApplying(true);
    try {
      await applicationsAPI.apply(id);
      setApplied(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setApplying(false);
    }
  };

  const handleSave = async () => {
    if (!user) { navigate('/login'); return; }
    try {
      const { saved: isSaved } = await usersAPI.toggleSaved(id);
      setSaved(isSaved);
    } catch {}
  };

  if (loading) {
    return (
      <div style={{paddingTop:70, minHeight:'100vh', background:'var(--cream)'}}>
        <div className="container" style={{padding:'36px 24px', maxWidth:1000}}>
          <div style={{height:320, background:'var(--gray-100)', borderRadius:16, animation:'pulse 1.5s infinite', marginBottom:24}}/>
          <div style={{height:32, background:'var(--gray-100)', borderRadius:8, width:'60%', marginBottom:16}}/>
          <div style={{height:16, background:'var(--gray-100)', borderRadius:8, width:'40%', marginBottom:32}}/>
          <div style={{display:'grid', gridTemplateColumns:'1fr 340px', gap:32}}>
            <div style={{height:200, background:'var(--gray-100)', borderRadius:14}}/>
            <div style={{height:300, background:'var(--gray-100)', borderRadius:14}}/>
          </div>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div style={{paddingTop:70, minHeight:'100vh', background:'var(--cream)', display:'flex', alignItems:'center', justifyContent:'center'}}>
        <div style={{textAlign:'center'}}>
          <p style={{fontSize:48, marginBottom:12}}>🏠</p>
          <h2 style={{fontSize:24, fontWeight:700, marginBottom:8}}>Listing not found</h2>
          <Link to="/browse" className="btn btn-primary">Browse Rooms</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{paddingTop:70, minHeight:'100vh', background:'var(--cream)'}}>
      <div className="container" style={{padding:'36px 24px', maxWidth:1000}}>

        {/* Back */}
        <Link to="/browse" style={{display:'inline-flex', alignItems:'center', gap:6, color:'var(--gray-500)', fontSize:14, marginBottom:24}}>
          <ArrowLeft size={16}/> Back to Browse
        </Link>

        <div style={{display:'grid', gridTemplateColumns:'1fr 340px', gap:32}}>

          {/* Left */}
          <div>
            {/* Photo gallery */}
            <div onClick={() => photos.length > 0 && openGallery(0)} style={{height:320, background:'linear-gradient(135deg, var(--teal-light), var(--teal-mid))', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12, position:'relative', overflow:'hidden', cursor: photos.length > 0 ? 'pointer' : 'default'}}>
              {photos.length > 0
                ? <img src={photos[0]} alt={room.title} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                : <Home size={80} color="var(--teal)" opacity={0.2}/>
              }
              {photos.length > 0 && <div style={{position:'absolute', bottom:16, right:16, background:'rgba(0,0,0,0.5)', color:'white', padding:'4px 12px', borderRadius:20, fontSize:13}}>1 / {photos.length} photos</div>}
              {room.is_verified && (
                <div style={{position:'absolute', top:16, left:16}} className="badge badge-teal">
                  <BadgeCheck size={12}/> Verified Listing
                </div>
              )}
            </div>
            {photos.length > 1 && (
              <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:28}}>
                {photos.slice(1, 4).map((photo, i) => (
                  <div key={i} onClick={() => openGallery(i + 1)} style={{height:100, borderRadius:10, overflow:'hidden', cursor:'pointer'}}>
                    <img src={photo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  </div>
                ))}
              </div>
            )}

            {/* Lightbox */}
            {galleryIdx !== null && (
              <div onClick={closeGallery} style={{position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.9)', display:'flex', alignItems:'center', justifyContent:'center'}}>
                <button onClick={(e) => { e.stopPropagation(); closeGallery(); }} style={{position:'absolute', top:20, right:20, background:'rgba(255,255,255,0.15)', border:'none', color:'#fff', width:40, height:40, borderRadius:'50%', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20}}><X size={22}/></button>
                <div style={{position:'absolute', bottom:24, left:'50%', transform:'translateX(-50%)', background:'rgba(0,0,0,0.5)', color:'#fff', padding:'6px 16px', borderRadius:20, fontSize:14}}>{galleryIdx + 1} / {photos.length}</div>
                {photos.length > 1 && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); prevPhoto(); }} style={{position:'absolute', left:20, background:'rgba(255,255,255,0.15)', border:'none', color:'#fff', width:44, height:44, borderRadius:'50%', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'}}><ChevronLeft size={26}/></button>
                    <button onClick={(e) => { e.stopPropagation(); nextPhoto(); }} style={{position:'absolute', right:20, background:'rgba(255,255,255,0.15)', border:'none', color:'#fff', width:44, height:44, borderRadius:'50%', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'}}><ChevronRight size={26}/></button>
                  </>
                )}
                <img onClick={(e) => e.stopPropagation()} src={photos[galleryIdx]} alt="" style={{maxWidth:'90vw', maxHeight:'85vh', objectFit:'contain', borderRadius:8, boxShadow:'0 8px 40px rgba(0,0,0,0.5)'}}/>
              </div>
            )}

            {/* Title */}
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8}}>
              <h1 style={{fontSize:26, fontWeight:700, fontFamily:'var(--font-head)', lineHeight:1.3}}>{room.title}</h1>
              <button onClick={handleSave} style={{width:40, height:40, borderRadius:'50%', border:'1.5px solid var(--gray-200)', background:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                <Bookmark size={18} fill={saved?'var(--gold)':'none'} color={saved?'var(--gold)':'var(--gray-400)'}/>
              </button>
            </div>
            <p style={{color:'var(--gray-500)', display:'flex', alignItems:'center', gap:6, marginBottom:20}}>
              <MapPin size={15}/>{room.city}{room.neighborhood ? `, ${room.neighborhood}` : ''} {room.landmark ? `· Near ${room.landmark}` : ''}
            </p>

            {/* Amenities */}
            <div style={{display:'flex', gap:12, flexWrap:'wrap', marginBottom:28}}>
              {[
                [room.includes_wifi, Wifi, 'WiFi Included'],
                [room.includes_electricity, Zap, 'Electricity Included'],
                [room.includes_water, Droplets, 'Water Included'],
              ].filter(([v])=>v).map(([,Icon,label])=>(
                <span key={label} style={{display:'flex', alignItems:'center', gap:8, padding:'8px 14px', borderRadius:10, background:'var(--teal-light)', fontSize:14, color:'var(--teal)', fontWeight:500}}>
                  <Icon size={15}/>{label}
                </span>
              ))}
            </div>

            {/* Details grid */}
            <div style={{background:'white', borderRadius:14, padding:24, marginBottom:24, border:'1px solid var(--gray-100)'}}>
              <h3 style={{fontSize:16, fontWeight:600, marginBottom:16}}>Room Details</h3>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14}}>
                {[['Type', room.property_type],['Furnishing', room.furnishing],['Available', room.move_in_date || 'Immediate'],['Lease', room.lease_duration],['Preferred Gender', room.preferred_gender],['Age Range', room.age_min && room.age_max ? `${room.age_min}-${room.age_max}` : 'Any'],['Occupation Pref.', room.preferred_occupation || 'Any'],['Posted', room.created_at ? new Date(room.created_at).toLocaleDateString() : '—']].map(([k,v])=>(
                  <div key={k} style={{padding:'12px', borderRadius:8, background:'var(--gray-50)'}}>
                    <p style={{fontSize:11, color:'var(--gray-400)', marginBottom:4}}>{k}</p>
                    <p style={{fontWeight:500, fontSize:14}}>{v || '—'}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Rules */}
            <div style={{background:'white', borderRadius:14, padding:24, border:'1px solid var(--gray-100)'}}>
              <h3 style={{fontSize:16, fontWeight:600, marginBottom:16}}>House Rules & Requirements</h3>
              <div style={{marginBottom:16}}>
                <p style={{fontSize:13, fontWeight:600, color:'var(--gray-500)', marginBottom:8}}>RULES</p>
                <p style={{fontSize:14, color:'var(--gray-600)', lineHeight:1.7}}>{room.house_rules || 'No specific rules listed'}</p>
              </div>
              <div style={{marginBottom:16}}>
                <p style={{fontSize:13, fontWeight:600, color:'var(--gray-500)', marginBottom:8}}>DEAL BREAKERS</p>
                <p style={{fontSize:14, color:'var(--gray-600)', lineHeight:1.7}}>{room.deal_breakers || 'None specified'}</p>
              </div>
              <div style={{display:'flex', gap:16}}>
                {[['Smoking', room.smoking_allowed ? 'Yes' : 'No'],['Pets', room.pets_allowed ? 'Yes' : 'No'],['Visitors', room.visitors_allowed || 'No']].map(([k,v])=>(
                  <div key={k} style={{display:'flex', alignItems:'center', gap:6, fontSize:14}}>
                    {v === 'No' ? <X size={14} color="var(--red)"/> : <Check size={14} color="var(--green)"/>}
                    <span>{k}: <strong>{v}</strong></span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right — Sticky sidebar */}
          <div style={{alignSelf:'start', position:'sticky', top:90}}>
            {/* Price card */}
            <div style={{background:'white', borderRadius:16, padding:24, border:'1px solid var(--gray-100)', marginBottom:16, boxShadow:'0 4px 20px rgba(0,0,0,0.06)'}}>
              <div style={{marginBottom:20}}>
                <span style={{fontSize:36, fontWeight:800, color:'var(--teal)', fontFamily:'var(--font-head)'}}>{room.price?.toLocaleString()}</span>
                <span style={{fontSize:14, color:'var(--gray-400)'}}> ETB / month</span>
              </div>
              <div style={{display:'flex', flexDirection:'column', gap:8, marginBottom:20}}>
                {[`Furnishing: ${room.furnishing || 'N/A'}`,`Available: ${room.move_in_date || 'Immediate'}`,`Preferred: ${room.preferred_gender || 'Any'}`].map(item=>(
                  <div key={item} style={{display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--gray-600)'}}>
                    <Check size={13} color="var(--teal)"/>{item}
                  </div>
                ))}
              </div>
              {applied
                ? <div style={{padding:'14px', borderRadius:10, background:'var(--green-light)', textAlign:'center', color:'var(--green)', fontWeight:600}}>
                    ✓ Application Sent!
                  </div>
                : <button onClick={handleApply} disabled={applying} className={`btn w-full btn-lg ${user?.subscribed?'btn-primary':''}`}
                    style={{justifyContent:'center', ...(user&&!user.subscribed&&{background:'var(--gray-100)',color:'var(--gray-500)',cursor:'not-allowed'})}}>
                    {!user ? 'Login to Apply' : applying ? 'Applying...' : !user.subscribed ? 'Subscribe to Apply' : 'Apply Now'}
                  </button>
              }
              {user && !user.subscribed && !applied && (
                <Link to="/payment" className="btn btn-gold w-full" style={{justifyContent:'center', marginTop:8}}>Subscribe — 150 ETB/mo</Link>
              )}
            </div>

            {/* Provider card */}
            {room.users && (
              <div style={{background:'white', borderRadius:16, padding:20, border:'1px solid var(--gray-100)'}}>
                <p style={{fontSize:13, fontWeight:600, color:'var(--gray-400)', marginBottom:14}}>ROOM PROVIDER</p>
                <div style={{display:'flex', gap:14, alignItems:'center', marginBottom:14}}>
                  <div style={{width:48, height:48, borderRadius:'50%', background:'var(--teal)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700}}>
                    {room.users.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <div style={{display:'flex', alignItems:'center', gap:6}}>
                      <p style={{fontWeight:600}}>{room.users.name}</p>
                      {room.users.verified && <BadgeCheck size={15} color="var(--teal)"/>}
                    </div>
                  </div>
                </div>
                <div style={{marginTop:14, padding:'10px 14px', borderRadius:8, background:'var(--teal-light)', fontSize:13, color:'var(--gray-600)'}}>
                  <Phone size={13} style={{display:'inline', marginRight:6}}/>
                  Contact info revealed only after acceptance
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}
