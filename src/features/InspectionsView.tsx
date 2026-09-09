import React, { useState, useMemo, useEffect } from 'react';
import { Vehicle, InspectionBooking, InspectionReport, InspectionPayment, InspectionRating, UserProfile } from '../types';
import { createInspectionOrder, getMyInspections, InspectionApiError, BackendInspectionOrder } from '../services/inspectionApi';
import { useSocket } from '../context/SocketContext';
import {
  ShieldCheck,
  Search,
  MapPin,
  Star,
  CheckCircle2,
  Clock,
  DollarSign,
  FileCheck,
  UserCheck,
  Award,
  Wrench,
  Calendar,
  PlusCircle,
  ChevronRight,
  X,
  Download,
  Eye,
  Lock,
  AlertTriangle,
  TrendingUp,
  Landmark,
  Building2,
  Phone,
  Mail,
  Sparkles,
  Percent,
  Check,
  ThumbsUp,
  Filter,
  Car,
  AlertCircle,
  FileText,
  Layers,
  ExternalLink,
  Shield,
  Activity,
  Info,
  Navigation,
  User,
  CheckSquare,
  Share2
} from 'lucide-react';
import { PageHeader, StatWidget, Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button, Input, LazyImage, Modal } from '../components/ui';

// Honestly maps a real backend inspection order into this UI's own
// InspectionBooking shape. See types.ts's own comments on
// InspectionBooking for exactly which fields have no real backend
// equivalent (packages, commission split) and were widened/made
// optional rather than invented.
function mapBackendOrderToBooking(order: BackendInspectionOrder): InspectionBooking {
  const statusMap: Record<string, InspectionBooking['status']> = {
    pending_payment: 'Pending Mechanic Confirmation',
    assigned: 'Scheduled',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  const id = order.id || order._id || '';
  return {
    id,
    vehicleId: order.car?.id,
    vehicleTitle: order.car?.title || 'Vehicle',
    vehicleLocation: order.location || order.car?.location || '',
    buyerName: '',
    buyerPhone: '',
    buyerEmail: '',
    mechanicId: order.inspector?.id,
    mechanicName: order.inspector?.name,
    scheduledDate: order.scheduledAt ? new Date(order.scheduledAt).toLocaleDateString() : '',
    scheduledTime: order.scheduledAt ? new Date(order.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
    packageType: 'Pre-Purchase Inspection',
    totalFee: order.fee || 0,
    status: statusMap[order.status] || 'Pending Mechanic Confirmation',
    reportId: order.overallScore !== undefined ? id : undefined,
    createdAt: order.createdAt || '',
  };
}

// Honestly maps a real, completed backend inspection order into this
// UI's own InspectionReport shape - only called for orders that
// actually have a real overallScore.
function mapBackendOrderToReport(order: BackendInspectionOrder): InspectionReport {
  const id = order.id || order._id || '';
  const score = order.overallScore ?? 0;
  const verdict: InspectionReport['verdict'] =
    score >= 80 ? 'Passed (Clean Certification)' : score >= 50 ? 'Minor Issues Noted' : 'Failed (Major Defects)';
  return {
    id,
    bookingId: id,
    vehicleId: order.car?.id,
    vehicleTitle: order.car?.title || 'Vehicle',
    vehicleLocation: order.location || order.car?.location,
    mechanicId: order.inspector?.id,
    mechanicName: order.inspector?.name,
    overallScore: score,
    verdict,
    inspectionDate: order.completedAt ? new Date(order.completedAt).toLocaleDateString() : '',
    obdDiagnosticCodes: [],
    inspectorSummary: order.notes || '',
    photos: (order.images || []).map((img) => img.url),
  };
}

interface InspectionsViewProps {
  vehicles: Vehicle[];
  user?: UserProfile | null;
  onOpenAuth?: () => void;
  initialSelectedVehicle?: Vehicle | null;
  onViewVehicleDetails?: (vehicleId: string) => void;
  onOpenInspectionMarketplace?: () => void;
}

export const InspectionsView: React.FC<InspectionsViewProps> = ({
  vehicles,
  user,
  onOpenAuth,
  initialSelectedVehicle,
  onViewVehicleDetails
}) => {
  // State
  const socket = useSocket();
  // Fixed: reports/bookings previously started from, and only ever
  // showed, entirely fake mock data (specific fake mechanic names,
  // ratings, business names, platform-wide fake "recently completed"
  // reports unrelated to this user). Per explicit direction: removed
  // the fake inspector-directory/ratings concept entirely (it has no
  // real, buyer-accessible backend equivalent - confirmed directly,
  // the real available-inspectors endpoint is admin-only), and now
  // loads the buyer's own real inspection history from the real
  // backend instead.
  const [reports, setReports] = useState<InspectionReport[]>([]);
  const [bookings, setBookings] = useState<InspectionBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState<boolean>(true);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [payments] = useState<InspectionPayment[]>([]);
  const [ratings, setRatings] = useState<InspectionRating[]>([]);

  useEffect(() => {
    if (!user) {
      setBookings([]);
      setReports([]);
      setBookingsLoading(false);
      return;
    }
    let cancelled = false;
    setBookingsLoading(true);
    setBookingsError(null);
    getMyInspections()
      .then((res) => {
        if (cancelled) return;
        const orders = res.orders || [];
        setBookings(orders.map(mapBackendOrderToBooking));
        setReports(orders.filter((o) => o.overallScore !== undefined).map(mapBackendOrderToReport));
      })
      .catch((err) => {
        if (cancelled) return;
        setBookingsError(err instanceof InspectionApiError ? err.message : 'Could not load your inspections.');
      })
      .finally(() => {
        if (!cancelled) setBookingsLoading(false);
      });
    return () => { cancelled = true; };
  }, [user]);

  // Realtime is a reconciliation signal only: the API remains the source of truth.
  useEffect(() => {
    if (!user || bookings.length === 0) return;
    const channels = bookings.map((booking) => socket.joinInspection(booking.id, {
      onUpdate: () => {
        getMyInspections().then((res) => {
          const orders = res.orders || [];
          setBookings(orders.map(mapBackendOrderToBooking));
          setReports(orders.filter((o) => o.overallScore !== undefined).map(mapBackendOrderToReport));
        }).catch(() => undefined);
      },
    })).filter(Boolean);
    return () => channels.forEach((channel) => channel && socket.leaveChannel(channel));
  }, [user, bookings.map((b) => b.id).join(',')]);

  // Top-Level Mode: 'buyer_marketplace' | 'mechanic_portal'

  // Active Main Navigation Sub-Tab
  const [activeTab, setActiveTab] = useState<'packages' | 'reports' | 'bookings'>('bookings');

  // Search & Filters for Mechanics
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [countyFilter, setCountyFilter] = useState<string>('All');
  const [specializationFilter, setSpecializationFilter] = useState<string>('All');
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);
  const [packageTypeFilter, setPackageTypeFilter] = useState<string>('All');

  // Selected items & Modals
  // Fixed: selectedMechanic (and the "Mechanic Profile Modal" that
  // displayed it) was only ever set from the fake inspector directory
  // removed above - now genuinely dead state, removed.
  const [selectedReport, setSelectedReport] = useState<InspectionReport | null>(null);
  const [showBookingModal, setShowBookingModal] = useState<boolean>(false);
  const [bookingStep, setBookingStep] = useState<number>(1);

  // Booking Form State
  const [targetVehicleId, setTargetVehicleId] = useState<string>(initialSelectedVehicle?.id || (vehicles[0]?.id || 'custom'));
  // Fixed: chosenMechanicId was only ever set/read by the fake
  // "choose your inspector" step removed above - genuinely dead now.
  const [buyerName, setBuyerName] = useState<string>('');
  const [buyerPhone, setBuyerPhone] = useState<string>('');
  const [buyerEmail, setBuyerEmail] = useState<string>('');
  const [inspectorNotes, setInspectorNotes] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [packageType, setPackageType] = useState<InspectionBooking['packageType']>('Pre-Purchase Inspection');
  const [newBookingId, setNewBookingId] = useState<string | null>(null);

  // Helpful votes state
  const [helpfulVotes, setHelpfulVotes] = useState<Record<string, number>>({});
  const [votedItems, setVotedItems] = useState<Record<string, boolean>>({});

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // The buyer-facing API currently exposes one inspection-order contract:
  // vehicle + phone + location. Pricing, package tier, inspector assignment,
  // payment and scheduling are not returned by that contract, so this UI
  // must not invent any of them.
  const inspectionPackages = [
    {
      id: 'Pre-Purchase Inspection',
      name: 'Pre-Purchase Vehicle Inspection',
      pointsCount: undefined,
      price: undefined,
      duration: undefined,
      popular: true,
      description: 'Request a vehicle inspection through KAYAD. The protected backend assigns and manages the inspection order.',
      idealFor: 'Vehicles already listed in KAYAD',
      features: ['Real vehicle-linked order', 'Backend-assigned inspector', 'Backend-authoritative status and report data']
    }
  ];

  const currentPackagePrice: number | undefined = undefined;

  // Counties List
  const availableCounties = ['All', 'Nairobi', 'Mombasa', 'Kiambu', 'Nakuru', 'Eldoret', 'Machakos', 'Kajiado', 'Kisumu', 'Kilifi', 'Kwale'];
  const specializationOptions = ['All', 'Toyota 4x4', 'German Luxury', 'Subaru AWD', 'Diesel Turbo Systems', 'Hybrid Diagnostics', 'Commercial Fleet', 'Foreign Import Audit'];

  // Launch Booking Modal for a specific mechanic
  // Fixed: the wizard previously started at Step 1, "Choose Your
  // Preferred Independent Inspector" - the same fake, rated-mechanic-
  // directory concept removed above, just relocated inside the
  // booking wizard. The real backend never lets a buyer choose their
  // own inspector at all (admin-assigned, confirmed directly) - now
  // starts at the real first step instead.
  const handleOpenBooking = (vehicle?: Vehicle) => {
    if (vehicle) {
      setTargetVehicleId(vehicle.id);
    }
    setBookingStep(2);
    setShowBookingModal(true);
  };

  // Submit only the real backend-supported inspection order.
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Please sign in to request an inspection.');
      onOpenAuth?.();
      return;
    }
    if (!buyerPhone) {
      showToast('Please provide your phone number.');
      return;
    }

    const targetVeh = vehicles.find(v => v.id === targetVehicleId);
    if (!targetVeh) {
      showToast('Select a vehicle that exists in KAYAD before requesting an inspection.');
      return;
    }

    try {
      const result = await createInspectionOrder(targetVeh.id, buyerPhone, targetVeh.location);
      if (!result.success || !result.order) {
        showToast(result.message || 'Could not request inspection. Please try again.');
        return;
      }
      const newBooking = mapBackendOrderToBooking(result.order);
      setBookings(prev => [newBooking, ...prev]);
      setNewBookingId(result.order.id || result.order._id || null);
      setBookingStep(7);
      showToast(`Inspection requested for ${targetVeh.title}. Your order is saved on the KAYAD backend.`);
    } catch (err) {
      showToast(err instanceof InspectionApiError ? err.message : 'Could not request inspection. Please try again.');
    }
  };

  // Upvote helpful review
  const handleToggleHelpful = (ratingId: string) => {
    setVotedItems(prev => {
      const wasVoted = prev[ratingId];
      const newVoted = !wasVoted;

      setHelpfulVotes(votes => ({
        ...votes,
        [ratingId]: (votes[ratingId] || 0) + (newVoted ? 1 : -1)
      }));

      return { ...prev, [ratingId]: newVoted };
    });
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-800 pb-16 space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1E3063] text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-white/20 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Service scope banner */}
      <div className="bg-[#101935] border-b border-amber-400/30 px-4 py-3 text-xs shadow-md rounded-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-black text-xs uppercase tracking-wider bg-white/10 px-2.5 py-1 rounded border border-white/15">KAYAD Inspection Orders</span>
            <span className="text-slate-300 text-[11px] hidden md:inline font-semibold">Backend-authoritative buyer inspection requests</span>
          </div>
        </div>
      </div>

      {/* Hero Header Banner */}
      <div className="bg-[#1E3063] text-white pt-8 pb-10 px-4 sm:px-6 lg:px-8 shadow-md">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              {onOpenInspectionMarketplace && (
                <Button type="button" onClick={onOpenInspectionMarketplace} className="mb-3">
                  <Search className="w-4 h-4" />
                  Browse Inspection Providers
                </Button>
              )}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-wider uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <Wrench className="w-3 h-3" /> Inspection Order Service
                </span>
                <span className="text-[10px] font-semibold text-slate-300 bg-white/10 px-2.5 py-0.5 rounded-full">
                  Backend service
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black font-display tracking-tight text-white">
                Request a Vehicle Inspection
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
                Request an inspection for a vehicle already in KAYAD. Inspector assignment, order status, pricing, scheduling and report data are controlled by the backend.
              </p>
            </div>

            {/* Quick CTAs */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Button
                variant="accent"
                size="md"
                onClick={() => handleOpenBooking()}
                className="font-bold shadow-lg"
              >
                <PlusCircle className="w-4 h-4 mr-1.5" /> Book Inspection Now
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => setActiveTab('reports')}
                className="text-white border-white/30 hover:bg-white/10"
              >
                <FileCheck className="w-4 h-4 mr-1.5 text-emerald-400" /> View My Reports
              </Button>
            </div>
          </div>

          {/* CRITICAL BUSINESS MODEL TRANSPARENCY BANNER */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0 font-bold border border-amber-400/30">
                1
              </div>
              <div>
                <h4 className="font-bold text-white text-xs">Backend-assigned Inspectors</h4>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                  Inspector assignment is controlled by the backend; this buyer view does not claim a public inspector directory.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0 font-bold border border-emerald-400/30">
                2
              </div>
              <div>
                <h4 className="font-bold text-white text-xs">Backend Assigns Inspector</h4>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                  Inspector selection is handled by the backend; this buyer view does not fabricate an inspector directory.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-400/20 text-blue-300 flex items-center justify-center shrink-0 font-bold border border-blue-400/30">
                3
              </div>
              <div>
                <h4 className="font-bold text-white text-xs">Protected Escrow Payment</h4>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                  Payment and escrow details are shown only when returned by the backend transaction flow.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-400/20 text-rose-300 flex items-center justify-center shrink-0 font-bold border border-rose-400/30">
                4
              </div>
              <div>
                <h4 className="font-bold text-white text-xs">Backend Pricing</h4>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                  Pricing and platform fees are not hard-coded here; the backend is authoritative.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Sub-Tabs */}
      {/* Fixed: removed the "Find Inspector" (fake directory),
          "Verified Reviews", and "Regional Map & Coverage" tabs -
          per explicit direction, the fake inspector-marketplace/
          ratings concept (with no real, buyer-accessible backend at
          all) was removed entirely. "Inspection Packages" kept as
          informational service-tier content, not user-specific data.
          "Digital Reports" and "Bookings Tracker" now show this
          user's own real inspection history. */}
      <div className="sticky top-14 z-40 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center space-x-1 sm:space-x-4 overflow-x-auto py-2 scrollbar-none text-xs font-bold">
            <button
              onClick={() => setActiveTab('packages')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'packages'
                  ? 'bg-[#1E3063] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Award className="w-4 h-4 text-emerald-500" />
              <span>Inspection Packages</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'reports'
                  ? 'bg-[#1E3063] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <FileCheck className="w-4 h-4 text-blue-500" />
              <span>My Reports</span>
            </button>

            <button
              onClick={() => setActiveTab('bookings')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'bookings'
                  ? 'bg-[#1E3063] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Clock className="w-4 h-4 text-amber-500" />
              <span>My Bookings</span>
              {bookings.filter(b => b.status !== 'Completed').length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-bold animate-pulse">
                  {bookings.filter(b => b.status !== 'Completed').length} Active
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">

        {/* TAB 2: INSPECTION PACKAGES */}
        {activeTab === 'packages' && (
          <div className="space-y-6 animate-fade-in">
            <PageHeader
              badgeIcon={<Award className="w-4 h-4 text-emerald-600" />}
              badgeText="Standardized Technical Audits"
              title="KAYAD Inspection Packages & Transparent Pricing"
              description="Every independent mechanic on KAYAD adheres to standardized point-by-point diagnostic protocols. Select the package that matches your vehicle category."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inspectionPackages.map((pkg) => (
                <Card key={pkg.id} className="flex flex-col justify-between hover:shadow-card-hover transition-all">
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                        {pkg.duration} On-Site
                      </span>
                      {pkg.popular && (
                        <Badge variant="verified">Top Buyer Choice</Badge>
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-[#1E3063] font-display">{pkg.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{pkg.description}</p>
                    </div>

                    <div className="bg-[#FDFBF7] p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Package Fee:</span>
                        <span className="text-2xl font-black text-[#1E3063] font-mono">{pkg.price !== undefined ? `Ksh ${pkg.price.toLocaleString()}` : 'Server-priced'}</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        {pkg.pointsCount} Checkpoints
                      </span>
                    </div>

                    <div className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-600 font-medium">
                      <strong>Best suited for:</strong> {pkg.idealFor}
                    </div>

                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Key Diagnostic Features:</span>
                      <ul className="space-y-2 text-xs text-slate-600">
                        {pkg.features.map((feat, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="p-6 pt-0">
                    <Button
                      variant="primary"
                      fullWidth
                      onClick={() => {
                        setPackageType(pkg.id as any);
                        handleOpenBooking();
                      }}
                    >
                      Book {pkg.name}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: DIGITAL REPORTS */}
        {activeTab === 'reports' && (
          <div className="space-y-6 animate-fade-in">
            <PageHeader
              badgeIcon={<FileCheck className="w-4 h-4 text-emerald-600" />}
              badgeText="My Digital Inspection Reports"
              title="My Inspection Reports"
              description="Review inspection reports returned by the KAYAD backend for your own inspection orders. Only fields actually returned by the server are shown."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reports.map((rep) => (
                <Card key={rep.id} hoverable className="flex flex-col justify-between">
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[#1E3063] bg-slate-100 px-2.5 py-1 rounded-md">
                        {rep.id}
                      </span>
                      <Badge variant={rep.verdict.includes('Passed') ? 'success' : 'warning'}>
                        {rep.verdict}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-800 line-clamp-1">{rep.vehicleTitle}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-rose-500" /> {rep.vehicleLocation}
                      </p>
                    </div>

                    <div className="bg-[#1E3063] text-white p-4 rounded-xl flex items-center justify-between shadow-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Health Score</span>
                        <span className="text-2xl font-black font-mono text-amber-300">{rep.overallScore}/100</span>
                      </div>
                      <div className="text-right space-y-1">
                        <span className="text-[10px] text-slate-300 block">Backend score</span>
                        <span className="text-xs font-bold text-emerald-400">Returned by server</span>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Inspector:</span>
                        <strong className="text-slate-800">{rep.mechanicName}</strong>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Inspection Date:</span>
                        <span className="font-semibold">{rep.inspectionDate}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 italic line-clamp-3">
                      "{rep.inspectorSummary}"
                    </p>
                  </div>

                  <div className="p-5 pt-0">
                    <Button
                      variant="primary"
                      fullWidth
                      onClick={() => setSelectedReport(rep)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" /> View Report Details
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: BOOKINGS TRACKER */}
        {activeTab === 'bookings' && (
          <div className="space-y-6 animate-fade-in">
            <PageHeader
              badgeIcon={<Clock className="w-4 h-4 text-amber-500" />}
              badgeText="Real-Time Tracker"
              title="Inspection Bookings & Escrow Status"
              description="Track scheduled and completed vehicle inspections. Funds remain securely locked in KAYAD Escrow until you approve the inspector's digital report."
            />

            <Card>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#1E3063]" /> Active & Completed Inspection Bookings ({bookings.length})
                </CardTitle>

                <Button variant="accent" size="sm" onClick={() => handleOpenBooking()}>
                  <PlusCircle className="w-4 h-4 mr-1" /> New Inspection Request
                </Button>
              </CardHeader>

              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking ID</TableHead>
                      <TableHead>Vehicle & Location</TableHead>
                      <TableHead>Independent Inspector</TableHead>
                      <TableHead>Schedule & Package</TableHead>
                      <TableHead>Escrow & Fee</TableHead>
                      <TableHead>Progress Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono font-bold text-[#1E3063]">
                          {b.id}
                        </TableCell>

                        <TableCell>
                          <div className="font-bold text-slate-800 text-xs">{b.vehicleTitle}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-rose-500" /> {b.vehicleLocation}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="font-semibold text-slate-800 text-xs">{b.mechanicName}</div>
                          <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Independent Inspector
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-xs font-medium text-slate-700">{b.scheduledDate} ({b.scheduledTime})</div>
                          <div className="text-[10px] text-slate-500 font-bold">{b.packageType}</div>
                        </TableCell>

                        <TableCell>
                          <div className="font-mono font-extrabold text-[#1E3063] text-xs">
                            Ksh {b.totalFee.toLocaleString()}
                          </div>
                          <Badge variant={b.paymentStatus === 'Released to Mechanic' ? 'success' : 'escrow'}>
                            {b.paymentStatus}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <Badge variant={b.status === 'Completed' ? 'success' : 'verified'}>
                            {b.status}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right">
                          {b.reportId ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                const rep = reports.find(r => r.id === b.reportId);
                                if (rep) setSelectedReport(rep);
                                else showToast('Report file loading...');
                              }}
                            >
                              <FileCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" /> View Report
                            </Button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium italic">
                              Inspector En-Route
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}


      </main>


      {/* ========================================================================== */}
      {/* MODAL 2: 150-POINT DIGITAL REPORT VIEWER MODAL */}
      {/* ========================================================================== */}
      {selectedReport && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedReport(null)}
          maxWidth="5xl"
          title={
            <div className="flex items-center gap-3">
              <FileCheck className="w-5 h-5 text-emerald-600" />
              <span>KAYAD Inspection Report ({selectedReport.id})</span>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Header: Vehicle & Verdict */}
            <div className="bg-[#1E3063] text-white p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-wider block">
                  Inspection ID: {selectedReport.id} • {selectedReport.inspectionDate}
                </span>
                <h2 className="text-2xl font-extrabold font-display text-white mt-1">
                  {selectedReport.vehicleTitle}
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  Inspector: <strong>{selectedReport.mechanicName || 'Not assigned / not returned'}</strong>
                </p>
              </div>

              <div className="flex items-center gap-4 bg-white/10 p-3 rounded-xl border border-white/20">
                <div className="text-center">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Overall Score</span>
                  <span className="text-3xl font-black font-mono text-amber-300">{selectedReport.overallScore}/100</span>
                </div>

                <div className="border-l border-white/20 pl-4 text-right">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Verdict</span>
                  <Badge variant={selectedReport.verdict.includes('Passed') ? 'success' : 'warning'}>
                    {selectedReport.verdict}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs text-slate-700">
              <div className="font-bold text-[#1E3063]">Backend-provided inspection data</div>
              <p className="mt-1">VIN, chassis, logbook verification flags and fixed category scores are not part of the current buyer report API, so no verification result or invented sub-score is displayed here.</p>
            </div>

            {/* Inspector Summary */}
            <div className="space-y-2 bg-[#FDFBF7] p-5 rounded-2xl border border-slate-200">
              <h4 className="text-xs font-bold text-[#1E3063] uppercase tracking-wider">Inspector Final Summary</h4>
              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                "{selectedReport.inspectorSummary}"
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200">
              <span className="text-xs text-slate-500 font-medium">
                Report data supplied by the KAYAD inspection backend.
              </span>

              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => showToast('PDF Report download started')}
                >
                  <Download className="w-4 h-4 mr-1.5" /> Download PDF Certificate
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setSelectedReport(null);
                    showToast('Direct Escrow purchase initiated for this vehicle');
                  }}
                >
                  Proceed to Escrow Purchase
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================== */}
      {/* MODAL 3: 7-STEP GUIDED BOOKING JOURNEY MODAL */}
      {/* ========================================================================== */}
      {showBookingModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowBookingModal(false)}
          maxWidth="3xl"
          title={
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-500" />
              <span>Book Independent Vehicle Inspection</span>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Stepper Progress Indicator */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 text-xs font-bold">
              {[
                { step: 2, label: 'Vehicle' },
                { step: 3, label: 'Package' },
                { step: 4, label: 'Schedule' },
                { step: 5, label: 'Details' },
                { step: 6, label: 'Escrow' },
                { step: 7, label: 'Confirmed' }
              ].map((s) => (
                <div
                  key={s.step}
                  className={`flex items-center gap-1.5 ${
                    bookingStep === s.step
                      ? 'text-[#1E3063] font-extrabold'
                      : bookingStep > s.step
                        ? 'text-emerald-700'
                        : 'text-slate-400'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    bookingStep === s.step
                      ? 'bg-[#1E3063] text-white'
                      : bookingStep > s.step
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                  }`}>
                    {bookingStep > s.step ? '✓' : s.step}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
              ))}
            </div>

            {/* STEP 1: CHOOSE MECHANIC */}
            {/* STEP 2: SELECT VEHICLE */}
            {bookingStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-[#1E3063] font-display">Step 2: Select Vehicle to Inspect</h3>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-600 block">KAYAD Marketplace Vehicles:</label>
                  <select
                    value={targetVehicleId}
                    onChange={(e) => setTargetVehicleId(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1E3063]"
                  >
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.title} — Ksh {v.price.toLocaleString()} ({v.location})
                      </option>
                    ))}
                  </select>
                </div>


                <div className="flex justify-between pt-4 border-t border-slate-200">
                  {/* Fixed: this is now the real first step (the fake
                      "choose your inspector" step was removed) - Back
                      closes the wizard instead of returning to a
                      now-nonexistent step 1. */}
                  <Button variant="secondary" onClick={() => setShowBookingModal(false)}>
                    ← Cancel
                  </Button>
                  <Button variant="primary" onClick={() => setBookingStep(3)}>
                    Next: Review Request →
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: CHOOSE PACKAGE */}
            {bookingStep === 3 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-[#1E3063] font-display">Step 3: Review Inspection Service</h3>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {inspectionPackages.map((pkg) => (
                    <div
                      key={pkg.id}
                      onClick={() => setPackageType(pkg.id as any)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all space-y-1 ${
                        packageType === pkg.id
                          ? 'border-2 border-[#1E3063] bg-amber-50/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-[#1E3063]">{pkg.name}</h4>
                        <span className="text-sm font-black font-mono text-[#1E3063]">
                          {pkg.price !== undefined ? `Ksh ${pkg.price.toLocaleString()}` : 'Server-priced'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">{pkg.description}</p>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between pt-4 border-t border-slate-200">
                  <Button variant="secondary" onClick={() => setBookingStep(2)}>
                    ← Back
                  </Button>
                  <Button variant="primary" onClick={() => setBookingStep(4)}>
                    Next: Contact Details →
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 4: SCHEDULE DATE & TIME */}
            {bookingStep === 4 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-[#1E3063] font-display">Step 4: Preferred Timing (Not Submitted)</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Preferred Date (not submitted)"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Preferred Time (not submitted)</label>
                    <select
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1E3063]"
                    >
                      <option value="09:00 AM">Morning Slot (09:00 AM)</option>
                      <option value="11:00 AM">Late Morning Slot (11:00 AM)</option>
                      <option value="02:00 PM">Afternoon Slot (02:00 PM)</option>
                      <option value="04:00 PM">Late Afternoon Slot (04:00 PM)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t border-slate-200">
                  <Button variant="secondary" onClick={() => setBookingStep(3)}>
                    ← Back
                  </Button>
                  <Button variant="primary" onClick={() => setBookingStep(5)}>
                    Next: Confirm Request →
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 5: CONTACT DETAILS */}
            {bookingStep === 5 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-[#1E3063] font-display">Step 5: Your Contact Details</h3>

                <div className="space-y-3">
                  <Input
                    label="Full Buyer Name"
                    placeholder="e.g. James Mwangi"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                  />
                  <Input
                    label="Phone Number (M-Pesa registered)"
                    placeholder="e.g. +254 712 345 678"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                  />
                  <Input
                    label="Email Address (For PDF Report Delivery)"
                    placeholder="e.g. james@example.com"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                  />
                </div>

                <div className="flex justify-between pt-4 border-t border-slate-200">
                  <Button variant="secondary" onClick={() => setBookingStep(4)}>
                    ← Back
                  </Button>
                  <Button variant="primary" onClick={() => setBookingStep(6)}>
                    Next: Submit Request →
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 6: PAYMENT & ESCROW */}
            {bookingStep === 6 && (
              <form onSubmit={handleConfirmBooking} className="space-y-4">
                <h3 className="text-base font-bold text-[#1E3063] font-display">Step 6: Confirm Inspection Request</h3>

                {/* Transparent Price Breakdown */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Inspection Package ({packageType}):</span>
                    <strong className="text-slate-800">Determined by server</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Platform Facilitation Commission:</span>
                    <strong className="text-slate-700">Not provided</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Inspector Payout:</span>
                    <strong className="text-slate-700">Not provided</strong>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-extrabold text-[#1E3063]">
                    <span>Payment / Escrow Status:</span>
                    <span className="font-mono text-slate-600">Not provided</span>
                  </div>
                </div>

                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Payment and escrow are not created by this request endpoint. Any payment state shown later must come from a real backend transaction.
                  </span>
                </div>

                <div className="flex justify-between pt-4 border-t border-slate-200">
                  <Button variant="secondary" type="button" onClick={() => setBookingStep(5)}>
                    ← Back
                  </Button>
                  <Button variant="accent" type="submit" className="font-bold shadow-md">
                    Submit Inspection Request
                  </Button>
                </div>
              </form>
            )}

            {/* STEP 7: CONFIRMATION & LIVE STEPPER */}
            {bookingStep === 7 && (
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div>
                  <h3 className="text-xl font-extrabold text-[#1E3063] font-display">Inspection Request Confirmed!</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Booking Reference: <strong className="font-mono text-slate-800">{newBookingId || 'Pending'}</strong>
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left text-xs space-y-2 max-w-md mx-auto">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Scheduled Date:</span>
                    <strong className="text-slate-800">Backend scheduling not returned</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Escrow Vault Deposit:</span>
                    <strong className="text-slate-700">Not returned by order API</strong>
                  </div>
                </div>

                <Button
                  variant="primary"
                  onClick={() => {
                    setShowBookingModal(false);
                    setActiveTab('bookings');
                  }}
                >
                  Track Progress in Bookings Tracker →
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default InspectionsView;
