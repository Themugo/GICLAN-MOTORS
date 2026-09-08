// src/components/SEOHead.tsx - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// SEO head component for React
// Renders meta tags, OpenGraph tags, Twitter cards, canonical URL, and structured data
// ─────────────────────────────────────────────────────────────

import { Helmet } from "react-helmet-async";

interface OpenGraph {
  title: string;
  description: string;
  type: string;
  url: string;
  image: string;
  siteName: string;
  locale: string;
  priceAmount?: string;
  priceCurrency?: string;
  availability?: string;
}

interface Twitter {
  card: string;
  title: string;
  description: string;
  image: string;
}

interface Metadata {
  title: string;
  description: string;
  openGraph: OpenGraph;
  twitter: Twitter;
  canonical: string;
  structuredData?: any;
}

interface SEOHeadProps {
  metadata?: Metadata;
  title?: string;
  description?: string;
}

const buildDefaultMetadata = (title: string, description: string): Metadata => ({
  title,
  description,
  openGraph: {
    title,
    description,
    type: 'website',
    url: typeof window !== 'undefined' ? window.location.href : '',
    image: '',
    siteName: 'KAYAD',
    locale: 'en_KE',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    image: '',
  },
  canonical: typeof window !== 'undefined' ? window.location.href : '',
});

const SEOHead = ({ metadata, title, description }: SEOHeadProps) => {
  const resolvedMetadata = metadata || (title ? buildDefaultMetadata(title, description || '') : null);
  if (!resolvedMetadata) return null;

  return (
    <Helmet>
      <title>{resolvedMetadata.title}</title>
      <meta name="description" content={resolvedMetadata.description} />

      {/* OpenGraph */}
      <meta property="og:title" content={resolvedMetadata.openGraph.title} />
      <meta property="og:description" content={resolvedMetadata.openGraph.description} />
      <meta property="og:type" content={resolvedMetadata.openGraph.type} />
      <meta property="og:url" content={resolvedMetadata.openGraph.url} />
      <meta property="og:image" content={resolvedMetadata.openGraph.image} />
      <meta property="og:site_name" content={resolvedMetadata.openGraph.siteName} />
      <meta property="og:locale" content={resolvedMetadata.openGraph.locale} />
      {resolvedMetadata.openGraph.priceAmount && (
        <meta property="og:price:amount" content={resolvedMetadata.openGraph.priceAmount} />
      )}
      {resolvedMetadata.openGraph.priceCurrency && (
        <meta property="og:price:currency" content={resolvedMetadata.openGraph.priceCurrency} />
      )}
      {resolvedMetadata.openGraph.availability && (
        <meta property="og:availability" content={resolvedMetadata.openGraph.availability} />
      )}

      {/* Twitter Cards */}
      <meta name="twitter:card" content={resolvedMetadata.twitter.card} />
      <meta name="twitter:title" content={resolvedMetadata.twitter.title} />
      <meta name="twitter:description" content={resolvedMetadata.twitter.description} />
      <meta name="twitter:image" content={resolvedMetadata.twitter.image} />

      {/* Canonical URL */}
      <link rel="canonical" href={resolvedMetadata.canonical} />

      {/* Structured Data */}
      {resolvedMetadata.structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(resolvedMetadata.structuredData)}
        </script>
      )}
    </Helmet>
  );
};

export default SEOHead;
