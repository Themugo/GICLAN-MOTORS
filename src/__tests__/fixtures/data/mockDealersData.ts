import { Dealer, DealerTeamMember, DealerLead, DealerPromotion, DealerAnalytics } from '../../../types';

export const INITIAL_DEALER_BUSINESSES: Dealer[] = [
  {
    id: 'dealer-1',
    name: 'Crown Motors Ltd',
    type: 'Enterprise Dealer',
    location: 'Mombasa Road, Nairobi',
    county: 'Nairobi',
    verifiedSince: '2019',
    rating: 4.9,
    reviewsCount: 142,
    activeListingsCount: 18,
    completedEscrowDeals: 84,
    logo: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&q=80&w=200',
    coverBanner: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=1200',
    badges: ['Gold Enterprise Verified', 'KRA Tax Compliant', 'NTSA TIMS Direct Link', 'Escrow Enabled'],
    phone: '+254 711 000 111',
    email: 'sales@crownmotors.co.ke',
    website: 'https://crownmotors.co.ke',
    kraPin: 'P051290381Z',
    responseTime: '< 10 mins',
    description: 'Premier foreign import dealership specializing in luxury SUVs, Toyota Land Cruisers, German sedans, and verified commercial fleets.',
    address: 'Crown Heights Plaza, Mombasa Road Yard 4B, Nairobi',
    subscriptionTier: 'Gold Enterprise',
    subscriptionStatus: 'Active',
    subscriptionExpiry: '2027-01-15',
    maxListingsLimit: 100,
    featuredListingsUsed: 8,
    featuredListingsLimit: 15,
    operatingHours: 'Mon - Sat: 8:00 AM - 6:30 PM | Sun: By Appointment',
    specializations: ['Luxury SUVs', 'Toyota Land Cruiser Series', 'German Luxury Sedans', 'Verified Commercial Fleets'],
    languages: ['English', 'Swahili', 'Japanese (Import Liaison)'],
    paymentMethods: ['KAYAD Escrow Vault', 'Bank Wire (RTGS)', 'M-Pesa Business Till #981023', 'KAYAD / Co-op Asset Finance'],
    servicesOffered: ['Trade-in Evaluations', 'Pre-Approved Asset Financing', '1-Year Extended Warranty', 'Full Service & Maintenance Plans', 'Custom Direct Sourcing', 'Port Clearance Assistance'],
    landmark: 'Crown Heights Plaza, Next to Standard Group HQ, Mombasa Road',
    buyerSatisfaction: 98,
    followersCount: 1420,
    galleryImages: [
      'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=800'
    ],
    reviews: [
      {
        id: 'r1',
        buyerName: 'Hon. Peter Njuguna',
        rating: 5,
        date: '2026-07-20',
        vehicleTitle: '2021 Toyota Land Cruiser Prado TX-L',
        comment: 'Flawless transaction through KAYAD Escrow. Crown Motors delivered the logbook within 48 hours of inspection approval. Highest standard of professionalism.',
        verifiedPurchase: true
      },
      {
        id: 'r2',
        buyerName: 'Dr. Mary Atieno',
        rating: 5,
        date: '2026-07-14',
        vehicleTitle: '2019 Mercedes-Benz E250 AMG Line',
        comment: 'Cleanest yard on Mombasa Road. The 150-point inspection report matched every detail. Asset financing was processed smooth in 3 days.',
        verifiedPurchase: true
      },
      {
        id: 'r3',
        buyerName: 'Eng. David Kiptoo',
        rating: 4.8,
        date: '2026-06-29',
        vehicleTitle: '2020 Subaru Outback EyeSight',
        comment: 'Great customer service and transparent pricing. The test drive was organized promptly.',
        verifiedPurchase: true
      }
    ]
  },
  {
    id: 'dealer-2',
    name: 'Rift Valley Auto Hub',
    type: 'Enterprise Dealer',
    location: 'Nakuru Town, Nakuru',
    county: 'Nakuru',
    verifiedSince: '2021',
    rating: 4.8,
    reviewsCount: 88,
    activeListingsCount: 12,
    completedEscrowDeals: 45,
    logo: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=200',
    coverBanner: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=1200',
    badges: ['Silver Tier Verified', '4x4 Specialist Yard', 'NTSA Approved'],
    phone: '+254 722 333 444',
    email: 'info@rvautohub.co.ke',
    website: 'https://rvautohub.co.ke',
    kraPin: 'P051988231A',
    responseTime: '< 20 mins',
    description: 'Rift Valley’s top dealership for rugged off-road double cabs, Toyota Prados, agricultural pickups, and Subaru AWDs.',
    address: 'Highway Avenue, Opposite Westside Mall, Nakuru',
    subscriptionTier: 'Silver',
    subscriptionStatus: 'Active',
    subscriptionExpiry: '2026-11-30',
    maxListingsLimit: 35,
    featuredListingsUsed: 3,
    featuredListingsLimit: 5,
    operatingHours: 'Mon - Sat: 7:30 AM - 6:00 PM | Sun: Closed',
    specializations: ['4x4 Off-Road Pickups', 'Toyota Prado & Hilux', 'Agricultural & Commercial Fleets', 'Subaru AWD Series'],
    languages: ['English', 'Swahili'],
    paymentMethods: ['KAYAD Escrow Vault', 'Bank Wire (RTGS)', 'M-Pesa Business Till #442901', 'Co-op Bank Asset Finance'],
    servicesOffered: ['Trade-in Evaluations', 'Farm & Fleet Asset Financing', 'Off-Road Suspension Upgrades', 'Logbook Transfer Guarantee'],
    landmark: 'Highway Avenue, Opposite Westside Mall & Naivas Supermarket, Nakuru',
    buyerSatisfaction: 96,
    followersCount: 890,
    galleryImages: [
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&q=80&w=800'
    ],
    reviews: [
      {
        id: 'r4',
        buyerName: 'Captain Joseph Cheruiyot',
        rating: 5,
        date: '2026-07-22',
        vehicleTitle: '2022 Toyota Hilux Revo Double Cab 2.8L',
        comment: 'Bought our farm pickup here via Escrow. Honest condition reporting and zero rust guaranteed.',
        verifiedPurchase: true
      },
      {
        id: 'r5',
        buyerName: 'Grace Koech',
        rating: 4.7,
        date: '2026-07-08',
        vehicleTitle: '2018 Toyota Prado TX-L 2.8L',
        comment: 'Friendly staff in Nakuru. They handled NTSA TIMS transfer effortlessly.',
        verifiedPurchase: true
      }
    ]
  },
  {
    id: 'dealer-3',
    name: 'Coastal Premium Imports',
    type: 'Enterprise Dealer',
    location: 'Nyali, Mombasa',
    county: 'Mombasa',
    verifiedSince: '2020',
    rating: 4.85,
    reviewsCount: 64,
    activeListingsCount: 9,
    completedEscrowDeals: 32,
    logo: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=80&w=200',
    coverBanner: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=1200',
    badges: ['Port Direct Exporter', 'KRA Duty Audit Passed', 'Escrow Enabled'],
    phone: '+254 733 555 666',
    email: 'sales@coastalimports.co.ke',
    website: 'https://coastalimports.co.ke',
    kraPin: 'P051443321B',
    responseTime: '< 15 mins',
    description: 'Direct port import specialists based in Mombasa. Fresh Japanese & UK auctions cleared directly with guaranteed zero saltwater rust.',
    address: 'Links Road, Nyali Yard 12, Mombasa',
    subscriptionTier: 'Silver',
    subscriptionStatus: 'Active',
    subscriptionExpiry: '2026-10-15',
    maxListingsLimit: 35,
    featuredListingsUsed: 2,
    featuredListingsLimit: 5,
    operatingHours: 'Mon - Sat: 8:00 AM - 5:30 PM | Sun: By Appointment',
    specializations: ['Direct Port Imports', 'Fresh Japanese & UK Auction Units', 'Zero-Rust Coastal Luxury', 'Executive Sedans'],
    languages: ['English', 'Swahili'],
    paymentMethods: ['KAYAD Escrow Vault', 'M-Pesa Business Till #556211', 'Bank Wire Transfer', 'KAYAD Asset Finance'],
    servicesOffered: ['Port Clearance Direct', 'Custom Import Sourcing', 'Duty Audit Certification', 'Escrow Protection'],
    landmark: 'Links Road Nyali Yard 12, Near City Mall Mombasa',
    buyerSatisfaction: 97,
    followersCount: 640,
    galleryImages: [
      'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=80&w=800'
    ],
    reviews: [
      {
        id: 'r6',
        buyerName: 'Suleiman Omar',
        rating: 5,
        date: '2026-07-18',
        vehicleTitle: '2020 Mazda CX-5 L Package',
        comment: 'Picked up straight from Mombasa port clearance. Absolutely zero rust, clean Japanese auction grade 4.5.',
        verifiedPurchase: true
      }
    ]
  },
  {
    id: 'dealer-4',
    name: 'David K. (Verified Private Seller)',
    type: 'Private Seller',
    location: 'Westlands, Nairobi',
    county: 'Nairobi',
    verifiedSince: '2022',
    rating: 4.9,
    reviewsCount: 12,
    activeListingsCount: 2,
    completedEscrowDeals: 7,
    logo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    coverBanner: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=1200',
    badges: ['Government ID Verified', 'NTSA TIMS Logbook Owner', 'KAYAD Escrow Mandatory', 'KRA PIN Verified'],
    phone: '+254 799 *** ***',
    email: 'david.k***@gmail.com',
    kraPin: 'A019****98Z',
    responseTime: '< 15 mins',
    description: 'Private car owner selling pristine personal vehicles. All vehicles are maintained at official Kenya dealers with full logbook records.',
    address: 'Approx. Westlands, Nairobi (Exact meet-up scheduled after Escrow initiation)',
    subscriptionTier: 'Free Individual',
    subscriptionStatus: 'Active',
    subscriptionExpiry: 'N/A',
    maxListingsLimit: 3,
    operatingHours: 'Flexible | In-App Messaging Preferred',
    specializations: ['Pristine Single-Owner Cars', 'Full Dealer Maintenance History', 'Logbook Verified'],
    languages: ['English', 'Swahili'],
    paymentMethods: ['KAYAD Bank Escrow Vault (Mandatory for Private Deals)'],
    servicesOffered: ['150-Point Pre-Purchase Inspection Booking', 'KAYAD Bank Escrow Vault Protection', 'NTSA TIMS Direct Transfer'],
    landmark: 'Secure Public Vehicle Inspection Center, Westlands',
    buyerSatisfaction: 100,
    followersCount: 240,
    galleryImages: [
      'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=800'
    ],
    reviews: [
      {
        id: 'r7',
        buyerName: 'Eng. Patrick Omondi',
        rating: 5,
        date: '2026-06-12',
        vehicleTitle: '2019 Subaru Outback 2.5i',
        comment: 'Bought David’s personal Subaru through KAYAD Escrow. He met me at Thika Road Inspection Hub. Logbook transferred smoothly on TIMS.',
        verifiedPurchase: true
      }
    ]
  }
];

export const INITIAL_DEALER_TEAM: DealerTeamMember[] = [
  {
    id: 'team-1',
    dealerId: 'dealer-1',
    name: 'Samuel Mwaura',
    role: 'Owner / Principal',
    email: 's.mwaura@crownmotors.co.ke',
    phone: '+254 711 000 111',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    assignedLeadsCount: 14,
    closedDealsCount: 48,
    active: true
  },
  {
    id: 'team-2',
    dealerId: 'dealer-1',
    name: 'Grace Wanjiku',
    role: 'Sales Manager',
    email: 'grace@crownmotors.co.ke',
    phone: '+254 711 000 222',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
    assignedLeadsCount: 22,
    closedDealsCount: 31,
    active: true
  },
  {
    id: 'team-3',
    dealerId: 'dealer-1',
    name: 'Brian Otieno',
    role: 'Senior Sales Agent',
    email: 'brian@crownmotors.co.ke',
    phone: '+254 711 000 333',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    assignedLeadsCount: 18,
    closedDealsCount: 19,
    active: true
  }
];

export const INITIAL_DEALER_LEADS: DealerLead[] = [
  {
    id: 'lead-101',
    dealerId: 'dealer-1',
    vehicleId: 'v1',
    vehicleTitle: '2021 Toyota Land Cruiser Prado TX-L 2.8L',
    customerName: 'Dr. Kevin Kiprop',
    customerPhone: '+254 722 990 011',
    customerEmail: 'kkiprop@health.go.ke',
    source: 'Escrow Negotiation',
    status: 'Deposit Paid',
    assignedToName: 'Grace Wanjiku',
    notes: 'Offered Ksh 7,200,000 via M-Pesa Escrow. Inspection passed with 96/100.',
    offeredPrice: 7200000,
    createdAt: '2026-07-28',
    lastFollowUp: 'Today 11:30 AM'
  },
  {
    id: 'lead-102',
    dealerId: 'dealer-1',
    vehicleId: 'v6',
    vehicleTitle: '2018 Mercedes-Benz E250 AMG Line 2.0L',
    customerName: 'Anita Cherono',
    customerPhone: '+254 733 441 122',
    customerEmail: 'anita.c@lawchambers.co.ke',
    source: 'Test Drive Booking',
    status: 'Test Drive Scheduled',
    assignedToName: 'Brian Otieno',
    notes: 'Scheduled test drive at Mombasa Road Showroom on Saturday 10:00 AM.',
    offeredPrice: 4800000,
    createdAt: '2026-07-27',
    lastFollowUp: 'Yesterday'
  },
  {
    id: 'lead-103',
    dealerId: 'dealer-1',
    vehicleId: 'v3',
    vehicleTitle: '2020 Mazda CX-5 2.2d L Package AWD',
    customerName: 'Daniel Omondi',
    customerPhone: '+254 701 882 334',
    customerEmail: 'domondi@techhub.africa',
    source: 'Marketplace Listing',
    status: 'In Contact',
    assignedToName: 'Grace Wanjiku',
    notes: 'Inquired about loan pre-approval with a partner bank option.',
    createdAt: '2026-07-29',
    lastFollowUp: 'Today 09:15 AM'
  },
  {
    id: 'lead-104',
    dealerId: 'dealer-1',
    vehicleId: 'v2',
    vehicleTitle: '2019 Subaru Outback 2.5i EyeSight Limited',
    customerName: 'Hassan Mohamed',
    customerPhone: '+254 712 554 112',
    customerEmail: 'hassan@mombasatrading.co.ke',
    source: 'Live Chat',
    status: 'New Lead',
    assignedToName: 'Samuel Mwaura',
    notes: 'Asking if trade-in of 2015 Subaru Forester is accepted.',
    createdAt: '2026-07-29',
    lastFollowUp: 'Just now'
  }
];

export const INITIAL_DEALER_PROMOTIONS: DealerPromotion[] = [
  {
    id: 'promo-1',
    dealerId: 'dealer-1',
    vehicleId: 'v1',
    vehicleTitle: '2021 Toyota Land Cruiser Prado TX-L 2.8L',
    type: 'Top of Search Boost',
    durationDays: 7,
    startDate: '2026-07-25',
    endDate: '2026-08-01',
    costKsh: 5000,
    impressionsCount: 14200,
    clicksCount: 890,
    status: 'Active'
  },
  {
    id: 'promo-2',
    dealerId: 'dealer-1',
    vehicleId: 'v6',
    vehicleTitle: '2018 Mercedes-Benz E250 AMG Line 2.0L',
    type: 'Featured Showroom Badge',
    durationDays: 14,
    startDate: '2026-07-20',
    endDate: '2026-08-03',
    costKsh: 8500,
    impressionsCount: 22100,
    clicksCount: 1420,
    status: 'Active'
  }
];

export const INITIAL_DEALER_ANALYTICS: DealerAnalytics = {
  totalViews30Days: 48920,
  totalLeads30Days: 142,
  conversionRate: 6.8,
  averageDaysToSell: 14,
  totalInventoryValue: 124500000, // 124.5M Ksh
  topPerformingMake: 'Toyota (Prado & LC)',
  viewsByCounty: [
    { county: 'Nairobi', views: 24500 },
    { county: 'Kiambu', views: 8900 },
    { county: 'Mombasa', views: 6200 },
    { county: 'Nakuru', views: 5100 },
    { county: 'Machakos', views: 4220 }
  ]
};
