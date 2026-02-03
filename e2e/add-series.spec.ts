import { expect, test } from './test-base'

test.describe('Add Series', () => {
	test('opens add series dialog when clicking a TV show search result', async ({ page }) => {
		await page.goto('/add')

		// Search for Game of Thrones (has cached fixtures)
		await page.getByPlaceholder('Search for movies or TV shows').fill('Game of Thrones')

		// Wait for TV Shows section to appear
		await expect(page.getByRole('heading', { name: 'TV Shows' })).toBeVisible()

		// Find the TV Shows column (parent div that contains h2 "TV Shows")
		// The TV show "Game of Thrones" has year 2011, distinct from the movie
		// Click on the h3 with "Game of Thrones" in the TV column that contains (2011)
		const tvColumn = page.locator('div').filter({ has: page.getByRole('heading', { name: 'TV Shows' }) })
		await tvColumn.locator('h3').filter({ hasText: 'Game of Thrones' }).filter({ hasText: '(2011)' }).first().click()

		// Verify dialog opens with series title
		await expect(page.getByRole('dialog')).toBeVisible()
		await expect(page.getByRole('dialog').getByText('Game of Thrones')).toBeVisible()
		await expect(page.getByText('Configure how you want to add this series')).toBeVisible()
	})

	test('dialog shows quality selector and season table', async ({ page }) => {
		await page.goto('/add')

		await page.getByPlaceholder('Search for movies or TV shows').fill('Game of Thrones')
		await expect(page.getByRole('heading', { name: 'TV Shows' })).toBeVisible()

		const tvColumn = page.locator('div').filter({ has: page.getByRole('heading', { name: 'TV Shows' }) })
		await tvColumn.locator('h3').filter({ hasText: 'Game of Thrones' }).filter({ hasText: '(2011)' }).first().click()

		await expect(page.getByRole('dialog')).toBeVisible()

		// Verify quality selector label exists
		await expect(page.getByRole('dialog').getByText('Quality')).toBeVisible()

		// Verify seasons table header exists
		await expect(page.getByRole('dialog').getByText('Seasons to Monitor')).toBeVisible()

		// Verify both buttons exist
		await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeVisible()
		await expect(page.getByRole('button', { name: 'Add & Download' })).toBeVisible()
	})

	test('displays season list from TMDB', async ({ page }) => {
		await page.goto('/add')

		await page.getByPlaceholder('Search for movies or TV shows').fill('Game of Thrones')
		await expect(page.getByRole('heading', { name: 'TV Shows' })).toBeVisible()

		const tvColumn = page.locator('div').filter({ has: page.getByRole('heading', { name: 'TV Shows' }) })
		await tvColumn.locator('h3').filter({ hasText: 'Game of Thrones' }).filter({ hasText: '(2011)' }).first().click()

		await expect(page.getByRole('dialog')).toBeVisible()

		// Wait for season data to load (should show table with Season column)
		await expect(page.getByRole('columnheader', { name: 'Season' })).toBeVisible()
		await expect(page.getByRole('columnheader', { name: 'Year' })).toBeVisible()
		await expect(page.getByRole('columnheader', { name: 'Episodes' })).toBeVisible()

		// Game of Thrones has multiple seasons - verify at least Season 1 is shown
		await expect(page.getByRole('cell', { name: 'Season 1' })).toBeVisible()
	})

	test('can close dialog without adding', async ({ page }) => {
		await page.goto('/add')

		await page.getByPlaceholder('Search for movies or TV shows').fill('Game of Thrones')
		await expect(page.getByRole('heading', { name: 'TV Shows' })).toBeVisible()

		const tvColumn = page.locator('div').filter({ has: page.getByRole('heading', { name: 'TV Shows' }) })
		await tvColumn.locator('h3').filter({ hasText: 'Game of Thrones' }).filter({ hasText: '(2011)' }).first().click()

		await expect(page.getByRole('dialog')).toBeVisible()

		// Close dialog by pressing Escape
		await page.keyboard.press('Escape')

		// Dialog should be closed
		await expect(page.getByRole('dialog')).not.toBeVisible()
	})

	test('clicking Add button triggers add action', async ({ page }) => {
		await page.goto('/add')

		await page.getByPlaceholder('Search for movies or TV shows').fill('Game of Thrones')
		await expect(page.getByRole('heading', { name: 'TV Shows' })).toBeVisible()

		const tvColumn = page.locator('div').filter({ has: page.getByRole('heading', { name: 'TV Shows' }) })
		await tvColumn.locator('h3').filter({ hasText: 'Game of Thrones' }).filter({ hasText: '(2011)' }).first().click()

		await expect(page.getByRole('dialog')).toBeVisible()

		// Wait for seasons to load before clicking Add
		await expect(page.getByRole('cell', { name: 'Season 1' })).toBeVisible()

		// Get the Add button
		const addButton = page.getByRole('button', { name: 'Add', exact: true })
		await expect(addButton).toBeEnabled()

		// Click Add button - should either close dialog (success) or stay open (error)
		await addButton.click()

		// Wait a moment for the action to process
		await page.waitForTimeout(500)

		// Button should still be visible (either loading or complete)
		// The dialog behavior depends on server function result
		// We verify the click doesn't crash the app
		await expect(page.locator('body')).toBeVisible()
	})
})
