// backend/services/organizationService.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Organization service
// Manages enterprise organizations
// ─────────────────────────────────────────────────────────────

import { logInfo, logError, logWarn } from "../utils/logger.js";
import { findAll, findById, findOne, create, update, remove, count, aggregate } from "../db/index.js";
import { getSupabase } from "../utils/supabase.js";

// =============================
// 🏢 CREATE ORGANIZATION
// =============================

export const createOrganization = async (organizationData) => {
  try {
    const organization = await create("organizations", organizationData);
    logInfo("Organization created", { organizationId: organization.id, name: organization.name });
    return organization;
  } catch (err) {
    logError("Failed to create organization", err);
    throw err;
  }
};

// =============================
// 🏢 GET ORGANIZATION
// =============================

export const getOrganization = async (organizationId) => {
  try {
    const organization = await findById("organizations", organizationId)
       /* .populate("owner", "name email") - TODO: use separate query */
       /* .populate("admins", "name email") - TODO: use separate query */
      ;
    if (!organization) {
      logWarn("Organization not found", { organizationId });
      return null;
    }
    return organization;
  } catch (err) {
    logError("Failed to get organization", err);
    throw err;
  }
};

// =============================
// 🏢 UPDATE ORGANIZATION
// =============================

export const updateOrganization = async (organizationId, updateData) => {
  try {
    const organization = await update("organizations", organizationId, updateData);
    if (!organization) {
      logWarn("Organization not found for update", { organizationId });
      return null;
    }
    logInfo("Organization updated", { organizationId });
    return organization;
  } catch (err) {
    logError("Failed to update organization", err);
    throw err;
  }
};

// =============================
// 🏢 DELETE ORGANIZATION
// =============================

export const deleteOrganization = async (organizationId) => {
  try {
    const organization = await remove("organizations", organizationId);
    if (!organization) {
      logWarn("Organization not found for deletion", { organizationId });
      return null;
    }
    logInfo("Organization deleted", { organizationId });
    return organization;
  } catch (err) {
    logError("Failed to delete organization", err);
    throw err;
  }
};

// =============================
// 👥 GET ORGANIZATION USERS
// =============================

export const getOrganizationUsers = async (organizationId) => {
  try {
    const organization = await findById("organizations", organizationId);
    if (!organization) return null;

    const users = await findAll("users", { filters: {
      $or: [{ _id: organization.owner }, { _id: { $in: organization.admins } }],
    }, select: "name,email,role" });

    return users;
  } catch (err) {
    logError("Failed to get organization users", err);
    throw err;
  }
};

// =============================
// 👤 ADD ORGANIZATION ADMIN
// =============================

export const addOrganizationAdmin = async (organizationId, userId) => {
  try {
    const organization = await findById("organizations", organizationId);
    if (!organization) {
      logWarn("Organization not found", { organizationId });
      return null;
    }

    await organization.addAdmin(userId);
    logInfo("Organization admin added", { organizationId, userId });
    return organization;
  } catch (err) {
    logError("Failed to add organization admin", err);
    throw err;
  }
};

// =============================
// 👤 REMOVE ORGANIZATION ADMIN
// =============================

export const removeOrganizationAdmin = async (organizationId, userId) => {
  try {
    const organization = await findById("organizations", organizationId);
    if (!organization) {
      logWarn("Organization not found", { organizationId });
      return null;
    }

    await organization.removeAdmin(userId);
    logInfo("Organization admin removed", { organizationId, userId });
    return organization;
  } catch (err) {
    logError("Failed to remove organization admin", err);
    throw err;
  }
};

// =============================
// 📍 CREATE BRANCH
// =============================

export const createBranch = async (organizationId, branchData) => {
  try {
    const organization = await findById("organizations", organizationId);
    if (!organization) {
      logWarn("Organization not found", { organizationId });
      return null;
    }

    // Check subscription limits
    if (!organization.checkSubscriptionLimit("branches")) {
      throw new Error("Branch limit reached for current subscription");
    }

    const branch = await create("branches", {
      ...branchData,
      organization: organizationId,
    });

    await organization.incrementBranchCount();
    logInfo("Branch created", { branchId: branch.id, organizationId });
    return branch;
  } catch (err) {
    logError("Failed to create branch", err);
    throw err;
  }
};

// =============================
// 📍 GET ORGANIZATION BRANCHES
// =============================

export const getOrganizationBranches = async (organizationId) => {
  try {
    const branches = await findAll("branches", { filters: { organization_id: organizationId } });
    return branches;
  } catch (err) {
    logError("Failed to get organization branches", err);
    throw err;
  }
};

// =============================
// 📊 GET ORGANIZATION STATS
// =============================

export const getOrganizationStats = async (organizationId) => {
  try {
    const organization = await findById("organizations", organizationId);
    if (!organization) return null;

    const branches = await findAll("branches", { filters: { organization_id: organizationId } });
    const teams = await findAll("teams", { filters: { organization_id: organizationId } });
    const departments = await findAll("departments", { filters: { organization_id: organizationId } });
    const roles = await findAll("roles", { filters: { organization_id: organizationId } });

    return {
      organization: {
        id: organization.id,
        name: organization.name,
        type: organization.type,
        subscription: organization.subscription,
        settings: organization.settings,
      },
      stats: {
        totalBranches: organization.totalBranches,
        totalUsers: organization.totalUsers,
        totalListings: organization.totalListings,
        totalDepartments: departments.length,
        totalTeams: teams.length,
        totalRoles: roles.length,
      },
      branches: branches.map((b) => ({
        id: b.id,
        name: b.name,
        type: b.type,
        status: b.status,
        totalDepartments: b.totalDepartments,
        totalTeams: b.totalTeams,
      })),
      departments: departments.map((d) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        status: d.status,
        totalTeams: d.totalTeams,
      })),
      teams: teams.map((t) => ({
        id: t.id,
        name: t.name,
        type: t.type,
        status: t.status,
        totalMembers: t.totalMembers,
      })),
      roles: roles.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        status: r.status,
        totalUsers: r.totalUsers,
      })),
    };
  } catch (err) {
    logError("Failed to get organization stats", err);
    throw err;
  }
};

// =============================
// 🔄 MIGRATE DEALER TO ORGANIZATION
// =============================

export const migrateDealerToOrganization = async (dealerId) => {
  try {
    const dealer = await findById("dealers", dealerId) /* .populate("user") - TODO: use separate query */;
    if (!dealer) {
      logWarn("Dealer not found for migration", { dealerId });
      return null;
    }

    // Check if organization already exists
    const existingOrganization = await findOne("organizations", { legacyDealerId: dealerId });
    if (existingOrganization) {
      logWarn("Organization already exists for dealer", { dealerId });
      return existingOrganization;
    }

    // Create organization from dealer
    const organization = await Organization.createFromDealer(dealer, dealer.user);
    logInfo("Dealer migrated to organization", { dealerId, organizationId: organization.id });
    return organization;
  } catch (err) {
    logError("Failed to migrate dealer to organization", err);
    throw err;
  }
};

// =============================
// 🔄 BULK MIGRATE DEALERS
// =============================

export const bulkMigrateDealers = async () => {
  try {
    const dealers = await findAll("dealers", { filters: {} }) /* .populate("user") - TODO: use separate query */;

    const results = [];
    for (const dealer of dealers) {
      try {
        const organization = await migrateDealerToOrganization(dealer.id);
        results.push({
          dealerId: dealer.id,
          success: true,
          organizationId: organization.id,
        });
      } catch (err) {
        results.push({
          dealerId: dealer.id,
          success: false,
          error: err.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    logInfo("Bulk dealer migration completed", {
      total: dealers.length,
      success: successCount,
    });

    return {
      total: dealers.length,
      successCount,
      failureCount: dealers.length - successCount,
      results,
    };
  } catch (err) {
    logError("Failed to bulk migrate dealers", err);
    throw err;
  }
};

// =============================
// 📊 GET PLATFORM ORGANIZATION STATS
// =============================

export const getPlatformOrganizationStats = async () => {
  try {
    const stats = await aggregate("organizations", [{
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          totalBranches: { $sum: "$totalBranches" },
          totalUsers: { $sum: "$totalUsers" },
          totalListings: { $sum: "$totalListings" },
        },
      },]);

    const totalOrganizations = await count("organizations", );
    const subscriptionStats = await aggregate("organizations", [{
        $group: {
          _id: "$subscription.plan",
          count: { $sum: 1 },
        },
      },]);

    return {
      totalOrganizations,
      byType: stats,
      bySubscription: subscriptionStats,
    };
  } catch (err) {
    logError("Failed to get platform organization stats", err);
    throw err;
  }
};

export default {
  createOrganization,
  getOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationUsers,
  addOrganizationAdmin,
  removeOrganizationAdmin,
  createBranch,
  getOrganizationBranches,
  getOrganizationStats,
  migrateDealerToOrganization,
  bulkMigrateDealers,
  getPlatformOrganizationStats,
};
