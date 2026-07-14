import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Home, Search, ChevronDown } from 'lucide-react';
import countryCodes from '../data/countryCodes';

export default function Register() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '', role: params.get('role') || 'seeker' });
  const [countryCode, setCountryCode] = useState(countryCodes[0]);
  const [localPhone, setLocalPhone] = useState('');
  const [showCodePicker, setShowCodePicker] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    const fullPhone = countryCode.code + localPhone;
    setLoading(true);
    setError('');
    try {
      const user = await register({ name: form.name, email: form.email, phone: fullPhone, password: form.password, role: form.role });
      navigate(user.role === 'seeker' ? '/seeker-form' : '/provider-form');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', paddingTop: 70 }}>
      <div style={{ flex: '0 0 40%', background: 'linear-gradient(135deg,var(--teal) 0%,#0A5C4F 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <div style={{ color: 'white', textAlign: 'center' }}>
          <svg viewBox="0 0 60 48" width="60" height="48" fill="none" style={{ marginBottom: 24 }}>
            <path d="M6 28 L30 8 L54 28" stroke="white" strokeWidth="4" strokeLinecap="round"/>
            <circle cx="18" cy="28" r="7" fill="white" opacity="0.9"/>
            <circle cx="42" cy="28" r="7" fill="white" opacity="0.9"/>
            <rect x="26" y="32" width="8" height="14" rx="2" fill="var(--gold)"/>
          </svg>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Join Debale</h2>
          <p style={{ opacity: 0.8, lineHeight: 1.7, maxWidth: 260 }}>Find your perfect housemate across Ethiopia.</p>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 48px', background: 'var(--cream)', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>{t('register_title')}</h1>
          <p style={{ color: 'var(--gray-500)', marginBottom: 28 }}>{t('register_sub')}</p>

          {error && <div style={{ padding: '12px 16px', background: 'var(--red-light)', color: 'var(--red)', borderRadius: 8, marginBottom: 20, fontSize: 14 }}>{error}</div>}

          {/* Role selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
            {[{ role: 'seeker', Icon: Search, label: t('room_seeker'), desc: t('seeker_desc') },
              { role: 'provider', Icon: Home, label: t('room_provider'), desc: t('provider_desc') }].map(({ role, Icon, label, desc }) => (
              <button key={role} type="button" onClick={() => setForm({ ...form, role })}
                style={{ padding: 16, borderRadius: 12, border: `2px solid ${form.role === role ? 'var(--teal)' : 'var(--gray-200)'}`, background: form.role === role ? 'var(--teal-light)' : 'white', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
                <Icon size={20} color={form.role === role ? 'var(--teal)' : 'var(--gray-400)'} style={{ marginBottom: 8 }}/>
                <div style={{ fontWeight: 600, fontSize: 14, color: form.role === role ? 'var(--teal)' : 'var(--dark)' }}>{label}</div>
                <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>{desc}</div>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{t('full_name')}</label>
              <input className="form-input" placeholder="Abebe Kebede" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required/>
            </div>
            <div className="form-group">
              <label className="form-label">{t('email')}</label>
              <input type="email" className="form-input" placeholder="you@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required/>
            </div>
            <div className="form-group">
              <label className="form-label">{t('phone')}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ position: 'relative', flex: '0 0 140px' }}>
                  <button type="button" onClick={() => setShowCodePicker(!showCodePicker)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--gray-200)', background: '#fff', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, height: 42 }}>
                    <span style={{ fontSize: 20 }}>{countryCode.flag}</span>
                    <span style={{ fontWeight: 600 }}>{countryCode.code}</span>
                    <ChevronDown size={16} style={{ marginLeft: 'auto', color: 'var(--gray-400)' }}/>
                  </button>
                  {showCodePicker && (
                    <>
                      <div onClick={() => setShowCodePicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }}/>
                      <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 100, width: 280, maxHeight: 240, overflowY: 'auto', background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginTop: 4 }}>
                        {countryCodes.map(c => (
                          <button key={c.code + c.iso} type="button" onClick={() => { setCountryCode(c); setShowCodePicker(false); }}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', border: 'none', background: countryCode.iso === c.iso ? 'var(--teal-light)' : 'transparent', cursor: 'pointer', fontSize: 14, textAlign: 'left' }}>
                            <span style={{ fontSize: 20 }}>{c.flag}</span>
                            <span style={{ fontWeight: 600, width: 55 }}>{c.code}</span>
                            <span style={{ color: 'var(--gray-600)' }}>{c.name}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <input className="form-input" style={{ flex: 1, fontSize: 15 }} placeholder="91 234 5678" value={localPhone} onChange={e => setLocalPhone(e.target.value.replace(/\D/g, ''))}/>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{t('password')}</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPw ? 'text' : 'password'} className="form-input" style={{ paddingRight: 42 }} placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required/>
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}>
                    {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{t('confirm_password')}</label>
                <input type="password" className="form-input" placeholder="••••••••" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} required/>
              </div>
            </div>
            <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center', height: 48, marginTop: 8 }} disabled={loading}>
              {loading ? 'Creating account...' : t('create_account')}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--gray-500)' }}>
            {t('have_account')} <Link to="/login" style={{ color: 'var(--teal)', fontWeight: 600 }}>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
