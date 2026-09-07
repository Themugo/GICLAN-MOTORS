import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { notifAPI } from '../api/api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type?: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: (params?: any) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotif: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { isAuth } = useAuth();
  const { on } = useSocket();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const normalizeNotification = useCallback((n: any): Notification => ({
    ...n,
    _id: n._id || n.id,
    createdAt: n.createdAt || n.created_at,
  }), []);

  const fetchNotifications = useCallback(async (params = {}) => {
    if (!isAuth) { setNotifications([]); setUnreadCount(0); return; }
    setLoading(true);
    try {
      const d = await notifAPI.list({ limit: 50, ...params });
      const list = (d.notifications || []).map(normalizeNotification);
      setNotifications(list);
      setUnreadCount(list.filter(n => !n.read).length);
    } catch (error) {
      console.warn('Unable to fetch notifications', error);
    } finally { setLoading(false); }
  }, [isAuth, normalizeNotification]);

  // Socket events are wake-up signals only. Notification rows remain authoritative
  // in the backend, so domain events trigger a fresh read instead of creating
  // local notification records that cannot be marked read or deleted.
  useEffect(() => {
    if (isAuth) void fetchNotifications();
  }, [isAuth, fetchNotifications]);

  useEffect(() => {
    if (!isAuth || !on) return;
    const off = on('notification', () => { void fetchNotifications(); });
    const events = ['escrowReleased', 'escrowRefunded', 'escrowDisputed', 'paymentSuccess'];
    const offs = events.map(event => on(event, () => { void fetchNotifications(); }));
    return () => { off(); offs.forEach(unsub => unsub()); };
  }, [isAuth, on, fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notifAPI.markRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch (error) {
      console.warn('Unable to mark notification as read', error);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await notifAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.warn('Unable to mark all notifications as read', error);
    }
  }, []);

  const deleteNotif = useCallback(async (id: string) => {
    try {
      await notifAPI.remove(id);
      setNotifications(prev => {
        const removed = prev.find(n => n._id === id);
        if (removed && !removed.read) setUnreadCount(c => Math.max(0, c - 1));
        return prev.filter(n => n._id !== id);
      });
    } catch (error) {
      console.warn('Unable to delete notification', error);
    }
  }, []);

  const value = useMemo(() => ({
    notifications, unreadCount, loading,
    fetchNotifications, markAsRead, markAllRead, deleteNotif,
  }), [notifications, unreadCount, loading, fetchNotifications, markAsRead, markAllRead, deleteNotif]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = (): NotificationContextValue => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return ctx;
};
