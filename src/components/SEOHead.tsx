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
  metadata: Metadata;
}

const SEOHead = ({ metadata }: SEOHeadProps) => {
  if (!metadata) return null;

  return (
    <Helmet>
      <title>{metadata.title}</title>
      <meta name="description" content={metadata.description} />

      {/* OpenGraph */}
      <meta property="og:title" content={metadata.openGraph.title} />
      <meta property="og:description" content={metadata.openGraph.description} />
      <meta property="og:type" content={metadata.openGraph.type} />
      <meta property="og:url" content={metadata.openGraph.url} />
      <meta property="og:image" content={metadata.openGraph.image} />
      <meta property="og:site_name" content={metadata.openGraph.siteName} />
      <meta property="og:locale" content={metadata.openGraph.locale} />
      {metadata.openGraph.priceAmount && (
        <meta property="og:price:amount" content={metadata.openGraph.priceAmount} />
      )}
      {metadata.openGraph.priceCurrency && (
        <meta property="og:price:currency" content={metadata.openGraph.priceCurrency} />
      )}
      {metadata.openGraph.availability && (
        <meta property="og:availability" content={metadata.openGraph.availability} />
      )}

      {/* Twitter Cards */}
      <meta name="twitter:card" content={metadata.twitter.card} />
      <meta name="twitter:title" content={metadata.twitter.title} />
      <meta name="twitter:description" content={metadata.twitter.description} />
      <meta name="twitter:image" content={metadata.twitter.image} />

      {/* Canonical URL */}
      <link rel="canonical" href={metadata.canonical} />

      {/* Structured Data */}
      {metadata.structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(metadata.structuredData)}
        </script>
      )}
    </Helmet>
  );
};

export default SEOHead;
