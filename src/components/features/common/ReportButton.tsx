import { useState, useRef, useEffect } from 'react';
import { Flag } from 'lucide-react';

const REPORT_REASONS = [
  { value: 'fake_listing', label: 'Fake Listing' },
  { value: 'scam', label: 'Scam / Fraud' },
  { value: 'misleading_photos', label: 'Misleading Photos' },
  { value: 'wrong_info', label: 'Wrong Information' },
  { value: 'duplicate', label: 'Duplicate Listing' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Other' },
];

interface ReportButtonProps {
  targetType: 'listing' | 'dealer' | 'review';
  targetId: string;
  onReported?: () => void;
}

export default function ReportButton({ targetType, targetId, onReported }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!reason) return;

    setSubmitting(true);
    try {
      // API call would go here
      // await reportAPI.submit({ targetType, targetId, category: reason, description });

      // Simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      setDone(true);
      onReported?.();
      setTimeout(() => {
        setOpen(false);
        setDone(false);
        setReason('');
        setDescription('');
      }, 2000);
    } catch (e) {
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-warm-400 hover:text-warm-600 transition-colors"
        title="Report"
      >
        <Flag size={12} />
        <span>Report</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 bg-white border border-cream-200 rounded-xl shadow-xl overflow-hidden">
          {done ? (
            <div className="p-4 text-center">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-emerald-500 text-xl">✓</span>
              </div>
              <p className="font-sans text-sm font-semibold text-charcoal-900">Report submitted</p>
              <p className="font-sans text-xs text-warm-400 mt-1">We'll review and take action if needed.</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-cream-100">
                <p className="font-sans text-sm font-semibold text-charcoal-900 mb-1">
                  Report this {targetType}
                </p>
                <p className="font-sans text-xs text-warm-400">
                  Help us keep KAYAD safe and trustworthy.
                </p>
              </div>

              <div className="p-4 space-y-3">
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-lg font-sans text-sm text-charcoal-800 outline-none focus:border-gold-500"
                >
                  <option value="">Select a reason...</option>
                  {REPORT_REASONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional details (optional)..."
                  rows={2}
                  className="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-lg font-sans text-sm text-charcoal-800 placeholder-warm-300 outline-none focus:border-gold-500 resize-none"
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => setOpen(false)}
                    className="flex-1 px-3 py-2 bg-cream-100 text-charcoal-800 font-sans text-xs font-semibold rounded-lg hover:bg-cream-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!reason || submitting}
                    className={`flex-1 px-3 py-2 font-sans text-xs font-semibold rounded-lg transition-colors ${
                      !reason || submitting
                        ? 'bg-cream-200 text-warm-400 cursor-not-allowed'
                        : 'bg-red-500 text-white hover:bg-red-600'
                    }`}
                  >
                    {submitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
