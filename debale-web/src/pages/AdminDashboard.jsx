import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { adminAPI } from '../services/api';
import { Users, Home, TrendingUp, Flag, CheckCircle, XCircle, Ban, Shield, CreditCard, BarChart2, AlertTriangle } from 'lucide-react';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [reports, setReports] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, usersRes, listingsRes, reportsRes, revenueRes] = await Promise.allSettled([
          adminAPI.stats(),
          adminAPI.users(),
          adminAPI.listings(),
          adminAPI.reports(),
          adminAPI.revenue(),
        ]);
        if (statsRes.status === 'fulfilled') setStats(statsRes.value);
        if (usersRes.status === 'fulfilled') setUsers(usersRes.value.users || []);
        if (listingsRes.status === 'fulfilled') setListings(listingsRes.value.listings || []);
        if (reportsRes.status === 'fulfilled') setReports(reportsRes.value.reports || []);
        if (revenueRes.status === 'fulfilled') setRevenue(revenueRes.value);
      } catch (err) {
        console.error('Admin fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const banUser = async (id) => {
    try {
      const user = users.find(u => u.id === id);
      if (user?.status === 'banned') {
        await adminAPI.unbanUser(id);
      } else {
        await adminAPI.banUser(id);
      }
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status: u.status === 'banned' ? 'active' : 'banned' } : u));
    } catch (err) { alert(err.message); }
  };

  const verifyUser = async (id) => {
    try {
      await adminAPI.verifyUser(id);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, verified: true } : u));
    } catch (err) { alert(err.message); }
  };

  const removeListing = async (id) => {
    try {
      await adminAPI.removeListing(id);
      setListings(prev => prev.filter(l => l.id !== id));
    } catch (err) { alert(err.message); }
  };

  const resolveReport = async (id) => {
    try {
      await adminAPI.resolveReport(id);
      setReports(prev => prev.map(r => r.id === id ? { ...r, status: 'resolved' } : r));
    } catch (err) { alert(err.message); }
  };

  const totalRevenue = stats?.revenue_etb || revenue?.total || 0;
  const totalUsers = stats?.users?.total || users.length;
  const activeUsers = stats?.users?.active || users.filter(u => u.status === 'active').length;
  const activeListings = stats?.listings?.active || listings.filter(l => l.status === 'active').length;
  const pendingReports = reports.filter(r => r.status === 'pending').length;

  const navItems = [
    { key:'overview', label:'Overview', Icon: BarChart2 },
    { key:'users', label:'Users', Icon: Users },
    { key:'listings', label:'Listings', Icon: Home },
    { key:'reports', label:'Reports', Icon: Flag },
    { key:'revenue', label:'Revenue', Icon: CreditCard },
  ];

  if (loading) {
    return (
      <div style={{ paddingTop: 70, minHeight: '100vh', background: 'var(--cream)', display: 'flex' }}>
        <main style={{ flex: 1, padding: '36px 40px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 32 }}>
            {[1,2,3,4].map(i => <div key={i} style={{height:120, background:'var(--gray-100)', borderRadius:12, animation:'pulse 1.5s infinite'}}/>)}
          </div>
          <div style={{height:300, background:'var(--gray-100)', borderRadius:14, animation:'pulse 1.5s infinite'}}/>
        </main>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 70, minHeight: '100vh', background: 'var(--cream)', display: 'flex' }}>

      {/* Sidebar */}
      <aside style={{ width: 220, background: '#111827', padding: '28px 0', display: 'flex', flexDirection: 'column', position: 'sticky', top: 70, height: 'calc(100vh - 70px)' }}>
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 16 }}>
          <p style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>Admin Panel</p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Debale Platform</p>
        </div>
        <nav style={{ flex: 1, padding: '0 12px' }}>
          {navItems.map(({ key, label, Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', marginBottom: 4, textAlign: 'left', fontSize: 14, fontWeight: tab === key ? 600 : 400,
                background: tab === key ? 'rgba(14,124,107,0.3)' : 'transparent', color: tab === key ? 'var(--teal-mid)' : 'rgba(255,255,255,0.6)' }}>
              <Icon size={15} />{label}
              {key === 'reports' && pendingReports > 0 && (
                <span style={{ marginLeft: 'auto', width: 18, height: 18, borderRadius: '50%', background: 'var(--red)', color: 'white', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                  {pendingReports}
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: '36px 40px', overflowY: 'auto' }}>

        {/* Overview */}
        {tab === 'overview' && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Admin Dashboard</h1>
            <p style={{ color: 'var(--gray-500)', marginBottom: 28 }}>Platform overview and key metrics</p>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 32 }}>
              {[
                ['Total Users', totalUsers, Users, 'var(--teal)', 'var(--teal-light)'],
                ['Active Listings', activeListings, Home, 'var(--gold)', 'var(--gold-light)'],
                ['Total Revenue', `${totalRevenue.toLocaleString()} ETB`, TrendingUp, 'var(--green)', 'var(--green-light)'],
                ['Pending Reports', pendingReports, Flag, 'var(--red)', 'var(--red-light)'],
              ].map(([label, val, Icon, color, bg]) => (
                <div key={label} style={{ background: 'white', borderRadius: 12, padding: '20px', border: '1px solid var(--gray-100)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>{label}</p>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={18} color={color} />
                    </div>
                  </div>
                  <p style={{ fontSize: 28, fontWeight: 800, color, fontFamily: 'var(--font-head)' }}>{val}</p>
                </div>
              ))}
            </div>

            {/* Recent signups */}
            <div style={{ background: 'white', borderRadius: 14, border: '1px solid var(--gray-100)', overflow: 'hidden', marginBottom: 24 }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-100)' }}>
                <h3 style={{ fontWeight: 600 }}>Recent Users</h3>
              </div>
              {users.slice(0, 4).length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--gray-400)' }}>No users yet</div>
              ) : users.slice(0, 4).map((u, i) => (
                <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: i < 3 ? '1px solid var(--gray-50)' : 'none' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: u.role === 'provider' ? 'var(--gold-light)' : 'var(--teal-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: u.role === 'provider' ? 'var(--gold)' : 'var(--teal)', fontSize: 14 }}>
                      {u.name?.charAt(0)}
                    </div>
                    <div>
                      <p style={{ fontWeight: 500, fontSize: 14 }}>{u.name}</p>
                      <p style={{ fontSize: 12, color: 'var(--gray-400)' }}>{u.email} · Joined {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className={`badge ${u.role === 'provider' ? 'badge-gold' : 'badge-teal'}`}>{u.role}</span>
                    {u.verified ? <span className="badge badge-green">Verified</span> : <span className="badge badge-gray">Unverified</span>}
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, background: u.status === 'active' ? 'var(--green-light)' : 'var(--red-light)', color: u.status === 'active' ? 'var(--green)' : 'var(--red)' }}>{u.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users */}
        {tab === 'users' && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>User Management</h2>
            <div style={{ background: 'white', borderRadius: 14, border: '1px solid var(--gray-100)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-100)' }}>
                    {['Name', 'Role', 'Status', 'Verified', 'Subscribed', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? '1px solid var(--gray-50)' : 'none' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <p style={{ fontWeight: 500, fontSize: 14 }}>{u.name}</p>
                        <p style={{ fontSize: 12, color: 'var(--gray-400)' }}>{u.email}</p>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span className={`badge ${u.role === 'provider' ? 'badge-gold' : 'badge-teal'}`}>{u.role}</span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, background: u.status === 'active' ? 'var(--green-light)' : 'var(--red-light)', color: u.status === 'active' ? 'var(--green)' : 'var(--red)' }}>{u.status}</span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {u.verified ? <CheckCircle size={16} color="var(--green)" /> : <XCircle size={16} color="var(--gray-300)" />}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {u.subscribed ? <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, background: 'var(--green-light)', color: 'var(--green)' }}>Active</span> : <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, background: 'var(--gray-100)', color: 'var(--gray-500)' }}>None</span>}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {!u.verified && <button onClick={() => verifyUser(u.id)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: 'var(--teal-light)', color: 'var(--teal)', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}><Shield size={11} /> Verify</button>}
                          <button onClick={() => banUser(u.id)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: u.status === 'banned' ? 'var(--green-light)' : 'var(--red-light)', color: u.status === 'banned' ? 'var(--green)' : 'var(--red)', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                            {u.status === 'banned' ? 'Unban' : 'Ban'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Listings */}
        {tab === 'listings' && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Listing Management</h2>
            {listings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--gray-400)' }}>
                <Home size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }}/>
                <p>No listings found</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {listings.map(l => (
                  <div key={l.id} style={{ background: 'white', borderRadius: 12, padding: '18px 20px', border: `1px solid ${l.reported ? 'var(--red)' : 'var(--gray-100)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <p style={{ fontWeight: 600, fontSize: 15 }}>{l.title}</p>
                        {l.reported && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--red-light)', color: 'var(--red)', fontWeight: 600 }}><AlertTriangle size={10} /> Reported</span>}
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>By {l.users?.name || 'Unknown'} · {l.price?.toLocaleString()} ETB/mo</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, background: l.status === 'active' ? 'var(--green-light)' : 'var(--gray-100)', color: l.status === 'active' ? 'var(--green)' : 'var(--gray-500)' }}>{l.status}</span>
                      <button onClick={() => removeListing(l.id)} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: 'var(--red-light)', color: 'var(--red)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reports */}
        {tab === 'reports' && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Reports & Flags</h2>
            {reports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--gray-400)' }}>
                <Flag size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }}/>
                <p>No reports</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {reports.map(r => (
                  <div key={r.id} style={{ background: 'white', borderRadius: 12, padding: '18px 20px', border: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                        <p style={{ fontWeight: 600 }}>{r.reason || r.target_type}</p>
                        <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, background: r.status === 'pending' ? 'var(--red-light)' : 'var(--green-light)', color: r.status === 'pending' ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>{r.status}</span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>Reporter: {r.users?.name || r.reporter_id} · Target: {r.target_id} · {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</p>
                    </div>
                    {r.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => resolveReport(r.id)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'var(--green-light)', color: 'var(--green)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Resolve</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Revenue */}
        {tab === 'revenue' && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Revenue Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 28 }}>
              {[['Total Revenue', `${totalRevenue.toLocaleString()} ETB`, 'var(--teal)'], ['This Month', `${revenue?.this_month || 0} ETB`, 'var(--gold)'], ['Agreement Fees', `${revenue?.agreement_fees || 0} ETB`, 'var(--green)']].map(([l, v, c]) => (
                <div key={l} style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid var(--gray-100)', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 8 }}>{l}</p>
                  <p style={{ fontSize: 28, fontWeight: 800, color: c }}>{v}</p>
                </div>
              ))}
            </div>
            <div style={{ background: 'white', borderRadius: 14, border: '1px solid var(--gray-100)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-100)' }}>
                <h3 style={{ fontWeight: 600 }}>Recent Payments</h3>
              </div>
              {!revenue?.payments?.length ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--gray-400)' }}>No revenue data yet</div>
              ) : revenue.payments.map((p, i, arr) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 20px', borderBottom: i < arr.length - 1 ? '1px solid var(--gray-50)' : 'none', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: 500 }}>{p.users?.name || '—'}</p>
                    <p style={{ fontSize: 12, color: 'var(--gray-400)' }}>{p.payment_method || p.gateway} · {p.confirmed_at ? new Date(p.confirmed_at).toLocaleDateString() : '—'}</p>
                  </div>
                  <span style={{ fontWeight: 700, color: 'var(--teal)', fontSize: 16 }}>{(p.amount || 0).toLocaleString()} ETB</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}
