// src/utils/seoService.ts - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Dynamic SEO metadata generation service
// Generates OpenGraph tags, Twitter cards, canonical URLs, and structured data
// ─────────────────────────────────────────────────────────────

const BASE_URL = "https://www.kayad.space";

// =============================
// 🚗 VEHICLE METADATA GENERATOR
// =============================

export interface CarImage {
  url?: string;
}

export interface Location {
  city?: string;
  region?: string;
  coordinates?: [number, number];
}

export interface Dealer {
  _id?: string;
  businessName?: string;
  name?: string;
  description?: string;
  logo?: string;
  avatar?: string;
  phone?: string;
  email?: string;
  location?: Location;
  role?: string;
  listingsCount?: number;
}

export interface Car {
  _id?: string;
  year?: number;
  brand?: string;
  model?: string;
  title?: string;
  description?: string;
  price?: number;
  currentBid?: number;
  bodyType?: string;
  transmission?: string;
  fuel?: string;
  mileage?: number;
  engine?: string;
  color?: string;
  drivetrain?: string;
  condition?: string;
  vin?: string;
  status?: string;
  images?: (CarImage | string)[];
  location?: Location;
  dealer?: Dealer;
}

export interface OpenGraph {
  type: string;
  title: string;
  description: string;
  url: string;
  image: string;
  siteName: string;
  locale: string;
  priceAmount?: number;
  priceCurrency?: string;
  availability?: string;
}

export interface Twitter {
  card: string;
  title: string;
  description: string;
  image: string;
}

export interface StructuredData {
  "@context": string;
  "@type": string;
  [key: string]: unknown;
}

export interface Metadata {
  title: string;
  description: string;
  url: string;
  imageUrl: string;
  canonical: string;
  openGraph: OpenGraph;
  twitter: Twitter;
  structuredData: StructuredData;
}

export const generateVehicleMetadata = (car: Car): Metadata => {
  if (!car) return getDefaultMetadata();

  const title = `${car.year} ${car.brand} ${car.model} - ${car.price ? `KES ${car.price.toLocaleString()}` : 'For Sale'} | Kayad`;
  const description = car.description 
    ? `${car.description.substring(0, 160)}...`
    : `${car.year} ${car.brand} ${car.model} ${car.bodyType || ''} in ${car.location?.city || 'Kenya'}. ${car.transmission} transmission, ${car.fuel} fuel. ${car.mileage ? `${car.mileage.toLocaleString()} km` : ''}. View details and bid on Kayad.`;
  
  const imageUrl = typeof car.images?.[0] === 'string' ? car.images[0] : car.images?.[0]?.url || `${BASE_URL}/icon-512.png`;
  const url = `${BASE_URL}/cars/${car._id}`;

  return {
    title,
    description,
    url,
    imageUrl,
    canonical: url,
    openGraph: {
      type: "product",
      title,
      description,
      url,
      image: imageUrl,
      siteName: "Kayad",
      locale: "en_KE",
      priceAmount: car.price || car.currentBid,
      priceCurrency: "KES",
      availability: car.status === "sold" ? "out_of_stock" : "in_stock",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      image: imageUrl,
    },
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Vehicle",
      "@id": url,
      url,
      name: car.title,
      description,
      image: imageUrl,
      brand: { "@type": "Brand", name: car.brand },
      model: car.model,
      vehicleIdentificationNumber: car.vin,
      vehicleTransmission: car.transmission,
      fuelType: car.fuel,
      vehicleEngine: car.engine ? { "@type": "EngineSpecification", name: car.engine } : undefined,
      mileageFromOdometer: car.mileage ? { "@type": "QuantitativeValue", value: car.mileage, unitCode: "KMT" } : undefined,
      bodyType: car.bodyType,
      color: car.color,
      vehicleConfiguration: car.drivetrain,
      productionDate: car.year ? `${car.year}` : undefined,
      condition: car.condition === "new" ? "https://schema.org/NewCondition" : car.condition === "used" ? "https://schema.org/UsedCondition" : undefined,
      offers: {
        "@type": "Offer",
        price: car.price || car.currentBid,
        priceCurrency: "KES",
        availability: car.status === "sold" ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
        url,
        seller: car.dealer ? {
          "@type": car.dealer.role === "dealer" ? "AutoDealer" : "Person",
          name: car.dealer.businessName || car.dealer.name || "Seller",
          telephone: car.dealer.phone,
          email: car.dealer.email,
        } : undefined,
      },
    },
  };
};

// =============================
// 🏪 DEALER METADATA GENERATOR
// =============================
export const generateDealerMetadata = (dealer: Dealer): Metadata => {
  if (!dealer) return getDefaultMetadata();

  const title = `${dealer.businessName || dealer.name} - Car Dealer in ${dealer.location?.city || 'Kenya'} | Kayad`;
  const description = dealer.description 
    ? `${dealer.description.substring(0, 160)}...`
    : `View ${dealer.businessName || dealer.name}'s car listings on Kayad. ${dealer.listingsCount || 0} vehicles available. ${dealer.location?.city || 'Kenya'}. Contact: ${dealer.phone || dealer.email}.`;
  
  const imageUrl = dealer.logo || dealer.avatar || `${BASE_URL}/icon-512.png`;
  const url = `${BASE_URL}/dealer/${dealer._id}`;

  return {
    title,
    description,
    url,
    imageUrl,
    canonical: url,
    openGraph: {
      type: "website",
      title,
      description,
      url,
      image: imageUrl,
      siteName: "Kayad",
      locale: "en_KE",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      image: imageUrl,
    },
    structuredData: {
      "@context": "https://schema.org",
      "@type": dealer.role === "dealer" ? "AutoDealer" : "Person",
      "@id": url,
      url,
      name: dealer.businessName || dealer.name,
      description,
      image: imageUrl,
      telephone: dealer.phone,
      email: dealer.email,
      address: dealer.location ? {
        "@type": "PostalAddress",
        addressLocality: dealer.location.city,
        addressRegion: dealer.location.region,
        addressCountry: "KE",
      } : undefined,
      areaServed: dealer.location ? {
        "@type": "GeoCircle",
        geoMidpoint: {
          "@type": "GeoCoordinates",
          latitude: dealer.location.coordinates?.[1] || 0,
          longitude: dealer.location.coordinates?.[0] || 0,
        },
        geoRadius: "100000",
      } : undefined,
    },
  };
};

// =============================
// 🎪 AUCTION METADATA GENERATOR
// =============================

export interface Auction {
  _id?: string;
  status?: string;
  startTime?: string;
  endTime?: string;
  currentBid?: number;
  startingBid?: number;
  car?: Car;
}

export const generateAuctionMetadata = (auction: Auction): Metadata => {
  if (!auction) return getDefaultMetadata();

  const car = auction.car;
  const title = `${car?.year || ''} ${car?.brand || ''} ${car?.model || ''} - Live Auction | Kayad`.trim();
  const bidAmount = auction.currentBid || auction.startingBid || 0;
  const description = car?.description
    ? `Live Auction: ${car.description.substring(0, 140)}...`
    : `Live auction for ${car?.year || ''} ${car?.brand || ''} ${car?.model || ''}. Current bid: KES ${bidAmount.toLocaleString()}. Ends ${auction.endTime ? new Date(auction.endTime).toLocaleString() : 'soon'}. Bid now on Kayad.`;
  
  const imageUrl = typeof car?.images?.[0] === 'string' ? car.images[0] : car?.images?.[0]?.url || `${BASE_URL}/icon-512.png`;
  const url = `${BASE_URL}/auctions/${auction._id}`;

  return {
    title,
    description,
    url,
    imageUrl,
    canonical: url,
    openGraph: {
      type: "website",
      title,
      description,
      url,
      image: imageUrl,
      siteName: "Kayad",
      locale: "en_KE",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      image: imageUrl,
    },
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Event",
      "@id": url,
      url,
      name: title,
      description,
      image: imageUrl,
      startDate: auction.startTime,
      endDate: auction.endTime,
      eventStatus: auction.status === "live" ? "https://schema.org/EventScheduled" : auction.status === "ended" ? "https://schema.org/EventMovedOnline" : "https://schema.org/EventCancelled",
      location: {
        "@type": "VirtualLocation",
        url,
      },
      offers: {
        "@type": "Offer",
        price: auction.currentBid || auction.startingBid,
        priceCurrency: "KES",
        availability: auction.status === "live" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
        url,
      },
      performer: {
        "@type": "Organization",
        name: "Kayad",
        url: BASE_URL,
      },
    },
  };
};

// =============================
// 🏠 DEFAULT METADATA
// =============================
export const getDefaultMetadata = (): Metadata => {
  return {
    title: "Kayad – Kenya's Premium Car Marketplace",
    description: "Buy, sell and bid on premium cars in Kenya. Live auctions with M-Pesa. Secure escrow payments.",
    url: BASE_URL,
    imageUrl: `${BASE_URL}/icon-512.png`,
    canonical: BASE_URL,
    openGraph: {
      type: "website",
      title: "Kayad – Kenya's Premium Car Marketplace",
      description: "Buy, sell and bid on premium cars in Kenya. Live auctions with M-Pesa. Secure escrow payments.",
      url: BASE_URL,
      image: `${BASE_URL}/icon-512.png`,
      siteName: "Kayad",
      locale: "en_KE",
    },
    twitter: {
      card: "summary_large_image",
      title: "Kayad – Kenya's Premium Car Marketplace",
      description: "Buy, sell and bid on premium cars in Kenya. Live auctions. Secure escrow.",
      image: `${BASE_URL}/icon-512.png`,
    },
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      url: BASE_URL,
      name: "Kayad",
      description: "Kenya's Premium Car Marketplace",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${BASE_URL}/showroom?brand={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  };
};

// =============================
// 🔗 CANONICAL URL GENERATOR
// =============================
export const generateCanonicalUrl = (path: string): string => {
  return `${BASE_URL}${path}`;
};

// =============================
// 📄 META TAG GENERATOR
// =============================

export interface MetaTag {
  name?: string;
  property?: string;
  rel?: string;
  href?: string;
  content?: string;
}

export const generateMetaTags = (metadata: Metadata): MetaTag[] => {
  const tags: MetaTag[] = [];

  // Basic meta tags
  tags.push({ name: "description", content: metadata.description });
  tags.push({ property: "og:title", content: metadata.openGraph.title });
  tags.push({ property: "og:description", content: metadata.openGraph.description });
  tags.push({ property: "og:type", content: metadata.openGraph.type });
  tags.push({ property: "og:url", content: metadata.openGraph.url });
  tags.push({ property: "og:image", content: metadata.openGraph.image });
  tags.push({ property: "og:site_name", content: metadata.openGraph.siteName });
  tags.push({ property: "og:locale", content: metadata.openGraph.locale });

  // Twitter cards
  tags.push({ name: "twitter:card", content: metadata.twitter.card });
  tags.push({ name: "twitter:title", content: metadata.twitter.title });
  tags.push({ name: "twitter:description", content: metadata.twitter.description });
  tags.push({ name: "twitter:image", content: metadata.twitter.image });

  // Canonical URL
  tags.push({ rel: "canonical", href: metadata.canonical });

  return tags;
};
