import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { messagesAPI } from '../services/api';
import { Send, Phone, MapPin, Home, Lock, ArrowLeft } from 'lucide-react';

export default function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    const fetchThreads = async () => {
      try {
        const data = await messagesAPI.list();
        const threads = data.threads || data.conversations || [];
        setConversations(threads);
        if (threads.length > 0) {
          setActiveConv(threads[0]);
          setMsgs(threads[0].messages || []);
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchThreads();
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const send = async () => {
    if (!input.trim() || !activeConv) return;
    const newMsg = { from: 'me', text: input.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMsgs(prev => [...prev, newMsg]);
    setInput('');
    try {
      await messagesAPI.send(activeConv.application_id || activeConv.id, input.trim());
    } catch (err) {
      console.error('Send failed:', err);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  if (loading) {
    return (
      <div style={{ paddingTop: 70, height: '100vh', display: 'flex', background: 'var(--cream)' }}>
        <div style={{ maxWidth: 1000, width: '100%', margin: '24px auto', padding: '0 24px' }}>
          <div style={{height: '100%', background:'var(--gray-100)', borderRadius:16, animation:'pulse 1.5s infinite'}}/>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 70, height: '100vh', display: 'flex', background: 'var(--cream)' }}>
      <div style={{ maxWidth: 1000, width: '100%', margin: '24px auto', padding: '0 24px', display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, height: 'calc(100vh - 110px)' }}>

        {/* Conversation list */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid var(--gray-100)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--gray-100)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Messages</h2>
            <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>Connect after interview or acceptance</p>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {conversations.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--gray-400)' }}>
                <Lock size={24} style={{ margin: '0 auto 12px', opacity: 0.3 }}/>
                <p style={{ fontSize: 13 }}>Messages appear after an interview or acceptance</p>
              </div>
            ) : conversations.map(c => {
              const otherName = c.other_user?.name || c.other_name || 'User';
              const listingTitle = c.listing?.title || c.listing_title || c.room || 'Room';
              const lastMsg = c.last_message?.text || '';
              return (
              <div key={c.id || c.application_id} onClick={() => { setActiveConv(c); setMsgs(c.messages || []); }}
                style={{ padding: '14px 20px', cursor: 'pointer', borderBottom: '1px solid var(--gray-50)', background: activeConv?.id === c.id || activeConv?.application_id === c.application_id ? 'var(--teal-light)' : 'white', transition: 'background 0.15s' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--teal)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 17, flexShrink: 0 }}>
                    {otherName.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <p style={{ fontWeight: 600, fontSize: 14 }}>{otherName}</p>
                      {c.unread_count > 0 && <span style={{ width:18, height:18, borderRadius:'50%', background:'var(--teal)', color:'white', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{c.unread_count}</span>}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--gray-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{listingTitle}</p>
                    {lastMsg && <p style={{ fontSize: 11, color: 'var(--gray-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop:2, opacity:0.7 }}>{lastMsg}</p>}
                  </div>
                </div>
              </div>
            )})}
          </div>

          {/* Privacy note */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--gray-100)', background: 'var(--gray-50)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--gray-500)' }}>
              <Lock size={11} /> Messaging available after interview or acceptance
            </div>
          </div>
        </div>

        {/* Chat window */}
        {activeConv ? (
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid var(--gray-100)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Chat header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--teal)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>
                  {activeConv.other_user?.name?.charAt(0)?.toUpperCase() || activeConv.other_name?.charAt(0) || '?'}
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 15 }}>{activeConv.other_user?.name || activeConv.other_name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--gray-500)' }}>
                    <Home size={11} /> {activeConv.listing?.title || activeConv.listing_title || activeConv.room}
                  </div>
                </div>
              </div>
              {activeConv.other_user?.phone && (
                <div style={{ padding: '8px 14px', borderRadius: 10, background: 'var(--green-light)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--green)' }}>
                  <Phone size={13} /> {activeConv.other_user.phone}
                </div>
              )}
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--gray-400)', background: 'var(--gray-100)', padding: '4px 14px', borderRadius: 20 }}>Today</span>
              </div>
              {msgs.map((msg, i) => {
                const isMe = msg.sender_id === user.id || msg.from === 'me' || msg.sender === 'me';
                const senderName = msg.sender?.name || activeConv.other_user?.name || '';
                return (
                <div key={msg.id || i} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 10, alignItems: 'flex-end' }}>
                  {!isMe && (
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--teal)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                      {senderName.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div style={{ maxWidth: '68%' }}>
                    <div style={{
                      padding: '10px 14px', borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                      background: isMe ? 'var(--teal)' : 'var(--gray-50)',
                      color: isMe ? 'white' : 'var(--dark)',
                      fontSize: 14, lineHeight: 1.6, border: isMe ? 'none' : '1px solid var(--gray-100)'
                    }}>
                      {msg.text || msg.content}
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 3, textAlign: isMe ? 'right' : 'left' }}>{msg.created_at ? new Date(msg.created_at).toLocaleTimeString() : ''}</p>
                  </div>
                </div>
              )})}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--gray-100)', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
                placeholder="Type a message..." rows={1}
                style={{ flex: 1, padding: '11px 16px', borderRadius: 12, border: '1.5px solid var(--gray-200)', fontSize: 14, resize: 'none', fontFamily: 'var(--font-body)', outline: 'none', maxHeight: 100, overflowY: 'auto', lineHeight: 1.5 }}
                onFocus={e => e.target.style.borderColor = 'var(--teal)'}
                onBlur={e => e.target.style.borderColor = 'var(--gray-200)'} />
              <button onClick={send} disabled={!input.trim()}
                style={{ width: 42, height: 42, borderRadius: 12, border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: input.trim() ? 'var(--teal)' : 'var(--gray-100)', transition: 'background 0.15s' }}>
                <Send size={16} color={input.trim() ? 'white' : 'var(--gray-400)'} />
              </button>
            </div>
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: 'var(--gray-400)' }}>
              <Lock size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }}/>
              <p style={{ fontSize: 16, fontWeight: 600 }}>No conversation selected</p>
              <p style={{ fontSize: 13 }}>Messages appear after an interview or acceptance</p>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}
