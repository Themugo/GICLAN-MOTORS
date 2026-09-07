import asyncHandler from '../middleware/asyncHandler.js';
import { ownershipService } from '../ownership/services/ownershipService.js';
import { vehiclePassportService } from '../vehiclePassport/services/vehiclePassportService.js';

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

export const getDashboard = asyncHandler(async (req, res) => ok(res, await ownershipService.getOwnerDashboard(req.user.id)));
export const addVehicle = asyncHandler(async (req, res) => ok(res, await ownershipService.addVehicleToGarage(req.user.id, req.body), 201));
export const getVehicle = asyncHandler(async (req, res) => ok(res, await ownershipService.getVehicleDetails(req.user.id, req.params.vehicleId)));
export const addService = asyncHandler(async (req, res) => ok(res, await ownershipService.addServiceRecord(req.user.id, req.params.vehicleId, req.body), 201));
export const addExpense = asyncHandler(async (req, res) => ok(res, await ownershipService.addExpense(req.user.id, req.params.vehicleId, req.body), 201));
export const addDocument = asyncHandler(async (req, res) => ok(res, await ownershipService.addDocument(req.user.id, req.params.vehicleId, req.body), 201));
export const addTrip = asyncHandler(async (req, res) => ok(res, await ownershipService.addTrip(req.user.id, req.params.vehicleId, req.body), 201));
export const completeReminder = asyncHandler(async (req, res) => ok(res, await ownershipService.completeReminder(req.user.id, req.params.reminderId, req.body?.serviceRecordId || null)));
export const markSold = asyncHandler(async (req, res) => ok(res, await ownershipService.markVehicleSold(req.user.id, req.params.vehicleId, req.body)));

export const createPassport = asyncHandler(async (req, res) => ok(res, await vehiclePassportService.getOrCreatePassport(req.body), 201));
export const getPassport = asyncHandler(async (req, res) => ok(res, await vehiclePassportService.getFullPassport(req.params.passportId)));
export const getPublicPassport = asyncHandler(async (req, res) => ok(res, await vehiclePassportService.getPublicPassport(req.params.passportId)));
export const findPassportByVin = asyncHandler(async (req, res) => {
  const passport = await vehiclePassportService.findPassport(req.params.vin, null, null);
  if (!passport) return res.status(404).json({ success: false, message: 'Passport not found' });
  return ok(res, await vehiclePassportService.getPublicPassport(passport.id));
});
