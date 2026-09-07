// ============================================================
// GHOST CHECKERS - VEHICLE INSPECTION PLATFORM
// Africa's Most Trusted Independent Vehicle Inspection Service
// ============================================================

import Inspection from "../models/Inspection.js";
import InspectionPackage from "../models/InspectionPackage.js";
import Inspector from "../models/Inspector.js";
import VehiclePassport from "../models/VehiclePassport.js";

// ============================================================
// LANDING PAGE DATA
// ============================================================

export async function getLandingData(req, res) {
  const data = {
    stats: {
      inspectionsCompleted: 45892,
      inspectors: 156,
      coverage: 47,
      satisfaction: 96.5,
      avgTurnaround: '24 hours',
    },
    packages: [
      {
        id: 'basic',
        name: 'Basic Inspection',
        price: 3500,
        items: 45,
        duration: '1 hour',
        includes: ['Exterior Condition', 'Interior Condition', 'Engine Start', 'Basic Fluids'],
        popular: false,
      },
      {
        id: 'standard',
        name: 'Standard Inspection',
        price: 7500,
        items: 75,
        duration: '2 hours',
        includes: ['Basic Inspection', 'Test Drive', 'Suspension Check', 'Brake Test', 'Electrical Systems'],
        popular: true,
      },
      {
        id: 'premium',
        name: '150-Point Inspection',
        price: 15000,
        items: 150,
        duration: '3 hours',
        includes: ['Standard Inspection', 'Diagnostic Scan', 'Undercarriage', 'Paint Analysis', 'Mileage Verification', 'AI Damage Detection'],
        popular: false,
      },
      {
        id: 'certification',
        name: 'Dealer Certification',
        price: 35000,
        items: 200,
        duration: '4 hours',
        includes: ['150-Point Inspection', 'Full Documentation', 'Market Valuation', 'Certification Badge', 'Digital Passport'],
        popular: false,
      },
    ],
    coverage: [
      { city: 'Nairobi', available: true, avgTime: '4 hours' },
      { city: 'Mombasa', available: true, avgTime: '6 hours' },
      { city: 'Kisumu', available: true, avgTime: '8 hours' },
      { city: 'Nakuru', available: true, avgTime: '6 hours' },
      { city: 'Eldoret', available: true, avgTime: '8 hours' },
      { city: 'Kampala', available: true, avgTime: '12 hours' },
    ],
    testimonials: [
      { name: 'James Mwangi', role: 'Car Buyer', text: 'Ghost Checkers saved me from buying a flood-damaged vehicle. The report was comprehensive and easy to understand.', rating: 5 },
      { name: 'Sarah Ochieng', role: 'Bank Manager', text: 'We use Ghost Checkers for all vehicle valuations before approving loans. Their reports are professionally detailed.', rating: 5 },
      { name: 'AutoKenya Dealer', role: 'Verified Dealer', text: 'Getting Ghost Certified has increased buyer confidence and our conversion rate significantly.', rating: 5 },
    ],
    trustBadges: [
      { label: 'ISO 9001 Certified', icon: 'shield' },
      { label: 'AI-Powered Analysis', icon: 'brain' },
      { label: '150-Point Checklist', icon: 'clipboard' },
      { label: 'Digital Passport', icon: 'file' },
    ],
  };

  res.json({ success: true, data });
}

// ============================================================
// BOOKING
// ============================================================

export async function createBooking(req, res) {
  const { vehicle, location, package: packageId, preferredDate, sellerContact, notes } = req.body;

  const booking = await Inspection.create({
    vehicle,
    location,
    package: packageId,
    preferredDate,
    sellerContact,
    notes,
    status: 'pending',
    createdAt: new Date().toISOString(),
    bookingReference: `GC-${Date.now().toString(36).toUpperCase()}`,
  });

  res.status(201).json({
    success: true,
    data: {
      id: booking.id,
      bookingReference: booking.bookingReference,
      status: 'pending',
      estimatedCompletion: calculateTurnaround(location),
      nextSteps: [
        'Our team will confirm within 2 hours',
        'You will receive SMS confirmation',
        'Inspector will contact seller to arrange visit',
      ],
    },
  });
}

function calculateTurnaround(location) {
  const city = location?.toLowerCase() || '';
  if (city.includes('nairobi')) return '4 hours';
  if (city.includes('mombasa') || city.includes('nakuru')) return '6 hours';
  return '12-24 hours';
}

// ============================================================
// INSPECTION STATUS
// ============================================================

export async function getInspectionStatus(req, res) {
  const { reference } = req.params;

  const status = {
    reference,
    status: 'in_progress',
    currentStep: 'Vehicle Inspection',
    steps: [
      { name: 'Booking Confirmed', status: 'completed', time: '09:00 AM' },
      { name: 'Inspector Assigned', status: 'completed', time: '09:15 AM' },
      { name: 'Arrived at Location', status: 'completed', time: '10:30 AM' },
      { name: 'Vehicle Inspection', status: 'in_progress', time: null },
      { name: 'Report Generation', status: 'pending', time: null },
      { name: 'Report Delivered', status: 'pending', time: null },
    ],
    inspector: {
      name: 'John Kamau',
      phone: '+254 712 345 678',
      photo: 'https://via.placeholder.com/100',
      rating: 4.9,
    },
    estimatedCompletion: '2:30 PM',
  };

  res.json({ success: true, data: status });
}

// ============================================================
// INSPECTION PACKAGES
// ============================================================

export async function getPackages(req, res) {
  const packages = [
    {
      id: 'basic',
      name: 'Basic Inspection',
      price: 3500,
      description: 'Essential checks for budget-conscious buyers',
      items: 45,
      duration: '1 hour',
      features: [
        'Exterior Condition Assessment',
        'Interior Condition Check',
        'Engine Start & Idle',
        'Basic Fluid Levels',
        'Tyre Condition',
        'Light Function Test',
        'Basic Report',
      ],
      recommended: false,
    },
    {
      id: 'standard',
      name: 'Standard Inspection',
      price: 7500,
      description: 'Comprehensive inspection for peace of mind',
      items: 75,
      duration: '2 hours',
      features: [
        'All Basic Inspection items',
        'Full Test Drive',
        'Suspension & Steering Check',
        'Brake System Test',
        'Electrical Systems Scan',
        'Air Conditioning Test',
        'Detailed Report with Photos',
        'Market Value Estimate',
      ],
      recommended: true,
    },
    {
      id: 'premium',
      name: '150-Point Inspection',
      price: 15000,
      description: 'The most comprehensive inspection available',
      items: 150,
      duration: '3 hours',
      features: [
        'All Standard Inspection items',
        'Computer Diagnostic Scan',
        'Undercarriage Inspection',
        'Paint Thickness Analysis',
        'Mileage Verification',
        'AI Damage Detection',
        'Service History Check',
        'Ownership Verification',
        'Premium Report with Video',
        'Digital Vehicle Passport',
      ],
      recommended: false,
    },
    {
      id: 'certification',
      name: 'Dealer Certification',
      price: 35000,
      description: 'Full certification for dealers and premium sales',
      items: 200,
      duration: '4 hours',
      features: [
        'All 150-Point Inspection items',
        'Full Documentation Package',
        'Professional Market Valuation',
        'Ghost Certified Badge',
        'Digital Vehicle Passport',
        '12-Month Validity',
        'Priority Support',
        'Re-inspection Discount',
      ],
      recommended: false,
    },
    {
      id: 'bank',
      name: 'Bank Inspection',
      price: 20000,
      description: 'Specialized for financial institution asset verification',
      items: 180,
      duration: '3 hours',
      features: [
        'All 150-Point Inspection items',
        'Asset Valuation Report',
        'Condition Grading',
        'Depreciation Analysis',
        'Insurance Valuation',
        'Legal Documentation Check',
        'Bank-Ready Report Format',
      ],
      recommended: false,
    },
    {
      id: 'insurance',
      name: 'Insurance Inspection',
      price: 18000,
      description: 'For pre-insurance and claims assessment',
      items: 165,
      duration: '3 hours',
      features: [
        'All 150-Point Inspection items',
        'Damage Assessment',
        'Valuation Report',
        'Claim Documentation',
        'Repair Cost Estimate',
        'Total Loss Assessment',
      ],
      recommended: false,
    },
  ];

  res.json({ success: true, data: packages });
}

// ============================================================
// INSPECTORS
// ============================================================

export async function getInspectors(req, res) {
  const { location, specialty } = req.query;

  const inspectors = [
    {
      id: '1',
      name: 'John Kamau',
      photo: 'https://via.placeholder.com/100',
      rating: 4.9,
      reviews: 234,
      certifications: ['Automotive Engineering', 'AI Diagnostics', 'EV Specialist'],
      experience: 8,
      location: 'Nairobi',
      languages: ['English', 'Swahili'],
      completed: 1245,
      responseTime: '< 1 hour',
      available: true,
      specialties: ['cars', 'suvs', 'trucks'],
    },
    {
      id: '2',
      name: 'Mary Wanjiku',
      photo: 'https://via.placeholder.com/100',
      rating: 4.8,
      reviews: 189,
      certifications: ['Mechanical Engineering', 'Bank Certification'],
      experience: 6,
      location: 'Nairobi',
      languages: ['English', 'Swahili', 'Kikuyu'],
      completed: 876,
      responseTime: '< 2 hours',
      available: true,
      specialties: ['cars', 'luxury'],
    },
    {
      id: '3',
      name: 'Peter Otieno',
      photo: 'https://via.placeholder.com/100',
      rating: 4.7,
      reviews: 156,
      certifications: ['Automotive Technology', 'EV Specialist'],
      experience: 5,
      location: 'Mombasa',
      languages: ['English', 'Swahili', 'Luo'],
      completed: 654,
      responseTime: '< 3 hours',
      available: true,
      specialties: ['cars', 'commercial', 'marine'],
    },
    {
      id: '4',
      name: 'Grace Achieng',
      photo: 'https://via.placeholder.com/100',
      rating: 4.9,
      reviews: 201,
      certifications: ['Mechanical Engineering', 'AI Diagnostics', 'Bank Certification'],
      experience: 7,
      location: 'Kisumu',
      languages: ['English', 'Swahili', 'Luo'],
      completed: 987,
      responseTime: '< 2 hours',
      available: false,
      specialties: ['cars', 'suvs', 'agricultural'],
    },
  ];

  res.json({ success: true, data: inspectors });
}

export async function getInspectorProfile(req, res) {
  const { inspectorId } = req.params;

  const profile = {
    id: inspectorId,
    name: 'John Kamau',
    photo: 'https://via.placeholder.com/200',
    rating: 4.9,
    reviews: 234,
    certifications: ['Automotive Engineering', 'AI Diagnostics', 'EV Specialist'],
    experience: 8,
    location: 'Nairobi',
    languages: ['English', 'Swahili'],
    completed: 1245,
    responseTime: '< 1 hour',
    bio: 'Certified automotive engineer with 8 years of experience in vehicle inspection. Specialized in luxury vehicles and AI-assisted diagnostics.',
    availability: {
      monday: ['8:00 AM - 6:00 PM'],
      tuesday: ['8:00 AM - 6:00 PM'],
      wednesday: ['8:00 AM - 6:00 PM'],
      thursday: ['8:00 AM - 6:00 PM'],
      friday: ['8:00 AM - 5:00 PM'],
      saturday: ['9:00 AM - 2:00 PM'],
      sunday: null,
    },
    stats: {
      avgInspectionTime: '2.5 hours',
      onTimeRate: 98,
      customerSatisfaction: 96,
      reportAccuracy: 99,
    },
  };

  res.json({ success: true, data: profile });
}

// ============================================================
// 150-POINT INSPECTION CHECKLIST
// ============================================================

export async function getInspectionChecklist(req, res) {
  const checklist = {
    sections: [
      {
        id: 'documentation',
        name: 'Documentation',
        icon: 'file',
        items: [
          { id: 'd1', name: 'Registration Card (Logbook)', points: 5, severity: 'critical' },
          { id: 'd2', name: 'ID Verification', points: 3, severity: 'critical' },
          { id: 'd3', name: 'Insurance Certificate', points: 3, severity: 'critical' },
          { id: 'd4', name: 'Service History', points: 5, severity: 'high' },
          { id: 'd5', name: 'Previous Owner History', points: 3, severity: 'medium' },
          { id: 'd6', name: 'Import Documentation', points: 5, severity: 'high' },
          { id: 'd7', name: 'Road License', points: 3, severity: 'critical' },
        ],
      },
      {
        id: 'exterior',
        name: 'Exterior & Body',
        icon: 'car',
        items: [
          { id: 'e1', name: 'Paint Thickness (All Panels)', points: 8, severity: 'high' },
          { id: 'e2', name: 'Panel Alignment', points: 5, severity: 'high' },
          { id: 'e3', name: 'Rust Check', points: 8, severity: 'critical' },
          { id: 'e4', name: 'Accident Damage Assessment', points: 10, severity: 'critical' },
          { id: 'e5', name: 'Paint Mismatch Detection', points: 8, severity: 'high' },
          { id: 'e6', name: 'Glass Condition', points: 3, severity: 'medium' },
          { id: 'e7', name: 'Lights & Indicators', points: 3, severity: 'medium' },
          { id: 'e8', name: 'Bumpers & Trim', points: 2, severity: 'low' },
          { id: 'e9', name: 'Door Locks & Handles', points: 2, severity: 'low' },
          { id: 'e10', name: 'Wipers & Washers', points: 2, severity: 'low' },
        ],
      },
      {
        id: 'engine',
        name: 'Engine Compartment',
        icon: 'settings',
        items: [
          { id: 'eng1', name: 'Engine Start (Cold)', points: 5, severity: 'critical' },
          { id: 'eng2', name: 'Engine Noise Assessment', points: 5, severity: 'high' },
          { id: 'eng3', name: 'Oil Level & Condition', points: 5, severity: 'critical' },
          { id: 'eng4', name: 'Coolant Level & Condition', points: 3, severity: 'high' },
          { id: 'eng5', name: 'Brake Fluid', points: 3, severity: 'high' },
          { id: 'eng6', name: 'Transmission Fluid', points: 3, severity: 'high' },
          { id: 'eng7', name: 'Power Steering Fluid', points: 2, severity: 'medium' },
          { id: 'eng8', name: 'Battery Condition', points: 3, severity: 'medium' },
          { id: 'eng9', name: 'Belt Condition', points: 3, severity: 'high' },
          { id: 'eng10', name: 'Hose Inspection', points: 2, severity: 'medium' },
          { id: 'eng11', name: 'Leak Detection', points: 5, severity: 'high' },
          { id: 'eng12', name: 'Turbo/Supercharger', points: 5, severity: 'high' },
        ],
      },
      {
        id: 'transmission',
        name: 'Transmission',
        icon: 'git-branch',
        items: [
          { id: 't1', name: 'Clutch Operation (Manual)', points: 5, severity: 'high' },
          { id: 't2', name: 'Gear Shifting', points: 5, severity: 'high' },
          { id: 't3', name: 'Transmission Noise', points: 5, severity: 'critical' },
          { id: 't4', name: 'Torque Converter (Auto)', points: 5, severity: 'high' },
          { id: 't5', name: 'CVT Belt (if applicable)', points: 5, severity: 'high' },
        ],
      },
      {
        id: 'suspension',
        name: 'Suspension & Steering',
        icon: 'activity',
        items: [
          { id: 's1', name: 'Shock Absorbers', points: 4, severity: 'high' },
          { id: 's2', name: 'Springs & Struts', points: 4, severity: 'high' },
          { id: 's3', name: 'Control Arms & Bushes', points: 3, severity: 'medium' },
          { id: 's4', name: 'Steering Rack', points: 4, severity: 'high' },
          { id: 's5', name: 'Power Steering', points: 3, severity: 'medium' },
          { id: 's6', name: 'Wheel Alignment', points: 3, severity: 'medium' },
          { id: 's7', name: 'Ball Joints', points: 3, severity: 'high' },
        ],
      },
      {
        id: 'brakes',
        name: 'Braking System',
        icon: 'disc',
        items: [
          { id: 'b1', name: 'Front Brake Pads', points: 5, severity: 'critical' },
          { id: 'b2', name: 'Rear Brake Pads/Drums', points: 4, severity: 'critical' },
          { id: 'b3', name: 'Brake Discs/Cylinders', points: 4, severity: 'high' },
          { id: 'b4', name: 'Brake Lines', points: 5, severity: 'critical' },
          { id: 'b5', name: 'Brake ABS System', points: 5, severity: 'high' },
          { id: 'b6', name: 'Handbrake', points: 3, severity: 'high' },
          { id: 'b7', name: 'Brake Fluid', points: 3, severity: 'high' },
        ],
      },
      {
        id: 'electrical',
        name: 'Electrical Systems',
        icon: 'zap',
        items: [
          { id: 'el1', name: 'Battery Load Test', points: 4, severity: 'medium' },
          { id: 'el2', name: 'Alternator Output', points: 4, severity: 'high' },
          { id: 'el3', name: 'Starter Motor', points: 3, severity: 'medium' },
          { id: 'el4', name: 'Headlights', points: 3, severity: 'critical' },
          { id: 'el5', name: 'Tail Lights', points: 2, severity: 'critical' },
          { id: 'el6', name: 'Indicators', points: 2, severity: 'critical' },
          { id: 'el7', name: 'Interior Lights', points: 2, severity: 'low' },
          { id: 'el8', name: 'Dashboard Displays', points: 3, severity: 'high' },
          { id: 'el9', name: 'Central Locking', points: 2, severity: 'medium' },
          { id: 'el10', name: 'Window Regulators', points: 2, severity: 'medium' },
          { id: 'el11', name: 'Airbags (OBD)', points: 5, severity: 'critical' },
        ],
      },
      {
        id: 'interior',
        name: 'Interior',
        icon: 'home',
        items: [
          { id: 'i1', name: 'Seats & Upholstery', points: 3, severity: 'medium' },
          { id: 'i2', name: 'Dashboard & Console', points: 3, severity: 'medium' },
          { id: 'i3', name: 'Air Conditioning', points: 5, severity: 'high' },
          { id: 'i4', name: 'Heating System', points: 3, severity: 'medium' },
          { id: 'i5', name: 'Carpet & Floor Mats', points: 2, severity: 'low' },
          { id: 'i6', name: 'Seatbelts', points: 5, severity: 'critical' },
          { id: 'i7', name: 'Sunroof/Moonroof', points: 2, severity: 'medium' },
          { id: 'i8', name: 'Navigation System', points: 3, severity: 'medium' },
          { id: 'i9', name: 'Sound System', points: 2, severity: 'low' },
          { id: 'i10', name: 'Reverse Camera', points: 3, severity: 'medium' },
        ],
      },
      {
        id: 'testdrive',
        name: 'Test Drive',
        icon: 'navigation',
        items: [
          { id: 'td1', name: 'Cold Start Performance', points: 5, severity: 'high' },
          { id: 'td2', name: 'Acceleration', points: 4, severity: 'high' },
          { id: 'td3', name: 'Braking Performance', points: 5, severity: 'critical' },
          { id: 'td4', name: 'Steering Response', points: 4, severity: 'high' },
          { id: 'td5', name: 'Suspension Comfort', points: 3, severity: 'medium' },
          { id: 'td6', name: 'Transmission Feel', points: 4, severity: 'high' },
          { id: 'td7', name: 'Engine Noise Under Load', points: 5, severity: 'high' },
          { id: 'td8', name: 'Vibration Assessment', points: 4, severity: 'high' },
          { id: 'td9', name: 'ABS Function', points: 5, severity: 'critical' },
          { id: 'td10', name: 'Cruise Control', points: 3, severity: 'medium' },
        ],
      },
      {
        id: 'undercarriage',
        name: 'Undercarriage',
        icon: 'arrow-down',
        items: [
          { id: 'u1', name: 'Frame/Unibody Condition', points: 8, severity: 'critical' },
          { id: 'u2', name: 'Rust & Corrosion', points: 8, severity: 'critical' },
          { id: 'u3', name: 'Exhaust System', points: 4, severity: 'medium' },
          { id: 'u4', name: 'Fuel Lines', points: 5, severity: 'critical' },
          { id: 'u5', name: 'Transmission Pan', points: 4, severity: 'high' },
          { id: 'u6', name: 'Differential', points: 4, severity: 'high' },
          { id: 'u7', name: 'Drive Shafts', points: 4, severity: 'high' },
        ],
      },
      {
        id: 'tyres',
        name: 'Wheels & Tyres',
        icon: 'circle',
        items: [
          { id: 'ty1', name: 'Front Tyre Tread', points: 5, severity: 'critical' },
          { id: 'ty2', name: 'Rear Tyre Tread', points: 4, severity: 'critical' },
          { id: 'ty3', name: 'Tyre Age (DOT)', points: 3, severity: 'high' },
          { id: 'ty4', name: 'Wheel Alignment', points: 4, severity: 'high' },
          { id: 'ty5', name: 'Wheel Bearings', points: 4, severity: 'high' },
          { id: 'ty6', name: 'Spare Tyre', points: 2, severity: 'medium' },
        ],
      },
      {
        id: 'diagnostics',
        name: 'Computer Diagnostics',
        icon: 'monitor',
        items: [
          { id: 'diag1', name: 'Engine ECU Scan', points: 8, severity: 'critical' },
          { id: 'diag2', name: 'Transmission ECU', points: 6, severity: 'high' },
          { id: 'diag3', name: 'ABS/Safety Systems', points: 6, severity: 'high' },
          { id: 'diag4', name: 'Airbag System', points: 8, severity: 'critical' },
          { id: 'diag5', name: 'Error Codes', points: 5, severity: 'high' },
          { id: 'diag6', name: 'Mileage Verification', points: 8, severity: 'critical' },
          { id: 'diag7', name: 'Key Fob Programming', points: 3, severity: 'medium' },
        ],
      },
    ],
    totalPoints: 150,
    aiAnalysis: {
      enabled: true,
      features: [
        'Paint mismatch detection',
        'Panel repair identification',
        'Rust detection',
        'Mileage anomaly detection',
        'Wear pattern analysis',
      ],
    },
  };

  res.json({ success: true, data: checklist });
}

// ============================================================
// VEHICLE PASSPORT
// ============================================================

export async function getVehiclePassport(req, res) {
  const { vin } = req.params;

  const passport = {
    passportId: `GCP-${vin?.substring(0, 8).toUpperCase() || 'DEMO1234'}`,
    vin,
    issuedDate: new Date().toISOString(),
    validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    vehicle: {
      make: 'Toyota',
      model: 'Land Cruiser',
      year: 2022,
      bodyType: 'SUV',
      color: 'Pearl White',
      engine: '3.5L V6 Twin Turbo',
      transmission: 'Automatic',
    },
    inspections: [
      {
        id: 'GC-A1B2C3',
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        package: '150-Point Inspection',
        score: 94,
        inspector: 'John Kamau',
        results: {
          engine: 96,
          transmission: 94,
          suspension: 92,
          brakes: 95,
          electrical: 98,
          interior: 90,
          exterior: 88,
          testDrive: 94,
        },
        aiFindings: [
          { type: 'panel_repair', location: 'Front bumper', confidence: 87 },
        ],
        verified: true,
      },
    ],
    ownership: [
      { owner: 'Original Owner', period: '2022 - 2023', verified: true },
      { owner: 'Second Owner', period: '2023 - Present', verified: true },
    ],
    serviceHistory: [
      { date: '2023-06-15', mileage: 15000, service: 'Regular Service', dealer: 'Toyota Kenya' },
      { date: '2024-01-20', mileage: 28000, service: 'Full Service', dealer: 'Toyota Kenya' },
    ],
    mileageTimeline: [
      { date: '2022-03-15', mileage: 0, source: 'Registration' },
      { date: '2023-06-15', mileage: 15000, source: 'Service Record' },
      { date: '2024-01-20', mileage: 28000, source: 'Service Record' },
      { date: '2024-03-01', mileage: 28500, source: 'Inspection' },
    ],
    marketValueHistory: [
      { date: '2022-03-15', value: 4200000, source: 'MSRP' },
      { date: '2024-03-01', value: 3500000, source: 'Ghost Checkers' },
    ],
    certifications: [
      { type: 'Ghost Certified', issued: '2024-03-01', validUntil: '2025-03-01' },
    ],
    riskAssessment: {
      score: 2,
      level: 'Low',
      factors: [
        { factor: 'No accident history detected', impact: 'positive' },
        { factor: 'Verified mileage', impact: 'positive' },
        { factor: 'Complete service history', impact: 'positive' },
      ],
    },
  };

  res.json({ success: true, data: passport });
}

// ============================================================
// REPORTS
// ============================================================

export async function getInspectionReport(req, res) {
  const { reportId } = req.params;

  const report = {
    reportId,
    passportId: 'GCP-DEMO1234',
    generatedAt: new Date().toISOString(),
    vehicle: {
      make: 'Toyota',
      model: 'Land Cruiser 300 GX-R',
      year: 2022,
      vin: 'JTJAAAAAAAA123456',
      mileage: 28500,
      registration: 'KBZ 123A',
    },
    summary: {
      overallScore: 94,
      grade: 'A',
      recommendation: 'Highly Recommended',
      condition: 'Excellent',
      investmentGrade: 'Strong Buy',
    },
    scores: {
      engine: { score: 96, status: 'Excellent', items: 12 },
      transmission: { score: 94, status: 'Excellent', items: 5 },
      suspension: { score: 92, status: 'Good', items: 7 },
      brakes: { score: 95, status: 'Excellent', items: 7 },
      electrical: { score: 98, status: 'Excellent', items: 11 },
      interior: { score: 90, status: 'Good', items: 10 },
      exterior: { score: 88, status: 'Good', items: 10 },
      testDrive: { score: 94, status: 'Excellent', items: 10 },
    },
    criticalFindings: [],
    recommendations: [
      { priority: 'monitor', item: 'Minor scratch on rear bumper', estimatedCost: 15000 },
      { priority: 'info', item: 'Next service due at 30,000km', estimatedCost: 25000 },
    ],
    marketAnalysis: {
      fairValue: 3200000,
      askingPrice: 3450000,
      negotiationRoom: 250000,
      marketTrend: 'Stable',
      daysOnMarket: 45,
    },
    inspectionDetails: {
      inspector: 'John Kamau',
      location: 'Nairobi - Westlands',
      date: new Date().toISOString(),
      duration: '2.5 hours',
      weather: 'Sunny',
      testDriveDistance: 15,
    },
  };

  res.json({ success: true, data: report });
}

// ============================================================
// ANALYTICS
// ============================================================

export async function getAnalytics(req, res) {
  const analytics = {
    overview: {
      totalInspections: 45892,
      thisMonth: 2345,
      growth: 15,
      avgTurnaround: 18,
      satisfaction: 96.5,
    },
    byPackage: [
      { name: 'Basic', count: 12500, revenue: 43750000 },
      { name: 'Standard', count: 18900, revenue: 141750000 },
      { name: '150-Point', count: 11200, revenue: 168000000 },
      { name: 'Certification', count: 3292, revenue: 115220000 },
    ],
    byRegion: [
      { region: 'Nairobi', count: 18500, percentage: 40 },
      { region: 'Mombasa', count: 8500, percentage: 19 },
      { region: 'Kisumu', count: 4500, percentage: 10 },
      { region: 'Nakuru', count: 3200, percentage: 7 },
      { region: 'Other', count: 11192, percentage: 24 },
    ],
    topDefects: [
      { defect: 'Brake pad wear', frequency: 45 },
      { defect: 'Minor paint defects', frequency: 38 },
      { defect: 'Suspension wear', frequency: 25 },
      { defect: 'Electrical issues', frequency: 18 },
      { defect: 'Fluid leaks', frequency: 15 },
    ],
    vehicleReliability: [
      { make: 'Toyota', reliability: 94 },
      { make: 'Mercedes-Benz', reliability: 88 },
      { make: 'BMW', reliability: 85 },
      { make: 'Land Rover', reliability: 78 },
      { make: 'Ford', reliability: 82 },
    ],
    inspectorPerformance: [
      { name: 'John Kamau', completed: 1245, rating: 4.9, avgTime: 2.3 },
      { name: 'Mary Wanjiku', completed: 876, rating: 4.8, avgTime: 2.5 },
      { name: 'Peter Otieno', completed: 654, rating: 4.7, avgTime: 2.8 },
    ],
  };

  res.json({ success: true, data: analytics });
}

// ============================================================
// AI ASSISTANT
// ============================================================

export async function askAssistant(req, res) {
  const { question, context } = req.body;

  const responses = {
    summarize: {
      answer: 'This Toyota Land Cruiser 300 GX-R is in excellent condition with a 94% overall score. The engine and electrical systems scored highest at 96% and 98% respectively. No critical issues were found. The vehicle has verified mileage and complete service history. Recommended for purchase.',
      confidence: 95,
    },
    compare: {
      answer: 'Compared to similar Toyota Land Cruiser 300 models on the market, this vehicle is priced 7% above market average. However, the comprehensive inspection report and Ghost Certified status justify the premium. Similar vehicles without certification are priced 5-8% lower.',
      confidence: 88,
    },
    maintenance: {
      answer: 'Based on the inspection and service history, estimated maintenance costs for the next 12 months are approximately KES 45,000 - 80,000. Major services are due at 30,000km (next service) and 40,000km (major service).',
      confidence: 82,
    },
    risks: {
      answer: 'Low risk vehicle. Key positive factors: verified mileage, no accident history, complete documentation, and excellent mechanical condition. Minor items to monitor include brake pad wear (expected at this mileage) and a small scratch on rear bumper.',
      confidence: 92,
    },
  };

  const intent = question.toLowerCase();
  let response;

  if (intent.includes('summarize') || intent.includes('summary')) {
    response = responses.summarize;
  } else if (intent.includes('compare') || intent.includes('similar')) {
    response = responses.compare;
  } else if (intent.includes('maintenance') || intent.includes('cost')) {
    response = responses.maintenance;
  } else if (intent.includes('risk') || intent.includes('safe')) {
    response = responses.risks;
  } else {
    response = {
      answer: 'This vehicle has passed a comprehensive 150-point inspection with a 94% score. Key highlights include excellent engine condition (96%), verified mileage, complete service history, and no accident damage detected. The inspection report is available for detailed review.',
      confidence: 90,
    };
  }

  res.json({ success: true, data: response });
}

// ============================================================
// DEALER CERTIFICATION
// ============================================================

export async function getDealerCertification(req, res) {
  const certifications = [
    {
      id: 'ghost_basic',
      name: 'Ghost Certified Dealer',
      requirements: [
        'Minimum 10 inspections completed',
        'Average score above 85%',
        'Response time under 4 hours',
      ],
      benefits: [
        'Ghost Certified badge on listings',
        'Priority placement in search',
        'Customer trust indicator',
      ],
      badge: '#10B981',
      price: 5000,
      validity: 12,
    },
    {
      id: 'ghost_platinum',
      name: 'Ghost Platinum Dealer',
      requirements: [
        'Minimum 50 inspections completed',
        'Average score above 90%',
        'All vehicles inspected before listing',
        'Response time under 2 hours',
      ],
      benefits: [
        'All Ghost Certified benefits',
        'Featured on homepage',
        'Advanced analytics dashboard',
        'Dedicated support line',
      ],
      badge: '#8B5CF6',
      price: 15000,
      validity: 12,
    },
    {
      id: 'ghost_elite',
      name: 'Ghost Elite Dealer',
      requirements: [
        'Minimum 200 inspections completed',
        'Average score above 92%',
        'Zero critical defect sales',
        'All staff certified',
      ],
      benefits: [
        'All Platinum benefits',
        'White-glove inspection service',
        'Extended warranty program',
        'Insurance partnership access',
      ],
      badge: '#F59E0B',
      price: 35000,
      validity: 12,
    },
  ];

  res.json({ success: true, data: certifications });
}
