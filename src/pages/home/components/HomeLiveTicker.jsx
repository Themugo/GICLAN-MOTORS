import { useRef, useEffect } from 'react';

export default function HomeLiveTicker({ count }) {
  const scrollRef = useRef(null);
  const rafRef = useRef(null);
  const posRef = useRef(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const speed = 0.3;
    let last = performance.now();
    const tick = (now) => {
      const dt = now - last;
      last = now;
      posRef.current += speed * (dt / 16);
      const half = el.scrollWidth / 2;
      if (posRef.current >= half) posRef.current = 0;
      el.style.transform = `translate3d(${-posRef.current}px, 0, 0)`;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const isLive = count > 0;
  const label = isLive
    ? `⚡ ${count} ${count === 1 ? 'CAR' : 'CARS'} LIVE NOW — BIDDING OPEN`
    : 'PREVIEW — SAMPLE DATA — BROWSE THE GALLERY BELOW';

  const bgGrad = isLive
    ? 'linear-gradient(90deg, rgba(212,196,168,0.08), rgba(212,196,168,0.03))'
    : 'linear-gradient(90deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))';
  const dotColor = isLive ? '#ef4444' : 'var(--gold)';
  const borderStyle = isLive
    ? '1px solid rgba(212,196,168,0.12)'
    : '1px solid rgba(255,255,255,0.04)';

  const item = (key) => (
    <span key={key} className="inline-flex items-center gap-1.5 shrink-0">
      <span className="w-1 h-1 rounded-full block shrink-0" style={{ background: dotColor, animation: isLive ? 'pulse 1.5s infinite' : 'none' }} />
      <span className="text-[10px] text-white/55 font-bold tracking-[0.04em] whitespace-nowrap">{label}</span>
      <span className="shrink-0" style={{ color: isLive ? 'var(--gold)' : 'rgba(255,255,255,0.15)' }}>&#9670;</span>
    </span>
  );

  return (
    <div className="overflow-hidden relative z-[1]" style={{ background: bgGrad, borderTop: borderStyle, borderBottom: borderStyle }}>
      <div ref={scrollRef} className="flex items-center shrink-0" style={{ width: 'max-content', willChange: 'transform', backfaceVisibility: 'hidden' }}>
        {Array.from({ length: 16 }).map((_, i) => item(`a-${i}`))}
        {Array.from({ length: 16 }).map((_, i) => item(`b-${i}`))}
      </div>
    </div>
  );
}
