import { useState, type FC, type FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, User, Building2, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

type UserRole = 'buyer' | 'dealer' | 'ghost_checker' | 'admin';

interface UserProfile {
  name: string;
  email: string;
  role: UserRole;
  verified: boolean;
  imageUrl?: string;
}

export const AuthModal: FC = () => {
  const { login } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('buyer');
  const [companyName, setCompanyName] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    login({ email, password });
    setEmail('');
    setPassword('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      maxWidth="md"
    >
      <div className="space-y-5 p-1">
        
        {/* Header Banner */}
        <div className="text-center space-y-2 pb-2 border-b border-[#E8E1D5]">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1E3063] text-[#00C9CE] text-[11px] font-mono font-black uppercase tracking-widest border border-[#00C9CE]/40">
            <Sparkles className="w-3.5 h-3.5 text-[#00C9CE]" />
            <span>KAYAD Secure Access</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#1E3063] tracking-tight">
            {isSignUp ? 'Create Your Account' : 'Welcome Back'}
          </h2>

          <p className="text-xs sm:text-sm text-[#6B7A99] font-medium max-w-sm mx-auto">
            Access your verified escrow contracts, bids, saved vehicles, and dealer dashboard.
          </p>
        </div>

        {/* Tab Toggle: Sign In vs Create Account */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#FCF9F4] border border-[#E2D8C7]">
          <button
            type="button"
            onClick={() => setIsSignUp(false)}
            className={`py-2 text-xs font-mono font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
              !isSignUp
                ? 'bg-[#1E3063] text-white shadow-md'
                : 'text-[#6B7A99] hover:text-[#1E3063]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setIsSignUp(true)}
            className={`py-2 text-xs font-mono font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
              isSignUp
                ? 'bg-[#1E3063] text-white shadow-md'
                : 'text-[#6B7A99] hover:text-[#1E3063]'
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role Selector */}
          <div>
            <label className="block text-[11px] font-mono font-black uppercase tracking-wider text-[#1E3063] mb-2">
              Select Account Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'buyer', label: 'Buyer', icon: <User className="w-4 h-4" /> },
                { id: 'dealer', label: 'Dealer', icon: <Building2 className="w-4 h-4" /> },
                { id: 'seller', label: 'Seller', icon: <ShieldCheck className="w-4 h-4" /> },
              ].map(role => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRole(role.id as UserRole)}
                  className={`p-2.5 rounded-xl border text-xs font-mono font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    selectedRole === role.id
                      ? 'border-[#1E3063] bg-[#1E3063] text-[#00C9CE] shadow-md'
                      : 'border-[#E2D8C7] text-[#6B7A99] hover:border-[#1E3063] hover:text-[#1E3063] bg-[#FCF9F4]'
                  }`}
                >
                  {role.icon}
                  <span>{role.label}</span>
                </button>
              ))}
            </div>
          </div>

          {selectedRole === 'dealer' && isSignUp && (
            <Input
              label="Dealership Name"
              placeholder="e.g. Apex Luxury Motors"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              leftIcon={<Building2 className="w-4 h-4 text-[#00C9CE]" />}
            />
          )}

          <Input
            label="Email Address"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4 text-[#00C9CE]" />}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4 text-[#00C9CE]" />}
            required
          />

          <div className="pt-2">
            <Button 
              type="submit" 
              variant="primary" 
              className="w-full bg-[#1E3063] hover:bg-[#0B1628] text-white font-mono font-black text-xs py-3 uppercase tracking-wider rounded-2xl shadow-lg" 
              size="lg" 
              rightIcon={<ArrowRight className="w-4 h-4 text-[#00C9CE]" />}
            >
              {isSignUp ? 'Register Account' : 'Sign In to KAYAD'}
            </Button>
          </div>

          <div className="text-center pt-2 border-t border-[#EDE5D8]">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs font-mono font-bold text-[#1E3063] hover:text-[#00C9CE] transition-colors cursor-pointer"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one now"}
            </button>
          </div>
        </form>

      </div>
    </Modal>
  );
};

