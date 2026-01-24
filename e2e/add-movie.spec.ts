import { expect, test } from '@playwright/test'

test.describe('Add Movie', () => {
	test('search and open add movie dialog', async ({ page }) => {
		await page.goto('/add')
		const input = page.getByPlaceholder('Search for movies or TV shows...')

		// Search for a known movie
		await input.fill('Inception')

		// Wait for results
		await expect(page.getByRole('heading', { name: 'Movies' })).toBeVisible({ timeout: 10000 })

		// Click on first movie result
		const movieCards = page.locator('.cursor-pointer').filter({ hasText: 'Inception' })
		await movieCards.first().click()

		// Dialog should open
		await expect(page.getByRole('dialog')).toBeVisible()
		await expect(page.getByText('Configure how you want to add this movie')).toBeVisible()
	})

	test('add movie dialog shows quality selector', async ({ page }) => {
		await page.goto('/add')
		const input = page.getByPlaceholder('Search for movies or TV shows...')

		await input.fill('The Matrix')
		await expect(page.getByRole('heading', { name: 'Movies' })).toBeVisible({ timeout: 10000 })

		// Click on movie result
		const movieCards = page.locator('.cursor-pointer').filter({ hasText: 'Matrix' })
		await movieCards.first().click()

		// Dialog should have quality selector (label + select combo)
		await expect(page.getByRole('dialog')).toBeVisible()
		await expect(page.getByText('Quality')).toBeVisible()
	})

	test('add movie dialog has Add and Add & Download buttons', async ({ page }) => {
		await page.goto('/add')
		const input = page.getByPlaceholder('Search for movies or TV shows...')

		await input.fill('Blade Runner')
		await expect(page.getByRole('heading', { name: 'Movies' })).toBeVisible({ timeout: 10000 })

		// Click on movie result
		const movieCards = page.locator('.cursor-pointer').filter({ hasText: 'Blade Runner' })
		await movieCards.first().click()

		// Dialog should have both buttons
		await expect(page.getByRole('dialog')).toBeVisible()
		await expect(page.getByRole('button', { name: /^Add$/ })).toBeVisible()
		await expect(page.getByRole('button', { name: 'Add & Download' })).toBeVisible()
	})

	test('can close add movie dialog', async ({ page }) => {
		await page.goto('/add')
		const input = page.getByPlaceholder('Search for movies or TV shows...')

		await input.fill('Inception')
		await expect(page.getByRole('heading', { name: 'Movies' })).toBeVisible({ timeout: 10000 })

		// Open dialog
		const movieCards = page.locator('.cursor-pointer').filter({ hasText: 'Inception' })
		await movieCards.first().click()
		await expect(page.getByRole('dialog')).toBeVisible()

		// Close dialog by pressing Escape
		await page.keyboard.press('Escape')
		await expect(page.getByRole('dialog')).not.toBeVisible()
	})
})
