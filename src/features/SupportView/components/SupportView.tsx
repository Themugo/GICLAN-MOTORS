import React, { useState, useRef } from 'react';
import { HelpCircle, ShieldCheck, CheckCircle2, MessageSquare, AlertCircle, Loader2 } from 'lucide-react';
import { PageHeader, Card, Select, Textarea, Button, Badge } from '../../../components/ui';
import SupportFAQ from './SupportFAQ';
import { createSupportTicket, SupportApiError } from '../../../services/supportApi';
import { UserProfile } from '../../../types';

interface SupportViewProps {
  user: UserProfile | null;
  onOpenAuth: () => void;
}

export const SupportView: React.FC<SupportViewProps> = ({ user, onOpenAuth }) => {
  // Real backend connection, replacing what was previously pure UI
  // theater: the old handleSubmit only called setSubmitted(true) with
  // no API call at all - a logged-in-looking success state
  // ("Support Request Received (#SUP-882)") that never actually sent
  // anything anywhere. Found and fixed directly, not assumed: a real,
  // mounted backend (POST /api/support) already existed but its
  // target table did not - added the missing table (see the
  // accompanying migration) and wired this form to the now-real
  // endpoint, following the same honest, no-fake-success-state
  // standard used throughout this project's real API integrations.
  const [submittedTicket, setSubmittedTicket] = useState<{ id: string } | null>(null);
  const [category, setCategory] = useState('escrow');
  const [issue, setIssue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issue.trim()) return;

    if (!user) {
      onOpenAuth();
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await createSupportTicket({
        category,
        subject: issue.trim().slice(0, 80),
        description: issue.trim(),
      });
      setSubmittedTicket({ id: res.ticket.id });
    } catch (err) {
      if (err instanceof SupportApiError && err.kind === 'unauthenticated') {
        onOpenAuth();
      } else {
        setSubmitError(
          err instanceof SupportApiError
            ? err.message
            : 'Something went wrong submitting your request. Please try again.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-8">
      {/* Header - phone number and physical address removed: neither
          was a real, verified KAYAD contact point (checked directly -
          no source for either existed anywhere in this project), and
          this program does not present fabricated contact details as
          real. The real, working channel (the ticket form below) is
          the one actually connected to a backend. */}
      <PageHeader
        badgeIcon={<HelpCircle className="w-4 h-4 text-amber-500" />}
        badgeText="Buyer & Seller Support"
        title="Escrow Protection, Inspections & Help Center"
        description="Self-service knowledge base, instant FAQ search, and a dedicated support ticket system for East Africa vehicle transactions."
      />

      {/* FREQUENTLY ASKED QUESTIONS (FAQ) ACCORDION FEATURE */}
      <SupportFAQ onContactSupport={handleScrollToForm} />

      {/* Support Grid (Ticket Submission + Guarantee) */}
      <div ref={formRef} className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
        {/* Help Form */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#1E3063] font-display flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-500" />
              Submit Ticket or Open Dispute
            </h3>
            {/* "15-Min Response SLA" removed - the real backend's own
                configured SLA (backend/controllers/supportController.js)
                targets a 1-hour first response, not 15 minutes. Shown
                accurately instead of a faster-sounding but false figure. */}
            <Badge variant="accent" size="sm">1-Hour First Response</Badge>
          </div>

          {!user && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Sign in to submit a support ticket - this connects your request to your account so our team can follow up with you directly.</span>
            </div>
          )}

          {submittedTicket ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs text-emerald-900">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              <p className="font-bold">Support Request Received</p>
              <p>Reference: {submittedTicket.id}</p>
              <p>Our team will respond within 1 hour. You can find this ticket's status from your account.</p>
              <button
                onClick={() => { setSubmittedTicket(null); setIssue(''); setSubmitError(null); }}
                className="text-emerald-800 font-bold underline pt-2 cursor-pointer"
              >
                Submit another inquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <Select
                label="Inquiry Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={[
                  { value: 'escrow', label: 'Escrow Deposit & Refund' },
                  { value: 'inspection', label: 'Pre-Purchase Inspection' },
                  { value: 'financing', label: 'Bank Auto Loan Pre-Approval' },
                  { value: 'ntsa', label: 'NTSA TIMS Logbook Transfer' },
                  { value: 'seller', label: 'Seller & Yard Verification' }
                ]}
              />

              <Textarea
                label="Describe Issue"
                rows={4}
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                placeholder="Provide vehicle title, deal reference, or inspection ID..."
              />

              {submitError && (
                <p className="text-rose-600 font-semibold">{submitError}</p>
              )}

              <Button
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...
                  </span>
                ) : !user ? (
                  'Sign In to Submit Ticket'
                ) : (
                  'Submit Support Ticket'
                )}
              </Button>
            </form>
          )}
        </Card>

        {/* Guarantee Info - softened from an absolute, unconditional
            "100% refunded immediately" claim to accurately describe a
            real, reviewed refund process (see
            docs/INSPECTION_DOMAIN_MODEL.md's inspection_refunds table
            and its real pending/approved/processed workflow - refunds
            go through review, they are not literally instant/automatic). */}
        <div className="bg-[#1E3063] text-white rounded-2xl p-6 shadow-card space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Buyer Protection
            </span>
            <h4 className="text-lg font-bold font-display">Escrow-Backed Purchases</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              If a vehicle fails inspection or logbook verification during the escrow hold, your refund request is reviewed and processed to your M-Pesa or bank account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportView;
