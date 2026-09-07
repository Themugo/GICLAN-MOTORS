import { useState } from 'react';
import {
  User, Building2, CheckCircle, ArrowRight, Shield, Tag, Phone, Mail,
  Lock, Eye, EyeOff, MapPin, ChevronLeft,
} from 'lucide-react';

type AccountType = 'private-seller' | 'dealer' | null;
type Step = 1 | 2;

interface AuthUser {
  name: string;
  email: string;
  role: 'private-seller' | 'dealer' | 'admin';
  dealership?: string;
}

interface CreateAccountProps {
  setPage: (page: string) => void;
  onLogin: (user: AuthUser) => void;
}

const PRIVATE_PERKS = [
  'List up to 3 vehicles',
  'M-Pesa escrow on every sale',
  'Free KAYAD certification badge',
  'Direct buyer messaging',
];

const DEALER_PERKS = [
  'Unlimited vehicle listings',
  'Dedicated dealer dashboard',
  'Priority search placement',
  'Bulk upload & management tools',
  'Monthly analytics report',
  'Dedicated account manager',
];

export default function CreateAccount({ setPage, onLogin }: CreateAccountProps) {
  const [step,        setStep]        = useState<Step>(1);
  const [accountType, setAccountType] = useState<AccountType>(null);
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);

  const [form, setForm] = useState({
    firstName:   '',
    lastName:    '',
    email:       '',
    phone:       '',
    dealership:  '',
    location:    '',
    password:    '',
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Mock account creation
    setTimeout(() => {
      onLogin({
        name:       `${form.firstName} ${form.lastName}`.trim() || 'New Member',
        email:      form.email,
        role:       accountType!,
        dealership: accountType === 'dealer' ? form.dealership : undefined,
      });
      setPage('dashboard');
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-cream-50 pt-16">

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <div className="relative bg-charcoal-900 pt-14 pb-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-2/3 bg-gold-400/8 blur-3xl rounded-full" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="section-label text-gold-400 mb-4">START SELLING ON KAYAD</p>
          <h1 className="font-serif text-2xl sm:text-4xl md:text-5xl text-white font-bold mb-3">
            Create Your Account
          </h1>
          <p className="font-sans text-white/50 text-base">
            Join thousands of sellers reaching verified buyers across Kenya.
          </p>
        </div>
      </div>

      {/* ── STEP INDICATOR ───────────────────────────────────────── */}
      <div className="bg-charcoal-800 border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          {[
            { n: 1, label: 'Choose Account Type' },
            { n: 2, label: 'Your Details' },
          ].map(({ n, label }, idx) => (
            <div key={n} className="flex items-center gap-2">
              {idx > 0 && <div className="w-8 h-px bg-white/20 mx-1" />}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-sans transition-all ${
                step >= n ? 'bg-gold-600 text-white' : 'bg-white/10 text-white/30'
              }`}>{n}</div>
              <span className={`font-sans text-xs font-medium transition-colors ${
                step >= n ? 'text-white' : 'text-white/30'
              }`}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── BODY ─────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* ── STEP 1: Account type ── */}
        {step === 1 && (
          <div>
            <h2 className="font-serif text-2xl text-charcoal-900 font-bold mb-2 text-center">
              How would you like to sell?
            </h2>
            <p className="font-sans text-sm text-warm-400 text-center mb-8">
              Choose the account type that fits your needs.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

              {/* Private Seller */}
              <button
                onClick={() => setAccountType('private-seller')}
                className={`group text-left p-6 rounded-2xl border-2 transition-all duration-200 ${
                  accountType === 'private-seller'
                    ? 'border-gold-500 bg-gold-500/5 shadow-md'
                    : 'border-cream-200 bg-white hover:border-gold-400/50 hover:shadow-md'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${
                  accountType === 'private-seller' ? 'bg-gold-600 text-white' : 'bg-charcoal-900 text-white group-hover:bg-gold-600'
                }`}>
                  <User size={22} />
                </div>
                <h3 className="font-serif text-xl text-charcoal-900 font-bold mb-1">Private Seller</h3>
                <p className="font-sans text-xs text-warm-400 mb-4 leading-relaxed">
                  Sell your personal vehicle quickly and safely. No business registration required.
                </p>
                <ul className="space-y-2">
                  {PRIVATE_PERKS.map(p => (
                    <li key={p} className="flex items-center gap-2">
                      <CheckCircle size={13} className="text-gold-500 flex-shrink-0" />
                      <span className="font-sans text-xs text-warm-600">{p}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 font-sans text-xs font-bold text-gold-700">Free · No monthly fees</p>
              </button>

              {/* Verified Dealer */}
              <button
                onClick={() => setAccountType('dealer')}
                className={`group text-left p-6 rounded-2xl border-2 transition-all duration-200 relative ${
                  accountType === 'dealer'
                    ? 'border-gold-500 bg-gold-500/5 shadow-md'
                    : 'border-cream-200 bg-white hover:border-gold-400/50 hover:shadow-md'
                }`}
              >
                <span className="absolute top-4 right-4 bg-charcoal-900 text-gold-400 font-sans text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">
                  Popular
                </span>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${
                  accountType === 'dealer' ? 'bg-gold-600 text-white' : 'bg-charcoal-900 text-white group-hover:bg-gold-600'
                }`}>
                  <Building2 size={22} />
                </div>
                <h3 className="font-serif text-xl text-charcoal-900 font-bold mb-1">Verified Dealer</h3>
                <p className="font-sans text-xs text-warm-400 mb-4 leading-relaxed">
                  List your entire inventory. Get verified status and reach serious buyers.
                </p>
                <ul className="space-y-2">
                  {DEALER_PERKS.map(p => (
                    <li key={p} className="flex items-center gap-2">
                      <CheckCircle size={13} className="text-gold-500 flex-shrink-0" />
                      <span className="font-sans text-xs text-warm-600">{p}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 font-sans text-xs font-bold text-gold-700">From KES 2,500/month</p>
              </button>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={() => setPage('sign-in')}
                className="font-sans text-sm text-warm-400 hover:text-charcoal-900 transition-colors"
              >
                Already have an account? <span className="text-gold-700 font-semibold">Sign In</span>
              </button>
              <button
                disabled={!accountType}
                onClick={() => setStep(2)}
                className={`flex items-center gap-2 font-sans font-semibold text-sm px-7 py-3 rounded-full transition-all ${
                  accountType
                    ? 'bg-gold-600 text-white hover:bg-gold-700'
                    : 'bg-cream-200 text-warm-400 cursor-not-allowed'
                }`}
              >
                Continue <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Registration form ── */}
        {step === 2 && (
          <div>
            <div className="flex items-center gap-3 mb-8">
              <button
                onClick={() => setStep(1)}
                className="w-8 h-8 rounded-lg bg-white border border-cream-200 flex items-center justify-center text-warm-500 hover:text-charcoal-900 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <div>
                <p className="font-sans text-xs text-warm-400 flex items-center gap-1.5">
                  {accountType === 'dealer'
                    ? <><Building2 size={11} /> Verified Dealer Account</>
                    : <><User size={11} /> Private Seller Account</>}
                </p>
                <h2 className="font-serif text-2xl text-charcoal-900 font-bold">Your Details</h2>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-cream-200 p-8 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-sans text-xs font-semibold text-warm-500 uppercase tracking-wide mb-1.5">First Name</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400" />
                    <input
                      required value={form.firstName} onChange={set('firstName')}
                      placeholder="John"
                      className="w-full pl-9 pr-4 py-3 border border-cream-300 rounded-xl font-sans text-sm text-charcoal-800 placeholder-warm-300 outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-sans text-xs font-semibold text-warm-500 uppercase tracking-wide mb-1.5">Last Name</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400" />
                    <input
                      required value={form.lastName} onChange={set('lastName')}
                      placeholder="Kamau"
                      className="w-full pl-9 pr-4 py-3 border border-cream-300 rounded-xl font-sans text-sm text-charcoal-800 placeholder-warm-300 outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-sans text-xs font-semibold text-warm-500 uppercase tracking-wide mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400" />
                  <input
                    required type="email" value={form.email} onChange={set('email')}
                    placeholder="john@example.com"
                    className="w-full pl-9 pr-4 py-3 border border-cream-300 rounded-xl font-sans text-sm text-charcoal-800 placeholder-warm-300 outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block font-sans text-xs font-semibold text-warm-500 uppercase tracking-wide mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400" />
                  <input
                    required value={form.phone} onChange={set('phone')}
                    placeholder="+254 712 345 678"
                    className="w-full pl-9 pr-4 py-3 border border-cream-300 rounded-xl font-sans text-sm text-charcoal-800 placeholder-warm-300 outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Dealer-specific fields */}
              {accountType === 'dealer' && (
                <>
                  <div className="pt-2 border-t border-cream-100">
                    <p className="font-sans text-xs font-semibold text-gold-600 uppercase tracking-widest mb-4">Dealership Information</p>
                  </div>
                  <div>
                    <label className="block font-sans text-xs font-semibold text-warm-500 uppercase tracking-wide mb-1.5">Dealership Name</label>
                    <div className="relative">
                      <Building2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400" />
                      <input
                        required value={form.dealership} onChange={set('dealership')}
                        placeholder="Prestige Motors Kenya"
                        className="w-full pl-9 pr-4 py-3 border border-cream-300 rounded-xl font-sans text-sm text-charcoal-800 placeholder-warm-300 outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-sans text-xs font-semibold text-warm-500 uppercase tracking-wide mb-1.5">Location</label>
                    <div className="relative">
                      <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400" />
                      <input
                        required value={form.location} onChange={set('location')}
                        placeholder="Westlands, Nairobi"
                        className="w-full pl-9 pr-4 py-3 border border-cream-300 rounded-xl font-sans text-sm text-charcoal-800 placeholder-warm-300 outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20 transition-all"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block font-sans text-xs font-semibold text-warm-500 uppercase tracking-wide mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400" />
                  <input
                    required type={showPass ? 'text' : 'password'}
                    value={form.password} onChange={set('password')}
                    placeholder="Min. 8 characters"
                    className="w-full pl-9 pr-10 py-3 border border-cream-300 rounded-xl font-sans text-sm text-charcoal-800 placeholder-warm-300 outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20 transition-all"
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600 transition-colors">
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Trust row */}
              <div className="flex flex-wrap items-center gap-4 pt-2 text-warm-400">
                <span className="flex items-center gap-1.5 font-sans text-xs"><Shield size={12} className="text-gold-500" /> Secure & Encrypted</span>
                <span className="flex items-center gap-1.5 font-sans text-xs"><Tag size={12} className="text-gold-500" /> No spam ever</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gold-600 hover:bg-gold-700 disabled:bg-gold-600/50 text-white font-sans font-bold py-3.5 rounded-full transition-all text-sm"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Creating Account…
                  </span>
                ) : (
                  <>Create Account <ArrowRight size={15} /></>
                )}
              </button>

              <p className="font-sans text-xs text-warm-400 text-center">
                By creating an account you agree to KAYAD's{' '}
                <span className="text-gold-700 cursor-pointer hover:underline">Terms of Service</span> and{' '}
                <span className="text-gold-700 cursor-pointer hover:underline">Privacy Policy</span>.
              </p>
            </form>

            <p className="text-center mt-6 font-sans text-sm text-warm-400">
              Already have an account?{' '}
              <button onClick={() => setPage('sign-in')} className="text-gold-700 font-semibold hover:text-gold-600 transition-colors">
                Sign In
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
