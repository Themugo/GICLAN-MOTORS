import { request, HttpRequestError } from '../api/httpRequest';

export type NotificationApiErrorKind = 'network' | 'unauthenticated' | 'not_found' | 'server';

export class NotificationApiError extends Error {
  kind: NotificationApiErrorKind;
  status?: number;
  constructor(message: string, kind: NotificationApiErrorKind, status?: number) {
    super(message);
    this.name = 'NotificationApiError';
    this.kind = kind;
    this.status = status;
  }
}

export interface NotificationRecord {
  _id: string;
  id?: string;
  title: string;
  message: string;
  type?: string;
  read: boolean;
  createdAt: string;
  link?: string;
  data?: Record<string, unknown>;
}

async function notificationRequest<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  try {
    return await request<T>(path, options);
  } catch (error) {
    const err = error instanceof HttpRequestError ? error : new HttpRequestError('Request failed.');
    const kind: NotificationApiErrorKind = !err.status
      ? 'network'
      : err.status === 401 ? 'unauthenticated'
      : err.status === 404 ? 'not_found'
      : 'server';
    throw new NotificationApiError(err.message, kind, err.status);
  }
}

export async function listNotifications(params: { page?: number; limit?: number } = {}) {
  return notificationRequest<{ notifications: NotificationRecord[]; unreadCount: number; pagination: { total: number; page: number; limit: number; pages: number } }>(`/api/notifications?page=${params.page || 1}&limit=${params.limit || 50}`);
}

export async function markNotificationRead(id: string) {
  return notificationRequest<{ success: boolean; message: string }>(`/api/notifications/${id}/read`, { method: 'POST' });
}

export async function markAllNotificationsRead() {
  return notificationRequest<{ success: boolean; message: string }>('/api/notifications/read-all', { method: 'POST' });
}

export async function deleteNotification(id: string) {
  return notificationRequest<{ success: boolean; message: string }>(`/api/notifications/${id}`, { method: 'DELETE' });
}

export async function createNotificationReminder(body: { type: string; targetId?: string; remindAt?: string }) {
  return notificationRequest<{ success: boolean; reminder: NotificationRecord }>('/api/notifications/reminders', { method: 'POST', body: JSON.stringify(body) });
}
