// backend/controllers/notificationController.js
import { findAll, count, create, updateMany, removeMany, findById } from "../db/index.js";
import { getIO } from "../utils/io.js";
import { logError, logInfo } from "../utils/logger.js";

const mapNotification = (n) => ({
  ...n,
  _id: n.id,
  createdAt: n.createdAt || n.created_at,
  read: Boolean(n.read),
});

export const getNotifications = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const offset = (page - 1) * limit;
    const [notifications, total, unread] = await Promise.all([
      findAll("notifications", { filters: { user: req.user.id, }, orderBy: "createdAt", ascending: false, limit, offset }),
      count("notifications", { user: req.user.id }),
      count("notifications", { user: req.user.id, read: false }),
    ]);
    res.json({ success: true, notifications: notifications.map(mapNotification), unreadCount: unread || 0, pagination: { total: total || 0, page, limit, pages: Math.ceil((total || 0) / limit) } });
  } catch (err) {
    logError("getNotifications error:", { error: err.message });
    res.status(500).json({ success: false, message: "Failed to fetch notifications" });
  }
};

export const createReminder = async (req, res) => {
  try {
    const { type, targetId, remindAt } = req.body;
    const reminder = await create("notifications", {
      user: req.user.id,
      title: "Reminder",
      message: `Reminder for ${type}`,
      type: "info",
      read: false,
      data: { type, targetId, remindAt: remindAt || new Date().toISOString() },
    });
    logInfo("Reminder created", { userId: req.user.id, type, targetId });
    res.status(201).json({ success: true, reminder: mapNotification(reminder) });
  } catch (err) {
    logError("createReminder error:", { error: err.message });
    res.status(500).json({ success: false, message: "Failed to create reminder" });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const notification = await findById("notifications", req.params.id);
    if (!notification || String(notification.user) !== String(req.user.id)) return res.status(404).json({ success: false, message: "Notification not found" });
    await updateMany("notifications", { id: req.params.id, user: req.user.id }, { read: true });
    res.json({ success: true, message: "Marked as read" });
  } catch (err) {
    logError("markAsRead error:", { error: err.message });
    res.status(500).json({ success: false, message: "Failed to mark as read" });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    await updateMany("notifications", { user: req.user.id, read: false }, { read: true });
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    logError("markAllAsRead error:", { error: err.message });
    res.status(500).json({ success: false, message: "Failed to mark all notifications as read" });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const notification = await findById("notifications", req.params.id);
    if (!notification || String(notification.user) !== String(req.user.id)) return res.status(404).json({ success: false, message: "Notification not found" });
    await removeMany("notifications", { id: req.params.id, user: req.user.id });
    res.json({ success: true, message: "Notification deleted" });
  } catch (err) {
    logError("deleteNotification error:", { error: err.message });
    res.status(500).json({ success: false, message: "Failed to delete notification" });
  }
};

export const createNotification = async ({ user, title, message, type = "info", data = {}, link }) => {
  try {
    const notif = await create("notifications", { user, title, message, type, read: false, data, link });
    const payload = mapNotification(notif);
    const io = getIO();
    if (io) {
      io.to(`user_${user}`).emit("notification", payload);
      io.to(String(user)).emit("notification", payload);
    }
    return notif;
  } catch (err) {
    logError("Failed to create notification:", { error: err.message, user });
    return null;
  }
};
