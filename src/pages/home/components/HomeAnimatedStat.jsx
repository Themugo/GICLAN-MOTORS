import { useState, useEffect, useRef, useCallback } from 'react';

export default function HomeAnimatedStat({ value, label }) {
  const [display, setDisplay] = useState('0');
  const ref = useRef(null);
  const hasAnimated = useRef(false);

  const animateValue = useCallback(() => {
    const target = typeof value === 'string' ? parseInt(value.replace(/[^0-9]/g, '')) || 0 : (value || 0);
    const suffix = typeof value === 'string' ? value.replace(/[0-9]/g, '') : '';
    let start = 0;
    const dur = Math.min(1200, target * 8);
    const step = Math.max(1, Math.floor(target / 30));
    const iv = setInterval(() => {
      start += step;
      if (start >= target) { start = target; clearInterval(iv); }
      setDisplay(start.toLocaleString() + suffix);
    }, dur / (target / step || 1));
  }, [value]);

  useEffect(() => {
    const el = ref.current;
    if (!el || hasAnimated.current) return;

    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !hasAnimated.current) {
        hasAnimated.current = true;
        animateValue();
        obs.disconnect();
      }
    }, { threshold: 0.5 });

    obs.observe(el);
    return () => obs.disconnect();
  }, [animateValue]);

  return (
    <div ref={ref} className="text-center py-3.5 px-2.5" style={{ background: 'var(--bg)' }}>
      <div className="font-display text-[1.35rem] font-black italic leading-none text-gold">{display}</div>
      <div className="text-[8px] text-white/25 font-bold uppercase tracking-[0.14em] mt-1">{label}</div>
    </div>
  );
}
