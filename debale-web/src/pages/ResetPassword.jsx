import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../services/api';
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

export default function ResetPassword() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    setError('');
    try {
      await authAPI.resetPassword({ token, password: form.password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', paddingTop: 70, background: 'var(--cream)' }}>
        <div style={{ margin: 'auto', textAlign: 'center', maxWidth: 440, padding: 48 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--green-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <CheckCircle size={36} color="var(--green)" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Password Reset Successfully!</h1>
          <p style={{ color: 'var(--gray-500)', marginBottom: 32 }}>Redirecting you to sign in...</p>
          <Link to="/login" className="btn btn-primary" style={{ justifyContent: 'center' }}>
            <ArrowLeft size={16}/> Sign In Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', paddingTop: 70, background: 'var(--cream)' }}>
      <div style={{ flex: '0 0 45%', background: 'linear-gradient(135deg,var(--teal) 0%,#0A5C4F 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <svg viewBox="0 0 60 48" width="60" height="48" fill="none" style={{ marginBottom: 24 }}>
            <path d="M6 28 L30 8 L54 28" stroke="white" strokeWidth="4" strokeLinecap="round"/>
            <circle cx="18" cy="28" r="7" fill="white" opacity="0.9"/>
            <circle cx="42" cy="28" r="7" fill="white" opacity="0.9"/>
            <rect x="26" y="32" width="8" height="14" rx="2" fill="var(--gold)"/>
          </svg>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Set New Password</h2>
          <p style={{ opacity: 0.8, lineHeight: 1.6, maxWidth: 280 }}>Enter your new password below.</p>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6, fontFamily: 'var(--font-head)' }}>Create New Password</h1>
          <p style={{ color: 'var(--gray-500)', marginBottom: 36 }}>Your new password must be different from previously used passwords.</p>
          {error && (
            <div style={{ padding: '12px 16px', background: 'var(--red-light)', color: 'var(--red)', borderRadius: 8, marginBottom: 20, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={15}/> {error}
            </div>
          )}
          {!token && (
            <div style={{ padding: '12px 16px', background: 'var(--red-light)', color: 'var(--red)', borderRadius: 8, marginBottom: 20, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={15}/> Invalid or missing reset token. Please request a new password reset.
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{t('password')}</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }}/>
                <input type={showPw ? 'text' : 'password'} className="form-input" style={{ paddingLeft: 42, paddingRight: 42 }} placeholder="••••••••"
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required/>
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}>
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t('confirm_password')}</label>
              <input type="password" className="form-input" placeholder="••••••••"
                value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} required/>
            </div>
            <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center', height: 48 }} disabled={loading || !token}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--gray-500)' }}>
            <Link to="/login" style={{ color: 'var(--teal)', fontWeight: 600 }}>Back to Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
