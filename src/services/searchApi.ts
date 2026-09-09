import { request } from '../api/httpRequest';

export interface SearchSuggestion { type: string; text: string }
export interface SearchFacets { brands:string[]; models:string[]; locations:string[]; bodyTypes:string[]; fuels:string[]; transmissions:string[]; colors:string[]; conditions:string[]; years:{min:number|null;max:number|null}; prices:{min:number|null;max:number|null}; mileages:{min:number|null;max:number|null}; sellerTypes:string[]; categories:string[]; total:number }

export async function autocompleteSearch(query: string, limit = 8): Promise<SearchSuggestion[]> {
  if (!query.trim()) return [];
  const params = new URLSearchParams({ q: query.trim(), limit: String(limit) });
  const body = await request<{ data?: SearchSuggestion[] }>(`/api/search/autocomplete?${params.toString()}`);
  return body.data || [];
}

export async function searchMarketplace(params: Record<string, unknown> = {}) { const query = new URLSearchParams(); Object.entries(params).forEach(([k,v]) => { if(v !== undefined && v !== null && String(v) !== '') query.set(k,String(v)); }); return request<any>(`/api/search?${query.toString()}`); }
export async function getSearchFacets(params: Record<string, unknown> = {}): Promise<SearchFacets> { const query = new URLSearchParams(); Object.entries(params).forEach(([k,v]) => { if(v !== undefined && v !== null && String(v) !== '') query.set(k,String(v)); }); const body = await request<{data:SearchFacets}>(`/api/search/facets?${query.toString()}`); return body.data; }
