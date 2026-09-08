// KAYAD INSPECTION WORKFORCE - canonical inspector authorization and lifecycle helpers
import db from './dbAdapter.js';
import { AppError } from '../../utils/AppError.js';

const ACTIVE_ROLES = new Set(['ghost_checker', 'admin', 'superadmin']);

export async function getAssignedStaff(booking) {
  if (!booking?.assigned_staff_id) throw new AppError('No inspector assigned', 400);
  const staff = await db.findById('inspection_staff', booking.assigned_staff_id);
  if (!staff) throw new AppError('Assigned inspector not found', 404);
  if (!staff.is_active) throw new AppError('Assigned inspector is inactive', 403);
  return staff;
}

export async function assertInspectorAccess(booking, userId, role) {
  const staff = await getAssignedStaff(booking);
  if (role === 'admin' || role === 'superadmin') return staff;
  if (!ACTIVE_ROLES.has(role)) throw new AppError('Inspector access required', 403);
  if (String(staff.user_id) !== String(userId)) throw new AppError('Not your inspection assignment', 403);
  return staff;
}

export async function assertStaffAssignable(providerId, staffId) {
  const staff = await db.findById('inspection_staff', staffId);
  if (!staff || String(staff.provider_id) !== String(providerId)) {
    throw new AppError('Invalid inspector', 400);
  }
  if (!staff.is_active || !staff.is_available) {
    throw new AppError('Inspector is inactive or unavailable', 409);
  }
  if (!staff.user_id) {
    throw new AppError('Inspector has no linked user account', 409);
  }
  const user = await db.findById('users', staff.user_id, 'id,role');
  if (!user || !ACTIVE_ROLES.has(user.role)) {
    throw new AppError('Inspector account is not authorized', 403);
  }
  return staff;
}

export default { getAssignedStaff, assertInspectorAccess, assertStaffAssignable };
