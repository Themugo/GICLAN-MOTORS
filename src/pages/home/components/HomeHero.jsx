import { Link } from 'react-router-dom';

export default function HomeHero({ liveCount, isAuth, user }) {
  return (
    <section className="relative overflow-hidden flex flex-col items-center justify-center text-center px-6 pb-4 pt-8 md:pt-12">
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(212,196,168,0.1) 0%, transparent 65%)' }} />
      <div className="flex items-center gap-3 mb-3 z-[1]">
        <div className="h-px w-7" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,196,168,0.4))' }} />
        <span className="text-gold text-[9px] font-extrabold tracking-[0.16em] uppercase">Kenya's Premium Car Marketplace</span>
        <div className="h-px w-7" style={{ background: 'linear-gradient(90deg, rgba(212,196,168,0.4), transparent)' }} />
      </div>

      {liveCount > 0 && (
        <div className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-full px-2.5 py-1 mb-2 z-[1]">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 block animate-pulse" />
          <span className="text-[9px] text-red-500 font-bold tracking-[0.08em] uppercase">{liveCount} Live Auction{liveCount !== 1 ? 's' : ''} — Bid Now</span>
        </div>
      )}

      <h1 className="font-display font-black italic text-[clamp(1.6rem,3.8vw,2.8rem)] leading-none uppercase text-white mb-2 tracking-[-0.01em] z-[1]">
        Drive Your{' '}
        <span className="text-gold" style={{ textShadow: '0 0 30px rgba(212,196,168,0.28)' }}>Dream Today</span>
      </h1>

      <p className="text-white/55 text-xs md:text-sm max-w-[460px] mx-auto mb-4 leading-relaxed z-[1] font-normal">
        Live auctions, verified dealers, and M-Pesa secured escrow — East Africa's most sophisticated automotive marketplace.
      </p>

      <div className="flex gap-2 justify-center flex-wrap z-[1]">
        <Link to="/showroom" className="home-hero-primary-btn px-7 py-2.5 rounded-full font-black text-[10px] uppercase tracking-[0.1em] text-black no-underline inline-block transition-all duration-300"
        >Enter The Gallery</Link>
        <Link to="/auctions/calendar" className="home-hero-secondary-btn px-7 py-2.5 rounded-full font-semibold text-[10px] uppercase tracking-[0.1em] text-white/75 no-underline inline-block transition-all duration-300 border border-white/14"
        >Live Auctions</Link>
      </div>

      {isAuth && (
        <div className="mt-3 text-[10px] text-white/18 z-[1]">
          Welcome back, <strong className="text-white/60">{user?.name?.split(' ')[0] || user?.email}</strong>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none" style={{ background: 'linear-gradient(transparent, var(--bg))' }} />
    </section>
  );
}
