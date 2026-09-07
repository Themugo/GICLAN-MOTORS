import React, { useEffect, useState } from 'react';
import { getVisibleAdSlots, recordAdEvent, AdSlot, AdPlacement } from '../services/adApi';

interface FloatingAdRailProps {
  placement: Extract<AdPlacement, 'left_rail' | 'right_rail'>;
}

/**
 * A real, backend-driven vertical ad rail, sticky within the page's
 * own scroll so it stays visible without ever overlapping or pushing
 * the vehicle grid - it renders as its own column, never an overlay.
 * Renders nothing at all when there are zero real, visible entries
 * for this placement, so an empty rail never reserves visible space
 * for nothing.
 */
export const FloatingAdRail: React.FC<FloatingAdRailProps> = ({ placement }) => {
  const [slots, setSlots] = useState<AdSlot[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getVisibleAdSlots(placement)
      .then((data) => { if (!cancelled) { setSlots(data); data.forEach((slot) => { void recordAdEvent(slot.id, 'impression').catch(() => undefined); }); } })
      .catch(() => { /* a failed ad fetch should never block the real page around it */ })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [placement]);

  if (!loaded || slots.length === 0) return null;

  return (
    <div className="hidden xl:flex flex-col gap-4 w-44 shrink-0 sticky top-20 self-start">
      {slots.map((slot) => (
        <a
          key={slot.id}
          href={slot.buttonUrl || undefined}
          onClick={() => { if (slot.buttonUrl) void recordAdEvent(slot.id, 'click').catch(() => undefined); }}
          className="rounded-2xl p-4 flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow"
          style={{
            backgroundColor: slot.backgroundColor,
            color: slot.textColor,
            opacity: slot.opacity / 100,
          }}
        >
          <span className="text-[9px] font-bold uppercase tracking-widest opacity-70">Advertisement</span>
          <h4 className="text-sm font-bold leading-snug">{slot.title}</h4>
          {slot.tagline && <p className="text-[11px] opacity-85 leading-snug">{slot.tagline}</p>}
          {slot.priceTag && <p className="text-[11px] font-bold mt-1">{slot.priceTag}</p>}
          {slot.buttonText && (
            <span className="text-[11px] font-bold underline underline-offset-2 mt-1">{slot.buttonText}</span>
          )}
        </a>
      ))}
    </div>
  );
};

export default FloatingAdRail;
