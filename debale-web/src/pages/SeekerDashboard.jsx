import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { applicationsAPI, usersAPI, paymentsAPI, housemateAPI } from '../services/api';
import {
  Home, Bookmark, Settings, LogOut, CheckCircle, XCircle,
  Calendar, CreditCard, AlertCircle, Search, User,
  Sparkles, FileText, MapPin, Clock, MessageSquare, Users
} from 'lucide-react';

const STATUS_CONFIG = {
  pending:   { label:'Pending Review',    color:'var(--gray-500)', bg:'var(--gray-100)',    Icon: Clock },
  interview: { label:'Interview Set',     color:'#7C3AED',         bg:'#EDE9FE',            Icon: Calendar },
  accepted:  { label:'Accepted',          color:'var(--green)',     bg:'var(--green-light)', Icon: CheckCircle },
  rejected:  { label:'Not Selected',      color:'var(--red)',       bg:'var(--red-light)',   Icon: XCircle },
};

export default function SeekerDashboard() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('applications');
  const [applications, setApplications] = useState([]);
  const [savedListings, setSavedListings] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myGroups, setMyGroups] = useState([]);
  const [publicGroups, setPublicGroups] = useState([]);
  const [multiRoomListings, setMultiRoomListings] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [appsRes, savedRes, subRes, groupRes, pubRes, multiRes] = await Promise.allSettled([
          applicationsAPI.mine(),
          usersAPI.getSaved(),
          paymentsAPI.status(),
          housemateAPI.listMyGroups(),
          housemateAPI.listPublicGroups(),
          housemateAPI.getMultiRoom({ limit: 4 }),
        ]);
        if (appsRes.status === 'fulfilled') setApplications(appsRes.value.applications || []);
        if (savedRes.status === 'fulfilled') setSavedListings(savedRes.value.saved || []);
        if (subRes.status === 'fulfilled') setSubscription(subRes.value.subscription || subRes.value);
        if (groupRes.status === 'fulfilled') {
          const g = groupRes.value?.group;
          setMyGroups(g ? [g] : []);
          if (g?.id) {
            housemateAPI.getGroupRequests(g.id).then(r => setPendingRequests(r.requests || [])).catch(() => {});
          }
        }
        if (pubRes.status === 'fulfilled') setPublicGroups(pubRes.value?.groups || []);
        if (multiRes.status === 'fulfilled') setMultiRoomListings(multiRes.value.listings || []);
      } catch {} finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const hasAccepted = applications.some(a => a.status === 'accepted');
  const acceptedAppId = applications.find(a => a.status === 'accepted')?.id || '';
  const agreementLink = acceptedAppId ? `/agreement?applicationId=${acceptedAppId}` : '/agreement';
  const daysLeft = subscription?.days_left || 22;
  const expiryDate = subscription?.expires_at ? new Date(subscription.expires_at).toLocaleDateString() : 'Jun 28, 2025';

  const navItems = [
    { key:'applications', label:'My Applications', Icon: Home },
    { key:'saved',        label:'Saved Rooms',     Icon: Bookmark },
    { key:'profile',      label:'My Profile',      Icon: User },
    { key:'subscription', label:'Subscription',    Icon: CreditCard },
  ];

  return (
    <div style={{paddingTop:70, minHeight:'100vh', background:'var(--cream)', display:'flex'}}>

      {/* Sidebar */}
      <aside style={{width:240, background:'white', borderRight:'1px solid var(--gray-100)', padding:'32px 0', display:'flex', flexDirection:'column', position:'sticky', top:70, height:'calc(100vh - 70px)'}}>
        <div style={{padding:'0 20px 24px', borderBottom:'1px solid var(--gray-100)', marginBottom:16}}>
          <div style={{width:52, height:52, borderRadius:'50%', background:'var(--teal)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:700, marginBottom:10}}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <p style={{fontWeight:600, fontSize:15}}>{user?.name}</p>
          <p style={{fontSize:12, color:'var(--gray-400)'}}>{user?.email}</p>
          <span style={{display:'inline-flex', alignItems:'center', gap:4, marginTop:8, fontSize:11, padding:'3px 8px', borderRadius:20, background:'var(--green-light)', color:'var(--green)', fontWeight:500}}>
            <CheckCircle size={10}/> Active Seeker
          </span>
        </div>

        <nav style={{flex:1, padding:'0 12px'}}>
          {navItems.map(({key,label,Icon}) => (
            <button key={key} onClick={()=>setTab(key)}
              style={{width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8, border:'none', cursor:'pointer', marginBottom:4, textAlign:'left', fontSize:14, fontWeight:tab===key?600:400,
                background:tab===key?'var(--teal-light)':'transparent', color:tab===key?'var(--teal)':'var(--gray-600)'}}>
              <Icon size={16}/>{label}
            </button>
          ))}

          <div style={{height:1, background:'var(--gray-100)', margin:'12px 4px'}}/>
          <p style={{fontSize:11, fontWeight:600, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:'0.05em', padding:'4px 12px 8px'}}>Tools</p>

          <Link to="/ai-agent" style={{textDecoration:'none'}}>
            <div style={{display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8, marginBottom:4, fontSize:14, fontWeight:500, color:'var(--gold)', background:'var(--gold-light)', cursor:'pointer'}}>
              <Sparkles size={16}/> AI Assistant
            </div>
          </Link>

          <Link to="/housemate-group" style={{textDecoration:'none'}}>
            <div style={{display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8, marginBottom:4, fontSize:14, fontWeight:500, color:'var(--teal)', background:'var(--teal-light)', cursor:'pointer'}}>
              <Users size={16}/> My Housemate Group
            </div>
          </Link>

          <Link to={agreementLink} style={{textDecoration:'none'}}>
            <div style={{display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8, marginBottom:4, fontSize:14, fontWeight:500,
              color: hasAccepted ? 'white' : 'var(--teal)',
              background: hasAccepted ? 'var(--teal)' : 'var(--teal-light)',
              cursor:'pointer', position:'relative'}}>
              <FileText size={16}/>
              Agreement
              {hasAccepted && <span style={{marginLeft:'auto', fontSize:10, background:'var(--gold)', color:'white', padding:'2px 6px', borderRadius:10, fontWeight:700}}>READY</span>}
            </div>
          </Link>

          <Link to="/messages" style={{textDecoration:'none'}}>
            <div style={{display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8, marginBottom:4, fontSize:14, fontWeight:500, color:'var(--gray-600)', cursor:'pointer'}}>
              <MessageSquare size={16}/> Messages
              {hasAccepted && <span style={{marginLeft:'auto', width:8, height:8, borderRadius:'50%', background:'var(--green)'}}/>}
            </div>
          </Link>
        </nav>

        <div style={{padding:'16px 12px', borderTop:'1px solid var(--gray-100)'}}>
          <Link to="/settings">
            <button style={{width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8, border:'none', cursor:'pointer', background:'transparent', color:'var(--gray-600)', fontSize:14, marginBottom:4}}>
              <Settings size={16}/> Settings
            </button>
          </Link>
          <button onClick={()=>{logout();navigate('/');}} style={{width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8, border:'none', cursor:'pointer', background:'transparent', color:'var(--red)', fontSize:14}}>
            <LogOut size={16}/> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{flex:1, padding:'36px 40px', overflowY:'auto'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28}}>
          <div>
            <h1 style={{fontSize:26, fontWeight:700, fontFamily:'var(--font-head)', marginBottom:4}}>
              {t('welcome_back')}, {user?.name?.split(' ')[0]}
            </h1>
            <p style={{color:'var(--gray-500)', fontSize:15}}>Here's your activity overview</p>
          </div>
          <Link to="/find-group" className="btn btn-outline" style={{marginLeft:8,padding:'8px 16px',borderRadius:8,border:'1.5px solid var(--teal)',color:'var(--teal)',background:'transparent',textDecoration:'none',fontWeight:600,fontSize:13,display:'inline-flex',alignItems:'center',gap:6}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Find a Group
          </Link>
        </div>

        {/* Accepted alert — agreement CTA */}
        {hasAccepted && (
          <div style={{background:'linear-gradient(135deg, var(--teal), #0A5C4F)', borderRadius:14, padding:'20px 24px', marginBottom:24, display:'flex', justifyContent:'space-between', alignItems:'center', color:'white'}}>
            <div style={{display:'flex', alignItems:'center', gap:12}}>
              <div style={{width:44, height:44, borderRadius:12, background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center'}}>
                <FileText size={22}/>
              </div>
              <div>
                <p style={{fontWeight:700, fontSize:16, marginBottom:2}}>Your application was accepted!</p>
                <p style={{fontSize:13, opacity:0.85}}>Complete the housemate agreement to finalize your move-in.</p>
              </div>
            </div>
            <Link to={agreementLink} style={{background:'var(--gold)', color:'white', padding:'10px 20px', borderRadius:10, textDecoration:'none', fontWeight:600, fontSize:14, whiteSpace:'nowrap', flexShrink:0}}>
              Sign Agreement →
            </Link>
          </div>
        )}

        {/* Subscription banner */}
        {user?.subscribed && (
          <div style={{background:'var(--teal-light)', borderRadius:12, padding:'14px 20px', marginBottom:24, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div style={{display:'flex', alignItems:'center', gap:10}}><CheckCircle size={18} color="var(--teal)"/>
              <p style={{fontSize:14}}><strong>Subscription active</strong> — expires {expiryDate} ({daysLeft} days left)</p></div>
            <Link to="/payment" style={{fontSize:13, color:'var(--teal)', fontWeight:500}}>Renew Early</Link>
          </div>
        )}

        {/* Stats */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:32}}>
          {[
            ['Applied', applications.length, 'var(--teal)', 'var(--teal-light)'],
            ['Pending', applications.filter(a=>a.status==='pending').length, 'var(--gray-500)', 'var(--gray-100)'],
            ['Interviews', applications.filter(a=>a.status==='interview').length, '#7C3AED', '#EDE9FE'],
            ['Accepted', applications.filter(a=>a.status==='accepted').length, 'var(--green)', 'var(--green-light)'],
          ].map(([label,val,color,bg]) => (
            <div key={label} style={{background:'white', borderRadius:12, padding:'20px', border:'1px solid var(--gray-100)'}}>
              <p style={{fontSize:13, color:'var(--gray-500)', marginBottom:8}}>{label}</p>
              <p style={{fontSize:32, fontWeight:800, color, fontFamily:'var(--font-head)'}}>{val}</p>
            </div>
          ))}
        </div>

        {/* Applications tab — side by side with My Group */}
        {tab==='applications' && (
          <div style={{display:'flex', gap:0}}>
            {/* Left: Applications */}
            <div style={{flex:1, minWidth:0, paddingRight:24, borderRight:'1.5px solid var(--gray-200)'}}>
              <h2 style={{fontSize:18, fontWeight:600, marginBottom:20}}>My Applications</h2>
              {loading ? (
                <div style={{display:'flex', flexDirection:'column', gap:12}}>
                  {[1,2,3].map(i => (
                    <div key={i} style={{background:'white', borderRadius:12, height:72, border:'1px solid var(--gray-100)', animation:'pulse 1.5s infinite'}}/>
                  ))}
                </div>
              ) : applications.length === 0 ? (
                <div style={{textAlign:'center', padding:'60px 0', color:'var(--gray-400)'}}>
                  <Home size={40} style={{margin:'0 auto 12px', opacity:0.3}}/>
                  <p>No applications yet</p>
                  <Link to="/browse" className="btn btn-primary" style={{marginTop:16}}>Browse Rooms</Link>
                </div>
              ) : (
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
                  {applications.map(app => {
                    const listing = app.listings || {};
                    const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending;
                    return (
                      <div key={app.id} style={{background:'white', borderRadius:14, border:`1px solid ${app.status==='accepted'?'var(--teal)':'var(--gray-100)'}`, overflow:'hidden', transition:'box-shadow 0.15s', boxShadow: app.status==='accepted'?'0 0 0 2px var(--teal-light)':'none'}}>
                        <div style={{height:140, background:'var(--teal-light)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', position:'relative'}}>
                          {(listing.photos?.length > 0)
                            ? <img src={listing.photos[0]} alt={listing.title} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                            : <Home size={40} color="var(--teal)" opacity={0.3}/>
                          }
                          <span style={{position:'absolute', top:10, right:10, padding:'4px 10px', borderRadius:20, background:cfg.bg, color:cfg.color, fontSize:11, fontWeight:600, display:'flex', alignItems:'center', gap:4}}>
                            <cfg.Icon size={11}/>{cfg.label}
                          </span>
                        </div>
                        <div style={{padding:'16px 18px'}}>
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6}}>
                            <p style={{fontWeight:600, fontSize:15, flex:1, minWidth:0}}>{listing.title || 'Room'}</p>
                            {app.match_score && (
                              <span style={{fontSize:16, fontWeight:800, color: app.match_score>=80?'var(--green)':app.match_score>=60?'var(--gold)':'var(--red)', marginLeft:8, whiteSpace:'nowrap'}}>{app.match_score}%</span>
                            )}
                          </div>
                          <p style={{fontSize:13, color:'var(--gray-500)', display:'flex', alignItems:'center', gap:4, marginBottom:8}}>
                            <MapPin size={11}/>{listing.city || '—'}
                          </p>
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <span style={{fontWeight:700, color:'var(--teal)', fontSize:16}}>{listing.price?.toLocaleString()} <span style={{fontSize:11, color:'var(--gray-400)', fontWeight:400}}>ETB/mo</span></span>
                            <div style={{display:'flex', gap:6}}>
                              <Link to={`/listing/${listing.id}`} className="btn btn-outline btn-sm" style={{fontSize:11}}>View</Link>
                              {app.status==='accepted' && (
                                <Link to={agreementLink} className="btn btn-primary btn-sm" style={{fontSize:11, whiteSpace:'nowrap'}}><FileText size={11}/> Sign</Link>
                              )}
                            </div>
                          </div>
                          {app.interview_at && (
                            <div style={{marginTop:10, padding:'8px 10px', background:'#EDE9FE', borderRadius:8, display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#7C3AED'}}>
                              <Calendar size={13}/>Interview: <strong>{new Date(app.interview_at).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</strong>
                            </div>
                          )}
                          <p style={{fontSize:11, color:'var(--gray-400)', marginTop:8}}>Applied {app.created_at ? new Date(app.created_at).toLocaleDateString() : '—'}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: My Group */}
            <div style={{flex:1, minWidth:0, paddingLeft:24}}>
              <h2 style={{fontSize:18, fontWeight:600, marginBottom:20}}>My Group</h2>
              {loading ? (
                <div style={{background:'white', borderRadius:12, height:200, border:'1px solid var(--gray-100)', animation:'pulse 1.5s infinite'}}/>
              ) : myGroups.length > 0 ? (
                <div style={{display:'flex', flexDirection:'column', gap:12}}>
                  {myGroups.map(g => (
                    <div key={g.id} style={{background:'white', borderRadius:14, border:'1px solid var(--gray-100)', padding:18, position:'relative'}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10}}>
                        <div>
                          <p style={{fontWeight:700, fontSize:15, fontFamily:'var(--font-head)', marginBottom:2}}>{g.name}</p>
                          <p style={{fontSize:12, color:'var(--gray-500)'}}>{g.member_count || 1}/{g.max_members || 4} members{g.is_full ? ' · Full' : ''}</p>
                        </div>
                        <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4}}>
                          {g.is_full ? (
                            <span style={{fontSize:10, background:'var(--green-light)', color:'var(--green)', padding:'3px 8px', borderRadius:8, fontWeight:700}}>READY</span>
                          ) : (
                            <span style={{fontSize:10, background:'var(--gold-light)', color:'var(--gold)', padding:'3px 8px', borderRadius:8, fontWeight:700}}>FORMING</span>
                          )}
                          {pendingRequests.length > 0 && (
                            <span style={{fontSize:10, background:'#EDE9FE', color:'#7C3AED', padding:'3px 8px', borderRadius:8, fontWeight:700}}>{pendingRequests.length} pending</span>
                          )}
                        </div>
                      </div>
                      {pendingRequests.length > 0 && (
                        <div style={{marginBottom:10}}>
                          <p style={{fontSize:11, fontWeight:600, color:'var(--gray-500)', marginBottom:6}}>Join Requests</p>
                          <div style={{display:'flex', flexDirection:'column', gap:6}}>
                            {pendingRequests.map(req => (
                              <div key={req.id} style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 8px', borderRadius:8, background:'var(--gray-50)'}}>
                                <div style={{display:'flex', alignItems:'center', gap:8}}>
                                  <div style={{width:24, height:24, borderRadius:'50%', background:'var(--gray-200)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'var(--gray-600)', flexShrink:0}}>
                                    {(req.name || '?')[0]}
                                  </div>
                                  <span style={{fontSize:12, fontWeight:500}}>{req.name}</span>
                                </div>
                                <div style={{display:'flex', gap:4}}>
                                  <button onClick={async ()=>{
                                    try { await housemateAPI.handleGroupRequest(g.id, req.id, 'accept'); setPendingRequests(prev => prev.filter(r => r.id !== req.id)); } catch(e){ alert(e.message); }
                                  }} style={{width:24,height:24,borderRadius:6,border:'none',background:'var(--green-light)',color:'var(--green)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                    <CheckCircle size={12}/>
                                  </button>
                                  <button onClick={async ()=>{
                                    try { await housemateAPI.handleGroupRequest(g.id, req.id, 'reject'); setPendingRequests(prev => prev.filter(r => r.id !== req.id)); } catch(e){ alert(e.message); }
                                  }} style={{width:24,height:24,borderRadius:6,border:'none',background:'var(--red-light)',color:'var(--red)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                    <XCircle size={12}/>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <Link to="/housemate-group" className="btn btn-outline btn-sm" style={{width:'100%', justifyContent:'center', fontSize:12}}>Manage Group</Link>
                      {multiRoomListings.length > 0 && (
                        <div style={{marginTop:14}}>
                          <p style={{fontSize:12, fontWeight:600, color:'var(--gray-500)', marginBottom:8}}>Available apartments</p>
                          <div style={{display:'flex', flexDirection:'column', gap:8}}>
                            {multiRoomListings.map(l => (
                              <div key={l.id} style={{display:'flex', gap:10, padding:10, borderRadius:10, background:'var(--gray-50)', border:'1px solid var(--gray-100)'}}>
                                <div style={{width:44, height:44, borderRadius:8, background:'var(--teal-light)', flexShrink:0, overflow:'hidden'}}>
                                  {l.photos?.[0]
                                    ? <img src={l.photos[0]} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                                    : <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',fontSize:20,color:'var(--teal)'}}>🏠</div>
                                  }
                                </div>
                                <div style={{flex:1, minWidth:0}}>
                                  <p style={{fontWeight:600, fontSize:12, marginBottom:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{l.title}</p>
                                  <p style={{fontSize:11, color:'var(--gray-500)', marginBottom:2}}>{l.city}{l.neighborhood ? `, ${l.neighborhood}` : ''}</p>
                                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                    <span style={{fontWeight:700, fontSize:13, color:'var(--teal)'}}>{l.price?.toLocaleString()} ETB</span>
                                    <span style={{fontSize:10, padding:'1px 6px', borderRadius:8, background:'var(--teal-light)', color:'var(--teal)', fontWeight:600}}>{l.open_slots} slots</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <Link to="/housemate-multi-room" style={{fontSize:12, color:'var(--teal)', fontWeight:500, display:'block', textAlign:'center', marginTop:8}}>Browse all →</Link>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : publicGroups.length > 0 ? (
                <div style={{display:'flex', flexDirection:'column', gap:10}}>
                  <p style={{fontSize:13, color:'var(--gray-500)', marginBottom:4}}>Groups looking for members:</p>
                  {publicGroups.slice(0, 5).map(g => (
                    <div key={g.id} style={{background:'white', borderRadius:12, border:'1px solid var(--gray-100)', padding:14, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <div style={{minWidth:0, flex:1}}>
                        <p style={{fontWeight:600, fontSize:14, marginBottom:2}}>{g.name}</p>
                        <p style={{fontSize:12, color:'var(--gray-500)'}}>{g.member_count}/{g.max_members} · {g.owner_name || 'Unknown'}</p>
                        {g.compatibility_pct && (
                          <span style={{fontSize:14, fontWeight:800, color: g.compatibility_pct>=80?'var(--green)':g.compatibility_pct>=60?'var(--gold)':'var(--red)'}}>{g.compatibility_pct}%</span>
                        )}
                      </div>
                      <button
                        onClick={async ()=>{
                          try {
                            await housemateAPI.requestJoinGroup(g.id);
                            alert(`Request sent to join ${g.name}!`);
                          } catch(e){
                            alert(e.response?.data?.error || 'Failed to send request');
                          }
                        }}
                        style={{fontSize:11, fontWeight:600, padding:'6px 12px', borderRadius:8, border:'1.5px solid var(--teal)', color:'var(--teal)', background:'transparent', cursor:'pointer', whiteSpace:'nowrap', marginLeft:8, flexShrink:0}}>
                        Request to Join
                      </button>
                    </div>
                  ))}
                  <Link to="/find-group" style={{fontSize:13, color:'var(--teal)', fontWeight:500, textAlign:'center', marginTop:4}}>Browse all groups →</Link>
                </div>
              ) : (
                <div style={{background:'white', borderRadius:12, border:'1px solid var(--gray-100)', padding:24, textAlign:'center'}}>
                  <Users size={32} style={{margin:'0 auto 8px', opacity:0.3, color:'var(--gray-400)'}}/>
                  <p style={{fontSize:14, color:'var(--gray-500)', marginBottom:12}}>You're not in a group yet</p>
                  <Link to="/housemate-group" className="btn btn-primary btn-sm">Create a Group</Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Saved tab */}
        {tab==='saved' && (
          <div>
            <h2 style={{fontSize:18, fontWeight:600, marginBottom:20}}>Saved Rooms</h2>
            {savedListings.length === 0 ? (
              <div style={{textAlign:'center', padding:'60px 0', color:'var(--gray-400)'}}>
                <Bookmark size={40} style={{margin:'0 auto 12px', opacity:0.3}}/>
                <p>No saved rooms yet</p>
                <Link to="/browse" className="btn btn-primary" style={{marginTop:16}}>Browse Rooms</Link>
              </div>
            ) : (
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
                {savedListings.map(s => {
                  const room = s.listings || s;
                  return (
                  <div key={s.id} style={{background:'white', borderRadius:12, border:'1px solid var(--gray-100)', overflow:'hidden'}}>
                    <div style={{height:140, background:'var(--teal-light)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden'}}>
                      {room.photos?.length > 0
                        ? <img src={room.photos[0]} alt={room.title} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                        : <Home size={40} color="var(--teal)" opacity={0.3}/>
                      }
                    </div>
                    <div style={{padding:'16px 18px'}}>
                      <p style={{fontWeight:600, marginBottom:4}}>{room.title}</p>
                      <p style={{fontSize:13, color:'var(--gray-500)', marginBottom:12, display:'flex', alignItems:'center', gap:4}}><MapPin size={12}/>{room.city}{room.neighborhood ? `, ${room.neighborhood}` : ''}</p>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <span style={{fontWeight:700, color:'var(--teal)'}}>{room.price?.toLocaleString()} ETB/mo</span>
                        <Link to={`/listing/${room.id}`} className="btn btn-outline btn-sm">View</Link>
                      </div>
                    </div>
                  </div>
                )})}
              </div>
            )}
          </div>
        )}

        {/* Profile tab */}
        {tab==='profile' && (
          <div style={{maxWidth:580}}>
            <h2 style={{fontSize:18, fontWeight:600, marginBottom:20}}>My Profile</h2>
            <div style={{background:'white', borderRadius:12, padding:28, border:'1px solid var(--gray-100)'}}>
              <div style={{display:'flex', gap:20, alignItems:'center', marginBottom:24}}>
                <div style={{width:72, height:72, borderRadius:'50%', background:'var(--teal)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, fontWeight:700}}>{user?.name?.charAt(0)}</div>
                <div>
                  <h3 style={{fontSize:20, fontWeight:700}}>{user?.name}</h3>
                  <p style={{color:'var(--gray-500)', fontSize:14}}>{user?.email}</p>
                  <span className="badge badge-teal" style={{marginTop:6}}>✓ Active Seeker</span>
                </div>
              </div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14}}>
                {[['Role','Room Seeker'],['Budget', user?.budget_min && user?.budget_max ? `${user.budget_min}–${user.budget_max} ETB` : '—'],['Location', user?.city || '—'],['Move-in', user?.move_in_date || '—'],['Occupation', user?.occupation || '—'],['Sleep Schedule', user?.sleep_schedule || '—']].map(([k,v]) => (
                  <div key={k} style={{padding:'12px 14px', borderRadius:10, background:'var(--gray-50)'}}>
                    <p style={{fontSize:12, color:'var(--gray-400)', marginBottom:3}}>{k}</p>
                    <p style={{fontWeight:500, fontSize:14}}>{v}</p>
                  </div>
                ))}
              </div>
              <div style={{marginTop:20}}><Link to="/seeker-form" className="btn btn-outline">Edit Profile</Link></div>
            </div>
          </div>
        )}

        {/* Subscription tab */}
        {tab==='subscription' && (
          <div style={{maxWidth:520}}>
            <h2 style={{fontSize:18, fontWeight:600, marginBottom:20}}>Subscription</h2>
            <div style={{background:'white', borderRadius:12, padding:28, border:'1px solid var(--gray-100)'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
                <div>
                  <p style={{fontWeight:600, fontSize:16}}>
                    {subscription?.plan_tier ? `${subscription.plan_tier.charAt(0).toUpperCase() + subscription.plan_tier.slice(1)} Plan` : 'Monthly Plan'}
                  </p>
                  <p style={{color:'var(--gray-500)', fontSize:13}}>
                    {subscription?.max_applies >= 999 ? 'Unlimited applications' : `Up to ${subscription?.max_applies || 5} applications`}
                  </p>
                  {subscription?.max_groups !== undefined && (
                    <p style={{color:'var(--teal)', fontSize:12, fontWeight:600, marginTop:2}}>
                      {subscription.max_groups === 0 ? 'Cannot create groups' : `Create up to ${subscription.max_groups} group${subscription.max_groups > 1 ? 's' : ''}`}
                      {subscription?.max_group_applies > 0 && ` · Apply to ${subscription.max_group_applies} groups`}
                    </p>
                  )}
                </div>
                <span className="badge badge-green">{user?.subscribed ? 'Active' : 'Inactive'}</span>
              </div>
              {user?.subscribed && (
                <>
                  <div style={{height:8, borderRadius:8, background:'var(--gray-100)', overflow:'hidden', marginBottom:16}}>
                    <div style={{height:'100%', width:`${(daysLeft/30)*100}%`, background:'var(--teal)', borderRadius:8}}/>
                  </div>
                  <p style={{fontSize:14, color:'var(--gray-500)', marginBottom:12}}>{daysLeft} days remaining · Expires {expiryDate}</p>
                  {/* Apply usage bar */}
                  {subscription?.max_applies && subscription.max_applies < 999 && (
                    <div style={{marginBottom:12}}>
                      <p style={{fontSize:12, color:'var(--gray-500)', marginBottom:4}}>Application Usage</p>
                      <div style={{height:8, borderRadius:8, background:'var(--gray-100)', overflow:'hidden'}}>
                        <div style={{height:'100%', width:`${Math.min(100, ((subscription?.applies_used || 0) / subscription.max_applies) * 100)}%`, background: (subscription?.applies_used || 0) >= subscription.max_applies ? 'var(--red)' : 'var(--teal)', borderRadius:8}}/>
                      </div>
                      <p style={{fontSize:11, color:'var(--gray-400)', marginTop:2}}>{subscription?.applies_used || 0} / {subscription.max_applies} room applications</p>
                    </div>
                  )}
                  {subscription?.max_group_applies > 0 && (
                    <div style={{marginBottom:12}}>
                      <p style={{fontSize:12, color:'var(--gray-500)', marginBottom:4}}>Group Join Requests</p>
                      <div style={{height:8, borderRadius:8, background:'var(--gray-100)', overflow:'hidden'}}>
                        <div style={{height:'100%', width:`${Math.min(100, ((subscription?.group_applies_used || 0) / subscription.max_group_applies) * 100)}%`, background: (subscription?.group_applies_used || 0) >= subscription.max_group_applies ? 'var(--red)' : 'var(--gold)', borderRadius:8}}/>
                      </div>
                      <p style={{fontSize:11, color:'var(--gray-400)', marginTop:2}}>{subscription?.group_applies_used || 0} / {subscription.max_group_applies} group requests</p>
                    </div>
                  )}
                  {subscription?.max_groups > 0 && (
                    <div style={{marginBottom:12}}>
                      <p style={{fontSize:12, color:'var(--gray-500)', marginBottom:4}}>Groups Created</p>
                      <div style={{height:8, borderRadius:8, background:'var(--gray-100)', overflow:'hidden'}}>
                        <div style={{height:'100%', width:`${Math.min(100, ((subscription?.groups_used || 0) / subscription.max_groups) * 100)}%`, background: (subscription?.groups_used || 0) >= subscription.max_groups ? 'var(--red)' : 'var(--teal)', borderRadius:8}}/>
                      </div>
                      <p style={{fontSize:11, color:'var(--gray-400)', marginTop:2}}>{subscription?.groups_used || 0} / {subscription.max_groups} groups</p>
                    </div>
                  )}
                </>
              )}
              <Link to="/payment" className="btn btn-primary w-full" style={{justifyContent:'center'}}>{user?.subscribed ? 'Upgrade / Renew' : 'Subscribe Now'}</Link>
            </div>
          </div>
        )}
      </main>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}
