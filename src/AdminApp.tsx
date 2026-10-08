import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  Check,

  Clock3,
  CreditCard,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  MapPin,
  MessageCircle,
  Package,
  Pencil,
  Phone,
  Plus,
  Search,

  ShoppingBag,
  Star,
  Trash2,
  TrendingUp,
  UserCheck,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { LogoMark } from '@/components/Logo';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import type {
  AdminSection,
  BookingRow,
  HelperItem,
  NotificationItem,
  PackageItem,
  PromoItem,
  RatingItem,
  ServiceItem,
  SupportItem,
} from '@/types';
import { PAYMENT_LABELS, STATUS_FLOW, STATUS_LABELS } from '@/types';

export function AdminApp() {
  const { admin, loading, signIn, signOut } = useAdminAuth();
  const [section, setSection] = useState<AdminSection>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return <div className="admin-loading"><LogoMark size={32} /><p>Loading admin panel...</p></div>;
  }

  if (!admin) {
    return <AdminLogin onSignIn={signIn} />;
  }

  const navItems: { key: AdminSection; label: string; icon: ReactNode }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={19} /> },
    { key: 'bookings', label: 'Bookings', icon: <CalendarDays size={19} /> },
    { key: 'helpers', label: 'Helpers', icon: <UserCheck size={19} /> },
    { key: 'services', label: 'Services', icon: <ShoppingBag size={19} /> },
    { key: 'packages', label: 'Packages', icon: <Package size={19} /> },
    { key: 'promos', label: 'Promo Codes', icon: <CreditCard size={19} /> },
    { key: 'support', label: 'Support', icon: <MessageCircle size={19} /> },
    { key: 'ratings', label: 'Ratings', icon: <Star size={19} /> },
    { key: 'notifications', label: 'Notifications', icon: <Bell size={19} /> },
  ];

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <LogoMark size={26} />
          <div>
            <strong>everydaytask</strong>
            <small>Admin Panel</small>
          </div>
        </div>
        <nav className="admin-nav">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`admin-nav-item ${section === item.key ? 'active' : ''}`}
              onClick={() => { setSection(item.key); setSidebarOpen(false); }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <div className="admin-user-card">
            <div className="admin-avatar">{admin.full_name.charAt(0)}</div>
            <div><strong>{admin.full_name}</strong><small>{admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}</small></div>
          </div>
          <button className="admin-logout" onClick={() => void signOut()}>
            <LogOut size={17} /> Sign out
          </button>
          <a href="#customer" className="admin-back-customer"><ArrowLeft size={15} /> Back to customer app</a>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button className="admin-menu-toggle" onClick={() => setSidebarOpen((v) => !v)}>
            <span /><span /><span />
          </button>
          <h1>{navItems.find((n) => n.key === section)?.label}</h1>
          <a href="#customer" className="admin-view-site">View site</a>
        </header>
        <div className="admin-content">
          {section === 'dashboard' && <Dashboard onNavigate={setSection} />}
          {section === 'bookings' && <BookingsAdmin />}
          {section === 'helpers' && <HelpersAdmin />}
          {section === 'services' && <ServicesAdmin />}
          {section === 'packages' && <PackagesAdmin />}
          {section === 'promos' && <PromosAdmin />}
          {section === 'support' && <SupportAdmin />}
          {section === 'ratings' && <RatingsAdmin />}
          {section === 'notifications' && <NotificationsAdmin />}
        </div>
      </div>
    </div>
  );
}

function AdminLogin({ onSignIn }: { onSignIn: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onSignIn(email, password);
    } catch {
      setError('Invalid email or password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-login-shell">
      <div className="admin-login-card">
        <LogoMark size={36} />
        <h1>Everyday Task Admin</h1>
        <p>Sign in to manage bookings, helpers, and services.</p>
        <form onSubmit={handleSubmit}>
          <label className="field-label">Email
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@everydaytask.in" />
          </label>
          <label className="field-label">Password
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" />
          </label>
          {error && <p className="admin-error">{error}</p>}
          <button type="submit" className="button button-primary full-width" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <a href="#customer" className="admin-back-customer centered"><ArrowLeft size={15} /> Back to customer app</a>
      </div>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────
function Dashboard({ onNavigate }: { onNavigate: (s: AdminSection) => void }) {
  const [stats, setStats] = useState({ bookings: 0, revenue: 0, helpers: 0, customers: 0, pending: 0 });
  const [recent, setRecent] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: b }, { count: helpers }, { count: bookings }] = await Promise.all([
        supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('helpers').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
      ]);
      const bookingRows = (b ?? []) as BookingRow[];
      setRecent(bookingRows);
      const revenue = bookingRows.reduce((sum, r) => sum + (r.payment_status === 'paid' ? r.price : 0), 0);
      const customers = new Set(bookingRows.map((r) => r.customer_phone)).size;
      const pending = bookingRows.filter((r) => r.status === 'new' || r.status === 'accepted').length;
      setStats({ bookings: bookings ?? 0, revenue, helpers: helpers ?? 0, customers, pending });
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="admin-loading-inline">Loading dashboard...</div>;

  return (
    <div className="dashboard">
      <div className="stat-grid">
        <StatCard icon={<CalendarDays size={22} />} label="Total Bookings" value={stats.bookings.toString()} tone="blue" />
        <StatCard icon={<IndianRupee size={22} />} label="Revenue (Paid)" value={`₹${stats.revenue.toLocaleString('en-IN')}`} tone="green" />
        <StatCard icon={<UserCheck size={22} />} label="Active Helpers" value={stats.helpers.toString()} tone="saffron" />
        <StatCard icon={<Users size={22} />} label="Customers" value={stats.customers.toString()} tone="lavender" />
        <StatCard icon={<Clock3 size={22} />} label="Pending Actions" value={stats.pending.toString()} tone="coral" />
        <StatCard icon={<TrendingUp size={22} />} label="Avg. Task Value" value={stats.bookings > 0 ? `₹${Math.round(recent.reduce((s, r) => s + r.price, 0) / recent.length)}` : '—'} tone="mint" />
      </div>

      <div className="dashboard-actions">
        <button className="dashboard-quick" onClick={() => onNavigate('bookings')}><CalendarDays size={18} /> View all bookings</button>
        <button className="dashboard-quick" onClick={() => onNavigate('helpers')}><UserCheck size={18} /> Manage helpers</button>
        <button className="dashboard-quick" onClick={() => onNavigate('services')}><ShoppingBag size={18} /> Edit services</button>
        <button className="dashboard-quick" onClick={() => onNavigate('promos')}><CreditCard size={18} /> Promo codes</button>
      </div>

      <div className="dashboard-section">
        <div className="dashboard-section-header"><h2>Recent Bookings</h2><button className="link-button" onClick={() => onNavigate('bookings')}>View all</button></div>
        {recent.length === 0 ? <p className="admin-empty">No bookings yet.</p> : <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>ID</th><th>Service</th><th>Customer</th><th>Date</th><th>Status</th><th>Payment</th><th>Price</th></tr></thead>
            <tbody>
              {recent.map((b) => <tr key={b.id}>
                <td className="mono">ET-{b.id.slice(0, 6).toUpperCase()}</td>
                <td>{b.service_name}</td>
                <td>{b.customer_name}<br /><small>{b.customer_phone}</small></td>
                <td>{b.scheduled_date}</td>
                <td><StatusBadge status={b.status} /></td>
                <td><PaymentBadge status={b.payment_status} /></td>
                <td><strong>₹{b.price}</strong></td>
              </tr>)}
            </tbody>
          </table>
        </div>}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: string }) {
  return <div className={`stat-card stat-${tone}`}><div className="stat-icon">{icon}</div><div><small>{label}</small><strong>{value}</strong></div></div>;
}

// ── Bookings Admin ─────────────────────────────────────────────
function BookingsAdmin() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [helpers, setHelpers] = useState<HelperItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<BookingRow | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const [{ data: b }, { data: h }] = await Promise.all([
      supabase.from('bookings').select('*').order('created_at', { ascending: false }),
      supabase.from('helpers').select('*').order('name'),
    ]);
    setBookings((b ?? []) as BookingRow[]);
    setHelpers((h ?? []) as HelperItem[]);
    setLoading(false);
  }

  const filtered = bookings.filter((b) => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return b.service_name.toLowerCase().includes(q) || b.customer_name.toLowerCase().includes(q) || b.customer_phone.includes(q) || b.id.includes(q);
    }
    return true;
  });

  async function updateStatus(bookingId: string, status: string, helperId?: string, paymentStatus?: string, adminNotes?: string) {
    setActionLoading(true);
    const { data, error } = await supabase.rpc('set_booking_status', {
      p_booking_id: bookingId,
      p_status: status,
      p_helper_id: helperId ?? null,
      p_payment_status: paymentStatus ?? null,
      p_admin_notes: adminNotes ?? null,
    });
    setActionLoading(false);
    if (error) { alert('Could not update booking. Please try again.'); return; }
    if (data) {
      const updated = data as BookingRow;
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, ...updated } : b)));
      setSelected((prev) => (prev && prev.id === bookingId ? { ...prev, ...updated } : prev));
    }
  }

  if (loading) return <div className="admin-loading-inline">Loading bookings...</div>;

  return (
    <div className="admin-section-content">
      <div className="admin-filters">
        <div className="search-box"><Search size={16} /><input placeholder="Search by name, phone, or booking ID..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          {STATUS_FLOW.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? <p className="admin-empty">No bookings match your search.</p> : <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>ID</th><th>Service</th><th>Customer</th><th>Date</th><th>Time</th><th>Status</th><th>Payment</th><th>Price</th><th></th></tr></thead>
          <tbody>
            {filtered.map((b) => <tr key={b.id}>
              <td className="mono">ET-{b.id.slice(0, 6).toUpperCase()}</td>
              <td>{b.service_name}</td>
              <td>{b.customer_name}<br /><small>{b.customer_phone}</small></td>
              <td>{b.scheduled_date}</td>
              <td>{b.time_slot}</td>
              <td><StatusBadge status={b.status} /></td>
              <td><PaymentBadge status={b.payment_status} /></td>
              <td><strong>₹{b.price}</strong></td>
              <td><button className="row-action" onClick={() => setSelected(b)}>Manage</button></td>
            </tr>)}
          </tbody>
        </table>
      </div>}

      {selected && <BookingDetailModal booking={selected} helpers={helpers} onClose={() => setSelected(null)} onUpdate={updateStatus} actionLoading={actionLoading} />}
    </div>
  );
}

function BookingDetailModal({ booking, helpers, onClose, onUpdate, actionLoading }: {
  booking: BookingRow;
  helpers: HelperItem[];
  onClose: () => void;
  onUpdate: (id: string, status: string, helperId?: string, paymentStatus?: string, adminNotes?: string) => Promise<void>;
  actionLoading: boolean;
}) {
  const [helperId, setHelperId] = useState(booking.helper_id ?? '');
  const [paymentStatus, setPaymentStatus] = useState(booking.payment_status);
  const [notes, setNotes] = useState(booking.admin_notes);

  return <div className="modal-backdrop" onClick={onClose}>
    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
      <div className="admin-modal-header">
        <div><LogoMark size={20} /><h2>Booking ET-{booking.id.slice(0, 6).toUpperCase()}</h2></div>
        <button className="close-button" onClick={onClose}><X size={20} /></button>
      </div>
      <div className="admin-modal-body">
        <div className="detail-grid">
          <DetailField label="Service" value={booking.service_name} />
          <DetailField label="Customer" value={booking.customer_name} />
          <DetailField label="Phone" value={booking.customer_phone} />
          <DetailField label="Location" value={booking.location} />
          <DetailField label="Date" value={booking.scheduled_date} />
          <DetailField label="Time Slot" value={booking.time_slot} />
          <DetailField label="Price" value={`₹${booking.price}`} />
          <DetailField label="Notes" value={booking.notes || '—'} />
        </div>

        <div className="detail-status-row">
          <div className="detail-field-block">
            <label>Task Status</label>
            <div className="status-pills">
              {STATUS_FLOW.map((s) => <button key={s} className={`status-pill ${booking.status === s ? 'active' : ''}`} disabled={actionLoading} onClick={() => void onUpdate(booking.id, s)}>{STATUS_LABELS[s]}</button>)}
            </div>
          </div>
        </div>

        <div className="detail-assign-row">
          <div className="detail-field-block">
            <label>Assign Helper</label>
            <select value={helperId} onChange={(e) => setHelperId(e.target.value)}>
              <option value="">Select a helper...</option>
              {helpers.map((h) => <option key={h.id} value={h.id}>{h.name} — {h.status}</option>)}
            </select>
            <button className="button button-dark small" disabled={!helperId || actionLoading} onClick={() => void onUpdate(booking.id, booking.status === 'new' ? 'assigned' : booking.status, helperId)}>Assign</button>
          </div>
          <div className="detail-field-block">
            <label>Payment Status</label>
            <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
              {Object.entries(PAYMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button className="button button-dark small" disabled={actionLoading} onClick={() => void onUpdate(booking.id, booking.status, undefined, paymentStatus)}>Update Payment</button>
          </div>
        </div>

        <div className="detail-field-block">
          <label>Admin Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Internal notes about this booking..." />
          <button className="button button-dark small" disabled={actionLoading} onClick={() => void onUpdate(booking.id, booking.status, undefined, undefined, notes)}>Save Notes</button>
        </div>
      </div>
    </div>
  </div>;
}

function DetailField({ label, value }: { label: string; value: string }) {
  return <div className="detail-field"><small>{label}</small><strong>{value}</strong></div>;
}

// ── Helpers Admin ──────────────────────────────────────────────
function HelpersAdmin() {
  const [helpers, setHelpers] = useState<HelperItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<HelperItem | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('helpers').select('*').order('created_at', { ascending: false });
    setHelpers((data ?? []) as HelperItem[]);
    setLoading(false);
  }

  async function saveHelper(e: FormEvent, formData: Partial<HelperItem>) {
    e.preventDefault();
    const { error } = await supabase.rpc('admin_upsert_helper', {
      p_name: formData.name ?? '',
      p_phone: formData.phone ?? '',
      p_id: editing?.id ?? null,
      p_email: formData.email ?? null,
      p_areas: formData.areas ?? [],
      p_specialties: formData.specialties ?? [],
      p_status: formData.status ?? 'available',
    });
    if (error) { alert('Could not save helper.'); return; }
    setShowForm(false); setEditing(null); void load();
  }

  async function deleteHelper(id: string) {
    if (!confirm('Remove this helper?')) return;
    const { error } = await supabase.rpc('admin_delete_helper', { p_helper_id: id });
    if (error) { alert('Could not remove helper.'); return; }
    void load();
  }

  if (loading) return <div className="admin-loading-inline">Loading helpers...</div>;

  return (
    <div className="admin-section-content">
      <div className="admin-section-toolbar">
        <h2>Service Helpers ({helpers.length})</h2>
        <button className="button button-primary" onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={17} /> Add Helper</button>
      </div>
      {helpers.length === 0 ? <p className="admin-empty">No helpers added yet. Add your first service helper.</p> : <div className="admin-cards-grid">
        {helpers.map((h) => <div className="helper-card" key={h.id}>
          <div className="helper-card-header">
            <div className="helper-avatar">{h.name.charAt(0)}</div>
            <div><strong>{h.name}</strong><small><Phone size={12} /> {h.phone}</small></div>
            <span className={`helper-status-badge ${h.status}`}>{h.status}</span>
          </div>
          <div className="helper-card-body">
            {h.areas.length > 0 && <p><MapPin size={13} /> {h.areas.join(', ')}</p>}
            {h.specialties.length > 0 && <p><Zap size={13} /> {h.specialties.join(', ')}</p>}
            <p><Star size={13} /> {Number(h.rating).toFixed(1)} · {h.total_tasks} tasks</p>
          </div>
          <div className="helper-card-actions">
            <button onClick={() => { setEditing(h); setShowForm(true); }}><Pencil size={15} /> Edit</button>
            <button onClick={() => void deleteHelper(h.id)}><Trash2 size={15} /> Remove</button>
          </div>
        </div>)}
      </div>}

      {showForm && <HelperFormModal helper={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSave={saveHelper} />}
    </div>
  );
}

function HelperFormModal({ helper, onClose, onSave }: { helper: HelperItem | null; onClose: () => void; onSave: (e: FormEvent, data: Partial<HelperItem>) => void }) {
  const [name, setName] = useState(helper?.name ?? '');
  const [phone, setPhone] = useState(helper?.phone ?? '');
  const [email, setEmail] = useState(helper?.email ?? '');
  const [areas, setAreas] = useState((helper?.areas ?? []).join(', '));
  const [specialties, setSpecialties] = useState((helper?.specialties ?? []).join(', '));
  const [status, setStatus] = useState(helper?.status ?? 'available');

  return <div className="modal-backdrop" onClick={onClose}>
    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
      <div className="admin-modal-header"><h2>{helper ? 'Edit Helper' : 'Add Helper'}</h2><button className="close-button" onClick={onClose}><X size={20} /></button></div>
      <form onSubmit={(e) => onSave(e, { name, phone, email, areas: areas.split(',').map((a) => a.trim()).filter(Boolean), specialties: specialties.split(',').map((s) => s.trim()).filter(Boolean), status })} className="admin-modal-body">
        <div className="form-row"><label className="field-label">Name<input required value={name} onChange={(e) => setName(e.target.value)} /></label><label className="field-label">Phone<input required value={phone} onChange={(e) => setPhone(e.target.value)} /></label></div>
        <label className="field-label">Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <div className="form-row"><label className="field-label">Areas (comma-separated)<input value={areas} onChange={(e) => setAreas(e.target.value)} placeholder="Ambala Cantt, Sadar" /></label><label className="field-label">Specialties (comma-separated)<input value={specialties} onChange={(e) => setSpecialties(e.target.value)} placeholder="Errands, Hospital" /></label></div>
        <label className="field-label">Status<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="available">Available</option><option value="busy">Busy</option><option value="offline">Offline</option></select></label>
        <button type="submit" className="button button-primary">{helper ? 'Save Changes' : 'Add Helper'}</button>
      </form>
    </div>
  </div>;
}

// ── Services Admin ─────────────────────────────────────────────
function ServicesAdmin() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('services_catalogue').select('*').order('sort_order');
    setServices((data ?? []) as ServiceItem[]);
    setLoading(false);
  }

  async function saveService(e: FormEvent, formData: Partial<ServiceItem>) {
    e.preventDefault();
    const { error } = await supabase.rpc('admin_upsert_service', {
      p_name: formData.name ?? '',
      p_subtitle: formData.subtitle ?? '',
      p_icon_tone: formData.icon_tone ?? 'blue',
      p_price: formData.price ?? 99,
      p_id: editing?.id ?? null,
      p_active: formData.active ?? true,
      p_sort_order: formData.sort_order ?? 0,
    });
    if (error) { alert('Could not save service.'); return; }
    setShowForm(false); setEditing(null); void load();
  }

  async function deleteService(id: string) {
    if (!confirm('Remove this service?')) return;
    const { error } = await supabase.rpc('admin_delete_service', { p_service_id: id });
    if (error) { alert('Could not remove service.'); return; }
    void load();
  }

  async function toggleActive(s: ServiceItem) {
    void saveService({ preventDefault: () => {} } as FormEvent, { ...s, active: !s.active });
  }

  if (loading) return <div className="admin-loading-inline">Loading services...</div>;

  return (
    <div className="admin-section-content">
      <div className="admin-section-toolbar"><h2>Services ({services.length})</h2><button className="button button-primary" onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={17} /> Add Service</button></div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Name</th><th>Subtitle</th><th>Icon</th><th>Price</th><th>Active</th><th>Order</th><th></th></tr></thead>
          <tbody>
            {services.map((s) => <tr key={s.id}>
              <td><strong>{s.name}</strong></td>
              <td>{s.subtitle}</td>
              <td><span className={`service-tone-chip ${s.icon_tone}`}>{s.icon_tone}</span></td>
              <td>₹{s.price}</td>
              <td><button className={`toggle-btn ${s.active ? 'on' : 'off'}`} onClick={() => void toggleActive(s)}>{s.active ? 'Active' : 'Inactive'}</button></td>
              <td>{s.sort_order}</td>
              <td className="row-actions"><button onClick={() => { setEditing(s); setShowForm(true); }}><Pencil size={15} /></button><button onClick={() => void deleteService(s.id)}><Trash2 size={15} /></button></td>
            </tr>)}
          </tbody>
        </table>
      </div>
      {showForm && <ServiceFormModal service={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSave={saveService} />}
    </div>
  );
}

function ServiceFormModal({ service, onClose, onSave }: { service: ServiceItem | null; onClose: () => void; onSave: (e: FormEvent, data: Partial<ServiceItem>) => void }) {
  const [name, setName] = useState(service?.name ?? '');
  const [subtitle, setSubtitle] = useState(service?.subtitle ?? '');
  const [iconTone, setIconTone] = useState(service?.icon_tone ?? 'blue');
  const [price, setPrice] = useState(service?.price ?? 99);
  const [active, setActive] = useState(service?.active ?? true);
  const [sortOrder, setSortOrder] = useState(service?.sort_order ?? 0);
  const tones = ['blue', 'coral', 'yellow', 'green', 'lavender', 'peach', 'mint', 'rose'];

  return <div className="modal-backdrop" onClick={onClose}>
    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
      <div className="admin-modal-header"><h2>{service ? 'Edit Service' : 'Add Service'}</h2><button className="close-button" onClick={onClose}><X size={20} /></button></div>
      <form onSubmit={(e) => onSave(e, { name, subtitle, icon_tone: iconTone, price, active, sort_order: sortOrder })} className="admin-modal-body">
        <label className="field-label">Service Name<input required value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="field-label">Subtitle<input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} /></label>
        <div className="form-row">
          <label className="field-label">Price (₹)<input type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} /></label>
          <label className="field-label">Sort Order<input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} /></label>
        </div>
        <label className="field-label">Icon Colour<select value={iconTone} onChange={(e) => setIconTone(e.target.value)}>{tones.map((t) => <option key={t} value={t}>{t}</option>)}</select></label>
        <label className="field-label-check"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active (visible to customers)</label>
        <button type="submit" className="button button-primary">{service ? 'Save Changes' : 'Add Service'}</button>
      </form>
    </div>
  </div>;
}

// ── Packages Admin ─────────────────────────────────────────────
function PackagesAdmin() {
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PackageItem | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('packages').select('*').order('created_at', { ascending: false });
    setPackages((data ?? []) as PackageItem[]);
    setLoading(false);
  }

  async function savePackage(e: FormEvent, formData: Partial<PackageItem>) {
    e.preventDefault();
    const { error } = await supabase.rpc('admin_upsert_package', {
      p_name: formData.name ?? '',
      p_description: formData.description ?? '',
      p_price: formData.price ?? 1999,
      p_tasks_included: formData.tasks_included ?? 4,
      p_perks: formData.perks ?? [],
      p_id: editing?.id ?? null,
      p_active: formData.active ?? true,
    });
    if (error) { alert('Could not save package.'); return; }
    setShowForm(false); setEditing(null); void load();
  }

  async function deletePackage(id: string) {
    if (!confirm('Remove this package?')) return;
    const { error } = await supabase.rpc('admin_delete_package', { p_package_id: id });
    if (error) { alert('Could not remove package.'); return; }
    void load();
  }

  if (loading) return <div className="admin-loading-inline">Loading packages...</div>;

  return (
    <div className="admin-section-content">
      <div className="admin-section-toolbar"><h2>Packages ({packages.length})</h2><button className="button button-primary" onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={17} /> Add Package</button></div>
      <div className="admin-cards-grid">
        {packages.map((p) => <div className="package-admin-card" key={p.id}>
          <div className="package-admin-header"><strong>{p.name}</strong><span className={`toggle-badge ${p.active ? 'on' : 'off'}`}>{p.active ? 'Active' : 'Inactive'}</span></div>
          <p className="package-admin-desc">{p.description}</p>
          <div className="package-admin-meta"><span>₹{p.price}</span><span>{p.tasks_included} tasks</span></div>
          {p.perks.length > 0 && <ul className="package-perks">{p.perks.map((perk, i) => <li key={i}><Check size={14} /> {perk}</li>)}</ul>}
          <div className="helper-card-actions"><button onClick={() => { setEditing(p); setShowForm(true); }}><Pencil size={15} /> Edit</button><button onClick={() => void deletePackage(p.id)}><Trash2 size={15} /> Remove</button></div>
        </div>)}
      </div>
      {showForm && <PackageFormModal pkg={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSave={savePackage} />}
    </div>
  );
}

function PackageFormModal({ pkg, onClose, onSave }: { pkg: PackageItem | null; onClose: () => void; onSave: (e: FormEvent, data: Partial<PackageItem>) => void }) {
  const [name, setName] = useState(pkg?.name ?? '');
  const [description, setDescription] = useState(pkg?.description ?? '');
  const [price, setPrice] = useState(pkg?.price ?? 1999);
  const [tasksIncluded, setTasksIncluded] = useState(pkg?.tasks_included ?? 4);
  const [perks, setPerks] = useState((pkg?.perks ?? []).join('\n'));
  const [active, setActive] = useState(pkg?.active ?? true);

  return <div className="modal-backdrop" onClick={onClose}>
    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
      <div className="admin-modal-header"><h2>{pkg ? 'Edit Package' : 'Add Package'}</h2><button className="close-button" onClick={onClose}><X size={20} /></button></div>
      <form onSubmit={(e) => onSave(e, { name, description, price, tasks_included: tasksIncluded, perks: perks.split('\n').map((p) => p.trim()).filter(Boolean), active })} className="admin-modal-body">
        <label className="field-label">Package Name<input required value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="field-label">Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></label>
        <div className="form-row"><label className="field-label">Price (₹)<input type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} /></label><label className="field-label">Tasks Included<input type="number" min={1} value={tasksIncluded} onChange={(e) => setTasksIncluded(Number(e.target.value))} /></label></div>
        <label className="field-label">Perks (one per line)<textarea value={perks} onChange={(e) => setPerks(e.target.value)} rows={4} placeholder="4 tasks included&#10;1 task free&#10;Priority support" /></label>
        <label className="field-label-check"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active</label>
        <button type="submit" className="button button-primary">{pkg ? 'Save Changes' : 'Add Package'}</button>
      </form>
    </div>
  </div>;
}

// ── Promos Admin ───────────────────────────────────────────────
function PromosAdmin() {
  const [promos, setPromos] = useState<PromoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PromoItem | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false });
    setPromos((data ?? []) as PromoItem[]);
    setLoading(false);
  }

  async function savePromo(e: FormEvent, formData: Partial<PromoItem>) {
    e.preventDefault();
    const { error } = await supabase.rpc('admin_upsert_promo', {
      p_code: formData.code ?? '',
      p_discount_percent: formData.discount_percent ?? 0,
      p_id: editing?.id ?? null,
      p_max_uses: formData.max_uses ?? null,
      p_active: formData.active ?? true,
    });
    if (error) { alert('Could not save promo code.'); return; }
    setShowForm(false); setEditing(null); void load();
  }

  async function deletePromo(id: string) {
    if (!confirm('Remove this promo code?')) return;
    const { error } = await supabase.rpc('admin_delete_promo', { p_promo_id: id });
    if (error) { alert('Could not remove promo code.'); return; }
    void load();
  }

  if (loading) return <div className="admin-loading-inline">Loading promo codes...</div>;

  return (
    <div className="admin-section-content">
      <div className="admin-section-toolbar"><h2>Promo Codes ({promos.length})</h2><button className="button button-primary" onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={17} /> Add Code</button></div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Code</th><th>Discount</th><th>Uses</th><th>Max</th><th>Active</th><th></th></tr></thead>
          <tbody>
            {promos.map((p) => <tr key={p.id}>
              <td className="mono"><strong>{p.code}</strong></td>
              <td>{p.discount_percent}%</td>
              <td>{p.uses}</td>
              <td>{p.max_uses ?? '∞'}</td>
              <td><span className={`toggle-badge ${p.active ? 'on' : 'off'}`}>{p.active ? 'Active' : 'Inactive'}</span></td>
              <td className="row-actions"><button onClick={() => { setEditing(p); setShowForm(true); }}><Pencil size={15} /></button><button onClick={() => void deletePromo(p.id)}><Trash2 size={15} /></button></td>
            </tr>)}
          </tbody>
        </table>
      </div>
      {showForm && <PromoFormModal promo={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSave={savePromo} />}
    </div>
  );
}

function PromoFormModal({ promo, onClose, onSave }: { promo: PromoItem | null; onClose: () => void; onSave: (e: FormEvent, data: Partial<PromoItem>) => void }) {
  const [code, setCode] = useState(promo?.code ?? '');
  const [discount, setDiscount] = useState(promo?.discount_percent ?? 50);
  const [maxUses, setMaxUses] = useState(promo?.max_uses?.toString() ?? '');
  const [active, setActive] = useState(promo?.active ?? true);

  return <div className="modal-backdrop" onClick={onClose}>
    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
      <div className="admin-modal-header"><h2>{promo ? 'Edit Promo Code' : 'Add Promo Code'}</h2><button className="close-button" onClick={onClose}><X size={20} /></button></div>
      <form onSubmit={(e) => onSave(e, { code, discount_percent: discount, max_uses: maxUses ? Number(maxUses) : null, active })} className="admin-modal-body">
        <label className="field-label">Code<input required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="FIRST50" /></label>
        <div className="form-row"><label className="field-label">Discount %<input type="number" min={0} max={100} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} /></label><label className="field-label">Max Uses (blank = unlimited)<input type="number" min={0} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} /></label></div>
        <label className="field-label-check"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active</label>
        <button type="submit" className="button button-primary">{promo ? 'Save Changes' : 'Add Code'}</button>
      </form>
    </div>
  </div>;
}

// ── Support Admin ──────────────────────────────────────────────
function SupportAdmin() {
  const [items, setItems] = useState<SupportItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('support_requests').select('*').order('created_at', { ascending: false });
    setItems((data ?? []) as SupportItem[]);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.rpc('resolve_support_request', { p_id: id, p_status: status });
    if (error) { alert('Could not update request.'); return; }
    void load();
  }

  if (loading) return <div className="admin-loading-inline">Loading support requests...</div>;

  return (
    <div className="admin-section-content">
      <h2>Support Requests ({items.length})</h2>
      {items.length === 0 ? <p className="admin-empty">No support requests yet.</p> : <div className="admin-cards-grid">
        {items.map((item) => <div className="support-card" key={item.id}>
          <div className="support-header"><strong>{item.subject}</strong><span className={`support-status ${item.status}`}>{item.status.replace('_', ' ')}</span></div>
          <p>{item.message}</p>
          <div className="support-meta"><span><Users size={13} /> {item.customer_name}</span><span><Phone size={13} /> {item.customer_phone}</span></div>
          <div className="support-actions">
            <select defaultValue={item.status} onChange={(e) => void updateStatus(item.id, e.target.value)}>
              <option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
            </select>
          </div>
        </div>)}
      </div>}
    </div>
  );
}

// ── Ratings Admin ──────────────────────────────────────────────
function RatingsAdmin() {
  const [ratings, setRatings] = useState<RatingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('ratings').select('*').order('created_at', { ascending: false });
      setRatings((data ?? []) as RatingItem[]);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="admin-loading-inline">Loading ratings...</div>;

  const avg = ratings.length > 0 ? (ratings.reduce((s, r) => s + r.score, 0) / ratings.length).toFixed(1) : '—';

  return (
    <div className="admin-section-content">
      <div className="admin-section-toolbar"><h2>Ratings &amp; Feedback</h2><div className="avg-rating"><Star size={20} /> <strong>{avg}</strong> <small>avg ({ratings.length} reviews)</small></div></div>
      {ratings.length === 0 ? <p className="admin-empty">No ratings yet.</p> : <div className="admin-cards-grid">
        {ratings.map((r) => <div className="rating-card" key={r.id}>
          <div className="rating-stars">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={16} className={i < r.score ? 'filled' : ''} />)}</div>
          <p>{r.comment || 'No comment provided.'}</p>
          <small>Booking ET-{r.booking_id.slice(0, 6).toUpperCase()}</small>
        </div>)}
      </div>}
    </div>
  );
}

// ── Notifications Admin ────────────────────────────────────────
function NotificationsAdmin() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
    setItems((data ?? []) as NotificationItem[]);
    setLoading(false);
  }

  async function createNotification(e: FormEvent, title: string, message: string, audience: string) {
    e.preventDefault();
    const { error } = await supabase.from('notifications').insert({ title, message, audience, sent_at: new Date().toISOString() });
    if (error) { alert('Could not create notification.'); return; }
    setShowForm(false); void load();
  }

  async function deleteNotification(id: string) {
    if (!confirm('Remove this notification?')) return;
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) { alert('Could not remove notification.'); return; }
    void load();
  }

  if (loading) return <div className="admin-loading-inline">Loading notifications...</div>;

  return (
    <div className="admin-section-content">
      <div className="admin-section-toolbar"><h2>Notifications ({items.length})</h2><button className="button button-primary" onClick={() => setShowForm(true)}><Plus size={17} /> New Notification</button></div>
      {items.length === 0 ? <p className="admin-empty">No notifications sent yet.</p> : <div className="admin-cards-grid">
        {items.map((n) => <div className="notification-card" key={n.id}>
          <div className="notification-header"><Bell size={16} /><strong>{n.title}</strong><span className="audience-badge">{n.audience}</span></div>
          <p>{n.message}</p>
          <div className="notification-footer"><small>{n.sent_at ? new Date(n.sent_at).toLocaleString('en-IN') : 'Not sent'}</small><button onClick={() => void deleteNotification(n.id)}><Trash2 size={14} /> Remove</button></div>
        </div>)}
      </div>}
      {showForm && <NotificationFormModal onClose={() => setShowForm(false)} onSave={createNotification} />}
    </div>
  );
}

function NotificationFormModal({ onClose, onSave }: { onClose: () => void; onSave: (e: FormEvent, title: string, message: string, audience: string) => void }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('all');

  return <div className="modal-backdrop" onClick={onClose}>
    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
      <div className="admin-modal-header"><h2>New Notification</h2><button className="close-button" onClick={onClose}><X size={20} /></button></div>
      <form onSubmit={(e) => onSave(e, title, message, audience)} className="admin-modal-body">
        <label className="field-label">Title<input required value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label className="field-label">Message<textarea required value={message} onChange={(e) => setMessage(e.target.value)} rows={3} /></label>
        <label className="field-label">Audience<select value={audience} onChange={(e) => setAudience(e.target.value)}><option value="all">All</option><option value="customers">Customers</option><option value="helpers">Helpers</option></select></label>
        <button type="submit" className="button button-primary">Send Notification</button>
      </form>
    </div>
  </div>;
}

// ── Shared Admin UI ────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cls = status === 'completed' ? 'completed' : status === 'cancelled' ? 'cancelled' : status === 'in_progress' || status === 'on_the_way' ? 'active' : 'pending';
  return <span className={`status-badge ${cls}`}>{STATUS_LABELS[status] ?? status}</span>;
}

function PaymentBadge({ status }: { status: string }) {
  const cls = status === 'paid' ? 'paid' : status === 'pending' ? 'pending' : status === 'refunded' ? 'refunded' : 'unpaid';
  return <span className={`payment-badge ${cls}`}>{PAYMENT_LABELS[status] ?? status}</span>;
}
