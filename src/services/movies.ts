import { z } from 'zod'
import type * as schema from '@/db/schema'
import type { Resolution } from '@/db/schema'

// Preview type for list/card display (minimal fields)
export interface MoviePreview {
	id: number
	title: string
	year: number
	posterUrl: string | null
	resolution: Resolution | null
	monitored: boolean | null
	dateAdded: string
	cinemaReleaseDate: string | null
	sizeBytes: number
}

// Full movie with files
export interface MovieWithFiles {
	id: number
	tmdbId: number
	imdbId: string | null
	title: string
	year: number
	posterUrl: string | null
	backdropUrl: string | null
	synopsis: string | null
	runtimeMins: number | null
	genres: string | null
	cinemaReleaseDate: string | null
	digitalReleaseDate: string | null
	contentRating: string | null
	dateAdded: string
	monitored: boolean | null
	resolution: Resolution | null
	lastSearchTime: string | null
	lastInfoSync: string | null
	rtId: string | null
	rtVanity: string | null
	alternateTitles: string | null
	sizeBytes: number | undefined
	files: (typeof schema.files.$inferSelect)[]
}

// Grab release input schema
export const grabReleaseInput = z.object({
	movieId: z.string(),
	guid: z.string(),
	title: z.string(),
	downloadUrl: z.string(),
	infoUrl: z.string().optional(),
	size: z.number(),
	publishDate: z.string(),
	indexerId: z.string(),
	indexerName: z.string(),
})

export type GrabReleaseInput = z.infer<typeof grabReleaseInput>
