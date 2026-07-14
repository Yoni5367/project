import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import countryCodes from '../data/countryCodes';

export function Login() {
  const { t } = useLang();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      // Mock login — check for admin
      const isAdmin = form.email.includes('admin');
      const isProvider = form.email.includes('provider');
      login({
        id: 1,
        name: isAdmin ? 'Admin User' : isProvider ? 'Tigist Worku' : 'Selam Bekele',
        email: form.email,
        role: isAdmin ? 'admin' : isProvider ? 'provider' : 'seeker',
        subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        verified: true,
      });
      setLoading(false);
      navigate(isAdmin ? '/admin' : isProvider ? '/provider/dashboard' : '/seeker/dashboard');
    }, 800);
  };

  return (
    <div style={authStyles.page}>
      <div style={authStyles.card} className="animate-fade">
        <div style={authStyles.logo}>
          <Link to="/" style={{ textDecoration: 'none', fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--teal)' }}>Debale</Link>
        </div>
        <h2 style={authStyles.title}>{t.login_title}</h2>
        <p style={authStyles.sub}>{t.login_subtitle}</p>

        <form onSubmit={handleSubmit} className="form-grid" style={{ marginTop: 24 }}>
          <div className="form-group">
            <label className="form-label">{t.login_email}</label>
            <input className="form-input" type="email" required placeholder="you@example.com"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">{t.login_password}</label>
            <input className="form-input" type="password" required placeholder="••••••••"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            <div style={{ textAlign: 'right', marginTop: 4 }}>
              <a href="#" style={{ fontSize: 13, color: 'var(--teal)' }}>{t.login_forgot}</a>
            </div>
          </div>

          <div style={authStyles.hint}>
            <strong>Demo logins:</strong> Use <em>admin@</em> for admin, <em>provider@</em> for provider, anything else for seeker.
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? '...' : t.login_btn}
          </button>
        </form>

        <div style={authStyles.footer}>
          {t.login_no_account} <Link to="/register" style={{ color: 'var(--teal)', fontWeight: 500 }}>{t.login_register}</Link>
        </div>
      </div>
    </div>
  );
}

export function Register() {
  const { t } = useLang();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: '' });
  const [countryCode, setCountryCode] = useState(countryCodes[0]);
  const [localPhone, setLocalPhone] = useState('');
  const [showCodePicker, setShowCodePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (step === 1) { setStep(2); set('phone', countryCode.code + localPhone); return; }
    setLoading(true);
    setTimeout(() => {
      login({
        id: Date.now(),
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: form.role,
        subscriptionExpiry: null,
        verified: false,
      });
      setLoading(false);
      navigate(form.role === 'seeker' ? '/seeker/form' : '/provider/form');
    }, 800);
  };

  return (
    <div style={authStyles.page}>
      <div style={{ ...authStyles.card, maxWidth: 500 }} className="animate-fade">
        <div style={authStyles.logo}>
          <Link to="/" style={{ textDecoration: 'none', fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--teal)' }}>Debale</Link>
        </div>
        <h2 style={authStyles.title}>{t.register_title}</h2>
        <p style={authStyles.sub}>{t.register_subtitle}</p>

        {/* Step indicator */}
        <div className="steps" style={{ marginTop: 24 }}>
          {[1, 2].map((s, i) => (
            <React.Fragment key={s}>
              <div className="step-item">
                <div className={`step-circle ${step > s ? 'done' : step === s ? 'active' : ''}`}>
                  {step > s ? '✓' : s}
                </div>
              </div>
              {i < 1 && <div className={`step-line ${step > 1 ? 'done' : ''}`} />}
            </React.Fragment>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="form-grid" style={{ marginTop: 20 }}>
          {step === 1 && (
            <>
              <div className="form-group">
                <label className="form-label">{t.register_name}</label>
                <input className="form-input" required placeholder="Selam Bekele"
                  value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">{t.register_email}</label>
                <input className="form-input" type="email" required placeholder="you@example.com"
                  value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">{t.register_phone}</label>
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
                  <input className="form-input" style={{ flex: 1, fontSize: 15 }} required placeholder="91 234 5678"
                    value={localPhone} onChange={e => setLocalPhone(e.target.value.replace(/\D/g, ''))}/>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{t.register_password}</label>
                <input className="form-input" type="password" required minLength={6} placeholder="Min 6 characters"
                  value={form.password} onChange={e => set('password', e.target.value)} />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="form-group">
                <label className="form-label">{t.register_role}</label>
                <div style={roleStyles.grid}>
                  {[
                    { val: 'seeker', icon: '🔍', label: t.register_role_seeker, desc: t.register_role_seeker_desc },
                    { val: 'provider', icon: '🏠', label: t.register_role_provider, desc: t.register_role_provider_desc },
                  ].map(r => (
                    <button
                      key={r.val}
                      type="button"
                      onClick={() => set('role', r.val)}
                      style={{
                        ...roleStyles.roleCard,
                        ...(form.role === r.val ? roleStyles.roleCardSelected : {}),
                      }}
                    >
                      <span style={{ fontSize: 28 }}>{r.icon}</span>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>{r.label}</span>
                      <span style={{ fontSize: 13, color: 'var(--text-gray)' }}>{r.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              {form.role && (
                <div className="alert alert-info">
                  ℹ️ After registration, you'll fill out your {form.role === 'seeker' ? 'profile' : 'room listing'} form, then complete payment to activate.
                </div>
              )}
            </>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            {step > 1 && (
              <button type="button" className="btn btn-outline" onClick={() => setStep(s => s - 1)} style={{ flex: 1 }}>
                ← {t.back_btn}
              </button>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 2 }}
              disabled={loading || (step === 2 && !form.role)}
            >
              {loading ? '...' : step < 2 ? `${t.next} →` : t.register_btn}
            </button>
          </div>
        </form>

        <div style={authStyles.footer}>
          {t.register_have_account} <Link to="/login" style={{ color: 'var(--teal)', fontWeight: 500 }}>{t.register_login}</Link>
        </div>
      </div>
    </div>
  );
}

const authStyles = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--cream)', padding: '80px 24px 40px',
  },
  card: {
    background: 'var(--white)', borderRadius: 'var(--radius-xl)',
    border: '1px solid var(--border)', padding: '40px',
    width: '100%', maxWidth: 440, boxShadow: 'var(--shadow-md)',
  },
  logo: { textAlign: 'center', marginBottom: 24 },
  title: { textAlign: 'center', fontSize: 24 },
  sub: { textAlign: 'center', fontSize: 14, color: 'var(--text-gray)', marginTop: 6 },
  footer: { textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--text-gray)' },
  hint: { background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 12, color: 'var(--text-gray)' },
};

const roleStyles = {
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  roleCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    padding: '20px 14px', border: '2px solid var(--border)', borderRadius: 'var(--radius-lg)',
    background: 'var(--white)', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center',
  },
  roleCardSelected: {
    borderColor: 'var(--teal)', background: 'var(--teal-light)',
    boxShadow: '0 0 0 4px rgba(27,114,114,0.10)',
  },
};
