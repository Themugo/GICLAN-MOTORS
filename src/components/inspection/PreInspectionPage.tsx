import { useState } from 'react';
import {
  ShieldCheck,
  Wrench,
  CheckCircle2,
  Search,
  Calendar,
  Phone,
  User,
  Car,
  FileText,
  Sparkles,
  ArrowRight,
  Clock,
  MapPin,
  Gauge,
  Fuel,
  AlertCircle,
  X,
  Check,
  ChevronRight,
  Cpu,
  Shield,
  Activity,
  Building2,
  Layers,
  FileCheck2
} from 'lucide-react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { Button } from '../ui/Button';

interface VehicleCardItem {
  id: string;
  title: string;
  brand: string;
  model: string;
  price: number;
  year: number;
  mileage: string;
  fuel: string;
  city: string;
  category: string;
  imageUrl: string;
  badges: string[];
  reportsCount: number;
  sources: string[];
}

const INSPECTED_VEHICLES: VehicleCardItem[] = [
  {
    id: 'veh_3',
    title: 'Land Cruiser 300',
    brand: 'TOYOTA',
    model: 'Land Cruiser 300',
    price: 18500000,
    year: 2022,
    mileage: '8k km',
    fuel: 'Diesel',
    city: 'Nairobi',
    category: 'SUV',
    imageUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1000&q=80',
    badges: ['ESCROW', '2 REPORTS AVAILABLE'],
    reportsCount: 2,
    sources: ['Verified Dealership', 'Accredited Partner']
  },
  {
    id: 'veh_rr_sport',
    title: 'Range Rover Sport',
    brand: 'LAND ROVER',
    model: 'Range Rover Sport',
    price: 15000000,
    year: 2020,
    mileage: '35k km',
    fuel: 'Petrol',
    city: 'Mombasa',
    category: 'SUV',
    imageUrl: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1000&q=80',
    badges: ['ESCROW', '1 REPORT AVAILABLE'],
    reportsCount: 1,
    sources: ['Verified Dealership']
  },
  {
    id: 'veh_1',
    title: 'Cayenne S',
    brand: 'PORSCHE',
    model: 'Cayenne S',
    price: 13200000,
    year: 2020,
    mileage: '48k km',
    fuel: 'Petrol',
    city: 'Nairobi',
    category: 'SUV',
    imageUrl: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=1000&q=80',
    badges: ['ESCROW', '2 REPORTS AVAILABLE'],
    reportsCount: 2,
    sources: ['Independent Partner', 'Dealership Audit']
  },
  {
    id: 'veh_hilux',
    title: 'Hilux Double Cabin',
    brand: 'TOYOTA',
    model: 'Hilux Double Cabin',
    price: 4200000,
    year: 2021,
    mileage: '40k km',
    fuel: 'Diesel',
    city: 'Kisumu',
    category: 'Pickup',
    imageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80',
    badges: ['ESCROW', 'REPORT ON REQUEST'],
    reportsCount: 0,
    sources: ['Available upon Buyer Request']
  }
];

interface BreakdownCategory {
  id: string;
  name: string;
  ptsCount: number;
  checks: string[];
  moreChecksCount: number;
}

const BREAKDOWN_CATEGORIES: BreakdownCategory[] = [
  {
    id: 'engine',
    name: 'Engine & Drivetrain',
    ptsCount: 38,
    checks: [
      'Engine compression test',
      'Oil leaks & pressure verification',
      'Transmission & clutch condition',
      'Driveshaft & CV joint audit',
      'Exhaust & emissions test'
    ],
    moreChecksCount: 33
  },
  {
    id: 'exterior',
    name: 'Exterior & Structural Body',
    ptsCount: 32,
    checks: [
      'Frame alignment & structural integrity',
      'Paint depth gauge & panel consistency',
      'Rust & corrosion structural audit',
      'Glass, mirrors & lighting alignment',
      'Wheel & tire tread depth measurement'
    ],
    moreChecksCount: 27
  },
  {
    id: 'electrical',
    name: 'Electrical & Diagnostics',
    ptsCount: 28,
    checks: [
      'ECU diagnostic fault code scan',
      'Battery health & alternator output test',
      'Infotainment & navigation functionality',
      'Sensors, radar & ADAS calibration',
      'Wiring harness & fuse box audit'
    ],
    moreChecksCount: 23
  },
  {
    id: 'interior',
    name: 'Interior & Safety Systems',
    ptsCount: 22,
    checks: [
      'Airbag modules & seatbelt tensioners',
      'HVAC heating & AC cooling efficiency',
      'Upholstery & dashboard wear inspection',
      'Power windows & central locking motors',
      'Instrument cluster operational audit'
    ],
    moreChecksCount: 17
  },
  {
    id: 'documentation',
    name: 'Legal & Ownership Verification',
    ptsCount: 18,
    checks: [
      'KRA logbook authenticity & VIN match',
      'NTSA registration history audit',
      'Insurance claims & loss history',
      'Maintenance & official service log records',
      'Title lien & debt encumbrance clearance'
    ],
    moreChecksCount: 13
  },
  {
    id: 'roadtest',
    name: 'Dynamic Road Test',
    ptsCount: 12,
    checks: [
      'Acceleration & shift gear smoothness',
      'Braking distance & ABS module response',
      'Steering tracking & vibration analysis',
      'Suspension damper response over obstacles',
      'Highway stability & cruise control audit'
    ],
    moreChecksCount: 7
  }
];

export const PreInspectionPage: React.FC = () => {
  const { navigateTo, selectedVehicle } = useMarketplace();

  // Active Breakdown Category
  const [activeCategory, setActiveCategory] = useState<BreakdownCategory>(BREAKDOWN_CATEGORIES[0]);

  // Inspection Tier state
  const [selectedTier, setSelectedTier] = useState<'standard' | 'certified' | 'executive'>('certified');

  // Booking Form State
  const initialVehicleText = selectedVehicle
    ? `${selectedVehicle.title.includes(String(selectedVehicle.year)) ? selectedVehicle.title : `${selectedVehicle.year} ${selectedVehicle.title}`}${selectedVehicle.vin ? ` (VIN: ${selectedVehicle.vin})` : ''}`
    : 'Toyota Land Cruiser 300 (VIN: JTDKN3DU80102938)';

  const [formData, setFormData] = useState({
    fullName: 'John Mwangi',
    phone: '+254 700 000 000',
    makeModel: initialVehicleText,
    date: '2026-08-01',
    timeSlot: '10:00 AM',
    notes: 'Requesting independent partner evaluation for frame alignment, OBD diagnostics, and KRA logbook match.'
  });

  const [bookingSuccessMsg, setBookingSuccessMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setBookingSuccessMsg(`Independent inspection request submitted for ${formData.makeModel}! Dispatched to accredited partner center. M-Pesa prompt sent to ${formData.phone}. Audit scheduled for ${formData.date} at ${formData.timeSlot}.`);
      setTimeout(() => setBookingSuccessMsg(''), 5000);
    }, 1200);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="pt-3 sm:pt-5 pb-10 sm:pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-5 sm:space-y-6 bg-[#FCF9F4] text-[#1E3063] font-sans">

      {/* 1. Header / Hero Section */}
      <div className="inspection-marketplace-card p-4 sm:p-5 lg:p-6 rounded-2xl bg-[#1E3063] text-white border border-white/20 shadow-lg relative overflow-hidden space-y-4">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#00C9CE]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-2.5 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00C9CE]/20 text-[#00C9CE] text-[10px] font-black uppercase tracking-wider border border-[#00C9CE]/40">
            <FileCheck2 className="w-3.5 h-3.5 text-[#00C9CE]" />
            <span>INSPECTION MARKETPLACE & REPORT REPOSITORY</span>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black font-serif tracking-tight text-white">
            Vehicle Inspection Marketplace
          </h1>

          <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed max-w-2xl">
            KAYAD aggregates multi-source vehicle verification reports from accredited inspection partners and verified dealerships. Access existing reports or request an independent third-party audit before purchase.
          </p>

          <div className="pt-1 flex flex-col sm:flex-row items-center gap-2.5">
            <Button
              variant="primary"
              onClick={() => scrollToSection('inspected_cars')}
              className="w-full sm:w-auto bg-[#00C9CE] hover:bg-[#00b8bc] text-[#1E3063] font-black text-xs py-2.5 px-5 uppercase tracking-wider shadow-sm rounded-xl cursor-pointer"
              rightIcon={<ArrowRight className="w-3.5 h-3.5 text-[#1E3063]" />}
            >
              Browse Vehicle Reports
            </Button>

            <Button
              variant="ghost"
              onClick={() => scrollToSection('book_inspection')}
              className="w-full sm:w-auto bg-white/15 hover:bg-white/25 border border-white/40 text-white font-black text-xs py-2.5 px-5 uppercase tracking-wider rounded-xl shadow-xs cursor-pointer"
            >
              Request Independent Audit
            </Button>
          </div>
        </div>

        {/* Quick Highlights Row */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-white/15">
          <div className="p-3 rounded-xl bg-white/10 border border-white/15 flex items-center gap-3 hover:bg-white/15 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-[#00C9CE]/25 text-[#00C9CE] flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4 text-[#00C9CE]" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-white font-serif block">Multi-Source Audits</span>
              <span className="text-[10px] text-slate-200 font-semibold block">Dealership & independent reports</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/10 border border-white/15 flex items-center gap-3 hover:bg-white/15 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-[#00C9CE]/25 text-[#00C9CE] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-[#00C9CE]" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-white font-serif block">Accredited Partners</span>
              <span className="text-[10px] text-slate-200 font-semibold block">Licensed inspection centers</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/10 border border-white/15 flex items-center gap-3 hover:bg-white/15 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-[#00C9CE]/25 text-[#00C9CE] flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-[#00C9CE]" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-white font-serif block">150-Point Framework</span>
              <span className="text-[10px] text-slate-200 font-semibold block">Unified evaluation criteria</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 150-Point Standardized Audit Protocol Section */}
      <div className="p-5 sm:p-7 rounded-2xl bg-white border border-[#E2D8C7] shadow-sm space-y-6">
        <div className="space-y-1 pb-4 border-b border-[#E8E1D5]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1E3063]/10 text-[#1E3063] text-xs font-bold uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5 text-[#00C9CE]" />
            <span>Marketplace Audit Standard</span>
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#1E3063] font-serif tracking-tight">
            Standardized 150-Point Audit Protocol
          </h2>
          <p className="text-xs text-[#6B7A99] font-medium">
            All inspection reports published in the KAYAD repository adhere to our standardized 150-point technical evaluation criteria.
          </p>
        </div>

        {/* Category Tabs & Interactive Detail Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Left Column: Category Pills */}
          <div className="lg:col-span-5 space-y-2.5">
            {BREAKDOWN_CATEGORIES.map(cat => {
              const isSelected = activeCategory.id === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat)}
                  className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#1E3063] text-white border-[#1E3063] shadow-md'
                      : 'bg-[#F6F1E8]/70 hover:bg-[#F6F1E8] text-[#1E3063] border-[#E2D8C7]'
                  }`}
                >
                  <span className="font-extrabold text-sm font-serif">{cat.name}</span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-mono font-black ${
                      isSelected
                        ? 'bg-[#00C9CE] text-[#1E3063]'
                        : 'bg-white border border-[#E2D8C7] text-[#1E3063]'
                    }`}
                  >
                    {cat.ptsCount} pts
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Column: Detailed Checklist Card */}
          <div className="lg:col-span-7 p-5 sm:p-6 lg:p-7 rounded-2xl bg-[#1E3063] text-white border border-white/10 shadow-lg space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-white/10">
              <div>
                <span className="text-[10px] font-mono font-extrabold uppercase text-[#00C9CE] tracking-widest block">
                  AUDIT MODULE
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white font-serif">
                  {activeCategory.name}
                </h3>
              </div>
              <span className="px-3 py-1 rounded-lg bg-[#00C9CE]/20 text-[#00C9CE] text-xs font-mono font-bold border border-[#00C9CE]/40 self-start sm:self-auto">
                {activeCategory.ptsCount} inspection points
              </span>
            </div>

            {/* Checklist Items */}
            <ul className="space-y-2.5">
              {activeCategory.checks.map((checkItem, idx) => (
                <li key={idx} className="flex items-center gap-3 text-xs sm:text-sm text-slate-200 font-medium p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-5 h-5 rounded-full bg-[#2ECC71]/20 text-[#2ECC71] flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>{checkItem}</span>
                </li>
              ))}
            </ul>

            <div className="p-3 rounded-xl bg-[#00C9CE]/15 border border-[#00C9CE]/30 text-xs text-[#00C9CE] font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00C9CE] shrink-0" />
              <span>+{activeCategory.moreChecksCount} additional verification checks in full repository report…</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Vehicles with Available Inspection Reports Section */}
      <div id="inspected_cars" className="space-y-6 scroll-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E8E1D5]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2ECC71]/15 text-[#1E3063] text-xs font-bold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#2ECC71]" />
              <span>Report Repository</span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#1E3063] font-serif tracking-tight">
              Vehicles with Inspection Reports
            </h2>
            <p className="text-xs text-[#6B7A99] font-medium">
              Review existing reports uploaded by verified dealerships or accredited inspection partners, or request an independent audit.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => navigateTo('gallery')}
            className="border-[#E2D8C7] text-[#1E3063] font-bold text-xs hover:bg-[#F6F1E8] shrink-0"
          >
            Browse All Inventory
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {INSPECTED_VEHICLES.map(car => (
            <div
              key={car.id}
              className="p-4 rounded-2xl bg-white border border-[#E2D8C7] shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                {/* Vehicle Image with Aspect Ratio Protection */}
                <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden border border-[#E2D8C7] bg-slate-100">
                  <img
                    src={car.imageUrl}
                    alt={car.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                    {car.badges.map((b, i) => (
                      <span
                        key={i}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${
                          b === 'ESCROW'
                            ? 'bg-[#1E3063] text-[#00C9CE]'
                            : b.includes('REPORT')
                            ? 'bg-[#2ECC71] text-[#1E3063]'
                            : 'bg-white/90 text-[#1E3063]'
                        }`}
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Info */}
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#00C9CE] block">
                    {car.brand}
                  </span>
                  <h3 className="text-base font-extrabold text-[#1E3063] font-serif truncate">
                    {car.title}
                  </h3>
                </div>

                {/* Report Sources & Details Grid */}
                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-[#1E3063]/5 border border-[#1E3063]/10 text-xs space-y-1">
                    <span className="text-[10px] font-bold uppercase text-[#6B7A99] block">
                      Report Sources ({car.reportsCount}):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {car.sources.map((src, sIdx) => (
                        <span key={sIdx} className="px-2 py-0.5 rounded bg-white text-[10px] font-bold border border-[#E2D8C7] text-[#1E3063]">
                          {src}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-xl bg-[#F6F1E8] border border-[#E2D8C7]">
                    <div>
                      <span className="text-[10px] text-[#6B7A99] font-bold block uppercase">Price</span>
                      <span className="font-extrabold text-[#1E3063]">KES {(car.price / 1000000).toFixed(1)}M</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#6B7A99] font-bold block uppercase">Year</span>
                      <span className="font-extrabold text-[#1E3063]">{car.year}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#6B7A99] font-bold block uppercase">Mileage</span>
                      <span className="font-semibold text-[#3D4F6F]">{car.mileage}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#6B7A99] font-bold block uppercase">Location</span>
                      <span className="font-semibold text-[#3D4F6F]">{car.city}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                variant="primary"
                onClick={() => navigateTo('gallery')}
                className="w-full bg-[#1E3063] hover:bg-[#0B1628] text-white font-bold text-xs py-2.5 uppercase tracking-wider rounded-xl"
              >
                View Vehicle & Reports
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Request an Independent Inspection Form Section */}
      <div id="book_inspection" className="p-5 sm:p-7 rounded-2xl bg-white border border-[#E2D8C7] shadow-sm space-y-6 sm:space-y-8 scroll-mt-20">
        <div className="space-y-1.5 pb-5 border-b border-[#E8E1D5]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1E3063]/10 text-[#1E3063] text-xs font-bold uppercase tracking-wider">
            <Car className="w-3.5 h-3.5 text-[#00C9CE]" />
            <span>Independent Verification Flow</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#1E3063] font-serif tracking-tight">
            Request Independent Partner Inspection
          </h2>
          <p className="text-xs sm:text-sm text-[#3D4F6F] font-medium max-w-2xl">
            Need an objective second opinion? Commission an independent evaluation from an accredited inspection partner center across Kenya.
          </p>
        </div>

        {bookingSuccessMsg ? (
          <div className="p-8 rounded-2xl bg-[#2ECC71]/15 text-[#1E3063] border border-[#2ECC71]/40 text-sm font-bold text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-[#2ECC71] mx-auto" />
            <h3 className="text-xl font-extrabold font-serif text-[#1E3063]">Inspection Request Dispatched!</h3>
            <p className="max-w-xl mx-auto">{bookingSuccessMsg}</p>
          </div>
        ) : (
          <form onSubmit={handleBookingSubmit} className="space-y-8">
            {/* Inspection Tier Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-[#1E3063] uppercase tracking-wider">
                  1. Select Partner Inspection Package
                </label>
                <span className="text-[11px] font-bold text-[#6B7A99]">Standardized partner rates</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Standard Tier */}
                <button
                  type="button"
                  onClick={() => setSelectedTier('standard')}
                  className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between relative space-y-3 ${
                    selectedTier === 'standard'
                      ? 'bg-[#1E3063] text-white border-[#1E3063] shadow-lg ring-2 ring-[#00C9CE]'
                      : 'bg-[#FCF9F4] hover:bg-[#F6F1E8] text-[#1E3063] border-[#E2D8C7]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-extrabold text-sm font-serif">Partner Standard 100-Pt</span>
                      <span className={`text-xs font-mono font-black ${selectedTier === 'standard' ? 'text-[#00C9CE]' : 'text-[#1E3063]'}`}>
                        KES 4,500
                      </span>
                    </div>
                    <p className={`text-xs leading-relaxed font-medium ${selectedTier === 'standard' ? 'text-slate-200' : 'text-[#3D4F6F]'}`}>
                      100 physical points, paint depth gauge & tire wear check.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-current/10 flex items-center justify-between text-[11px] font-bold">
                    <span className={selectedTier === 'standard' ? 'text-[#00C9CE]' : 'text-[#6B7A99]'}>100 Points Covered</span>
                    {selectedTier === 'standard' && <CheckCircle2 className="w-4 h-4 text-[#00C9CE]" />}
                  </div>
                </button>

                {/* Certified Tier (Recommended) */}
                <button
                  type="button"
                  onClick={() => setSelectedTier('certified')}
                  className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between relative space-y-3 ${
                    selectedTier === 'certified'
                      ? 'bg-[#1E3063] text-white border-[#1E3063] shadow-lg ring-2 ring-[#00C9CE]'
                      : 'bg-[#FCF9F4] hover:bg-[#F6F1E8] text-[#1E3063] border-[#E2D8C7]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-extrabold text-sm font-serif">Partner Certified 150-Pt</span>
                      <span className={`text-xs font-mono font-black ${selectedTier === 'certified' ? 'text-[#00C9CE]' : 'text-[#1E3063]'}`}>
                        KES 7,500
                      </span>
                    </div>
                    <span className="inline-block px-2 py-0.5 rounded bg-[#00C9CE] text-[#1E3063] text-[9px] font-black uppercase tracking-wider mb-1">
                      RECOMMENDED
                    </span>
                    <p className={`text-xs leading-relaxed font-medium ${selectedTier === 'certified' ? 'text-slate-200' : 'text-[#3D4F6F]'}`}>
                      150 points + ECU fault diagnostic scan & KRA logbook match.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-current/10 flex items-center justify-between text-[11px] font-bold">
                    <span className={selectedTier === 'certified' ? 'text-[#00C9CE]' : 'text-[#6B7A99]'}>150 Points + ECU Scan</span>
                    {selectedTier === 'certified' && <CheckCircle2 className="w-4 h-4 text-[#00C9CE]" />}
                  </div>
                </button>

                {/* Executive Tier */}
                <button
                  type="button"
                  onClick={() => setSelectedTier('executive')}
                  className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between relative space-y-3 ${
                    selectedTier === 'executive'
                      ? 'bg-[#1E3063] text-white border-[#1E3063] shadow-lg ring-2 ring-[#00C9CE]'
                      : 'bg-[#FCF9F4] hover:bg-[#F6F1E8] text-[#1E3063] border-[#E2D8C7]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-extrabold text-sm font-serif">Partner Executive 200-Pt</span>
                      <span className={`text-xs font-mono font-black ${selectedTier === 'executive' ? 'text-[#00C9CE]' : 'text-[#1E3063]'}`}>
                        KES 12,500
                      </span>
                    </div>
                    <p className={`text-xs leading-relaxed font-medium ${selectedTier === 'executive' ? 'text-slate-200' : 'text-[#3D4F6F]'}`}>
                      200 points + chassis dyno, frame alignment & legal clearance.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-current/10 flex items-center justify-between text-[11px] font-bold">
                    <span className={selectedTier === 'executive' ? 'text-[#00C9CE]' : 'text-[#6B7A99]'}>200 Points + Dyno</span>
                    {selectedTier === 'executive' && <CheckCircle2 className="w-4 h-4 text-[#00C9CE]" />}
                  </div>
                </button>
              </div>
            </div>

            {/* Form Fields: Applicant & Vehicle Info */}
            <div className="space-y-4 pt-2 border-t border-[#E8E1D5]">
              <label className="block text-xs font-black text-[#1E3063] uppercase tracking-wider">
                2. Applicant & Vehicle Details
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-[#1E3063] uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#6B7A99] absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="John Mwangi"
                      className="w-full pl-10 pr-4 py-3 bg-[#FCF9F4] border border-[#E2D8C7] rounded-xl text-xs font-bold text-[#1E3063] focus:outline-none focus:bg-white focus:border-[#00C9CE] focus:ring-1 focus:ring-[#00C9CE]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1E3063] uppercase tracking-wider mb-1.5">
                    M-Pesa Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#6B7A99] absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+254 700 000 000"
                      className="w-full pl-10 pr-4 py-3 bg-[#FCF9F4] border border-[#E2D8C7] rounded-xl text-xs font-bold text-[#1E3063] focus:outline-none focus:bg-white focus:border-[#00C9CE] focus:ring-1 focus:ring-[#00C9CE]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1E3063] uppercase tracking-wider mb-1.5">
                    Target Vehicle Details / VIN
                  </label>
                  <div className="relative">
                    <Car className="w-4 h-4 text-[#6B7A99] absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      value={formData.makeModel}
                      onChange={e => setFormData({ ...formData, makeModel: e.target.value })}
                      placeholder="e.g. Toyota Land Cruiser 300"
                      className="w-full pl-10 pr-4 py-3 bg-[#FCF9F4] border border-[#E2D8C7] rounded-xl text-xs font-bold text-[#1E3063] focus:outline-none focus:bg-white focus:border-[#00C9CE] focus:ring-1 focus:ring-[#00C9CE]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1E3063] uppercase tracking-wider mb-1.5">
                    Preferred Audit Date
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-[#6B7A99] absolute left-3.5 top-3.5" />
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-[#FCF9F4] border border-[#E2D8C7] rounded-xl text-xs font-bold text-[#1E3063] focus:outline-none focus:bg-white focus:border-[#00C9CE] focus:ring-1 focus:ring-[#00C9CE]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1E3063] uppercase tracking-wider mb-1.5">
                  Specific Instructions or Inspection Focal Points
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Specify focus areas (e.g. frame alignment, engine diagnostics, KRA logbook check...)"
                  className="w-full px-4 py-3 bg-[#FCF9F4] border border-[#E2D8C7] rounded-xl text-xs font-semibold text-[#1E3063] focus:outline-none focus:bg-white focus:border-[#00C9CE] focus:ring-1 focus:ring-[#00C9CE]"
                />
              </div>
            </div>

            {/* Bottom Action Footer */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#1E3063] text-white flex flex-col sm:flex-row items-center justify-between gap-4 border border-white/10 shadow-md">
              <div>
                <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider block">
                  Total Partner Audit Fee
                </span>
                <span className="text-xl sm:text-2xl font-black text-[#00C9CE] font-mono">
                  {selectedTier === 'standard' ? 'KES 4,500' : selectedTier === 'certified' ? 'KES 7,500' : 'KES 12,500'}
                </span>
                <span className="text-[11px] text-slate-300 font-medium block mt-0.5">
                  Direct M-Pesa Express dispatch to accredited partner center
                </span>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                variant="primary"
                className="w-full sm:w-auto bg-[#00C9CE] hover:bg-[#00b8bc] text-[#1E3063] font-black text-xs py-3.5 px-8 uppercase tracking-wider shadow-md cursor-pointer shrink-0"
              >
                {isSubmitting ? 'Dispatching Request...' : 'Dispatch Request via M-Pesa'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
