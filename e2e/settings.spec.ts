import { expect, test } from '@playwright/test'

test.describe('Settings', () => {
	test('navigates to settings page', async ({ page }) => {
		await page.goto('/settings')
		await expect(page).toHaveURL(/\/settings/)
	})

	test('shows settings sections', async ({ page }) => {
		await page.goto('/settings')

		// Should show section headings
		await expect(page.getByRole('heading', { name: 'Indexers' })).toBeVisible()
		await expect(page.getByRole('heading', { name: 'Servers' })).toBeVisible()
		await expect(page.getByRole('heading', { name: 'Folders' })).toBeVisible()
		await expect(page.getByRole('heading', { name: 'Quality' })).toBeVisible()
	})

	test('shows downloads section', async ({ page }) => {
		await page.goto('/settings')

		// Downloads section should be visible
		await expect(page.getByRole('heading', { name: 'Downloads' })).toBeVisible()
	})
})
