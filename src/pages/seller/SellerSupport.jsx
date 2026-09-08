import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { MessageCircle, Phone, Mail, Clock, Search, ChevronDown } from 'lucide-react';
import BackButton from '../../components/BackButton';

const FAQ_ITEMS = [
  {
    category: 'Getting Started',
    questions: [
      {
        q: 'How do I become a private seller?',
        a: 'Simply register on KAYAD and select "Private Seller" as your seller type. Complete the quick onboarding process and you can start listing vehicles immediately.',
      },
      {
        q: 'What documents do I need to sell my car?',
        a: 'You need the original logbook, your ID, and any service records. For transfer, you\'ll need the logbook transfer form and NTSA transfer documentation.',
      },
      {
        q: 'Is there a fee to list my vehicle?',
        a: 'Listing is free for private sellers. You only pay a small transaction fee when your vehicle sells through our escrow system.',
      },
    ],
  },
  {
    category: 'Listing & Pricing',
    questions: [
      {
        q: 'How many photos should I upload?',
        a: 'We recommend at least 8 photos showing exterior, interior, engine, trunk, and any special features. More photos lead to 3x more views.',
      },
      {
        q: 'How do I price my vehicle?',
        a: 'Research similar vehicles on KAYAD to set a competitive price. Consider mileage, condition, and market demand. Overpriced vehicles take longer to sell.',
      },
      {
        q: 'Can I edit my listing after publishing?',
        a: 'Yes, you can edit your listing at any time from your seller dashboard. Changes are updated immediately.',
      },
    ],
  },
  {
    category: 'Escrow & Payments',
    questions: [
      {
        q: 'How does escrow protection work?',
        a: 'Buyer payments are held securely in escrow. You receive payment only after confirming successful vehicle handover and paperwork transfer.',
      },
      {
        q: 'When do I receive payment?',
        a: 'Payment is released to your M-Pesa or bank account after you confirm successful handover in the platform.',
      },
      {
        q: 'What if there\'s a dispute?',
        a: 'Our dispute resolution team will mediate. We review evidence from both parties and make a fair decision based on platform terms.',
      },
    ],
  },
  {
    category: 'Safety & Security',
    questions: [
      {
        q: 'How are buyers verified?',
        a: 'All buyers undergo ID and phone verification before they can make offers. This ensures genuine buyers and reduces fraud risk.',
      },
      {
        q: 'Where should I meet buyers?',
        a: 'Meet in safe, public locations during daylight hours. Police stations or shopping malls are good options. Never meet alone in isolated areas.',
      },
      {
        q: 'What if a buyer seems suspicious?',
        a: 'Report suspicious behavior immediately through our support system. We take security seriously and will investigate.',
      },
    ],
  },
];

export default function SellerSupport() {
    const { toast } = useToast();
  const _navigate = useNavigate();

  const [activeCategory, setActiveCategory] = useState('Getting Started');
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [contactForm, setContactForm] = useState({ subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const activeFAQ = FAQ_ITEMS.find(f => f.category === activeCategory);

  const handleSubmitSupport = async (e) => {
    e.preventDefault();
    if (!contactForm.subject || !contactForm.message) {
      toast('Please fill in all fields', 'error');
      return;
    }

    setSubmitting(true);
    // Simulate support ticket submission
    setTimeout(() => {
      toast('Support ticket submitted. We\'ll respond within 24 hours.', 'success');
      setContactForm({ subject: '', message: '' });
      setSubmitting(false);
    }, 1000);
  };

  const filteredFAQ = FAQ_ITEMS.map(category => ({
    ...category,
    questions: category.questions.filter(q =>
      q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.a.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(c => c.questions.length > 0);

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32, maxWidth: 1000 }}>
        <div style={{ marginBottom: 32 }}>
          <BackButton fallback="/seller" />
          <div className="section-eyebrow">Private Seller Hub</div>
          <h2>Support Center</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6 }}>
            Get help with selling on KAYAD
          </p>
        </div>

        {/* Search */}
        <div className="card p-6 mb-8">
          <div className="relative">
            <Search size={20} className="text-white/40 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              className="input w-full"
              style={{ paddingLeft: 48 }}
              placeholder="Search for help..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
          {/* FAQ Section */}
          <div className="lg:col-span-2">
            <div className="card p-6">
              <h3 className="font-display font-bold text-white text-xl mb-6">Frequently Asked Questions</h3>

              {!searchQuery && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {FAQ_ITEMS.map(category => (
                    <button
                      key={category.category}
                      onClick={() => setActiveCategory(category.category)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        activeCategory === category.category
                          ? 'bg-gold text-black'
                          : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {category.category}
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-4">
                {(searchQuery ? filteredFAQ : [activeFAQ]).map((category, catIndex) => (
                  <div key={catIndex}>
                    {category && (
                      <>
                        {!searchQuery && (
                          <h4 className="font-display font-bold text-gold text-sm mb-3">{category.category}</h4>
                        )}
                        <div className="space-y-3">
                          {category.questions.map((item, index) => (
                            <div key={index} className="border border-white/[0.06] rounded-lg overflow-hidden">
                              <button
                                onClick={() => setExpandedQuestion(expandedQuestion === `${catIndex}-${index}` ? null : `${catIndex}-${index}`)}
                                className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                              >
                                <span className="text-white font-medium text-sm">{item.q}</span>
                                <ChevronDown
                                  size={16}
                                  className={`text-white/40 transition-transform ${
                                    expandedQuestion === `${catIndex}-${index}` ? 'rotate-180' : ''
                                  }`}
                                />
                              </button>
                              {expandedQuestion === `${catIndex}-${index}` && (
                                <div className="px-5 py-4 bg-white/[0.02] border-t border-white/[0.06]">
                                  <p className="text-white/60 text-sm leading-relaxed">{item.a}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="lg:col-span-1">
            <div className="card p-6">
              <h3 className="font-display font-bold text-white text-lg mb-4">Contact Support</h3>
              <p className="text-white/60 text-sm mb-6">
                Can't find what you're looking for? Send us a message and we'll get back to you within 24 hours.
              </p>

              <form onSubmit={handleSubmitSupport} className="space-y-4">
                <div className="input-group">
                  <label className="input-label">Subject</label>
                  <input
                    className="input"
                    placeholder="Brief description of your issue"
                    value={contactForm.subject}
                    onChange={e => setContactForm(p => ({ ...p, subject: e.target.value }))}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Message</label>
                  <textarea
                    className="input"
                    rows={4}
                    placeholder="Describe your issue in detail..."
                    value={contactForm.message}
                    onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))}
                  />
                </div>
                <button type="submit" className="btn btn-gold w-full" disabled={submitting}>
                  {submitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-white/[0.06]">
                <h4 className="font-display font-bold text-white text-sm mb-4">Other Ways to Reach Us</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-white/60 text-sm">
                    <MessageCircle size={16} className="text-gold" />
                    <span>Live chat: Available 9am-6pm EAT</span>
                  </div>
                  <div className="flex items-center gap-3 text-white/60 text-sm">
                    <Mail size={16} className="text-gold" />
                    <span>Email: support@kayad.co.ke</span>
                  </div>
                  <div className="flex items-center gap-3 text-white/60 text-sm">
                    <Phone size={16} className="text-gold" />
                    <span>Phone: +254 700 000 000</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gold/5 rounded-lg border border-gold/10">
                <div className="flex items-start gap-2">
                  <Clock size={16} className="text-gold flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-gold font-bold text-xs mb-1">Response Time</p>
                    <p className="text-white/60 text-xs">Most inquiries are answered within 24 hours during business days.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
