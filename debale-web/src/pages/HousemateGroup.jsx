import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { housemateAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function HousemateGroup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const chatEnd = useRef(null);
  const [formName, setFormName] = useState('');
  const [formMax, setFormMax] = useState(2);
  const [creating, setCreating] = useState(false);
  const [handlingReq, setHandlingReq] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);

  const fetchGroup = async () => {
    try {
      const res = await housemateAPI.myGroup();
      setGroup(res.group);
      if (res.group) {
        const msgRes = await housemateAPI.getMessages(res.group.id);
        setMessages(msgRes.messages || []);
        housemateAPI.getGroupRequests(res.group.id).then(r => setPendingRequests(r.requests || [])).catch(() => {});
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchGroup(); }, []);

  useEffect(() => { chatEnd.current?.scrollIntoView(); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !group) return;
    setSending(true);
    try {
      const res = await housemateAPI.sendMessage(group.id, input.trim());
      setMessages(prev => [...prev, res.message]);
      setInput('');
    } catch (e) { alert(e.message); }
    finally { setSending(false); }
  };

  const handleCreate = async () => {
    if (!formName.trim()) return;
    setCreating(true);
    try {
      const res = await housemateAPI.createGroup(formName.trim(), formMax);
      setGroup(res.group);
      setMessages([]);
    } catch (e) { alert(e.message); }
    finally { setCreating(false); }
  };

  const handleJoinRequest = async (requestId, action) => {
    if (!window.confirm(`${action === 'accept' ? 'Accept' : 'Reject'} this join request?`)) return;
    setHandlingReq(requestId);
    try {
      await housemateAPI.handleGroupRequest(group.id, requestId, action);
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (e) { alert(e.message); }
    finally { setHandlingReq(null); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 24px', paddingTop: 70, color: '#6B7280' }}>Loading...</div>;

  if (!group) {
    return (
      <div style={{ paddingTop: 70, maxWidth: 520, margin: '0 auto', padding: '70px 24px 60px' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <p style={{ fontSize: 40, marginBottom: 8 }}>👥</p>
          <h2 style={{ fontWeight: 700, margin: 0 }}>Create a Housemate Group</h2>
          <p style={{ color: '#6B7280', margin: '6px 0 0', fontSize: 14 }}>Name your group and set the size. Others can request to join.</p>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: 28 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Group Name</label>
          <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Cool Squad, City Housemates" maxLength={60}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14, marginBottom: 20, boxSizing: 'border-box' }} />

          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Max Members</label>
          <select value={formMax} onChange={e => setFormMax(Number(e.target.value))}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14, marginBottom: 24, boxSizing: 'border-box' }}>
            {[2, 3, 4].map(n => <option key={n} value={n}>{n} members</option>)}
          </select>

          <button onClick={handleCreate} disabled={creating || !formName.trim()}
            style={{ width: '100%', background: '#0E7C6B', color: '#fff', border: 'none', padding: '12px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 15, opacity: creating || !formName.trim() ? 0.6 : 1 }}>
            {creating ? 'Creating...' : 'Create Group'}
          </button>
        </div>

        <button onClick={() => navigate('/housemate-suggestions')}
          style={{ width: '100%', marginTop: 12, background: 'transparent', color: '#0E7C6B', border: '1.5px dashed #0E7C6B', padding: '12px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
          Find a Group to Join
        </button>
      </div>
    );
  }

  const isOwner = group.owner?.id === user?.id;
  const isFull = group.is_full || group.members?.length >= (group.max_members || 2);

  return (
    <div style={{ paddingTop: 70, maxWidth: 860, margin: '0 auto', padding: '70px 24px 24px', display: 'flex', gap: 24, height: 'calc(100vh - 70px)' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{group.name || 'Your Group'}</h1>
          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: group.status === 'forming' ? '#E6F4F1' : '#FEF3C7', color: group.status === 'forming' ? '#0E7C6B' : '#D97706', textTransform: 'capitalize' }}>{group.status}</span>
        </div>
        <p style={{ color: '#6B7280', fontSize: 13, margin: '0 0 16px' }}>
          {group.members?.length || 0}/{group.max_members || 2} members{group.owner ? ` · Owner: ${group.owner.name}` : ''}
        </p>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.length === 0 && <p style={{ color: '#9CA3AF', textAlign: 'center', padding: 40 }}>No messages yet. Say hello!</p>}
            {messages.map(m => (
              <div key={m.id} style={{ display: 'flex', justifyContent: m.sender_id === user?.id ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '70%', background: m.sender_id === user?.id ? '#0E7C6B' : '#F3F4F6', color: m.sender_id === user?.id ? '#fff' : '#111827', borderRadius: 12, borderBottomRightRadius: m.sender_id === user?.id ? 4 : 12, borderBottomLeftRadius: m.sender_id === user?.id ? 12 : 4, padding: '8px 14px', fontSize: 14, lineHeight: 1.5 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, margin: '0 0 2px', opacity: 0.7 }}>{m.sender_id !== user?.id ? (m.users?.name || 'Unknown') : 'You'}</p>
                  {m.content}
                </div>
              </div>
            ))}
            <div ref={chatEnd} />
          </div>
          <div style={{ borderTop: '1px solid #E5E7EB', padding: 12, display: 'flex', gap: 8, background: '#FAFAF7' }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Type a message..." style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14 }} />
            <button onClick={sendMessage} disabled={sending || !input.trim()} style={{ background: '#0E7C6B', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', opacity: sending || !input.trim() ? 0.6 : 1 }}>Send</button>
          </div>
        </div>
      </div>

      <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Members */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: 20 }}>
          <p style={{ fontWeight: 600, fontSize: 14, margin: '0 0 12px' }}>Members ({group.members?.length || 0}/{group.max_members || 2})</p>
          {group.members?.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
              <div style={{ width: 32, height: 32, borderRadius: 16, background: '#E6F4F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13, color: '#0E7C6B' }}>
                {(m.name || '?')[0]}
              </div>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{m.name}{m.id === user?.id ? ' (You)' : ''}{isOwner && group.owner?.id === m.id ? ' 👑' : ''}</span>
            </div>
          ))}
          {!isFull && group.status === 'forming' && (
            <button onClick={() => navigate('/housemate-suggestions')} style={{ width: '100%', marginTop: 10, background: '#fff', color: '#0E7C6B', border: '1.5px dashed #0E7C6B', padding: '8px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>
              + Invite More
            </button>
          )}
        </div>

        {/* Pending Join Requests (owner only) */}
        {isOwner && pendingRequests.length > 0 && (
          <div style={{ background: '#FFF7ED', borderRadius: 12, border: '1px solid #FED7AA', padding: 16 }}>
            <p style={{ fontWeight: 600, fontSize: 13, margin: '0 0 10px', color: '#D97706' }}>
              {pendingRequests.length} Join Request{pendingRequests.length > 1 ? 's' : ''}
            </p>
            {pendingRequests.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #FED7AA' }}>
                <div style={{ width: 30, height: 30, borderRadius: 15, background: '#E6F4F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 12, color: '#0E7C6B' }}>
                  {(r.name || '?')[0]}
                </div>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{r.name}</span>
                <button onClick={() => handleJoinRequest(r.id, 'accept')} disabled={handlingReq === r.id}
                  style={{ background: '#059669', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 11 }}>Accept</button>
                <button onClick={() => handleJoinRequest(r.id, 'reject')} disabled={handlingReq === r.id}
                  style={{ background: '#fff', color: '#6B7280', border: '1px solid #D1D5DB', padding: '4px 10px', borderRadius: 6, fontWeight: 500, cursor: 'pointer', fontSize: 11 }}>Reject</button>
              </div>
            ))}
          </div>
        )}

        {/* Browse Apartments — gated behind full group */}
        {group.status === 'forming' && (
          <button onClick={() => isFull ? navigate('/housemate-multi-room') : alert(`Group must be full (${group.max_members || 2} members) before browsing apartments.`)}
            style={{ background: isFull ? '#0E7C6B' : '#D1D5DB', color: isFull ? '#fff' : '#9CA3AF', border: 'none', padding: '12px', borderRadius: 12, fontWeight: 600, cursor: isFull ? 'pointer' : 'not-allowed', fontSize: 14 }}>
            Browse Apartments {isFull ? '→' : `(need ${(group.max_members || 2) - (group.members?.length || 0)} more)`}
          </button>
        )}

        {group.listing && (
          <div style={{ background: '#E6F4F1', borderRadius: 12, padding: 16 }}>
            <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>Applied to:</p>
            <p style={{ fontSize: 14, fontWeight: 700, margin: '4px 0' }}>{group.listing.title}</p>
            <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>{group.listing.city} — {group.listing.price?.toLocaleString()} ETB/mo</p>
            <div style={{ marginTop: 8, padding: '4px 10px', borderRadius: 20, display: 'inline-block', fontSize: 12, fontWeight: 600, background: group.application?.status === 'pending' ? '#FEF3C7' : group.application?.status === 'accepted' ? '#D1FAE5' : '#FEE2E2', color: group.application?.status === 'pending' ? '#D97706' : group.application?.status === 'accepted' ? '#059669' : '#DC2626', textTransform: 'capitalize' }}>Status: {group.application?.status || 'Applied'}</div>
          </div>
        )}

        {group.status === 'accepted' && (
          <div style={{ background: '#D1FAE5', borderRadius: 12, padding: 16, textAlign: 'center' }}>
            <p style={{ fontSize: 24, margin: 0 }}>🎉</p>
            <p style={{ fontWeight: 700, color: '#059669', margin: '4px 0' }}>Group Accepted!</p>
            <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>Your group was accepted. The provider will contact you.</p>
          </div>
        )}
      </div>
    </div>
  );
}
