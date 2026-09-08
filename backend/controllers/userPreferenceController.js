import { findOne, create, update } from "../db/index.js";
import asyncHandler from "../middleware/asyncHandler.js";

const defaults = {
  theme: "system", language: "en", locale: "en", notifications: {}, privacy: {}, display: {},
  bidding: {}, search: { recentSearches: [] }, accessibility: {}, lastSeen: {},
};

async function getOrCreatePreferences(userId) {
  let preferences = await findOne("user_preferences", { user: userId });
  if (!preferences) preferences = await create("user_preferences", { user: userId, ...defaults });
  return preferences;
}

export const getUserPreferences = asyncHandler(async (req, res) => res.json({ success: true, data: await getOrCreatePreferences(req.user.id) }));

export const updateUserPreferences = asyncHandler(async (req, res) => {
  const current = await getOrCreatePreferences(req.user.id);
  const allowed = ["theme","themeColor","language","locale","timezone","dateFormat","currency","notifications","privacy","display","bidding","search","accessibility"];
  const updates = {};
  for (const field of allowed) if (req.body[field] !== undefined) {
    const value = req.body[field];
    updates[field] = value && typeof value === "object" && !Array.isArray(value) ? { ...(current[field] || {}), ...value } : value;
  }
  const data = Object.keys(updates).length ? await update("user_preferences", current.id, updates) : current;
  res.json({ success: true, data });
});

export const setTheme = asyncHandler(async (req, res) => {
  if (!["light","dark","system"].includes(req.body.theme)) return res.status(400).json({ success:false, message:"Invalid theme. Use 'light', 'dark', or 'system'" });
  const current = await getOrCreatePreferences(req.user.id); const data = await update("user_preferences", current.id, { theme: req.body.theme });
  res.json({ success:true, data:{ theme:data.theme, isDarkMode:data.theme === "dark" } });
});

export const toggleDarkMode = asyncHandler(async (req, res) => {
  const current = await getOrCreatePreferences(req.user.id); const theme = current.theme === "dark" ? "light" : current.theme === "light" ? "system" : "dark";
  const data = await update("user_preferences", current.id, { theme }); res.json({ success:true, data:{ theme:data.theme, previousTheme:current.theme, isDarkMode:data.theme === "dark" } });
});

export const setLanguage = asyncHandler(async (req, res) => {
  if (!["en","sw","ar","zh","de","fr","es","pt"].includes(req.body.language)) return res.status(400).json({ success:false, message:"Invalid language code" });
  const current = await getOrCreatePreferences(req.user.id); const data = await update("user_preferences", current.id, { language:req.body.language, locale:req.body.language });
  res.json({ success:true, data:{ language:data.language, locale:data.locale } });
});

export const updateNotificationSettings = asyncHandler(async (req, res) => {
  if (!["email","push","sms"].includes(req.body.channel)) return res.status(400).json({ success:false, message:"Invalid notification channel" });
  const current = await getOrCreatePreferences(req.user.id);
  const notifications = { ...(current.notifications || {}), [req.body.channel]: req.body.settings || {} };
  const data = await update("user_preferences", current.id, { notifications }); res.json({ success:true, data:data.notifications });
});

export const addRecentSearch = asyncHandler(async (req, res) => {
  if (!req.body.query) return res.status(400).json({ success:false, message:"Query is required" });
  const current = await getOrCreatePreferences(req.user.id); const recent = Array.isArray(current.search?.recentSearches) ? current.search.recentSearches : [];
  const recentSearches = [req.body.query, ...recent.filter(q => q !== req.body.query)].slice(0, 20);
  const data = await update("user_preferences", current.id, { search:{ ...(current.search || {}), recentSearches } }); res.json({ success:true, data:{ recentSearches:data.search.recentSearches } });
});

export const clearRecentSearches = asyncHandler(async (req, res) => { const c=await getOrCreatePreferences(req.user.id); const d=await update("user_preferences", c.id,{search:{...(c.search||{}),recentSearches:[]}}); res.json({success:true,data:{recentSearches:d.search.recentSearches}}); });

export const updateAccessibility = asyncHandler(async (req,res)=>{ const c=await getOrCreatePreferences(req.user.id); const a={...(c.accessibility||{})}; for(const k of ["reducedMotion","highContrast","fontSize","screenReader"]) if(req.body[k]!==undefined)a[k]=req.body[k]; const d=await update("user_preferences",c.id,{accessibility:a}); res.json({success:true,data:d.accessibility}); });

export const updateLastSeen = asyncHandler(async (req,res)=>{ const c=await getOrCreatePreferences(req.user.id); const platform=req.body.platform === "mobile" ? "mobile" : "web"; const lastSeen={...(c.lastSeen||{}),[platform]:new Date().toISOString()}; const d=await update("user_preferences",c.id,{lastSeen}); res.json({success:true,data:{lastSeen:d.lastSeen}}); });

export const getPreferenceStats = asyncHandler(async (_req,res)=>res.status(501).json({success:false,code:"PREFERENCE_STATS_UNAVAILABLE",message:"Preference statistics are not part of the canonical user-preference contract."}));
