import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './domains/auth/auth.routes.js';
import setupRoutes from './domains/setup/setup.routes.js';
import saasRoutes from './domains/saas/saas.routes.js';
import patientRoutes from './domains/patients/patients.routes.js';
import appointmentRoutes from './domains/appointments/appointments.routes.js';
import emrRoutes from './domains/emr/emr.routes.js';
import bedRoutes from './domains/beds/beds.routes.js';
import requestRoutes from './domains/requests/requests.routes.js';
import billingRoutes from './domains/billing/billing.routes.js';
import diagnosticRoutes from './domains/diagnostics/diagnostics.routes.js';
import admissionRoutes from './domains/admissions/admissions.routes.js';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Global Rate Limiter
app.use('/api/', apiRateLimiter);

// Health Check Endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    system: 'HPMBS Multi-Tenant SaaS Gateway',
    timestamp: new Date().toISOString(),
  });
});

// Domain Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/setup', setupRoutes);
app.use('/api/v1/saas', saasRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/emr', emrRoutes);
app.use('/api/v1/beds', bedRoutes);
app.use('/api/v1/requests', requestRoutes);
app.use('/api/v1/billing', billingRoutes);
app.use('/api/v1/diagnostics', diagnosticRoutes);
app.use('/api/v1/admissions', admissionRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
