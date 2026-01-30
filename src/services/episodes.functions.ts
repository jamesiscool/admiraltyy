import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { grabEpisodeReleaseInput } from './episodes'

export const searchEpisodeReleasesFn = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ episodeId: z.string() }))
	.handler(async ({ data }) => {
		const { findEpisodeReleases } = await import('./episodes.server')
		return findEpisodeReleases(data.episodeId)
	})

export const grabEpisodeReleaseFn = createServerFn({ method: 'POST' })
	.inputValidator(grabEpisodeReleaseInput)
	.handler(async ({ data }) => {
		const { grabEpisodeRelease } = await import('./episodes.server')
		return grabEpisodeRelease(data)
	})
