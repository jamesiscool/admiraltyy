import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { grabEpisodeReleaseInput } from './episodes'

export const searchEpisodeReleasesServerFn = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ episodeId: z.string() }))
	.handler(async ({ data }) => {
		const { searchEpisodeReleasesImpl } = await import('./episodes.server')
		return searchEpisodeReleasesImpl(data.episodeId)
	})

export const grabEpisodeRelease = createServerFn({ method: 'POST' })
	.inputValidator(grabEpisodeReleaseInput)
	.handler(async ({ data }) => {
		const { grabEpisodeReleaseImpl } = await import('./episodes.server')
		return grabEpisodeReleaseImpl(data)
	})
