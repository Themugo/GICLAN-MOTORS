import { request } from '../api/httpRequest';

const unwrap = <T>(response: any): T => response?.data ?? response;

export async function getTranslations(locale?: string, namespace = 'common') {
  const params = new URLSearchParams();
  if (locale) params.set('locale', locale);
  if (namespace) params.set('namespace', namespace);
  const response = await request<{ data: { locale: string; namespace: string; translations: Record<string, unknown> } }>(`/localization?${params}`);
  return unwrap<{ locale: string; namespace: string; translations: Record<string, unknown> }>(response);
}

export async function getAllTranslations(locale?: string) {
  const query = locale ? `?locale=${encodeURIComponent(locale)}` : '';
  const response = await request<{ data: unknown }>(`/localization/all${query}`);
  return unwrap(response);
}

export async function getNamespaces(locale?: string) {
  const query = locale ? `?locale=${encodeURIComponent(locale)}` : '';
  const response = await request<{ data: { namespaces: string[] } }>(`/localization/namespaces${query}`);
  return unwrap(response);
}
