import React, { useState } from 'react';
import { Modal, Input, Button } from './ui';
import { Sparkles } from 'lucide-react';
import { AuthApiError } from '../services/authApi';
import { useAuth } from '../context/AuthContext';
import OnboardingFlow from './OnboardingFlow';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin?: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login } = useAuth();
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async () => {
    setLoading(true); setError('');
    try { await login({ email: email.trim(), password }); onClose(); }
    catch (err) { setError(err instanceof AuthApiError ? err.message : 'Sign in failed. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth={mode === 'register' ? 'xl' : 'md'}>
      {mode === 'register' ? (
        <OnboardingFlow onClose={onClose} />
      ) : (
        <div className="p-5 sm:p-7">
          <div className="text-center space-y-1 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#1E3063] text-amber-400 font-extrabold text-xl flex items-center justify-center mx-auto mb-2 shadow-md">K</div>
            <h3 className="text-xl font-extrabold text-[#1E3063] font-display">Sign In to KAYAD</h3>
            <p className="text-xs text-slate-500">Continue to your role-specific workspace and secure marketplace tools.</p>
          </div>
          <div className="space-y-4 text-xs">
            <Input label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.co.ke" />
            <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-[11px] font-bold">{error}</div>}
            <Button variant="primary" size="lg" fullWidth disabled={loading} onClick={handleSignIn}><Sparkles className="w-4 h-4 text-amber-400" /><span>{loading ? 'Please wait...' : 'Sign In'}</span></Button>
            <button type="button" onClick={() => { setMode('register'); setError(''); }} className="w-full rounded-xl border border-slate-200 py-3 text-xs font-black text-[#1E3063] hover:bg-slate-50">Create a KAYAD account</button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default AuthModal;
