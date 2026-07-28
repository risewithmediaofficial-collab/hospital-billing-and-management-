import { z } from 'zod';

export const hospitalSetupSchema = z.object({
  hospitalName: z.string().min(3, 'Hospital name must be at least 3 characters'),
  hospitalCode: z.string().min(2, 'Hospital code must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(7, 'Phone number must be valid'),
  address: z.string().min(5, 'Address is required'),
  branchName: z.string().min(2, 'Branch name is required'),
  branchCode: z.string().min(2, 'Branch code is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postalCode: z.string().min(3, 'Postal code is required'),
  adminName: z.string().min(3, 'Admin name is required'),
  adminEmail: z.string().email('Invalid admin email'),
  adminPassword: z.string().min(6, 'Admin password must be at least 6 characters'),
});
