import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/** Mobile browse is intentionally a routing alias; search logic lives in the canonical Showroom. */
export default function MobileBrowsePage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const map = { search:'keyword', bodyType:'body' };
  Object.entries(map).forEach(([from,to]) => { if (params.has(from) && !params.has(to)) { params.set(to, params.get(from)); params.delete(from); } });
  if (params.get('brand') === 'All') params.delete('brand');
  return <Navigate to={`/showroom${params.toString() ? `?${params.toString()}` : ''}`} replace />;
}
