import { Router } from 'express';
import {
  getBedMatrix,
  getDashboardSummary,
  getHierarchy,
  getOccupancyReports,
  createBed,
  updateBed,
  deleteBed,
  bulkGenerate,
  updateBedStatus,
  reserveBed,
  releaseReservation,
  markCleaningComplete,
  markMaintenance,
  repairCompleted,
  transferPatient,
  getBedHistory,
  getTransferHistory,
  getBlocks,
  createBlock,
  updateBlock,
  deleteBlock,
  getFloors,
  createFloor,
  updateFloor,
  deleteFloor,
  getWards,
  createWard,
  updateWard,
  deleteWard,
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom,
} from './beds.controller.js';
import { verifyJwt } from '../../middleware/verifyJwt.js';
import { requireAssignedRole } from '../../middleware/permissions.js';

const router = Router();

router.use(verifyJwt);
const manageBedStructure = requireAssignedRole('NURSE_INCHARGE', 'IPD_STAFF');
const operateBeds = requireAssignedRole('NURSE', 'NURSE_INCHARGE', 'IPD_STAFF', 'SUPPORT_STAFF');

// --- Real-time Matrix & Analytics ---
router.get('/', getBedMatrix);
router.get('/dashboard-summary', getDashboardSummary);
router.get('/hierarchy', getHierarchy);
router.get('/occupancy-reports', getOccupancyReports);

// --- Bulk Operations ---
router.post('/bulk-generate', manageBedStructure, bulkGenerate);

// --- Transfers & History ---
router.post('/transfer-patient', requireAssignedRole('NURSE_INCHARGE', 'IPD_STAFF'), transferPatient);
router.get('/transfers/history', getTransferHistory);
router.get('/:id/history', getBedHistory);

// --- Physical Hierarchy Endpoints ---
// Blocks
router.get('/blocks', getBlocks);
router.post('/blocks', manageBedStructure, createBlock);
router.put('/blocks/:id', manageBedStructure, updateBlock);
router.delete('/blocks/:id', manageBedStructure, deleteBlock);

// Floors
router.get('/floors', getFloors);
router.post('/floors', manageBedStructure, createFloor);
router.put('/floors/:id', manageBedStructure, updateFloor);
router.delete('/floors/:id', manageBedStructure, deleteFloor);

// Wards
router.get('/wards', getWards);
router.post('/wards', manageBedStructure, createWard);
router.put('/wards/:id', manageBedStructure, updateWard);
router.delete('/wards/:id', manageBedStructure, deleteWard);

// Rooms
router.get('/rooms', getRooms);
router.post('/rooms', manageBedStructure, createRoom);
router.put('/rooms/:id', manageBedStructure, updateRoom);
router.delete('/rooms/:id', manageBedStructure, deleteRoom);

// --- Status Workflows on specific Bed ---
router.patch('/:id/status', operateBeds, updateBedStatus);
router.post('/:id/reserve', operateBeds, reserveBed);
router.post('/:id/release-reservation', operateBeds, releaseReservation);
router.post('/:id/mark-cleaned', operateBeds, markCleaningComplete);
router.post('/:id/mark-maintenance', operateBeds, markMaintenance);
router.post('/:id/repair-completed', operateBeds, repairCompleted);

// --- Single Bed CRUD ---
router.post('/', manageBedStructure, createBed);
router.put('/:id', manageBedStructure, updateBed);
router.delete('/:id', manageBedStructure, deleteBed);

export default router;
