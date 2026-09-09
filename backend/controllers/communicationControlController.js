import asyncHandler from "../middleware/asyncHandler.js";
import { adminOnly } from "../middleware/auth.js";
import { getAdminTemplates, saveTemplate, getCommunicationAnalytics, getProviderHealth, getDeliveryHistory, retryDelivery, getPreferences, updatePreferences } from "../services/communicationControl.service.js";

export const adminTemplates = asyncHandler(async (req, res) => res.json({ success: true, data: await getAdminTemplates(req.query) }));
export const adminSaveTemplate = asyncHandler(async (req, res) => res.json({ success: true, data: await saveTemplate(req.user, req.body, req.params.id || null) }));
export const adminAnalytics = asyncHandler(async (req, res) => res.json({ success: true, data: await getCommunicationAnalytics(req.query) }));
export const adminProviderHealth = asyncHandler(async (_req, res) => res.json({ success: true, data: await getProviderHealth() }));
export const adminHistory = asyncHandler(async (req, res) => res.json({ success: true, data: await getDeliveryHistory(req.query) }));
export const adminRetry = asyncHandler(async (req, res) => res.json({ success: true, data: await retryDelivery(req.params.id) }));
export const userCommunicationHistory = asyncHandler(async (req, res) => res.json({ success: true, data: await getDeliveryHistory({ userId: req.user.id, limit: req.query.limit }) }));
export const userCommunicationPreferences = asyncHandler(async (req, res) => res.json({ success: true, data: await getPreferences(req.user.id) }));
export const updateUserCommunicationPreferences = asyncHandler(async (req, res) => res.json({ success: true, data: await updatePreferences(req.user.id, req.body) }));

export { adminOnly };
