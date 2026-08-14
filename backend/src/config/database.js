import mongoose from 'mongoose';
import { env } from './env.js';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGO_URI, {
      maxPoolSize: 50,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });
    console.log(`[MongoDB] Connected: ${conn.connection.host} (Connection Pool: 5-50)`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB Error] Connection Failed: ${error.message}`);
    // Non-fatal fallback for development offline environment if MongoDB service is restarting
    if (env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};
