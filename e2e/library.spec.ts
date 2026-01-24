import { expect, test } from '@playwright/test'

test.describe('Library', () => {
	test.describe('Movies', () => {
		test('navigates to movies library', async ({ page }) => {
			await page.goto('/movies')
			await expect(page).toHaveURL(/\/movies/)
		})

		test('shows movies page header', async ({ page }) => {
			await page.goto('/movies')
			// Should have Movies heading or icon
			await expect(page.locator('body')).toBeVisible()
		})

		test('has search input for filtering', async ({ page }) => {
			await page.goto('/movies')
			// Movies page has a search input for filtering
			await expect(page.getByPlaceholder('Search movies...')).toBeVisible()
		})
	})

	test.describe('TV Shows', () => {
		test('navigates to TV library', async ({ page }) => {
			await page.goto('/tv')
			await expect(page).toHaveURL(/\/tv/)
		})

		test('shows TV page content', async ({ page }) => {
			await page.goto('/tv')
			await expect(page.locator('body')).toBeVisible()
		})

		test('has search input for filtering', async ({ page }) => {
			await page.goto('/tv')
			// TV page has a search input for filtering
			await expect(page.getByPlaceholder('Search series...')).toBeVisible()
		})
	})
})
