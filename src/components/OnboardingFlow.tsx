import React, { useMemo, useState } from 'react';
import { Building2, Car, CheckCircle2, ChevronLeft, ChevronRight, Clock3, ShieldCheck, UserRound, Wrench } from 'lucide-react';
import { AuthApiError } from '../services/authApi';
import { useAuth } from '../context/AuthContext';
import { inspectorAPI } from '../api/api';

type OnboardingRole = 'buyer' | 'individual_seller' | 'dealer' | 'inspector';

type Props = {
  onComplete?: (user: any) => void;
  onClose?: () => void;
};

const ROLE_OPTIONS: Array<{ id: OnboardingRole; title: string; description: string; icon: React.ElementType; tone: string }> = [
  { id: 'buyer', title: 'Buyer', description: 'Browse, save, compare, bid and purchase securely.', icon: UserRound, tone: 'blue' },
  { id: 'individual_seller', title: 'Private Seller', description: 'Sell your own vehicle with a guided listing and verification path.', icon: Car, tone: 'emerald' },
  { id: 'dealer', title: 'Dealer', description: 'Operate a verified dealership, inventory and commercial dashboard.', icon: Building2, tone: 'amber' },
  { id: 'inspector', title: 'Inspector', description: 'Apply to join the KAYAD certified inspection network.', icon: Wrench, tone: 'violet' },
];

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-[#1E3063] focus:ring-2 focus:ring-[#1E3063]/10';

export default function OnboardingFlow({ onComplete, onClose }: Props) {
  const { register: authRegister } = useAuth();
  const [role, setRole] = useState<OnboardingRole>('buyer');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [complete, setComplete] = useState<{ kind: 'account' | 'application'; user?: any } | null>(null);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', businessName: '', location: '',
    idNumber: '', yearsOfExperience: '', specialties: '', preferredRegions: '', toolsAvailable: '',
  });

  const selected = useMemo(() => ROLE_OPTIONS.find((r) => r.id === role)!, [role]);
  const isSeller = role === 'dealer' || role === 'individual_seller';

  const set = (key: keyof typeof form, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const submitAccount = async () => {
    setLoading(true); setError('');
    try {
      if (role === 'inspector') {
        const specialties = form.specialties.split(',').map((x) => x.trim()).filter(Boolean);
        const preferredRegions = form.preferredRegions.split(',').map((x) => x.trim()).filter(Boolean);
        if (specialties.length === 0) throw new Error('Add at least one inspection specialty.');
        await inspectorAPI.apply({
          fullName: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), idNumber: form.idNumber.trim(),
          location: form.location.trim(), yearsOfExperience: Number(form.yearsOfExperience), specialties, preferredRegions,
          toolsAvailable: form.toolsAvailable.trim(),
        });
        setComplete({ kind: 'application' });
        return;
      }
      const user = await authRegister({
        name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), password: form.password,
        role, businessName: isSeller ? form.businessName.trim() : undefined, location: isSeller ? form.location.trim() : undefined,
      });
      setComplete({ kind: 'account', user });
      onComplete?.(user);
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : err instanceof Error ? err.message : 'Unable to complete onboarding. Please try again.');
    } finally { setLoading(false); }
  };

  if (complete) {
    const pending = complete.kind === 'application' || isSeller;
    return (
      <div className="min-h-[560px] flex items-center justify-center p-6">
        <div className="w-full max-w-xl text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200"><CheckCircle2 size={34} /></div>
          <h2 className="text-2xl font-black text-[#17244B]">{complete.kind === 'application' ? 'Inspector application received' : pending ? 'Application submitted' : 'Welcome to KAYAD'}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
            {complete.kind === 'application'
              ? 'Your inspector credentials are now in the KAYAD review queue. The platform will notify you when your application is reviewed.'
              : pending
                ? 'Your account is created and your seller application is pending verification. You can sign in and track the onboarding status.'
                : 'Your buyer account is ready. You can now browse vehicles, save listings, compare cars and continue into secure transaction workflows.'}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <button onClick={onClose} className="rounded-xl bg-[#17244B] px-5 py-3 text-sm font-bold text-white">Continue to KAYAD</button>
            {pending && <span className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800"><Clock3 size={15} /> Verification pending</span>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-7">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">KAYAD onboarding</p><h2 className="mt-1 text-2xl font-black text-[#17244B]">Set up the right account</h2><p className="mt-1 text-xs text-slate-500">One onboarding path, with the correct registration and verification route for each platform category.</p></div>
        {onClose && <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close">×</button>}
      </div>
      <div className="mb-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400"><span className={step >= 1 ? 'text-[#17244B]' : ''}>1. Account type</span><span className="h-px flex-1 bg-slate-200"/><span className={step >= 2 ? 'text-[#17244B]' : ''}>2. Details</span><span className="h-px flex-1 bg-slate-200"/><span>3. Complete</span></div>

      {step === 1 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {ROLE_OPTIONS.map((option) => {
            const Icon = option.icon; const active = role === option.id;
            return <button key={option.id} onClick={() => { setRole(option.id); setError(''); }} className={`rounded-2xl border p-4 text-left transition ${active ? 'border-[#17244B] bg-[#17244B] text-white shadow-lg' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${active ? 'bg-white/10 text-amber-300' : 'bg-slate-100 text-[#17244B]'}`}><Icon size={20}/></div>
              <div className="text-sm font-black">{option.title}</div><div className={`mt-1 text-xs leading-5 ${active ? 'text-slate-300' : 'text-slate-500'}`}>{option.description}</div>
            </button>;
          })}
          <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500"><ShieldCheck className="mr-2 inline h-4 w-4 text-emerald-600"/>Platform staff accounts are invitation/admin managed and are not exposed as public self-registration roles.</div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-50 p-4"><div className="text-sm font-black text-[#17244B]">{selected.title}</div><div className="mt-1 text-xs text-slate-500">{selected.description}</div></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-600">Full name<input className={inputClass} value={form.name} onChange={e=>set('name',e.target.value)} autoComplete="name" required /></label>
            <label className="text-xs font-bold text-slate-600">Email<input className={inputClass} type="email" value={form.email} onChange={e=>set('email',e.target.value)} autoComplete="email" required /></label>
            <label className="text-xs font-bold text-slate-600">Phone<input className={inputClass} value={form.phone} onChange={e=>set('phone',e.target.value)} autoComplete="tel" required /></label>
            {role !== 'inspector' && <label className="text-xs font-bold text-slate-600">Password<input className={inputClass} type="password" value={form.password} onChange={e=>set('password',e.target.value)} autoComplete="new-password" required /></label>}
            {isSeller && <>
              <label className="text-xs font-bold text-slate-600">{role === 'dealer' ? 'Business name' : 'Trading name (optional)'}<input className={inputClass} value={form.businessName} onChange={e=>set('businessName',e.target.value)} required={role==='dealer'} /></label>
              <label className="text-xs font-bold text-slate-600">Location / city<input className={inputClass} value={form.location} onChange={e=>set('location',e.target.value)} required={role==='dealer'} /></label>
            </>}
            {role === 'inspector' && <>
              <label className="text-xs font-bold text-slate-600">ID / Passport<input className={inputClass} value={form.idNumber} onChange={e=>set('idNumber',e.target.value)} required /></label>
              <label className="text-xs font-bold text-slate-600">Location<input className={inputClass} value={form.location} onChange={e=>set('location',e.target.value)} required /></label>
              <label className="text-xs font-bold text-slate-600">Years of experience<input className={inputClass} type="number" min="0" max="60" value={form.yearsOfExperience} onChange={e=>set('yearsOfExperience',e.target.value)} required /></label>
              <label className="text-xs font-bold text-slate-600">Specialties (comma separated)<input className={inputClass} value={form.specialties} onChange={e=>set('specialties',e.target.value)} placeholder="Engine, brakes, TIMS" required /></label>
              <label className="text-xs font-bold text-slate-600 sm:col-span-2">Preferred regions<input className={inputClass} value={form.preferredRegions} onChange={e=>set('preferredRegions',e.target.value)} placeholder="Nairobi, Kiambu" /></label>
              <label className="text-xs font-bold text-slate-600 sm:col-span-2">Tools / equipment<input className={inputClass} value={form.toolsAvailable} onChange={e=>set('toolsAvailable',e.target.value)} /></label>
            </>}
          </div>
          {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</div>}
        </div>
      )}

      <div className="mt-7 flex items-center justify-between gap-3">
        <button disabled={step===1 || loading} onClick={()=>setStep(1)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 disabled:opacity-40"><ChevronLeft size={15}/> Back</button>
        {step === 1 ? <button onClick={()=>setStep(2)} className="inline-flex items-center gap-1 rounded-xl bg-[#17244B] px-5 py-2.5 text-xs font-bold text-white">Continue <ChevronRight size={15}/></button> : <button disabled={loading} onClick={submitAccount} className="rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-black text-[#17244B] disabled:opacity-50">{loading ? 'Submitting…' : role === 'inspector' ? 'Submit Inspector Application' : 'Create Account'}</button>}
      </div>
    </div>
  );
}
