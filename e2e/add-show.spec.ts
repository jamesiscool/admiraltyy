import { expect, test } from '@playwright/test'

test.describe('Add TV Show', () => {
	test('search and open add series dialog', async ({ page }) => {
		await page.goto('/add')
		const input = page.getByPlaceholder('Search for movies or TV shows...')

		// Search for a known TV show
		await input.fill('Breaking Bad')

		// Wait for results
		await expect(page.getByRole('heading', { name: 'TV Shows' })).toBeVisible({ timeout: 10000 })

		// Click on first TV result
		const tvCards = page.locator('.cursor-pointer').filter({ hasText: 'Breaking Bad' })
		await tvCards.first().click()

		// Dialog should open
		await expect(page.getByRole('dialog')).toBeVisible()
	})

	test('add series dialog shows quality selector and buttons', async ({ page }) => {
		await page.goto('/add')
		const input = page.getByPlaceholder('Search for movies or TV shows...')

		await input.fill('Game of Thrones')
		await expect(page.getByRole('heading', { name: 'TV Shows' })).toBeVisible({ timeout: 10000 })

		// Click on TV result
		const tvCards = page.locator('.cursor-pointer').filter({ hasText: 'Game of Thrones' })
		await tvCards.first().click()

		// Dialog should be visible with quality selector
		await expect(page.getByRole('dialog')).toBeVisible()
		await expect(page.getByText('Quality')).toBeVisible()

		// Should have Add buttons
		await expect(page.getByRole('button', { name: /^Add$/ })).toBeVisible()
		await expect(page.getByRole('button', { name: 'Add & Download' })).toBeVisible()
	})

	test('can close add series dialog', async ({ page }) => {
		await page.goto('/add')
		const input = page.getByPlaceholder('Search for movies or TV shows...')

		await input.fill('The Office')
		await expect(page.getByRole('heading', { name: 'TV Shows' })).toBeVisible({ timeout: 10000 })

		// Open dialog
		const tvCards = page.locator('.cursor-pointer').filter({ hasText: 'Office' })
		await tvCards.first().click()
		await expect(page.getByRole('dialog')).toBeVisible()

		// Close dialog by pressing Escape
		await page.keyboard.press('Escape')
		await expect(page.getByRole('dialog')).not.toBeVisible()
	})
})
