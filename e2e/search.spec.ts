import { expect, test } from '@playwright/test'

test.describe('Search', () => {
	test('navigates to movie search page', async ({ page }) => {
		await page.goto('/movies')
		await expect(page).toHaveURL(/\/movies/)
	})

	test('navigates to TV search page', async ({ page }) => {
		await page.goto('/tv')
		await expect(page).toHaveURL(/\/tv/)
	})

	test('home page loads', async ({ page }) => {
		await page.goto('/')
		await expect(page.locator('body')).toBeVisible()
	})
})
