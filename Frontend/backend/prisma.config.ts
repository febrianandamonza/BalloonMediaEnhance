import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://skystar:skystar_secret_2026@localhost:5432/skystar_geoint?schema=public',
  },
  migrations: {
    seed: 'npx ts-node prisma/seed.ts',
  },
});
