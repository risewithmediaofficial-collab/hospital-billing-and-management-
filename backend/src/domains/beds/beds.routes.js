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

const router = Router();

router.use(verifyJwt);

// --- Real-time Matrix & Analytics ---
router.get('/', getBedMatrix);
router.get('/dashboard-summary', getDashboardSummary);
router.get('/hierarchy', getHierarchy);
router.get('/occupancy-reports', getOccupancyReports);

// --- Bulk Operations ---
router.post('/bulk-generate', bulkGenerate);

// --- Transfers & History ---
router.post('/transfer-patient', transferPatient);
router.get('/transfers/history', getTransferHistory);
router.get('/:id/history', getBedHistory);

// --- Physical Hierarchy Endpoints ---
// Blocks
router.get('/blocks', getBlocks);
router.post('/blocks', createBlock);
router.put('/blocks/:id', updateBlock);
router.delete('/blocks/:id', deleteBlock);

// Floors
router.get('/floors', getFloors);
router.post('/floors', createFloor);
router.put('/floors/:id', updateFloor);
router.delete('/floors/:id', deleteFloor);

// Wards
router.get('/wards', getWards);
router.post('/wards', createWard);
router.put('/wards/:id', updateWard);
router.delete('/wards/:id', deleteWard);

// Rooms
router.get('/rooms', getRooms);
router.post('/rooms', createRoom);
router.put('/rooms/:id', updateRoom);
router.delete('/rooms/:id', deleteRoom);

// --- Status Workflows on specific Bed ---
router.patch('/:id/status', updateBedStatus);
router.post('/:id/reserve', reserveBed);
router.post('/:id/release-reservation', releaseReservation);
router.post('/:id/mark-cleaned', markCleaningComplete);
router.post('/:id/mark-maintenance', markMaintenance);
router.post('/:id/repair-completed', repairCompleted);

// --- Single Bed CRUD ---
router.post('/', createBed);
router.put('/:id', updateBed);
router.delete('/:id', deleteBed);

export default router;
