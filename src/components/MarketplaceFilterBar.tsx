import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { getSearchFacets } from '../services/searchApi';

const FIELDS = [
  ['brand','Make'], ['model','Model'], ['location','Region'], ['body','Body'], ['fuel','Fuel'],
  ['transmission','Transmission'], ['color','Colour'], ['condition','Condition'], ['dealerType','Seller'],
];

export default function MarketplaceFilterBar({ filters, onFilterChange, onClear }) {
  const [facets, setFacets] = useState(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { let dead=false; getSearchFacets(filters).then(v=>{if(!dead)setFacets(v)}).catch(()=>{}); return ()=>{dead=true}; }, [JSON.stringify(filters)]);
  const options = useMemo(() => ({
    brand: facets?.brands || [], model: facets?.models || [], location: facets?.locations || [], body: facets?.bodyTypes || [],
    fuel: facets?.fuels || [], transmission: facets?.transmissions || [], color: facets?.colors || [], condition: facets?.conditions || [],
    dealerType: [{value:'dealer',label:'Dealers'},{value:'private',label:'Private sellers'}],
  }), [facets]);
  const active = Object.entries(filters).filter(([k,v]) => k !== 'filter' && v).length + (filters.filter !== 'all' ? 1 : 0);
  return <section className="marketplace-filter-shell" aria-label="Marketplace filters">
    <div className="marketplace-filter-head">
      <div className="marketplace-filter-title"><SlidersHorizontal size={16}/><strong>Filter marketplace</strong>{active>0&&<span>{active}</span>}</div>
      <div className="marketplace-filter-actions"><small>{facets?.total ?? '—'} matching vehicles</small>{active>0&&<button type="button" onClick={onClear}><RotateCcw size={13}/> Reset</button>}<button type="button" className="mobile-filter-toggle" onClick={()=>setOpen(v=>!v)}>{open?'Hide filters':'All filters'}</button></div>
    </div>
    <div className={`marketplace-filter-grid ${open?'marketplace-filter-grid-open':''}`}>
      {FIELDS.map(([key,label]) => <label key={key} className="marketplace-filter-field"><span>{key==='location'?<MapPin size={12}/>:null}{label}</span><select value={filters[key]||''} onChange={e=>onFilterChange(key,e.target.value)}><option value="">Any {label}</option>{(options[key]||[]).map(item=>{const value=typeof item==='string'?item:item.value; const text=typeof item==='string'?item:item.label; return <option key={value} value={value}>{text}</option>})}</select></label>)}
      <label className="marketplace-filter-field"><span>Sale</span><select value={filters.filter==='all'?'':filters.filter} onChange={e=>onFilterChange('category',e.target.value||'all')}><option value="">All listings</option><option value="auction">Auctions</option><option value="fixed">Buy Now</option><option value="sold">Sold</option></select></label>
      <label className="marketplace-filter-field"><span>Min price</span><input inputMode="numeric" value={filters.priceMin||''} placeholder="KES" onChange={e=>onFilterChange('priceMin',e.target.value.replace(/\D/g,''))}/></label>
      <label className="marketplace-filter-field"><span>Max price</span><input inputMode="numeric" value={filters.priceMax||''} placeholder="KES" onChange={e=>onFilterChange('priceMax',e.target.value.replace(/\D/g,''))}/></label>
      <label className="marketplace-filter-field"><span>Year from</span><input inputMode="numeric" value={filters.yearMin||''} placeholder="YYYY" onChange={e=>onFilterChange('yearMin',e.target.value.replace(/\D/g,'').slice(0,4))}/></label>
      <label className="marketplace-filter-field"><span>Year to</span><input inputMode="numeric" value={filters.yearMax||''} placeholder="YYYY" onChange={e=>onFilterChange('yearMax',e.target.value.replace(/\D/g,'').slice(0,4))}/></label>
      <label className="marketplace-filter-field"><span>Mileage to</span><input inputMode="numeric" value={filters.mileageMax||''} placeholder="KM" onChange={e=>onFilterChange('mileageMax',e.target.value.replace(/\D/g,''))}/></label>
      <label className="marketplace-filter-check"><input type="checkbox" checked={filters.verifiedOnly==='true'} onChange={e=>onFilterChange('verifiedOnly',e.target.checked?'true':'')}/><span>Verified dealers</span></label>
      <label className="marketplace-filter-check"><input type="checkbox" checked={filters.inspectedOnly==='true'} onChange={e=>onFilterChange('inspectedOnly',e.target.checked?'true':'')}/><span>Inspected only</span></label>
    </div>
  </section>;
}
