import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { defineConfig } from 'drizzle-kit'
import { env } from './src/env.ts'

mkdirSync(dirname(env.DATABASE_PATH), { recursive: true })

export default defineConfig({
	dialect: 'sqlite',
	schema: './src/db/schema.ts',
	out: './drizzle',
	dbCredentials: {
		url: env.DATABASE_PATH,
	},
})
