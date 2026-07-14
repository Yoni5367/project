import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { listingsAPI, applicationsAPI, paymentsAPI, housemateAPI } from '../services/api';
import { Home, Users, Settings, LogOut, Plus, CheckCircle, CreditCard, MapPin, TrendingUp, Sparkles, FileText, MessageSquare, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

export default function ProviderDashboard() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [listings, setListings] = useState([]);
  const [recentApplicants, setRecentApplicants] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  // Group applications state
  const [groupApps, setGroupApps] = useState([]);
  const [memberMap, setMemberMap] = useState({});
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [showInterview, setShowInterview] = useState(false);
  const [selectedGroupApp, setSelectedGroupApp] = useState(null);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [listingsRes, subRes, groupRes] = await Promise.allSettled([
          listingsAPI.mine(),
          paymentsAPI.status(),
          housemateAPI.getGroupApplications(),
        ]);
        if (listingsRes.status === 'fulfilled') {
          const val = listingsRes.value;
          const data = Array.isArray(val) ? val : (val.listings || []);
          setListings(data);
          const allApplicants = [];
          for (const listing of data) {
            const appsRes = await applicationsAPI.forListing(listing.id).catch(() => ({}));
            const raw = Array.isArray(appsRes) ? appsRes : (appsRes.applicants || appsRes.applications || []);
            raw.forEach(a => {
              const u = a.users || a.seeker || {};
              allApplicants.push({
                ...a,
                listing_title: listing.title,
                listing_id: listing.id,
                name: u.name || a.name || a.full_name || 'Applicant',
                age: u.age || a.age,
                occupation: u.occupation || a.occupation,
                match_score: a.match_score,
                applied_at: a.created_at,
              });
            });
          }
          setRecentApplicants(allApplicants.slice(0, 5));
        }
        if (subRes.status === 'fulfilled') setSubscription(subRes.value.subscription || subRes.value);

        // Handle group applications
        if (groupRes.status === 'fulfilled') {
          const apps = groupRes.value.applications || [];
          setGroupApps(apps);

          const mm = {};
          for (const app of apps) {
            const gid = app.housemate_groups?.id || app.group_id;
            if (gid) {
              try {
                const mRes = await housemateAPI.getGroupMembers(gid);
                mm[gid] = mRes.members || [];
              } catch {}
            }
          }
          setMemberMap(mm);
        }
      } catch {} finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleGroupDecision = async (appId, status) => {
    if (!window.confirm(`${status === 'accepted' ? 'Accept' : 'Reject'} this entire group? This cannot be undone.`)) return;
    setActionLoading(appId);
    try {
      await housemateAPI.updateGroupAppStatus(appId, status);
      alert(`Group application ${status}.`);
      if (status === 'accepted') {
        setGroupApps(prev => prev.map(a => a.id === appId ? { ...a, status: 'accepted' } : a));
      } else {
        setGroupApps(prev => prev.filter(a => a.id !== appId));
      }
    } catch (e) { alert(e.message); }
    finally { setActionLoading(null); }
  };

  const handleGroupInterview = async () => {
    if (!interviewDate || !interviewTime) return;
    setActionLoading(selectedGroupApp);
    try {
      const scheduledAt = `${interviewDate}T${interviewTime}`;
      await housemateAPI.scheduleGroupInterview(selectedGroupApp, scheduledAt);
      setGroupApps(prev => prev.map(a => a.id === selectedGroupApp ? { ...a, status: 'interview', interview_at: scheduledAt } : a));
      setShowInterview(false);
      setSelectedGroupApp(null);
      setInterviewDate('');
      setInterviewTime('');
    } catch (e) { alert(e.message); }
    finally { setActionLoading(null); }
  };

  const daysLeft = subscription?.days_left || 18;
  const hasAccepted = recentApplicants.some(a => a.status === 'accepted');
  const acceptedAppId = recentApplicants.find(a => a.status === 'accepted')?.id || '';
  const agreementLink = acceptedAppId ? `/agreement?applicationId=${acceptedAppId}` : '/agreement';

  const navItems = [
    { key:'overview',    label:'Overview',      Icon: TrendingUp },
    { key:'listings',    label:'My Listings',   Icon: Home },
    { key:'applicants',  label:'Applicants',    Icon: Users },
    { key:'subscription',label:'Subscription',  Icon: CreditCard },
  ];

  const activeListings = listings.filter(l => l.status === 'active').length;
  const totalApplicants = listings.reduce((sum, l) => {
    if (Array.isArray(l.applications)) return sum + (l.applications[0]?.count || 0);
    if (typeof l.applications === 'number') return sum + l.applications;
    return sum;
  }, 0);

  const statusCfg = (s) => {
    if (s === 'interview') return { bg: '#EDE9FE', color: '#7C3AED' };
    if (s === 'accepted') return { bg: 'var(--green-light)', color: 'var(--green)' };
    if (s === 'rejected') return { bg: 'var(--red-light)', color: 'var(--red)' };
    return { bg: '#FEF3C7', color: '#D97706' };
  };

  return (
    <div style={{paddingTop:70, minHeight:'100vh', background:'var(--cream)', display:'flex'}}>

      {/* Sidebar */}
      <aside style={{width:240, background:'white', borderRight:'1px solid var(--gray-100)', padding:'32px 0', display:'flex', flexDirection:'column', position:'sticky', top:70, height:'calc(100vh - 70px)'}}>
        <div style={{padding:'0 20px 24px', borderBottom:'1px solid var(--gray-100)', marginBottom:16}}>
          <div style={{width:52, height:52, borderRadius:'50%', background:'var(--gold)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:700, marginBottom:10}}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <p style={{fontWeight:600, fontSize:15}}>{user?.name}</p>
          <p style={{fontSize:12, color:'var(--gray-400)'}}>{user?.email}</p>
          <span style={{display:'inline-flex', alignItems:'center', gap:4, marginTop:8, fontSize:11, padding:'3px 8px', borderRadius:20, background:'var(--gold-light)', color:'var(--gold)', fontWeight:500}}>
            <Home size={10}/> Room Provider
          </span>
        </div>

        <nav style={{flex:1, padding:'0 12px'}}>
          {navItems.map(({key,label,Icon}) => (
            <button key={key} onClick={()=>setTab(key)}
              style={{width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8, border:'none', cursor:'pointer', marginBottom:4, textAlign:'left', fontSize:14, fontWeight:tab===key?600:400,
                background:tab===key?'var(--gold-light)':'transparent', color:tab===key?'var(--gold)':'var(--gray-600)'}}>
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

          <Link to={agreementLink} style={{textDecoration:'none'}}>
            <div style={{display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8, marginBottom:4, fontSize:14, fontWeight:500,
              color: hasAccepted ? 'white' : 'var(--teal)',
              background: hasAccepted ? 'var(--teal)' : 'var(--teal-light)',
              cursor:'pointer'}}>
              <FileText size={16}/>
              Agreement
              {hasAccepted && <span style={{marginLeft:'auto', fontSize:10, background:'var(--gold)', color:'white', padding:'2px 6px', borderRadius:10, fontWeight:700}}>ACTION</span>}
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
            <h1 style={{fontSize:26, fontWeight:700, fontFamily:'var(--font-head)', marginBottom:4}}>Welcome, {user?.name?.split(' ')[0]}</h1>
            <p style={{color:'var(--gray-500)'}}>Manage your listings and applicants</p>
          </div>
          <Link to="/provider-form" className="btn btn-gold"><Plus size={16}/> New Listing</Link>
        </div>

        {/* Agreement action banner */}
        {hasAccepted && (
          <div style={{background:'linear-gradient(135deg,var(--teal),#0A5C4F)', borderRadius:14, padding:'20px 24px', marginBottom:24, display:'flex', justifyContent:'space-between', alignItems:'center', color:'white'}}>
            <div style={{display:'flex', alignItems:'center', gap:12}}>
              <div style={{width:44, height:44, borderRadius:12, background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center'}}>
                <FileText size={22}/>
              </div>
              <div>
                <p style={{fontWeight:700, fontSize:16, marginBottom:2}}>Applicant accepted — agreement needed</p>
                <p style={{fontSize:13, opacity:0.85}}>Generate and sign the housemate agreement to complete the match.</p>
              </div>
            </div>
            <Link to={agreementLink} style={{background:'var(--gold)', color:'white', padding:'10px 20px', borderRadius:10, textDecoration:'none', fontWeight:600, fontSize:14, whiteSpace:'nowrap', flexShrink:0}}>
              Start Agreement →
            </Link>
          </div>
        )}

        {/* Subscription banner */}
        {user?.subscribed && (
          <div style={{background:'var(--gold-light)', border:'1px solid var(--gold-mid)', borderRadius:12, padding:'14px 20px', marginBottom:24, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <p style={{fontSize:14}}><strong>Subscription active</strong> — expires in {daysLeft} days</p>
            <Link to="/payment" style={{fontSize:13, color:'var(--gold)', fontWeight:500}}>Renew Early</Link>
          </div>
        )}

        {/* Stats */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:32}}>
          {[
            ['Active Listings', activeListings.toString(), 'var(--gold)', 'var(--gold-light)'],
            ['Total Applicants', totalApplicants.toString(), 'var(--teal)', 'var(--teal-light)'],
            ['Profile Views', '—', '#7C3AED', '#EDE9FE'],
            ['Filled Rooms', listings.filter(l => l.status === 'filled').length.toString(), 'var(--green)', 'var(--green-light)'],
          ].map(([label,val,color,bg]) => (
            <div key={label} style={{background:'white', borderRadius:12, padding:'20px', border:'1px solid var(--gray-100)'}}>
              <p style={{fontSize:13, color:'var(--gray-500)', marginBottom:8}}>{label}</p>
              <p style={{fontSize:32, fontWeight:800, color, fontFamily:'var(--font-head)'}}>{val}</p>
            </div>
          ))}
        </div>

        {/* Overview */}
        {tab==='overview' && (
          <div>
            <h2 style={{fontSize:18, fontWeight:600, marginBottom:16}}>Recent Applicants</h2>
            {loading ? (
              <div style={{background:'white', borderRadius:12, border:'1px solid var(--gray-100)', height:200, animation:'pulse 1.5s infinite'}}/>
            ) : totalApplicants === 0 && groupApps.length === 0 ? (
              <div style={{textAlign:'center', padding:'60px 0', color:'var(--gray-400)'}}>
                <Users size={40} style={{margin:'0 auto 12px', opacity:0.3}}/>
                <p>No applicants yet</p>
              </div>
            ) : (
              <div style={{background:'white', borderRadius:12, border:'1px solid var(--gray-100)', overflow:'hidden', marginBottom:20}}>
                {/* Individual applicants */}
                {recentApplicants.map((a,i) => (
                  <div key={a.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderBottom:i<recentApplicants.length-1 || groupApps.length>0?'1px solid var(--gray-50)':'none'}}>
                    <div style={{display:'flex', alignItems:'center', gap:14}}>
                      <div style={{width:40, height:40, borderRadius:'50%', background:'var(--teal-light)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'var(--teal)'}}>{a.name?.charAt(0) || '?'}</div>
                      <div>
                        <p style={{fontWeight:600, fontSize:14}}>{a.name || 'Applicant'}</p>
                        <p style={{fontSize:12, color:'var(--gray-400)'}}>{a.occupation || '—'} · {a.applied_at ? new Date(a.applied_at).toLocaleDateString() : '—'}</p>
                      </div>
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:12}}>
                      <p style={{fontSize:18, fontWeight:800, color:a.match_score>=80?'var(--green)':a.match_score>=60?'var(--gold)':'var(--red)'}}>{a.match_score || '—'}%</p>
                      <Link to="/applicants" className="btn btn-outline btn-sm">Review</Link>
                    </div>
                  </div>
                ))}

                {/* Group applicants */}
                {groupApps.map((app, gi) => {
                  const gid = app.housemate_groups?.id || app.group_id;
                  const members = memberMap[gid] || [];
                  const isExpanded = expandedGroup === app.id;
                  const sc = statusCfg(app.status);
                  return (
                  <div key={app.id}>
                    <div style={{display:'flex', alignItems:'center', padding:'16px 20px', borderBottom: gi < groupApps.length - 1 ? '1px solid var(--gray-50)' : 'none', cursor:'pointer', background: isExpanded ? 'var(--gray-50)' : 'white'}}
                      onClick={() => setExpandedGroup(isExpanded ? null : app.id)}>
                      <div style={{display:'flex', alignItems:'center', gap:14, flex:1}}>
                        <div style={{width:40, height:40, borderRadius:10, background:'var(--teal-light)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'var(--teal)', fontSize:13}}>
                          <Users size={18}/>
                        </div>
                        <div style={{flex:1}}>
                          <p style={{fontWeight:600, fontSize:14}}>{app.group_name || app.listing_title || 'Group'} <span style={{fontWeight:400, fontSize:12, color:'var(--gray-500)'}}>— Group of {app.member_count}</span></p>
                          <p style={{fontSize:12, color:'var(--gray-400)'}}>Applied {new Date(app.applied_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div style={{display:'flex', alignItems:'center', gap:8}}>
                        <span style={{padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600, background:sc.bg, color:sc.color, textTransform:'capitalize'}}>{app.status}</span>
                        {isExpanded ? <ChevronUp size={16} color="var(--gray-400)"/> : <ChevronDown size={16} color="var(--gray-400)"/>}
                      </div>
                    </div>

                    {/* Expanded group details */}
                    {isExpanded && (
                      <div style={{padding:'0 20px 16px', background:'var(--gray-50)'}}>
                        {/* Members */}
                        {members.length > 0 && (
                          <div style={{marginBottom:12}}>
                            <p style={{fontSize:11, fontWeight:600, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6}}>Group Members</p>
                            <div style={{display:'flex', flexDirection:'column', gap:4}}>
                              {members.map(m => (
                                <div key={m.id} style={{display:'flex', alignItems:'center', gap:8}}>
                                  <div style={{width:28, height:28, borderRadius:14, background:'#E6F4F1', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:600, fontSize:11, color:'#0E7C6B'}}>
                                    {(m.name || '?')[0]}
                                  </div>
                                  <span style={{fontSize:13, fontWeight:500}}>{m.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Interview badge */}
                        {app.interview_at && (
                          <div style={{marginBottom:12, padding:'8px 12px', background:'#EDE9FE', borderRadius:8, display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#7C3AED'}}>
                            <Calendar size={14}/> Interview: <strong>{new Date(app.interview_at).toLocaleString()}</strong>
                          </div>
                        )}

                        {/* Actions (pending only) */}
                        {app.status === 'pending' && (
                          <div style={{display:'flex', gap:8}}>
                            <button onClick={() => handleGroupDecision(app.id, 'accepted')} disabled={actionLoading === app.id} style={{flex:1, background:'#059669', color:'#fff', border:'none', padding:'8px', borderRadius:8, fontWeight:600, cursor:'pointer', fontSize:12, opacity:actionLoading===app.id?0.6:1}}>Accept Whole Group</button>
                            <button onClick={() => { setSelectedGroupApp(app.id); setShowInterview(true); }} disabled={actionLoading === app.id} style={{flex:1, background:'#7C3AED', color:'#fff', border:'none', padding:'8px', borderRadius:8, fontWeight:600, cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', gap:6, opacity:actionLoading===app.id?0.6:1}}><Calendar size={13}/> Interview</button>
                            <button onClick={() => handleGroupDecision(app.id, 'rejected')} disabled={actionLoading === app.id} style={{flex:1, background:'#fff', color:'#6B7280', border:'1px solid #D1D5DB', padding:'8px', borderRadius:8, fontWeight:600, cursor:'pointer', fontSize:12}}>Reject</button>
                          </div>
                        )}

                        {/* Accepted - Agreement link */}
                        {app.status === 'accepted' && (
                          <div>
                            <Link to={`/agreement?groupApplicationId=${app.id}`} style={{display:'inline-flex', alignItems:'center', gap:8, background:'var(--teal)', color:'white', padding:'10px 20px', borderRadius:10, textDecoration:'none', fontWeight:600, fontSize:13}}>
                              <FileText size={15}/> Start Agreement
                            </Link>
                          </div>
                        )}

                        {/* Interview - badge only */}
                        {app.status === 'interview' && (
                          <div style={{padding:'8px 12px', background:'#EDE9FE', borderRadius:8, fontSize:12, color:'#7C3AED', display:'flex', alignItems:'center', gap:6}}>
                            <Calendar size={14}/> Waiting for interview
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
            <Link to="/applicants" className="btn btn-primary">View All Applicants</Link>
          </div>
        )}

        {/* Listings */}
        {tab==='listings' && (
          <div>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:20}}>
              <h2 style={{fontSize:18, fontWeight:600}}>My Listings</h2>
              <Link to="/provider-form" className="btn btn-gold btn-sm"><Plus size={14}/> Add Listing</Link>
            </div>
            {listings.length === 0 ? (
              <div style={{textAlign:'center', padding:'60px 0', color:'var(--gray-400)'}}>
                <Home size={40} style={{margin:'0 auto 12px', opacity:0.3}}/>
                <p>No listings yet</p>
                <Link to="/provider-form" className="btn btn-gold" style={{marginTop:16}}>Create Your First Listing</Link>
              </div>
            ) : (
              <div style={{display:'flex', flexDirection:'column', gap:14}}>
                {listings.map(l => (
                  <div key={l.id} style={{background:'white', borderRadius:12, padding:'20px 24px', border:'1px solid var(--gray-100)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <div style={{display:'flex', gap:16, alignItems:'center'}}>
                      <div style={{width:48, height:48, borderRadius:10, background:'var(--gold-light)', display:'flex', alignItems:'center', justifyContent:'center'}}><Home size={22} color="var(--gold)"/></div>
                      <div>
                        <p style={{fontWeight:600, fontSize:15}}>{l.title}</p>
                        <p style={{fontSize:13, color:'var(--gray-500)', display:'flex', alignItems:'center', gap:4}}><MapPin size={12}/>{l.city}{l.neighborhood ? `, ${l.neighborhood}` : ''}</p>
                        <p style={{fontSize:12, color:'var(--gray-400)', marginTop:2}}>Posted {l.created_at ? new Date(l.created_at).toLocaleDateString() : '—'} · {l.views || 0} views</p>
                      </div>
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:14}}>
                      <span style={{fontWeight:700, color:'var(--teal)'}}>{l.price?.toLocaleString()} <span style={{fontSize:12, color:'var(--gray-400)', fontWeight:400}}>ETB/mo</span></span>
                      <div style={{textAlign:'center'}}><p style={{fontSize:11, color:'var(--gray-400)'}}>Applicants</p><p style={{fontSize:18, fontWeight:700, color:'var(--teal)'}}>{l.applications?.[0]?.count || 0}</p></div>
                      <span style={{padding:'5px 12px', borderRadius:20, fontSize:12, fontWeight:500, background:l.status==='active'?'var(--green-light)':'var(--gray-100)', color:l.status==='active'?'var(--green)':'var(--gray-500)'}}>{l.status}</span>
                      {l.status==='active' && <Link to="/applicants" className="btn btn-primary btn-sm">Applicants</Link>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab==='applicants' && (
          <div><h2 style={{fontSize:18, fontWeight:600, marginBottom:20}}>Applicants</h2><Link to="/applicants" className="btn btn-primary">Open Applicant Manager</Link></div>
        )}

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
                    {subscription?.max_rooms >= 999 ? 'Unlimited rooms' : `${subscription?.rooms_used || 0}/${subscription?.max_rooms || 1} rooms used`}
                  </p>
                </div>
                <span className="badge badge-green">{user?.subscribed ? 'Active' : 'Inactive'}</span>
              </div>
              {user?.subscribed && (
                <>
                  <div style={{height:8, borderRadius:8, background:'var(--gray-100)', overflow:'hidden', marginBottom:16}}>
                    <div style={{height:'100%', width:`${(daysLeft/30)*100}%`, background:'var(--gold)', borderRadius:8}}/>
                  </div>
                  <p style={{fontSize:14, color:'var(--gray-500)', marginBottom:12}}>{daysLeft} days remaining</p>
                  {subscription?.max_rooms && subscription.max_rooms < 999 && (
                    <div style={{marginBottom:16}}>
                      <p style={{fontSize:12, color:'var(--gray-500)', marginBottom:4}}>Room Usage</p>
                      <div style={{height:8, borderRadius:8, background:'var(--gray-100)', overflow:'hidden'}}>
                        <div style={{height:'100%', width:`${Math.min(100, ((subscription?.rooms_used || 0) / subscription.max_rooms) * 100)}%`, background: (subscription?.rooms_used || 0) >= subscription.max_rooms ? 'var(--red)' : 'var(--teal)', borderRadius:8}}/>
                      </div>
                      <p style={{fontSize:11, color:'var(--gray-400)', marginTop:2}}>{subscription?.rooms_used || 0} / {subscription.max_rooms} listings</p>
                    </div>
                  )}
                </>
              )}
              <Link to="/payment" className="btn btn-gold w-full" style={{justifyContent:'center'}}>{user?.subscribed ? 'Upgrade / Renew' : 'Subscribe Now'}</Link>
            </div>
          </div>
        )}
      </main>

      {/* Interview Modal */}
      {showInterview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, width: 440, boxShadow: '0 25px 50px rgba(0,0,0,0.15)' }}>
            <h3 style={{ margin: '0 0 8px', fontWeight: 700 }}>Schedule Group Interview</h3>
            <p style={{ color: '#6B7280', fontSize: 14, margin: '0 0 24px' }}>The group owner will be notified with the selected time.</p>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Date</label>
                <input type="date" value={interviewDate} onChange={e => setInterviewDate(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #D1D5DB', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Time</label>
                <input type="time" value={interviewTime} onChange={e => setInterviewTime(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #D1D5DB', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowInterview(false); setSelectedGroupApp(null); setInterviewDate(''); setInterviewTime(''); }} style={{ background: 'white', color: '#6B7280', border: '1px solid #D1D5DB', padding: '10px 24px', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              <button onClick={handleGroupInterview} disabled={!interviewDate || !interviewTime || actionLoading === selectedGroupApp} style={{ background: '#7C3AED', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 14, opacity: !interviewDate || !interviewTime ? 0.5 : 1 }}>{actionLoading === selectedGroupApp ? 'Scheduling...' : 'Confirm & Notify'}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}
