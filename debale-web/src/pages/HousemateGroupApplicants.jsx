import { useState, useEffect } from 'react';
import { housemateAPI } from '../services/api';
import { Calendar } from 'lucide-react';

export default function HousemateGroupApplicants() {
  const [applications, setApplications] = useState([]);
  const [memberMap, setMemberMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [showInterview, setShowInterview] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');

  const fetchApps = async () => {
    setLoading(true);
    try {
      const res = await housemateAPI.getGroupApplications();
      const apps = res.applications || [];
      setApplications(apps);

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
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchApps(); }, []);

  const handleDecision = async (appId, status) => {
    if (!window.confirm(`${status === 'accepted' ? 'Accept' : 'Reject'} this entire group? This cannot be undone.`)) return;
    setActionLoading(appId);
    try {
      await housemateAPI.updateGroupAppStatus(appId, status);
      alert(`Group application ${status}.`);
      setApplications(prev => prev.filter(a => a.id !== appId));
    } catch (e) { alert(e.message); }
    finally { setActionLoading(null); }
  };

  const handleInterview = async () => {
    if (!interviewDate || !interviewTime) return;
    setActionLoading(selectedApp);
    try {
      const scheduledAt = `${interviewDate}T${interviewTime}`;
      await housemateAPI.scheduleGroupInterview(selectedApp, scheduledAt);
      setApplications(prev => prev.map(a => a.id === selectedApp ? { ...a, status: 'interview', interview_at: scheduledAt } : a));
      setShowInterview(false);
      setSelectedApp(null);
      setInterviewDate('');
      setInterviewTime('');
    } catch (e) { alert(e.message); }
    finally { setActionLoading(null); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 100, color: '#6B7280' }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '70px 24px 40px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5, margin: 0 }}>Group Applications</h1>
      <p style={{ color: '#6B7280', margin: '4px 0 32px' }}>Review group applications for your multi-room apartments.</p>

      {applications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>📋</p>
          <p style={{ fontWeight: 600, fontSize: 18, color: '#374151' }}>No group applications</p>
          <p style={{ marginTop: 4 }}>Group applications from seekers will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {applications.map(app => {
            const gid = app.housemate_groups?.id || app.group_id;
            const members = memberMap[gid] || [];
            const statusCfg = app.status === 'interview' ? { bg: '#EDE9FE', color: '#7C3AED' } : app.status === 'accepted' ? { bg: 'var(--green-light)', color: 'var(--green)' } : app.status === 'rejected' ? { bg: 'var(--red-light)', color: 'var(--red)' } : { bg: '#FEF3C7', color: '#D97706' };
            return (
            <div key={app.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <p style={{ fontWeight: 600, margin: 0 }}>{app.listing_title}</p>
                  <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>{app.member_count} seeker{app.member_count !== 1 ? 's' : ''} in group · Applied {new Date(app.applied_at).toLocaleDateString()}</p>
                </div>
                <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: statusCfg.bg, color: statusCfg.color, textTransform: 'capitalize' }}>{app.status}</span>
              </div>
              {members.length > 0 && (
                <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Group Members</p>
                  {members.map(m => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 14, background: '#E6F4F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 11, color: '#0E7C6B' }}>
                        {(m.name || '?')[0]}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</span>
                    </div>
                  ))}
                </div>
              )}
              {app.interview_at && (
                <div style={{ marginBottom: 12, padding: '8px 12px', background: '#EDE9FE', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#7C3AED' }}>
                  <Calendar size={14} /> Interview: <strong>{new Date(app.interview_at).toLocaleString()}</strong>
                </div>
              )}
              {app.status === 'pending' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleDecision(app.id, 'accepted')} disabled={actionLoading === app.id} style={{ flex: 1, background: '#059669', color: '#fff', border: 'none', padding: '10px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13, opacity: actionLoading === app.id ? 0.6 : 1 }}>Accept Whole Group</button>
                  <button onClick={() => { setSelectedApp(app.id); setShowInterview(true); }} disabled={actionLoading === app.id} style={{ flex: 1, background: '#7C3AED', color: '#fff', border: 'none', padding: '10px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: actionLoading === app.id ? 0.6 : 1 }}><Calendar size={14} /> Interview</button>
                  <button onClick={() => handleDecision(app.id, 'rejected')} disabled={actionLoading === app.id} style={{ flex: 1, background: '#fff', color: '#6B7280', border: '1px solid #D1D5DB', padding: '10px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Reject</button>
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}

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
              <button onClick={() => { setShowInterview(false); setSelectedApp(null); setInterviewDate(''); setInterviewTime(''); }} style={{ background: 'white', color: '#6B7280', border: '1px solid #D1D5DB', padding: '10px 24px', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              <button onClick={handleInterview} disabled={!interviewDate || !interviewTime || actionLoading === selectedApp} style={{ background: '#7C3AED', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 14, opacity: !interviewDate || !interviewTime ? 0.5 : 1 }}>{actionLoading === selectedApp ? 'Scheduling...' : 'Confirm & Notify'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
