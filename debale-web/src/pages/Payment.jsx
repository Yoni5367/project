import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { paymentsAPI } from '../services/api';
import { CheckCircle, Shield, Home, Send, Infinity, Smartphone, CreditCard, Landmark, ArrowRight } from 'lucide-react';

const GATEWAYS = [
  { id: 'telebirr', label: 'Tele Birr',          Icon: Smartphone, color: '#00A651' },
  { id: 'cbe',      label: 'CBE Birr',            Icon: CreditCard, color: '#003366' },
  { id: 'awash',    label: 'Awash Bank',           Icon: Landmark,  color: '#8B1A1A' },
  { id: 'dashen',   label: 'Dashen Bank',          Icon: Landmark,  color: '#1A5276' },
];

const ROLE_PLANS = {
  provider: {
    icon: Home,
    label: 'Provider Plan',
    featureLabel: (v) => v === 999 ? 'Unlimited rooms' : `Up to ${v} room${v > 1 ? 's' : ''}`,
    extraFeatures: () => [],
  },
  seeker: {
    icon: Send,
    label: 'Seeker Plan',
    featureLabel: (v) => v === 999 ? 'Unlimited applications' : `Up to ${v} applications`,
    extraFeatures: (plan) => {
      const items = [];
      const mg = plan?.maxGroups;
      const mga = plan?.maxGroupApplies;
      if (mg === 0) items.push('Cannot create groups');
      else if (mg === 1) items.push('Create 1 group');
      else if (mg >= 2) items.push(`Create up to ${mg} groups`);
      if (mga > 0) items.push(`Apply to ${mga} groups`);
      return items;
    },
  },
};

export default function Payment() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [plans, setPlans] = useState(null);
  const [planTier, setPlanTier] = useState('basic');
  const [duration, setDuration] = useState('1month');
  const [gateway, setGateway] = useState('telebirr');
  const [step, setStep] = useState('plans');
  const [paymentId, setPaymentId] = useState(null);
  const [reference, setReference] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  const role = user?.role || 'provider';
  const cfg = ROLE_PLANS[role] || ROLE_PLANS.provider;
  const Icon = cfg.icon;

  const selectedPlan = plans?.[planTier];
  const pricing = selectedPlan?.durations?.find(d => d.id === duration);
  const limit = role === 'provider' ? selectedPlan?.maxRooms : selectedPlan?.maxApplies;
  const isUnlimited = limit >= 999;

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await paymentsAPI.plans();
        setPlans(res.plans);
      } catch (err) {
        console.error('Failed to load plans:', err);
      } finally {
        setFetching(false);
      }
    };
    fetchPlans();
  }, []);

  const handleInitiate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await paymentsAPI.initiate(planTier, duration, gateway);
      setPaymentId(res.payment_id);
      setReference(res.reference);
      setStep('confirm');
    } catch (err) {
      setError(err.message || 'Failed to initiate payment');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      await paymentsAPI.confirm(paymentId);
      await refreshUser();
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Confirmation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBypass = async () => {
    setLoading(true);
    setError('');
    try {
      await paymentsAPI.bypass(planTier);
      await refreshUser();
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Activation failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div style={{paddingTop:70,minHeight:'100vh',background:'var(--cream)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center',maxWidth:420}}>
        <div style={{width:80,height:80,borderRadius:'50%',background:'var(--green-light)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 24px'}}>
          <CheckCircle size={40} color="var(--green)"/>
        </div>
        <h1 style={{fontSize:28,fontWeight:700,marginBottom:12}}>{t('payment_success')}</h1>
        <p style={{color:'var(--gray-500)',marginBottom:32}}>{t('payment_success_msg')}</p>
        <button onClick={()=>navigate('/dashboard')} className="btn btn-primary btn-lg">{t('go_to_dashboard')}</button>
      </div>
    </div>
  );

  return (
    <div style={{paddingTop:70,minHeight:'100vh',background:'var(--cream)'}}>
      <div className="container" style={{maxWidth:840,padding:'48px 24px'}}>
        {/* Header */}
        <div style={{marginBottom:36}}>
          <h1 style={{fontSize:28,fontWeight:700,marginBottom:4}}>
            {role === 'provider' ? 'Choose a Provider Plan' : 'Choose a Seeker Plan'}
          </h1>
          <p style={{color:'var(--gray-500)'}}>
            {role === 'provider'
              ? 'Pick a plan that matches how many rooms you want to list'
              : 'Pick a plan that matches how many rooms you want to apply to'}
          </p>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:28,alignItems:'start'}}>
          {/* Left — Plan selection */}
          <div>
            {/* Plan tiers */}
            {fetching ? (
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:28}}>
                {[1,2,3].map(i => <div key={i} style={{height:220,background:'var(--gray-100)',borderRadius:12,animation:'pulse 1.5s infinite'}}/>)}
              </div>
            ) : (
              <div style={{marginBottom:28}}>
                <p style={{fontSize:13,fontWeight:600,color:'var(--gray-500)',marginBottom:10,letterSpacing:0.5}}>SELECT PLAN</p>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
                  {Object.keys(plans || {basic:1,standard:1,premium:1}).map(tier => {
                    const p = plans?.[tier];
                    const isSelected = planTier === tier;
                    const lmt = role === 'provider' ? p?.maxRooms : p?.maxApplies;
                    const unl = lmt >= 999;
                    const price = p?.durations?.[0]?.total || 0;
                    return (
                      <button key={tier} onClick={() => { setPlanTier(tier); setStep('plans'); }}
                        style={{padding:'20px 12px',borderRadius:12,border:`2px solid ${isSelected?'var(--teal)':'var(--gray-200)'}`,background:isSelected?'var(--teal-light)':'white',cursor:'pointer',textAlign:'center',position:'relative',transition:'all 0.15s'}}>
                        {tier === 'standard' && <span style={{position:'absolute',top:-10,left:'50%',transform:'translateX(-50%)',background:'var(--teal)',color:'white',padding:'2px 10px',borderRadius:20,fontSize:11,fontWeight:600,whiteSpace:'nowrap'}}>Popular</span>}
                        <div style={{width:44,height:44,borderRadius:12,background:isSelected?'var(--teal)':'var(--gray-100)',display:'flex',alignItems:'center',justifyContent:'center',color:isSelected?'white':'var(--gray-500)',margin:'0 auto 10px'}}>
                          <Icon size={20}/>
                        </div>
                        <div style={{fontSize:14,fontWeight:600,textTransform:'capitalize',marginBottom:4}}>{tier}</div>
                        <div style={{fontSize:24,fontWeight:800,color:'var(--teal)',fontFamily:'var(--font-head)'}}>{price}</div>
                        <div style={{fontSize:11,color:'var(--gray-400)',marginBottom:8}}>ETB / month</div>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:4,fontSize:13,fontWeight:500,color:'var(--gray-600)'}}>
                          {unl ? <Infinity size={14}/> : null}
                          {cfg.featureLabel(lmt)}
                        </div>
                        {cfg.extraFeatures(p).map((f, i) => (
                          <div key={i} style={{fontSize:11,color:'var(--teal)',fontWeight:600,marginTop:2}}>{f}</div>
                        ))}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Duration */}
            {!fetching && (
              <div style={{marginBottom:28}}>
                <p style={{fontSize:13,fontWeight:600,color:'var(--gray-500)',marginBottom:10,letterSpacing:0.5}}>DURATION</p>
                <div style={{position:'relative'}}>
                  <select value={duration} onChange={(e) => setDuration(e.target.value)}
                    style={{width:'100%',padding:'14px 16px',borderRadius:10,border:'1.5px solid var(--gray-200)',background:'white',fontSize:14,fontWeight:500,appearance:'none',cursor:'pointer',outline:'none',transition:'border-color 0.15s'}}
                    onFocus={(e) => e.target.style.borderColor = 'var(--teal)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--gray-200)'}>
                    {selectedPlan?.durations?.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.label}, {cfg.featureLabel(limit)} — {d.total} ETB{d.discount ? ` (save ${d.discount} ETB)` : ''}
                      </option>
                    ))}
                  </select>
                  <div style={{position:'absolute',right:14,top:'50%',transform:'translateY(-50%)',pointerEvents:'none',color:'var(--gray-400)'}}>
                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </div>
              </div>
            )}

            {/* Payment method */}
            {!fetching && (
              <div>
                <p style={{fontSize:13,fontWeight:600,color:'var(--gray-500)',marginBottom:10,letterSpacing:0.5}}>PAYMENT METHOD</p>
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10}}>
                  {GATEWAYS.map(g => (
                    <button key={g.id} onClick={() => setGateway(g.id)}
                      style={{padding:'14px 16px',borderRadius:10,border:`1.5px solid ${gateway===g.id?'var(--teal)':'var(--gray-200)'}`,background:gateway===g.id?'var(--teal-light)':'white',cursor:'pointer',display:'flex',alignItems:'center',gap:12,transition:'all 0.15s'}}>
                      <g.Icon size={22} color={g.color}/>
                      <span style={{fontWeight:500,fontSize:14}}>{g.label}</span>
                      {gateway === g.id && <CheckCircle size={16} color="var(--teal)" style={{marginLeft:'auto'}}/>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right — Summary */}
          <div style={{background:'white',borderRadius:14,border:'1px solid var(--gray-200)',padding:24,position:'sticky',top:100}}>
            <h3 style={{fontSize:16,fontWeight:700,marginBottom:20}}>Order Summary</h3>

            {step === 'confirm' ? (
              <>
                <div style={{padding:16,background:'var(--teal-light)',borderRadius:10,marginBottom:20,textAlign:'center'}}>
                  <p style={{fontSize:12,color:'var(--gray-500)',marginBottom:4}}>Payment Reference</p>
                  <p style={{fontSize:18,fontWeight:800,color:'var(--teal)',fontFamily:'monospace',letterSpacing:1}}>{reference}</p>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:24}}>
                  <SummaryRow label="Plan" value={`${planTier.charAt(0).toUpperCase() + planTier.slice(1)} Plan`}/>
                  <SummaryRow label="Duration" value={selectedPlan?.durations?.find(d=>d.id===duration)?.label || '1 Month'}/>
                  <SummaryRow label="Payment" value={GATEWAYS.find(g=>g.id===gateway)?.label || gateway}/>
                  <div style={{height:1,background:'var(--gray-100)',margin:'4px 0'}}/>
                  <SummaryRow label="Total" value={`${pricing?.total || 0} ETB`} bold/>
                  {pricing?.discount > 0 && (
                    <SummaryRow label="You save" value={`${pricing.discount} ETB`} color="var(--green)"/>
                  )}
                </div>
                <button onClick={handleConfirm} className="btn btn-primary w-full" style={{justifyContent:'center'}} disabled={loading}>
                  {loading ? 'Confirming...' : 'Confirm Payment'}
                </button>
                {error && <p style={{color:'var(--red)',fontSize:13,marginTop:8,textAlign:'center'}}>{error}</p>}
              </>
            ) : (
              <>
                <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:24}}>
                  <SummaryRow label="Plan" value={`${planTier.charAt(0).toUpperCase() + planTier.slice(1)} Plan`}/>
                  <SummaryRow label="Duration" value={selectedPlan?.durations?.find(d=>d.id===duration)?.label || '1 Month'}/>
                  {!isUnlimited && <SummaryRow label="Room applications" value={cfg.featureLabel(limit)}/>}
                  {role === 'seeker' && selectedPlan?.maxGroups !== undefined && (
                    <SummaryRow label="Groups" value={selectedPlan.maxGroups === 0 ? 'Cannot create' : `Create ${selectedPlan.maxGroups}`}/>
                  )}
                  {role === 'seeker' && selectedPlan?.maxGroupApplies > 0 && (
                    <SummaryRow label="Group requests" value={`${selectedPlan.maxGroupApplies}`}/>
                  )}
                  <SummaryRow label="Payment" value={GATEWAYS.find(g=>g.id===gateway)?.label || gateway}/>
                  <div style={{height:1,background:'var(--gray-100)',margin:'4px 0'}}/>
                  <SummaryRow label="Total" value={`${pricing?.total || 0} ETB`} bold/>
                  {pricing?.discount > 0 && (
                    <SummaryRow label="You save" value={`${pricing.discount} ETB`} color="var(--green)"/>
                  )}
                </div>

                <button onClick={handleInitiate} className="btn btn-primary w-full btn-lg" style={{justifyContent:'center'}} disabled={loading || fetching}>
                  {loading ? 'Processing...' : `Pay ${pricing?.total || 0} ETB`}
                </button>

                <div style={{marginTop:12}}>
                  <button onClick={handleBypass} style={{background:'none',border:'none',color:'var(--gray-400)',fontSize:12,cursor:'pointer',width:'100%',textAlign:'center',padding:'6px 0'}} disabled={loading}>
                    DEV: Activate without payment
                  </button>
                </div>

                {error && <p style={{color:'var(--red)',fontSize:13,marginTop:8,textAlign:'center'}}>{error}</p>}

                <p style={{textAlign:'center',fontSize:12,color:'var(--gray-400)',marginTop:16,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                  <Shield size={13}/>{t('secure_payment')}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}

function SummaryRow({ label, value, bold, color }) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <span style={{fontSize:14,color:'var(--gray-500)'}}>{label}</span>
      <span style={{fontWeight:bold?700:500,fontSize:bold?18:14,color:color||'inherit',fontFamily:bold?'var(--font-head)':'inherit'}}>{value}</span>
    </div>
  );
}
