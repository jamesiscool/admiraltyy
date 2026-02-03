import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test as base } from '@playwright/test'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCREENSHOTS_DIR = join(__dirname, 'screenshots')

// Ensure screenshots directory exists
mkdirSync(SCREENSHOTS_DIR, { recursive: true })

// Extend base test to capture screenshots after each test
export const test = base.extend({})

test.afterEach(async ({ page }, testInfo) => {
	if (!process.env.E2E_SCREENSHOTS) return

	// Create filename from test hierarchy: describe-block/test-name.png
	const describeName = testInfo.titlePath[1] || 'misc'
	const testName = testInfo.titlePath.slice(2).join('-') || testInfo.title

	// Sanitize for filesystem
	const sanitize = (s: string) =>
		s
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '')

	const folderName = sanitize(describeName)
	const fileName = sanitize(testName)

	const folderPath = join(SCREENSHOTS_DIR, folderName)
	mkdirSync(folderPath, { recursive: true })

	const screenshotPath = join(folderPath, `${fileName}.png`)
	await page.screenshot({ path: screenshotPath, fullPage: true })
})

export { expect } from '@playwright/test'
