import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../services/api';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authAPI.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', paddingTop: 70, background: 'var(--cream)' }}>
        <div style={{ margin: 'auto', textAlign: 'center', maxWidth: 440, padding: 48 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--green-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <CheckCircle size={36} color="var(--green)" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Check Your Email</h1>
          <p style={{ color: 'var(--gray-500)', marginBottom: 32, lineHeight: 1.7 }}>
            We've sent a password reset link to <strong>{email}</strong>. Please check your inbox and follow the instructions.
          </p>
          <Link to="/login" className="btn btn-primary" style={{ justifyContent: 'center' }}>
            <ArrowLeft size={16}/> Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', paddingTop: 70, background: 'var(--cream)' }}>
      <div style={{ flex: '0 0 45%', background: 'linear-gradient(135deg,var(--teal) 0%,#0A5C4F 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <svg viewBox="0 0 60 48" width="60" height="48" fill="none" style={{ marginBottom: 24 }}>
            <path d="M6 28 L30 8 L54 28" stroke="white" strokeWidth="4" strokeLinecap="round"/>
            <circle cx="18" cy="28" r="7" fill="white" opacity="0.9"/>
            <circle cx="42" cy="28" r="7" fill="white" opacity="0.9"/>
            <rect x="26" y="32" width="8" height="14" rx="2" fill="var(--gold)"/>
          </svg>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Reset Password</h2>
          <p style={{ opacity: 0.8, lineHeight: 1.6, maxWidth: 280 }}>Enter your email and we'll send you instructions to reset your password.</p>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--gray-500)', fontSize: 14, marginBottom: 24 }}>
            <ArrowLeft size={16}/> Back to Sign In
          </Link>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6, fontFamily: 'var(--font-head)' }}>Forgot Password?</h1>
          <p style={{ color: 'var(--gray-500)', marginBottom: 36 }}>No worries, we'll send you reset instructions.</p>
          {error && (
            <div style={{ padding: '12px 16px', background: 'var(--red-light)', color: 'var(--red)', borderRadius: 8, marginBottom: 20, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={15}/> {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{t('email')}</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }}/>
                <input type="email" className="form-input" style={{ paddingLeft: 42 }} placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} required/>
              </div>
            </div>
            <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center', height: 48 }} disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
