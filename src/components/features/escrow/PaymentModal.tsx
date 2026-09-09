import { useState, useEffect, useRef } from 'react';
import { formatKES } from '../../../api/api';
import { initiatePayment, getPaymentByCheckout } from '../../../services/paymentApi';
import { useSocket } from '../../../context/SocketContext';
import { useToast } from '../../../context/ToastContext';
import { formatPhone } from '../../../utils/helpers';

const TYPE_META: Record<string, { label: string; desc: string; sub: string }> = {
  escrow: {
    label: 'Organizer Escrow Payment',
    desc: 'Your payment is held securely in escrow until you confirm receipt of the car. Funds are only released to the auction organizer after your approval.',
    sub: 'Held in escrow · Released on your confirmation',
  },
  bid: {
    label: 'Bid Security Deposit',
    desc: 'This is a bid security deposit paid to the auction organizer to secure your bid. It shows you are a serious buyer.',
    sub: 'Paid to organizer · Refundable per organizer policy',
  },
  listing: {
    label: 'Listing Fee',
    desc: 'One-time listing fee paid to KAYAD platform to publish your car listing.',
    sub: 'Platform fee · One-time payment',
  },
};

interface PaymentModalProps {
  onClose: () => void;
  amount: number;
  carId: string;
  type?: 'escrow' | 'bid' | 'listing';
  onSuccess?: () => void;
  title?: string;
}

export default function PaymentModal({ onClose, amount, carId, type = 'escrow', onSuccess, title }: PaymentModalProps) {
  const { on } = useSocket();
  const { toast } = useToast();

  const meta = TYPE_META[type] || TYPE_META.escrow;

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<'input' | 'waiting' | 'success' | 'failed'>('input');
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [fundingAccount, setFundingAccount] = useState<any>(null);
  const [pollInterval, setPoll] = useState<ReturnType<typeof setInterval> | null>(null);
  const stageRef = useRef(stage);

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    if (!checkoutId) return;

    const offSuccess = on('paymentSuccess', (data: any) => {
      if (data.checkoutID === checkoutId && stage !== 'success') {
        clearInterval(pollInterval!);
        setStage('success');
        toast('Payment confirmed!', 'success');
        setTimeout(() => { onSuccess?.(); onClose(); }, 2000);
      }
    });

    const offFailed = on('paymentFailed', (data: any) => {
      if (data.checkoutID === checkoutId && stage !== 'failed') {
        clearInterval(pollInterval!);
        setStage('failed');
        toast('Payment failed or cancelled.', 'error');
      }
    });

    return () => { offSuccess(); offFailed(); };
  }, [checkoutId, pollInterval, stage]);

  useEffect(() => {
    if (stage !== 'waiting' || !checkoutId || type === 'escrow') return;

    const interval = setInterval(async () => {
      try {
        const data = await getPaymentByCheckout(checkoutId);
        if (data.payment?.status === 'success' && stageRef.current !== 'success') {
          clearInterval(interval);
          setStage('success');
          toast('Payment confirmed!', 'success');
          setTimeout(() => { onSuccess?.(); onClose(); }, 1800);
        } else if (data.payment?.status === 'failed' && stageRef.current !== 'failed') {
          clearInterval(interval);
          setStage('failed');
        }
      } catch (error) {
        console.error('Payment poll failed:', error);
        // Poll will retry
      }
    }, 5000);

    setPoll(interval);
    return () => clearInterval(interval);
  }, [stage, checkoutId]);

  const handleInitiate = async () => {
    const formatted = phone ? formatPhone(phone) : '';
    if (type !== 'escrow' && formatted.length !== 12) {
      toast('Enter a valid Safaricom number (07...)', 'error'); return;
    }

    setLoading(true);
    try {
      if (type === 'escrow') {
        const data = await initiatePayment({ phone: formatted || '000000000000', amount, carId, type });
        setFundingAccount(data.fundingAccount || null);
        setStage('waiting');
        toast('Escrow instructions generated. Complete the bank transfer, then KAYAD will verify the deposit.', 'info');
      } else {
        const data = await initiatePayment({ phone: formatted || '000000000000', amount, carId, type });
        setCheckoutId(data.checkoutRequestID || data.checkoutID || null);
        setStage('waiting');
        toast('STK push sent! Check your phone', 'info');
      }
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to initiate payment', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {meta.label}
            </div>
            <h3 style={{ marginTop: 4 }}>{title || 'Complete Payment'}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16 }}>✕</button>
        </div>

        <div style={{
          background: 'var(--gold-glow)', border: '1px solid rgba(212,196,168,0.2)',
          borderRadius: 'var(--radius)', padding: '16px', marginBottom: 24, textAlign: 'center',
        }}>
          <div style={{ fontSize: 11, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Amount</div>
          <div className="price-tag" style={{ fontSize: '2rem', marginTop: 4 }}>{formatKES(amount)}</div>
        </div>

        {stage === 'waiting' && type === 'escrow' && fundingAccount && (
          <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', marginBottom: 16 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 700 }}>KAYAD Escrow Bank Account</div>
            <div style={{ marginTop: 8, fontWeight: 700 }}>{fundingAccount.accountName}</div>
            <div style={{ marginTop: 4 }}>{fundingAccount.bankName} · {fundingAccount.accountNumber}</div>
            {fundingAccount.branch && <div style={{ marginTop: 4, color: 'var(--text-muted)' }}>Branch: {fundingAccount.branch}</div>}
            {fundingAccount.notes && <div style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: 12 }}>{fundingAccount.notes}</div>}
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>Reference your escrow transaction exactly as provided by KAYAD. Funding is verified by an authorized custody administrator before the escrow moves to funded.</div>
            <button className="btn btn-gold btn-full btn-lg" onClick={onClose}>Done</button>
          </div>
        )}

        {stage === 'input' && (
          <>
            <div className="input-group" style={{ marginBottom: 20 }}>
              {type !== 'escrow' && <label className="input-label">Safaricom Number</label>}
              {type !== 'escrow' && <div className="mpesa-wrap">
                <span className="mpesa-prefix">🇰🇪</span>
                <input
                  className="input"
                  placeholder="0712 345 678"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  maxLength={13}
                />
              </div>}
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 8 }}>
                {meta.desc}
              </div>
            </div>

            <button
              className="btn btn-gold btn-full btn-lg"
              onClick={handleInitiate}
              disabled={loading || (type !== 'escrow' && phone.length < 9)}
            >
              {loading ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Sending...</> : type === 'escrow' ? 'Create Escrow Funding Instructions' : '📲 Send STK Push'}
            </button>

            <div style={{ marginTop: 16, textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}>
              Powered by <strong style={{ color: '#00A651' }}>M-Pesa</strong> · {meta.sub}
            </div>
          </>
        )}

        {stage === 'waiting' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📱</div>
            <h3 style={{ marginBottom: 8 }}>Check Your Phone</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
              Enter your M-Pesa PIN on your phone to complete the payment.
            </p>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Waiting for M-Pesa confirmation...</div>
            <button className="btn btn-outline btn-sm" style={{ marginTop: 16 }} onClick={() => setStage('input')}>
              Try Again
            </button>
          </div>
        )}

        {stage === 'success' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
            <h3 style={{ color: 'var(--green)', marginBottom: 8 }}>Payment Confirmed!</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              {type === 'escrow' ? 'Your payment is held in escrow. The auction organizer will be notified.' :
               type === 'bid' ? 'Your bid security deposit has been received by the auction organizer.' :
               'Your listing fee has been received.'}
            </p>
          </div>
        )}

        {stage === 'failed' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>❌</div>
            <h3 style={{ color: 'var(--red)', marginBottom: 8 }}>Payment Failed</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
              The payment was cancelled or timed out. Please try again.
            </p>
            <button className="btn btn-gold" onClick={() => setStage('input')}>Try Again</button>
          </div>
        )}
      </div>
    </div>
  );
}
