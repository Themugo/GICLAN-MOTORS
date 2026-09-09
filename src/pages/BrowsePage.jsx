import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/** Canonical marketplace search entry. All legacy browse searches converge on Showroom. */
export default function BrowsePage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const map = { search:'keyword', bodyType:'body', priceMax:'priceMax', mileageMax:'mileageMax' };
  Object.entries(map).forEach(([from,to]) => { if (params.has(from) && !params.has(to)) { params.set(to, params.get(from)); params.delete(from); } });
  if (params.get('brand') === 'All') params.delete('brand');
  return <Navigate to={`/showroom${params.toString() ? `?${params.toString()}` : ''}`} replace />;
}
