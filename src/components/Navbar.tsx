import React, { useState, useRef, useEffect } from 'react';
import {
  Car,
  PlusCircle,
  Menu,
  X,
  ShieldCheck,
  User,
  ChevronDown,
  Gavel,
  CreditCard,
  HelpCircle,
  Heart,
  Bell,
  LogOut,
  LayoutDashboard,
  MessageSquare,
  Building2,
  Lock,
  Settings,
  Bookmark,
  BarChart3,
  Layers,
  Calendar,
  FileText,
  Sliders,
  CheckCircle2,
  Landmark,
  Sparkles,
} from 'lucide-react';
import { UserProfile } from '../types';

interface NavbarProps {
  user: UserProfile | null;
  savedCount?: number;
  activeNav: string;
  onNavClick: (nav: string) => void;
  selectedCounty: string;
  onCountyChange: (county: string) => void;
  onOpenAuth: () => void;
  onOpenAlerts: () => void;
  onLogout?: () => void;
  unreadCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  savedCount = 0,
  activeNav,
  onNavClick,
  onOpenAuth,
  onOpenAlerts,
  onLogout,
  unreadCount = 0
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [trustIndex, setTrustIndex] = useState(0);

  const userRef = useRef<HTMLDivElement>(null);

  const counties = ['All East Africa', 'Nairobi', 'Mombasa', 'Nakuru', 'Kiambu', 'Eldoret', 'Kisumu'];

  const trustMessages = [
    "Verified Dealers Across East Africa",
    "Secure Private Sales with Escrow",
    "150-Point Certified Vehicles",
    "Live Vehicle Auctions",
    "Trusted Automotive Marketplace"
  ];

  // Rotate trust messages slowly every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setTrustIndex((prev) => (prev + 1) % trustMessages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [trustMessages.length]);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavSelect = (navId: string) => {
    onNavClick(navId);
    setShowUserDropdown(false);
    setMobileMenuOpen(false);
  };

  const effectiveUnread = user?.unreadMessagesCount ?? unreadCount;
  const hasNotifications = (user?.unreadNotificationsCount ?? 0) > 0 || effectiveUnread > 0;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200/70 shadow-2xs text-slate-800">
      {/* Top Utility Bar - Slim Brand Identity & Rotating Trust Strip */}
      <div className="bg-[#101935] border-b border-slate-800/80 text-[11px] py-1 px-4 sm:px-6 lg:px-8 text-slate-300">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
          {/* Left: Rotating Brand Trust Message */}
          <div className="flex items-center space-x-2.5 min-w-0 overflow-hidden">
            <span className="text-[#E0D8CB] font-bold text-[10px] uppercase tracking-wider shrink-0 bg-white/10 px-2 py-0.5 rounded border border-white/15">
              KAYAD EA
            </span>
            <div className="flex items-center gap-1.5 font-medium text-slate-200 truncate transition-opacity duration-700 ease-in-out">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate text-slate-200 font-medium">{trustMessages[trustIndex]}</span>
            </div>
          </div>

          {/* Right: Region Selector & Account/Alerts */}
          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={onOpenAlerts}
              className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors font-medium hidden sm:flex"
            >
              <Bell className="w-3.5 h-3.5 text-slate-400" />
              <span>Price Alerts</span>
            </button>

            <span className="text-slate-700 hidden sm:inline">|</span>

            {user ? (
              <span className="text-slate-300 flex items-center gap-1.5 font-medium text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span className="hidden sm:inline">Signed in as</span> <strong className="text-white truncate max-w-[110px]">{user.name}</strong>
              </span>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1 hover:text-white transition-colors font-semibold text-slate-200"
              >
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Navigation Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-18 gap-4">

          {/* LEFT SECTION: Logo, Marketplace, Auctions */}
          <div className="flex items-center space-x-6 md:space-x-8">
            {/* KAYAD Logo */}
            <button
              onClick={() => handleNavSelect('marketplace')}
              className="flex items-center gap-2.5 group focus:outline-none shrink-0"
              id="brand-logo"
            >
              <div className="w-9 h-9 rounded-lg bg-[#1E3063] text-white flex items-center justify-center font-black shadow-2xs group-hover:bg-[#17244B] transition-colors">
                <Car className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-black text-2xl tracking-tight text-[#1E3063] font-display leading-none flex items-center gap-1.5">
                  KAYAD
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F5F2EB] text-[#1E3063] border border-[#E5E0D8] font-sans font-bold">
                    EA
                  </span>
                </span>
                <span className="text-[9px] text-slate-500 font-semibold tracking-wider uppercase mt-0.5">Automotive Marketplace</span>
              </div>
            </button>

            {/* Desktop Left Nav Items */}
            {/* Fixed: removed the Auctions/Services dropdowns per
                explicit direction - most functions live on each
                car's own page, so the navbar only needs these flat,
                direct links now. */}
            <nav className="hidden lg:flex items-center space-x-2 border-l border-slate-200/60 pl-6 text-xs font-semibold text-slate-600">
              <button
                onClick={() => handleNavSelect('marketplace')}
                className={`px-3.5 py-2 rounded-lg transition-all ${
                  activeNav === 'marketplace'
                    ? 'bg-[#1E3063] text-white font-bold shadow-2xs'
                    : 'hover:text-[#1E3063] hover:bg-[#F5F2EB]'
                }`}
              >
                Marketplace
              </button>

              <button
                onClick={() => handleNavSelect('discovery')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  activeNav === 'discovery'
                    ? 'bg-[#1E3063] text-white font-bold shadow-2xs'
                    : 'hover:text-[#1E3063] hover:bg-[#F5F2EB]'
                }`}
              >
                <Gavel className="w-3.5 h-3.5 shrink-0 stroke-[1.75]" />
                <span>Auction</span>
              </button>

              <button
                onClick={() => handleNavSelect('inspections')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  activeNav === 'inspections'
                    ? 'bg-[#1E3063] text-white font-bold shadow-2xs'
                    : 'hover:text-[#1E3063] hover:bg-[#F5F2EB]'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[1.75]" />
                <span>Pre-Purchase Inspection</span>
              </button>

              <button
                onClick={() => handleNavSelect('escrow')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  activeNav === 'escrow'
                    ? 'bg-[#1E3063] text-white font-bold shadow-2xs'
                    : 'hover:text-[#1E3063] hover:bg-[#F5F2EB]'
                }`}
              >
                <Lock className="w-3.5 h-3.5 text-blue-600 shrink-0 stroke-[1.75]" />
                <span>Escrow</span>
              </button>

              {user && (
                <button onClick={() => handleNavSelect('payments')} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${activeNav === 'payments' ? 'bg-[#1E3063] text-white font-bold shadow-2xs' : 'hover:text-[#1E3063] hover:bg-[#F5F2EB]'}`}>
                  <CreditCard className="w-3.5 h-3.5 shrink-0 stroke-[1.75]" />
                  <span>Payment History</span>
                </button>
              )}

              <button
                onClick={() => handleNavSelect('support')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  activeNav === 'support'
                    ? 'bg-[#1E3063] text-white font-bold shadow-2xs'
                    : 'hover:text-[#1E3063] hover:bg-[#F5F2EB]'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5 text-slate-500 shrink-0 stroke-[1.75]" />
                <span>Support</span>
              </button>
            </nav>
          </div>

          {/* RIGHT SECTION: List Vehicle & Login/Register OR User Profile Dropdown */}
          <div className="flex items-center space-x-3">
            {/* Communication Hub Button */}
            <button
              onClick={() => handleNavSelect('chat')}
              className={`p-2 rounded-xl text-slate-600 hover:text-[#1E3063] hover:bg-[#F5F2EB] transition-colors relative ${
                activeNav === 'chat' ? 'bg-[#1E3063] text-white' : ''
              }`}
              title="Unified Communication Hub"
            >
              <MessageSquare className={`w-5 h-5 stroke-[1.75] ${activeNav === 'chat' ? 'text-white' : 'text-slate-600'}`} />
              {/* Fixed: this badge was hardcoded to "3" unconditionally,
                  always showing regardless of whether there was any
                  real unread message - unlike the Favorites badge
                  right below it, which correctly only renders when
                  its real count is actually > 0. effectiveUnread was
                  already computed above and already used correctly
                  in this same component's dropdown menu - this badge
                  just wasn't wired to it. */}
              {effectiveUnread > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 text-[9px] font-black rounded-full bg-amber-400 text-[#17244B] shadow-2xs">
                  {effectiveUnread}
                </span>
              )}
            </button>

            {/* Favorites Icon */}
            {/* Fixed: this was always shown, even to signed-out
                visitors, even though favorites are inherently
                per-user (require being signed in to mean anything -
                the "saved" destination has nothing real to show a
                logged-out visitor). Now only shown once genuinely
                signed in, matching the same real gating already used
                elsewhere in this navbar (e.g. the profile dropdown). */}
            {user && (
              <button
                onClick={() => handleNavSelect('saved')}
                className={`p-2 rounded-xl text-slate-600 hover:text-[#1E3063] hover:bg-[#F5F2EB] transition-colors relative ${
                  activeNav === 'saved' ? 'bg-[#F5F2EB] text-[#1E3063]' : ''
                }`}
                title="Saved Vehicles"
              >
                <Heart className="w-5 h-5 text-slate-600 stroke-[1.75]" />
                {savedCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-[#C85A32] text-white shadow-2xs">
                    {savedCount}
                  </span>
                )}
              </button>
            )}

            {/* List Vehicle Button (Primary CTA: Muted Terracotta) */}
            <button
              onClick={() => handleNavSelect('seller-platform')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs bg-[#C85A32] hover:bg-[#B34E28] text-white transition-all shadow-2xs active:scale-[0.98] shrink-0"
              id="cta-sell-car"
            >
              <PlusCircle className="w-4 h-4 stroke-[2]" />
              <span>Sell Vehicle</span>
            </button>

            {/* AUTHENTICATED USER DROPDOWN OR LOGIN BUTTON (Secondary CTA: White bg, Navy border) */}
            {user ? (
              <div className="relative" ref={userRef}>
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl hover:bg-[#F5F2EB] border border-slate-200 transition-all focus:outline-none"
                  id="user-profile-menu-button"
                >
                  <div className="relative">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-7 h-7 rounded-full object-cover border border-[#1E3063]/30 shadow-2xs"
                    />
                    {hasNotifications && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
                    )}
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-bold text-[#1E3063] leading-none">{user.name}</span>
                    <span className="text-[10px] text-slate-500 capitalize">{user.role}</span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Authenticated Dropdown Menu */}
                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-fade-in text-xs">
                    {/* User Header Info */}
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 bg-[#F5F2EB]/60 rounded-t-2xl">
                      <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover border border-[#1E3063]/30" />
                      <div className="overflow-hidden">
                        <p className="font-bold text-slate-900 truncate">{user.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-[#1E3063] text-white font-semibold text-[9px] rounded uppercase">
                          {user.role === 'dealer' ? 'Verified Dealer' : user.role === 'mechanic' ? 'NTSA Mechanic' : user.role === 'admin' ? 'Administrator' : 'Private Seller / Buyer'}
                        </span>
                      </div>
                    </div>

                    {/* Standard Links */}
                    <div className="py-1">
                      <button
                        onClick={() => handleNavSelect('dashboard')}
                        className="w-full text-left px-4 py-2 hover:bg-[#F5F2EB] flex items-center gap-2.5 font-medium text-slate-700 hover:text-[#1E3063]"
                      >
                        <LayoutDashboard className="w-4 h-4 text-slate-500 stroke-[1.75]" />
                        <span>Buyer Command Center</span>
                      </button>

                      <button
                        onClick={() => handleNavSelect('seller-dashboard')}
                        className="w-full text-left px-4 py-2 hover:bg-[#F5F2EB] flex items-center gap-2.5 font-bold text-[#1E3063]"
                      >
                        <Car className="w-4 h-4 text-amber-600 stroke-[1.75]" />
                        <span>Private Seller Dashboard</span>
                      </button>

                      <button
                        onClick={() => handleNavSelect('chat')}
                        className="w-full text-left px-4 py-2 hover:bg-[#F5F2EB] flex items-center justify-between font-bold text-[#1E3063]"
                      >
                        <div className="flex items-center gap-2.5">
                          <MessageSquare className="w-4 h-4 text-blue-600 stroke-[1.75]" />
                          <span>Communication Hub</span>
                        </div>
                        {effectiveUnread > 0 && (
                          <span className="px-2 py-0.5 bg-rose-500 text-white rounded-full text-[10px] font-bold">
                            {effectiveUnread}
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => handleNavSelect('seller-platform')}
                        className="w-full text-left px-4 py-2 hover:bg-[#F5F2EB] flex items-center gap-2.5 font-medium text-slate-700 hover:text-[#1E3063]"
                      >
                        <Car className="w-4 h-4 text-slate-500 stroke-[1.75]" />
                        <span>Sell Vehicle</span>
                      </button>

                      <button
                        onClick={() => handleNavSelect('saved')}
                        className="w-full text-left px-4 py-2 hover:bg-[#F5F2EB] flex items-center justify-between font-medium text-slate-700 hover:text-[#1E3063]"
                      >
                        <div className="flex items-center gap-2.5">
                          <Heart className="w-4 h-4 text-slate-500 stroke-[1.75]" />
                          <span>Saved Cars</span>
                        </div>
                        {savedCount > 0 && (
                          <span className="text-slate-400 font-medium text-[11px]">{savedCount} items</span>
                        )}
                      </button>

                      <button
                        onClick={() => handleNavSelect('saved')}
                        className="w-full text-left px-4 py-2 hover:bg-[#F5F2EB] flex items-center gap-2.5 font-medium text-slate-700 hover:text-[#1E3063]"
                      >
                        <Bookmark className="w-4 h-4 text-slate-500 stroke-[1.75]" />
                        <span>Saved Searches</span>
                      </button>

                      <button
                        onClick={() => handleNavSelect('kayadlive')}
                        className="w-full text-left px-4 py-2 hover:bg-[#F5F2EB] flex items-center gap-2.5 font-medium text-slate-700 hover:text-[#1E3063]"
                      >
                        <Sparkles className="w-4 h-4 text-slate-500 stroke-[1.75]" />
                        <span>KAYAD Live</span>
                      </button>

                      <button
                        onClick={() => handleNavSelect('buyer-platform')}
                        className="w-full text-left px-4 py-2 hover:bg-[#F5F2EB] flex items-center gap-2.5 font-medium text-slate-700 hover:text-[#1E3063]"
                      >
                        <Car className="w-4 h-4 text-slate-500 stroke-[1.75]" />
                        <span>My Garage</span>
                      </button>

                      <button
                        onClick={() => handleNavSelect('finance')}
                        className="w-full text-left px-4 py-2 hover:bg-[#F5F2EB] flex items-center gap-2.5 font-medium text-slate-700 hover:text-[#1E3063]"
                      >
                        <CreditCard className="w-4 h-4 text-slate-500 stroke-[1.75]" />
                        <span>Vehicle Financing</span>
                      </button>

                      <button
                        onClick={() => handleNavSelect('dashboard')}
                        className="w-full text-left px-4 py-2 hover:bg-[#F5F2EB] flex items-center gap-2.5 font-medium text-slate-700 hover:text-[#1E3063]"
                      >
                        <Settings className="w-4 h-4 text-slate-500 stroke-[1.75]" />
                        <span>Account Settings</span>
                      </button>
                    </div>

                    {/* ROLE-SPECIFIC OPTIONS */}
                    {user.role === 'dealer' && (
                      <div className="border-t border-slate-100 pt-1.5 mt-1.5 bg-[#F5F2EB]/50 pb-1">
                        <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Dealer Management
                        </div>
                        <button
                          onClick={() => handleNavSelect('dealer-dashboard')}
                          className="w-full text-left px-4 py-1.5 hover:bg-[#F5F2EB] flex items-center gap-2.5 font-bold text-[#1E3063]"
                        >
                          <Building2 className="w-4 h-4 text-[#1E3063]" />
                          <span>Dealer Dashboard</span>
                        </button>
                        <button
                          onClick={() => handleNavSelect('dealers')}
                          className="w-full text-left px-4 py-1.5 hover:bg-[#F5F2EB] flex items-center gap-2.5 font-bold text-[#1E3063]"
                        >
                          <Layers className="w-4 h-4 text-[#1E3063]" />
                          <span>Dealer Inventory</span>
                        </button>
                        <button
                          onClick={() => handleNavSelect('dashboard')}
                          className="w-full text-left px-4 py-1.5 hover:bg-[#F5F2EB] flex items-center gap-2.5 font-bold text-[#1E3063]"
                        >
                          <BarChart3 className="w-4 h-4 text-[#1E3063]" />
                          <span>Dealer Analytics</span>
                        </button>
                      </div>
                    )}

                    {user.role === 'mechanic' && (
                      <div className="border-t border-slate-100 pt-1.5 mt-1.5 bg-emerald-50/50 pb-1">
                        <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                          Pre-Purchase Inspection Portal
                        </div>
                        <button
                          onClick={() => handleNavSelect('inspections')}
                          className="w-full text-left px-4 py-1.5 hover:bg-emerald-100/70 flex items-center gap-2.5 font-bold text-emerald-900"
                        >
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>Pre-Purchase Inspection OS</span>
                        </button>
                        <button
                          onClick={() => handleNavSelect('inspections')}
                          className="w-full text-left px-4 py-1.5 hover:bg-emerald-100/70 flex items-center gap-2.5 font-bold text-emerald-900"
                        >
                          <Calendar className="w-4 h-4 text-emerald-600" />
                          <span>Bookings Intake</span>
                        </button>
                        <button
                          onClick={() => handleNavSelect('inspections')}
                          className="w-full text-left px-4 py-1.5 hover:bg-emerald-100/70 flex items-center gap-2.5 font-bold text-emerald-900"
                        >
                          <FileText className="w-4 h-4 text-emerald-600" />
                          <span>150-Point Reports</span>
                        </button>
                      </div>
                    )}

                    {user.role === 'bank_officer' && (
                      <div className="border-t border-slate-100 pt-1.5 mt-1.5 bg-blue-50/50 pb-1">
                        <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-900">
                          Bank & Finance Underwriting Portal
                        </div>
                        <button
                          onClick={() => handleNavSelect('financing')}
                          className="w-full text-left px-4 py-1.5 hover:bg-blue-100/70 flex items-center gap-2.5 font-bold text-blue-950"
                        >
                          <Landmark className="w-4 h-4 text-blue-600" />
                          <span>Underwriting Desk</span>
                        </button>
                        <button
                          onClick={() => handleNavSelect('financing')}
                          className="w-full text-left px-4 py-1.5 hover:bg-blue-100/70 flex items-center gap-2.5 font-bold text-blue-950"
                        >
                          <CreditCard className="w-4 h-4 text-blue-600" />
                          <span>Applications Intake</span>
                        </button>
                      </div>
                    )}

                    {user.role === 'admin' && (
                      <div className="border-t border-slate-100 pt-1.5 mt-1.5 bg-slate-100/80 pb-1">
                        <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                          System Administration
                        </div>
                        <button
                          onClick={() => handleNavSelect('admin')}
                          className="w-full text-left px-4 py-1.5 hover:bg-slate-200 flex items-center gap-2.5 font-bold text-slate-900"
                        >
                          <Lock className="w-4 h-4 text-slate-700" />
                          <span>Admin Panel</span>
                        </button>
                        <button
                          onClick={() => handleNavSelect('admin')}
                          className="w-full text-left px-4 py-1.5 hover:bg-slate-200 flex items-center gap-2.5 font-bold text-slate-900"
                        >
                          <Sliders className="w-4 h-4 text-slate-700" />
                          <span>System Management</span>
                        </button>
                      </div>
                    )}

                    {/* Logout Button */}
                    <div className="border-t border-slate-100 pt-1 mt-1">
                      <button
                        onClick={() => {
                          if (onLogout) onLogout();
                          setShowUserDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2.5 font-bold transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs bg-white hover:bg-[#F5F2EB] text-[#1E3063] border border-[#1E3063] transition-all shadow-2xs"
                id="btn-sign-in-main"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-700 hover:bg-[#F5F2EB] rounded-xl focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-[#1E3063]" /> : <Menu className="w-6 h-6 text-[#1E3063]" />}
            </button>
          </div>

        </div>
      </div>

      {/* MOBILE DRAWER NAVIGATION */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#101935] text-white border-t border-slate-800 px-4 pt-4 pb-8 space-y-4 animate-fade-in max-h-[calc(100vh-80px)] overflow-y-auto">

          {/* User Account Banner or Login Prompt */}
          {user ? (
            <div className="p-3 bg-slate-800/90 rounded-2xl border border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover border border-[#1E3063]" />
                <div>
                  <p className="font-bold text-xs text-white">{user.name}</p>
                  <p className="text-[10px] text-slate-400">{user.email}</p>
                  <span className="text-[9px] font-bold text-slate-300 uppercase">{user.role}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  if (onLogout) onLogout();
                  setMobileMenuOpen(false);
                }}
                className="p-2 bg-rose-500/20 text-rose-300 rounded-xl font-bold text-xs hover:bg-rose-500 hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="p-3 bg-[#1E3063] rounded-2xl border border-slate-700 flex items-center justify-between">
              <div>
                <p className="font-bold text-xs text-white">Guest Visitor</p>
                <p className="text-[10px] text-slate-300">Sign in to access Escrow & Saved Vehicles</p>
              </div>
              <button
                onClick={() => {
                  onOpenAuth();
                  setMobileMenuOpen(false);
                }}
                className="px-3 py-1.5 bg-[#C85A32] text-white font-bold rounded-xl text-xs"
              >
                Sign In
              </button>
            </div>
          )}

          {/* Group 1: Public Services */}
          {/* Fixed: matches the same simplified, flat list as desktop
              now - removed KAYAD LIVE/Watch Live/Financing (not in
              scope), added the missing Escrow link. */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">
              Public Marketplace
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleNavSelect('marketplace')}
                className={`p-3 rounded-xl font-bold text-xs text-left flex items-center gap-2 ${
                  activeNav === 'marketplace' ? 'bg-[#1E3063] text-white' : 'bg-slate-800/80 text-slate-200'
                }`}
              >
                <Car className="w-4 h-4" />
                <span>Marketplace</span>
              </button>

              <button
                onClick={() => handleNavSelect('discovery')}
                className={`p-3 rounded-xl font-bold text-xs text-left flex items-center gap-2 ${
                  activeNav === 'discovery' ? 'bg-[#1E3063] text-white' : 'bg-slate-800/80 text-slate-200'
                }`}
              >
                <Gavel className="w-4 h-4" />
                <span>Auction</span>
              </button>

              <button
                onClick={() => handleNavSelect('inspections')}
                className={`p-3 rounded-xl font-bold text-xs text-left flex items-center gap-2 ${
                  activeNav === 'inspections' ? 'bg-[#1E3063] text-white' : 'bg-slate-800/80 text-slate-200'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Pre-Purchase Inspection</span>
              </button>

              <button
                onClick={() => handleNavSelect('escrow')}
                className={`p-3 rounded-xl font-bold text-xs text-left flex items-center gap-2 ${
                  activeNav === 'escrow' ? 'bg-[#1E3063] text-white' : 'bg-slate-800/80 text-slate-200'
                }`}
              >
                <Lock className="w-4 h-4 text-blue-400" />
                <span>Escrow</span>
              </button>
            </div>

            <button
              onClick={() => handleNavSelect('support')}
              className="w-full p-2.5 bg-slate-800/80 rounded-xl font-bold text-xs text-left flex items-center gap-2 text-slate-300"
            >
              <HelpCircle className="w-4 h-4 text-slate-400" />
              <span>Support & Disputes</span>
            </button>
          </div>

          {/* Group 2: Authenticated Account & Role Links */}
          {user && (
            <div className="space-y-1 pt-2 border-t border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">
                Account & Dashboards
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleNavSelect('dashboard')}
                  className="p-2.5 bg-slate-800/80 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-2"
                >
                  <LayoutDashboard className="w-4 h-4 text-slate-400" />
                  <span>Dashboard</span>
                </button>

                <button
                  onClick={() => handleNavSelect('chat')}
                  className="p-2.5 bg-slate-800/80 rounded-xl text-xs font-bold text-slate-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-slate-400" />
                    <span>Messages</span>
                  </div>
                  {effectiveUnread > 0 && (
                    <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[9px] font-bold">
                      {effectiveUnread}
                    </span>
                  )}
                </button>
              </div>

              <button onClick={() => handleNavSelect('payments')} className="w-full mt-2 p-2.5 bg-slate-800/80 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-400" />
                <span>Payment History</span>
              </button>

              {/* Role Specific Mobile Links */}
              {user.role === 'dealer' && (
                <div className="p-2.5 bg-slate-800/90 border border-slate-700 rounded-xl space-y-1 mt-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Dealer Tools</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleNavSelect('dealer-dashboard')} className="text-xs font-bold text-slate-200 flex items-center gap-1.5 py-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" /> Dashboard
                    </button>
                    <button onClick={() => handleNavSelect('dealers')} className="text-xs font-bold text-slate-200 flex items-center gap-1.5 py-1">
                      <Layers className="w-3.5 h-3.5 text-slate-400" /> Inventory
                    </button>
                  </div>
                </div>
              )}

              {user.role === 'mechanic' && (
                <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl space-y-1 mt-2">
                  <span className="text-[9px] font-bold text-emerald-400 uppercase block">Mechanic Tools</span>
                  <button onClick={() => handleNavSelect('inspections')} className="text-xs font-bold text-emerald-200 flex items-center gap-1.5 py-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Inspections Portal
                  </button>
                </div>
              )}

              {user.role === 'admin' && (
                <div className="p-2.5 bg-slate-800 border border-slate-700 rounded-xl space-y-1 mt-2">
                  <span className="text-[9px] font-bold text-slate-300 uppercase block">Administrator</span>
                  <button onClick={() => handleNavSelect('admin')} className="text-xs font-bold text-slate-200 flex items-center gap-1.5 py-1">
                    <Lock className="w-3.5 h-3.5 text-slate-400" /> Admin Console
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </header>
  );
};

export default Navbar;
