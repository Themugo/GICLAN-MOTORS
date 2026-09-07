import { logError } from "../infrastructure/logging/index.js";
import { advertisingService } from "../services/advertising.service.js";

export const getAdSlots = async (req, res) => {
  try {
    const data = await advertisingService.listPublic(req.query.placement);
    res.json({ success: true, data });
  } catch (error) {
    logError("Error fetching ad slots:", error);
    res.status(400).json({ success: false, message: error.message || "Failed to load ads" });
  }
};

export const getAllAdSlots = async (req, res) => {
  try { res.json({ success: true, data: await advertisingService.listAdmin() }); }
  catch (error) { logError("Error fetching all ad slots:", error); res.status(500).json({ success:false, message:"Failed to load ads" }); }
};

export const getAdStats = async (req, res) => {
  try { res.json({ success: true, data: await advertisingService.stats() }); }
  catch (error) { logError("Error fetching ad stats:", error); res.status(500).json({ success:false, message:"Failed to load ad statistics" }); }
};

export const createAdSlot = async (req, res) => {
  try { res.status(201).json({ success:true, data: await advertisingService.create(req.body, req.user.id) }); }
  catch (error) { logError("Error creating ad slot:", error); res.status(400).json({ success:false, message:error.message || "Failed to create ad" }); }
};

export const updateAdSlot = async (req, res) => {
  try {
    const updated = await advertisingService.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success:false, message:"Ad slot not found" });
    res.json({ success:true, data:updated });
  } catch (error) { logError("Error updating ad slot:", error); res.status(400).json({ success:false, message:error.message || "Failed to update ad" }); }
};

export const deleteAdSlot = async (req, res) => {
  try {
    const removed = await advertisingService.remove(req.params.id);
    if (!removed) return res.status(404).json({ success:false, message:"Ad slot not found" });
    res.json({ success:true, message:"Ad slot removed" });
  } catch (error) { logError("Error deleting ad slot:", error); res.status(500).json({ success:false, message:"Failed to remove ad" }); }
};

export const recordAdEvent = async (req, res) => {
  try {
    const updated = await advertisingService.recordEvent(req.params.id, req.body.type);
    if (!updated) return res.status(404).json({ success:false, message:"Ad not active" });
    res.status(202).json({ success:true });
  } catch (error) { res.status(400).json({ success:false, message:error.message }); }
};
