import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
		exclude: ['node_modules/**', 'reference/**'],
		root: '.',
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, 'src'),
		},
	},
})
