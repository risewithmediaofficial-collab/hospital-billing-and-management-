# Hospital Billing and Management SaaS

Multi-tenant hospital operations platform built with React, Express, MongoDB, and Socket.IO. It supports a small clinic using multi-role staff accounts as well as a multi-branch, multi-specialty hospital with separated departments.

## Portal and role model

- **Super Admin** manages hospitals, plans, subscription state, tenant database preparation/activation, and platform audit data. It cannot perform hospital clinical or financial work.
- **Hospital Admin** manages one hospital: staff, roles, modules, branches, tariffs, beds, guardian approvals, reports, and subscription visibility. Admin mode is governance, not a clinical workstation.
- **Work portal** is available to an admin only when that user has an explicit operational role such as Doctor, Receptionist, Cashier, Nurse, or Pharmacist. It shows only desks belonging to those roles.
- **Operational users** work only in assigned departments and branches. Server-side checks apply even when another portal URL is entered manually.
- **Patient and Guardian** accounts use isolated self-service APIs. Guardian access requires an approved, live, unexpired patient link and its individual permissions.

For a small clinic, assign the owner `HOSPITAL_ADMIN` plus the operational roles they actually perform. For a large hospital, keep governance and department accounts separate.

## Tenant URL and database isolation

The hospital domain/subdomain selects tenant identity for login and routing, but database names derive from the hospital's immutable ID—not its editable URL. Every operational request carries authenticated `hospitalId` and `branchId` context.

Hospitals can run in either:

- **Shared mode:** tenant-aware models scope operational data to the hospital.
- **Dedicated mode:** a hospital receives a separate MongoDB database. Super Admin first prepares and verifies a copy, then explicitly activates it. Activation locks writes, drains active write leases, performs final reconciliation, verifies the result, and switches only after success.

Changing a hospital URL does not rename or select another database. Plan expiry restricts service through subscription policy; it must never delete tenant data.

## Main workflow

1. Reception registers the patient and creates an appointment/token.
2. The doctor consults, writes the EMR, orders diagnostics/prescriptions/admission, and completes the consultation.
3. Completion sends exact charge data to Central Billing.
4. Lab, radiology, and pharmacy process their records and return results or charges to the originating workflow.
5. If Billing returns a record, the source department or attending doctor receives an actionable notification with the exact entity and route.
6. Clicking it opens the correct tab and focuses the persisted record fetched by that page's API.
7. Payment completion updates only notifications related to that patient/invoice and informs Reception.

Patient bedside requests require an active admission. Guardian doctor messages route only to the attending doctor for the linked active admission. Nurse treatment tasks and pharmacy substitutions return to the prescribing doctor rather than unrelated role pools.

## Notification contract

Every actionable persisted notification should include tenant/branch scope, recipient role or exact user ID, source/target module, entity type/ID, action type, and exact `targetRoute`/`linkedPath`. Exact assignment takes priority over role broadcast. The UI uses the server route before a generic module fallback.

## Security notes

- No built-in production credentials or plaintext password-retrieval endpoints.
- Production requires strong, distinct JWT secrets and a valid encryption key.
- Automatic test data is disabled unless explicitly enabled outside production.
- Tenant and exact-role authorization is enforced by the API; hiding a button is only a usability measure.

This repository does **not** by itself certify HIPAA or other regulatory compliance. Compliance also requires deployment controls, contracts, retention policy, backups, incident response, access reviews, and external assessment.

## Setup

Requirements: Node.js 18+ and MongoDB.

```bash
cd backend
npm install
copy .env.example .env
npm start
```

For intentional first-time Super Admin bootstrap, set a unique `SUPER_ADMIN_BOOTSTRAP_PASSWORD` of at least 12 characters. Test data requires `ENABLE_TEST_DATA_SEED=true` outside production.

```bash
cd frontend
npm install
npm run dev
```

## Verification

```bash
cd backend
npm test

cd ../frontend
npm test
npm run build
npm run test:e2e
```

Contract tests cover tenant isolation, database cutover, notification navigation, portal boundaries, operational roles, credential safety, and tenant-scoped sockets. Playwright covers primary portal pages and cross-department workflows in Chromium. Before production, also test Firefox/WebKit and a production-like MongoDB replica set, reverse proxy, email/SMS provider, backup restore, and payment integration.
