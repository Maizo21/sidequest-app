import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Load .env.local first (Next.js convention), fall back to .env
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    path: './prisma/migrations',
  },
});
