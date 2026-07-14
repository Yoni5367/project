import React from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';

export default function ListingCard({ listing, saved, onSave }) {
  const { t } = useLang();
  const { user, isActive } = useAuth();

  return (
    <div className="card" style={{ cursor: 'pointer' }}>
      {/* Photo */}
      <div style={{ position: 'relative', height: 200, overflow: 'hidden' }}>
        <img
          src={listing.photos[0]}
          alt={listing.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={e => { e.target.src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400'; }}
        />
        {/* Match score */}
        <div style={styles.matchBadge}>
          <span style={{ fontWeight: 700 }}>{listing.match}%</span>
          <span style={{ fontSize: 10 }}>match</span>
        </div>
        {/* Save button */}
        <button
          onClick={e => { e.preventDefault(); onSave && onSave(listing.id); }}
          style={{ ...styles.saveBtn, color: saved ? 'var(--gold)' : 'var(--white)' }}
        >
          {saved ? '♥' : '♡'}
        </button>
        {/* Type badge */}
        <div style={styles.typeBadge}>{listing.type}</div>
      </div>

      {/* Content */}
      <Link to={`/listing/${listing.id}`} style={{ textDecoration: 'none', display: 'block' }}>
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-dark)', lineHeight: 1.3 }}>
              {listing.title}
            </h3>
            <div style={styles.price}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--teal)' }}>
                {listing.rent.toLocaleString()}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-gray)' }}>ETB{t.per_month}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-gray)', fontSize: 13, marginBottom: 10 }}>
            <span>📍</span>
            <span>{listing.area}, {listing.city}</span>
          </div>

          {/* Tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            <span className="tag">{listing.furnished}</span>
            {listing.includes.slice(0, 2).map(inc => (
              <span key={inc} className="tag tag-teal">{inc}</span>
            ))}
            {listing.gender_pref !== 'No Preference' && (
              <span className="tag">{listing.gender_pref} only</span>
            )}
          </div>

          {/* Provider */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="avatar avatar-sm">{listing.provider.avatar}</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-dark)' }}>
                  {listing.provider.name}
                  {listing.provider.verified && (
                    <span style={{ marginLeft: 4, color: 'var(--teal)', fontSize: 11 }}>✓</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-gray)' }}>Lease: {listing.lease_min}</div>
              </div>
            </div>

            {isActive ? (
              <Link to={`/listing/${listing.id}`} className="btn btn-primary btn-sm">
                {t.apply_btn}
              </Link>
            ) : (
              <Link to="/register" className="btn btn-outline btn-sm">
                {t.locked_apply}
              </Link>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

const styles = {
  matchBadge: {
    position: 'absolute', top: 10, left: 10,
    background: 'var(--teal)', color: 'var(--white)',
    borderRadius: 'var(--radius-md)', padding: '4px 10px',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    fontSize: 13, lineHeight: 1.2,
  },
  saveBtn: {
    position: 'absolute', top: 10, right: 10,
    background: 'rgba(0,0,0,0.3)', border: 'none',
    borderRadius: '50%', width: 32, height: 32,
    fontSize: 16, cursor: 'pointer', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  typeBadge: {
    position: 'absolute', bottom: 10, left: 10,
    background: 'rgba(0,0,0,0.5)', color: 'var(--white)',
    borderRadius: 'var(--radius-full)', padding: '3px 10px',
    fontSize: 11, fontWeight: 500, backdropFilter: 'blur(4px)',
  },
  price: {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, marginLeft: 8,
  },
};
