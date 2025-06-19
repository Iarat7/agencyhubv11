import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. PostgreSQL database is required.");
}

// Configure postgres-js for production use
const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString, {
  prepare: false,
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
});

export const db = drizzle(client, { schema });

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await client`SELECT 1`;
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Initialize database connection
export async function initializeDatabase() {
  const isConnected = await checkDatabaseConnection();
  if (!isConnected) {
    console.warn('Database connection failed. Application will run with limited functionality.');
  }
  return isConnected;
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Closing database connection...');
  await client.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Closing database connection...');
  await client.end();
  process.exit(0);
});