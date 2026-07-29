import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

class SocketManager {
  constructor() {
    this.io = null;
  }

  init(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: env.CORS_ORIGIN,
        credentials: true,
      },
    });

    this.io.use((socket, next) => {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication token required for WebSocket handshake'));
      }
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        socket.user = decoded;
        next();
      } catch (err) {
        next(new Error('Invalid WebSocket token'));
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`[Socket.IO] Client Connected: ${socket.id} (User: ${socket.user.name}, Role: ${socket.user.role})`);

      // Auto join user to branch room & role room
      if (socket.user.branchId) {
        socket.join(`branch_${socket.user.branchId}`);
      }
      if (socket.user.role) {
        socket.join(`role_${socket.user.role}`);
      }

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
      this.io.emit('emergency:alert', data);
      this.io.emit('emergency:code_blue_triggered', data);
      this.io.emit(event, data);
    }
  }

  broadcastCodeBlue(data) {
    if (this.io) {
      this.io.emit('emergency:code_blue_triggered', data);
    }
  }
}

export const socketManager = new SocketManager();
