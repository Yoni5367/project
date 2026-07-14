import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { listingsAPI, uploadAPI, paymentsAPI } from '../services/api';
import { Upload, ChevronRight, ChevronLeft, Image, X, CheckCircle, AlertTriangle, Infinity } from 'lucide-react';

const STEPS = ['Room Details','Location','Requirements','Review'];

export default function ProviderForm() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [step, setStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    propertyType:'', monthlyRent:'', wifi:false, electricity:false, water:false,
    furnishing:'', roomsAvailable:'', leaseDuration:'',
    city:'', subcity:'', neighborhood:'', landmark:'',
    preferredGender:'', preferredOccupation:'', ageMin:'', ageMax:'',
    smokingAllowed:'no', petsAllowed:'no', visitorsAllowed:'no',
    houseRules:'', dealBreakers:'',
  });
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [subInfo, setSubInfo] = useState(null);
  const [loadingSub, setLoadingSub] = useState(true);

  useEffect(() => {
    const fetchSub = async () => {
      try {
        const res = await paymentsAPI.status();
        setSubInfo(res);
      } catch {} finally {
        setLoadingSub(false);
      }
    };
    fetchSub();
  }, []);

  const maxRooms = subInfo?.max_rooms ?? 999;
  const usedRooms = subInfo?.rooms_used ?? 0;
  const remaining = maxRooms - usedRooms;
  const isUnlimited = maxRooms >= 999;
  const limitReached = remaining <= 0;

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        const result = await uploadAPI.photo(file);
        setPhotos(prev => [...prev, result.url || result.file_url]);
      }
    } catch (err) {
      alert('Failed to upload photo: ' + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = {
        title: `${form.propertyType} in ${form.subcity || form.city}`,
        property_type: form.propertyType,
        price: parseInt(form.monthlyRent),
        city: form.city,
        neighborhood: form.subcity,
        landmark: form.landmark,
        furnishing: form.furnishing,
        rooms_available: parseInt(form.roomsAvailable) || 1,
        lease_duration: form.leaseDuration,
        preferred_gender: form.preferredGender,
        preferred_occupation: form.preferredOccupation,
        age_min: parseInt(form.ageMin) || null,
        age_max: parseInt(form.ageMax) || null,
        smoking_allowed: form.smokingAllowed,
        pets_allowed: form.petsAllowed,
        visitors_allowed: form.visitorsAllowed,
        house_rules: form.houseRules,
        deal_breakers: form.dealBreakers,
        includes_wifi: form.wifi,
        includes_electricity: form.electricity,
        includes_water: form.water,
        photos,
        status: 'draft',
      };
      const result = await listingsAPI.create(payload);
      navigate('/payment', { state: { draftId: result.listing?.id || result.id, type: 'provider' } });
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    if(step===0) return (
      <div>
        <h2 style={{fontSize:22,fontWeight:600,marginBottom:24}}>Room Details</h2>
        <div className="form-row">
          <div className="form-group"><label className="form-label">{t('property_type')}</label>
            <select className="form-input form-select" value={form.propertyType} onChange={e=>set('propertyType',e.target.value)}>
              <option value="">Select type...</option>
              <option>{t('single_room')}</option><option>{t('shared_apartment')}</option>
              <option>{t('full_apartment')}</option><option>{t('studio')}</option>
            </select></div>
          <div className="form-group"><label className="form-label">{t('monthly_rent')} (ETB)</label>
            <input type="number" className="form-input" placeholder="3500" value={form.monthlyRent} onChange={e=>set('monthlyRent',e.target.value)}/></div>
        </div>
        <div className="form-group"><label className="form-label">{t('includes')}</label>
          <div style={{display:'flex',gap:16}}>
            {[['wifi','WiFi'],['electricity','Electricity'],['water','Water']].map(([k,label])=>(
              <label key={k} style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:14}}>
                <input type="checkbox" checked={form[k]} onChange={e=>set(k,e.target.checked)} style={{width:16,height:16,accentColor:'var(--teal)'}}/>{label}
              </label>
            ))}
          </div></div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">{t('furnishing')}</label>
            <select className="form-input form-select" value={form.furnishing} onChange={e=>set('furnishing',e.target.value)}>
              <option value="">Select...</option>
              <option>{t('fully_furnished')}</option><option>{t('semi_furnished')}</option><option>{t('unfurnished')}</option>
            </select></div>
          <div className="form-group"><label className="form-label">{t('rooms_available')}</label>
            <input type="number" className="form-input" min="1" max="10" placeholder="1" value={form.roomsAvailable} onChange={e=>set('roomsAvailable',e.target.value)}/></div>
        </div>
        <div className="form-group"><label className="form-label">{t('lease_duration')}</label>
          <select className="form-input form-select" value={form.leaseDuration} onChange={e=>set('leaseDuration',e.target.value)}>
            <option value="">Select...</option>
            <option>1 Month</option><option>3 Months</option><option>6 Months</option><option>Flexible</option>
          </select></div>
        <div className="form-group"><label className="form-label">{t('upload_photos')}</label>
          <div style={{border:'2px dashed var(--gray-200)',borderRadius:10,padding:'32px',textAlign:'center',cursor:'pointer',background:'var(--gray-50)'}}
            onClick={() => fileInputRef.current?.click()}>
            <Image size={28} color="var(--gray-400)" style={{margin:'0 auto 10px'}}/>
            <p style={{fontSize:14,color:'var(--gray-500)',marginBottom:4}}>{uploading ? 'Uploading...' : 'Click to upload room photos'}</p>
            <p style={{fontSize:12,color:'var(--gray-400)'}}>{t('photos_hint')}</p>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoUpload} style={{display:'none'}}/>
          {photos.length > 0 && (
            <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
              {photos.map((url,i)=>(
                <div key={i} style={{position:'relative',width:80,height:80,borderRadius:8,overflow:'hidden',border:'1px solid var(--gray-200)'}}>
                  <img src={url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  <button onClick={()=>removePhoto(i)} style={{position:'absolute',top:2,right:2,width:20,height:20,borderRadius:'50%',border:'none',background:'rgba(0,0,0,0.6)',color:'white',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>
                    <X size={12}/>
                  </button>
                </div>
              ))}
              <div style={{width:80,height:80,borderRadius:8,border:'2px dashed var(--gray-300)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'var(--gray-400)',fontSize:11}}
                onClick={() => fileInputRef.current?.click()}>
                + Add
              </div>
            </div>
          )}
        </div>
      </div>
    );
    if(step===1) return (
      <div>
        <h2 style={{fontSize:22,fontWeight:600,marginBottom:24}}>Location</h2>
        <div className="form-row">
          <div className="form-group"><label className="form-label">{t('city')}</label>
            <select className="form-input form-select" value={form.city} onChange={e=>set('city',e.target.value)}>
              <option value="">Select City</option>
              <option>Addis Ababa</option><option>Dire Dawa</option><option>Bahir Dar</option>
              <option>Hawassa</option><option>Mekelle</option><option>Adama</option>
            </select></div>
          <div className="form-group"><label className="form-label">{t('subcity')}</label>
            <input className="form-input" placeholder="e.g. Bole, Kirkos..." value={form.subcity} onChange={e=>set('subcity',e.target.value)}/></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">{t('neighborhood')}</label>
            <input className="form-input" placeholder="Specific neighborhood" value={form.neighborhood} onChange={e=>set('neighborhood',e.target.value)}/></div>
          <div className="form-group"><label className="form-label">{t('landmark')}</label>
            <input className="form-input" placeholder="Near a landmark..." value={form.landmark} onChange={e=>set('landmark',e.target.value)}/></div>
        </div>
      </div>
    );
    if(step===2) return (
      <div>
        <h2 style={{fontSize:22,fontWeight:600,marginBottom:24}}>Requirements & Rules</h2>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Preferred Gender</label>
            <select className="form-input form-select" value={form.preferredGender} onChange={e=>set('preferredGender',e.target.value)}>
              <option value="">{t('no_preference')}</option>
              <option>{t('male_only')}</option><option>{t('female_only')}</option>
            </select></div>
          <div className="form-group"><label className="form-label">Preferred Occupation</label>
            <select className="form-input form-select" value={form.preferredOccupation} onChange={e=>set('preferredOccupation',e.target.value)}>
              <option value="">{t('no_preference')}</option>
              <option>Employed Only</option><option>Student Only</option>
            </select></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Min Age</label>
            <input type="number" className="form-input" placeholder="18" value={form.ageMin} onChange={e=>set('ageMin',e.target.value)}/></div>
          <div className="form-group"><label className="form-label">Max Age</label>
            <input type="number" className="form-input" placeholder="40" value={form.ageMax} onChange={e=>set('ageMax',e.target.value)}/></div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:20}}>
          {[['smokingAllowed','Smoking Allowed'],['petsAllowed','Pets Allowed'],['visitorsAllowed','Visitors Allowed']].map(([k,label])=>(
            <div className="form-group" key={k} style={{marginBottom:0}}>
              <label className="form-label">{label}</label>
              <select className="form-input form-select" value={form[k]} onChange={e=>set(k,e.target.value)}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
                <option value="limited">Limited</option>
              </select>
            </div>
          ))}
        </div>
        <div className="form-group"><label className="form-label">{t('house_rules')}</label>
          <textarea className="form-input" rows={3} placeholder="e.g. No loud music after 10pm, keep common areas clean..."
            value={form.houseRules} onChange={e=>set('houseRules',e.target.value)} style={{resize:'vertical'}}/></div>
        <div className="form-group"><label className="form-label">{t('deal_breakers')}</label>
          <textarea className="form-input" rows={3} placeholder="e.g. No smoking indoors, no pets..."
            value={form.dealBreakers} onChange={e=>set('dealBreakers',e.target.value)} style={{resize:'vertical'}}/></div>
      </div>
    );
    if(step===3) return (
      <div>
        <h2 style={{fontSize:22,fontWeight:600,marginBottom:24}}>Review & Submit</h2>
        <div style={{background:'var(--teal-light)',borderRadius:12,padding:24,marginBottom:24}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            {[['Property Type',form.propertyType||'—'],['Monthly Rent',form.monthlyRent?`${form.monthlyRent} ETB`:'—'],['Furnishing',form.furnishing||'—'],['City',form.city||'—'],['Preferred Gender',form.preferredGender||'Any'],['Photos',`${photos.length} uploaded`]].map(([k,v])=>(
              <div key={k}><p style={{fontSize:12,color:'var(--gray-500)'}}>{k}</p><p style={{fontWeight:500}}>{v}</p></div>
            ))}
          </div>
        </div>
        <div style={{background:'var(--gold-light)',border:'1px solid var(--gold-mid)',borderRadius:10,padding:16}}>
          <p style={{fontWeight:600,marginBottom:4}}>Next: Payment</p>
          <p style={{fontSize:14,color:'var(--gray-600)'}}>After submission you'll pay <strong>200 ETB/month</strong> to publish your listing.</p>
        </div>
      </div>
    );
  };

  return (
    <div style={{paddingTop:70,minHeight:'100vh',background:'var(--cream)'}}>
      <div className="container" style={{maxWidth:720,padding:'48px 24px'}}>
        <div style={{marginBottom:32}}>
          <h1 style={{fontSize:28,fontWeight:700,marginBottom:4,fontFamily:'var(--font-head)'}}>{t('provider_form_title')}</h1>
          <p style={{color:'var(--gray-500)'}}>Step {step+1} of {STEPS.length}: {STEPS[step]}</p>
        </div>

        {/* Room limit banner */}
        {!loadingSub && (
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 16px',borderRadius:10,background:limitReached?'#FEE2E2':'var(--teal-light)',border:`1px solid ${limitReached?'#FCA5A5':'var(--teal)'}`,marginBottom:20,fontSize:13}}>
            {limitReached ? <AlertTriangle size={16} color="#B91C1C"/> : isUnlimited ? <Infinity size={16} color="var(--teal)"/> : <CheckCircle size={16} color="var(--teal)"/>}
            <span style={{color:limitReached?'#B91C1C':'var(--teal)',flex:1}}>
              {limitReached
                ? `You've reached your plan limit (${usedRooms}/${maxRooms} listings). Upgrade to add more.`
                : isUnlimited
                  ? 'Premium plan: unlimited listings'
                  : `${remaining} listing${remaining > 1 ? 's' : ''} remaining out of ${maxRooms} allowed`}
            </span>
            {limitReached && (
              <button onClick={() => navigate('/payment')} className="btn btn-sm" style={{background:'var(--gold)',color:'white',border:'none',fontSize:12}}>Upgrade</button>
            )}
          </div>
        )}

        {limitReached ? (
          <div className="card" style={{textAlign:'center',padding:'60px 24px'}}>
            <AlertTriangle size={48} color="var(--gold)" style={{margin:'0 auto 16px'}}/>
            <h2 style={{fontSize:20,fontWeight:600,marginBottom:8}}>Listing Limit Reached</h2>
            <p style={{color:'var(--gray-500)',marginBottom:24}}>Your current plan allows {maxRooms} listing{maxRooms > 1 ? 's' : ''}. You've used all of them. Please upgrade to continue listing rooms.</p>
            <button onClick={() => navigate('/payment')} className="btn btn-gold btn-lg">Upgrade Plan</button>
          </div>
        ) : (<>        <div style={{display:'flex',alignItems:'center',marginBottom:40}}>
          {STEPS.map((s,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',flex:1}}>
              <div style={{width:36,height:36,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:600,fontSize:14,flexShrink:0,border:`2px solid ${i<=step?'var(--teal)':'var(--gray-200)'}`,background:i<step?'var(--teal)':i===step?'var(--teal)':'white',color:i<=step?'white':'var(--gray-400)'}}>{i<step?'✓':i+1}</div>
              {i<STEPS.length-1&&<div style={{flex:1,height:2,background:i<step?'var(--teal)':'var(--gray-200)',margin:'0 8px'}}/>}
            </div>
          ))}
        </div>
        <div className="card"><div style={{padding:32}}>
          {renderStep()}
          <div style={{display:'flex',justifyContent:'space-between',marginTop:32,paddingTop:24,borderTop:'1px solid var(--gray-100)'}}>
            <button onClick={()=>setStep(s=>s-1)} className="btn btn-outline" disabled={step===0}><ChevronLeft size={16}/>{t('back')}</button>
            {step<STEPS.length-1
              ? <button onClick={()=>setStep(s=>s+1)} className="btn btn-primary">{t('next')}<ChevronRight size={16}/></button>
              : <button onClick={handleSubmit} disabled={saving} className="btn btn-gold">
                  {saving ? 'Saving...' : t('submit_pay')}
                </button>
            }
          </div>
          </div></div>
        </>)}
      </div>
    </div>
  );
}
