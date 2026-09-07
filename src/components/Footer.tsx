interface FooterProps {
  setPage?: (page: string) => void;
}

export default function Footer({ setPage }: FooterProps) {
  const nav = (page: string) => {
    setPage?.(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-charcoal-950 text-white/60 border-t-2 border-gold-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <button onClick={() => nav('home')} className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-gold-600 rounded-lg flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 13l2-6h14l2 6" />
                  <path d="M1 17h22" />
                  <circle cx="7" cy="17" r="2" />
                  <circle cx="17" cy="17" r="2" />
                </svg>
              </div>
              <span className="text-gold-400 font-sans font-bold tracking-[0.15em] uppercase">KAYAD</span>
            </button>
            <p className="font-sans text-sm text-white/40 leading-relaxed">
              Kenya's premium car marketplace. Buy, sell, and auction vehicles with M-Pesa escrow protection.
            </p>
          </div>

          {/* Marketplace */}
          <div>
            <h4 className="text-gold-400 font-sans font-semibold text-sm mb-4 tracking-wide">Marketplace</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Browse Cars', page: 'gallery' },
                { label: 'Live Auctions', page: 'auction' },
                { label: 'Sell Your Car', page: 'gallery' },
                { label: 'Escrow Vault', page: 'escrow' },
              ].map(({ label, page }) => (
                <li key={label}>
                  <button onClick={() => nav(page)} className="font-sans text-sm text-white/40 hover:text-gold-400 transition-colors duration-200">
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-gold-400 font-sans font-semibold text-sm mb-4 tracking-wide">Services</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Pre-Inspection', page: 'pre-inspection' },
                { label: 'Car Financing', page: 'support' },
                { label: 'Insurance', page: 'support' },
                { label: 'Become a Dealer', page: 'support' },
              ].map(({ label, page }) => (
                <li key={label}>
                  <button onClick={() => nav(page)} className="font-sans text-sm text-white/40 hover:text-gold-400 transition-colors duration-200">
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-gold-400 font-sans font-semibold text-sm mb-4 tracking-wide">Company</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'About KAYAD', page: 'home' },
                { label: 'How It Works', page: 'home' },
                { label: 'Support', page: 'support' },
                { label: 'Contact', page: 'support' },
              ].map(({ label, page }) => (
                <li key={label}>
                  <button onClick={() => nav(page)} className="font-sans text-sm text-white/40 hover:text-gold-400 transition-colors duration-200">
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gold-700/30 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-sans text-xs text-white/30">
            &copy; {new Date().getFullYear()} KAYAD Motors Kenya Ltd. All rights reserved.
          </p>
          <div className="flex gap-5">
            {['Privacy Policy', 'Terms of Service', 'Support'].map(item => (
              <button key={item} className="font-sans text-xs text-white/30 hover:text-gold-400 transition-colors duration-200">
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
