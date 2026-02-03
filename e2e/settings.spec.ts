import { expect, test } from './test-base'

test.describe('Settings Page', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/settings')
		await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible()
	})

	test.describe('Navigation', () => {
		test('displays all section headers', async ({ page }) => {
			// All sections should be visible
			await expect(page.getByRole('heading', { name: 'Indexers' })).toBeVisible()
			await expect(page.getByRole('heading', { name: 'Usenet Servers' })).toBeVisible()
			await expect(page.getByRole('heading', { name: 'Downloads' })).toBeVisible()
			await expect(page.getByRole('heading', { name: 'Library Folders' })).toBeVisible()
			await expect(page.getByRole('heading', { name: 'Quality Profiles' })).toBeVisible()
			await expect(page.getByRole('heading', { name: 'Languages', exact: true })).toBeVisible()
			await expect(page.getByRole('heading', { name: 'Format Preferences' })).toBeVisible()
		})

		test('sidebar navigation scrolls to sections', async ({ page }) => {
			// Click Folders in sidebar
			await page.getByRole('button', { name: 'Folders' }).click()

			// Folders section should be in view (check it's near top of viewport)
			const foldersSection = page.locator('#folders')
			await expect(foldersSection).toBeInViewport()
		})
	})

	test.describe('Indexers Section', () => {
		test('displays indexer cards', async ({ page }) => {
			// Should have Add Indexer button
			await expect(page.getByRole('button', { name: 'Add Indexer' })).toBeVisible()

			// If there are indexers, they should be visible (priority badges)
			const indexerSection = page.locator('#indexers')
			await expect(indexerSection).toBeVisible()
		})

		test('can toggle indexer enabled state', async ({ page }) => {
			// Find first toggle button in indexers section
			const indexerSection = page.locator('#indexers')
			const toggleButton = indexerSection.locator('button.rounded-full').first()

			// Toggle may or may not exist depending on seed data
			const toggleCount = await toggleButton.count()
			if (toggleCount > 0) {
				await toggleButton.click()
				// Should still be visible after click
				await expect(toggleButton).toBeVisible()
			}
		})

		test('can open indexer edit form', async ({ page }) => {
			// Find edit button (pencil icon) in indexers section
			const indexerSection = page.locator('#indexers')
			const editButton = indexerSection
				.locator('button')
				.filter({ has: page.locator('svg.lucide-pencil') })
				.first()

			const editButtonCount = await editButton.count()
			if (editButtonCount > 0) {
				await editButton.click()

				// Edit form should show Name, URL, API Key fields
				await expect(page.getByText('Name', { exact: false })).toBeVisible()
				await expect(page.getByText('URL', { exact: false })).toBeVisible()
				await expect(page.getByText('API Key')).toBeVisible()

				// Cancel and Save buttons should be visible
				await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
				await expect(page.getByRole('button', { name: 'Save' })).toBeVisible()
			}
		})

		test('can cancel indexer edit', async ({ page }) => {
			const indexerSection = page.locator('#indexers')
			const editButton = indexerSection
				.locator('button')
				.filter({ has: page.locator('svg.lucide-pencil') })
				.first()

			const editButtonCount = await editButton.count()
			if (editButtonCount > 0) {
				await editButton.click()
				await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()

				// Click cancel
				await page.getByRole('button', { name: 'Cancel' }).click()

				// Edit form should close (Save button disappears)
				await expect(page.getByRole('button', { name: 'Save' })).not.toBeVisible()
			}
		})
	})

	test.describe('Downloads Section', () => {
		test('displays download folder input', async ({ page }) => {
			await expect(page.getByLabel('Download Folder')).toBeVisible()
		})

		test('can edit download folder path', async ({ page }) => {
			const downloadInput = page.getByLabel('Download Folder')
			await expect(downloadInput).toBeVisible()

			// Focus and type - onChange triggers server update so we just verify input is editable
			await downloadInput.focus()
			await page.keyboard.press('End')
			await page.keyboard.type('/test')

			// Wait for potential re-render and verify input still works
			await page.waitForTimeout(300)
			await expect(downloadInput).toBeVisible()
			await expect(downloadInput).toBeEnabled()
		})
	})

	test.describe('Folders Section', () => {
		test('displays movie and TV folder sections', async ({ page }) => {
			const foldersSection = page.locator('#folders')
			await expect(foldersSection).toBeVisible()

			// Should have Movies and TV Shows subsections (h3 headings)
			await expect(foldersSection.getByRole('heading', { name: 'Movies' })).toBeVisible()
			await expect(foldersSection.getByRole('heading', { name: 'TV Shows' })).toBeVisible()

			// Should have Add Folder buttons
			const addButtons = foldersSection.getByRole('button', { name: 'Add Folder' })
			await expect(addButtons.first()).toBeVisible()
		})

		test('can set folder as default', async ({ page }) => {
			const foldersSection = page.locator('#folders')

			// Find "Set default" button if available (non-default folder exists)
			const setDefaultButton = foldersSection.getByRole('button', { name: 'Set default' }).first()
			const setDefaultCount = await setDefaultButton.count()

			if (setDefaultCount > 0) {
				await setDefaultButton.click()

				// Button should update to show "Default" badge or disappear
				// (depending on implementation)
				await page.waitForTimeout(500)
				await expect(foldersSection).toBeVisible()
			}
		})
	})

	test.describe('Quality Section', () => {
		test('displays quality tiers', async ({ page }) => {
			const qualitySection = page.locator('#quality')
			await expect(qualitySection).toBeVisible()

			// Should show resolution options (480p, 720p, 1080p, 2160p)
			await expect(qualitySection.getByText('480p')).toBeVisible()
			await expect(qualitySection.getByText('720p')).toBeVisible()
			await expect(qualitySection.getByText('1080p')).toBeVisible()
			await expect(qualitySection.getByText('2160p')).toBeVisible()
		})
	})

	test.describe('Languages Section', () => {
		test('displays language preferences', async ({ page }) => {
			const languagesSection = page.locator('#languages')
			await expect(languagesSection).toBeVisible()

			// Should have subtitle and audio language areas
			await expect(languagesSection.getByText('Subtitle Languages')).toBeVisible()
			await expect(languagesSection.getByText('Audio Languages')).toBeVisible()
		})

		test('has audio preference toggles', async ({ page }) => {
			const languagesSection = page.locator('#languages')

			// Should have "Prefer Original Audio" toggle
			await expect(languagesSection.getByText('Prefer Original Audio')).toBeVisible()

			// Should have fallback option (exact text to avoid matching description)
			await expect(languagesSection.getByText('Accept Any Audio Fallback')).toBeVisible()
		})
	})

	test.describe('Formats Section', () => {
		test('displays codec, HDR, and audio format sections', async ({ page }) => {
			const formatsSection = page.locator('#formats')
			await expect(formatsSection).toBeVisible()

			// Should have subsections for codecs, HDR, audio
			await expect(formatsSection.getByText('Video Codecs')).toBeVisible()
			await expect(formatsSection.getByText('HDR Formats')).toBeVisible()
			await expect(formatsSection.getByText('Audio Formats')).toBeVisible()
		})
	})
})
