import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Search, Shield, Star, Users, Home, Key, CheckCircle, ArrowRight, MapPin } from 'lucide-react';
import { listingsAPI } from '../services/api';

export default function Landing() {
  const { t } = useTranslation();
  const [previewListings, setPreviewListings] = useState([]);

  useEffect(() => {
    listingsAPI.browse({ limit: 3 }).then(({ listings }) => setPreviewListings(listings || [])).catch(() => {});
  }, []);
    return (
    <div style={{paddingTop:70}}>
      {/* Hero */}
      <section style={{background:'linear-gradient(135deg, #FAFAF7 0%, var(--teal-light) 100%)',padding:'100px 0 80px',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-100,right:-100,width:400,height:400,borderRadius:'50%',background:'rgba(14,124,107,0.06)'}}/>
        <div style={{position:'absolute',bottom:-50,left:-50,width:300,height:300,borderRadius:'50%',background:'rgba(201,151,12,0.06)'}}/>
        <div className="container" style={{textAlign:'center',position:'relative'}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:8,padding:'6px 16px',borderRadius:20,background:'var(--teal-light)',marginBottom:24}}>
            <span style={{width:8,height:8,borderRadius:'50%',background:'var(--teal)',display:'inline-block'}}/>
            <span style={{fontSize:13,color:'var(--teal)',fontWeight:500}}>Ethiopia's #1 Housemate Platform</span>
          </div>
          <h1 style={{fontSize:'clamp(36px,5vw,60px)',fontWeight:800,color:'var(--dark)',marginBottom:20,lineHeight:1.15}}>
            {t('hero_title').split('Ethiopia').map((part,i)=>
              i===0 ? <span key={i}>{part}<span style={{color:'var(--teal)'}}>Ethiopia</span></span>
              : <span key={i}>{part}</span>
            )}
          </h1>
          <p style={{fontSize:18,color:'var(--gray-500)',maxWidth:560,margin:'0 auto 40px',lineHeight:1.7}}>{t('hero_subtitle')}</p>
          <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
            <Link to="/register?role=seeker" className="btn btn-primary btn-lg">
              <Search size={18}/>{t('hero_cta_seeker')}
            </Link>
            <Link to="/register?role=provider" className="btn btn-outline btn-lg">
              <Home size={18}/>{t('hero_cta_provider')}
            </Link>
          </div>
          <p style={{marginTop:20,fontSize:14,color:'var(--gray-400)'}}>{t('browse_free')}</p>
        </div>
      </section>

      {/* Stats */}
      <section style={{background:'var(--teal)',padding:'48px 0'}}>
        <div className="container">
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:24,textAlign:'center'}}>
            {[['2,400+',t('stats_users')],['850+',t('stats_listings')],['1,100+',t('stats_matches')],['8',t('stats_cities')]].map(([num,label])=>(
              <div key={label}>
                <div style={{fontSize:36,fontWeight:800,color:'white',fontFamily:'var(--font-head)'}}>{num}</div>
                <div style={{fontSize:14,color:'rgba(255,255,255,0.75)',marginTop:4}}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section" style={{background:'var(--cream)'}}>
        <div className="container">
          <div style={{textAlign:'center',marginBottom:60}}>
            <h2 style={{fontSize:36,fontWeight:700,marginBottom:12}}>{t('how_title')}</h2>
            <p style={{color:'var(--gray-500)',fontSize:16}}>Simple steps to find your perfect match</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:32}}>
            {[
              [Search,t('how_s1_title'),t('how_s1_desc'),'1'],
              [MapPin,t('how_s2_title'),t('how_s2_desc'),'2'],
              [Users,t('how_s3_title'),t('how_s3_desc'),'3'],
              [Key,t('how_s4_title'),t('how_s4_desc'),'4'],
            ].map(([Icon,title,desc,num])=>(
              <div key={num} style={{textAlign:'center'}}>
                <div style={{width:64,height:64,borderRadius:16,background:'var(--teal-light)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',position:'relative'}}>
                  <Icon size={28} color="var(--teal)"/>
                  <span style={{position:'absolute',top:-8,right:-8,width:22,height:22,borderRadius:'50%',background:'var(--gold)',color:'white',fontSize:11,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>{num}</span>
                </div>
                <h3 style={{fontSize:16,fontWeight:600,marginBottom:8}}>{title}</h3>
                <p style={{fontSize:14,color:'var(--gray-500)',lineHeight:1.6}}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Preview Listings */}
      <section className="section" style={{background:'white'}}>
        <div className="container">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:40}}>
            <div>
              <h2 style={{fontSize:32,fontWeight:700,marginBottom:8}}>Latest Rooms</h2>
              <p style={{color:'var(--gray-500)'}}>Fresh listings added this week</p>
            </div>
            <Link to="/browse" className="btn btn-outline" style={{gap:6}}>View All <ArrowRight size={16}/></Link>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:24}}>
            {previewListings.length === 0 && [1,2,3].map(i => (
              <div key={i} className="card" style={{overflow:'hidden', height: 280}}>
                <div style={{height:160,background:'var(--gray-100)',animation:'pulse 1.5s infinite'}}/>
                <div style={{padding:'18px 20px'}}>
                  <div style={{height:16,background:'var(--gray-100)',borderRadius:6,marginBottom:8}}/>
                  <div style={{height:12,background:'var(--gray-100)',borderRadius:6,width:'60%'}}/>
                </div>
              </div>
            ))}
            {previewListings.map(room=>(
              <div key={room.id} className="card" style={{overflow:'hidden'}}>
                <div style={{height:180,background:'var(--teal-light)',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden'}}>
                  {room.photos?.length > 0
                    ? <img src={room.photos[0]} alt={room.title} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    : <Home size={48} color="var(--teal)" opacity={0.3}/>
                  }
                  <span style={{position:'absolute',top:12,left:12}} className="badge badge-teal">{room.property_type || room.type}</span>
                  {room.is_verified && <span style={{position:'absolute',top:12,right:12}} className="badge badge-gold">✓ Verified</span>}
                </div>
                <div style={{padding:'18px 20px'}}>
                  <h3 style={{fontSize:16,fontWeight:600,marginBottom:6}}>{room.title}</h3>
                  <p style={{fontSize:13,color:'var(--gray-500)',marginBottom:12,display:'flex',alignItems:'center',gap:4}}><MapPin size={12}/>{room.city}{room.neighborhood ? `, ${room.neighborhood}` : ''}</p>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:20,fontWeight:700,color:'var(--teal)'}}>{room.price?.toLocaleString()} <span style={{fontSize:13,color:'var(--gray-400)',fontWeight:400}}>ETB/mo</span></span>
                    <Link to={`/listing/${room.id}`} className="btn btn-outline btn-sm">View</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="section" style={{background:'var(--cream)'}}>
        <div className="container">
          <div style={{textAlign:'center',marginBottom:56}}>
            <h2 style={{fontSize:36,fontWeight:700,marginBottom:12}}>{t('pricing_title')}</h2>
            <p style={{color:'var(--gray-500)',fontSize:16}}>Access the platform for one affordable monthly fee</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:32,maxWidth:760,margin:'0 auto'}}>
            {[
              {role:t('pricing_seeker'),price:'150',desc:'Browse and apply for rooms. Find your perfect housemate.',features:['Browse all listings','Apply to rooms','Profile visibility','Interview scheduling','AI-powered matching']},
              {role:t('pricing_provider'),price:'200',desc:'Publish your room and find the ideal tenant.',features:['Post room listing','Manage applicants','Interview scheduling','Agreement generation','AI agent support'],highlight:true},
            ].map(p=>(
              <div key={p.role} className="card" style={{padding:'32px',border:p.highlight?'2px solid var(--teal)':'1px solid var(--gray-100)',position:'relative'}}>
                {p.highlight&&<span style={{position:'absolute',top:-14,left:'50%',transform:'translateX(-50%)',background:'var(--teal)',color:'white',padding:'4px 16px',borderRadius:20,fontSize:12,fontWeight:600,whiteSpace:'nowrap'}}>{t('popular')}</span>}
                <h3 style={{fontSize:20,fontWeight:700,marginBottom:4}}>{p.role}</h3>
                <p style={{fontSize:13,color:'var(--gray-500)',marginBottom:20}}>{p.desc}</p>
                <div style={{marginBottom:20}}>
                  <span style={{fontSize:42,fontWeight:800,color:'var(--teal)',fontFamily:'var(--font-head)'}}>{p.price}</span>
                  <span style={{fontSize:15,color:'var(--gray-500)'}}> ETB{t('pricing_month')}</span>
                </div>
                <div style={{marginBottom:28,display:'flex',flexDirection:'column',gap:10}}>
                  {p.features.map(f=>(
                    <div key={f} style={{display:'flex',alignItems:'center',gap:10,fontSize:14}}>
                      <CheckCircle size={16} color="var(--teal)"/>{f}
                    </div>
                  ))}
                </div>
                <Link to="/register" className={`btn w-full justify-center ${p.highlight?'btn-primary':'btn-outline'}`} style={{justifyContent:'center'}}>
                  Get Started <ArrowRight size={15}/>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{background:'var(--teal)',padding:'80px 0',textAlign:'center'}}>
        <div className="container">
          <h2 style={{fontSize:40,fontWeight:800,color:'white',marginBottom:16}}>Ready to Find Your Home?</h2>
          <p style={{fontSize:18,color:'rgba(255,255,255,0.8)',marginBottom:40,maxWidth:500,margin:'0 auto 40px'}}>Join thousands of Ethiopians who have found their perfect housemate through Debale.</p>
          <Link to="/register" className="btn btn-gold btn-lg">
            Start Free Today <ArrowRight size={18}/>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{background:'var(--dark)',color:'var(--gray-400)',padding:'48px 0'}}>
        <div className="container" style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:24}}>
          <div>
            <div style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:22,color:'white',marginBottom:8}}>debale</div>
            <p style={{fontSize:13}}>{t('footer_tagline')}</p>
          </div>
          <div style={{display:'flex',gap:24,fontSize:13}}>
            <Link to="/browse" style={{color:'var(--gray-400)'}}>Browse</Link>
            <Link to="/register" style={{color:'var(--gray-400)'}}>Register</Link>
            <Link to="/login" style={{color:'var(--gray-400)'}}>Login</Link>
          </div>
           <div>
            <div style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:22,color:'white',marginBottom:8}}>Powerd by Awo Solution</div>
            <p style={{fontSize:13}}>© 2026 Debale. Made in Ethiopia 🇪🇹</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
