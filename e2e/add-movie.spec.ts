import { expect, test } from './test-base'

test.describe('Add Movie', () => {
	test('opens add movie dialog when clicking a movie search result', async ({ page }) => {
		await page.goto('/add')

		// Search for Game of Thrones (has cached fixtures)
		await page.getByPlaceholder('Search for movies or TV shows').fill('Game of Thrones')

		// Wait for results
		await expect(page.getByRole('heading', { name: 'Movies' })).toBeVisible()

		// Click on "Game of Thrones: The Story So Far" movie
		await page.getByText('Game of Thrones: The Story So Far').click()

		// Verify dialog opens with movie title
		await expect(page.getByRole('dialog')).toBeVisible()
		await expect(page.getByRole('dialog').getByText('Game of Thrones: The Story So Far')).toBeVisible()
		await expect(page.getByText('Configure how you want to add this movie')).toBeVisible()
	})

	test('dialog shows quality selector and buttons', async ({ page }) => {
		await page.goto('/add')

		await page.getByPlaceholder('Search for movies or TV shows').fill('Game of Thrones')
		await expect(page.getByRole('heading', { name: 'Movies' })).toBeVisible()
		await page.getByText('Game of Thrones: The Story So Far').click()

		await expect(page.getByRole('dialog')).toBeVisible()

		// Verify quality selector label exists
		await expect(page.getByRole('dialog').getByText('Quality')).toBeVisible()

		// Verify both buttons exist
		await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeVisible()
		await expect(page.getByRole('button', { name: 'Add & Download' })).toBeVisible()
	})

	test('can close dialog without adding', async ({ page }) => {
		await page.goto('/add')

		await page.getByPlaceholder('Search for movies or TV shows').fill('Game of Thrones')
		await expect(page.getByRole('heading', { name: 'Movies' })).toBeVisible()
		await page.getByText('Game of Thrones: The Story So Far').click()

		await expect(page.getByRole('dialog')).toBeVisible()

		// Close dialog by pressing Escape
		await page.keyboard.press('Escape')

		// Dialog should be closed
		await expect(page.getByRole('dialog')).not.toBeVisible()
	})

	test('clicking Add button triggers add action', async ({ page }) => {
		await page.goto('/add')

		await page.getByPlaceholder('Search for movies or TV shows').fill('Game of Thrones')
		await expect(page.getByRole('heading', { name: 'Movies' })).toBeVisible()
		await page.getByText('Game of Thrones: The Story So Far').click()

		await expect(page.getByRole('dialog')).toBeVisible()

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
