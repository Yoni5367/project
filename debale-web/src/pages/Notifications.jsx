import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { notificationsAPI } from '../services/api';
import { Bell, CheckCircle, XCircle, Calendar, CreditCard, Home, MessageSquare, Check } from 'lucide-react';

const TYPE_CONFIG = {
  accepted:     { Icon: CheckCircle, color:'var(--green)', bg:'var(--green-light)' },
  rejected:     { Icon: XCircle,     color:'var(--red)',   bg:'var(--red-light)' },
  interview:    { Icon: Calendar,    color:'#7C3AED',      bg:'#EDE9FE' },
  application:  { Icon: Home,        color:'var(--teal)',  bg:'var(--teal-light)' },
  subscription: { Icon: CreditCard,  color:'var(--gold)',  bg:'var(--gold-light)' },
  message:      { Icon: MessageSquare, color:'var(--gray-500)', bg:'var(--gray-100)' },
};

export default function Notifications() {
  const { t } = useTranslation();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const data = await notificationsAPI.getAll();
        setNotifs(data.notifications || []);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifs();
  }, []);

  const markAllRead = async () => {
    try {
      await notificationsAPI.readAll();
      setNotifs(n => n.map(x => ({...x, read:true})));
    } catch {}
  };

  const markRead = async (id) => {
    try {
      await notificationsAPI.readOne(id);
      setNotifs(n => n.map(x => x.id===id ? {...x, read:true} : x));
    } catch {}
  };

  const unread = notifs.filter(n => !n.read).length;
  const filtered = filter==='unread' ? notifs.filter(n=>!n.read) : notifs;

  if (loading) {
    return (
      <div style={{paddingTop:70, minHeight:'100vh', background:'var(--cream)'}}>
        <div className="container" style={{maxWidth:720, padding:'40px 24px'}}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{height:80, background:'var(--gray-100)', borderRadius:12, marginBottom:12, animation:'pulse 1.5s infinite'}}/>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{paddingTop:70, minHeight:'100vh', background:'var(--cream)'}}>
      <div className="container" style={{maxWidth:720, padding:'40px 24px'}}>

        {/* Header */}
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:28}}>
          <div>
            <h1 style={{fontSize:26, fontWeight:700, fontFamily:'var(--font-head)', marginBottom:4}}>
              {t('notifications')}
            </h1>
            <p style={{color:'var(--gray-500)', fontSize:14}}>{unread} unread notification{unread!==1?'s':''}</p>
          </div>
          {unread > 0 && (
            <button onClick={markAllRead} className="btn btn-outline btn-sm">
              <Check size={14}/> {t('mark_read')}
            </button>
          )}
        </div>

        {/* Filter */}
        <div style={{display:'flex', gap:8, marginBottom:24}}>
          {[['all','All'],['unread','Unread']].map(([key,label])=>(
            <button key={key} onClick={()=>setFilter(key)}
              style={{padding:'6px 16px', borderRadius:20, fontSize:13, border:`1.5px solid ${filter===key?'var(--teal)':'var(--gray-200)'}`,
                background:filter===key?'var(--teal-light)':'white', color:filter===key?'var(--teal)':'var(--gray-600)', cursor:'pointer', fontWeight:filter===key?600:400}}>
              {label}
            </button>
          ))}
        </div>

        {/* List */}
        <div style={{display:'flex', flexDirection:'column', gap:10}}>
          {filtered.length === 0 ? (
            <div style={{textAlign:'center', padding:'80px 0', color:'var(--gray-400)'}}>
              <Bell size={40} style={{margin:'0 auto 12px', opacity:0.2}}/>
              <p style={{fontSize:16}}>No notifications here</p>
            </div>
          ) : filtered.map(n => {
            const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.message;
            return (
              <div key={n.id} onClick={()=>markRead(n.id)}
                style={{background:'white', borderRadius:12, padding:'18px 20px', border:`1px solid ${!n.read?'var(--teal-mid)':'var(--gray-100)'}`,
                  display:'flex', gap:16, alignItems:'flex-start', cursor:'pointer', transition:'all 0.15s',
                  background: n.read ? 'white' : 'rgba(14,124,107,0.03)'}}>
                <div style={{width:44, height:44, borderRadius:12, background:cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                  <cfg.Icon size={20} color={cfg.color}/>
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4}}>
                    <p style={{fontWeight: n.read?500:700, fontSize:15}}>{n.title}</p>
                    <div style={{display:'flex', alignItems:'center', gap:8, flexShrink:0, marginLeft:12}}>
                      {!n.read && <div style={{width:8, height:8, borderRadius:'50%', background:'var(--teal)', flexShrink:0}}/>}
                      <span style={{fontSize:12, color:'var(--gray-400)', whiteSpace:'nowrap'}}>{n.created_at ? new Date(n.created_at).toLocaleDateString() : n.time}</span>
                    </div>
                  </div>
                  <p style={{fontSize:13, color:'var(--gray-500)', lineHeight:1.5, marginBottom: n.action?12:0}}>{n.body || n.message}</p>
                  {n.action && (
                    <button className="btn btn-outline btn-sm" style={{fontSize:12}}>{n.action}</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}
