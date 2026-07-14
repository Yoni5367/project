import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { applicationsAPI, listingsAPI, housemateAPI } from '../services/api';
import { ArrowLeft, Star, MapPin, Briefcase, Moon, Sparkles, Calendar, CheckCircle, XCircle, Clock, Phone, FileText, MessageSquare, Users, Home, Plus, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

const STATUS_CFG = {
  pending:     { label:'New',         bg:'var(--teal-light)',  color:'var(--teal)' },
  shortlist:   { label:'Shortlisted', bg:'#EDE9FE',            color:'#7C3AED' },
  shortlisted: { label:'Shortlisted', bg:'#EDE9FE',            color:'#7C3AED' },
  interview:   { label:'Interview',   bg:'var(--gold-light)',  color:'var(--gold)' },
  rejected:    { label:'Rejected',    bg:'var(--red-light)',   color:'var(--red)' },
  accepted:    { label:'Accepted',    bg:'var(--green-light)', color:'var(--green)' },
};

export default function ApplicantManagement() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isProvider = user?.role === 'provider';

  const [myListings, setMyListings] = useState([]);
  const [selectedListingId, setSelectedListingId] = useState('');
  const [applicants, setApplicants] = useState([]);
  const [groupApps, setGroupApps] = useState([]);
  const [loadingListings, setLoadingListings] = useState(isProvider);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showInterview, setShowInterview] = useState(false);
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  // Provider: fetch listings + applicants for selected listing
  // Seeker: fetch own applications
  useEffect(() => {
    if (isProvider) {
      const fetchListings = async () => {
        try {
          const data = await listingsAPI.mine();
          const listings = Array.isArray(data) ? data : (data.listings || []);
          setMyListings(listings);
          if (listings.length > 0) {
            setSelectedListingId(listings[0].id);
          } else {
            setLoading(false);
          }
        } catch (err) {
          console.error('Failed to load listings:', err);
          setApiError('Listings fetch: ' + err.message);
          setLoading(false);
        } finally {
          setLoadingListings(false);
        }
      };
      // Fetch group applications for provider's listings
      try {
        housemateAPI.getGroupApplications().then(res => {
          setGroupApps(res.applications || []);
        }).catch(() => {});
      } catch {}
      fetchListings();
    } else {
      const fetchMyApps = async () => {
        try {
          const data = await applicationsAPI.mine();
          const raw = data.applications || data.apps || [];
          setApplicants(raw.map(a => {
            const l = a.listings || a.listing || {};
            return {
              id: a.id,
              listing_id: a.listing_id,
              listing_title: l.title || '',
              listing_price: l.price,
              listing_city: l.city,
              listing_photo: l.photos?.[0],
              status: a.status,
              match_score: a.match_score,
              interview_at: a.interview_at,
              applied_at: a.created_at,
              updated_at: a.updated_at,
            };
          }));
        } catch (err) {
          console.error('Failed to load applications:', err);
          setApiError('Applications fetch: ' + err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchMyApps();
    }
  }, [isProvider]);

  // Provider: fetch applicants when listing selection changes
  useEffect(() => {
    if (!isProvider) return;
    if (!selectedListingId) { setLoading(false); return; }
    const fetchApplicants = async () => {
      setLoading(true);
      setSelected(null);
      setApiError('');
      try {
        const data = await applicationsAPI.forListing(selectedListingId);
        const raw = Array.isArray(data) ? data : (data.applicants || data.applications || []);
        setApplicants(raw.map(a => {
          const u = a.users || a.seeker || {};
          return {
            ...a,
            id: a.id,
            name: u.name || a.name || a.full_name || 'Applicant',
            age: u.age || a.age,
            gender: u.gender || a.gender,
            occupation: u.occupation || a.occupation,
            budget_min: u.budget_min || a.budget_min,
            budget_max: u.budget_max || a.budget_max,
            bio: u.intro || u.bio || a.bio,
            match_score: a.match_score,
            applied_at: a.created_at,
            phone: u.phone,
            smoking: u.smoking,
            drinking: u.drinking,
            pets: u.pets,
            sleep_schedule: u.sleep_schedule,
            cleanliness: u.cleanliness,
            interview_date: a.interview_at,
            status: a.status,
          };
        }));
      } catch (err) {
        console.error('Failed to load applicants:', err);
        setApiError('Applicants fetch: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchApplicants();
  }, [selectedListingId, isProvider]);

  const update = (id, patch) => setApplicants(prev => prev.map(a => a.id===id ? {...a,...patch} : a));

  const handleReject = async (id) => {
    setActionLoading(true);
    try {
      await applicationsAPI.updateStatus(id, 'rejected');
      update(id, { status:'rejected' });
      if(selected===id) setSelected(null);
    } catch (err) { alert(err.message); } finally { setActionLoading(false); }
  };

  const handleShortlist = async (id) => {
    setActionLoading(true);
    try {
      await applicationsAPI.updateStatus(id, 'shortlisted');
      update(id, { status:'shortlisted' });
    } catch (err) { alert(err.message); } finally { setActionLoading(false); }
  };

  const handleInterview = async () => {
    if(!interviewDate || !interviewTime) return;
    setActionLoading(true);
    try {
      const scheduledAt = `${interviewDate}T${interviewTime}`;
      await applicationsAPI.scheduleInterview(selected, scheduledAt);
      update(selected, { status:'interview', interview_date:`${interviewDate} at ${interviewTime}` });
      setShowInterview(false);
    } catch (err) { alert(err.message); } finally { setActionLoading(false); }
  };

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      await applicationsAPI.updateStatus(selected, 'accepted');
      setApplicants(prev => prev.map(a => ({...a, status: a.id===selected ? 'accepted' : a.status==='accepted' ? a.status : 'rejected'})));
      setShowAcceptConfirm(false);
    } catch (err) { alert(err.message); } finally { setActionLoading(false); }
  };

  const filtered = filter==='all' ? applicants : applicants.filter(a=>a.status===filter);
  const selectedApplicant = applicants.find(a => a.id === selected);

  if (loading) {
    return (
      <div style={{paddingTop:70, minHeight:'100vh', background:'var(--cream)'}}>
        <div style={{maxWidth:1200, margin:'0 auto', padding:'36px 24px'}}>
          <div style={{height:40, background:'var(--gray-100)', borderRadius:8, width:'40%', marginBottom:32, animation:'pulse 1.5s infinite'}}/>
          {[1,2,3].map(i => <div key={i} style={{height:80, background:'var(--gray-100)', borderRadius:12, marginBottom:12, animation:'pulse 1.5s infinite'}}/>)}
        </div>
      </div>
    );
  }

  return (
    <div style={{paddingTop:70, minHeight:'100vh', background:'var(--cream)'}}>
      <div style={{maxWidth:1200, margin:'0 auto', padding:'36px 24px'}}>

        {/* Header */}
        <div style={{display:'flex', alignItems:'center', gap:16, marginBottom:28, flexWrap:'wrap'}}>
          <Link to="/dashboard" style={{display:'flex', alignItems:'center', gap:6, color:'var(--gray-500)', fontSize:14}}><ArrowLeft size={16}/> Back</Link>
          <div style={{flex:1}}>
            <h1 style={{fontSize:24, fontWeight:700}}>{isProvider ? 'Applicant Manager' : 'My Applications'}</h1>
            <p style={{fontSize:14, color:'var(--gray-500)'}}>{applicants.length} total</p>
          </div>
          <button onClick={() => window.location.reload()} className="btn btn-outline btn-sm" style={{marginRight:8}}>Refresh</button>
          {isProvider && (
            <div style={{position:'relative', minWidth:240}}>
              {loadingListings ? (
                <div style={{height:44, background:'var(--gray-100)', borderRadius:10, animation:'pulse 1.5s infinite'}}/>
              ) : myListings.length === 0 ? (
                <Link to="/provider-form" className="btn btn-gold btn-sm"><Plus size={14}/> Create Listing</Link>
              ) : (
                <select value={selectedListingId} onChange={e => setSelectedListingId(e.target.value)}
                  className="form-input form-select" style={{paddingRight:36, cursor:'pointer'}}>
                  {myListings.map(l => (
                    <option key={l.id} value={l.id}>{l.title || l.property_type} — {l.price?.toLocaleString()} ETB</option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {/* Error banner */}
        {apiError && (
          <div style={{background:'#FEE2E2', border:'1px solid #FCA5A5', borderRadius:10, padding:'12px 16px', marginBottom:16, fontSize:13, color:'#B91C1C'}}>
            <strong>Error:</strong> {apiError}
          </div>
        )}

        <div style={{display:'grid', gridTemplateColumns: selected ? '1fr 400px' : '1fr', gap:24}}>

          {/* Left — List */}
          <div>
            {/* Filter tabs */}
            <div style={{display:'flex', gap:8, marginBottom:20, flexWrap:'wrap'}}>
              {[['all','All'], ...(isProvider ? [['new','New']] : []), ['shortlisted','Shortlisted'], ['interview','Interview'], ['accepted','Accepted'], ['rejected','Rejected']].map(([key,label])=>(
                <button key={key} onClick={()=>setFilter(key)}
                  style={{padding:'6px 14px', borderRadius:20, fontSize:13, border:`1.5px solid ${filter===key?'var(--teal)':'var(--gray-200)'}`,
                    background: filter===key?'var(--teal-light)':'white', color: filter===key?'var(--teal)':'var(--gray-600)', cursor:'pointer', fontWeight:filter===key?600:400}}>
                  {label} {key==='all'?`(${applicants.length})`:''}
                </button>
              ))}
            </div>

            {/* Cards */}
            <div style={{display:'flex', flexDirection:'column', gap:12}}>
              {filtered.length === 0 ? (
                <div style={{textAlign:'center', padding:'60px 0', color:'var(--gray-400)'}}>
                  <Users size={40} style={{margin:'0 auto 12px', opacity:0.3}}/>
                  <p>{isProvider ? 'No applicants in this category' : 'You haven\'t applied to any rooms yet'}</p>
                  {!isProvider && <Link to="/browse" className="btn btn-primary" style={{marginTop:16}}><Eye size={15}/> Browse Rooms</Link>}
                </div>
              ) : isProvider ? (
                /* Provider view — applicant cards with actions */
                filtered.map(a => {
                  const cfg = STATUS_CFG[a.status] || STATUS_CFG.pending;
                  const isSelected = selected===a.id;
                  return (
                    <div key={a.id} onClick={()=>setSelected(isSelected ? null : a.id)}
                      style={{background:'white', borderRadius:12, padding:'18px 20px', border:`2px solid ${isSelected?'var(--teal)':'var(--gray-100)'}`, cursor:'pointer', transition:'all 0.15s'}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                        <div style={{display:'flex', gap:14, alignItems:'center'}}>
                          <div style={{width:46, height:46, borderRadius:'50%', background:`${cfg.bg}`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:cfg.color, fontSize:18, flexShrink:0}}>
                            {a.name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p style={{fontWeight:600, fontSize:15}}>{a.name}</p>
                            <p style={{fontSize:13, color:'var(--gray-500)'}}>{a.gender ? `${a.gender}, ${a.age || '—'}` : '—'} · {a.occupation || '—'}</p>
                            <p style={{fontSize:12, color:'var(--gray-400)', marginTop:2}}>Budget: {a.budget_min && a.budget_max ? `${a.budget_min}–${a.budget_max} ETB` : '—'} · Applied {a.applied_at ? new Date(a.applied_at).toLocaleDateString() : '—'}</p>
                          </div>
                        </div>
                        <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8}}>
                          <div style={{textAlign:'center', background: a.match_score>=80?'var(--green-light)':a.match_score>=60?'var(--gold-light)':'var(--red-light)', padding:'6px 12px', borderRadius:10}}>
                            <p style={{fontSize:10, color:'var(--gray-500)'}}>Match</p>
                            <p style={{fontSize:20, fontWeight:800, color: a.match_score>=80?'var(--green)':a.match_score>=60?'var(--gold)':'var(--red)'}}>{a.match_score || '—'}%</p>
                          </div>
                          <span style={{padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600, background:cfg.bg, color:cfg.color}}>{cfg.label}</span>
                        </div>
                      </div>

                      {a.interview_date && (
                        <div style={{marginTop:12, padding:'8px 12px', background:'var(--gold-light)', borderRadius:8, display:'flex', alignItems:'center', gap:8, fontSize:13}}>
                          <Calendar size={14} color="var(--gold)"/><span>Interview: <strong>{new Date(a.interview_date).toLocaleString()}</strong></span>
                        </div>
                      )}

                      {a.status!=='accepted' && a.status!=='rejected' && (
                        <div style={{display:'flex', gap:8, marginTop:14}} onClick={e=>e.stopPropagation()}>
                          {a.status!=='shortlisted' && a.status!=='shortlist' && (
                            <button onClick={()=>handleShortlist(a.id)} disabled={actionLoading} className="btn btn-sm" style={{background:'#EDE9FE',color:'#7C3AED',border:'none',fontSize:12}}>
                              <Star size={12}/> Shortlist
                            </button>
                          )}
                          <button onClick={()=>{setSelected(a.id);setShowInterview(true);}} disabled={actionLoading} className="btn btn-sm btn-outline" style={{fontSize:12}}>
                            <Calendar size={12}/> Interview
                          </button>
                          <button onClick={()=>{setSelected(a.id);setShowAcceptConfirm(true);}} disabled={actionLoading} className="btn btn-sm" style={{fontSize:12, background:'var(--green-light)', color:'var(--green)', border:'none'}}>
                            <CheckCircle size={12}/> Accept
                          </button>
                          <button onClick={()=>handleReject(a.id)} disabled={actionLoading} className="btn btn-sm" style={{fontSize:12, background:'var(--red-light)', color:'var(--red)', border:'none'}}>
                            <XCircle size={12}/> Reject
                          </button>
                        </div>
                      )}
                      {a.status==='accepted' && (
                        <div style={{marginTop:12, padding:'8px 12px', background:'var(--green-light)', borderRadius:8, display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--green)'}}>
                          <CheckCircle size={14}/> Accepted — Contact info revealed
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                /* Seeker view — your applications with listing info */
                filtered.map(a => {
                  const cfg = STATUS_CFG[a.status] || STATUS_CFG.pending;
                  return (
                    <div key={a.id} style={{background:'white', borderRadius:12, padding:'18px 20px', border:'1px solid var(--gray-100)'}}>
                      <div style={{display:'flex', gap:16, alignItems:'center'}}>
                        {a.listing_photo
                          ? <img src={a.listing_photo} alt="" style={{width:72, height:72, borderRadius:10, objectFit:'cover', flexShrink:0}}/>
                          : <div style={{width:72, height:72, borderRadius:10, background:'var(--teal-light)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                              <Home size={28} color="var(--teal)" opacity={0.4}/>
                            </div>
                        }
                        <div style={{flex:1, minWidth:0}}>
                          <p style={{fontWeight:600, fontSize:15}}>{a.listing_title || 'Room'}</p>
                          <p style={{fontSize:13, color:'var(--gray-500)', display:'flex', alignItems:'center', gap:4}}>
                            {a.listing_city && <><MapPin size={11}/>{a.listing_city} ·</>} {a.listing_price?.toLocaleString()} ETB/mo
                          </p>
                          <p style={{fontSize:12, color:'var(--gray-400)', marginTop:2}}>Applied {a.applied_at ? new Date(a.applied_at).toLocaleDateString() : '—'}</p>
                        </div>
                        <div style={{textAlign:'right', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6}}>
                          <span style={{padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600, background:cfg.bg, color:cfg.color}}>{cfg.label}</span>
                          <Link to={`/listing/${a.listing_id}`} style={{fontSize:12, color:'var(--teal)'}}>View Room</Link>
                        </div>
                      </div>
                      {a.interview_at && (
                        <div style={{marginTop:12, padding:'8px 12px', background:'var(--gold-light)', borderRadius:8, display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--gold)'}}>
                          <Calendar size={14}/> Interview scheduled: <strong>{new Date(a.interview_at).toLocaleString()}</strong>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Group Applications (provider only) */}
            {isProvider && groupApps.length > 0 && (
              <div style={{marginTop:32}}>
                <h3 style={{fontSize:16, fontWeight:600, marginBottom:12, display:'flex', alignItems:'center', gap:8}}>
                  <Users size={18}/> Group Applications ({groupApps.length})
                </h3>
                <div style={{display:'flex', flexDirection:'column', gap:10}}>
                  {groupApps.map(app => {
                    const sc = app.status === 'accepted' ? {bg:'var(--green-light)',color:'var(--green)'}
                      : app.status === 'interview' ? {bg:'#EDE9FE',color:'#7C3AED'}
                      : {bg:'var(--teal-light)',color:'var(--teal)'};
                    return (
                      <div key={app.id} style={{background:'white', borderRadius:12, padding:'16px 20px', border:'1px solid var(--gray-100)'}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                          <div style={{display:'flex', alignItems:'center', gap:14}}>
                            <div style={{width:42, height:42, borderRadius:10, background:'var(--teal-light)', display:'flex', alignItems:'center', justifyContent:'center'}}>
                              <Users size={20} color="var(--teal)"/>
                            </div>
                            <div>
                              <p style={{fontWeight:600, fontSize:14}}>{app.group_name || 'Group'} <span style={{fontWeight:400, fontSize:12, color:'var(--gray-500)'}}>— {app.member_count} members</span></p>
                              <p style={{fontSize:12, color:'var(--gray-400)'}}>Applied to <strong>{app.listing_title}</strong> · {new Date(app.applied_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div style={{display:'flex', alignItems:'center', gap:10}}>
                            <span style={{padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600, background:sc.bg, color:sc.color, textTransform:'capitalize'}}>{app.status}</span>
                            {app.status === 'accepted' && (
                              <Link to={`/agreement?groupApplicationId=${app.id}`} style={{padding:'8px 16px', background:'var(--teal)', color:'white', borderRadius:8, textDecoration:'none', fontWeight:600, fontSize:12}}>
                                <FileText size={13}/> Agreement
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right — Detail Panel (provider only) */}
          {isProvider && selected && selectedApplicant && (
            <div style={{background:'white', borderRadius:16, border:'1px solid var(--gray-100)', padding:28, alignSelf:'start', position:'sticky', top:100}}>
              <div style={{textAlign:'center', marginBottom:24}}>
                <div style={{width:72, height:72, borderRadius:'50%', background:'var(--teal-light)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'var(--teal)', fontSize:28, margin:'0 auto 12px'}}>
                  {selectedApplicant.name?.charAt(0) || '?'}
                </div>
                <h3 style={{fontWeight:700, fontSize:18}}>{selectedApplicant.name}</h3>
                <p style={{color:'var(--gray-500)', fontSize:14}}>{selectedApplicant.occupation || '—'} · {selectedApplicant.age || '—'} yrs</p>
                <div style={{fontSize:32, fontWeight:800, color: selectedApplicant.match_score>=80?'var(--green)':selectedApplicant.match_score>=60?'var(--gold)':'var(--red)', marginTop:8}}>
                  {selectedApplicant.match_score || '—'}% <span style={{fontSize:14, color:'var(--gray-400)', fontWeight:400}}>match</span>
                </div>
              </div>

              <div style={{marginBottom:20}}>
                <p style={{fontSize:12, fontWeight:600, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10}}>Profile Details</p>
                {[['Budget', selectedApplicant.budget_min && selectedApplicant.budget_max ? `${selectedApplicant.budget_min}–${selectedApplicant.budget_max} ETB` : '—'],['Location', selectedApplicant.location || '—'],['Sleep', selectedApplicant.sleep_schedule || '—'],['Cleanliness', selectedApplicant.cleanliness || '—'],['Smoking', selectedApplicant.smoking || '—'],['Drinking', selectedApplicant.drinking || '—'],['Pets', selectedApplicant.pets || '—']].map(([k,v])=>(
                  <div key={k} style={{display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--gray-50)', fontSize:14}}>
                    <span style={{color:'var(--gray-500)'}}>{k}</span><span style={{fontWeight:500}}>{v}</span>
                  </div>
                ))}
              </div>

              {selectedApplicant.bio && (
                <div style={{marginBottom:20, padding:'14px', background:'var(--gray-50)', borderRadius:10}}>
                  <p style={{fontSize:12, fontWeight:600, color:'var(--gray-400)', marginBottom:6}}>INTRODUCTION</p>
                  <p style={{fontSize:13, color:'var(--gray-600)', lineHeight:1.6}}>{selectedApplicant.bio}</p>
                </div>
              )}

              {selectedApplicant.status==='accepted' && selectedApplicant.phone && (
                <div style={{marginBottom:16, padding:'14px', background:'var(--green-light)', borderRadius:10}}>
                  <p style={{fontSize:12, fontWeight:600, color:'var(--green)', marginBottom:4}}>CONTACT REVEALED</p>
                  <p style={{fontSize:15, fontWeight:600, display:'flex', alignItems:'center', gap:8}}><Phone size={15}/>{selectedApplicant.phone}</p>
                </div>
              )}

              {selectedApplicant.status!=='accepted' && selectedApplicant.status!=='rejected' && (
                <div style={{display:'flex', flexDirection:'column', gap:8}}>
                  <button onClick={()=>setShowInterview(true)} disabled={actionLoading} className="btn btn-outline w-full" style={{justifyContent:'center'}}>
                    <Calendar size={15}/> Request Interview
                  </button>
                  <button onClick={()=>setShowAcceptConfirm(true)} disabled={actionLoading} className="btn btn-success w-full" style={{justifyContent:'center'}}>
                    <CheckCircle size={15}/> Accept This Applicant
                  </button>
                  <button onClick={()=>handleReject(selectedApplicant.id)} disabled={actionLoading} className="btn btn-danger w-full" style={{justifyContent:'center'}}>
                    <XCircle size={15}/> Reject
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Interview Modal */}
      {showInterview && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:500}}>
          <div style={{background:'white', borderRadius:16, padding:32, width:440, boxShadow:'0 24px 64px rgba(0,0,0,0.2)'}}>
            <h3 style={{fontSize:20, fontWeight:700, marginBottom:6}}>Schedule Interview</h3>
            <p style={{color:'var(--gray-500)', fontSize:14, marginBottom:24}}>The applicant will be notified with the selected time.</p>
            <div className="form-group">
              <label className="form-label">Interview Date</label>
              <input type="date" className="form-input" value={interviewDate} onChange={e=>setInterviewDate(e.target.value)}/>
            </div>
            <div className="form-group">
              <label className="form-label">Interview Time</label>
              <input type="time" className="form-input" value={interviewTime} onChange={e=>setInterviewTime(e.target.value)}/>
            </div>
            <div style={{display:'flex', gap:10}}>
              <button onClick={()=>setShowInterview(false)} className="btn btn-outline" style={{flex:1, justifyContent:'center'}} disabled={actionLoading}>Cancel</button>
              <button onClick={handleInterview} disabled={actionLoading} className="btn btn-primary" style={{flex:1, justifyContent:'center'}}>{actionLoading ? 'Scheduling...' : 'Confirm & Notify'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Accept Confirm Modal */}
      {showAcceptConfirm && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:500}}>
          <div style={{background:'white', borderRadius:16, padding:32, width:440}}>
            <h3 style={{fontSize:20, fontWeight:700, marginBottom:8}}>Accept {selectedApplicant?.name}?</h3>
            <p style={{color:'var(--gray-500)', fontSize:14, marginBottom:20}}>This will automatically:</p>
            <div style={{display:'flex', flexDirection:'column', gap:8, marginBottom:24}}>
              {['Reveal your phone number to this applicant','Send rejection emails to all other applicants','Generate a housemate agreement PDF','Mark your listing as Filled'].map(item=>(
                <div key={item} style={{display:'flex', alignItems:'center', gap:10, fontSize:14}}>
                  <CheckCircle size={15} color="var(--green)"/>{item}
                </div>
              ))}
            </div>
            <div style={{display:'flex', gap:10}}>
              <button onClick={()=>setShowAcceptConfirm(false)} className="btn btn-outline" style={{flex:1, justifyContent:'center'}} disabled={actionLoading}>Cancel</button>
              <button onClick={handleAccept} disabled={actionLoading} className="btn btn-success" style={{flex:1, justifyContent:'center'}}>{actionLoading ? 'Processing...' : 'Yes, Accept'}</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}
