import mongoose from 'mongoose';
import { env } from './env.js';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB Error] Connection Failed: ${error.message}`);
    // Non-fatal fallback for development offline environment if MongoDB service is restarting
    if (env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};
