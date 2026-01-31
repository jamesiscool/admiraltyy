import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

const cwd = typeof process !== 'undefined' && typeof process.cwd === 'function' ? process.cwd() : ''
const dataDirectory = process.env?.DATA_DIRECTORY || `${cwd}`

export const env = createEnv({
	server: {
		PORT: z.coerce.number().int().min(1).max(65535).default(2828),
		DATA_DIRECTORY: z.string().default(`${cwd}`),
		SETTINGS_PATH: z.string().default(`${dataDirectory}/admiraltyy.settings.json`),
		DATABASE_PATH: z.string().default(`${dataDirectory}/admiraltyy.db`),
		LOG_DIRECTORY: z.string().default(`${dataDirectory}/logs`),
		DOWNLOAD_FOLDER: z.string().optional(),
		BUN_ENV: z.enum(['development', 'test', 'production']).default('production'),
	},
	clientPrefix: 'VITE_',
	client: {},
	runtimeEnv: typeof process !== 'undefined' ? process.env : {},
	emptyStringAsUndefined: true,
})
