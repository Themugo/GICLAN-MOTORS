import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { supportAPI } from '../api/api';

const FAQS = [
  {
    q: 'How does the M-Pesa escrow work?',
    a: 'When you buy a vehicle, your M-Pesa payment is held securely in escrow — not released to the seller until you confirm receipt and satisfaction. This protects both parties.',
  },
  {
    q: 'How do I list my car for sale?',
    a: 'Register as a dealer or private seller, click "Sell" in the navbar, complete the listing form with photos and details, and submit for approval. Approved listings appear within 24 hours.',
  },
  {
    q: 'What is a Pre-Inspection?',
    a: 'A certified mechanic physically checks the vehicle before you buy — verifying mileage, condition, and flagging any hidden issues. It costs KES 1,500–6,500 and provides peace of mind.',
  },
  {
    q: 'How do Live Auctions work?',
    a: 'Dealers list vehicles with a starting bid. Registered buyers place bids in real-time. A 5% M-Pesa commitment deposit secures each bid. When the auction ends, the highest bidder wins.',
  },
  {
    q: 'What happens if a seller disappears after I pay?',
    a: "Funds are held in escrow and never released unless you confirm delivery. If a seller doesn't deliver, we refund your full payment within 3 business days.",
  },
  {
    q: 'Can I negotiate the price?',
    a: 'Yes — use the Message Dealer feature to contact sellers directly. Many listings are open to negotiation, especially on the non-auction cars.',
  },
  {
    q: 'How do I become a verified dealer?',
    a: 'Register with your business name and KRA PIN, upload your dealer certificate, and our team reviews your application within 48 hours.',
  },
  {
    q: 'What currencies and payment methods are accepted?',
    a: 'We accept M-Pesa only (Kenyan Shillings). This ensures instant, secure transactions within Kenya\'s mobile money ecosystem.',
  },
];

export default function SupportPage() {
  const { toast } = useToast();
  const { isAuth } = useAuth();
  const [openFaq, setOpenFaq] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);

  useEffect(() => {
    if (!isAuth) { setTicketsLoading(false); return; }
    supportAPI.myTickets()
      .then(d => setTickets(d.tickets || d.data || []))
      .catch(() => {})
      .finally(() => setTicketsLoading(false));
  }, [isAuth]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) { toast('Please fill all required fields', 'warning'); return; }
    setSubmitting(true);
    try {
      await supportAPI.create(form);
      setSubmitted(true);
      toast('Message sent! We\'ll reply within 2 hours.', 'success');
      if (isAuth) {
        supportAPI.myTickets().then(d => setTickets(d.tickets || d.data || [])).catch(() => {});
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to send message. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const TICKET_STATUS_META = {
    open:        { label: 'Open',        badge: 'badge-blue' },
    in_progress: { label: 'In Progress', badge: 'badge-orange' },
    resolved:    { label: 'Resolved',    badge: 'badge-green' },
    closed:      { label: 'Closed',      badge: 'badge-muted' },
  };

  return (
    <div className="page">
      {/* Hero */}
      <div style={{ background: 'var(--surface)', padding: '72px 0 52px', borderBottom: '1px solid var(--border)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="section-eyebrow" style={{ justifyContent: 'center' }}>We're here to help</div>
          <h1 style={{ marginBottom: 16 }}>Support Centre</h1>
          <p style={{ color: 'var(--text-muted)', maxWidth: 500, margin: '0 auto' }}>
            Get answers fast. Our team is online Monday–Saturday, 8am–8pm EAT.
          </p>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 52, paddingBottom: 64 }}>
        {/* Quick Contact Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 56 }}>
          {[
            { icon: '📞', label: 'Phone', value: '+254 700 100 200', sub: 'Mon–Sat 8am–8pm', href: 'tel:+254700100200' },
            { icon: '✉️', label: 'Email', value: 'support@kayad.co.ke', sub: 'Reply within 2 hours', href: 'mailto:support@kayad.co.ke' },
            { icon: '💬', label: 'WhatsApp', value: '+254 700 100 200', sub: 'Quick chat support', href: 'https://wa.me/254700100200' },
            { icon: '📍', label: 'Office', value: 'Westlands, Nairobi', sub: 'By appointment only', href: null },
          ].map(c => (
            <div key={c.label} className="card" style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>{c.icon}</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{c.label}</div>
              {c.href ? (
                <a href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" style={{ color: 'var(--gold)', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>{c.value}</a>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{c.value}</div>
              )}
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{c.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 48, alignItems: 'start' }}>
          {/* FAQs */}
          <div>
            <h2 style={{ marginBottom: 8 }}>Frequently Asked Questions</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 28 }}>Quick answers to common questions.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {FAQS.map((faq, i) => (
                <div
                  key={i}
                  style={{
                    border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                    overflow: 'hidden', background: 'var(--card)',
                  }}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    aria-expanded={openFaq === i}
                    style={{
                      width: '100%', padding: '16px 20px', background: 'none', border: 'none',
                      textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', gap: 12, color: 'var(--text)', fontSize: 14, fontWeight: 500,
                    }}
                  >
                    <span>{faq.q}</span>
                    <span style={{
                      flexShrink: 0, fontSize: 18, color: 'var(--text-muted)',
                      transition: 'transform 0.25s',
                      transform: openFaq === i ? 'rotate(45deg)' : 'none',
                    }}>+</span>
                  </button>
                  {openFaq === i && (
                    <div style={{ padding: '0 20px 18px', color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7 }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Quick links */}
            <div className="card" style={{ padding: 24, marginTop: 28 }}>
              <h3 style={{ marginBottom: 16, fontSize: '1rem' }}>Helpful Links</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { to: '/browse',      label: 'Browse all vehicles' },
                  { to: '/auctions',    label: 'Join a live auction' },
                  { to: '/escrow',      label: 'View your escrow' },
                  { to: '/inspection',  label: 'Book a pre-inspection' },
                  { to: '/register',    label: 'Create an account' },
                ].map(({ to, label }) => (
                  <Link key={to} to={to} style={{ fontSize: 13, color: 'var(--gold)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                    → {label}
                  </Link>
                ))}
              </div>
            </div>

            {/* My Tickets — real status tracking, signed-in users only */}
            {isAuth && (
              <div className="card" style={{ padding: 24, marginTop: 28 }}>
                <h3 style={{ marginBottom: 16, fontSize: '1rem' }}>My Support Tickets</h3>
                {ticketsLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[...Array(2)].map((_, i) => <div key={i} className="skeleton-card" style={{ height: 48 }} />)}
                  </div>
                ) : tickets.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No support tickets yet. Send a message and it'll show up here.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {tickets.slice(0, 5).map((t) => {
                      const meta = TICKET_STATUS_META[t.status] || { label: t.status, badge: 'badge-muted' };
                      return (
                        <div key={t.id || t._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject || t.message?.slice(0, 40) || 'Support request'}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{new Date(t.createdAt || t.created_at).toLocaleDateString()}</div>
                          </div>
                          <span className={`badge ${meta.badge}`} style={{ flexShrink: 0 }}>{meta.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Contact form */}
          <div style={{ position: 'sticky', top: 88 }}>
            {submitted ? (
              <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                <div style={{ fontSize: 60, marginBottom: 16 }}>📬</div>
                <h3>Message Received!</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
                  We'll reply to <strong>{form.email}</strong> within 2 hours (Mon–Sat, 8am–8pm).
                </p>
                <button className="btn btn-outline btn-full" onClick={() => { setSubmitted(false); setForm({ name: '', email: '', subject: '', message: '' }); }}>
                  Send Another
                </button>
              </div>
            ) : (
              <div className="card" style={{ padding: 28 }}>
                <h3 style={{ marginBottom: 6 }}>Send a Message</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>We reply within 2 business hours.</p>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="input-group">
                      <label className="input-label" htmlFor="sup-name">Name *</label>
                      <input id="sup-name" className="input" placeholder="Your name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                    </div>
                    <div className="input-group">
                      <label className="input-label" htmlFor="sup-email">Email *</label>
                      <input id="sup-email" className="input" type="email" placeholder="you@email.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
                    </div>
                  </div>
                  <div className="input-group">
                    <label className="input-label" htmlFor="sup-subject">Subject</label>
                    <select id="sup-subject" className="input" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}>
                      <option value="">Choose a topic…</option>
                      <option value="buying">Buying a vehicle</option>
                      <option value="selling">Selling / listing</option>
                      <option value="auction">Auction queries</option>
                      <option value="escrow">Escrow & payments</option>
                      <option value="inspection">Pre-inspection</option>
                      <option value="account">Account issues</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label" htmlFor="sup-message">Message *</label>
                    <textarea id="sup-message" className="input" rows={5} placeholder="Describe your issue or question in detail…" value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} required />
                  </div>
                  <button className="btn btn-gold btn-full btn-lg" type="submit" disabled={submitting}>
                    {submitting ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Sending…</> : 'Send Message'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
