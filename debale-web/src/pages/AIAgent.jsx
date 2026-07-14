import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { askGroq, DEBALE_SYSTEM_PROMPT } from '../services/groq';
import { Send, Bot, User, Sparkles, RefreshCw, Home, Key, Users, CreditCard } from 'lucide-react';

const QUICK_QUESTIONS = [
  "How do I apply for a room?",
  "What happens after my application is accepted?",
  "How much does a subscription cost?",
  "How does the interview scheduling work?",
  "What is included in the housemate agreement?",
  "ደባሌ እንዴት ይሰራል?",
];

const INITIAL_MESSAGE = {
  role: 'assistant',
  content: "Hi! I'm the Debale AI Assistant 🏠\n\nI can help you with finding rooms, understanding how the platform works, interview preparation, and any questions about living with a housemate in Ethiopia.\n\nHow can I help you today?",
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

export default function AIAgent() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    const userMsg = { role: 'user', content: msg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    try {
      const history = messages.filter(m => m.role !== 'typing').map(m => ({ role: m.role, content: m.content }));
      const reply = await askGroq([...history, { role: 'user', content: msg }], DEBALE_SYSTEM_PROMPT);
      setMessages(prev => [...prev, {
        role: 'assistant', content: reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: true,
      }]);
    }
    setLoading(false);
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  return (
    <div style={{ paddingTop: 70, height: '100vh', background: 'var(--cream)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '280px 1fr', maxWidth: 1100, margin: '0 auto', width: '100%', padding: '24px 24px 0', gap: 20 }}>

        {/* Left panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Header */}
          <div style={{ background: 'var(--teal)', borderRadius: 14, padding: '20px', color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={18} />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 15 }}>Debale AI</p>
                <p style={{ fontSize: 11, opacity: 0.8 }}>Powered by Groq · Llama 3</p>
              </div>
            </div>
            <div style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.6 }}>Ask me anything about finding a room or listing your space in Ethiopia.</div>
          </div>

          {/* Quick questions */}
          <div style={{ background: 'white', borderRadius: 14, padding: 16, border: '1px solid var(--gray-100)' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Quick Questions</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {QUICK_QUESTIONS.map(q => (
                <button key={q} onClick={() => sendMessage(q)}
                  style={{ textAlign: 'left', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--gray-200)', background: 'var(--gray-50)', cursor: 'pointer', fontSize: 13, color: 'var(--gray-700)', lineHeight: 1.4, transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.target.style.borderColor = 'var(--teal)'; e.target.style.background = 'var(--teal-light)'; e.target.style.color = 'var(--teal)'; }}
                  onMouseLeave={e => { e.target.style.borderColor = 'var(--gray-200)'; e.target.style.background = 'var(--gray-50)'; e.target.style.color = 'var(--gray-700)'; }}>
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* AI capabilities */}
          <div style={{ background: 'white', borderRadius: 14, padding: 16, border: '1px solid var(--gray-100)' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>What I Can Do</p>
            {[[Sparkles,'Match score explanations'],[Home,'Room search guidance'],[Users,'Housemate advice'],[Key,'Agreement questions'],[CreditCard,'Payment & subscription help']].map(([Icon, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--gray-600)', marginBottom: 8 }}>
                <Icon size={13} color="var(--teal)" />{label}
              </div>
            ))}
          </div>
        </div>

        {/* Chat panel */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid var(--gray-100)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Chat header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--green)' }} />
              <span style={{ fontWeight: 600, fontSize: 15 }}>Debale Assistant</span>
              <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>Online</span>
            </div>
            <button onClick={() => setMessages([INITIAL_MESSAGE])} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--gray-200)', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--gray-500)' }}>
              <RefreshCw size={13} /> New Chat
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 'calc(100vh - 280px)' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: msg.role === 'user' ? 'var(--teal)' : msg.error ? 'var(--red-light)' : 'var(--gold-light)' }}>
                  {msg.role === 'user' ? <User size={15} color="white" /> : <Bot size={15} color={msg.error ? 'var(--red)' : 'var(--gold)'} />}
                </div>
                <div style={{ maxWidth: '72%' }}>
                  <div style={{ padding: '12px 16px', borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                    background: msg.role === 'user' ? 'var(--teal)' : msg.error ? 'var(--red-light)' : 'var(--gray-50)',
                    color: msg.role === 'user' ? 'white' : msg.error ? 'var(--red)' : 'var(--dark)',
                    fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', border: msg.role !== 'user' ? '1px solid var(--gray-100)' : 'none' }}>
                    {msg.content}
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4, textAlign: msg.role === 'user' ? 'right' : 'left' }}>{msg.time}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gold-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={15} color="var(--gold)" />
                </div>
                <div style={{ padding: '14px 18px', borderRadius: '4px 16px 16px 16px', background: 'var(--gray-50)', border: '1px solid var(--gray-100)', display: 'flex', gap: 6, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gray-300)', animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--gray-100)' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
                placeholder="Ask me anything about Debale..." rows={1}
                style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: '1.5px solid var(--gray-200)', fontSize: 14, resize: 'none', fontFamily: 'var(--font-body)', outline: 'none', lineHeight: 1.5, maxHeight: 120, overflowY: 'auto' }}
                onFocus={e => e.target.style.borderColor = 'var(--teal)'}
                onBlur={e => e.target.style.borderColor = 'var(--gray-200)'} />
              <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
                style={{ width: 44, height: 44, borderRadius: 12, border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s',
                  background: input.trim() && !loading ? 'var(--teal)' : 'var(--gray-100)' }}>
                <Send size={18} color={input.trim() && !loading ? 'white' : 'var(--gray-400)'} />
              </button>
            </div>
            <p style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 8, textAlign: 'center' }}>Powered by Groq AI · Llama 3 70B</p>
          </div>
        </div>
      </div>
      <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }`}</style>
    </div>
  );
}
