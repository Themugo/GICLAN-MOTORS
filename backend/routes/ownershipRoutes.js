import express from 'express';
import { protect, allowRoles } from '../middleware/auth.js';
import {
  getDashboard, addVehicle, getVehicle, addService, addExpense, addDocument, addTrip,
  completeReminder, markSold, createPassport, getPassport, getPublicPassport, findPassportByVin,
} from '../controllers/ownershipController.js';

const router = express.Router();

router.get('/dashboard', protect, getDashboard);
router.post('/vehicles', protect, addVehicle);
router.get('/vehicles/:vehicleId', protect, getVehicle);
router.post('/vehicles/:vehicleId/services', protect, addService);
router.post('/vehicles/:vehicleId/expenses', protect, addExpense);
router.post('/vehicles/:vehicleId/documents', protect, addDocument);
router.post('/vehicles/:vehicleId/trips', protect, addTrip);
router.patch('/reminders/:reminderId/complete', protect, completeReminder);
router.patch('/vehicles/:vehicleId/sold', protect, markSold);

router.post('/passports', protect, allowRoles('admin', 'superadmin', 'dealer', 'individual_seller'), createPassport);
router.get('/passports/:passportId', protect, getPassport);
router.get('/passports/:passportId/public', getPublicPassport);
router.get('/passports/vin/:vin', findPassportByVin);

export default router;
