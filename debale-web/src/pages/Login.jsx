import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(form.email, form.password);
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', paddingTop: 70 }}>
      {/* Left panel */}
      <div style={{ flex: '0 0 45%', background: 'linear-gradient(135deg,var(--teal) 0%,#0A5C4F 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <svg viewBox="0 0 60 48" width="60" height="48" fill="none" style={{ marginBottom: 24 }}>
            <path d="M6 28 L30 8 L54 28" stroke="white" strokeWidth="4" strokeLinecap="round"/>
            <circle cx="18" cy="28" r="7" fill="white" opacity="0.9"/>
            <circle cx="42" cy="28" r="7" fill="white" opacity="0.9"/>
            <rect x="26" y="32" width="8" height="14" rx="2" fill="var(--gold)"/>
          </svg>
          <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 12, fontFamily: 'var(--font-head)' }}>debale</h2>
          <p style={{ fontSize: 16, opacity: 0.85, maxWidth: 280, lineHeight: 1.6 }}>Ethiopia's trusted housemate matching platform</p>
          <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {['Safe & Verified Profiles', 'AI-Powered Matching', 'Local Ethiopian Payments'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0 }}/>
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, background: 'var(--cream)' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <h1 style={{ fontSize: 30, fontWeight: 700, marginBottom: 6, fontFamily: 'var(--font-head)' }}>{t('login_title')}</h1>
          <p style={{ color: 'var(--gray-500)', marginBottom: 36 }}>{t('login_sub')}</p>

          {error && (
            <div style={{ padding: '12px 16px', background: 'var(--red-light)', color: 'var(--red)', borderRadius: 8, marginBottom: 20, fontSize: 14 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{t('email')}</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }}/>
                <input type="email" className="form-input" style={{ paddingLeft: 42 }} placeholder="you@example.com"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required/>
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label className="form-label">{t('password')}</label>
                <Link to="/forgot-password" style={{ fontSize: 13, color: 'var(--teal)' }}>{t('forgot_password')}</Link>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }}/>
                <input type={showPw ? 'text' : 'password'} className="form-input" style={{ paddingLeft: 42, paddingRight: 42 }} placeholder="••••••••"
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required/>
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}>
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center', height: 48, marginTop: 8 }} disabled={loading}>
              {loading ? 'Signing in...' : t('sign_in')}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 28, fontSize: 14, color: 'var(--gray-500)' }}>
            {t('no_account')} <Link to="/register" style={{ color: 'var(--teal)', fontWeight: 600 }}>Sign Up</Link>
          </p>

        
        </div>
      </div>
    </div>
  );
}
