import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { agreementsAPI, uploadAPI, applicationsAPI, housemateAPI } from '../services/api';
import {
  FileText, Download, Upload, CheckCircle, Lock,
  CreditCard, AlertCircle, Send, Shield, ArrowLeft, Building, User, Users
} from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Pay 10% Fee', Icon: CreditCard },
  { id: 2, label: 'Download PDF', Icon: Download },
  { id: 3, label: 'Upload Signed', Icon: Upload },
];

export default function Agreement() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const applicationId = searchParams.get('applicationId');
  const groupApplicationId = searchParams.get('groupApplicationId');

  const [step, setStep] = useState(1);
  const [payGateway, setPayGateway] = useState('');
  const [paying, setPaying] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [match, setMatch] = useState(null);
  const [agreementData, setAgreementData] = useState(null);
  const [loading, setLoading] = useState(!!(groupApplicationId || applicationId));
  const [downloading, setDownloading] = useState(false);
  const [paymentRef, setPaymentRef] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [appProviderId, setAppProviderId] = useState(null);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [autoDetecting, setAutoDetecting] = useState(!(applicationId || groupApplicationId));
  const [fallbackAppId, setFallbackAppId] = useState(null);
  const [fallbackIsGroup, setFallbackIsGroup] = useState(false);

  const isGroup = !!(groupApplicationId || fallbackIsGroup);
  const activeId = groupApplicationId || applicationId || fallbackAppId;

  // Auto-redirect to dashboard after 5 seconds on step 4
  useEffect(() => {
    if (step === 4) {
      const timer = setTimeout(() => navigate('/dashboard'), 5000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // ── Auto-detect accepted application when no query param ──
  useEffect(() => {
    if (applicationId || groupApplicationId) return;
    if (fallbackAppId) return;

    const findAccepted = async () => {
      try {
        setAutoDetecting(true);
        // Try individual accepted apps first
        const res = await applicationsAPI.mine();
        const apps = res.applications || res || [];
        const accepted = apps.find(a => a.status === 'accepted');
        if (accepted) {
          setFallbackAppId(accepted.id);
          setFallbackIsGroup(false);
          return;
        }
        // Try provider's group applications
        try {
          const groupRes = await housemateAPI.getGroupApplications();
          const groupApps = groupRes.applications || [];
          const acceptedGroup = groupApps.find(a => a.status === 'accepted');
          if (acceptedGroup) {
            setFallbackAppId(acceptedGroup.id);
            setFallbackIsGroup(true);
            return;
          }
        } catch {}
        // Try seeker's own group
        const myGroupRes = await housemateAPI.myGroup();
        const myGroup = myGroupRes.group || myGroupRes;
        if (myGroup && myGroup.application && myGroup.application.status === 'accepted') {
          setFallbackAppId(myGroup.application.id);
          setFallbackIsGroup(true);
          return;
        }
      } catch {} finally { setAutoDetecting(false); }
    };
    findAccepted();
  }, [applicationId, groupApplicationId, fallbackAppId]);

  // ── Fetch agreement data ──
  useEffect(() => {
    if (!activeId) return;
    setAutoDetecting(false);

    const fetchData = async () => {
      setLoading(true);
      try {
        if (isGroup) {
          const res = await agreementsAPI.groupGet(activeId);
          const ag = res.agreement || null;
          const gApp = ag?.housemate_group_applications || res.group_application || {};
          const listing = gApp.listings || {};
          const provider = listing.users || {};
          setAppProviderId(listing.provider_id || ag?.provider_id);
          setMatch({
            seekerName: `${res.members?.length || 0} group members`,
            members: res.members || [],
            providerName: provider.name || '',
            roomTitle: listing.title || '',
            location: [listing.city, listing.subcity, listing.neighborhood].filter(Boolean).join(', ') || '',
            rent: listing.price ? String(listing.price) : '',
            leaseDuration: listing.lease_duration || '3 months minimum',
            rules: listing.house_rules || '',
          });
          if (ag) {
            setAgreementData(ag);
            if (ag.paid && ag.status !== 'signed' && ag.status !== 'active') setStep(2);
            if (ag.status === 'signed' || ag.status === 'active') setStep(4);
          } else {
            setAgreementData(null);
          }
        } else {
          const data = await agreementsAPI.get(activeId);
          const ag = data.agreement || data;
          setAgreementData(ag);
          const apps = ag.applications || ag;
          const listing = apps.listings || {};
          const provider = listing.users || {};
          const seeker = apps.users || {};
          setAppProviderId(listing.provider_id || ag.provider_id);
          setMatch({
            seekerName: seeker.name || ag.seeker_name || '',
            providerName: provider.name || ag.provider_name || '',
            roomTitle: listing.title || ag.listing_title || '',
            location: [listing.city, listing.subcity, listing.neighborhood].filter(Boolean).join(', ') || ag.location || '',
            rent: listing.price ? String(listing.price) : '',
            leaseDuration: listing.lease_duration || '3 months minimum',
            rules: listing.house_rules || '',
          });
          if (ag.paid && ag.status !== 'signed' && ag.status !== 'active') setStep(2);
          if (ag.status === 'signed' || ag.status === 'active') setStep(4);
        }
      } catch {
        try {
          if (isGroup && activeId) {
            const appRes = await housemateAPI.getGroupApplications();
            const apps = appRes.applications || [];
            const app = apps.find(a => a.id === activeId);
            if (app) {
              const listing = app.listings || {};
              const provider = listing.users || {};
              setAppProviderId(listing.provider_id || app.provider_id);
              setMatch({
                seekerName: `${app.member_count || 0} group members`,
                members: [],
                providerName: provider.name || '',
                roomTitle: listing.title || app.listing_title || '',
                location: '',
                rent: listing.price ? String(listing.price) : '',
                leaseDuration: listing.lease_duration || '3 months minimum',
                rules: listing.house_rules || '',
              });
            }
          } else if (!isGroup && activeId) {
            const appRes = await applicationsAPI.get(activeId);
            const appData = appRes.application || appRes;
            const listing = appData.listings || {};
            const provider = listing.users || {};
            const seeker = appData.users || {};
            setAppProviderId(listing.provider_id || appData.provider_id);
            setMatch({
              seekerName: seeker.name || '',
              providerName: provider.name || '',
              roomTitle: listing.title || '',
              location: [listing.city, listing.subcity, listing.neighborhood].filter(Boolean).join(', ') || '',
              rent: listing.price ? String(listing.price) : '',
              leaseDuration: listing.lease_duration || '3 months minimum',
              rules: listing.house_rules || '',
            });
          }
        } catch { setMatch(null); }
      } finally { setLoading(false); }
    };
    fetchData();
  }, [activeId]);

  const isProvider = user?.id === (agreementData?.provider_id || appProviderId);
  const rentAmount = match?.rent ? Number(match.rent) : 0;
  const feeAmount = Math.round(rentAmount * 0.1);

  const GATEWAYS = [
    { id: 'telebirr', name: 'Telebirr', color: '#00A651' },
    { id: 'cbe', name: 'CBE Birr', color: '#003366' },
    { id: 'awash', name: 'Awash Bank', color: '#8B1A1A' },
    { id: 'dashen', name: 'Dashen Bank', color: '#1A5276' },
  ];

  const handlePay = async () => {
    if (!payGateway) return alert('Please select a payment method');
    if (!activeId) return alert('No application selected — try refreshing the page');
    setPaying(true);
    try {
      const res = isGroup
        ? await agreementsAPI.groupInitiate(activeId, payGateway)
        : await agreementsAPI.initiate(activeId, payGateway);
      if (!res) return alert('No response from server');
      setPaymentRef(res.reference);
      setPaymentAmount(res.amount);
    } catch (err) { alert(err.message); }
    finally { setPaying(false); }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      if (isGroup) {
        await agreementsAPI.groupConfirm(activeId);
      } else {
        await agreementsAPI.confirm(activeId);
      }
      setAgreementData(prev => ({ ...prev, paid: true }));
      setStep(2);
    } catch (err) { alert(err.message); }
    finally { setConfirming(false); }
  };

  const handleDownload = () => {
    setDownloading(true);
    const token = localStorage.getItem('debale_token');
    const pdfUrl = isGroup ? agreementsAPI.groupPdfUrl(activeId) : agreementsAPI.pdfUrl(activeId);
    const id = activeId;

    fetch(pdfUrl, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (!res.ok) throw new Error('Failed to download PDF');
        return res.blob();
      })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Debale_Agreement_${id.slice(0, 8)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        setDownloading(false);
        setTimeout(() => setStep(3), 800);
      })
      .catch(async () => {
        try {
          const { default: jsPDF } = await import('jspdf');
          const doc = new jsPDF();
          doc.setFontSize(10);
          let y = 14;
          (match?.roomTitle ? `Agreement for ${match.roomTitle}` : 'Housemate Agreement').split('\n').forEach(line => {
            if (y > 280) { doc.addPage(); y = 14; }
            doc.text(line, 14, y); y += 5;
          });
          doc.save(`Debale_Agreement_${id.slice(0, 8)}.pdf`);
          setDownloading(false);
          setTimeout(() => setStep(3), 800);
        } catch { alert('Could not generate PDF.'); setDownloading(false); }
      });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) setUploadedFile(file);
  };

  const handleSubmit = async () => {
    if (!uploadedFile || !activeId) return;
    setSubmitting(true);
    try {
      const uploadRes = await uploadAPI.photo(uploadedFile, 'agreements');
      const fileUrl = uploadRes.url || uploadRes.file_url || uploadRes.path;
      if (isGroup) {
        await agreementsAPI.groupUpload(activeId, fileUrl, uploadedFile.name);
      } else {
        await agreementsAPI.upload(activeId, fileUrl, uploadedFile.name);
      }
      setJustSubmitted(true);
      setStep(4);
    } catch (err) { alert(err.message); }
    finally { setSubmitting(false); }
  };

  if (autoDetecting) {
    return (
      <div style={{ paddingTop: 70, minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 500, padding: 24 }}>
          <div style={{height:400, background:'var(--gray-100)', borderRadius:14, animation:'pulse 1.5s infinite'}}/>
        </div>
      </div>
    );
  }

  if (!activeId) {
    return (
      <div style={{ paddingTop: 70, minHeight: '100vh', background: 'var(--cream)' }}>
        <div className="container" style={{ maxWidth: 600, padding: '80px 24px', textAlign: 'center' }}>
          <Lock size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }}/>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No Application Selected</h2>
          <p style={{ color: 'var(--gray-500)', marginBottom: 24 }}>Go to your dashboard and select an accepted match to generate an agreement.</p>
          <Link to="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
        </div>
      </div>
    );
  }

  if (loading || !match) {
    return (
      <div style={{ paddingTop: 70, minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 500, padding: 24 }}>
          <div style={{height:400, background:'var(--gray-100)', borderRadius:14, animation:'pulse 1.5s infinite'}}/>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ paddingTop: 70, minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 500, padding: 24 }}>
          <div style={{height:400, background:'var(--gray-100)', borderRadius:14, animation:'pulse 1.5s infinite'}}/>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 70, minHeight: '100vh', background: 'var(--cream)' }}>
      <div className="container" style={{ maxWidth: 760, padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gray-500)', textDecoration: 'none', fontSize: 13 }}>
              <ArrowLeft size={14}/> Dashboard
            </Link>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-head)', marginBottom: 4 }}>
            Housemate Agreement
          </h1>
          <p style={{ color: 'var(--gray-500)' }}>
            Complete the agreement in 3 steps to finalise your match.
          </p>
        </div>

        {/* Progress Steps */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 40 }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  background: step > s.id ? 'var(--teal)' : step === s.id ? 'var(--teal)' : 'white',
                  border: `2px solid ${step >= s.id ? 'var(--teal)' : 'var(--gray-200)'}`,
                }}>
                  {step > s.id
                    ? <CheckCircle size={20} color="white" />
                    : <s.Icon size={18} color={step === s.id ? 'white' : 'var(--gray-400)'} />
                  }
                </div>
                <p style={{ fontSize: 11, fontWeight: step === s.id ? 600 : 400, color: step >= s.id ? 'var(--teal)' : 'var(--gray-400)', textAlign: 'center', maxWidth: 80, lineHeight: 1.3 }}>{s.label}</p>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 2, background: step > s.id ? 'var(--teal)' : 'var(--gray-200)', margin: '0 6px', marginBottom: 28 }} />
              )}
            </div>
          ))}
        </div>

        {/* STEP 1 — Pay 10% Fee */}
        {step === 1 && (
          <div className="card" style={{ padding: 32 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 28, padding: 20, background: 'var(--gold-light)', borderRadius: 12 }}>
              <Lock size={22} color="var(--gold)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Agreement Fee — 10% of Monthly Rent</p>
                <p style={{ fontSize: 14, color: 'var(--gray-600)', lineHeight: 1.6 }}>
                  The room provider pays a one-time fee of <strong>{feeAmount.toLocaleString()} ETB</strong> (10% of {rentAmount.toLocaleString()} ETB monthly rent) to generate the legally binding housemate agreement.
                </p>
              </div>
            </div>

            {!isProvider && (
              <div style={{ padding: '16px 20px', background: 'var(--teal-light)', borderRadius: 12, marginBottom: 24, display: 'flex', gap: 10, alignItems: 'center' }}>
                <User size={20} color="var(--teal)" />
                <p style={{ fontSize: 14 }}>The <strong>room provider</strong> will pay the agreement fee. Once paid, you'll be able to download and sign the agreement.</p>
              </div>
            )}

            {match && (
              <div style={{ marginBottom: 28 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Match Details</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    ['Provider', match.providerName, Building],
                    [isGroup ? 'Group Members' : 'Seeker', match.seekerName, isGroup ? Users : User],
                    ['Property', match.roomTitle],
                    ['Location', match.location],
                    ['Monthly Rent', `${match.rent ? Number(match.rent).toLocaleString() : '—'} ETB`],
                    ['Agreement Fee', `${feeAmount.toLocaleString()} ETB`, CreditCard],
                  ].map(([k, v, Icon]) => (
                    <div key={k} style={{ padding: '12px 14px', background: 'var(--gray-50)', borderRadius: 10 }}>
                      <p style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 3 }}>{k}</p>
                      <p style={{ fontWeight: 500, fontSize: 14 }}>{v}</p>
                    </div>
                  ))}
                </div>

                {/* Group members list */}
                {isGroup && match.members?.length > 0 && (
                  <div style={{ marginTop: 12, padding: '14px 16px', background: 'var(--gray-50)', borderRadius: 10 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', marginBottom: 8 }}>All Group Members</p>
                    {match.members.map((m, i) => (
                      <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 12, background: 'var(--teal-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 10, color: 'var(--teal)' }}>
                          {i + 1}
                        </div>
                        <span style={{ fontSize: 13 }}>{m.users?.name || 'Member'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {isProvider ? (
              paymentRef ? (
                <>
                  <div style={{ padding: 20, background: 'var(--teal-light)', borderRadius: 12, marginBottom: 24, textAlign: 'center' }}>
                    <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 4 }}>Payment Reference</p>
                    <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--teal)', fontFamily: 'monospace', letterSpacing: 1 }}>{paymentRef}</p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'white', border: '1px solid var(--gray-200)', borderRadius: 12, marginBottom: 20 }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>Agreement Fee</span>
                      <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>10% of {rentAmount.toLocaleString()} ETB/mo</p>
                    </div>
                    <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--teal)' }}>{paymentAmount.toLocaleString()} ETB</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--gray-50)', borderRadius: 10, marginBottom: 24 }}>
                    <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>Payment Method</span>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{GATEWAYS.find(g => g.id === payGateway)?.name || payGateway}</span>
                  </div>
                  <button onClick={handleConfirm} disabled={confirming} className="btn btn-primary w-full btn-lg" style={{ justifyContent: 'center' }}>
                    {confirming ? 'Confirming...' : 'Confirm Payment'}
                  </button>
                  <button onClick={() => { setPaymentRef(null); setPayGateway(''); }} style={{ width: '100%', marginTop: 10, padding: '12px', background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer', fontSize: 13 }}>
                    Change payment method
                  </button>
                </>
              ) : (
                <>
                  <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 14 }}>Select Payment Method</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
                    {GATEWAYS.map(g => (
                      <button key={g.id} onClick={() => setPayGateway(g.id)}
                        style={{ padding: '14px', borderRadius: 10, border: `2px solid ${payGateway === g.id ? g.color : 'var(--gray-200)'}`, background: payGateway === g.id ? `${g.color}12` : 'white', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: g.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 10, margin: '0 auto 8px' }}>
                          {g.name.slice(0, 3)}
                        </div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: payGateway === g.id ? g.color : 'var(--dark)' }}>{g.name}</p>
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'white', border: '1px solid var(--gray-200)', borderRadius: 12, marginBottom: 20 }}>
                    <span style={{ fontWeight: 600 }}>Agreement Fee (10% of rent)</span>
                    <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--teal)' }}>{feeAmount.toLocaleString()} ETB</span>
                  </div>
                  <button onClick={handlePay} disabled={paying || !payGateway} className="btn btn-gold w-full btn-lg" style={{ justifyContent: 'center' }}>
                    {paying ? 'Processing...' : `Pay ${feeAmount.toLocaleString()} ETB`}
                  </button>
                </>
              )
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', background: 'var(--gray-50)', borderRadius: 12 }}>
                <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 8 }}>
                  Waiting for the room provider to pay the agreement fee.
                </p>
                <button onClick={() => { window.location.reload(); }} style={{ background: 'none', border: '1px solid var(--gray-300)', padding: '8px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: 'var(--gray-500)' }}>
                  Refresh Status
                </button>
              </div>
            )}

            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--gray-400)', marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <Shield size={12} /> One-time fee · Non-refundable after payment
            </p>
          </div>
        )}

        {/* STEP 2 — Download PDF */}
        {step === 2 && (
          <div className="card" style={{ padding: 32 }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--green-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle size={36} color="var(--green)" />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Payment Successful!</h2>
              <p style={{ color: 'var(--gray-500)', fontSize: 15 }}>Download the PDF agreement below. All parties must sign it.</p>
            </div>

            <div style={{ background: 'var(--teal-light)', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
              <p style={{ fontWeight: 600, marginBottom: 10 }}>What to do next:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  '1. Download the PDF agreement below',
                  '2. Print it out (or sign digitally)',
                  isGroup ? '3. Every group member and the provider must sign' : '3. Both parties sign the document',
                  '4. Scan or photograph the signed agreement',
                  '5. Come back and upload it in Step 3',
                ].map(s => (
                  <p key={s} style={{ fontSize: 14, color: 'var(--gray-700)' }}>{s}</p>
                ))}
              </div>
            </div>

            {match && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                {[
                  ['Provider', match.providerName],
                  [isGroup ? 'Group' : 'Seeker', match.seekerName],
                  ['Property', match.roomTitle],
                  ['Rent', `${match.rent ? Number(match.rent).toLocaleString() : '—'} ETB/mo`],
                ].map(([k, v]) => (
                  <div key={k} style={{ padding: '12px 14px', background: 'var(--gray-50)', borderRadius: 10 }}>
                    <p style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 3 }}>{k}</p>
                    <p style={{ fontWeight: 500, fontSize: 14 }}>{v}</p>
                  </div>
                ))}
              </div>
            )}

            <button onClick={handleDownload} disabled={downloading} className="btn btn-primary w-full btn-lg" style={{ justifyContent: 'center' }}>
              {downloading ? 'Downloading...' : <><Download size={18} /> Download PDF Agreement</>}
            </button>
            <button onClick={() => setStep(3)} style={{ width: '100%', marginTop: 10, padding: '12px', background: 'none', border: 'none', color: 'var(--gray-500)', cursor: 'pointer', fontSize: 14 }}>
              Already signed? Skip to Upload
            </button>
          </div>
        )}

        {/* STEP 3 — Upload Signed PDF */}
        {step === 3 && (
          <div className="card" style={{ padding: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Upload Signed Agreement</h2>
            <p style={{ color: 'var(--gray-500)', marginBottom: 28, fontSize: 15 }}>
              After {isGroup ? 'all parties have' : 'both parties have'} signed the agreement, upload the signed copy here.
            </p>

            <div style={{ background: 'var(--gold-light)', border: '1px solid var(--gold-mid)', borderRadius: 12, padding: '14px 18px', marginBottom: 24, display: 'flex', gap: 10, alignItems: 'center', fontSize: 13 }}>
              <AlertCircle size={16} color="var(--gold)" />
              <span>{isGroup ? 'All group members and the provider must sign.' : 'Both parties must sign — provider and seeker.'} Missing signatures = invalid agreement.</span>
            </div>

            <label htmlFor="agreement-upload" style={{ display: 'block', cursor: 'pointer' }}>
              <div style={{
                border: `2px dashed ${uploadedFile ? 'var(--green)' : 'var(--gray-300)'}`,
                borderRadius: 14, padding: '48px 24px', textAlign: 'center',
                background: uploadedFile ? 'var(--green-light)' : 'var(--gray-50)',
                transition: 'all 0.2s'
              }}>
                {uploadedFile ? (
                  <>
                    <CheckCircle size={40} color="var(--green)" style={{ margin: '0 auto 12px' }} />
                    <p style={{ fontWeight: 600, fontSize: 16, color: 'var(--green)', marginBottom: 4 }}>File Ready!</p>
                    <p style={{ fontSize: 14, color: 'var(--gray-600)' }}>{uploadedFile.name}</p>
                    <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 4 }}>{(uploadedFile.size / 1024).toFixed(1)} KB · Click to change</p>
                  </>
                ) : (
                  <>
                    <Upload size={40} color="var(--gray-400)" style={{ margin: '0 auto 12px' }} />
                    <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>Click to upload signed agreement</p>
                    <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>PDF, JPG, or PNG · Max 10MB</p>
                  </>
                )}
              </div>
              <input id="agreement-upload" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>

            <div style={{ margin: '24px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Before submitting, confirm:</p>
              {[
                isGroup ? 'All group members and provider have signed' : 'Both provider and seeker have signed',
                'Date is filled in on all signature lines',
                'Document is clearly readable (not blurry)',
                'All pages are included in the upload',
              ].map(item => (
                <label key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
                  <input type="checkbox" style={{ width: 16, height: 16, accentColor: 'var(--teal)' }} />
                  {item}
                </label>
              ))}
            </div>

            <button onClick={handleSubmit} disabled={!uploadedFile || submitting} className="btn btn-primary w-full btn-lg" style={{ justifyContent: 'center' }}>
              {submitting ? 'Uploading...' : <><Send size={18} /> Submit Signed Agreement</>}
            </button>
          </div>
        )}

        {/* STEP 4 — Done */}
        {step === 4 && (
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--green-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CheckCircle size={44} color="var(--green)" />
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 10 }}>
              {justSubmitted ? 'Agreement Submitted!' : 'Agreement Complete!'}
            </h2>
            <p style={{ color: 'var(--gray-500)', fontSize: 16, maxWidth: 440, margin: '0 auto 32px', lineHeight: 1.7 }}>
              {justSubmitted
                ? 'Your signed agreement has been uploaded. The other party has been notified.'
                : agreementData?.status === 'signed' || agreementData?.status === 'active'
                  ? 'This agreement has already been completed by the other party. Redirecting to dashboard...'
                  : 'Your signed housemate agreement has been received. Both parties will receive a confirmation.'}
            </p>
            {match && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 400, margin: '0 auto 32px' }}>
                {[['Property', match.roomTitle], ['Rent', `${match.rent ? Number(match.rent).toLocaleString() : '—'} ETB/mo`], ['Status', 'Active'], ['Match', 'Confirmed']].map(([k, v]) => (
                  <div key={k} style={{ padding: 14, background: 'var(--gray-50)', borderRadius: 10 }}>
                    <p style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 3 }}>{k}</p>
                    <p style={{ fontWeight: 600, fontSize: 14 }}>{v}</p>
                  </div>
                ))}
              </div>
            )}
            <p style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 16 }}>
              Redirecting to dashboard in 5 seconds...
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 12 }}>
              <Link to="/dashboard" className="btn btn-primary">Go to Dashboard Now</Link>
              <Link to="/messages" className="btn btn-outline">Open Messages</Link>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes pulse {0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  );
}
