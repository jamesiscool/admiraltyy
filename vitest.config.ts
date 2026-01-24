import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		include: ['src/**/*.test.ts'],
		exclude: ['**/node_modules/**', '**/reference/**', 'reference/**', 'reference/**/*'],
		environment: 'jsdom',
		root: '.',
	},
	resolve: {
		alias: {
			'@': '/workspace/src',
		},
	},
})
