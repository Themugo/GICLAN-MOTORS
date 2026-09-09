import React from 'react';
import { useNavigate } from 'react-router-dom';
import OnboardingFlow from '../components/OnboardingFlow';

export default function RegisterPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#F6F1E8] flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded-3xl bg-white border border-slate-200 shadow-xl overflow-hidden">
        <OnboardingFlow onClose={() => navigate('/')} />
      </div>
    </div>
  );
}
