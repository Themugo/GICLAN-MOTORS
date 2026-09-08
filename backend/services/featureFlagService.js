// backend/services/featureFlagService.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Feature Flag service
// Enterprise-grade feature flagging service
// ─────────────────────────────────────────────────────────────

import { logInfo, logError, logWarn } from "../utils/logger.js";
import { findAll, create, update, findOne, remove } from "../db/index.js";
import { getSupabase } from "../utils/supabase.js";

// =============================
// 🔍 GET FLAG BY KEY
// =============================

export const getFlag = async (key) => {
  try {
    const flag = await FeatureFlag.getByKey(key);
    return flag;
  } catch (err) {
    logError("Failed to get flag", err);
    throw err;
  }
};

// =============================
// ✅ CHECK IF FLAG IS ENABLED
// =============================

export const isFlagEnabled = async (key, user = null, dealer = null) => {
  try {
    const enabled = await FeatureFlag.isEnabled(key, user, dealer);
    return enabled;
  } catch (err) {
    logError("Failed to check flag enabled", err);
    // Return true by default to maintain backwards compatibility
    return true;
  }
};

// =============================
// 📊 EVALUATE FLAG
// =============================

export const evaluateFlag = async (key, user = null, dealer = null) => {
  try {
    const enabled = await FeatureFlag.evaluate(key, user, dealer);

    // Increment evaluation counter
    const flag = await FeatureFlag.getByKey(key);
    if (flag) {
      await flag.incrementEvaluation();
    }

    return enabled;
  } catch (err) {
    logError("Failed to evaluate flag", err);
    // Return true by default to maintain backwards compatibility
    return true;
  }
};

// =============================
// 📋 GET ALL FLAGS
// =============================

export const getAllFlags = async (filters = {}) => {
  try {
    const query = {};

    if (filters.category) {
      query.category = filters.category;
    }

    if (filters.enabled !== undefined) {
      query.enabled = filters.enabled;
    }

    if (filters.environment) {
      query.environments = filters.environment;
    }

    const flags = await findAll("feature_flags", { filters: query, orderBy: { category: 1, key: 1 } });
    return flags;
  } catch (err) {
    logError("Failed to get all flags", err);
    throw err;
  }
};

// =============================
// 📋 GET FLAGS BY CATEGORY
// =============================

export const getFlagsByCategory = async (category) => {
  try {
    const flags = await FeatureFlag.getByCategory(category);
    return flags;
  } catch (err) {
    logError("Failed to get flags by category", err);
    throw err;
  }
};

// =============================
// ➕ CREATE FLAG
// =============================

export const createFlag = async (flagData, createdBy) => {
  try {
    const flag = await create("feature_flags", {
      ...flagData,
      createdBy,
    });

    logInfo("Feature flag created", { key: flag.key, category: flag.category });
    return flag;
  } catch (err) {
    logError("Failed to create flag", err);
    throw err;
  }
};

// =============================
// ✏️ UPDATE FLAG
// =============================

export const updateFlag = async (key, flagData, updatedBy) => {
  try {
    const existing = await findOne("feature_flags", { key });
    if (!existing) {
      throw new Error(`Flag with key "${key}" not found`);
    }
    const flag = await update("feature_flags", existing.id, {
      ...flagData,
      updatedBy,
      updatedAt: new Date().toISOString(),
    });

    logInfo("Feature flag updated", { key, category: flag.category });
    return flag;
  } catch (err) {
    logError("Failed to update flag", err);
    throw err;
  }
};

// =============================
// 🗑️ DELETE FLAG
// =============================

export const deleteFlag = async (key) => {
  try {
    const flag = (async () => { const _r = await findOne("feature_flags", { key }); if (_r) await remove("feature_flags", _r.id); return _r; })();

    if (!flag) {
      throw new Error(`Flag with key "${key}" not found`);
    }

    logInfo("Feature flag deleted", { key, category: flag.category });
    return flag;
  } catch (err) {
    logError("Failed to delete flag", err);
    throw err;
  }
};

// =============================
// 🔄 TOGGLE FLAG
// =============================

export const toggleFlag = async (key) => {
  try {
    const flag = await FeatureFlag.toggle(key);
    logInfo("Feature flag toggled", { key, enabled: flag.enabled });
    return flag;
  } catch (err) {
    logError("Failed to toggle flag", err);
    throw err;
  }
};

// =============================
// 📊 GET FLAG STATS
// =============================

export const getFlagStats = async (key) => {
  try {
    const flag = await FeatureFlag.getByKey(key);

    if (!flag) {
      throw new Error(`Flag with key "${key}" not found`);
    }

    return {
      key: flag.key,
      name: flag.name,
      enabled: flag.enabled,
      type: flag.type,
      percentage: flag.percentage,
      evaluationCount: flag.evaluationCount,
      lastEvaluatedAt: flag.lastEvaluatedAt,
      category: flag.category,
      environments: flag.environments,
      roles: flag.roles,
      dealers: flag.dealers,
    };
  } catch (err) {
    logError("Failed to get flag stats", err);
    throw err;
  }
};

// =============================
// 🌍 GET FLAGS BY ENVIRONMENT
// =============================

export const getFlagsByEnvironment = async (environment) => {
  try {
    const flags = await FeatureFlag.getByEnvironment(environment);
    return flags;
  } catch (err) {
    logError("Failed to get flags by environment", err);
    throw err;
  }
};

// =============================
// 👤 GET FLAGS BY ROLE
// =============================

export const getFlagsByRole = async (role) => {
  try {
    const flags = await FeatureFlag.getByRole(role);
    return flags;
  } catch (err) {
    logError("Failed to get flags by role", err);
    throw err;
  }
};

// =============================
// 📊 GET FLAG CATEGORIES
// =============================

export const getFlagCategories = async () => {
  try {
    const categories = await FeatureFlag.distinct("category");
    return categories;
  } catch (err) {
    logError("Failed to get flag categories", err);
    throw err;
  }
};

// =============================
// 📊 BATCH EVALUATE FLAGS
// =============================

export const batchEvaluateFlags = async (keys, user = null, dealer = null) => {
  try {
    const results = {};

    for (const key of keys) {
      results[key] = await evaluateFlag(key, user, dealer);
    }

    return results;
  } catch (err) {
    logError("Failed to batch evaluate flags", err);
    throw err;
  }
};

// =============================
// 📊 GET ENABLED FLAGS FOR USER
// =============================

export const getEnabledFlagsForUser = async (user, dealer = null) => {
  try {
    const allFlags = await FeatureFlag.getEnabledFlags();
    const enabledFlags = {};

    for (const flag of allFlags) {
      enabledFlags[flag.key] = flag.isEnabled(user, dealer);
    }

    return enabledFlags;
  } catch (err) {
    logError("Failed to get enabled flags for user", err);
    throw err;
  }
};

export default {
  getFlag,
  isFlagEnabled,
  evaluateFlag,
  getAllFlags,
  getFlagsByCategory,
  createFlag,
  updateFlag,
  deleteFlag,
  toggleFlag,
  getFlagStats,
  getFlagsByEnvironment,
  getFlagsByRole,
  getFlagCategories,
  batchEvaluateFlags,
  getEnabledFlagsForUser,
};
