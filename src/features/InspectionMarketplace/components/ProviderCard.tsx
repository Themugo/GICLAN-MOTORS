// ============================================================
// KAYAD INSPECTION MARKETPLACE - PROVIDER CARD
// ============================================================

import { motion } from 'framer-motion';
import { Star, MapPin, Clock, Shield, CheckCircle, Car, Zap, ChevronRight } from 'lucide-react';
import type { InspectionProvider } from '../types/inspection';

const KAYAD_COLORS = {
  lightNavy: '#1e3a5f',
  warmBeige: '#f5f0e8',
  white: '#ffffff',
  emerald: '#10b981',
  mutedTerracotta: '#c4a484',
  softBlue: '#64748b',
};

interface ProviderCardProps {
  provider: InspectionProvider;
  onSelect?: (provider: InspectionProvider) => void;
}

export default function ProviderCard({ provider, onSelect }: ProviderCardProps) {
  const {
    companyName,
    logo,
    location,
    stats,
    verification,
    operatingModel,
    specializations,
    experience,
    packages,
  } = provider;

  // Get lowest price from packages
  const lowestPrice = packages?.length
    ? Math.min(...packages.map(p => p.price))
    : (provider.startingPrice ?? null);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="rounded-xl overflow-hidden shadow-md h-full flex flex-col"
      style={{ backgroundColor: KAYAD_COLORS.white }}
    >
      {/* Header with Logo */}
      <div 
        className="h-32 relative"
        style={{ backgroundColor: KAYAD_COLORS.lightNavy }}
      >
        {/* Logo */}
        <div className="absolute -bottom-8 left-4">
          <div 
            className="w-16 h-16 rounded-full border-4 flex items-center justify-center text-xl font-bold"
            style={{ 
              backgroundColor: KAYAD_COLORS.white,
              borderColor: KAYAD_COLORS.warmBeige
            }}
          >
            {logo ? (
              <img 
                src={logo} 
                alt={companyName} 
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span style={{ color: KAYAD_COLORS.lightNavy }}>
                {companyName.charAt(0)}
              </span>
            )}
          </div>
        </div>

        {/* Verification Badge */}
        {verification.status === 'verified' && (
          <div 
            className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}
          >
            <Shield size={12} />
            Verified
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 pt-12 flex-1 flex flex-col">
        {/* Name and Location */}
        <div className="mb-3">
          <h3 
            className="text-lg font-bold mb-1"
            style={{ color: KAYAD_COLORS.lightNavy }}
          >
            {companyName}
          </h3>
          <div 
            className="flex items-center gap-1 text-sm"
            style={{ color: KAYAD_COLORS.softBlue }}
          >
            <MapPin size={14} />
            <span>{location.town}, {location.county}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1">
            <Star 
              size={16} 
              fill={KAYAD_COLORS.mutedTerracotta} 
              color={KAYAD_COLORS.mutedTerracotta} 
            />
            <span 
              className="font-semibold"
              style={{ color: KAYAD_COLORS.lightNavy }}
            >
              {stats.averageRating.toFixed(1)}
            </span>
            <span style={{ color: KAYAD_COLORS.softBlue }}>
              ({stats.totalReviews})
            </span>
          </div>
          <div 
            className="flex items-center gap-1 text-sm"
            style={{ color: KAYAD_COLORS.softBlue }}
          >
            <CheckCircle size={14} className="text-emerald-500" />
            <span>{stats.completedInspections} inspections</span>
          </div>
        </div>

        {/* Specializations */}
        <div className="flex flex-wrap gap-2 mb-4">
          {specializations.electricVehicles && (
            <SpecializationBadge icon={<Zap size={12} />} label="EV" />
          )}
          {specializations.luxuryVehicles && (
            <SpecializationBadge icon={<Car size={12} />} label="Luxury" />
          )}
          {specializations.commercialVehicles && (
            <SpecializationBadge icon={<Car size={12} />} label="Commercial" />
          )}
          {operatingModel.offersMobile && (
            <SpecializationBadge icon={<MapPin size={12} />} label="Mobile" />
          )}
          {operatingModel.sameDayAvailable && (
            <SpecializationBadge icon={<Clock size={12} />} label="Same Day" />
          )}
        </div>

        {/* Experience */}
        <div className="text-sm mb-4" style={{ color: KAYAD_COLORS.softBlue }}>
          {experience.yearsInBusiness > 0 && (
            <span>{experience.yearsInBusiness} years in business</span>
          )}
        </div>

        {/* Price and CTA */}
        <div className="mt-auto pt-4 border-t flex items-center justify-between" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
          <div>
            {lowestPrice && (
              <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
                From
              </p>
            )}
            <p 
              className="text-xl font-bold"
              style={{ color: KAYAD_COLORS.lightNavy }}
            >
              {lowestPrice ? `KES ${lowestPrice.toLocaleString()}` : 'View packages'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelect?.(provider)}
            className="flex items-center gap-1 px-4 py-2 rounded-lg font-medium transition-colors"
            style={{ 
              backgroundColor: KAYAD_COLORS.emerald, 
              color: KAYAD_COLORS.white 
            }}
          >
            View
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function SpecializationBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span 
      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}
    >
      {icon}
      {label}
    </span>
  );
}
