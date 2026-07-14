import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { housemateAPI, paymentsAPI } from '../services/api';
import { Users, UserPlus, CheckCircle, XCircle, Star, MapPin, Infinity } from 'lucide-react';

const SOC_LABELS = { very_social: 'Very Social', balanced: 'Balanced', prefers_quiet: 'Prefers Quiet' };
const SLEEP_LABELS = { early_bird: 'Early Bird', night_owl: 'Night Owl', flexible: 'Flexible' };
const CLEAN_LABELS = { tidy: 'Tidy', moderate: 'Moderate', relaxed: 'Relaxed' };
const GUEST_LABELS = { frequent: 'Frequent', occasional: 'Occasional', rarely: 'Rarely' };

const AVATAR_COLORS = ['#0E7C6B','#7C3AED','#C9970C','#DC2626','#2563EB','#DB2777','#059669','#D97706'];

function avatarColor(id) {
  let hash = 0;
  for (let i = 0; i < (id || '').length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function matchColor(pct) {
  if (pct === null || pct === undefined) return 'var(--gray-400)';
  if (pct >= 80) return 'var(--green)';
  if (pct >= 60) return 'var(--gold)';
  return 'var(--red)';
}
function matchBg(pct) {
  if (pct === null || pct === undefined) return 'var(--gray-50)';
  if (pct >= 80) return 'var(--green-light)';
  if (pct >= 60) return 'var(--gold-light)';
  return 'var(--red-light)';
}

export default function HousemateSuggestions() {
  const navigate = useNavigate();
  const [hasGroup, setHasGroup] = useState(null);
  const [groups, setGroups] = useState([]);
  const [seekers, setSeekers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [requestingJoin, setRequestingJoin] = useState(null);
  const [showIndividualSeekers, setShowIndividualSeekers] = useState(false);
  const [planTier, setPlanTier] = useState('basic');
  const [maxGroups, setMaxGroups] = useState(0);
  const [maxGroupApplies, setMaxGroupApplies] = useState(3);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [grpRes, subRes] = await Promise.allSettled([
          housemateAPI.myGroup(),
          paymentsAPI.status(),
        ]);
        if (grpRes.status === 'fulfilled') setHasGroup(grpRes.value.group);
        if (subRes.status === 'fulfilled') {
          const s = subRes.value;
          setPlanTier(s.plan_tier || 'basic');
          setMaxGroups(s.max_groups ?? 0);
          setMaxGroupApplies(s.max_group_applies ?? 3);
        }

        try {
          const pubRes = await housemateAPI.listPublicGroups();
          setGroups(pubRes.groups || []);
        } catch (e) {
          console.error('Public groups fetch error:', e);
        }

        try {
          const fallback = await housemateAPI.listSeekers();
          if (fallback && fallback.seekers) setSeekers(fallback.seekers);
        } catch (e2) {
          console.error('Seekers fetch error:', e2);
        }
      } catch (e) {
        setError('Could not connect to server. Make sure the backend is running.');
      }
      setLoading(false);
    };
    fetchAll();
  }, []);

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  const handleRequestJoin = async (groupId) => {
    setRequestingJoin(groupId);
    try {
      await housemateAPI.requestJoinGroup(groupId);
      setGroups(prev => prev.map(g => g.id === groupId ? { ...g, request_status: 'pending', request_id: 'temp' } : g));
    } catch (e) { alert(e.message); }
    finally { setRequestingJoin(null); }
  };

  const handleConnect = async (userId) => {
    try {
      await housemateAPI.acceptSuggestion(userId);
      alert('Added to group!');
      navigate('/housemate-group');
    } catch (e) { alert(e.message); }
  };

  if (loading) {
    return (
      <div style={{paddingTop:70, minHeight:'100vh', background:'var(--cream)', maxWidth: 1120, margin:'0 auto', padding:'70px 24px 32px'}}>
        <div style={{height:40, background:'var(--gray-100)', borderRadius:8, width:'40%', marginBottom:32}}/>
        {[1,2,3].map(i => <div key={i} style={{height:80, background:'var(--gray-100)', borderRadius:12, marginBottom:12}}/>)}
      </div>
    );
  }

  if (error) {
    return <div style={{display:'flex', justifyContent:'center', padding:80, color:'var(--red)'}}>{error}</div>;
  }

  const isBasic = planTier === 'basic';
  const showEmpty = groups.length === 0;

  return (
    <div style={{minHeight:'100vh', background:'var(--cream)'}}>
      <div style={{maxWidth:1120, margin:'0 auto', padding:'70px 24px 32px'}}>
        {/* Header */}
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28}}>
          <div>
            <h1 style={{fontSize:26, fontWeight:700, letterSpacing:-0.5, margin:0}}>Find a Housemate Group</h1>
            <p style={{color:'var(--gray-500)', fontSize:14, marginTop:4}}>
              Browse groups with open spots and request to join.
              {!isBasic && hasGroup ? ' You can also invite individual seekers.' : ''}
            </p>
          </div>
          {planTier !== 'basic' ? (
            <button onClick={() => navigate('/housemate-group')}
              style={{background:'var(--teal-light)', color:'var(--teal)', border:'none', padding:'8px 18px', borderRadius:8, fontWeight:600, cursor:'pointer', fontSize:13}}>
              {hasGroup ? 'My Group →' : 'Form a Group →'}
            </button>
          ) : (
            <div style={{display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:8, background:'var(--gray-100)', fontSize:12, color:'var(--gray-500)'}}>
              <Infinity size={14}/>Basic Plan
            </div>
          )}
        </div>

        {showEmpty ? (
          <div style={{textAlign:'center', padding:80, color:'var(--gray-400)'}}>
            <Users size={56} style={{margin:'0 auto 16px', display:'block', opacity:0.3}}/>
            <p style={{fontWeight:600, fontSize:18, color:'var(--gray-600)'}}>{isBasic ? 'No groups available yet' : 'No groups or seekers yet'}</p>
            <p style={{fontSize:14, marginTop:6}}>{isBasic ? 'Check back later for new groups.' : 'Create a group and others will find you.'}</p>
            {!isBasic && (
              <button onClick={() => navigate('/housemate-group')}
                style={{marginTop:16, background:'#0E7C6B', color:'#fff', border:'none', padding:'10px 24px', borderRadius:8, fontWeight:600, cursor:'pointer', fontSize:14}}>
                Create a Group
              </button>
            )}
          </div>
        ) : (
          <div style={{display:'grid', gridTemplateColumns: selectedGroup ? '1fr 380px' : '1fr', gap:24, alignItems:'flex-start'}}>
            {/* Left — Cards */}
            <div>
              {/* Groups with open spots */}
              {groups.length > 0 && (
                <div style={{display:'flex', flexDirection:'column', gap:12}}>
                  {groups.map(g => {
                    const isSelected = selectedGroupId === g.id;
                    const pct = g.compatibility_pct;
                    return (
                      <div key={g.id} onClick={() => setSelectedGroupId(isSelected ? null : g.id)}
                        style={{background:'white', borderRadius:12, padding:'16px 20px', border:`2px solid ${isSelected ? 'var(--teal)' : g.request_status === 'pending' ? '#C9970C' : 'var(--gray-100)'}`, cursor:'pointer', transition:'all 0.15s'}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                          <div style={{display:'flex', gap:14, alignItems:'center'}}>
                            <div style={{width:46, height:46, borderRadius:'50%', background:avatarColor(g.owner?.id), display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'white', fontSize:18, flexShrink:0}}>
                              {(g.owner?.name || '?')[0]}
                            </div>
                            <div>
                              <p style={{fontWeight:600, fontSize:15, margin:0}}>{g.name}</p>
                              <p style={{fontSize:13, color:'var(--gray-500)', marginTop:2}}>
                                by {g.owner?.name} · {g.member_count}/{g.max_members} full
                                {g.preferred_city ? ` · ${g.preferred_city}` : ''}
                              </p>
                            </div>
                          </div>
                          <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6}}>
                            {pct !== null && pct !== undefined ? (
                              <div style={{textAlign:'center', background:matchBg(pct), padding:'5px 12px', borderRadius:10}}>
                                <p style={{fontSize:10, color:'var(--gray-500)', margin:0}}>Match</p>
                                <p style={{fontSize:18, fontWeight:800, color:matchColor(pct), margin:0}}>{Math.round(pct)}%</p>
                              </div>
                            ) : null}
                            {g.request_status === 'pending' && (
                              <span style={{padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600, background:'#FEF3C7', color:'#D97706'}}>Pending</span>
                            )}
                          </div>
                        </div>
                        <div style={{display:'flex', flexWrap:'wrap', gap:4, marginTop:10}}>
                          {g.sociability && <span className="badge-teal" style={{padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:500}}>{SOC_LABELS[g.sociability] || g.sociability}</span>}
                          {g.budget_min && <span className="badge-teal" style={{padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:500}}>{g.budget_min}–{g.budget_max || '∞'} ETB</span>}
                          {g.languages?.length > 0 && g.languages.map(l => (
                            <span key={l} style={{background:'var(--gray-100)', padding:'1px 8px', borderRadius:10, fontSize:10, color:'var(--gray-600)'}}>{l}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Individual seekers section (standard/premium group owners only) */}
              {!isBasic && hasGroup && seekers.length > 0 && (
                <div>
                  <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:16}}>
                    <h2 style={{fontSize:18, fontWeight:600, margin:0}}>Individual Seekers</h2>
                    <button onClick={() => setShowIndividualSeekers(!showIndividualSeekers)}
                      style={{background:'transparent', color:'#0E7C6B', border:'1px solid #0E7C6B', padding:'4px 12px', borderRadius:6, fontWeight:500, cursor:'pointer', fontSize:12}}>
                      {showIndividualSeekers ? 'Hide' : `Show (${seekers.length})`}
                    </button>
                  </div>
                  {showIndividualSeekers && (
                    <div style={{display:'flex', flexDirection:'column', gap:12}}>
                      {seekers.map(s => (
                        <div key={s.id} style={{background:'white', borderRadius:12, padding:'14px 18px', border:'1px solid var(--gray-100)'}}>
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <div style={{display:'flex', gap:12, alignItems:'center'}}>
                              <div style={{width:36, height:36, borderRadius:'50%', background:avatarColor(s.id), display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'white', fontSize:14, flexShrink:0}}>
                                {(s.name || '?')[0]}
                              </div>
                              <div>
                                <p style={{fontWeight:600, fontSize:14, margin:0}}>{s.name}</p>
                                <p style={{fontSize:12, color:'var(--gray-500)', marginTop:1}}>
                                  {s.sociability ? (SOC_LABELS[s.sociability] || s.sociability) : ''}
                                  {s.preferred_city ? ` · ${s.preferred_city}` : ''}
                                </p>
                              </div>
                            </div>
                            <button onClick={() => handleConnect(s.id)}
                              style={{background:'#0E7C6B', color:'#fff', border:'none', padding:'6px 14px', borderRadius:8, fontWeight:600, cursor:'pointer', fontSize:12}}>
                              Invite
                            </button>
                          </div>
                          <div style={{display:'flex', flexWrap:'wrap', gap:4, marginTop:8}}>
                            {s.sleep_schedule && <span className="badge-teal" style={{padding:'1px 8px', borderRadius:20, fontSize:10, fontWeight:500}}>{SLEEP_LABELS[s.sleep_schedule] || s.sleep_schedule}</span>}
                            {s.cleanliness && <span className="badge-teal" style={{padding:'1px 8px', borderRadius:20, fontSize:10, fontWeight:500}}>{CLEAN_LABELS[s.cleanliness] || s.cleanliness}</span>}
                            {s.smoking && <span className="badge-teal" style={{padding:'1px 8px', borderRadius:20, fontSize:10, fontWeight:500}}>{s.smoking === 'no' ? 'Non-smoker' : s.smoking}</span>}
                            {s.guests_habit && <span className="badge-teal" style={{padding:'1px 8px', borderRadius:20, fontSize:10, fontWeight:500}}>{GUEST_LABELS[s.guests_habit] || s.guests_habit}</span>}
                            {s.languages?.length > 0 && s.languages.slice(0,3).map(l => (
                              <span key={l} style={{background:'var(--gray-100)', padding:'1px 6px', borderRadius:8, fontSize:9, color:'var(--gray-600)'}}>{l}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!isBasic && hasGroup && seekers.length === 0 && (
                <div style={{textAlign:'center', padding:60, color:'var(--gray-400)'}}>
                  <Users size={40} style={{margin:'0 auto 12px', display:'block', opacity:0.3}}/>
                  <p>No individual seekers to invite. Check back later.</p>
                </div>
              )}
            </div>

            {/* Right — Detail Panel (for selected group) */}
            {selectedGroup && (
              <div style={{background:'white', borderRadius:16, border:'1px solid var(--gray-100)', padding:28, position:'sticky', top:100, flexShrink:0}}>
                <div style={{textAlign:'center', marginBottom:24}}>
                  <div style={{width:72, height:72, borderRadius:'50%', background:avatarColor(selectedGroup.owner?.id), display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'white', fontSize:28, margin:'0 auto 12px'}}>
                    {(selectedGroup.owner?.name || '?')[0]}
                  </div>
                  <h3 style={{fontWeight:700, fontSize:18, margin:0}}>{selectedGroup.name}</h3>
                  <p style={{color:'var(--gray-500)', fontSize:14}}>by {selectedGroup.owner?.name}</p>
                  {selectedGroup.compatibility_pct !== null && selectedGroup.compatibility_pct !== undefined && (
                    <div style={{fontSize:32, fontWeight:800, color:matchColor(selectedGroup.compatibility_pct), marginTop:8}}>
                      {Math.round(selectedGroup.compatibility_pct)}% <span style={{fontSize:14, color:'var(--gray-400)', fontWeight:400}}>match</span>
                    </div>
                  )}
                </div>

                <div style={{marginBottom:20}}>
                  <p style={{fontSize:12, fontWeight:600, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10}}>Group Details</p>
                  <ProfileRow label="Members" value={`${selectedGroup.member_count}/${selectedGroup.max_members}`} />
                  <ProfileRow label="City" value={selectedGroup.preferred_city || '—'} />
                  <ProfileRow label="Sociability" value={SOC_LABELS[selectedGroup.sociability] || selectedGroup.sociability || '—'} />
                  <ProfileRow label="Sleep" value={SLEEP_LABELS[selectedGroup.sleep_schedule] || selectedGroup.sleep_schedule || '—'} />
                  <ProfileRow label="Cleanliness" value={CLEAN_LABELS[selectedGroup.cleanliness] || selectedGroup.cleanliness || '—'} />
                  <ProfileRow label="Smoking" value={selectedGroup.smoking === 'no' ? 'Non-smoker' : selectedGroup.smoking === 'occasional' ? 'Occasional' : selectedGroup.smoking || '—'} />
                  <ProfileRow label="Guests" value={GUEST_LABELS[selectedGroup.guests_habit] || selectedGroup.guests_habit || '—'} />
                  <ProfileRow label="Languages" value={selectedGroup.languages?.length > 0 ? selectedGroup.languages.join(', ') : '—'} />
                  <ProfileRow label="Budget" value={selectedGroup.budget_min ? (selectedGroup.budget_max ? `${selectedGroup.budget_min}–${selectedGroup.budget_max} ETB` : `${selectedGroup.budget_min} ETB`) : selectedGroup.budget_max ? `${selectedGroup.budget_max} ETB` : '—'} />
                </div>

                {selectedGroup.lifestyle_notes && (
                  <div style={{marginBottom:20, padding:14, background:'var(--gray-50)', borderRadius:10}}>
                    <p style={{fontSize:12, fontWeight:600, color:'var(--gray-400)', marginBottom:6}}>LIFESTYLE NOTES</p>
                    <p style={{fontSize:13, color:'var(--gray-600)', lineHeight:1.6, margin:0}}>{selectedGroup.lifestyle_notes}</p>
                  </div>
                )}

                {selectedGroup.request_status === 'pending' ? (
                  <span style={{display:'block', textAlign:'center', padding:'12px', borderRadius:8, fontWeight:600, fontSize:14, background:'#FEF3C7', color:'#D97706'}}>
                    Request Pending
                  </span>
                ) : selectedGroup.request_status === 'accepted' ? (
                  <span style={{display:'block', textAlign:'center', padding:'12px', borderRadius:8, fontWeight:600, fontSize:14, background:'#D1FAE5', color:'#059669'}}>
                    Accepted
                  </span>
                ) : (
                  <button onClick={() => handleRequestJoin(selectedGroup.id)} disabled={requestingJoin === selectedGroup.id}
                    style={{width:'100%', background:'#0E7C6B', color:'#fff', border:'none', padding:'12px', borderRadius:8, fontWeight:600, cursor:'pointer', fontSize:15, opacity:requestingJoin === selectedGroup.id ? 0.6 : 1}}>
                    <UserPlus size={16} style={{marginRight:6, verticalAlign:'middle'}} />
                    {requestingJoin === selectedGroup.id ? 'Requesting...' : 'Request to Join'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileRow({ label, value }) {
  return (
    <div style={{display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--gray-50)', fontSize:14}}>
      <span style={{color:'var(--gray-500)'}}>{label}</span>
      <span style={{fontWeight:500}}>{value}</span>
    </div>
  );
}
