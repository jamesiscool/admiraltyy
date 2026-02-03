import { expect, test } from './test-base'

test.describe('TV Series List Page', () => {
	test('displays page with heading and series grid', async ({ page }) => {
		await page.goto('/tv')

		await expect(page.getByRole('heading', { name: 'TV Series' })).toBeVisible()

		// Search input should be visible
		await expect(page.getByPlaceholder('Search series...')).toBeVisible()

		// Series cards should be displayed (links to series detail pages)
		const seriesCards = page.locator('a[href^="/tv/"]')
		await expect(seriesCards.first()).toBeVisible()
	})

	test('search filters series by title', async ({ page }) => {
		await page.goto('/tv')

		const searchInput = page.getByPlaceholder('Search series...')
		await expect(searchInput).toBeVisible()

		// Get count before search
		const seriesCards = page.locator('a[href^="/tv/"]')
		const countBefore = await seriesCards.count()

		// Search for something unlikely to match all
		await searchInput.fill('xyznonexistent123')

		// Should show empty state or fewer results
		const countAfter = await seriesCards.count()
		const emptyState = page.getByText('No series found')

		// Either no results or fewer than before
		if (countBefore > 0) {
			const hasEmpty = await emptyState.isVisible()
			expect(hasEmpty || countAfter < countBefore).toBe(true)
		}
	})

	test('can clear search with X button', async ({ page }) => {
		await page.goto('/tv')

		const searchInput = page.getByPlaceholder('Search series...')
		await searchInput.fill('test')

		// X button should appear
		const clearButton = page.locator('button').filter({ has: page.locator('svg.lucide-x') })
		await expect(clearButton).toBeVisible()

		await clearButton.click()

		// Search should be cleared
		await expect(searchInput).toHaveValue('')
	})

	test('filter controls are visible', async ({ page }) => {
		await page.goto('/tv')

		// Status toggle (All / Continuing / Ended)
		await expect(page.getByRole('group').filter({ hasText: 'All' })).toBeVisible()

		// Quality filter label
		await expect(page.getByText('Quality').first()).toBeVisible()

		// Monitor filter label
		await expect(page.getByText('Monitor').first()).toBeVisible()

		// Sort by label
		await expect(page.getByText('Sort by').first()).toBeVisible()
	})

	test('sort dropdown is visible', async ({ page }) => {
		await page.goto('/tv')

		// Sort by label and dropdown
		await expect(page.getByText('Sort by')).toBeVisible()
		await expect(page.getByText('Date Added').first()).toBeVisible()
	})

	test('footer displays stats', async ({ page }) => {
		await page.goto('/tv')

		// Footer should show series counts
		await expect(page.getByText('Continuing').first()).toBeVisible()
		await expect(page.getByText('Ended').first()).toBeVisible()
	})

	test('series card shows action buttons on hover', async ({ page }) => {
		await page.goto('/tv')

		// Find a series card
		const seriesCard = page.locator('a[href^="/tv/"]').first()
		await expect(seriesCard).toBeVisible()

		// Hover over the card
		await seriesCard.hover()

		// Action buttons should appear
		await expect(page.getByRole('button', { name: 'Auto Search' })).toBeVisible()
		await expect(page.getByRole('button', { name: 'Manual Search' })).toBeVisible()
		await expect(page.getByRole('button', { name: 'Delete Series' })).toBeVisible()
	})

	test('clicking Delete Series button opens confirmation modal', async ({ page }) => {
		await page.goto('/tv')

		const seriesCard = page.locator('a[href^="/tv/"]').first()
		await seriesCard.hover()

		await page.getByRole('button', { name: 'Delete Series' }).click()

		// Delete confirmation dialog should open
		await expect(page.getByRole('alertdialog')).toBeVisible()
		await expect(page.getByText(/are you sure/i)).toBeVisible()
	})

	test('can cancel delete confirmation', async ({ page }) => {
		await page.goto('/tv')

		const seriesCard = page.locator('a[href^="/tv/"]').first()
		await seriesCard.hover()

		await page.getByRole('button', { name: 'Delete Series' }).click()
		await expect(page.getByRole('alertdialog')).toBeVisible()

		// Close dialog
		await page.keyboard.press('Escape')
		await expect(page.getByRole('alertdialog')).not.toBeVisible()
	})

	test('clicking series card navigates to detail page', async ({ page }) => {
		await page.goto('/tv')

		const seriesCard = page.locator('a[href^="/tv/"]').first()
		await expect(seriesCard).toBeVisible()

		const href = await seriesCard.getAttribute('href')
		if (!href) throw new Error('Series card href not found')

		// Click on the card itself, not the hover buttons
		await seriesCard.click({ position: { x: 10, y: 10 } })

		await expect(page).toHaveURL(href)
	})

	test('empty state shows when no series match filters', async ({ page }) => {
		await page.goto('/tv')

		// Search for something that won't match
		await page.getByPlaceholder('Search series...').fill('zzznonexistentseries999')

		// Empty state should show
		await expect(page.getByText('No series found')).toBeVisible()

		// Clear filters button should appear
		await expect(page.getByRole('button', { name: /clear/i })).toBeVisible()
	})

	test('clear filters button resets search', async ({ page }) => {
		await page.goto('/tv')

		const searchInput = page.getByPlaceholder('Search series...')
		await searchInput.fill('zzznonexistentseries999')

		await expect(page.getByText('No series found')).toBeVisible()

		await page.getByRole('button', { name: /clear/i }).click()

		// Search should be cleared
		await expect(searchInput).toHaveValue('')
	})

	test('can toggle monitored status from card', async ({ page }) => {
		await page.goto('/tv')

		const seriesCard = page.locator('a[href^="/tv/"]').first()
		await seriesCard.hover()

		// Find monitored button
		const monitoredButton = page.getByRole('button', { name: /monitored|unmonitored/i })
		await expect(monitoredButton).toBeVisible()

		// Click should not crash the page
		await monitoredButton.click()

		// Page should still be visible
		await expect(page.getByRole('heading', { name: 'TV Series' })).toBeVisible()
	})
})
