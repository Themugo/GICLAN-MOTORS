import { useState } from 'react';
import { 
  HelpCircle, 
  Phone, 
  MessageSquare, 
  Mail, 
  ChevronDown, 
  ChevronUp, 
  Send, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  Building2,
  FileText,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { Button } from '../ui/Button';

export const SupportPage: React.FC = () => {
  const { openChat, navigateTo } = useMarketplace();

  // FAQ Toggle State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    transactionId: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccessMsg, setFormSuccessMsg] = useState('');

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const handleSubmitMessage = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setFormSuccessMsg('Transaction inquiry submitted successfully (Case #KYD-8942). Our Resolution Desk team has received your message and will respond within 2 hours.');
      setFormData({ name: '', email: '', phone: '', transactionId: '', subject: '', message: '' });
      setTimeout(() => setFormSuccessMsg(''), 6000);
    }, 1000);
  };

  const faqs = [
    {
      category: 'Escrow & Payments',
      q: 'How does the KAYAD Escrow Vault protect my vehicle purchase?',
      a: 'Your funds are held in a CBK-regulated ring-fenced escrow account managed by licensed financial custodians. Money is never released to the seller until you complete physical vehicle inspection and sign the digital handover certificate.'
    },
    {
      category: 'Inspection Reports',
      q: 'How do I request an independent vehicle inspection report?',
      a: 'If a vehicle listing does not have an existing report or you require a second opinion, visit our Vehicle Inspection Marketplace tab to request an independent audit from an accredited partner inspection center.'
    },
    {
      category: 'Auctions & Bidding',
      q: 'What happens if a vehicle won at auction differs from its inspection report?',
      a: 'Auction bids are legally binding under normal conditions. However, if the vehicle fails physical handover audit or presents material defects not disclosed in the published inspection record, you are 100% protected by Escrow Vault and can decline handover for a full refund.'
    },
    {
      category: 'Dispute Resolution',
      q: 'How are transaction disputes handled between buyer and seller?',
      a: 'KAYAD operates a dedicated Resolution Desk. If either party raises an issue during the 48-hour handover inspection window, escrow funds are immediately paused while our automotive audit team conducts a physical verification.'
    },
    {
      category: 'Ownership & Legal',
      q: 'How is logbook transfer and NTSA legal registration verified?',
      a: 'Our legal verification team cross-checks all vehicle logbooks directly with NTSA and KRA records to confirm zero encumbrances, authentic ownership, and clear title before escrow release.'
    },
    {
      category: 'Fees & Transparency',
      q: 'What fees are involved in using KAYAD support and escrow services?',
      a: 'Escrow Vault protection is completely free for buyers. Sellers pay a standard 1% transaction fee upon successful release of funds, capped at KES 50,000.'
    }
  ];

  return (
    <div className="pt-3 sm:pt-5 pb-10 sm:pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-5 sm:space-y-6 bg-[#FCF9F4] text-[#1E3063] font-sans">
      
      {/* 1. Header / Hero Section */}
      <div className="p-5 sm:p-6 lg:p-7 rounded-2xl bg-[#1E3063] text-white border border-[#1E3063] shadow-lg relative overflow-hidden space-y-5">
        {/* Glowing Background Accents */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00C9CE]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-[#00C9CE]/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-3.5 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00C9CE]/20 text-[#00C9CE] text-[11px] font-mono font-black uppercase tracking-wider border border-[#00C9CE]/40 shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00C9CE]" />
            <span>KAYAD OFFICIAL RESOLUTION DESK</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black font-serif tracking-tight text-white leading-tight">
            Transaction Support & Resolution Hub
          </h1>

          <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed max-w-2xl">
            Dedicated high-priority assistance for high-value automotive purchases, M-Pesa Escrow Vault clearances, 150-Point inspection verification, and official vehicle handover dispute resolution across Kenya.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs text-slate-200">
            <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-xs px-3.5 py-1.5 rounded-xl border border-white/15 text-xs font-semibold shadow-2xs">
              <Lock className="w-3.5 h-3.5 text-[#00C9CE]" /> CBK-Regulated Escrow
            </span>
            <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-xs px-3.5 py-1.5 rounded-xl border border-white/15 text-xs font-semibold shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-[#2ECC71]" /> 7 Days a Week (8am – 8pm EAT)
            </span>
            <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-xs px-3.5 py-1.5 rounded-xl border border-white/15 text-xs font-semibold shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00C9CE]" /> Dedicated Audit Desk
            </span>
          </div>
        </div>
      </div>

      {/* 2. Specialized Contact Channels (3 Distinct Visual Groupings) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Urgent Phone Channel */}
        <div className="p-6 sm:p-7 rounded-3xl bg-white border border-amber-200/80 shadow-xs hover:shadow-md hover:border-amber-400 transition-all space-y-5 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
          
          <div className="space-y-4 relative z-10">
            <div className="flex items-center justify-between gap-2">
              <div className="w-12 h-12 rounded-2xl bg-[#1E3063] text-[#00C9CE] flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                <Phone className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-100/90 text-amber-900 border border-amber-300/60 text-[10px] font-mono font-black uppercase tracking-wider shadow-2xs">
                Urgent Escalations
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-[#1E3063] font-serif tracking-tight">
                Hotline & Escrow Desk
              </h3>
              <p className="text-xs text-[#6B7A99] font-medium leading-relaxed">
                Direct phone access for active Escrow Vault releases, inspection disputes & handover emergencies.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-[#F6F1E8] border border-[#E2D8C7]/80 space-y-1">
              <span className="text-[10px] font-mono font-bold text-[#6B7A99] uppercase tracking-wider block">Toll-Free Direct Line</span>
              <p className="text-base sm:text-lg font-black font-mono text-[#1E3063]">
                +254 700 000 000
              </p>
            </div>

            <p className="text-[11px] text-[#6B7A99] font-semibold flex items-center gap-1.5 pt-0.5">
              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Available Mon–Sun: 8:00 AM – 8:00 PM EAT</span>
            </p>
          </div>

          <a
            href="tel:+254700000000"
            className="relative z-10 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#1E3063] hover:bg-[#0B1628] text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-xs cursor-pointer border border-[#1E3063]"
          >
            <span>Call Direct Hotline</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#00C9CE]" />
          </a>
        </div>

        {/* Live Chat Channel */}
        <div className="p-6 sm:p-7 rounded-3xl bg-white border border-[#00C9CE]/40 shadow-xs hover:shadow-md hover:border-[#00C9CE] transition-all space-y-5 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-28 h-28 bg-[#00C9CE]/10 rounded-full blur-xl pointer-events-none" />

          <div className="space-y-4 relative z-10">
            <div className="flex items-center justify-between gap-2">
              <div className="w-12 h-12 rounded-2xl bg-[#00C9CE] text-[#1E3063] flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                <MessageSquare className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-100/90 text-emerald-900 border border-emerald-300/60 text-[10px] font-mono font-black uppercase tracking-wider shadow-2xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Live Agents Online
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-[#1E3063] font-serif tracking-tight">
                Live In-App Concierge
              </h3>
              <p className="text-xs text-[#6B7A99] font-medium leading-relaxed">
                Real-time assistance with bidding strategy, vehicle specifications, inspection reports & seller inquiry.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-[#00C9CE]/10 border border-[#00C9CE]/30 space-y-1">
              <span className="text-[10px] font-mono font-bold text-[#1E3063] uppercase tracking-wider block">Messenger SLA</span>
              <p className="text-sm font-extrabold text-[#1E3063]">
                Typical Wait Time: &lt; 2 Minutes
              </p>
            </div>

            <p className="text-[11px] text-[#6B7A99] font-semibold flex items-center gap-1.5 pt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00C9CE] shrink-0" />
              <span>Encrypted Session with Official Specialist</span>
            </p>
          </div>

          <button
            onClick={() => openChat()}
            className="relative z-10 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#00C9CE] hover:bg-[#00b8bc] text-[#1E3063] font-black text-xs uppercase tracking-wider transition-all shadow-xs cursor-pointer border border-[#00C9CE]"
          >
            <span>Launch Live Messenger</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#1E3063]" />
          </button>
        </div>

        {/* Email Channel */}
        <div className="p-6 sm:p-7 rounded-3xl bg-white border border-[#E2D8C7] shadow-xs hover:shadow-md hover:border-[#1E3063] transition-all space-y-5 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-28 h-28 bg-[#1E3063]/5 rounded-full blur-xl pointer-events-none" />

          <div className="space-y-4 relative z-10">
            <div className="flex items-center justify-between gap-2">
              <div className="w-12 h-12 rounded-2xl bg-[#1E3063] text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                <Mail className="w-6 h-6 text-[#00C9CE]" />
              </div>
              <span className="px-3 py-1 rounded-full bg-[#1E3063]/10 text-[#1E3063] border border-[#1E3063]/20 text-[10px] font-mono font-black uppercase tracking-wider shadow-2xs">
                Legal & Audit
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-[#1E3063] font-serif tracking-tight">
                Documentation Desk
              </h3>
              <p className="text-xs text-[#6B7A99] font-medium leading-relaxed">
                Formal submission of KRA tax entry forms, legal logbook transfer files & compliance verification.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-[#F6F1E8] border border-[#E2D8C7]/80 space-y-1">
              <span className="text-[10px] font-mono font-bold text-[#6B7A99] uppercase tracking-wider block">Official Support Email</span>
              <p className="text-sm sm:text-base font-bold font-mono text-[#1E3063]">
                support@kayad.co.ke
              </p>
            </div>

            <p className="text-[11px] text-[#6B7A99] font-semibold flex items-center gap-1.5 pt-0.5">
              <Clock className="w-3.5 h-3.5 text-[#00C9CE] shrink-0" />
              <span>Formal Response Guarantee: Within 2 Hours</span>
            </p>
          </div>

          <a
            href="mailto:support@kayad.co.ke"
            className="relative z-10 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#F6F1E8] hover:bg-[#E2D8C7] text-[#1E3063] font-extrabold text-xs uppercase tracking-wider transition-all border border-[#E2D8C7]"
          >
            <span>Email Audit Desk</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#00C9CE]" />
          </a>
        </div>
      </div>

      {/* 3. Transaction FAQ Section */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#E2D8C7] shadow-sm space-y-6">
        <div className="space-y-1 pb-4 border-b border-[#E8E1D5]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1E3063]/10 text-[#1E3063] text-xs font-bold uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5 text-[#00C9CE]" />
            <span>Resolution & Knowledge Base</span>
          </div>
          <h2 className="text-2xl font-black text-[#1E3063] font-serif tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-[#6B7A99] font-medium">
            Clear guidelines on Escrow Vault security, vehicle inspection records, auction compliance, and legal transfers.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={index}
                className="rounded-xl border border-[#E2D8C7] bg-[#FCF9F4] overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-5 py-3.5 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-[#1E3063] hover:bg-[#F6F1E8] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 rounded bg-[#1E3063]/10 text-[#1E3063] text-[9px] font-black uppercase shrink-0">
                      {faq.category}
                    </span>
                    <span className="font-serif">{faq.q}</span>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-[#00C9CE] shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#6B7A99] shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-5 pb-4 pt-2 text-xs text-[#3D4F6F] font-medium leading-relaxed border-t border-[#E8E1D5] bg-white">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Form & Regional Office Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Direct Case Inquiry Form */}
        <div className="lg:col-span-7 p-6 sm:p-8 rounded-2xl bg-white border border-[#E2D8C7] shadow-sm space-y-6">
          <div className="space-y-1 pb-4 border-b border-[#E8E1D5]">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1E3063]/10 text-[#1E3063] text-xs font-bold uppercase tracking-wider">
              <Mail className="w-3.5 h-3.5 text-[#00C9CE]" />
              <span>Resolution Form</span>
            </div>
            <h2 className="text-2xl font-black text-[#1E3063] font-serif tracking-tight">
              Submit Transaction Case
            </h2>
            <p className="text-xs text-[#6B7A99] font-medium">
              Submit a formal inquiry or dispute request directly to our Resolution Desk.
            </p>
          </div>

          {formSuccessMsg ? (
            <div className="p-8 rounded-2xl bg-[#2ECC71]/15 text-[#1E3063] border border-[#2ECC71]/40 text-xs sm:text-sm font-bold text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-[#2ECC71] mx-auto" />
              <h3 className="text-lg font-extrabold font-serif text-[#1E3063]">Case Logged Successfully</h3>
              <p className="max-w-md mx-auto leading-relaxed">{formSuccessMsg}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitMessage} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1E3063] uppercase tracking-wider mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. John Mwangi"
                    className="w-full px-3.5 py-2.5 bg-[#FCF9F4] border border-[#E2D8C7] rounded-xl text-xs font-bold text-[#1E3063] focus:outline-none focus:bg-white focus:border-[#00C9CE] focus:ring-1 focus:ring-[#00C9CE]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1E3063] uppercase tracking-wider mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 bg-[#FCF9F4] border border-[#E2D8C7] rounded-xl text-xs font-bold text-[#1E3063] focus:outline-none focus:bg-white focus:border-[#00C9CE] focus:ring-1 focus:ring-[#00C9CE]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1E3063] uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+254 700 000 000"
                    className="w-full px-3.5 py-2.5 bg-[#FCF9F4] border border-[#E2D8C7] rounded-xl text-xs font-bold text-[#1E3063] focus:outline-none focus:bg-white focus:border-[#00C9CE] focus:ring-1 focus:ring-[#00C9CE]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1E3063] uppercase tracking-wider mb-1.5">
                    Escrow Contract / VIN (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.transactionId}
                    onChange={e => setFormData({ ...formData, transactionId: e.target.value })}
                    placeholder="e.g. ESC-88902 or VIN"
                    className="w-full px-3.5 py-2.5 bg-[#FCF9F4] border border-[#E2D8C7] rounded-xl text-xs font-bold text-[#1E3063] focus:outline-none focus:bg-white focus:border-[#00C9CE] focus:ring-1 focus:ring-[#00C9CE]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1E3063] uppercase tracking-wider mb-1.5">
                  Topic / Area of Support *
                </label>
                <select
                  required
                  value={formData.subject}
                  onChange={e => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#FCF9F4] border border-[#E2D8C7] rounded-xl text-xs font-bold text-[#1E3063] focus:outline-none focus:bg-white focus:border-[#00C9CE] focus:ring-1 focus:ring-[#00C9CE]"
                >
                  <option value="" disabled>Select inquiry topic…</option>
                  <option value="Escrow Vault Support">Escrow Vault Payment & Clearance</option>
                  <option value="Pre-Inspection">Vehicle Inspection Report Inquiry</option>
                  <option value="Auction Bidding">Auction Bidding & Deposit Policy</option>
                  <option value="Vehicle Listing">Vehicle Listing & Verification</option>
                  <option value="Dispute Resolution">Dispute & Handover Inspection Challenge</option>
                  <option value="General Inquiry">General Inquiry</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1E3063] uppercase tracking-wider mb-1.5">
                  Detailed Case Description *
                </label>
                <textarea
                  rows={4}
                  required
                  value={formData.message}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Provide transaction context, vehicle details, or specific question…"
                  className="w-full px-3.5 py-2.5 bg-[#FCF9F4] border border-[#E2D8C7] rounded-xl text-xs font-semibold text-[#1E3063] focus:outline-none focus:bg-white focus:border-[#00C9CE] focus:ring-1 focus:ring-[#00C9CE]"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                variant="primary"
                className="w-full sm:w-auto bg-[#1E3063] hover:bg-[#0B1628] text-white font-extrabold text-xs py-3 px-7 uppercase tracking-wider shadow-md cursor-pointer"
                leftIcon={<Send className="w-4 h-4 text-[#00C9CE]" />}
              >
                {isSubmitting ? 'Logging Case...' : 'Submit Resolution Case'}
              </Button>
            </form>
          )}
        </div>

        {/* Regional Resolution Center & Verification Office */}
        <div className="lg:col-span-5 p-6 sm:p-8 rounded-2xl bg-[#121D33] text-white border border-white/10 shadow-xl space-y-6">
          <div className="space-y-1 pb-4 border-b border-white/10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00C9CE]/20 text-[#00C9CE] text-xs font-extrabold uppercase tracking-wider border border-[#00C9CE]/30">
              <Building2 className="w-4 h-4 text-[#00C9CE]" />
              <span>Headquarters</span>
            </div>
            <h2 className="text-2xl font-black font-serif text-white">
              Regional Resolution Centre
            </h2>
            <p className="text-xs text-slate-300 font-medium">
              Physical verification desk for document signing & in-person escrow consultation.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
              <MapPin className="w-5 h-5 text-[#00C9CE] shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-extrabold text-slate-300 uppercase block">Office Location</span>
                <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">
                  Westgate Mall, Westlands, Nairobi — Ground Floor, Suite 12
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
              <Clock className="w-5 h-5 text-[#2ECC71] shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-extrabold text-slate-300 uppercase block">Operating Hours</span>
                <p className="text-xs sm:text-sm font-bold text-white">
                  Monday – Saturday: 9:00 AM – 5:00 PM EAT
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
              <ShieldCheck className="w-5 h-5 text-[#00C9CE] shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-extrabold text-slate-300 uppercase block">Verification Desk</span>
                <p className="text-xs text-slate-200 font-medium">
                  Physical logbook audits, digital title transfer witnessing & escrow document collection.
                </p>
              </div>
            </div>
          </div>

          <a
            href="https://maps.google.com/?q=Westgate+Mall+Nairobi"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-[#00C9CE] hover:bg-[#00b8bc] text-[#121D33] font-black text-xs uppercase tracking-wider transition-colors shadow-md cursor-pointer"
          >
            <span>Get Office Directions</span>
            <ArrowRight className="w-4 h-4 text-[#121D33]" />
          </a>
        </div>
      </div>

    </div>
  );
};
