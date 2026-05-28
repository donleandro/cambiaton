import { defineConfig } from 'drizzle-kit';

// Para migrations / studio sobre la D1 desplegada:
//   set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID, CLOUDFLARE_TOKEN en .env
// Para operar la sqlite local (scripts/seed, scripts/migrate-multiuser):
//   no necesita esto, usan better-sqlite3 directo con DATABASE_URL.
const useD1 = !!process.env.CLOUDFLARE_DATABASE_ID;

export default defineConfig(
	useD1
		? {
				schema: './src/lib/server/db/schema.ts',
				out: './drizzle',
				dialect: 'sqlite',
				driver: 'd1-http',
				dbCredentials: {
					accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
					databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
					token: process.env.CLOUDFLARE_API_TOKEN!
				},
				verbose: true,
				strict: true
			}
		: {
				schema: './src/lib/server/db/schema.ts',
				out: './drizzle',
				dialect: 'sqlite',
				dbCredentials: { url: process.env.DATABASE_URL ?? 'local.db' },
				verbose: true,
				strict: true
			}
);
