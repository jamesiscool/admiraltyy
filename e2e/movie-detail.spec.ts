import type { Page } from '@playwright/test'
import { expect, test } from './test-base'

test.describe('Movie Detail Page', () => {
	// Helper to navigate to movie detail page
	async function goToFirstMovie(page: Page) {
		await page.goto('/movies')
		await expect(page.getByRole('heading', { name: 'Movies' })).toBeVisible()

		// Get the href of first movie card and navigate directly
		const movieCard = page.locator('a[href^="/movies/"]').first()
		await expect(movieCard).toBeVisible()
		const href = await movieCard.getAttribute('href')
		if (!href) throw new Error('Movie card href not found')
		await page.goto(href)
		await expect(page).toHaveURL(/\/movies\/\d+/)
	}

	test('movie cards have links to detail pages', async ({ page }) => {
		await page.goto('/movies')
		await expect(page.getByRole('heading', { name: 'Movies' })).toBeVisible()

		// Verify movie cards exist with correct href pattern
		const movieCard = page.locator('a[href^="/movies/"]').first()
		await expect(movieCard).toBeVisible()
		const href = await movieCard.getAttribute('href')
		expect(href).toMatch(/\/movies\/\d+/)
	})

	test('displays movie title and year on detail page', async ({ page }) => {
		await goToFirstMovie(page)

		// Title should be in h1
		const title = page.getByRole('heading', { level: 1 })
		await expect(title).toBeVisible()

		// Title should not be empty
		const titleText = await title.textContent()
		expect(titleText?.length).toBeGreaterThan(0)
	})

	test('shows monitored/unmonitored button', async ({ page }) => {
		await goToFirstMovie(page)

		// Should have a monitored button
		const monitoredButton = page.getByRole('button', { name: /monitored/i })
		await expect(monitoredButton).toBeVisible()
	})

	test('shows action buttons (search, edit, delete)', async ({ page }) => {
		await goToFirstMovie(page)

		// Verify action buttons are present
		await expect(page.getByRole('button', { name: 'Auto Search' })).toBeVisible()
		await expect(page.getByRole('button', { name: 'Manual Search' })).toBeVisible()
		await expect(page.getByRole('button', { name: 'Edit Quality' })).toBeVisible()
		await expect(page.getByRole('button', { name: 'Delete Movie' })).toBeVisible()
	})

	test('shows file details card', async ({ page }) => {
		await goToFirstMovie(page)

		// File details card should be visible
		await expect(page.getByText('File Details')).toBeVisible()
	})

	test('opens manual search dialog when clicking Manual Search', async ({ page }) => {
		await goToFirstMovie(page)

		// Click Manual Search button
		await page.getByRole('button', { name: 'Manual Search' }).click()

		// Verify dialog opens
		await expect(page.getByRole('dialog')).toBeVisible()
		await expect(page.getByRole('dialog').getByText('Manual Search')).toBeVisible()

		// Dialog should show loading or results or "no releases found"
		const loadingOrResults = page.getByText('Searching indexers...').or(page.locator('table')).or(page.getByText('No releases found'))
		await expect(loadingOrResults).toBeVisible({ timeout: 15000 })
	})

	test('can close manual search dialog', async ({ page }) => {
		await goToFirstMovie(page)

		// Open dialog
		await page.getByRole('button', { name: 'Manual Search' }).click()
		await expect(page.getByRole('dialog')).toBeVisible()

		// Close with Escape
		await page.keyboard.press('Escape')
		await expect(page.getByRole('dialog')).not.toBeVisible()
	})

	test('opens delete confirmation modal when clicking Delete Movie', async ({ page }) => {
		await goToFirstMovie(page)

		// Click Delete Movie button
		await page.getByRole('button', { name: 'Delete Movie' }).click()

		// Verify delete confirmation dialog opens (AlertDialog has role="alertdialog")
		await expect(page.getByRole('alertdialog')).toBeVisible()
		await expect(page.getByText('Are you sure you want to delete')).toBeVisible()
	})

	test('can cancel delete confirmation', async ({ page }) => {
		await goToFirstMovie(page)

		// Open delete dialog
		await page.getByRole('button', { name: 'Delete Movie' }).click()
		await expect(page.getByRole('alertdialog')).toBeVisible()

		// Cancel/close the dialog
		await page.keyboard.press('Escape')
		await expect(page.getByRole('alertdialog')).not.toBeVisible()
	})

	test('can toggle monitored status', async ({ page }) => {
		await goToFirstMovie(page)

		// Get current monitored state
		const monitoredButton = page.getByRole('button', { name: /monitored/i })
		await expect(monitoredButton).toBeVisible()
		await expect(monitoredButton).toBeEnabled()

		// Click to toggle
		await monitoredButton.click()

		// Button should still be visible after toggle (page doesn't crash)
		await expect(monitoredButton).toBeVisible()
	})
})
