import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { notificationsAPI } from '../services/api';
import { Bell, Menu, X, Globe, ChevronDown, LogOut, Settings, LayoutDashboard, Sparkles, FileText } from 'lucide-react';

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const data = await notificationsAPI.getAll();
        setNotifications(data.notifications || data || []);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      }
    };
    if (user) fetchNotifs();
  }, [user]);

  const unreadCount = notifications.filter(n => n.unread || !n.read).length;

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.readAll();
      setNotifications(prev => prev.map(n => ({ ...n, unread: false, read: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const toggleLang = () => i18n.changeLanguage(i18n.language === 'en' ? 'am' : 'en');
  const handleLogout = () => { logout(); navigate('/'); setUserMenuOpen(false); };
  const isActive = (path) => location.pathname === path;

  const navLinks = [
    ['/browse', t('nav_browse')],
    ...(user ? [['/dashboard', t('nav_dashboard')]] : []),
  ];

  return (
    <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:100,background:'rgba(255,255,255,0.97)',backdropFilter:'blur(12px)',borderBottom:'1px solid var(--gray-100)',height:70}}>
      <div className="container" style={{display:'flex',alignItems:'center',justifyContent:'space-between',height:'100%'}}>

        {/* Logo */}
        <Link to="/" style={{display:'flex',alignItems:'center',gap:10,textDecoration:'none'}}>
          <svg viewBox="0 0 40 32" width="40" height="32" fill="none">
            <path d="M5 18 L20 5 L35 18" stroke="#0E7C6B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="18" r="4" fill="#0E7C6B"/>
            <circle cx="28" cy="18" r="4" fill="#0E7C6B"/>
            <rect x="17" y="20" width="6" height="8" rx="1.5" fill="#C9970C"/>
          </svg>
          <span style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:22,color:'var(--dark)',letterSpacing:'-0.5px'}}>debale</span>
        </Link>

        {/* Desktop Nav */}
        <div style={{display:'flex',gap:4,alignItems:'center'}}>
          {navLinks.map(([path,label]) => (
            <Link key={path} to={path} style={{padding:'6px 14px',borderRadius:8,fontSize:14,fontWeight:500,
              color:isActive(path)?'var(--teal)':'var(--gray-600)',
              background:isActive(path)?'var(--teal-light)':'transparent',textDecoration:'none'}}>
              {label}
            </Link>
          ))}

          {/* Find a Group link — visible when logged in */}
          {user && user.role === 'seeker' && (
            <Link to="/find-group" style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:8,fontSize:14,fontWeight:500,textDecoration:'none',
              color:isActive('/find-group')||isActive('/housemate-intake')||isActive('/housemate-suggestions')||isActive('/housemate-group')||isActive('/housemate-multi-room')?'var(--teal)':'var(--gray-600)',
              background:isActive('/find-group')||isActive('/housemate-intake')||isActive('/housemate-suggestions')||isActive('/housemate-group')||isActive('/housemate-multi-room')?'var(--teal-light)':'transparent'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Find a Group
            </Link>
          )}
          {/* AI Agent link — visible when logged in */}
          {user && (
            <Link to="/ai-agent" style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:8,fontSize:14,fontWeight:500,textDecoration:'none',
              color:isActive('/ai-agent')?'var(--gold)':'var(--gray-600)',
              background:isActive('/ai-agent')?'var(--gold-light)':'transparent'}}>
              <Sparkles size={14}/> AI Assistant
            </Link>
          )}
        </div>

        {/* Right side */}
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {/* Language */}
          <button onClick={toggleLang} style={{display:'flex',alignItems:'center',gap:4,padding:'6px 12px',borderRadius:8,border:'1px solid var(--gray-200)',background:'transparent',cursor:'pointer',fontSize:13,color:'var(--gray-600)'}}>
            <Globe size={14}/> {i18n.language==='en'?'አማ':'EN'}
          </button>

          {user ? (
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              {/* Notifications */}
              <div style={{position:'relative'}}>
                <button onClick={()=>setNotifOpen(!notifOpen)} style={{position:'relative',width:36,height:36,borderRadius:8,border:'1px solid var(--gray-200)',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Bell size={16} color="var(--gray-600)"/>
                  {unreadCount>0 && <span style={{position:'absolute',top:4,right:4,width:8,height:8,borderRadius:'50%',background:'var(--red)'}}/>}
                </button>
                {notifOpen && (
                  <div style={{position:'absolute',right:0,top:44,width:320,background:'white',borderRadius:12,boxShadow:'0 8px 32px rgba(0,0,0,0.12)',border:'1px solid var(--gray-100)',zIndex:200}}>
                    <div style={{padding:'14px 16px',borderBottom:'1px solid var(--gray-100)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{fontWeight:600,fontSize:15}}>{t('notifications')}</span>
                      {unreadCount > 0 && (
                        <button onClick={handleMarkAllRead} style={{fontSize:12,color:'var(--teal)',border:'none',background:'none',cursor:'pointer'}}>{t('mark_read')}</button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <div style={{padding:'24px 16px',textAlign:'center',color:'var(--gray-400)',fontSize:13}}>No notifications yet</div>
                    ) : notifications.slice(0, 5).map(n => (
                      <div key={n.id} style={{padding:'12px 16px',display:'flex',gap:10,alignItems:'flex-start',background:(n.unread||!n.read)?'var(--teal-light)':'white',borderBottom:'1px solid var(--gray-50)'}}>
                        {(n.unread||!n.read) && <div style={{width:8,height:8,borderRadius:'50%',background:'var(--teal)',marginTop:5,flexShrink:0}}/>}
                        <div>
                          <p style={{fontSize:13}}>{n.text || n.message || n.content}</p>
                          <p style={{fontSize:11,color:'var(--gray-400)',marginTop:2}}>{n.time || n.created_at ? new Date(n.created_at).toLocaleDateString() : ''}</p>
                        </div>
                      </div>
                    ))}
                    <Link to="/notifications" onClick={()=>setNotifOpen(false)} style={{display:'block',textAlign:'center',padding:'12px',fontSize:13,color:'var(--teal)',borderTop:'1px solid var(--gray-100)'}}>
                      View all notifications
                    </Link>
                  </div>
                )}
              </div>

              {/* User menu */}
              <div style={{position:'relative'}}>
                <button onClick={()=>setUserMenuOpen(!userMenuOpen)} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 12px',borderRadius:8,border:'1px solid var(--gray-200)',background:'transparent',cursor:'pointer'}}>
                  <div style={{width:26,height:26,borderRadius:'50%',background:'var(--teal)',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:600}}>
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <span style={{fontSize:14,fontWeight:500}}>{user.name?.split(' ')[0]}</span>
                  <ChevronDown size={12}/>
                </button>
                {userMenuOpen && (
                  <div style={{position:'absolute',right:0,top:44,width:210,background:'white',borderRadius:12,boxShadow:'0 8px 32px rgba(0,0,0,0.12)',border:'1px solid var(--gray-100)',zIndex:200,overflow:'hidden'}}>
                    <div style={{padding:'14px 16px',borderBottom:'1px solid var(--gray-100)'}}>
                      <p style={{fontWeight:600,fontSize:14}}>{user.name}</p>
                      <p style={{fontSize:12,color:'var(--gray-400)'}}>{user.email}</p>
                    </div>
                    {[
                      ['/dashboard','Dashboard',LayoutDashboard],
                      ['/ai-agent','AI Assistant',Sparkles],
                      ['/agreement','Agreement',FileText],
                      ['/settings','Settings',Settings],
                    ].map(([path,label,Icon]) => (
                      <Link key={path} to={path} onClick={()=>setUserMenuOpen(false)}
                        style={{display:'flex',alignItems:'center',gap:10,padding:'10px 16px',fontSize:14,color: path==='/ai-agent'?'var(--gold)': path==='/agreement'?'var(--teal)':'var(--gray-700)',textDecoration:'none'}}>
                        <Icon size={15}/>{label}
                      </Link>
                    ))}
                    <div style={{height:1,background:'var(--gray-100)'}}/>
                    <button onClick={handleLogout} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 16px',fontSize:14,color:'var(--red)',width:'100%',border:'none',background:'none',cursor:'pointer',textAlign:'left'}}>
                      <LogOut size={15}/> {t('nav_logout')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{display:'flex',gap:8}}>
              <Link to="/login" className="btn btn-ghost btn-sm">{t('nav_login')}</Link>
              <Link to="/register" className="btn btn-primary btn-sm">{t('nav_register')}</Link>
            </div>
          )}

          {/* Mobile toggle */}
          <button onClick={()=>setMenuOpen(!menuOpen)} style={{display:'none',width:36,height:36,borderRadius:8,border:'1px solid var(--gray-200)',background:'transparent',cursor:'pointer',alignItems:'center',justifyContent:'center'}} className="mobile-toggle">
            {menuOpen ? <X size={18}/> : <Menu size={18}/>}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{background:'white',borderTop:'1px solid var(--gray-100)',padding:'16px 24px',display:'flex',flexDirection:'column',gap:4}}>
          {navLinks.map(([path,label]) => (
            <Link key={path} to={path} onClick={()=>setMenuOpen(false)} style={{padding:'10px 12px',borderRadius:8,fontSize:15,color:'var(--gray-700)',textDecoration:'none'}}>{label}</Link>
          ))}
          {user && <>
            <Link to="/ai-agent" onClick={()=>setMenuOpen(false)} style={{padding:'10px 12px',borderRadius:8,fontSize:15,color:'var(--gold)',textDecoration:'none',display:'flex',alignItems:'center',gap:8}}><Sparkles size={15}/>AI Assistant</Link>
            <Link to="/agreement" onClick={()=>setMenuOpen(false)} style={{padding:'10px 12px',borderRadius:8,fontSize:15,color:'var(--teal)',textDecoration:'none',display:'flex',alignItems:'center',gap:8}}><FileText size={15}/>Agreement</Link>
          </>}
          {!user && <>
            <Link to="/login" onClick={()=>setMenuOpen(false)} className="btn btn-outline" style={{marginTop:8}}>Sign In</Link>
            <Link to="/register" onClick={()=>setMenuOpen(false)} className="btn btn-primary" style={{marginTop:8}}>Get Started</Link>
          </>}
        </div>
      )}
    </nav>
  );
}
