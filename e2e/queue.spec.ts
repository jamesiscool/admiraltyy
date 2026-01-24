import { expect, test } from '@playwright/test'

test.describe('Activity/Queue', () => {
	test('navigates to activity page', async ({ page }) => {
		await page.goto('/activity')
		await expect(page).toHaveURL(/\/activity/)
	})

	test('activity page loads content', async ({ page }) => {
		await page.goto('/activity')
		// Page should load and display some content
		await expect(page.locator('body')).toBeVisible()
	})
})
