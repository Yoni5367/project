import { useTranslation } from 'react-i18next';
import { MapPin, Users, Wifi, Zap, Droplets, Bookmark, BadgeCheck, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RoomCard({ room, canApply, onApply, onSave, saved }) {
  const { t } = useTranslation();
  return (
    <div className="card" style={{transition:'transform 0.2s,box-shadow 0.2s'}}
      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.boxShadow='0 12px 40px rgba(0,0,0,0.12)'}}
      onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=''}}>
      {/* Image */}
      <div style={{position:'relative',height:200,background:'var(--teal-light)',overflow:'hidden'}}>
        <div style={{width:'100%',height:'100%',background:`linear-gradient(135deg, var(--teal-light) 0%, var(--teal-mid) 100%)`,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <svg viewBox="0 0 80 60" width="80" height="60" fill="none" opacity="0.4">
            <path d="M10 35 L40 10 L70 35" stroke="var(--teal)" strokeWidth="3"/>
            <rect x="25" y="35" width="30" height="22" fill="var(--teal)"/>
            <rect x="34" y="42" width="12" height="15" fill="white"/>
          </svg>
        </div>
        {/* Badges */}
        <div style={{position:'absolute',top:12,left:12,display:'flex',gap:6}}>
          {room.verified && <span className="badge badge-teal" style={{fontSize:11}}><BadgeCheck size={11}/>{t('verified')}</span>}
          <span className="badge badge-gold" style={{fontSize:11}}>{room.type}</span>
        </div>
        {/* Save */}
        <button onClick={()=>onSave&&onSave(room.id)}
          style={{position:'absolute',top:12,right:12,width:32,height:32,borderRadius:'50%',background:'white',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 8px rgba(0,0,0,0.12)'}}>
          <Bookmark size={15} fill={saved?'var(--gold)':'none'} color={saved?'var(--gold)':'var(--gray-400)'}/>
        </button>
      </div>

      {/* Content */}
      <div style={{padding:'18px 20px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
          <h3 style={{fontSize:16,fontWeight:600,fontFamily:'var(--font-head)'}}>{room.title}</h3>
          <div style={{textAlign:'right'}}>
            <span style={{fontSize:20,fontWeight:700,color:'var(--teal)',fontFamily:'var(--font-head)'}}>{room.price.toLocaleString()}</span>
            <span style={{fontSize:12,color:'var(--gray-400)'}}> {t('etb')}{t('per_month')}</span>
          </div>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:6,color:'var(--gray-500)',fontSize:13,marginBottom:12}}>
          <MapPin size={13}/> {room.location}
        </div>

        <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>
          {room.wifi&&<span style={{display:'flex',alignItems:'center',gap:3,fontSize:12,color:'var(--gray-500)'}}><Wifi size={12}/>WiFi</span>}
          {room.electricity&&<span style={{display:'flex',alignItems:'center',gap:3,fontSize:12,color:'var(--gray-500)'}}><Zap size={12}/>Elec.</span>}
          {room.water&&<span style={{display:'flex',alignItems:'center',gap:3,fontSize:12,color:'var(--gray-500)'}}><Droplets size={12}/>Water</span>}
          <span style={{display:'flex',alignItems:'center',gap:3,fontSize:12,color:'var(--gray-500)'}}><Users size={12}/>{room.gender}</span>
          <span style={{display:'flex',alignItems:'center',gap:5,fontSize:14,color:'var(--teal)',fontWeight:800}}><Home size={14}/>{room.rooms_available||1} room{room.rooms_available!==1?'s':''}</span>
        </div>

        <div style={{display:'flex',gap:8}}>
          <Link to={`/listing/${room.id}`} className="btn btn-outline btn-sm" style={{flex:1,justifyContent:'center'}}>{t('view_details')}</Link>
          {canApply
            ? <button onClick={()=>onApply&&onApply(room.id)} className="btn btn-primary btn-sm" style={{flex:1,justifyContent:'center'}}>{t('apply_now')}</button>
            : <button disabled className="btn btn-sm" style={{flex:1,justifyContent:'center',background:'var(--gray-100)',color:'var(--gray-400)',cursor:'not-allowed',border:'none'}}>{t('pay_to_apply')}</button>
          }
        </div>
      </div>
    </div>
  );
}
