import { request } from '../api/httpRequest';

export interface SearchSuggestion { type: string; text: string }

export async function autocompleteSearch(query: string, limit = 8): Promise<SearchSuggestion[]> {
  if (!query.trim()) return [];
  const params = new URLSearchParams({ q: query.trim(), limit: String(limit) });
  const body = await request<{ data?: SearchSuggestion[] }>(`/api/search/autocomplete?${params.toString()}`);
  return body.data || [];
}
