# Hospital Billing and Management System (HPMBS Enterprise)

A comprehensive, multi-tenant Hospital Management & Centralized Billing System built with React, Node.js, Express, MongoDB, and Socket.IO.

## Features

- **Multi-Tenant Architecture**: Supports Super Admin, Hospital Admin, Doctors, Nurses, Receptionists, Pharmacists, Lab Technicians, Radiologists, Cashiers, and Patients.
- **Reception Workspace**: 4-tab patient directory lifecycle (Awaiting Token, Queued, Completed & Billed, All Hospital Patients) with automatic token sequencing and live OPD assignment.
- **Doctor Clinical EMR Workstation**:
  - Live doctor status toggle (`ONLINE & ACTIVE` / `OFFLINE`)
  - Editable OPD Cabin Number self-assignment
  - Real-time live queue, completed visits history, and department reports inbox
  - Diagnostic test requests (X-Ray, MRI, CT, Lab, ECG) and IPD admission modal
- **Centralized Billing & Department Charges**: Aggregate consultation, pharmacy, laboratory, and radiology charges automatically into unified invoices upon doctor finalization.
- **Real-Time Synchronisation**: WebSockets (Socket.IO) for live queue transitions, department status updates, and code blue alerts.
- **HIPAA & Security Compliance**: Role-based access control (RBAC), JWT authentication, and structured audit logs.

## Setup & Running

### Prerequisites
- Node.js (v18+)
- MongoDB

### Backend Setup
```bash
cd backend
npm install
npm run seed  # Seeds initial admin and department data
npm start     # Runs backend on port 5001
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev   # Runs Vite frontend on port 5173
```
