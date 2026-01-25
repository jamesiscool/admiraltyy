import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
	testDir: './e2e',
	outputDir: './test/results',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 8 : 30,
	reporter: 'list',
	use: {
		baseURL: 'http://localhost:2828',
		trace: 'on-first-retry',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
	webServer: {
		command: 'bun run dev',
		url: 'http://localhost:2828',
		reuseExistingServer: true,
	},
})
