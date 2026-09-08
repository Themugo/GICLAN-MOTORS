import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  X,
  TrendingDown,
  Tag,
  CheckCircle2,
  Sparkles,
  Smartphone,
  Mail,
  Zap,
  AlertCircle,
  Trash2,
  BellRing
} from 'lucide-react';
import { Vehicle, PriceAlert } from '../../types/index';
import { useMarketplace } from '../../context/MarketplaceContext';
import { useAuth } from '../../context/AuthContext';
import type React from 'react';
import type { FC } from 'react';

interface PriceAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle;
  existingAlert?: PriceAlert;
  onShowToast: (msg: string) => void;
}

export const PriceAlertModal: FC<PriceAlertModalProps> = ({
  isOpen,
  onClose,
  vehicle,
  existingAlert,
  onShowToast
}) => {
  const { setPriceAlert, removePriceAlert } = useMarketplace();
  const { user } = useAuth();

  const currentPrice = vehicle.price;
  const defaultTargetPrice = Math.round(currentPrice * 0.95); // Default 5% drop

  const [targetPrice, setTargetPrice] = useState<string>(
    existingAlert ? existingAlert.targetPrice.toString() : defaultTargetPrice.toString()
  );
  const [alertOnPriceDrop, setAlertOnPriceDrop] = useState<boolean>(
    existingAlert ? existingAlert.alertOnPriceDrop : true
  );
  const [alertOnStatusChange, setAlertOnStatusChange] = useState<boolean>(
    existingAlert ? existingAlert.alertOnStatusChange : true
  );
  const [notifyMethod, setNotifyMethod] = useState<'in_app' | 'email' | 'both'>(
    existingAlert ? existingAlert.notifyMethod : 'both'
  );

  useEffect(() => {
    if (existingAlert) {
      setTargetPrice(existingAlert.targetPrice.toString());
      setAlertOnPriceDrop(existingAlert.alertOnPriceDrop);
      setAlertOnStatusChange(existingAlert.alertOnStatusChange);
      setNotifyMethod(existingAlert.notifyMethod);
    } else {
      setTargetPrice(defaultTargetPrice.toString());
      setAlertOnPriceDrop(true);
      setAlertOnStatusChange(true);
      setNotifyMethod('both');
    }
  }, [existingAlert, vehicle.id, currentPrice]);

  if (!isOpen) return null;

  const numericTarget = parseFloat(targetPrice) || 0;
  const isTargetBelowCurrent = numericTarget < currentPrice;
  const savingsAmount = currentPrice - numericTarget;
  const savingsPercent = Math.round((savingsAmount / currentPrice) * 100);

  const handleSaveAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (numericTarget <= 0) return;

    setPriceAlert({
      userId: user?.id || 'user_1',
      vehicleId: vehicle.id,
      vehicleTitle: vehicle.title,
      targetPrice: numericTarget,
      alertOnPriceDrop,
      alertOnStatusChange,
      currentPriceAtSet: currentPrice,
      notifyMethod
    });

    onShowToast(`Price Alert configured! We'll notify you if price drops below KSh ${numericTarget.toLocaleString()}`);
    onClose();
  };

  const handleRemoveAlert = () => {
    removePriceAlert(vehicle.id);
    onShowToast('Price alert removed for this vehicle');
    onClose();
  };

  const setPresetPrice = (percentage: number) => {
    if (percentage === 0) {
      setTargetPrice((currentPrice - 10000).toString());
    } else {
      const calculated = Math.round(currentPrice * (1 - percentage / 100));
      setTargetPrice(calculated.toString());
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#E2D8C7] text-[#2E4080]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 bg-[#2E4080] text-white border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#23EBFF]/20 border border-[#23EBFF]/40 flex items-center justify-center text-[#23EBFF] shrink-0">
                <BellRing className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#23EBFF] block">
                  KAYAD Market Sentinel
                </span>
                <h3 className="text-lg font-black font-serif text-white">
                  {existingAlert ? 'Edit Price Alert' : 'Set Price Alert'}
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSaveAlert} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">

            {/* Vehicle Summary Banner */}
            <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-[#F6F1E8] border border-[#E2D8C7]">
              <img
                src={vehicle.images[0] || 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=300&q=80'}
                alt={vehicle.title}
                loading="lazy"
                decoding="async"
                className="w-16 h-16 rounded-xl object-cover shrink-0 border border-white/60 shadow-xs"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-[#2E4080] truncate">{vehicle.title}</h4>
                <p className="text-xs text-[#6B7A99]">VIN: {vehicle.vin}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-semibold text-[#6B7A99]">Current Listed Price:</span>
                  <span className="text-sm font-black text-[#2E4080] font-serif">
                    KSh {currentPrice.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Target Price Threshold Input */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-[#2E4080] flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-[#23EBFF]" />
                  <span>Alert Target Price Threshold (KSh)</span>
                </label>
                {numericTarget > 0 && isTargetBelowCurrent && (
                  <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    -{savingsPercent}% Drop (Save KSh {savingsAmount.toLocaleString()})
                  </span>
                )}
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-[#6B7A99] font-mono">
                  KSh
                </span>
                <input
                  type="number"
                  value={targetPrice}
                  onChange={e => setTargetPrice(e.target.value)}
                  className="w-full pl-14 pr-4 py-3 bg-[#F6F1E8] border border-[#E2D8C7] rounded-2xl text-base font-extrabold text-[#2E4080] font-mono focus:outline-none focus:ring-2 focus:ring-[#23EBFF]"
                  placeholder="e.g. 1300000"
                  required
                />
              </div>

              {/* Quick Discount Presets */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-bold text-[#6B7A99]">Quick Target Presets:</span>
                <button
                  type="button"
                  onClick={() => setPresetPrice(0)}
                  className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white hover:bg-[#2E4080] hover:text-white border border-[#E2D8C7] transition-all cursor-pointer"
                >
                  Any Price Drop
                </button>
                <button
                  type="button"
                  onClick={() => setPresetPrice(5)}
                  className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white hover:bg-[#2E4080] hover:text-white border border-[#E2D8C7] transition-all cursor-pointer"
                >
                  -5% Drop
                </button>
                <button
                  type="button"
                  onClick={() => setPresetPrice(10)}
                  className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white hover:bg-[#2E4080] hover:text-white border border-[#E2D8C7] transition-all cursor-pointer"
                >
                  -10% Drop
                </button>
                <button
                  type="button"
                  onClick={() => setPresetPrice(15)}
                  className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white hover:bg-[#2E4080] hover:text-white border border-[#E2D8C7] transition-all cursor-pointer"
                >
                  -15% Drop
                </button>
              </div>
            </div>

            {/* Notification Triggers Checkboxes */}
            <div className="space-y-3 pt-2 border-t border-[#E8E1D5]">
              <label className="text-xs font-extrabold uppercase tracking-wider text-[#2E4080] block">
                Notification Triggers
              </label>

              <div className="space-y-2.5">
                <label className="flex items-start gap-3 p-3 rounded-2xl bg-[#F6F1E8]/70 hover:bg-[#F6F1E8] border border-[#E2D8C7] transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alertOnPriceDrop}
                    onChange={e => setAlertOnPriceDrop(e.target.checked)}
                    className="mt-1 w-4 h-4 text-[#23EBFF] rounded accent-[#23EBFF] cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-extrabold text-[#2E4080] block flex items-center gap-1.5">
                      <TrendingDown className="w-3.5 h-3.5 text-[#23EBFF]" />
                      <span>Notify when Price Drops below threshold</span>
                    </span>
                    <span className="text-[11px] text-[#6B7A99]">
                      Receive instant notification if seller reduces price or auction reserve lowers.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-2xl bg-[#F6F1E8]/70 hover:bg-[#F6F1E8] border border-[#E2D8C7] transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alertOnStatusChange}
                    onChange={e => setAlertOnStatusChange(e.target.checked)}
                    className="mt-1 w-4 h-4 text-[#23EBFF] rounded accent-[#23EBFF] cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-extrabold text-[#2E4080] block flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-[#E67E22]" />
                      <span>Notify when Vehicle Status Changes</span>
                    </span>
                    <span className="text-[11px] text-[#6B7A99]">
                      Alert when marked as Sold, Reserved under Escrow, or Live Auction Floor opens.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Notification Delivery Method */}
            <div className="space-y-3 pt-2 border-t border-[#E8E1D5]">
              <label className="text-xs font-extrabold uppercase tracking-wider text-[#2E4080] block">
                Alert Delivery Channels
              </label>

              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setNotifyMethod('in_app')}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    notifyMethod === 'in_app'
                      ? 'bg-[#2E4080] text-white border-[#2E4080] shadow-xs'
                      : 'bg-[#F6F1E8] text-[#2E4080] border-[#E2D8C7] hover:border-[#2E4080]'
                  }`}
                >
                  <Bell className="w-4 h-4 text-[#23EBFF]" />
                  <span className="text-xs font-bold">In-App Bell</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNotifyMethod('email')}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    notifyMethod === 'email'
                      ? 'bg-[#2E4080] text-white border-[#2E4080] shadow-xs'
                      : 'bg-[#F6F1E8] text-[#2E4080] border-[#E2D8C7] hover:border-[#2E4080]'
                  }`}
                >
                  <Mail className="w-4 h-4 text-[#23EBFF]" />
                  <span className="text-xs font-bold">Email Digest</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNotifyMethod('both')}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    notifyMethod === 'both'
                      ? 'bg-[#2E4080] text-white border-[#2E4080] shadow-xs'
                      : 'bg-[#F6F1E8] text-[#2E4080] border-[#E2D8C7] hover:border-[#2E4080]'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-[#23EBFF]" />
                  <span className="text-xs font-bold">In-App + SMS</span>
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              {existingAlert ? (
                <button
                  type="button"
                  onClick={handleRemoveAlert}
                  className="px-4 py-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-rose-200"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Alert</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-3 rounded-xl bg-[#F6F1E8] hover:bg-[#E8E1D5] text-[#2E4080] font-bold text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                className="flex-1 py-3.5 px-6 rounded-2xl bg-[#23EBFF] hover:bg-[#23EBFF] text-[#2E4080] font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Price Alert</span>
              </button>
            </div>

          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
