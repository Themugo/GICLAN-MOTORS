// ============================================================
// KAYAD INSPECTION MARKETPLACE - BOOKING FLOW
// ============================================================

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Calendar,
  Clock,
  MapPin,
  Car,
  User,
  CreditCard,
  FileText,
} from 'lucide-react';
import { inspectionApi } from '../services/api';
import type {
  InspectionProvider,
  InspectionPackage,
  TimeSlot,
  InspectionType
} from '../types/inspection';
import { INSPECTION_TYPES } from '../types/inspection';

const KAYAD_COLORS = {
  lightNavy: '#1e3a5f',
  warmBeige: '#f5f0e8',
  white: '#ffffff',
  emerald: '#10b981',
  mutedTerracotta: '#c4a484',
  softBlue: '#64748b',
};

interface BookingFlowProps {
  provider: InspectionProvider;
  onComplete?: (bookingId: string) => void;
  onCancel?: () => void;
}

const STEPS = [
  { id: 'vehicle', title: 'Vehicle Details', icon: Car },
  { id: 'package', title: 'Select Package', icon: FileText },
  { id: 'schedule', title: 'Schedule', icon: Calendar },
  { id: 'location', title: 'Location', icon: MapPin },
  { id: 'confirm', title: 'Confirm', icon: User },
  { id: 'payment', title: 'Payment', icon: CreditCard },
];

export default function BookingFlow({ provider, onComplete, onCancel }: BookingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);

  const [formData, setFormData] = useState({
    // Vehicle
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: new Date().getFullYear(),
    vehicleRegistration: '',
    vehicleVin: '',
    vehicleType: 'cars',

    // Package
    selectedPackage: null as InspectionPackage | null,
    inspectionType: '' as InspectionType | '',

    // Schedule
    selectedDate: '',
    selectedTime: '',
    selectedStaff: '',

    // Location
    isMobile: true,
    county: provider.location.county,
    town: provider.location.town,
    inspectionAddress: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,

    // Seller
    sellerName: '',
    sellerPhone: '',
    sellerIsDealer: false,

    // Customer
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    notes: '',
  });

  // Fetch available slots when date changes
  useEffect(() => {
    if (formData.selectedDate && provider.id) {
      fetchSlots();
    }
  }, [formData.selectedDate, provider.id]);

  const fetchSlots = async () => {
    setLoading(true);
    try {
      const result = await inspectionApi.getAvailableSlots(provider.id, formData.selectedDate);
      setAvailableSlots(result.slots);
    } catch (error) {
      console.error('Failed to fetch slots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const booking = await inspectionApi.createBooking({
        packageId: formData.selectedPackage!.id,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        vehicleMake: formData.vehicleMake,
        vehicleModel: formData.vehicleModel,
        vehicleYear: formData.vehicleYear,
        vehicleRegistration: formData.vehicleRegistration,
        vehicleVin: formData.vehicleVin,
        vehicleType: formData.vehicleType,
        county: formData.county,
        town: formData.town,
        inspectionAddress: formData.inspectionAddress,
        latitude: formData.latitude,
        longitude: formData.longitude,
        isMobile: formData.isMobile,
        sellerName: formData.sellerName,
        sellerPhone: formData.sellerPhone,
        sellerIsDealer: formData.sellerIsDealer,
        scheduledDate: formData.selectedDate,
        scheduledTime: formData.selectedTime,
        staffId: formData.selectedStaff,
        notes: formData.notes,
      });
      onComplete?.(booking.id);
    } catch (error) {
      console.error('Booking failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Vehicle
        return formData.vehicleMake && formData.vehicleModel && formData.vehicleYear;
      case 1: // Package
        return formData.selectedPackage;
      case 2: // Schedule
        return formData.selectedDate && formData.selectedTime;
      case 3: // Location
        return formData.inspectionAddress;
      case 4: // Confirm
        return formData.customerName && formData.customerEmail && formData.customerPhone;
      case 5: // Payment
        return true;
      default:
        return false;
    }
  };

  // Calculate total price
  const totalPrice = formData.selectedPackage
    ? formData.selectedPackage.price + (formData.isMobile ? (provider.operatingModel.mobileFee || 0) : 0)
    : 0;

  return (
    <div className="min-h-screen" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 py-4 px-6 shadow-md"
        style={{ backgroundColor: KAYAD_COLORS.white }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <button
              onClick={onCancel}
              className="flex items-center gap-2"
              style={{ color: KAYAD_COLORS.softBlue }}
            >
              <ArrowLeft size={20} />
              Back
            </button>
            <h1
              className="text-lg font-semibold"
              style={{ color: KAYAD_COLORS.lightNavy }}
            >
              Book Inspection
            </h1>
            <div />
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mt-4">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index < currentStep
                      ? 'text-white'
                      : index === currentStep
                        ? 'text-white'
                        : ''
                  }`}
                  style={{
                    backgroundColor:
                      index < currentStep
                        ? KAYAD_COLORS.emerald
                        : index === currentStep
                          ? KAYAD_COLORS.lightNavy
                          : KAYAD_COLORS.warmBeige,
                    color:
                      index < currentStep || index === currentStep
                        ? KAYAD_COLORS.white
                        : KAYAD_COLORS.softBlue,
                  }}
                >
                  {index < currentStep ? <Check size={16} /> : index + 1}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className="w-8 h-0.5 mx-1"
                    style={{
                      backgroundColor:
                        index < currentStep
                          ? KAYAD_COLORS.emerald
                          : KAYAD_COLORS.warmBeige,
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Step Content */}
            {currentStep === 0 && (
              <VehicleStep
                formData={formData}
                onChange={setFormData}
              />
            )}
            {currentStep === 1 && (
              <PackageStep
                provider={provider}
                formData={formData}
                onChange={setFormData}
              />
            )}
            {currentStep === 2 && (
              <ScheduleStep
                availableSlots={availableSlots}
                loading={loading}
                formData={formData}
                onChange={setFormData}
              />
            )}
            {currentStep === 3 && (
              <LocationStep
                provider={provider}
                formData={formData}
                onChange={setFormData}
              />
            )}
            {currentStep === 4 && (
              <ConfirmStep
                provider={provider}
                formData={formData}
                totalPrice={totalPrice}
                onChange={setFormData}
              />
            )}
            {currentStep === 5 && (
              <PaymentStep
                formData={formData}
                totalPrice={totalPrice}
                onSubmit={handleSubmit}
                loading={loading}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <div className="flex justify-between mt-8 pt-6 border-t" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className="px-6 py-3 rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
            style={{
              backgroundColor: KAYAD_COLORS.white,
              color: KAYAD_COLORS.lightNavy
            }}
          >
            <ArrowLeft size={16} />
            Back
          </button>

          {currentStep < STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="px-6 py-3 rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
              style={{
                backgroundColor: canProceed() ? KAYAD_COLORS.emerald : KAYAD_COLORS.softBlue,
                color: KAYAD_COLORS.white
              }}
            >
              Continue
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-3 rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
              style={{
                backgroundColor: KAYAD_COLORS.emerald,
                color: KAYAD_COLORS.white
              }}
            >
              {loading ? 'Processing...' : `Pay KES ${totalPrice.toLocaleString()}`}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

// Step Components
function VehicleStep({ formData, onChange }: any) {
  return (
    <div className="rounded-xl p-6" style={{ backgroundColor: KAYAD_COLORS.white }}>
      <h2 className="text-xl font-bold mb-6" style={{ color: KAYAD_COLORS.lightNavy }}>
        Vehicle Details
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput
          label="Make *"
          value={formData.vehicleMake}
          onChange={(v) => onChange({ ...formData, vehicleMake: v })}
          placeholder="e.g., Toyota"
        />
        <FormInput
          label="Model *"
          value={formData.vehicleModel}
          onChange={(v) => onChange({ ...formData, vehicleModel: v })}
          placeholder="e.g., Corolla"
        />
        <FormInput
          label="Year *"
          type="number"
          value={formData.vehicleYear}
          onChange={(v) => onChange({ ...formData, vehicleYear: parseInt(v) })}
        />
        <FormInput
          label="Registration"
          value={formData.vehicleRegistration}
          onChange={(v) => onChange({ ...formData, vehicleRegistration: v })}
          placeholder="e.g., KBZ 123A"
        />
        <FormInput
          label="VIN (optional)"
          value={formData.vehicleVin}
          onChange={(v) => onChange({ ...formData, vehicleVin: v })}
          placeholder="17 digits"
        />
      </div>
    </div>
  );
}

function PackageStep({ provider, formData, onChange }: any) {
  return (
    <div className="rounded-xl p-6" style={{ backgroundColor: KAYAD_COLORS.white }}>
      <h2 className="text-xl font-bold mb-6" style={{ color: KAYAD_COLORS.lightNavy }}>
        Select Inspection Package
      </h2>

      <div className="space-y-4">
        {provider.packages?.map((pkg) => (
          <div
            key={pkg.id}
            onClick={() => onChange({ ...formData, selectedPackage: pkg })}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              formData.selectedPackage?.id === pkg.id
                ? 'border-emerald-500'
                : 'border-transparent'
            }`}
            style={{ backgroundColor: KAYAD_COLORS.warmBeige }}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>
                  {pkg.name}
                </h3>
                <p className="text-sm mt-1" style={{ color: KAYAD_COLORS.softBlue }}>
                  {pkg.description}
                </p>
                <div className="flex gap-2 mt-2">
                  <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: KAYAD_COLORS.white }}>
                    {pkg.inspectionPoints} points
                  </span>
                  <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: KAYAD_COLORS.white }}>
                    {pkg.duration} min
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold" style={{ color: KAYAD_COLORS.emerald }}>
                  KES {pkg.price.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScheduleStep({ availableSlots, loading, formData, onChange }: any) {
  // Generate next 14 days
  const dates = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return {
      value: date.toISOString().split('T')[0],
      label: date.toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' }),
    };
  });

  return (
    <div className="rounded-xl p-6" style={{ backgroundColor: KAYAD_COLORS.white }}>
      <h2 className="text-xl font-bold mb-6" style={{ color: KAYAD_COLORS.lightNavy }}>
        Choose Date & Time
      </h2>

      {/* Date Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2" style={{ color: KAYAD_COLORS.lightNavy }}>
          Select Date
        </label>
        <div className="flex flex-wrap gap-2">
          {dates.map((date) => (
            <button
              key={date.value}
              onClick={() => onChange({ ...formData, selectedDate: date.value, selectedTime: '' })}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                formData.selectedDate === date.value
                  ? 'text-white'
                  : ''
              }`}
              style={{
                backgroundColor: formData.selectedDate === date.value
                  ? KAYAD_COLORS.lightNavy
                  : KAYAD_COLORS.warmBeige,
                color: formData.selectedDate === date.value
                  ? KAYAD_COLORS.white
                  : KAYAD_COLORS.lightNavy,
              }}
            >
              {date.label}
            </button>
          ))}
        </div>
      </div>

      {/* Time Selection */}
      {formData.selectedDate && (
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: KAYAD_COLORS.lightNavy }}>
            Select Time
          </label>
          {loading ? (
            <p style={{ color: KAYAD_COLORS.softBlue }}>Loading available times...</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableSlots
                .filter((slot: TimeSlot) => slot.available && !slot.isPast)
                .map((slot: TimeSlot) => (
                  <button
                    key={slot.time}
                    onClick={() => onChange({ ...formData, selectedTime: slot.time })}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      formData.selectedTime === slot.time
                        ? 'text-white'
                        : ''
                    }`}
                    style={{
                      backgroundColor: formData.selectedTime === slot.time
                        ? KAYAD_COLORS.emerald
                        : KAYAD_COLORS.warmBeige,
                      color: formData.selectedTime === slot.time
                        ? KAYAD_COLORS.white
                        : KAYAD_COLORS.lightNavy,
                    }}
                  >
                    {slot.time}
                  </button>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LocationStep({ provider, formData, onChange }: any) {
  return (
    <div className="rounded-xl p-6" style={{ backgroundColor: KAYAD_COLORS.white }}>
      <h2 className="text-xl font-bold mb-6" style={{ color: KAYAD_COLORS.lightNavy }}>
        Inspection Location
      </h2>

      {/* Mobile Toggle */}
      <div className="mb-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.isMobile}
            onChange={(e) => onChange({ ...formData, isMobile: e.target.checked })}
            className="w-5 h-5 rounded accent-emerald-500"
          />
          <span style={{ color: KAYAD_COLORS.lightNavy }}>
            Mobile inspection (inspector comes to you)
          </span>
        </label>
        {provider.operatingModel.offersMobile && provider.operatingModel.mobileFee > 0 && (
          <p className="text-sm mt-1 ml-8" style={{ color: KAYAD_COLORS.softBlue }}>
            Additional fee: KES {provider.operatingModel.mobileFee.toLocaleString()}
          </p>
        )}
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="County"
            value={formData.county}
            onChange={(v) => onChange({ ...formData, county: v })}
          />
          <FormInput
            label="Town"
            value={formData.town}
            onChange={(v) => onChange({ ...formData, town: v })}
          />
        </div>
        <FormInput
          label="Detailed Address *"
          value={formData.inspectionAddress}
          onChange={(v) => onChange({ ...formData, inspectionAddress: v })}
          placeholder="Landmark, street name, etc."
        />

        {/* Seller Info */}
        <div className="pt-4 border-t" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
          <h3 className="font-medium mb-3" style={{ color: KAYAD_COLORS.lightNavy }}>
            Seller Information (Optional)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Seller Name"
              value={formData.sellerName}
              onChange={(v) => onChange({ ...formData, sellerName: v })}
            />
            <FormInput
              label="Seller Phone"
              value={formData.sellerPhone}
              onChange={(v) => onChange({ ...formData, sellerPhone: v })}
            />
          </div>
          <label className="flex items-center gap-3 mt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.sellerIsDealer}
              onChange={(e) => onChange({ ...formData, sellerIsDealer: e.target.checked })}
              className="w-4 h-4 rounded accent-emerald-500"
            />
            <span style={{ color: KAYAD_COLORS.softBlue }}>
              Seller is a dealer
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}

function ConfirmStep({ provider, formData, totalPrice, onChange }: any) {
  return (
    <div className="rounded-xl p-6" style={{ backgroundColor: KAYAD_COLORS.white }}>
      <h2 className="text-xl font-bold mb-6" style={{ color: KAYAD_COLORS.lightNavy }}>
        Confirm Your Booking
      </h2>

      {/* Summary */}
      <div className="space-y-4 mb-6">
        <SummaryItem label="Provider" value={provider.companyName} />
        <SummaryItem label="Package" value={formData.selectedPackage?.name} />
        <SummaryItem
          label="Date & Time"
          value={`${new Date(formData.selectedDate).toLocaleDateString()} at ${formData.selectedTime}`}
        />
        <SummaryItem label="Location" value={formData.inspectionAddress} />
        <SummaryItem label="Vehicle" value={`${formData.vehicleYear} ${formData.vehicleMake} ${formData.vehicleModel}`} />
        {formData.vehicleRegistration && (
          <SummaryItem label="Registration" value={formData.vehicleRegistration} />
        )}
      </div>

      {/* Customer Info */}
      <div className="pt-4 border-t" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
        <h3 className="font-medium mb-3" style={{ color: KAYAD_COLORS.lightNavy }}>
          Your Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Full Name *"
            value={formData.customerName}
            onChange={(v) => onChange({ ...formData, customerName: v })}
          />
          <FormInput
            label="Email *"
            type="email"
            value={formData.customerEmail}
            onChange={(v) => onChange({ ...formData, customerEmail: v })}
          />
          <FormInput
            label="Phone *"
            value={formData.customerPhone}
            onChange={(v) => onChange({ ...formData, customerPhone: v })}
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-2" style={{ color: KAYAD_COLORS.lightNavy }}>
            Additional Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => onChange({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border outline-none focus:border-emerald-500"
            style={{ borderColor: KAYAD_COLORS.softBlue }}
            rows={3}
          />
        </div>
      </div>

      {/* Total */}
      <div className="mt-6 pt-4 border-t" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
        <div className="flex justify-between items-center">
          <span className="text-lg font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>
            Total
          </span>
          <span
            className="text-2xl font-bold"
            style={{ color: KAYAD_COLORS.emerald }}
          >
            KES {totalPrice.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

function PaymentStep({ formData, totalPrice, onSubmit, loading }: any) {
  return (
    <div className="rounded-xl p-6" style={{ backgroundColor: KAYAD_COLORS.white }}>
      <h2 className="text-xl font-bold mb-6" style={{ color: KAYAD_COLORS.lightNavy }}>
        Payment
      </h2>

      <div className="text-center py-8">
        <p className="mb-4" style={{ color: KAYAD_COLORS.softBlue }}>
          Total Amount to Pay
        </p>
        <p
          className="text-4xl font-bold mb-8"
          style={{ color: KAYAD_COLORS.emerald }}
        >
          KES {totalPrice.toLocaleString()}
        </p>

        <p style={{ color: KAYAD_COLORS.softBlue }}>
          Payment will be processed securely via M-PESA or card.
          <br />
          You will receive an SMS confirmation after payment.
        </p>
      </div>

      <button
        onClick={onSubmit}
        disabled={loading}
        className="w-full py-4 rounded-lg font-semibold text-lg"
        style={{
          backgroundColor: KAYAD_COLORS.emerald,
          color: KAYAD_COLORS.white
        }}
      >
        {loading ? 'Processing...' : 'Proceed to Payment'}
      </button>
    </div>
  );
}

// Helper Components
function FormInput({
  label,
  value,
  onChange,
  placeholder = '',
  type = 'text'
}: {
  label: string;
  value: any;
  onChange: (v: any) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: KAYAD_COLORS.lightNavy }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border outline-none focus:border-emerald-500"
        style={{ borderColor: KAYAD_COLORS.softBlue }}
      />
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span style={{ color: KAYAD_COLORS.softBlue }}>{label}</span>
      <span className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{value}</span>
    </div>
  );
}
