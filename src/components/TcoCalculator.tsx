import { useState, useMemo } from 'react';
import { Calculator, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { formatKES } from '../utils/helpers';

interface TcoCalculatorProps {
  vehicle?: {
    price?: number;
    engine?: string;
    dutyStatus?: string;
  };
}

export default function TcoCalculator({ vehicle }: TcoCalculatorProps) {
  const [open, setOpen] = useState(false);

  const defaultCc = vehicle?.engine
    ? parseInt(vehicle.engine.replace(/[^0-9]/g, ''), 10) || 1800
    : 1800;

  const [cc, setCc] = useState(defaultCc);
  const [downPct, setDownPct] = useState(20);
  const [loanYears, setLoanYears] = useState(3);
  const [estimateRate, setEstimateRate] = useState(0);

  const isUsed = vehicle?.dutyStatus === 'already_in_kenya' || !vehicle?.dutyStatus;
  const price = vehicle?.price || 5000000;

  const tco = useMemo(() => {
    // Import duties (if not already in Kenya)
    let importDuty = 0;
    if (!isUsed) {
      const customs = price * 0.25;
      const excise = price * 0.20;
      const vat = (price + customs + excise) * 0.16;
      const idf = price * 0.02;
      const rdl = price * 0.015;
      const portFees = 95000;
      importDuty = customs + excise + vat + idf + rdl + portFees;
    }

    // Insurance (4% of vehicle value annually)
    const annualInsurance = price * 0.04;

    // Financing
    const loanAmt = price * (1 - downPct / 100);
    const monthlyRate = (estimateRate / 100) / 12;
    const nMonths = loanYears * 12;
    const monthlyPmt = monthlyRate === 0
      ? loanAmt / nMonths
      : (loanAmt * monthlyRate * Math.pow(1 + monthlyRate, nMonths)) / (Math.pow(1 + monthlyRate, nMonths) - 1);
    const totalFinanced = monthlyPmt * nMonths;
    const totalInterest = totalFinanced - loanAmt;

    return { importDuty, annualInsurance, monthlyPmt, totalFinanced, totalInterest, loanAmt };
  }, [price, downPct, loanYears, estimateRate, isUsed]);

  return (
    <div className="bg-charcoal-900 border border-white/10 rounded-xl overflow-hidden mt-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-transparent border-none text-white font-sans text-sm font-bold cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <Calculator size={14} className="text-gold-400" />
          Total Cost of Ownership
        </span>
        {open ? (
          <ChevronUp size={14} className="text-white/40" />
        ) : (
          <ChevronDown size={14} className="text-white/40" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          {/* Price */}
          <div className="p-4 bg-white/5 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-white/50 font-sans text-xs">Vehicle Price</span>
              <span className="text-white font-sans font-bold">{formatKES(price)}</span>
            </div>
            {tco.importDuty > 0 && (
              <div className="flex items-center justify-between mt-2">
                <span className="text-white/50 font-sans text-xs">Import Duty (est.)</span>
                <span className="text-white font-sans text-sm">+ {formatKES(tco.importDuty)}</span>
              </div>
            )}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
              <span className="text-gold-400 font-sans text-xs font-semibold">Total with Import</span>
              <span className="text-gold-400 font-sans font-bold">{formatKES(price + tco.importDuty)}</span>
            </div>
          </div>

          {/* Financing */}
          <div className="space-y-3">
            <p className="text-white font-sans text-xs font-bold">Financing</p>

            <label className="block space-y-2">
              <span className="text-white/60 font-sans text-xs">Illustrative annual rate (optional)</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={estimateRate}
                onChange={(e) => setEstimateRate(Number(e.target.value) || 0)}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none"
              />
              <span className="text-white/40 font-sans text-[10px]">This is a calculator assumption, not a lender offer or quoted bank rate.</span>
            </label>

            {/* Down payment */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-white/50 font-sans text-xs">Down Payment</span>
                <span className="text-white font-sans text-xs">{downPct}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                step={5}
                value={downPct}
                onChange={(e) => setDownPct(parseInt(e.target.value))}
                className="w-full accent-gold-500"
              />
            </div>

            {/* Loan years */}
            <div className="flex gap-2">
              {[2, 3, 4, 5].map(year => (
                <button
                  key={year}
                  onClick={() => setLoanYears(year)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    loanYears === year
                      ? 'bg-gold-500 text-charcoal-900'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {year} yr
                </button>
              ))}
            </div>

            {/* Results */}
            <div className="p-4 bg-white/5 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white/50 font-sans text-xs">Loan Amount</span>
                <span className="text-white font-sans text-xs">{formatKES(tco.loanAmt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50 font-sans text-xs">Total Interest</span>
                <span className="text-white font-sans text-xs">{formatKES(tco.totalInterest)}</span>
              </div>
              <div className="h-px bg-white/10 my-2" />
              <div className="flex items-center justify-between">
                <span className="text-white/50 font-sans text-xs">Monthly Payment</span>
                <span className="text-gold-400 font-sans font-bold">{formatKES(tco.monthlyPmt)}/mo</span>
              </div>
            </div>
          </div>

          {/* Running costs */}
          <div className="space-y-2">
            <p className="text-white font-sans text-xs font-bold">Annual Running Costs</p>
            <div className="p-4 bg-white/5 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-white/50 font-sans text-xs flex items-center gap-1">
                  Insurance <Info size={10} className="text-white/30" />
                </span>
                <span className="text-white font-sans text-xs">{formatKES(tco.annualInsurance)}/yr</span>
              </div>
            </div>
          </div>

          <p className="text-white/20 font-sans text-[10px] text-center">
            Estimates only. Actual rates may vary. Subject to approval.
          </p>
        </div>
      )}
    </div>
  );
}
