import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { grabEpisodeReleaseInput } from './episodes'
import { findEpisodeReleases, grabEpisodeRelease } from './episodes.server'

export const searchEpisodeReleasesFn = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ episodeId: z.string() }))
	.handler(async ({ data }) => {
		return findEpisodeReleases(data.episodeId)
	})

export const grabEpisodeReleaseFn = createServerFn({ method: 'POST' })
	.inputValidator(grabEpisodeReleaseInput)
	.handler(async ({ data }) => {
		return grabEpisodeRelease(data)
	})
