import { fs as memfs, vol } from 'memfs'
import { vi } from 'vitest'

// Mock node:fs with memfs for testing
export function mockFs() {
	vi.mock('node:fs', () => memfs)
	return vol
}

// Reset filesystem state between tests
export function resetFs() {
	vol.reset()
}

// Create filesystem from JSON structure
export function createFs(structure: Record<string, string | Buffer>) {
	vol.reset()
	vol.fromJSON(structure as Record<string, string | Buffer>)
	return vol
}

// Sample media library for testing
export const SAMPLE_MEDIA_LIBRARY = {
	'/media/movies/Inception (2010)/Inception.2010.1080p.BluRay.x264.mkv': Buffer.alloc(1500),
	'/media/movies/Inception (2010)/Inception.2010.1080p.BluRay.x264.srt': 'Subtitle content',
	'/media/movies/The Dark Knight (2008)/The.Dark.Knight.2008.2160p.UHD.BluRay.mkv': Buffer.alloc(3000),
	'/media/movies/Fight Club (1999)/Fight.Club.1999.720p.WEB-DL.mp4': Buffer.alloc(800),

	// Movie with extras folder (should be excluded)
	'/media/movies/Interstellar (2014)/Interstellar.2014.1080p.BluRay.mkv': Buffer.alloc(2000),
	'/media/movies/Interstellar (2014)/Extras/Behind.the.Scenes.mkv': Buffer.alloc(200),
	'/media/movies/Interstellar (2014)/Interstellar-trailer.mkv': Buffer.alloc(50),

	// TV series with season subfolders
	'/media/tv/Breaking Bad/Season 1/Breaking.Bad.S01E01.720p.BluRay.mkv': Buffer.alloc(400),
	'/media/tv/Breaking Bad/Season 1/Breaking.Bad.S01E02.720p.BluRay.mkv': Buffer.alloc(400),
	'/media/tv/Breaking Bad/Season 1/Breaking.Bad.S01E03.720p.BluRay.mkv': Buffer.alloc(400),
	'/media/tv/Breaking Bad/Season 2/Breaking.Bad.S02E01.1080p.WEB-DL.mkv': Buffer.alloc(500),
	'/media/tv/Breaking Bad/Season 2/Breaking.Bad.S02E02.1080p.WEB-DL.mkv': Buffer.alloc(500),

	'/media/tv/Game of Thrones (2011)/Season 1/Game.of.Thrones.S01E01.1080p.mkv': Buffer.alloc(600),
	'/media/tv/Game of Thrones (2011)/Season 1/Game.of.Thrones.S01E02.1080p.mkv': Buffer.alloc(600),

	// Downloads folder (for import tests)
	'/downloads/completed/Dune.2021.2160p.WEB-DL.x265/Dune.2021.2160p.WEB-DL.x265.mkv': Buffer.alloc(4000),
	'/downloads/completed/Dune.2021.2160p.WEB-DL.x265/Dune.2021.2160p.WEB-DL.x265.srt': 'Subtitle content',
}

export { vol, memfs }
