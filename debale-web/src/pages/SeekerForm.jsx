import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { usersAPI, uploadAPI, housemateAPI } from '../services/api';
import { Upload, ChevronRight, ChevronLeft, Image, X, CheckCircle, Users } from 'lucide-react';

const STEPS = ['Personal Info','Preferences','Location & Budget','Review'];

export default function SeekerForm() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [idFrontUrl, setIdFrontUrl] = useState('');
  const [idBackUrl, setIdBackUrl] = useState('');
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const frontRef = useRef(null);
  const backRef = useRef(null);
  const [form, setForm] = useState({
    nationalId:'', age:'', gender:'', occupation:'',
    sleepSchedule:'', cleanliness:'', smoking:'no', drinking:'no', pets:'no_pets',
    housemateGender:'', languages:'', intro:'', emergencyName:'', emergencyPhone:'',
    budgetMin:'', budgetMax:'', moveInDate:'', city:'', subcity:'', neighborhood:'',
    groupEnabled: false, sociability:'', guestsHabit:'', lifestyleNotes:'',
  });
  const [groupLangs, setGroupLangs] = useState([]);
  const [langInput, setLangInput] = useState('');

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const uploadIdPhoto = async (file, side) => {
    const setUrl = side === 'front' ? setIdFrontUrl : setIdBackUrl;
    const setLoading = side === 'front' ? setUploadingFront : setUploadingBack;
    const ref = side === 'front' ? frontRef : backRef;
    setLoading(true);
    try {
      const result = await uploadAPI.photo(file, 'id-photos');
      setUrl(result.url || result.file_url);
    } catch (err) {
      alert('Failed to upload ID photo: ' + err.message);
    } finally {
      setLoading(false);
      if (ref.current) ref.current.value = '';
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = {
        age: parseInt(form.age) || null,
        gender: form.gender,
        occupation: form.occupation,
        budget_min: parseInt(form.budgetMin) || null,
        budget_max: parseInt(form.budgetMax) || null,
        move_in_date: form.moveInDate,
        city: form.city,
        subcity: form.subcity,
        neighborhood: form.neighborhood,
        sleep_schedule: form.sleepSchedule,
        cleanliness: form.cleanliness,
        smoking: form.smoking,
        drinking: form.drinking,
        pets: form.pets,
        preferred_gender: form.housemateGender,
        languages: form.languages,
        intro: form.intro,
        emergency_name: form.emergencyName,
        emergency_phone: form.emergencyPhone,
        id_photo_url: idFrontUrl || undefined,
        id_photo_back_url: idBackUrl || undefined,
      };
      await usersAPI.updateSeekerProfile(payload);
      if (form.groupEnabled) {
        await housemateAPI.saveIntake({
          languages: groupLangs,
          sociability: form.sociability,
          lifestyle_notes: form.lifestyleNotes,
          sleep_schedule: form.sleepSchedule,
          cleanliness: form.cleanliness,
          smoking: form.smoking,
          guests_habit: form.guestsHabit,
          budget_min: parseInt(form.budgetMin) || null,
          budget_max: parseInt(form.budgetMax) || null,
          preferred_city: form.city,
        });
      }
      navigate('/payment', { state: { draftId: null, type: 'seeker' } });
    } catch (err) {
      alert('Failed to save profile: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    if(step===0) return (
      <div>
        <h2 style={{fontSize:22,fontWeight:600,marginBottom:24}}>Personal Information</h2>
        <div className="form-row">
          <div className="form-group"><label className="form-label">{t('national_id')}</label>
            <input className="form-input" placeholder="Enter your National ID" value={form.nationalId} onChange={e=>set('nationalId',e.target.value)}/></div>
          <div className="form-group"><label className="form-label">{t('age')}</label>
            <input className="form-input" type="number" min="18" max="99" placeholder="25" value={form.age} onChange={e=>set('age',e.target.value)}/></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">{t('gender')}</label>
            <select className="form-input form-select" value={form.gender} onChange={e=>set('gender',e.target.value)}>
              <option value="">Select...</option>
              <option value="male">{t('male')}</option>
              <option value="female">{t('female')}</option>
              <option value="other">{t('other')}</option>
            </select></div>
          <div className="form-group"><label className="form-label">{t('occupation')}</label>
            <select className="form-input form-select" value={form.occupation} onChange={e=>set('occupation',e.target.value)}>
              <option value="">Select...</option>
              <option value="employed">{t('employed')}</option>
              <option value="student">{t('student')}</option>
              <option value="self_employed">{t('self_employed')}</option>
            </select></div>
        </div>
        <div className="form-group"><label className="form-label">{t('upload_id')} — Front</label>
          <div onClick={() => frontRef.current?.click()}
            style={{border:'2px dashed var(--gray-200)',borderRadius:10,padding:'24px',textAlign:'center',cursor:'pointer',background:'var(--gray-50)',transition:'border-color 0.15s'}}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--teal)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--gray-200)'}>
            {uploadingFront ? (
              <p style={{fontSize:14,color:'var(--gray-500)'}}>Uploading...</p>
            ) : idFrontUrl ? (
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                <img src={idFrontUrl} alt="ID Front" style={{maxHeight:70,borderRadius:6,objectFit:'contain'}}/>
                <p style={{fontSize:12,color:'var(--green)'}}><CheckCircle size={12} style={{display:'inline',verticalAlign:'middle',marginRight:3}}/>Uploaded</p>
                <button onClick={e => { e.stopPropagation(); setIdFrontUrl(''); }} style={{fontSize:11,color:'var(--red)',background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>Remove</button>
              </div>
            ) : (
              <><Upload size={22} color="var(--gray-400)" style={{margin:'0 auto 6px'}}/>
              <p style={{fontSize:13,color:'var(--gray-500)'}}>Click to upload front</p></>
            )}
          </div>
          <input ref={frontRef} type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) uploadIdPhoto(f, 'front'); }} style={{display:'none'}}/></div>
        <div className="form-group"><label className="form-label">{t('upload_id')} — Back</label>
          <div onClick={() => backRef.current?.click()}
            style={{border:'2px dashed var(--gray-200)',borderRadius:10,padding:'24px',textAlign:'center',cursor:'pointer',background:'var(--gray-50)',transition:'border-color 0.15s'}}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--teal)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--gray-200)'}>
            {uploadingBack ? (
              <p style={{fontSize:14,color:'var(--gray-500)'}}>Uploading...</p>
            ) : idBackUrl ? (
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                <img src={idBackUrl} alt="ID Back" style={{maxHeight:70,borderRadius:6,objectFit:'contain'}}/>
                <p style={{fontSize:12,color:'var(--green)'}}><CheckCircle size={12} style={{display:'inline',verticalAlign:'middle',marginRight:3}}/>Uploaded</p>
                <button onClick={e => { e.stopPropagation(); setIdBackUrl(''); }} style={{fontSize:11,color:'var(--red)',background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>Remove</button>
              </div>
            ) : (
              <><Upload size={22} color="var(--gray-400)" style={{margin:'0 auto 6px'}}/>
              <p style={{fontSize:13,color:'var(--gray-500)'}}>Click to upload back</p></>
            )}
          </div>
          <input ref={backRef} type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) uploadIdPhoto(f, 'back'); }} style={{display:'none'}}/></div>
        <div className="form-group"><label className="form-label">{t('languages_spoken')}</label>
          <input className="form-input" placeholder="Amharic, English, Oromo..." value={form.languages} onChange={e=>set('languages',e.target.value)}/></div>
      </div>
    );
    if(step===1) return (
      <div>
        <h2 style={{fontSize:22,fontWeight:600,marginBottom:24}}>Preferences & Lifestyle</h2>

        {/* GROUP MATCHING TOGGLE */}
        <div style={{background:'#E6F4F1',borderRadius:12,padding:'16px 20px',marginBottom:24,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <Users size={20} color="#0E7C6B"/>
            <div>
              <p style={{fontWeight:600,fontSize:14,margin:0,color:'#0E7C6B'}}>Find Me a Group</p>
              <p style={{fontSize:12,color:'#6B7280',margin:'2px 0 0'}}>Get AI-matched with compatible housemates</p>
            </div>
          </div>
          <label style={{position:'relative',display:'inline-block',width:48,height:26,cursor:'pointer'}}>
            <input type="checkbox" checked={form.groupEnabled} onChange={e=>set('groupEnabled',e.target.checked)} style={{opacity:0,width:0,height:0}}/>
            <span style={{position:'absolute',inset:0,background:form.groupEnabled?'#0E7C6B':'#ccc',borderRadius:13,transition:'background 0.2s'}}>
              <span style={{position:'absolute',top:3,left:form.groupEnabled?25:3,width:20,height:20,background:'#fff',borderRadius:'50%',transition:'left 0.2s'}}/>
            </span>
          </label>
        </div>

        {/* GROUP INTAKE QUESTIONNAIRE — visible only when toggle is ON */}
        {form.groupEnabled && (
          <div style={{background:'#FAFAF7',borderRadius:12,padding:20,marginBottom:24,border:'1px solid #E6F4F1'}}>
            <p style={{fontWeight:600,fontSize:15,marginBottom:16,color:'#0E7C6B'}}>Housemate Matching Questionnaire</p>

            <label style={{fontWeight:500,fontSize:13,display:'block',marginBottom:6}}>Languages you speak</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:8}}>
              {groupLangs.map(l => (
                <span key={l} style={{background:'#E6F4F1',padding:'4px 12px',borderRadius:20,fontSize:13,display:'flex',alignItems:'center',gap:6}}>
                  {l} <span onClick={()=>setGroupLangs(prev=>prev.filter(x=>x!==l))} style={{cursor:'pointer',color:'#0E7C6B',fontWeight:700}}>×</span>
                </span>
              ))}
            </div>
            <div style={{display:'flex',gap:8,marginBottom:20}}>
              <input value={langInput} onChange={e=>setLangInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();if(langInput.trim()&&!groupLangs.includes(langInput.trim())){setGroupLangs(prev=>[...prev,langInput.trim()]);setLangInput('');}}}} placeholder="Type a language" style={{flex:1,padding:'8px 12px',borderRadius:8,border:'1px solid #D1D5DB',fontSize:13}}/>
              <button onClick={()=>{if(langInput.trim()&&!groupLangs.includes(langInput.trim())){setGroupLangs(prev=>[...prev,langInput.trim()]);setLangInput('');}}} style={{background:'#0E7C6B',color:'#fff',border:'none',padding:'8px 16px',borderRadius:8,fontWeight:600,cursor:'pointer',fontSize:12}}>Add</button>
            </div>

            <label style={{fontWeight:500,fontSize:13,display:'block',marginBottom:6}}>Sociability</label>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:20}}>
              {[['very_social','Very Social'],['balanced','Balanced'],['prefers_quiet','Prefers Quiet']].map(([val,label]) => (
                <div key={val} onClick={()=>set('sociability',val)}
                  style={{padding:'6px 14px',borderRadius:8,border:`1.5px solid ${form.sociability===val?'#0E7C6B':'#E5E7EB'}`,background:form.sociability===val?'#E6F4F1':'#fff',cursor:'pointer',fontSize:13,fontWeight:500}}>{label}</div>
              ))}
            </div>

            <label style={{fontWeight:500,fontSize:13,display:'block',marginBottom:6}}>Guest Habit</label>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:20}}>
              {[['frequent','Frequent'],['occasional','Occasional'],['rarely','Rarely']].map(([val,label]) => (
                <div key={val} onClick={()=>set('guestsHabit',val)}
                  style={{padding:'6px 14px',borderRadius:8,border:`1.5px solid ${form.guestsHabit===val?'#0E7C6B':'#E5E7EB'}`,background:form.guestsHabit===val?'#E6F4F1':'#fff',cursor:'pointer',fontSize:13,fontWeight:500}}>{label}</div>
              ))}
            </div>

            <label style={{fontWeight:500,fontSize:13,display:'block',marginBottom:6}}>Lifestyle Notes (optional)</label>
            <textarea value={form.lifestyleNotes} onChange={e=>set('lifestyleNotes',e.target.value)}
              placeholder="Any other preferences for your future housemates..."
              style={{width:'100%',minHeight:60,padding:10,borderRadius:8,border:'1px solid #D1D5DB',fontSize:13,resize:'vertical',marginBottom:8}}/>
          </div>
        )}

        {/* EXISTING LIFESTYLE FIELDS */}
        <div className="form-row">
          <div className="form-group"><label className="form-label">{t('sleep_schedule')}</label>
            <select className="form-input form-select" value={form.sleepSchedule} onChange={e=>set('sleepSchedule',e.target.value)}>
              <option value="">Select...</option>
              <option value="early_bird">{t('early_bird')}</option>
              <option value="night_owl">{t('night_owl')}</option>
              <option value="flexible">{t('flexible')}</option>
            </select></div>
          <div className="form-group"><label className="form-label">{t('cleanliness')}</label>
            <select className="form-input form-select" value={form.cleanliness} onChange={e=>set('cleanliness',e.target.value)}>
              <option value="">Select...</option>
              <option value="very_clean">{t('very_clean')}</option>
              <option value="average">{t('average')}</option>
              <option value="relaxed">{t('relaxed')}</option>
            </select></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">{t('smoking')}</label>
            <select className="form-input form-select" value={form.smoking} onChange={e=>set('smoking',e.target.value)}>
              <option value="no">{t('no')}</option>
              <option value="yes">{t('yes')}</option>
            </select></div>
          <div className="form-group"><label className="form-label">{t('drinking')}</label>
            <select className="form-input form-select" value={form.drinking} onChange={e=>set('drinking',e.target.value)}>
              <option value="no">{t('no')}</option>
              <option value="yes">{t('yes')}</option>
            </select></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">{t('pets')}</label>
            <select className="form-input form-select" value={form.pets} onChange={e=>set('pets',e.target.value)}>
              <option value="no_pets">{t('no_pets')}</option>
              <option value="have_pets">{t('have_pets')}</option>
              <option value="fine_with_pets">{t('fine_with_pets')}</option>
            </select></div>
          <div className="form-group"><label className="form-label">{t('housemate_gender')}</label>
            <select className="form-input form-select" value={form.housemateGender} onChange={e=>set('housemateGender',e.target.value)}>
              <option value="">{t('no_preference')}</option>
              <option value="male_only">{t('male_only')}</option>
              <option value="female_only">{t('female_only')}</option>
            </select></div>
        </div>
        <div className="form-group">
          <label className="form-label">{t('intro')} <span style={{color:'var(--gray-400)',fontWeight:400}}>({form.intro.length}/300)</span></label>
          <textarea className="form-input" rows={4} placeholder={t('intro_hint')} maxLength={300}
            value={form.intro} onChange={e=>set('intro',e.target.value)} style={{resize:'vertical'}}/>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">{t('emergency_contact_name')}</label>
            <input className="form-input" placeholder="Contact name" value={form.emergencyName} onChange={e=>set('emergencyName',e.target.value)}/></div>
          <div className="form-group"><label className="form-label">{t('emergency_contact_phone')}</label>
            <input className="form-input" placeholder="+251 9XX XXX XXX" value={form.emergencyPhone} onChange={e=>set('emergencyPhone',e.target.value)}/></div>
        </div>
      </div>
    );
    if(step===2) return (
      <div>
        <h2 style={{fontSize:22,fontWeight:600,marginBottom:24}}>Location & Budget</h2>
        <div className="form-row">
          <div className="form-group"><label className="form-label">{t('budget_min')}</label>
            <input className="form-input" type="number" placeholder="2000" value={form.budgetMin} onChange={e=>set('budgetMin',e.target.value)}/></div>
          <div className="form-group"><label className="form-label">{t('budget_max')}</label>
            <input className="form-input" type="number" placeholder="6000" value={form.budgetMax} onChange={e=>set('budgetMax',e.target.value)}/></div>
        </div>
        <div className="form-group"><label className="form-label">{t('move_in_date')}</label>
          <input type="date" className="form-input" value={form.moveInDate} onChange={e=>set('moveInDate',e.target.value)}/></div>
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
        <div className="form-group"><label className="form-label">{t('neighborhood')}</label>
          <input className="form-input" placeholder="e.g. Bole Medhanialem, CMC..." value={form.neighborhood} onChange={e=>set('neighborhood',e.target.value)}/></div>
      </div>
    );
    if(step===3) return (
      <div>
        <h2 style={{fontSize:22,fontWeight:600,marginBottom:24}}>Review & Submit</h2>
        <div style={{background:'var(--teal-light)',borderRadius:12,padding:24,marginBottom:24}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            {[['Age',form.age||'—'],['Gender',form.gender||'—'],['Occupation',form.occupation||'—'],['Budget',form.budgetMin&&form.budgetMax?`${form.budgetMin}–${form.budgetMax} ETB`:'—'],['City',form.city||'—'],['Move-in',form.moveInDate||'—'],['Sleep',form.sleepSchedule||'—'],['Cleanliness',form.cleanliness||'—']].map(([k,v])=>(
              <div key={k}><p style={{fontSize:12,color:'var(--gray-500)'}}>{k}</p><p style={{fontWeight:500}}>{v}</p></div>
            ))}
          </div>
        </div>
        <div style={{background:'var(--gold-light)',border:'1px solid var(--gold-mid)',borderRadius:10,padding:16}}>
          <p style={{fontWeight:600,marginBottom:4}}>Next: Payment</p>
          <p style={{fontSize:14,color:'var(--gray-600)'}}>After submission you'll be directed to pay <strong>150 ETB/month</strong> to activate your profile.</p>
        </div>
      </div>
    );
  };

  return (
    <div style={{paddingTop:70,minHeight:'100vh',background:'var(--cream)'}}>
      <div className="container" style={{maxWidth:720,padding:'48px 24px'}}>
        <div style={{marginBottom:32}}>
          <h1 style={{fontSize:28,fontWeight:700,marginBottom:4,fontFamily:'var(--font-head)'}}>{t('seeker_form_title')}</h1>
          <p style={{color:'var(--gray-500)'}}>Step {step+1} of {STEPS.length}: {STEPS[step]}</p>
        </div>

        {/* Step indicator */}
        <div style={{display:'flex',alignItems:'center',marginBottom:40}}>
          {STEPS.map((s,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',flex:1}}>
              <div style={{width:36,height:36,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:600,fontSize:14,flexShrink:0,border:`2px solid ${i<step?'var(--teal)':i===step?'var(--teal)':'var(--gray-200)'}`,background:i<step?'var(--teal)':i===step?'var(--teal)':'white',color:i<=step?'white':'var(--gray-400)'}}>
                {i<step?'✓':i+1}
              </div>
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
              : <button onClick={handleSubmit} disabled={saving} className="btn btn-gold">{saving ? 'Saving...' : t('submit_pay')}</button>
            }
          </div>
        </div></div>
      </div>
    </div>
  );
}
