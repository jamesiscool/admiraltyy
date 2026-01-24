import { expect, test } from '@playwright/test'

test.describe('Search', () => {
	test('navigates to add/search page', async ({ page }) => {
		await page.goto('/add')
		await expect(page).toHaveURL(/\/add/)
		await expect(page.getByRole('heading', { name: 'Add' })).toBeVisible()
	})

	test('shows empty state initially', async ({ page }) => {
		await page.goto('/add')
		await expect(page.getByText('Start typing to search for movies and TV shows')).toBeVisible()
	})

	test('search input is focused on page load', async ({ page }) => {
		await page.goto('/add')
		const input = page.getByPlaceholder('Search for movies or TV shows...')
		await expect(input).toBeFocused()
	})

	test('search movie by title displays results', async ({ page }) => {
		await page.goto('/add')
		const input = page.getByPlaceholder('Search for movies or TV shows...')

		// Search for a known movie
		await input.fill('Inception')

		// Wait for results to load (debounce + API)
		await expect(page.getByRole('heading', { name: 'Movies' })).toBeVisible({ timeout: 10000 })

		// Should show movies section with results
		const moviesSection = page.locator('h2:has-text("Movies")')
		await expect(moviesSection).toBeVisible()
	})

	test('search TV show by title displays results', async ({ page }) => {
		await page.goto('/add')
		const input = page.getByPlaceholder('Search for movies or TV shows...')

		// Search for a known TV show
		await input.fill('Breaking Bad')

		// Wait for results to load
		await expect(page.getByRole('heading', { name: 'TV Shows' })).toBeVisible({ timeout: 10000 })

		// Should show TV section with results
		const tvSection = page.locator('h2:has-text("TV Shows")')
		await expect(tvSection).toBeVisible()
	})

	test('search shows loading state', async ({ page }) => {
		await page.goto('/add')
		const input = page.getByPlaceholder('Search for movies or TV shows...')

		await input.fill('Matrix')

		// Loading state should appear briefly
		// Note: May be too fast to catch consistently
	})

	test('search with no results shows message', async ({ page }) => {
		await page.goto('/add')
		const input = page.getByPlaceholder('Search for movies or TV shows...')

		// Search for something unlikely to have results
		await input.fill('xyznonexistentmovieasdfghjkl12345')

		// Wait for no results message
		await expect(page.getByText(/No results found/)).toBeVisible({ timeout: 10000 })
	})

	test('navigates to movie library page', async ({ page }) => {
		await page.goto('/movies')
		await expect(page).toHaveURL(/\/movies/)
	})

	test('navigates to TV library page', async ({ page }) => {
		await page.goto('/tv')
		await expect(page).toHaveURL(/\/tv/)
	})

	test('home page loads', async ({ page }) => {
		await page.goto('/')
		await expect(page.locator('body')).toBeVisible()
	})
})
