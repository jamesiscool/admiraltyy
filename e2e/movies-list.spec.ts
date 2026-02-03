import { expect, test } from './test-base'

test.describe('Movies List Page', () => {
	test('displays page with heading and movie grid', async ({ page }) => {
		await page.goto('/movies')

		await expect(page.getByRole('heading', { name: 'Movies' })).toBeVisible()

		// Search input should be visible
		await expect(page.getByPlaceholder('Search movies...')).toBeVisible()

		// Movie cards should be displayed (links to movie detail pages)
		const movieCards = page.locator('a[href^="/movies/"]')
		await expect(movieCards.first()).toBeVisible()
	})

	test('search filters movies by title', async ({ page }) => {
		await page.goto('/movies')

		const searchInput = page.getByPlaceholder('Search movies...')
		await expect(searchInput).toBeVisible()

		// Get count before search
		const movieCards = page.locator('a[href^="/movies/"]')
		const countBefore = await movieCards.count()

		// Search for something unlikely to match all
		await searchInput.fill('xyznonexistent123')

		// Should show empty state or fewer results
		const countAfter = await movieCards.count()
		const emptyState = page.getByText('No movies found')

		// Either no results or fewer than before
		if (countBefore > 0) {
			const hasEmpty = await emptyState.isVisible()
			expect(hasEmpty || countAfter < countBefore).toBe(true)
		}
	})

	test('can clear search with X button', async ({ page }) => {
		await page.goto('/movies')

		const searchInput = page.getByPlaceholder('Search movies...')
		await searchInput.fill('test')

		// X button should appear
		const clearButton = page.locator('button').filter({ has: page.locator('svg.lucide-x') })
		await expect(clearButton).toBeVisible()

		await clearButton.click()

		// Search should be cleared
		await expect(searchInput).toHaveValue('')
	})

	test('filter controls are visible', async ({ page }) => {
		await page.goto('/movies')

		// Status toggle (All / Missing / Downloaded)
		await expect(page.getByRole('group').filter({ hasText: 'All' })).toBeVisible()

		// Quality filter label and select
		await expect(page.getByText('Quality').first()).toBeVisible()

		// Monitor filter label
		await expect(page.getByText('Monitor').first()).toBeVisible()

		// Sort by label
		await expect(page.getByText('Sort by').first()).toBeVisible()
	})

	test('sort dropdown is visible', async ({ page }) => {
		await page.goto('/movies')

		// Sort by label and dropdown
		await expect(page.getByText('Sort by')).toBeVisible()
		await expect(page.getByText('Date Added').first()).toBeVisible()
	})

	test('footer displays stats', async ({ page }) => {
		await page.goto('/movies')

		// Footer should show movie counts - look for the specific pattern
		await expect(page.getByText('Downloaded').first()).toBeVisible()
		await expect(page.getByText('Wanted').first()).toBeVisible()
	})

	test('movie card shows action buttons on hover', async ({ page }) => {
		await page.goto('/movies')

		// Find a movie card
		const movieCard = page.locator('a[href^="/movies/"]').first()
		await expect(movieCard).toBeVisible()

		// Hover over the card
		await movieCard.hover()

		// Action buttons should appear (scoped to the hovered card)
		await expect(movieCard.getByRole('button', { name: 'Auto Search' })).toBeVisible()
		await expect(movieCard.getByRole('button', { name: 'Manual Search' })).toBeVisible()
		await expect(movieCard.getByRole('button', { name: 'Delete Movie' })).toBeVisible()
	})

	test('clicking Delete Movie button opens confirmation modal', async ({ page }) => {
		await page.goto('/movies')

		const movieCard = page.locator('a[href^="/movies/"]').first()
		await movieCard.hover()

		await movieCard.getByRole('button', { name: 'Delete Movie' }).click()

		// Delete confirmation dialog should open
		await expect(page.getByRole('alertdialog')).toBeVisible()
		await expect(page.getByText(/are you sure/i)).toBeVisible()
	})

	test('can cancel delete confirmation', async ({ page }) => {
		await page.goto('/movies')

		const movieCard = page.locator('a[href^="/movies/"]').first()
		await movieCard.hover()

		await movieCard.getByRole('button', { name: 'Delete Movie' }).click()
		await expect(page.getByRole('alertdialog')).toBeVisible()

		// Close dialog
		await page.keyboard.press('Escape')
		await expect(page.getByRole('alertdialog')).not.toBeVisible()
	})

	test('clicking movie card navigates to detail page', async ({ page }) => {
		await page.goto('/movies')

		const movieCard = page.locator('a[href^="/movies/"]').first()
		await expect(movieCard).toBeVisible()

		const href = await movieCard.getAttribute('href')
		if (!href) throw new Error('Movie card href not found')

		// Click on the card itself, not the hover buttons
		await movieCard.click({ position: { x: 10, y: 10 } })

		await expect(page).toHaveURL(href)
	})

	test('empty state shows when no movies match filters', async ({ page }) => {
		await page.goto('/movies')

		// Search for something that won't match
		await page.getByPlaceholder('Search movies...').fill('zzznonexistentmovie999')

		// Empty state should show
		await expect(page.getByText('No movies found')).toBeVisible()

		// Clear filters button should appear
		await expect(page.getByRole('button', { name: /clear/i })).toBeVisible()
	})

	test('clear filters button resets search', async ({ page }) => {
		await page.goto('/movies')

		const searchInput = page.getByPlaceholder('Search movies...')
		await searchInput.fill('zzznonexistentmovie999')

		await expect(page.getByText('No movies found')).toBeVisible()

		await page.getByRole('button', { name: /clear/i }).click()

		// Search should be cleared
		await expect(searchInput).toHaveValue('')
	})

	test('can toggle monitored status from card', async ({ page }) => {
		await page.goto('/movies')

		const movieCard = page.locator('a[href^="/movies/"]').first()
		await movieCard.hover()

		// Find monitored button (scoped to hovered card)
		const monitoredButton = movieCard.getByRole('button', { name: /monitored|unmonitored/i })
		await expect(monitoredButton).toBeVisible()

		// Click should not crash the page
		await monitoredButton.click()

		// Page should still be visible
		await expect(page.getByRole('heading', { name: 'Movies' })).toBeVisible()
	})
})
