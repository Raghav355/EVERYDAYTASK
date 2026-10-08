import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileText,
  HeartHandshake,
  Home as HomeIcon,
  IndianRupee,
  MapPin,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Package,
  Phone,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  UserRound,
  X,
  Zap,
  LogOut,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Logo, LogoMark } from '@/components/Logo';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import type { BookingRow } from '@/types';

type Tab = 'home' | 'bookings' | 'packages' | 'account';
type Service = { name: string; subtitle: string; price: number; icon: ReactNode; tone: string };
type Booking = Pick<BookingRow, 'id' | 'service_name' | 'location' | 'scheduled_date' | 'time_slot' | 'customer_name' | 'price' | 'status'>;

type BookingForm = {
  service: Service | null;
  location: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  notes: string;
};

const services: Service[] = [
  { name: 'Single Errand', subtitle: 'Shopping, bills, documents', price: 99, icon: <ShoppingBag size={21} />, tone: 'blue' },
  { name: 'Hospital / Doctor', subtitle: 'Accompaniment & assistance', price: 249, icon: <Stethoscope size={21} />, tone: 'coral' },
  { name: 'Grocery & Medicine', subtitle: 'Pickup and home delivery', price: 149, icon: <HeartHandshake size={21} />, tone: 'yellow' },
  { name: 'Government & Online', subtitle: 'Forms, bookings, digital help', price: 99, icon: <FileText size={21} />, tone: 'green' },
  { name: 'Travel & Appointment', subtitle: 'Airport, railway, local trips', price: 399, icon: <MapPin size={21} />, tone: 'lavender' },
  { name: 'Home & Personal', subtitle: 'Small tasks made easy', price: 99, icon: <HomeIcon size={21} />, tone: 'peach' },
  { name: 'Digital Assistance', subtitle: 'Online payments and forms', price: 99, icon: <Zap size={21} />, tone: 'mint' },
  { name: 'Family Support', subtitle: 'A little extra helping hand', price: 199, icon: <UserRound size={21} />, tone: 'rose' },
];

const defaultForm: BookingForm = { service: null, location: 'Ambala Cantt', date: '', time: '10:00 AM – 12:00 PM', name: '', phone: '', notes: '' };
const timeSlots = ['10:00 AM – 12:00 PM', '12:00 PM – 2:00 PM', '2:00 PM – 5:00 PM', '5:00 PM – 8:00 PM'];

const HERO_FAMILY_IMG = 'https://images.pexels.com/photos/8819155/pexels-photo-8819155.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';
const HERO_HELPER_IMG = 'https://images.pexels.com/photos/6994113/pexels-photo-6994113.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';
const WHY_FAMILY_IMG = 'https://images.pexels.com/photos/19485860/pexels-photo-19485860.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';
const ELDERLY_HELP_IMG = 'https://images.pexels.com/photos/29372727/pexels-photo-29372727.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';

function formatDate(date: string) {
  if (!date) return 'Choose a date';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`));
}

function App() {
  const { user, loading: authLoading, signIn, signUp, signOut } = useCustomerAuth();
  const [tab, setTab] = useState<Tab>('home');
  const [showMenu, setShowMenu] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [form, setForm] = useState<BookingForm>(defaultForm);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState<Booking | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!user) { setBookings([]); return; }
    void loadBookings();
  }, [user]);

  async function loadBookings() {
    const { data } = await supabase
      .from('bookings')
      .select('id, service_name, location, scheduled_date, time_slot, customer_name, price, status')
      .order('created_at', { ascending: false });
    if (data) setBookings(data as Booking[]);
  }

  function beginBooking(service?: Service) {
    setForm({ ...defaultForm, service: service ?? null, date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), name: user?.fullName ?? '', phone: user?.phone ?? '' });
    setBookingStep(service ? 2 : 1);
    setConfirmed(null);
    setBookingOpen(true);
  }

  function closeBooking() {
    setBookingOpen(false);
    setBookingStep(1);
    setConfirmed(null);
  }

  function updateForm<K extends keyof BookingForm>(key: K, value: BookingForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submitBooking(event: FormEvent) {
    event.preventDefault();
    if (!form.service || !form.date || !form.name || !form.phone) return;
    setSaving(true);
    const { data, error } = await supabase.from('bookings').insert({
      service_name: form.service.name,
      service_icon: form.service.tone,
      location: form.location,
      scheduled_date: form.date,
      time_slot: form.time,
      customer_name: form.name,
      customer_phone: form.phone,
      notes: form.notes,
      price: form.service.price,
    }).select('id, service_name, location, scheduled_date, time_slot, customer_name, price, status').maybeSingle();
    setSaving(false);
    if (error || !data) {
      setToast('We could not save that booking. Please try again.');
      return;
    }
    setConfirmed(data as Booking);
    setBookings((current) => [data as Booking, ...current]);
    setBookingStep(4);
  }

  async function handleSignOut() {
    await signOut();
    setTab('home');
    setBookingOpen(false);
    setBookings([]);
  }

  function showTab(nextTab: Tab) {
    setTab(nextTab);
    setShowMenu(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (authLoading) {
    return <div className="app-shell"><div className="auth-loading"><LogoMark size={32} /></div></div>;
  }

  if (!user) {
    return <CustomerAuth onSignIn={signIn} onSignUp={signUp} />;
  }

  const initials = user.fullName ? user.fullName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() : user.email.slice(0, 2).toUpperCase();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand" onClick={() => showTab('home')} role="button" tabIndex={0}>
          <Logo size={30} />
        </div>
        <div className="topbar-actions">
          <button className="location-pill" aria-label="Change location"><MapPin size={16} /><span>Ambala Cantt</span><ChevronRight size={14} /></button>
          <a href="#admin" className="admin-link" aria-label="Admin Panel">Admin</a>
          <button className="avatar-button" onClick={() => showTab('account')} aria-label="Open account"><span>{initials}</span></button>
          <button className="mobile-menu" onClick={() => setShowMenu((value) => !value)} aria-label="Open menu"><Menu size={22} /></button>
        </div>
        {showMenu && <div className="mobile-menu-panel"><button onClick={() => showTab('bookings')}>My bookings</button><button onClick={() => showTab('packages')}>Packages</button><button onClick={() => showTab('account')}>Account</button><a href="#admin" className="mobile-admin-link">Admin Panel</a></div>}
      </header>

      <main>
        {tab === 'home' && <Home onBook={beginBooking} bookings={bookings} onViewBookings={() => showTab('bookings')} />}
        {tab === 'bookings' && <Bookings bookings={bookings} onBook={() => beginBooking()} />}
        {tab === 'packages' && <Packages onSelect={() => beginBooking(services[0])} />}
        {tab === 'account' && <Account user={user} onBookParent={() => beginBooking()} onSignOut={handleSignOut} />}
      </main>

      <footer className="site-footer">
        <div className="footer-brand">
          <LogoMark size={26} />
          <div>
            <strong>everydaytask</strong>
            <span>आपका काम, हमारी जिम्मेदारी।</span>
          </div>
        </div>
        <div className="footer-links">
          <button onClick={() => showTab('home')}>Home</button>
          <button onClick={() => showTab('bookings')}>Bookings</button>
          <button onClick={() => showTab('packages')}>Packages</button>
          <button onClick={() => showTab('account')}>Account</button>
        </div>
        <div className="made-in-india">
          <span className="mi-flag">
            <i className="flag-saffron" />
            <i className="flag-white" />
            <i className="flag-green" />
          </span>
          <span>Made in India</span>
        </div>
      </footer>

      <nav className="bottom-nav" aria-label="Main navigation">
        <NavButton icon={<HomeIcon size={20} />} label="Home" active={tab === 'home'} onClick={() => showTab('home')} />
        <NavButton icon={<CalendarDays size={20} />} label="Bookings" active={tab === 'bookings'} onClick={() => showTab('bookings')} badge={bookings.length > 0 ? bookings.length : undefined} />
        <NavButton icon={<Package size={20} />} label="Packages" active={tab === 'packages'} onClick={() => showTab('packages')} />
        <NavButton icon={<UserRound size={20} />} label="Account" active={tab === 'account'} onClick={() => showTab('account')} />
      </nav>

      {bookingOpen && <BookingModal step={bookingStep} form={form} saving={saving} confirmed={confirmed} onClose={closeBooking} onStep={setBookingStep} onUpdate={updateForm} onSubmit={submitBooking} />}
      {toast && <button className="toast" onClick={() => setToast('')}>{toast}<X size={16} /></button>}
    </div>
  );
}

function Home({ onBook, bookings, onViewBookings }: { onBook: (service?: Service) => void; bookings: Booking[]; onViewBookings: () => void }) {
  return <div className="page home-page">
    <section className="hero">
      <div className="hero-copy">
        <span className="eyebrow"><Sparkles size={14} /> Your everyday support, sorted</span>
        <h1>Kaam chhota ho ya bada,<br /><em>hum sambhal lenge.</em></h1>
        <p className="hindi-slogan">काम छोटा हो या बड़ा, हम संभाल लेंगे।</p>
        <p className="hero-desc">Trusted local help for errands, appointments, documents and more — right here in Ambala.</p>
        <div className="hero-actions"><button className="button button-primary button-large" onClick={() => onBook()}>Book a task <ArrowRight size={18} /></button><button className="text-button" onClick={() => onViewBookings()}>See how it works <ChevronRight size={16} /></button></div>
      </div>
      <div className="hero-images">
        <div className="hero-image-main">
          <img src={HERO_FAMILY_IMG} alt="Indian family spending time together at home" loading="lazy" />
          <div className="hero-image-badge"><BadgeCheck size={18} /><span><strong>Verified helpers</strong><small>Background checked</small></span></div>
        </div>
        <div className="hero-image-secondary">
          <img src={HERO_HELPER_IMG} alt="Everyday Task service helper" loading="lazy" />
          <div className="helper-shirt-print"><LogoMark size={15} /><span>everydaytask</span></div>
          <div className="helper-badge"><span className="helper-tshirt-logo"><LogoMark size={16} /></span><div><strong>everydaytask</strong><small>Your helper</small></div></div>
        </div>
      </div>
    </section>

    <section className="trust-strip">
      <div><ShieldCheck size={19} /><span><strong>Safe &amp; transparent</strong><small>Clear pricing, no surprises</small></span></div>
      <div><HeartHandshake size={19} /><span><strong>Human support</strong><small>Real people, nearby</small></span></div>
      <div><Zap size={19} /><span><strong>Easy booking</strong><small>Three simple steps</small></span></div>
    </section>

    <section className="section-block">
      <div className="section-heading">
        <div><span className="eyebrow muted">What can we help with?</span><h2>Everyday tasks, made easy.</h2><p className="section-hindi">हर दिन के कामों में, आपका भरोसेमंद साथी।</p></div>
        <button className="circle-button" onClick={() => onBook()} aria-label="Book a task"><Plus size={19} /></button>
      </div>
      <div className="service-grid">
        {services.map((service) => <button className="service-card" key={service.name} onClick={() => onBook(service)}>
          <span className={`service-icon ${service.tone}`}>{service.icon}</span>
          <span className="service-card-copy"><strong>{service.name}</strong><small>{service.subtitle}</small><span className="starting-price">from <b>₹{service.price}</b></span></span>
          <ChevronRight size={17} className="card-arrow" />
        </button>)}
      </div>
    </section>

    <section className="offer-banner">
      <div className="offer-sun">50<span>%</span></div>
      <div><span className="eyebrow">New here?</span><h3>First task, half price.</h3><p>Use code <strong>FIRST50</strong> on your first booking.</p></div>
      <button className="button button-dark" onClick={() => onBook()}>Book now <ArrowRight size={16} /></button>
    </section>

    {bookings.length > 0 && <section className="section-block recent-block">
      <div className="section-heading"><div><span className="eyebrow muted">Your activity</span><h2>Pick up where you left off.</h2></div><button className="link-button" onClick={onViewBookings}>View all <ArrowRight size={15} /></button></div>
      <BookingPreview booking={bookings[0]} />
    </section>}

    <section className="why-section">
      <div className="why-copy">
        <span className="eyebrow">Why everydaytask?</span>
        <h2>Because some days,<br /><em>a little help goes a long way.</em></h2>
        <p className="section-hindi">आप निश्चिंत रहें, बाकी हम संभाल लेंगे।</p>
        <div className="why-images">
          <img src={WHY_FAMILY_IMG} alt="Elderly Indian woman using a laptop at home" loading="lazy" />
          <img src={ELDERLY_HELP_IMG} alt="Caregiver helping elderly woman at home" loading="lazy" />
        </div>
      </div>
      <div className="quote-card"><MessageCircle size={22} /><p>“Simple, trusted, local. Exactly how help should feel.”</p><small>— Raghav, founder</small></div>
    </section>
  </div>;
}

function Bookings({ bookings, onBook }: { bookings: Booking[]; onBook: () => void }) {
  return <div className="page inner-page">
    <PageIntro eyebrow="Your activity" title="My bookings" action={<button className="button button-primary" onClick={onBook}><Plus size={17} /> New task</button>} />
    {bookings.length === 0 ? <EmptyState onBook={onBook} /> : <div className="booking-list">{bookings.map((booking) => <BookingPreview booking={booking} key={booking.id} detailed />)}</div>}
    <div className="help-card"><div className="help-icon"><CircleHelp size={21} /></div><div><strong>Need a hand?</strong><p>Our support team is happy to help with any booking.</p></div><a className="circle-button" href="tel:+919729471241" aria-label="Call Everyday Task support"><Phone size={17} /></a></div>
  </div>;
}

function Packages({ onSelect }: { onSelect: () => void }) {
  return <div className="page inner-page">
    <PageIntro eyebrow="Save more, stress less" title="Care packages" />
    <p className="section-hindi centered">जहाँ जरूरत हो, Everyday Task वहाँ हो।</p>
    <section className="package-hero">
      <div className="package-hero-copy">
        <span className="eyebrow">Most loved</span>
        <h2>Monthly Family Care</h2>
        <p>For the little things that keep life moving. Four tasks, one free — plus priority slots when you need us.</p>
        <div className="package-price"><strong>₹1,999</strong><span>/ month</span></div>
        <button className="button button-dark" onClick={onSelect}>Choose this plan <ArrowRight size={17} /></button>
      </div>
      <div className="package-stamp"><HeartHandshake size={31} /><strong>Made for<br />your family</strong></div>
    </section>
    <div className="package-features">
      <Feature icon={<Check />} title="4 tasks included" text="Grocery, errands, forms or appointments." />
      <Feature icon={<Zap />} title="1 task free" text="Your fifth task is on us every month." />
      <Feature icon={<Clock3 />} title="Priority support" text="Get the earliest available time slot." />
    </div>
    <section className="package-note"><ShieldCheck size={20} /><div><strong>Pause anytime</strong><p>No lock-ins. Your unused tasks stay safe for the next month.</p></div></section>
  </div>;
}

function Account({ user, onBookParent, onSignOut }: { user: { fullName: string; email: string; phone: string }; onBookParent: () => void; onSignOut: () => void }) {
  const initials = user.fullName ? user.fullName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() : user.email.slice(0, 2).toUpperCase();
  const displayName = user.fullName || user.email.split('@')[0];
  const displayPhone = user.phone || 'Not provided';
  return <div className="page inner-page">
    <PageIntro eyebrow={`Hello, ${displayName.split(' ')[0]}`} title="Account" />
    <div className="profile-card">
      <div className="profile-avatar">{initials}</div>
      <div><h3>{displayName}</h3><p><Phone size={14} /> {displayPhone}</p><span className="verified-label"><BadgeCheck size={14} /> Verified account</span></div>
      <button className="more-button"><MoreHorizontal size={20} /></button>
    </div>
    <div className="wallet-card">
      <div><span className="eyebrow">Everyday wallet</span><h3>₹0 <small>available credit</small></h3></div>
      <div className="wallet-art"><IndianRupee size={28} /></div>
      <button className="wallet-link">View details <ArrowRight size={15} /></button>
    </div>
    <div className="settings-list">
      <SettingRow icon={<UserRound />} label="Personal details" />
      <SettingRow icon={<HeartHandshake />} label="Book for my parent" onClick={onBookParent} />
      <SettingRow icon={<CircleHelp />} label="Help & support" />
      <SettingRow icon={<ShieldCheck />} label="Privacy and safety" />
    </div>
    <button className="logout-button" onClick={onSignOut}><LogOut size={17} /> Log out</button>
  </div>;
}

function PageIntro({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) { return <div className="page-intro"><div><span className="eyebrow muted">{eyebrow}</span><h1>{title}</h1></div>{action}</div>; }
function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) { return <div className="feature"><span>{icon}</span><div><strong>{title}</strong><p>{text}</p></div></div>; }
function SettingRow({ icon, label, onClick }: { icon: ReactNode; label: string; onClick?: () => void }) { return <button className="setting-row" onClick={onClick}><span>{icon}</span><strong>{label}</strong><ChevronRight size={17} /></button>; }
function NavButton({ icon, label, active, onClick, badge }: { icon: ReactNode; label: string; active: boolean; onClick: () => void; badge?: number }) { return <button className={`nav-button ${active ? 'active' : ''}`} onClick={onClick}><span className="nav-icon">{icon}{badge && <i>{badge}</i>}</span><small>{label}</small></button>; }
function EmptyState({ onBook }: { onBook: () => void }) { return <div className="empty-state"><div className="empty-icon"><CalendarDays size={28} /></div><h2>No bookings yet</h2><p>Your next task is only a few taps away.</p><button className="button button-primary" onClick={onBook}>Book your first task <ArrowRight size={16} /></button></div>; }

function BookingPreview({ booking, detailed = false }: { booking: Booking; detailed?: boolean }) {
  const statusLabel = booking.status === 'new' ? 'New request' : booking.status === 'assigned' ? 'Helper assigned' : booking.status.replace('_', ' ');
  return <article className={`booking-preview ${detailed ? 'detailed' : ''}`}>
    <div className="booking-icon"><Sparkles size={19} /></div>
    <div className="booking-main">
      <div className="booking-topline"><strong>{booking.service_name}</strong><span className="status-chip"><span />{statusLabel}</span></div>
      <p><CalendarDays size={14} /> {formatDate(booking.scheduled_date)} <span className="dot-sep">·</span> <Clock3 size={14} /> {booking.time_slot}</p>
      <p><MapPin size={14} /> {booking.location}</p>
      {detailed && <div className="timeline"><span className="timeline-done" /><div><strong>Assigned to you</strong><small>Your helper will call before arriving</small></div><ChevronRight size={16} /></div>}
    </div>
    <div className="booking-price"><strong>₹{booking.price}</strong><small>#{booking.id.slice(0, 6).toUpperCase()}</small></div>
  </article>;
}

function BookingModal({ step, form, saving, confirmed, onClose, onStep, onUpdate, onSubmit }: { step: number; form: BookingForm; saving: boolean; confirmed: Booking | null; onClose: () => void; onStep: (step: number) => void; onUpdate: <K extends keyof BookingForm>(key: K, value: BookingForm[K]) => void; onSubmit: (event: FormEvent) => void }) {
  return <div className="modal-backdrop"><div className="booking-modal">
    <div className="modal-header">
      <div className="modal-header-brand"><LogoMark size={24} /><div><span className="eyebrow muted">Everyday Task</span><h2>{step === 4 ? 'You’re all set.' : 'Book a task'}</h2></div></div>
      <button className="close-button" onClick={onClose}><X size={20} /></button>
    </div>
    {step < 4 && <div className="stepper"><span className={step >= 1 ? 'current' : ''}>1</span><i /><span className={step >= 2 ? 'current' : ''}>2</span><i /><span className={step >= 3 ? 'current' : ''}>3</span><div className="step-copy">{step === 1 ? 'Choose a service' : step === 2 ? 'Schedule your task' : 'Review and confirm'}</div></div>}
    {step === 1 && <ServicePicker form={form} onUpdate={onUpdate} onNext={() => onStep(2)} />}
    {step === 2 && <SchedulePicker form={form} onUpdate={onUpdate} onBack={() => onStep(1)} onNext={() => onStep(3)} />}
    {step === 3 && <ReviewBooking form={form} saving={saving} onUpdate={onUpdate} onBack={() => onStep(2)} onSubmit={onSubmit} />}
    {step === 4 && confirmed && <Confirmation booking={confirmed} onClose={onClose} />}
  </div></div>;
}

function ServicePicker({ form, onUpdate, onNext }: { form: BookingForm; onUpdate: <K extends keyof BookingForm>(key: K, value: BookingForm[K]) => void; onNext: () => void }) {
  return <div className="modal-content"><p className="modal-lead">What would you like a hand with today?</p>
    <div className="modal-service-list">{services.map((service) => <button key={service.name} className={`modal-service ${form.service?.name === service.name ? 'selected' : ''}`} onClick={() => onUpdate('service', service)}><span className={`service-icon ${service.tone}`}>{service.icon}</span><span><strong>{service.name}</strong><small>{service.subtitle}</small></span><span className="modal-service-price">from ₹{service.price}</span>{form.service?.name === service.name && <Check size={18} className="selected-check" />}</button>)}</div>
    <button className="button button-primary full-width" disabled={!form.service} onClick={onNext}>Continue <ArrowRight size={17} /></button>
  </div>;
}

function SchedulePicker({ form, onUpdate, onBack, onNext }: { form: BookingForm; onUpdate: <K extends keyof BookingForm>(key: K, value: BookingForm[K]) => void; onBack: () => void; onNext: () => void }) {
  return <div className="modal-content"><p className="modal-lead">Tell us when and where you need us.</p>
    <label className="field-label">Your area<select value={form.location} onChange={(event) => onUpdate('location', event.target.value)}><option>Ambala Cantt</option><option>Sadar</option><option>Gandhi Road</option><option>Mall Bazaar</option><option>Ambala City</option><option>Other</option></select></label>
    <label className="field-label">Preferred date<input type="date" min={new Date().toISOString().slice(0, 10)} value={form.date} onChange={(event) => onUpdate('date', event.target.value)} /></label>
    <div className="field-label">Preferred time<div className="time-grid">{timeSlots.map((slot) => <button type="button" className={form.time === slot ? 'chosen' : ''} key={slot} onClick={() => onUpdate('time', slot)}>{slot}</button>)}</div></div>
    <div className="modal-footer"><button className="back-button" onClick={onBack}><ChevronLeft size={17} /> Back</button><button className="button button-primary" disabled={!form.date} onClick={onNext}>Continue <ArrowRight size={17} /></button></div>
  </div>;
}

function ReviewBooking({ form, saving, onUpdate, onBack, onSubmit }: { form: BookingForm; saving: boolean; onUpdate: <K extends keyof BookingForm>(key: K, value: BookingForm[K]) => void; onBack: () => void; onSubmit: (event: FormEvent) => void }) {
  return <form className="modal-content" onSubmit={onSubmit}>
    <p className="modal-lead">One last thing — who should we contact?</p>
    <div className="review-summary"><span className={`service-icon ${form.service?.tone ?? 'blue'}`}>{form.service?.icon}</span><div><strong>{form.service?.name}</strong><small>{formatDate(form.date)} · {form.time}</small><small>{form.location}</small></div><strong>₹{form.service?.price}</strong></div>
    <div className="form-row"><label className="field-label">Your name<input required value={form.name} onChange={(event) => onUpdate('name', event.target.value)} placeholder="e.g. Raghav Kumar" /></label><label className="field-label">Phone number<input required pattern="[0-9 ]{10,14}" value={form.phone} onChange={(event) => onUpdate('phone', event.target.value)} placeholder="10 digit number" /></label></div>
    <label className="field-label">Anything we should know? <span className="optional">Optional</span><textarea value={form.notes} onChange={(event) => onUpdate('notes', event.target.value)} placeholder="Add a note for your helper..." rows={3} /></label>
    <p className="cash-note"><ShieldCheck size={16} /> Cashless, transparent pricing. You’ll pay after the task.</p>
    <div className="modal-footer"><button type="button" className="back-button" onClick={onBack}><ChevronLeft size={17} /> Back</button><button className="button button-primary" disabled={saving}>{saving ? 'Confirming...' : 'Confirm booking'} <Check size={17} /></button></div>
  </form>;
}

function Confirmation({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  return <div className="confirmation">
    <div className="success-orbit"><Check size={37} strokeWidth={3} /></div>
    <span className="eyebrow">Booking confirmed</span>
    <h2>We’ve got this.</h2>
    <p className="confirmation-hindi">आप निश्चिंत रहें, बाकी हम संभाल लेंगे।</p>
    <p className="confirmation-desc">Your helper will reach out before the task. We’ve also sent the details to your phone.</p>
    <div className="confirmation-card"><div><small>BOOKING ID</small><strong>ET-{booking.id.slice(0, 6).toUpperCase()}</strong></div><div><small>WHEN</small><strong>{formatDate(booking.scheduled_date)}</strong></div><div><small>FOR</small><strong>{booking.service_name}</strong></div></div>
    <button className="button button-primary full-width" onClick={onClose}>Done <Check size={17} /></button>
    <a className="whatsapp-button" href="https://wa.me/919729471241?text=Hi%20Everyday%20Task%2C%20I%20need%20help%20with%20my%20booking." target="_blank" rel="noreferrer"><MessageCircle size={17} /> Message us on WhatsApp</a>
  </div>;
}

export default App;

type AuthMode = 'signin' | 'signup';

function CustomerAuth({ onSignIn, onSignUp }: {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string, fullName: string, phone: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await onSignIn(email, password);
      } else {
        await onSignUp(email, password, fullName, phone);
      }
    } catch {
      setError(mode === 'signin' ? 'Invalid email or password. Please try again.' : 'Could not create account. This email may already be registered.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo"><Logo size={36} /></div>
        <h1>{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="auth-subtitle">{mode === 'signin' ? 'Sign in to book tasks and manage your bookings.' : 'Join Everyday Task to book trusted local help.'}</p>
        <form onSubmit={handleSubmit}>
          {mode === 'signup' && <>
            <label className="field-label">Full name<input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Raghav Kumar" /></label>
            <label className="field-label">Phone number<input required pattern="[0-9 ]{10,14}" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10 digit number" /></label>
          </>}
          <label className="field-label">Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
          <label className="field-label">Password<input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" /></label>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="button button-primary full-width" disabled={submitting}>
            {submitting ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
        </form>
        <p className="auth-switch">
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button className="auth-switch-button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}>
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
        <a href="#admin" className="auth-admin-link">Admin Panel</a>
      </div>
    </div>
  );
}
