import React, { useState, useEffect } from 'react';
import {
  Shield, ShieldCheck, ShieldAlert, ClipboardCheck, Car, Search,
  Clock, Star, MapPin, CheckCircle2, ChevronRight, ChevronDown,
  Phone, Mail, MessageCircle, Calendar, User, FileCheck, Award,
  BarChart3, Bot, Zap, Eye, AlertTriangle, ThumbsUp, Download,
  Camera, Mic, FileText, Check, X, ArrowRight, Globe, Truck,
  Building2, Banknote, Percent, Bot as BotIcon, Loader2, Menu
} from 'lucide-react';
import * as gcApi from '../../services/ghostCheckersApi';

// Design System Colors
const colors = {
  navy: '#17244B',
  beige: '#F6F1E8',
  white: '#FFFFFF',
  emerald: '#10B981',
  terracotta: '#C77B58',
  softBlue: '#60A5FA',
  mutedOrange: '#FB923C',
  mutedCrimson: '#EF4444',
  purple: '#8B5CF6',
};

// Icons mapping
const iconMap = {
  shield: Shield,
  brain: Bot,
  clipboard: ClipboardCheck,
  file: FileCheck,
};

// ============================================================
// SUB-COMPONENTS
// ============================================================

/** Package Card */
const PackageCard = ({ pkg, selected, onSelect }) => (
  <div
    onClick={() => onSelect(pkg.id)}
    className={`relative bg-white rounded-2xl border-2 cursor-pointer transition-all ${
      selected === pkg.id
        ? 'border-[#17244B] shadow-xl scale-[1.02]'
        : 'border-slate-200 hover:border-slate-300 hover:shadow-lg'
    }`}
  >
    {pkg.popular && (
      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
        <span className="px-4 py-1 bg-[#17244B] text-white text-sm font-semibold rounded-full">
          Most Popular
        </span>
      </div>
    )}
    <div className="p-6">
      <h3 className="text-xl font-bold text-slate-800 mb-2">{pkg.name}</h3>
      <p className="text-slate-500 text-sm mb-4">{pkg.description}</p>
      <div className="flex items-baseline gap-1 mb-6">
        <span className="text-3xl font-bold text-[#17244B]">Ksh {pkg.price.toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <ClipboardCheck className="w-4 h-4" />
        <span>{pkg.items} inspection points</span>
        <span className="text-slate-300">•</span>
        <Clock className="w-4 h-4" />
        <span>{pkg.duration}</span>
      </div>
      <ul className="space-y-2 mb-6">
        {pkg.features.slice(0, 5).map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
            <Check className="w-4 h-4 text-emerald-500" />
            {feature}
          </li>
        ))}
        {pkg.features.length > 5 && (
          <li className="text-sm text-slate-400">+{pkg.features.length - 5} more</li>
        )}
      </ul>
      <button
        className={`w-full py-3 rounded-xl font-semibold transition-colors ${
          selected === pkg.id
            ? 'bg-[#17244B] text-white'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
        }`}
      >
        {selected === pkg.id ? 'Selected' : 'Select Package'}
      </button>
    </div>
  </div>
);

/** Coverage City */
const CoverageCity = ({ city, available, avgTime }) => (
  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
        available ? 'bg-emerald-100' : 'bg-slate-100'
      }`}>
        <MapPin className={`w-4 h-4 ${available ? 'text-emerald-600' : 'text-slate-400'}`} />
      </div>
      <span className="font-medium text-slate-800">{city}</span>
    </div>
    <span className={`text-sm ${available ? 'text-emerald-600' : 'text-slate-400'}`}>
      {available ? `~${avgTime}` : 'Coming Soon'}
    </span>
  </div>
);

/** Testimonial Card */
const TestimonialCard = ({ testimonial }) => (
  <div className="bg-white rounded-2xl p-6 border border-slate-100">
    <div className="flex gap-1 mb-3">
      {[...Array(testimonial.rating)].map((_, i) => (
        <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
      ))}
    </div>
    <p className="text-slate-600 mb-4 italic">"{testimonial.text}"</p>
    <div>
      <p className="font-semibold text-slate-800">{testimonial.name}</p>
      <p className="text-sm text-slate-500">{testimonial.role}</p>
    </div>
  </div>
);

/** Trust Badge */
const TrustBadge = ({ label, icon }) => {
  const IconComponent = iconMap[icon] || Shield;
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white/10 backdrop-blur rounded-xl">
      <IconComponent className="w-5 h-5 text-white" />
      <span className="text-white font-medium">{label}</span>
    </div>
  );
};

/** Booking Wizard Steps */
const BookingWizard = ({ packages, onComplete }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    package: 'standard',
    vehicle: { make: '', model: '', year: '', plate: '', vin: '' },
    location: { city: '', address: '' },
    date: '',
    seller: { name: '', phone: '', email: '' },
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const selectedPackage = packages.find(p => p.id === formData.package);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await gcApi.createBooking({
        vehicle: formData.vehicle,
        location: formData.location.address,
        package: formData.package,
        preferredDate: formData.date,
        sellerContact: formData.seller,
      });
      onComplete && onComplete();
    } catch (error) {
      console.error('Booking failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, label: 'Package' },
    { num: 2, label: 'Vehicle' },
    { num: 3, label: 'Location' },
    { num: 4, label: 'Contact' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Progress */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center justify-between mb-4">
          {steps.map((s, i) => (
            <React.Fragment key={s.num}>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                  step >= s.num ? 'bg-[#17244B] text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                </div>
                <span className={`text-sm font-medium ${step >= s.num ? 'text-slate-800' : 'text-slate-400'}`}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 ${step > s.num ? 'bg-[#17244B]' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {step === 1 && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-800">Select Inspection Package</h3>
            <div className="grid grid-cols-2 gap-4">
              {packages.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  selected={formData.package}
                  onSelect={(id) => setFormData({ ...formData, package: id })}
                />
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Vehicle Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Make (e.g., Toyota)"
                value={formData.vehicle.make}
                onChange={(e) => setFormData({ ...formData, vehicle: { ...formData.vehicle, make: e.target.value } })}
                className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#17244B]"
              />
              <input
                type="text"
                placeholder="Model (e.g., Land Cruiser)"
                value={formData.vehicle.model}
                onChange={(e) => setFormData({ ...formData, vehicle: { ...formData.vehicle, model: e.target.value } })}
                className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#17244B]"
              />
              <input
                type="text"
                placeholder="Year"
                value={formData.vehicle.year}
                onChange={(e) => setFormData({ ...formData, vehicle: { ...formData.vehicle, year: e.target.value } })}
                className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#17244B]"
              />
              <input
                type="text"
                placeholder="Plate Number"
                value={formData.vehicle.plate}
                onChange={(e) => setFormData({ ...formData, vehicle: { ...formData.vehicle, plate: e.target.value } })}
                className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#17244B]"
              />
              <input
                type="text"
                placeholder="VIN (if available)"
                value={formData.vehicle.vin}
                onChange={(e) => setFormData({ ...formData, vehicle: { ...formData.vehicle, vin: e.target.value } })}
                className="col-span-2 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#17244B]"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Inspection Location</h3>
            <select
              value={formData.location.city}
              onChange={(e) => setFormData({ ...formData, location: { ...formData.location, city: e.target.value } })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#17244B]"
            >
              <option value="">Select City</option>
              <option value="Nairobi">Nairobi</option>
              <option value="Mombasa">Mombasa</option>
              <option value="Kisumu">Kisumu</option>
              <option value="Nakuru">Nakuru</option>
              <option value="Eldoret">Eldoret</option>
            </select>
            <textarea
              placeholder="Full Address"
              value={formData.location.address}
              onChange={(e) => setFormData({ ...formData, location: { ...formData.location, address: e.target.value } })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#17244B] h-24 resize-none"
            />
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#17244B]"
            />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Seller Contact</h3>
            <input
              type="text"
              placeholder="Seller Name"
              value={formData.seller.name}
              onChange={(e) => setFormData({ ...formData, seller: { ...formData.seller, name: e.target.value } })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#17244B]"
            />
            <input
              type="tel"
              placeholder="Phone Number"
              value={formData.seller.phone}
              onChange={(e) => setFormData({ ...formData, seller: { ...formData.seller, phone: e.target.value } })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#17244B]"
            />
            <input
              type="email"
              placeholder="Email"
              value={formData.seller.email}
              onChange={(e) => setFormData({ ...formData, seller: { ...formData.seller, email: e.target.value } })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#17244B]"
            />
            <textarea
              placeholder="Special Instructions (optional)"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#17244B] h-24 resize-none"
            />

            {/* Summary */}
            <div className="p-4 bg-slate-50 rounded-xl">
              <h4 className="font-semibold text-slate-800 mb-2">Booking Summary</h4>
              <div className="text-sm text-slate-600 space-y-1">
                <p><strong>Package:</strong> {selectedPackage?.name} - Ksh {selectedPackage?.price.toLocaleString()}</p>
                <p><strong>Vehicle:</strong> {formData.vehicle.year} {formData.vehicle.make} {formData.vehicle.model}</p>
                <p><strong>Location:</strong> {formData.location.address || 'TBD'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-6 border-t border-slate-100 flex justify-between">
        <button
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="px-6 py-3 border border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Back
        </button>
        {step < 4 ? (
          <button
            onClick={() => setStep(step + 1)}
            className="px-6 py-3 bg-[#17244B] text-white rounded-xl font-semibold hover:bg-[#1e3054]"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
            Confirm Booking
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function GhostCheckers() {
  const [landingData, setLandingData] = useState(null);
  const [packages, setPackages] = useState([]);
  const [showBooking, setShowBooking] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data } = await gcApi.getLandingData();
      setLandingData(data.data);
      const { data: pkgData } = await gcApi.getPackages();
      setPackages(pkgData.data);
    } catch (error) {
      console.error('Failed to load data:', error);
      // Set fallback data
      setLandingData({
        stats: {
          inspectionsCompleted: 45892,
          inspectors: 156,
          coverage: 47,
          satisfaction: 96.5,
          avgTurnaround: '24 hours',
        },
        coverage: [
          { city: 'Nairobi', available: true, avgTime: '4 hours' },
          { city: 'Mombasa', available: true, avgTime: '6 hours' },
          { city: 'Kisumu', available: true, avgTime: '8 hours' },
          { city: 'Nakuru', available: true, avgTime: '6 hours' },
        ],
        testimonials: [
          { name: 'James Mwangi', role: 'Car Buyer', text: 'Ghost Checkers saved me from buying a flood-damaged vehicle.', rating: 5 },
          { name: 'Sarah Ochieng', role: 'Bank Manager', text: 'We use Ghost Checkers for all vehicle valuations.', rating: 5 },
        ],
      });
      setPackages([
        { id: 'basic', name: 'Basic Inspection', price: 3500, description: 'Essential checks', items: 45, duration: '1 hour', features: ['Exterior', 'Interior', 'Engine Start'], popular: false },
        { id: 'standard', name: 'Standard Inspection', price: 7500, description: 'Comprehensive inspection', items: 75, duration: '2 hours', features: ['All Basic', 'Test Drive', 'Suspension'], popular: true },
        { id: 'premium', name: '150-Point Inspection', price: 15000, description: 'Most comprehensive', items: 150, duration: '3 hours', features: ['All Standard', 'Diagnostics', 'AI Analysis'], popular: false },
      ]);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F1E8]">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#17244B] to-[#2a3a6e] flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="font-bold text-slate-800">Ghost Checkers</span>
                <span className="text-xs text-slate-500 block">by KAYAD</span>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <button className="text-slate-600 hover:text-[#17244B]">How It Works</button>
              <button className="text-slate-600 hover:text-[#17244B]">Packages</button>
              <button className="text-slate-600 hover:text-[#17244B]">Coverage</button>
              <button className="text-slate-600 hover:text-[#17244B]">For Business</button>
              <button
                onClick={() => setShowBooking(true)}
                className="px-5 py-2 bg-[#17244B] text-white rounded-lg font-semibold hover:bg-[#1e3054]"
              >
                Book Inspection
              </button>
            </div>
            <button className="md:hidden" onClick={() => setShowMobileMenu(!showMobileMenu)}>
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#17244B] via-[#1e3054] to-[#2a3a6e] py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span className="text-white font-medium">Africa's Most Trusted Inspection Service</span>
              </div>

              <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                Know Exactly What<br />You're Buying
              </h1>

              <p className="text-lg text-slate-300">
                Comprehensive 150-point inspections by certified engineers. AI-powered damage detection.
                Digital Vehicle Passports. The truth about every vehicle.
              </p>

              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => setShowBooking(true)}
                  className="px-8 py-4 bg-[#10B981] text-white font-bold rounded-xl hover:bg-emerald-700 flex items-center gap-2"
                >
                  <Calendar className="w-5 h-5" />
                  Book Inspection
                </button>
                <button className="px-8 py-4 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  View Sample Report
                </button>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap gap-3 pt-4">
                {landingData?.trustBadges?.map((badge, i) => (
                  <TrustBadge key={i} label={badge.label} icon={badge.icon} />
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
                <p className="text-4xl font-bold text-white">{landingData?.stats?.inspectionsCompleted?.toLocaleString() || '45,892'}</p>
                <p className="text-slate-300">Inspections Completed</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
                <p className="text-4xl font-bold text-white">{landingData?.stats?.inspectors || 156}</p>
                <p className="text-slate-300">Certified Inspectors</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
                <p className="text-4xl font-bold text-white">{landingData?.stats?.satisfaction || 96.5}%</p>
                <p className="text-slate-300">Customer Satisfaction</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
                <p className="text-4xl font-bold text-white">{landingData?.stats?.avgTurnaround || '24h'}</p>
                <p className="text-slate-300">Average Turnaround</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">How Ghost Checkers Works</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              Three simple steps to know everything about your vehicle
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: 1, icon: Calendar, title: 'Book Online', desc: 'Select your package, provide vehicle details, and choose a convenient time and location.' },
              { step: 2, icon: Search, title: 'Expert Inspection', desc: 'Our certified inspector visits the vehicle and performs a comprehensive 150-point check.' },
              { step: 3, icon: FileCheck, title: 'Receive Report', desc: 'Get your detailed digital report with photos, scores, and recommendations within 24 hours.' },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="bg-slate-50 rounded-2xl p-8 text-center">
                  <div className="w-16 h-16 bg-[#17244B] rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">{item.title}</h3>
                  <p className="text-slate-500">{item.desc}</p>
                </div>
                {i < 2 && (
                  <ChevronRight className="hidden md:block absolute top-1/2 -right-4 -translate-y-1/2 w-8 h-8 text-slate-300" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="py-16 bg-[#F6F1E8]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">Inspection Packages</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              Choose the level of inspection that fits your needs and budget
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                selected={null}
                onSelect={(id) => setShowBooking(true)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 150-Point Checklist */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">150-Point Inspection Checklist</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              Every inspection covers these critical areas to give you complete peace of mind
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            {[
              { icon: FileCheck, label: 'Documentation', points: 7 },
              { icon: Car, label: 'Exterior & Body', points: 10 },
              { icon: Search, label: 'Engine Compartment', points: 12 },
              { icon: Settings, label: 'Transmission', points: 5 },
              { icon: Shield, label: 'Suspension', points: 7 },
              { icon: Disc, label: 'Braking System', points: 7 },
              { icon: Zap, label: 'Electrical Systems', points: 11 },
              { icon: Home, label: 'Interior', points: 10 },
              { icon: Navigation, label: 'Test Drive', points: 10 },
              { icon: ArrowDown, label: 'Undercarriage', points: 7 },
              { icon: Circle, label: 'Wheels & Tyres', points: 6 },
              { icon: Monitor, label: 'Computer Diagnostics', points: 7 },
            ].map((section, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-[#17244B] rounded-xl flex items-center justify-center flex-shrink-0">
                  <section.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{section.label}</p>
                  <p className="text-sm text-slate-500">{section.points} points</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-6 bg-emerald-50 rounded-2xl border border-emerald-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">AI-Powered Analysis</h3>
                <p className="text-slate-600">
                  Our advanced AI detects panel repairs, paint mismatches, rust, and other issues that even trained eyes might miss.
                  Each AI finding includes a confidence score to help you make informed decisions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Coverage */}
      <section className="py-16 bg-[#F6F1E8]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-bold text-slate-800 mb-4">Coverage Areas</h2>
              <p className="text-slate-500 mb-8">
                We're expanding rapidly across East Africa. Check if your city is covered.
              </p>
              <div className="space-y-3">
                {landingData?.coverage?.map((city, i) => (
                  <CoverageCity key={i} {...city} />
                ))}
              </div>
              <p className="text-sm text-slate-500 mt-4">
                Don't see your city? <button className="text-[#17244B] font-medium">Contact us</button> to request coverage.
              </p>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-800 mb-4">For Business</h2>
              <p className="text-slate-500 mb-8">
                Dedicated portals for dealers, banks, insurance companies, and fleet operators.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Building2, title: 'Dealers', desc: 'Get Ghost Certified and increase buyer confidence' },
                  { icon: Banknote, title: 'Banks', desc: 'Verified vehicle valuations for loan approvals' },
                  { icon: Shield, title: 'Insurance', desc: 'Pre-insurance inspections and claims assessment' },
                  { icon: Truck, title: 'Fleet Operators', desc: 'Manage inspections across your entire fleet' },
                ].map((item, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 flex items-center gap-4 border border-slate-100">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                      <item.icon className="w-6 h-6 text-[#17244B]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800">{item.title}</h4>
                      <p className="text-sm text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">Trusted by Thousands</h2>
            <p className="text-slate-500">See what our customers say about Ghost Checkers</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {landingData?.testimonials?.map((testimonial, i) => (
              <TestimonialCard key={i} testimonial={testimonial} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-[#17244B] to-[#2a3a6e]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Don't Buy a Vehicle Without Knowing the Truth
          </h2>
          <p className="text-lg text-slate-300 mb-8">
            Get your comprehensive inspection report today and buy with confidence.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => setShowBooking(true)}
              className="px-8 py-4 bg-[#10B981] text-white font-bold rounded-xl hover:bg-emerald-700 flex items-center gap-2"
            >
              <Calendar className="w-5 h-5" />
              Book Inspection
            </button>
            <button className="px-8 py-4 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Call Us
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#17244B] to-[#2a3a6e] flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <span className="font-bold">Ghost Checkers</span>
              </div>
              <p className="text-slate-400 text-sm">
                Africa's most trusted independent vehicle inspection service, powered by KAYAD.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><button className="hover:text-white">Basic Inspection</button></li>
                <li><button className="hover:text-white">150-Point Inspection</button></li>
                <li><button className="hover:text-white">Dealer Certification</button></li>
                <li><button className="hover:text-white">Bank Inspections</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><button className="hover:text-white">About Us</button></li>
                <li><button className="hover:text-white">Our Inspectors</button></li>
                <li><button className="hover:text-white">Contact</button></li>
                <li><button className="hover:text-white">Careers</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li>+254 700 123 456</li>
                <li>info@ghostcheckers.co.ke</li>
                <li>Nairobi, Kenya</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-slate-400 text-sm">
            <p>© 2024 Ghost Checkers by KAYAD. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Booking Modal */}
      {showBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowBooking(false)}>
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <BookingWizard
              packages={packages}
              onComplete={() => setShowBooking(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
