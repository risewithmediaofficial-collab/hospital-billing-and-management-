import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';

class SocketManager {
  constructor() {
    this.io = null;
  }

  init(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: (origin, callback) => {
          // Dynamically reflect origin to remain 100% compliant with credentials: true
          callback(null, true);
        },
        credentials: true,
      },
      allowEIO3: true,
      transports: ['websocket', 'polling'],
    });

    this.io.use((socket, next) => {
      const rawToken = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!rawToken) {
        return next(new Error('Authentication token required for WebSocket handshake'));
      }
      const token = typeof rawToken === 'string' && rawToken.startsWith('Bearer ')
        ? rawToken.slice(7).trim()
        : rawToken;
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        socket.user = decoded;
        next();
      } catch (err) {
        console.warn('[Socket.IO Auth Warning] Token verification failed:', err.message);
        next(new Error('Invalid WebSocket token'));
      }
    });

    this.io.on('connection', async (socket) => {
      console.log(`[Socket.IO] Client Connected: ${socket.id} (User: ${socket.user.name}, Role: ${socket.user.role})`);

      // Auto join user to branch room & role room
      if (socket.user.branchId) {
        socket.join(`branch_${socket.user.branchId}`);
      }
      if (socket.user.id) socket.join(`user_${socket.user.id}`);
      const roles = new Set([socket.user.role].filter(Boolean));
      try {
        const currentUser = await User.findById(socket.user.id).select('role additionalRoles');
        if (currentUser?.role) roles.add(currentUser.role);
        for (const role of currentUser?.additionalRoles || []) roles.add(role);
      } catch (error) {
        console.error(`[Socket.IO] Could not refresh roles for ${socket.user.id}:`, error.message);
      }

      // Hospital Administrators and Super Admins oversee all workstation desks
      if (roles.has('HOSPITAL_ADMIN') || roles.has('SUPER_ADMIN')) {
        [
          'DOCTOR',
          'NURSE',
          'NURSE_INCHARGE',
          'PHARMACIST',
          'PHARMACY_STAFF',
          'LAB_TECH',
          'LAB_TECHNICIAN',
          'LABORATORY_STAFF',
          'RADIOLOGIST',
          'RADIOLOGY_STAFF',
          'CASHIER',
          'BILLING_STAFF',
          'RECEPTIONIST',
          'OPD_STAFF',
        ].forEach((r) => roles.add(r));
      }

      roles.forEach((role) => socket.join(`role_${role}`));

      socket.on('join_ward', (wardId) => {
        socket.join(`ward_${wardId}`);
        console.log(`[Socket.IO] ${socket.user.name} joined ward_${wardId}`);
      });

      socket.on('disconnect', () => {
        console.log(`[Socket.IO] Client Disconnected: ${socket.id}`);
      });
    });

    console.log('[Socket.IO] Server Initialized Successfully');
  }

  emitToBranch(branchId, event, data) {
    if (this.io) {
      this.io.to(`branch_${branchId}`).emit(event, data);
    }
  }

  emitToRole(role, event, data) {
    if (this.io) {
      this.io.to(`role_${role}`).emit(event, data);
    }
  }

  emitToUser(userId, event, data) {
    if (this.io && userId) this.io.to(`user_${userId}`).emit(event, data);
  }

  emitToWard(wardId, event, data) {
    if (this.io) {
      this.io.to(`ward_${wardId}`).emit(event, data);
    }
  }

  emitToRoles(roles, event, data) {
    if (this.io && Array.isArray(roles)) {
      roles.forEach((role) => {
        this.io.to(`role_${role}`).emit(event, data);
      });
    }
  }

  emitEmergency(event, data) {
    if (this.io) {
      // Single broadcast to ALL connected clients — avoid emitting code_blue_triggered twice
      this.io.emit('emergency:alert', data);
      this.io.emit('emergency:code_blue_triggered', data);
      // Only emit the named event if it's different from the events already emitted above
      if (event !== 'emergency:alert' && event !== 'emergency:code_blue_triggered') {
        this.io.emit(event, data);
      }
    }
  }

  broadcastCodeBlue(data) {
    if (this.io) {
      this.io.emit('emergency:code_blue_triggered', data);
    }
  }
}

export const socketManager = new SocketManager();
