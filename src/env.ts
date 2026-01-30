import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

const cwd = typeof process !== 'undefined' && typeof process.cwd === 'function' ? process.cwd() : ''
const dataDirectory = process.env?.DATA_DIRECTORY || `${cwd}/data`

export const env = createEnv({
	server: {
		DATA_DIRECTORY: z.string().default(`${cwd}/data`),
		SETTINGS_PATH: z.string().default(`${dataDirectory}/admiraltyy.settings.json`),
		DATABASE_PATH: z.string().default(`${dataDirectory}/admiraltyy.db`),
		LOG_DIRECTORY: z.string().default(`${dataDirectory}/logs`),
		BUN_ENV: z.enum(['development', 'test', 'production']).default('production'),
	},
	clientPrefix: 'VITE_',
	client: {},
	runtimeEnv: typeof process !== 'undefined' ? process.env : {},
	emptyStringAsUndefined: true,
})
