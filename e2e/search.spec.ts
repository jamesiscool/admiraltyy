import { expect, test } from './test-base'

test.describe('Search Page', () => {
	test('navigates to add page via header button', async ({ page }) => {
		await page.goto('/')
		await page.getByRole('link', { name: 'Add' }).click()
		await expect(page).toHaveURL('/add')
		await expect(page.getByPlaceholder('Search for movies or TV shows')).toBeVisible()
	})

	test('shows empty state before search', async ({ page }) => {
		await page.goto('/add')
		await expect(page.getByText('Start typing to search')).toBeVisible()
	})

	test('searches and displays movie results', async ({ page }) => {
		await page.goto('/add')

		// Type search query (Game of Thrones has cached fixtures)
		await page.getByPlaceholder('Search for movies or TV shows').fill('Game of Thrones')

		// Wait for results to load
		await expect(page.getByRole('heading', { name: 'Movies' })).toBeVisible()
		await expect(page.getByRole('heading', { name: 'TV Shows' })).toBeVisible()

		// Verify movie results appear
		await expect(page.getByText('Game of Thrones: The Story So Far')).toBeVisible()

		// Verify TV results appear
		await expect(page.getByText('Game of Thrones').first()).toBeVisible()
	})

	test('shows movie count and TV count', async ({ page }) => {
		await page.goto('/add')

		await page.getByPlaceholder('Search for movies or TV shows').fill('Game of Thrones')

		// Wait for results headers with counts
		await expect(page.getByRole('heading', { name: 'Movies' })).toBeVisible()

		// Movie count should be in parentheses after "Movies"
		const moviesSection = page.locator('h2', { hasText: 'Movies' })
		await expect(moviesSection).toContainText('(')
	})

	test('displays search result cards with title, year, and genres', async ({ page }) => {
		await page.goto('/add')

		await page.getByPlaceholder('Search for movies or TV shows').fill('Game of Thrones')

		// Wait for results
		await expect(page.getByRole('heading', { name: 'TV Shows' })).toBeVisible()

		// Check that the main "Game of Thrones" TV show exists (first aired 2011)
		await expect(page.getByText('(2011)')).toBeVisible()

		// Check that genre badges are displayed (Drama and Sci-Fi & Fantasy for GoT TV show)
		await expect(page.getByText('Drama').first()).toBeVisible()
		await expect(page.getByText('Sci-Fi & Fantasy').first()).toBeVisible()
	})

	test('clears results when search is cleared', async ({ page }) => {
		await page.goto('/add')

		const searchInput = page.getByPlaceholder('Search for movies or TV shows')

		// Search for something
		await searchInput.fill('Game of Thrones')
		await expect(page.getByRole('heading', { name: 'Movies' })).toBeVisible()

		// Clear the search
		await searchInput.clear()

		// Should show empty state again
		await expect(page.getByText('Start typing to search')).toBeVisible()
	})

	test('shows no results message for unknown query', async ({ page }) => {
		await page.goto('/add')

		// Type a query that likely has no results
		await page.getByPlaceholder('Search for movies or TV shows').fill('xyznonexistent12345')

		// Wait and check for no results message
		// Note: this may fail in CI if cache miss occurs
		await expect(page.getByText('No results found')).toBeVisible({ timeout: 10000 })
	})
})
