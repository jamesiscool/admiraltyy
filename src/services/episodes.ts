import { z } from 'zod'

export const grabEpisodeReleaseInput = z.object({
	episodeId: z.string(),
	guid: z.string(),
	title: z.string(),
	downloadUrl: z.string(),
	infoUrl: z.string().optional(),
	size: z.number(),
	publishDate: z.string(),
	indexerId: z.string(),
	indexerName: z.string(),
})

export type GrabEpisodeReleaseInput = z.infer<typeof grabEpisodeReleaseInput>
