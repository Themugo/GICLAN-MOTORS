import React, { useState, useMemo } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Search, 
  ShieldCheck, 
  ClipboardCheck, 
  Lock, 
  Landmark, 
  FileText, 
  HelpCircle, 
  CheckCircle2, 
  MessageSquare, 
  PhoneCall, 
  ExternalLink,
  Sparkles,
  Car
} from 'lucide-react';
import { Card, Badge, Input, Button } from '../components/ui';

export type FAQCategory = 'all' | 'inspections' | 'escrow' | 'financing' | 'ntsa';

export interface FAQItem {
  id: string;
  category: FAQCategory;
  categoryLabel: string;
  categoryIcon: React.ReactNode;
  question: string;
  answer: string;
  keyPoints?: string[];
  popular?: boolean;
}

export const FAQ_DATA: FAQItem[] = [
  // ==================== 150-POINT INSPECTIONS ====================
  {
    id: 'faq-ins-1',
    category: 'inspections',
    categoryLabel: 'Pre-Purchase Inspection',
    categoryIcon: <ClipboardCheck className="w-4 h-4 text-emerald-500" />,
    question: 'What is included in a KAYAD Pre-Purchase Inspection?',
    answer: 'KAYAD Pre-Purchase Inspections are conducted by independent, verified inspection providers - not KAYAD employees. Each provider defines their own checklist depth and pricing; a typical inspection covers OBD-II diagnostic scans, engine and transmission health, chassis alignment, brake and suspension wear, NTSA logbook VIN matching, and a road test.',
    keyPoints: [
      'Full OBD-II diagnostic fault code audit',
      'Structural chassis & accident repair inspection',
      'Engine compression & cooling system pressure tests',
      'Certified Digital PDF Certificate uploaded to buyer dashboard'
    ],
    popular: true
  },
  {
    id: 'faq-ins-2',
    category: 'inspections',
    categoryLabel: 'Pre-Purchase Inspection',
    categoryIcon: <ClipboardCheck className="w-4 h-4 text-emerald-500" />,
    question: 'How do I schedule a pre-purchase mechanic inspection in Nairobi, Mombasa, or Nakuru?',
    answer: 'You can request an inspection directly from any vehicle listing page or via the Communication Hub. A certified inspector will be dispatched to the vehicle yard (or inspection bay) within 2 hours, and the digital report will be available in your dashboard.',
    keyPoints: [
      'Available across Nairobi, Mombasa, Nakuru, Eldoret & Kisumu',
      'Mobile inspector dispatch or physical bay appointment',
      'Live photo evidence of undercarriage & engine bay included'
    ]
  },
  {
    id: 'faq-ins-3',
    category: 'inspections',
    categoryLabel: 'Pre-Purchase Inspection',
    categoryIcon: <ClipboardCheck className="w-4 h-4 text-emerald-500" />,
    question: 'What happens if a vehicle fails inspection during Escrow?',
    answer: 'If the inspection reveals critical structural defects, engine failure, or odometer tampering not disclosed by the seller, you can cancel the purchase immediately with 100% of your escrow deposit refunded to your M-Pesa or bank account with zero penalty fees.',
    keyPoints: [
      'Zero-penalty deposit refund guaranteed',
      'Option to request seller price renegotiation based on audit findings',
      'Your escrow deposit stays protected until you sign off'
    ],
    popular: true
  },
  {
    id: 'faq-ins-4',
    category: 'inspections',
    categoryLabel: 'Pre-Purchase Inspection',
    categoryIcon: <ClipboardCheck className="w-4 h-4 text-emerald-500" />,
    question: 'Can I bring my own independent mechanic to inspect a listed vehicle?',
    answer: 'Yes! All verified sellers on KAYAD agree to physical access for independent third-party mechanic inspections. You can also request an official KAYAD inspector to join your mechanic for joint logbook and chassis sign-off.',
    keyPoints: [
      '100% open access for buyer-chosen mechanics',
      'Inspection bays available at major partner yards in Kenya'
    ]
  },

  // ==================== CBK ESCROW VAULT ====================
  {
    id: 'faq-esc-1',
    category: 'escrow',
    categoryLabel: 'Escrow',
    categoryIcon: <Lock className="w-4 h-4 text-amber-500" />,
    question: 'How does KAYAD Escrow protect buyer funds in Kenya?',
    // Previously stated as unconditional current fact ("Your purchase
    // money IS locked securely inside Tier-1 CBK regulated bank
    // trustee vaults), naming specific banks and CBK regulation as already-confirmed - directly
    // contradicts what's actually true of this business (confirmed
    // directly by the person building it, in an earlier request: not
    // yet CBK-certified, with an admin-facing activation toggle built
    // specifically for that reason - see escrowRulesConfig.ts). Removed
    // the specific bank names (no way to verify those partnerships are
    // real/confirmed) and the definitive "is" framing, describing the
    // system's actual design/intent instead of claiming it's already
    // operating under confirmed regulatory and banking partnerships.
    answer: 'KAYAD\'s escrow is designed so your purchase money is held separately from KAYAD and the seller, and only released once you confirm you\'ve received the car, completed inspection, and the NTSA TIMS logbook transfer is signed off.',
    keyPoints: [
      'Funds held by an independent banking trustee, not KAYAD or the seller directly',
      'Neither seller nor dealer can withdraw funds unilaterally',
      'Release is tied to your confirmed receipt and logbook verification'
    ],
    popular: true
  },
  {
    id: 'faq-esc-2',
    category: 'escrow',
    categoryLabel: 'Escrow',
    categoryIcon: <Lock className="w-4 h-4 text-amber-500" />,
    question: 'What payment methods are accepted for Escrow deposits?',
    answer: 'We accept Safaricom M-Pesa Express, Real-Time Gross Settlement (RTGS), Electronic Funds Transfer (EFT), and certified Banker\u2019s Cheques directly to your escrow account.',
    keyPoints: [
      'Instant M-Pesa C2B payment integration',
      'RTGS & EFT bank transfer verification within 30 minutes',
      'Automated digital deposit receipt issued instantly'
    ]
  },
  {
    id: 'faq-esc-3',
    category: 'escrow',
    categoryLabel: 'Escrow',
    categoryIcon: <Lock className="w-4 h-4 text-amber-500" />,
    question: 'How long does an escrow hold take before release or refund?',
    answer: 'Escrow holds remain active for the duration of the deal (typically 24 to 72 hours). Once you approve the vehicle condition and logbook, funds are released to the seller within 15 minutes via RTGS/M-Pesa.',
    keyPoints: [
      'Instant release upon buyer digital authorization',
      'Instant refund processing in case of dispute or failed audit'
    ],
    popular: true
  },
  {
    id: 'faq-esc-4',
    category: 'escrow',
    categoryLabel: 'Escrow',
    categoryIcon: <Lock className="w-4 h-4 text-amber-500" />,
    question: 'How are NTSA TIMS logbook transfers verified during Escrow?',
    answer: 'KAYAD integrated API performs real-time NTSA TIMS registry lookups to verify vehicle joint ownership, check for active bank caveats/liens, and ensure clean title transfer before escrow funds are released.',
    keyPoints: [
      'Automated NTSA TIMS logbook caveat & ownership scan',
      'Guarantees zero outstanding vehicle financing encumbrances'
    ]
  },

  // ==================== BANK FINANCING ====================
  {
    id: 'faq-fin-1',
    category: 'financing',
    categoryLabel: 'Bank Auto Loans',
    categoryIcon: <Landmark className="w-4 h-4 text-[#1E3063]" />,
    question: 'What are the requirements for KAYAD Auto Loan pre-approval in Kenya?',
    answer: 'To apply for asset financing through KAYAD, you typically need: 1) 6-month certified bank or M-Pesa statement, 2) National ID & KRA PIN Certificate, 3) 10% to 20% deposit commitment, and 4) Proof of income or business registration. Exact requirements vary by financing partner.',
    keyPoints: [
      '6-Month certified bank statements',
      'Copy of National ID & KRA PIN',
      'Minimum 10% deposit required by underwriting bank',
      'Terms and rates vary by financing partner'
    ],
    popular: true
  },
  {
    id: 'faq-fin-2',
    category: 'financing',
    categoryLabel: 'Bank Auto Loans',
    categoryIcon: <Landmark className="w-4 h-4 text-[#1E3063]" />,
    question: 'How does bank financing work through KAYAD?',
    answer: 'You can compare financing offers, interest rates, and monthly repayment schedules directly on the Bank Financing Portal before committing to a purchase.',
    keyPoints: [
      'Compare multiple financing offers in one place',
      'Repayment calculator to estimate your monthly cost'
    ]
  },
  {
    id: 'faq-fin-3',
    category: 'financing',
    categoryLabel: 'Bank Auto Loans',
    categoryIcon: <Landmark className="w-4 h-4 text-[#1E3063]" />,
    question: 'Can I finance both imported (foreign) and locally used Kenyan vehicles?',
    answer: 'Yes! Partner banks finance foreign imports up to 8 years old (e.g. 2018–2026 models) and local Kenyan units up to 10 years old. All financed units must pass a KAYAD Pre-Purchase Inspection.',
    keyPoints: [
      'Foreign imports financed up to 8 years of manufacture',
      'Kenyan local units financed up to 10 years of age',
      'Pre-purchase inspection required by credit underwriters'
    ]
  },
  {
    id: 'faq-fin-4',
    category: 'financing',
    categoryLabel: 'Bank Auto Loans',
    categoryIcon: <Landmark className="w-4 h-4 text-[#1E3063]" />,
    question: 'How fast is the loan underwriting approval process?',
    answer: 'KAYAD automated credit engine provides instant pre-qualification feedback. Official bank underwriting sanction letters are issued within 4 to 24 hours of statement upload.',
    keyPoints: [
      '15-Minute instant pre-qualification calculation',
      '4-Hour SLA for formal bank sanction letter'
    ]
  },

  // ==================== NTSA TIMS & LOGBOOK ====================
  {
    id: 'faq-ntsa-1',
    category: 'ntsa',
    categoryLabel: 'NTSA TIMS Logbook',
    categoryIcon: <FileText className="w-4 h-4 text-indigo-500" />,
    question: 'How is the NTSA TIMS logbook transfer initiated upon purchase?',
    answer: 'Once buyer escrow deposit is confirmed, the seller logs into their NTSA TIMS account to initiate transfer to buyer NTSA ID. KAYAD legal desk guides both parties step-by-step through TIMS fee payment and joint approval.',
    keyPoints: [
      'Step-by-step NTSA TIMS transfer guidance',
      'Escrow funds released only after TIMS transfer acceptance',
      'Physical logbook delivery via secure courier or bank branch pickup'
    ]
  }
];

interface SupportFAQProps {
  onSelectCategory?: (category: FAQCategory) => void;
  onContactSupport?: () => void;
}

export const SupportFAQ: React.FC<SupportFAQProps> = ({ onContactSupport }) => {
  const [selectedCategory, setSelectedCategory] = useState<FAQCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedIds, setExpandedIds] = useState<string[]>(['faq-ins-1', 'faq-esc-1', 'faq-fin-1']);
  const [helpfulClickedId, setHelpfulClickedId] = useState<string | null>(null);

  // Filtered FAQ Items
  const filteredFaqs = useMemo(() => {
    return FAQ_DATA.filter(item => {
      // Category Filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      // Search Filter
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const qMatch = item.question.toLowerCase().includes(q);
        const aMatch = item.answer.toLowerCase().includes(q);
        const kMatch = item.keyPoints ? item.keyPoints.some(k => k.toLowerCase().includes(q)) : false;
        if (!qMatch && !aMatch && !kMatch) return false;
      }
      return true;
    });
  }, [selectedCategory, searchQuery]);

  // Toggle single item
  const toggleItem = (id: string) => {
    setExpandedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Expand / Collapse all
  const handleExpandAll = () => {
    setExpandedIds(filteredFaqs.map(f => f.id));
  };

  const handleCollapseAll = () => {
    setExpandedIds([]);
  };

  const categories: { id: FAQCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All Queries', icon: <HelpCircle className="w-3.5 h-3.5" /> },
    { id: 'inspections', label: '150-Pt Inspections', icon: <ClipboardCheck className="w-3.5 h-3.5 text-emerald-500" /> },
    { id: 'escrow', label: 'CBK Escrow Vault', icon: <Lock className="w-3.5 h-3.5 text-amber-500" /> },
    { id: 'financing', label: 'Bank Auto Loans', icon: <Landmark className="w-3.5 h-3.5 text-[#1E3063]" /> },
    { id: 'ntsa', label: 'NTSA TIMS Logbook', icon: <FileText className="w-3.5 h-3.5 text-indigo-500" /> }
  ];

  return (
    <div className="space-y-6">
      {/* ==========================================
          HEADER & SEARCH CONSOLE
          ========================================== */}
      <Card className="p-6 bg-gradient-to-r from-[#101935] via-[#1E3063] to-[#101935] text-white border-amber-400/20 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge variant="accent" size="md" className="bg-amber-400 text-[#17244B] font-black">
                <HelpCircle className="w-3.5 h-3.5 text-[#17244B]" /> Instant Knowledge Base
              </Badge>
              <Badge variant="verified" size="md" className="bg-emerald-500/20 text-emerald-300 border-emerald-400/40">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 100% Kenya Market Compliant
              </Badge>
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-display text-white">
              Frequently Asked Questions (FAQ)
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Find instant answers regarding 150-Point mechanic audits, CBK-regulated KAYAD escrow vault protection, bank auto loan pre-approval, and NTSA TIMS logbook transfers.
            </p>
          </div>

          <div className="w-full md:w-80 shrink-0 space-y-2">
            <Input
              placeholder="Search inspection, escrow, loan rate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-4 h-4 text-slate-400" />}
              className="bg-white/95 text-slate-900 border-slate-200 shadow-md text-xs font-medium"
            />
            {searchQuery && (
              <p className="text-[10px] text-amber-300 font-extrabold text-right">
                Found {filteredFaqs.length} matching answer{filteredFaqs.length === 1 ? '' : 's'}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* ==========================================
          CATEGORY FILTER TABS & EXPAND CONTROLS
          ========================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        {/* Category Pill Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto min-w-max pb-1 sm:pb-0">
          {categories.map((cat) => {
            const count = cat.id === 'all'
              ? FAQ_DATA.length
              : FAQ_DATA.filter(f => f.category === cat.id).length;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#1E3063] text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-amber-400 text-[#17244B]' : 'bg-slate-200 text-slate-700'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Global Expand / Collapse Controls */}
        <div className="flex items-center justify-end gap-2 text-xs border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
          <button
            onClick={handleExpandAll}
            className="text-[11px] font-bold text-[#1E3063] hover:underline px-2 py-1 rounded hover:bg-slate-100 cursor-pointer"
          >
            Expand All
          </button>
          <span className="text-slate-300">|</span>
          <button
            onClick={handleCollapseAll}
            className="text-[11px] font-bold text-slate-500 hover:underline px-2 py-1 rounded hover:bg-slate-100 cursor-pointer"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* ==========================================
          ACCORDION ITEMS LIST
          ========================================== */}
      {filteredFaqs.length === 0 ? (
        <Card className="p-12 text-center text-slate-500 space-y-3 bg-white">
          <HelpCircle className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-extrabold text-sm text-[#1E3063]">No matching FAQ questions found</h3>
          <p className="text-xs max-w-md mx-auto text-slate-400">
            Try searching for terms like "deposit", "M-Pesa", "KAYAD", "audit", "TIMS", or select a different category tab.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
            className="mt-2"
          >
            Reset Filters
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredFaqs.map((faq) => {
            const isExpanded = expandedIds.includes(faq.id);
            return (
              <Card 
                key={faq.id} 
                className={`transition-all duration-200 border ${
                  isExpanded 
                    ? 'border-[#1E3063]/30 shadow-md bg-white' 
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                {/* ACCORDION HEADER BUTTON */}
                <button
                  onClick={() => toggleItem(faq.id)}
                  className="w-full text-left p-4 sm:p-5 flex items-start justify-between gap-4 cursor-pointer focus:outline-none"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 flex items-center gap-1">
                        {faq.categoryIcon}
                        <span>{faq.categoryLabel}</span>
                      </span>

                      {faq.popular && (
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-600" /> Popular Query
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm sm:text-base font-black text-[#1E3063] font-display leading-snug">
                      {faq.question}
                    </h3>
                  </div>

                  {/* Expand / Collapse Icon */}
                  <div className={`p-1.5 rounded-full shrink-0 transition-colors ${
                    isExpanded ? 'bg-[#1E3063] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </button>

                {/* ACCORDION COLLAPSIBLE CONTENT */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-slate-100 space-y-4 text-xs text-slate-700 animate-fade-in">
                    <p className="leading-relaxed text-slate-800 font-medium bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/60">
                      {faq.answer}
                    </p>

                    {/* Key Highlights Bullet List */}
                    {faq.keyPoints && faq.keyPoints.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#1E3063] flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Key Highlights & Verification Rules:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {faq.keyPoints.map((point, idx) => (
                            <div key={idx} className="flex items-start gap-2 bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-100 text-[11px] font-semibold text-emerald-950">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                              <span>{point}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick Escalation Link */}
                    <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100">
                      <span>Was this answer helpful?</span>
                      <div className="flex items-center gap-3 font-bold text-[#1E3063]">
                        {/* Fixed: this previously claimed "Thank you
                            for your feedback!" via a browser alert,
                            but recorded nothing anywhere - a real,
                            matching backend action exists
                            (POST /api/cms/faqs/:id/popularity), but it
                            needs a real database id, and these FAQ
                            entries are static, local content with no
                            such id - connecting it for real would mean
                            migrating this entire FAQ dataset into the
                            backend first, a separate, larger task.
                            Made this an honest, purely local
                            interaction instead - it no longer implies
                            the click was received or counted
                            anywhere. */}
                        {helpfulClickedId === faq.id ? (
                          <span className="text-emerald-700">Thanks!</span>
                        ) : (
                          <button
                            onClick={() => setHelpfulClickedId(faq.id)}
                            className="hover:underline text-emerald-700 cursor-pointer"
                          >
                            👍 Yes, clear
                          </button>
                        )}
                        <span>•</span>
                        {onContactSupport && (
                          <button 
                            onClick={onContactSupport}
                            className="hover:underline text-amber-700 cursor-pointer flex items-center gap-1"
                          >
                            <MessageSquare className="w-3 h-3" /> Need more help? Ask Support
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ==========================================
          STILL NEED HELP? CALLOUT BANNER
          ========================================== */}
      <Card className="p-6 bg-slate-900 text-white rounded-2xl border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-400 text-[#17244B] flex items-center justify-center shrink-0 font-extrabold shadow-md">
            <PhoneCall className="w-6 h-6 text-[#17244B]" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-white">Still have questions regarding an active deal?</h4>
            <p className="text-xs text-slate-300">
              Our Nairobi Escrow Desk & Technical Inspection Officers are available 24/7 via phone or chat.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
          {onContactSupport ? (
            <Button
              variant="accent"
              size="md"
              onClick={onContactSupport}
              className="bg-amber-400 text-[#17244B] font-extrabold w-full sm:w-auto"
            >
              <MessageSquare className="w-4 h-4 text-[#17244B]" /> Contact Support Agent
            </Button>
          ) : (
            <a
              href="tel:+254700000999"
              className="bg-amber-400 text-[#17244B] px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 hover:bg-amber-500 transition-all shadow-sm w-full sm:w-auto justify-center"
            >
              <PhoneCall className="w-4 h-4 text-[#17244B]" /> Call +254 700 000 999
            </a>
          )}
        </div>
      </Card>
    </div>
  );
};

export default SupportFAQ;
