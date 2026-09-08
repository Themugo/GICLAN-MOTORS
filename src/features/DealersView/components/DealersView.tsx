import React, { useState, useMemo } from 'react';
import { Dealer, Vehicle } from '../../../types';
import { Building2, ShieldCheck, MapPin, Star, ExternalLink, Search, Phone, Mail, CheckCircle2, UserCheck, Sparkles, Filter, Crown } from 'lucide-react';
import { PageHeader, Card, Badge, Button, Input, LazyImage } from '../../../components/ui';
import DealerProfileModal from './DealerProfileModal';
import DealerBusinessView from './DealerBusinessView';

interface DealersViewProps {
  dealers: Dealer[];
  vehicles: Vehicle[];
  onSelectDealerVehicles: (dealerName: string) => void;
  onQuickViewVehicle?: (v: Vehicle) => void;
  onStartEscrow?: (v: Vehicle) => void;
  onAddVehicle?: (v: Vehicle) => void;
}

export const DealersView: React.FC<DealersViewProps> = ({
  dealers,
  vehicles,
  onSelectDealerVehicles,
  onQuickViewVehicle = () => {},
  onStartEscrow = () => {},
  onAddVehicle
}) => {
  const [viewMode, setViewMode] = useState<'platform' | 'directory'>('platform');
  const [dealerSearch, setDealerSearch] = useState<string>('');
  const [selectedCounty, setSelectedCounty] = useState<string>('All');
  const [sellerTypeFilter, setSellerTypeFilter] = useState<'All' | 'Enterprise Dealer' | 'Private Seller'>('All');
  const [activeProfileDealer, setActiveProfileDealer] = useState<Dealer | null>(null);

  const filteredDealers = useMemo(() => {
    return dealers.filter((d) => {
      // Filter seller type
      if (sellerTypeFilter !== 'All') {
        if (sellerTypeFilter === 'Enterprise Dealer' && d.type === 'Private Seller') return false;
        if (sellerTypeFilter === 'Private Seller' && d.type !== 'Private Seller') return false;
      }
      // Filter county
      if (selectedCounty !== 'All' && d.county !== selectedCounty) return false;
      // Filter search
      if (dealerSearch) {
        const q = dealerSearch.toLowerCase().trim();
        return (
          d.name.toLowerCase().includes(q) ||
          d.location.toLowerCase().includes(q) ||
          d.county.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [dealers, dealerSearch, selectedCounty, sellerTypeFilter]);

  return (
    <div className="space-y-6">
      {/* Top View Toggle */}
      <div className="bg-white p-2 rounded-2xl shadow-card border border-slate-200 flex items-center justify-between gap-4 overflow-x-auto">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('platform')}
            className={`px-5 py-3 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'platform'
                ? 'bg-[#1E3063] text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Crown className="w-4 h-4 text-amber-400" />
            <span>Dealer Business Platform & Sales Suite</span>
            <Badge variant="accent" size="sm">MANAGEMENT CONSOLE</Badge>
          </button>

          <button
            onClick={() => setViewMode('directory')}
            className={`px-5 py-3 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'directory'
                ? 'bg-[#1E3063] text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4 text-emerald-500" />
            <span>Public Dealer Directory & Showrooms</span>
          </button>
        </div>
      </div>

      {viewMode === 'platform' ? (
        <DealerBusinessView
          vehicles={vehicles}
          onAddVehicle={onAddVehicle}
          onQuickViewVehicle={onQuickViewVehicle}
          onStartEscrow={onStartEscrow}
        />
      ) : (
        <div className="space-y-6">
          {/* Header Banner */}
          <PageHeader
            badgeIcon={<Building2 className="w-4 h-4 text-amber-500" />}
            badgeText="Verified Seller & Dealership Directory"
            title="Trusted Showrooms & Verified Private Sellers"
            description="Every enterprise dealership and private individual seller on KAYAD is 100% verified with KRA tax compliance, NTSA TIMS logbook audits, and bank-secured Escrow Vault protection."
            rightElement={
              <Badge variant="success" size="md">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> 100% Audited Sellers
              </Badge>
            }
          />

      {/* Seller Type Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'All', label: 'All Verified Sellers', icon: <Sparkles className="w-4 h-4 text-amber-500" /> },
          { id: 'Enterprise Dealer', label: 'Verified Enterprise Dealerships', icon: <Building2 className="w-4 h-4 text-[#1E3063]" /> },
          { id: 'Private Seller', label: 'Verified Private Individual Owners', icon: <UserCheck className="w-4 h-4 text-emerald-600" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSellerTypeFilter(tab.id as any)}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all whitespace-nowrap ${
              sellerTypeFilter === tab.id
                ? 'bg-[#1E3063] text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex-1 w-full">
          <Input
            placeholder="Search dealership, seller name, or yard location (e.g. Crown Motors, Westlands, Nyali)..."
            value={dealerSearch}
            onChange={(e) => setDealerSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-medium bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200 shrink-0">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>County:</span>
          <select
            value={selectedCounty}
            onChange={(e) => setSelectedCounty(e.target.value)}
            className="bg-transparent font-bold text-[#1E3063] focus:outline-none cursor-pointer"
          >
            <option value="All">All Counties</option>
            <option value="Nairobi">Nairobi</option>
            <option value="Mombasa">Mombasa</option>
            <option value="Nakuru">Nakuru</option>
            <option value="Kiambu">Kiambu</option>
          </select>
        </div>
      </div>

      {/* Seller Cards Grid */}
      {filteredDealers.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="font-bold text-slate-700">No verified sellers match your selected criteria</p>
          <p className="text-xs text-slate-500">Try broadening your search or resetting county filters.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setDealerSearch(''); setSelectedCounty('All'); setSellerTypeFilter('All'); }}
          >
            Reset All Filters
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDealers.map((d) => {
            const isPrivate = d.type === 'Private Seller';
            return (
              <Card
                key={d.id}
                className="p-6 flex flex-col justify-between space-y-4 hover:border-amber-400 transition-all border border-slate-200"
              >
                <div className="space-y-3">
                  {/* Logo / Avatar & Rating Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <LazyImage
                      src={d.logo}
                      alt={d.name}
                      wrapperClassName={`w-14 h-14 rounded-2xl border-2 shadow-sm ${
                        isPrivate ? 'border-emerald-300' : 'border-amber-300'
                      }`}
                      className="w-full h-full object-cover"
                    />
                    <Badge variant="warning" size="md">
                      <Star className="w-3.5 h-3.5 fill-current text-amber-600" /> {d.rating} ({d.reviewsCount} reviews)
                    </Badge>
                  </div>

                  {/* Dealer / Seller Title & Distinction */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Badge variant={isPrivate ? "neutral" : "verified"} size="sm">
                        {isPrivate ? (
                          <UserCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                        ) : (
                          <Building2 className="w-3 h-3 text-amber-400 shrink-0" />
                        )}
                        {d.type || (isPrivate ? 'Private Seller' : 'Enterprise Dealer')}
                      </Badge>
                    </div>

                    <h3 className="text-lg font-extrabold text-[#1E3063] font-display">{d.name}</h3>
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" /> {d.location} ({d.county})
                    </p>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {d.badges.map((b, i) => (
                      <Badge key={i} variant="neutral" size="sm">
                        ✓ {b}
                      </Badge>
                    ))}
                  </div>

                  {/* Seller Bio / Description */}
                  {d.description && (
                    <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                      "{d.description}"
                    </p>
                  )}

                  {/* Trust & Response Stats */}
                  <div className="space-y-1 text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <p className="flex items-center gap-1.5 font-medium">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> {d.phone}
                    </p>
                    <p className="flex items-center gap-1.5 font-medium">
                      <Mail className="w-3.5 h-3.5 text-slate-400" /> {d.email}
                    </p>
                    <p className="flex items-center gap-1.5 font-bold text-amber-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Avg Response Time: {d.responseTime || '< 15 mins'}
                    </p>
                  </div>
                </div>

                {/* Footer CTAs */}
                <div className="pt-3 border-t border-slate-100 space-y-3 text-xs">
                  <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-600 font-bold">Showroom Inventory:</span>
                    <span className="font-extrabold text-[#1E3063] bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-md">
                      {d.activeListingsCount} Vehicles
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => setActiveProfileDealer(d)}
                    >
                      <span>View Profile</span>
                    </Button>

                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => onSelectDealerVehicles(d.name)}
                    >
                      <span>Show Stock</span>
                      <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Interactive Dealer Profile Modal */}
      <DealerProfileModal
        dealer={activeProfileDealer}
        allDealers={dealers}
        vehicles={vehicles}
        onClose={() => setActiveProfileDealer(null)}
        onQuickViewVehicle={onQuickViewVehicle}
        onStartEscrow={onStartEscrow}
      />
        </div>
      )}
    </div>
  );
};

export default DealersView;
