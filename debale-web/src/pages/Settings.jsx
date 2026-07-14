import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { usersAPI, authAPI } from '../services/api';
import { Globe, Lock, CreditCard, User, Bell, Shield, ChevronRight, Check } from 'lucide-react';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState('account');
  const [saved, setSaved] = useState(false);
  const [lang, setLang] = useState(i18n.language);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [pw, setPw] = useState({ current:'', newPw:'', confirm:'' });
  const [savingPw, setSavingPw] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);
  const [notifSettings, setNotifSettings] = useState({
    emailApplications:true, emailInterview:true, emailRejection:true,
    emailExpiry:true, smsAccepted:true, smsInterview:false,
  });

  const handleLangChange = (l) => { setLang(l); i18n.changeLanguage(l); };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await usersAPI.updateProfile({ name, email, phone });
      if (refreshUser) await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async () => {
    if (!pw.current || !pw.newPw) return;
    if (pw.newPw !== pw.confirm) return alert('Passwords do not match');
    if (pw.newPw.length < 8) return alert('Password must be at least 8 characters');
    setSavingPw(true);
    try {
      await authAPI.changePassword({ current_password: pw.current, new_password: pw.newPw });
      setPw({ current:'', newPw:'', confirm:'' });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingPw(false);
    }
  };

  const handleSaveNotif = async () => {
    setSavingNotif(true);
    try {
      await usersAPI.updateProfile({ notification_preferences: notifSettings });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingNotif(false);
    }
  };

  const navItems = [
    { key:'account',  label:'Account',       Icon: User },
    { key:'language', label:'Language',       Icon: Globe },
    { key:'password', label:'Password',       Icon: Lock },
    { key:'notifications', label:'Notifications', Icon: Bell },
    { key:'privacy',  label:'Privacy',        Icon: Shield },
  ];

  return (
    <div style={{paddingTop:70, minHeight:'100vh', background:'var(--cream)'}}>
      <div className="container" style={{maxWidth:900, padding:'40px 24px'}}>
        <h1 style={{fontSize:26, fontWeight:700, marginBottom:32, fontFamily:'var(--font-head)'}}>{t('settings')}</h1>

        <div style={{display:'grid', gridTemplateColumns:'220px 1fr', gap:24}}>

          {/* Sidebar */}
          <div style={{background:'white', borderRadius:14, padding:'12px', border:'1px solid var(--gray-100)', alignSelf:'start'}}>
            {navItems.map(({key,label,Icon})=>(
              <button key={key} onClick={()=>setTab(key)}
                style={{width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8, border:'none', cursor:'pointer', marginBottom:4, textAlign:'left', fontSize:14,
                  fontWeight:tab===key?600:400, background:tab===key?'var(--teal-light)':'transparent', color:tab===key?'var(--teal)':'var(--gray-600)'}}>
                <Icon size={16}/>{label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{background:'white', borderRadius:14, padding:28, border:'1px solid var(--gray-100)'}}>

            {/* Account */}
            {tab==='account' && (
              <div>
                <h2 style={{fontSize:18, fontWeight:600, marginBottom:24}}>Account Information</h2>
                <div style={{display:'flex', gap:20, alignItems:'center', marginBottom:28, padding:'20px', background:'var(--gray-50)', borderRadius:12}}>
                  <div style={{width:64, height:64, borderRadius:'50%', background:'var(--teal)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:700}}>
                    {user?.name?.charAt(0)}
                  </div>
                  <div>
                    <p style={{fontWeight:700, fontSize:18}}>{user?.name}</p>
                    <p style={{color:'var(--gray-500)', fontSize:14}}>{user?.email}</p>
                    <span className={`badge ${user?.role==='provider'?'badge-gold':'badge-teal'}`} style={{marginTop:6, fontSize:12}}>
                      {user?.role==='provider'?'Room Provider':'Room Seeker'}
                    </span>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={name} onChange={e=>setName(e.target.value)}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" className="form-input" value={email} onChange={e=>setEmail(e.target.value)}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input className="form-input" placeholder="+251 9XX XXX XXX" value={phone} onChange={e=>setPhone(e.target.value)}/>
                </div>
                <button onClick={handleSaveProfile} disabled={savingProfile} className="btn btn-primary">
                  {savingProfile ? 'Saving...' : saved ? <><Check size={15}/> Saved!</> : 'Save Changes'}
                </button>
              </div>
            )}

            {/* Language */}
            {tab==='language' && (
              <div>
                <h2 style={{fontSize:18, fontWeight:600, marginBottom:8}}>Language</h2>
                <p style={{color:'var(--gray-500)', fontSize:14, marginBottom:28}}>Choose your preferred language for the platform.</p>
                <div style={{display:'flex', flexDirection:'column', gap:12}}>
                  {[
                    { code:'en', label:'English', flag:'🇬🇧', desc:'All text in English' },
                    { code:'am', label:'አማርኛ (Amharic)', flag:'🇪🇹', desc:'ሁሉም ጽሑፍ በአማርኛ' },
                  ].map(l=>(
                    <button key={l.code} onClick={()=>handleLangChange(l.code)}
                      style={{display:'flex', alignItems:'center', gap:16, padding:'18px 20px', borderRadius:12, border:`2px solid ${lang===l.code?'var(--teal)':'var(--gray-200)'}`, background:lang===l.code?'var(--teal-light)':'white', cursor:'pointer', textAlign:'left'}}>
                      <span style={{fontSize:28}}>{l.flag}</span>
                      <div style={{flex:1}}>
                        <p style={{fontWeight:600, fontSize:15, color:lang===l.code?'var(--teal)':'var(--dark)'}}>{l.label}</p>
                        <p style={{fontSize:13, color:'var(--gray-500)'}}>{l.desc}</p>
                      </div>
                      {lang===l.code && <Check size={20} color="var(--teal)"/>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Password */}
            {tab==='password' && (
              <div>
                <h2 style={{fontSize:18, fontWeight:600, marginBottom:24}}>Change Password</h2>
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input type="password" className="form-input" placeholder="••••••••" value={pw.current} onChange={e=>setPw({...pw,current:e.target.value})}/>
                </div>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input type="password" className="form-input" placeholder="••••••••" value={pw.newPw} onChange={e=>setPw({...pw,newPw:e.target.value})}/>
                  <p className="form-hint">Minimum 8 characters</p>
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input type="password" className="form-input" placeholder="••••••••" value={pw.confirm} onChange={e=>setPw({...pw,confirm:e.target.value})}/>
                  {pw.newPw && pw.confirm && pw.newPw!==pw.confirm && <p className="form-error">Passwords don't match</p>}
                </div>
                <button onClick={handleSavePassword} disabled={savingPw||!pw.current||!pw.newPw||pw.newPw!==pw.confirm} className="btn btn-primary">
                  {savingPw ? 'Updating...' : saved?<><Check size={15}/> Updated!</>:'Update Password'}
                </button>
              </div>
            )}

            {/* Notifications */}
            {tab==='notifications' && (
              <div>
                <h2 style={{fontSize:18, fontWeight:600, marginBottom:24}}>Notification Preferences</h2>
                <div style={{display:'flex', flexDirection:'column', gap:4}}>
                  {[
                    ['emailApplications', 'Email: New applicant applied to my listing'],
                    ['emailInterview', 'Email: Interview scheduled'],
                    ['emailRejection', 'Email: Application not selected'],
                    ['emailExpiry', 'Email: Subscription expiry reminder'],
                    ['smsAccepted', 'SMS: Application accepted'],
                    ['smsInterview', 'SMS: Interview reminder'],
                  ].map(([key,label])=>(
                    <div key={key} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 0', borderBottom:'1px solid var(--gray-50)'}}>
                      <p style={{fontSize:14}}>{label}</p>
                      <button onClick={()=>setNotifSettings(s=>({...s,[key]:!s[key]}))}
                        style={{width:44, height:24, borderRadius:12, border:'none', cursor:'pointer', transition:'all 0.2s', position:'relative',
                          background:notifSettings[key]?'var(--teal)':'var(--gray-200)'}}>
                        <div style={{position:'absolute', top:3, transition:'all 0.2s', width:18, height:18, borderRadius:'50%', background:'white', boxShadow:'0 1px 4px rgba(0,0,0,0.2)',
                          left: notifSettings[key]?'calc(100% - 21px)':'3px'}}/>
                      </button>
                    </div>
                  ))}
                </div>
                <button onClick={handleSaveNotif} disabled={savingNotif} className="btn btn-primary" style={{marginTop:24}}>
                  {savingNotif ? 'Saving...' : saved?<><Check size={15}/> Saved!</>:'Save Preferences'}
                </button>
              </div>
            )}

            {/* Privacy */}
            {tab==='privacy' && (
              <div>
                <h2 style={{fontSize:18, fontWeight:600, marginBottom:24}}>Privacy & Security</h2>
                <div style={{display:'flex', flexDirection:'column', gap:16}}>
                  {[
                    ['Profile Visibility', 'Your profile is visible to room providers when you apply.', true],
                    ['Phone Number', 'Revealed only after application is accepted.', true],
                    ['ID Documents', 'Stored securely. Only visible to admins for verification.', true],
                  ].map(([title,desc,locked])=>(
                    <div key={title} style={{padding:'18px 20px', borderRadius:12, border:'1px solid var(--gray-100)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <div>
                        <p style={{fontWeight:500, marginBottom:4}}>{title}</p>
                        <p style={{fontSize:13, color:'var(--gray-500)'}}>{desc}</p>
                      </div>
                      <span style={{padding:'4px 10px', borderRadius:20, fontSize:12, background:'var(--green-light)', color:'var(--green)', fontWeight:500}}>Protected</span>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:28, padding:'20px', background:'var(--red-light)', borderRadius:12}}>
                  <p style={{fontWeight:600, color:'var(--red)', marginBottom:4}}>Danger Zone</p>
                  <p style={{fontSize:13, color:'var(--gray-600)', marginBottom:16}}>Permanently delete your account and all associated data.</p>
                  <button className="btn btn-danger btn-sm">Delete Account</button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
