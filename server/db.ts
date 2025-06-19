import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure neon to use WebSocket
neonConfig.webSocketConstructor = ws;

if (!process.env.SUPABASE_DATABASE_URL) {
  throw new Error(
    "SUPABASE_DATABASE_URL must be set. Did you forget to configure Supabase?",
  );
}

// Configure pool with proper settings for serverless
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 10,
  ssl: { rejectUnauthorized: false }
});

export const db = drizzle({ client: pool, schema });