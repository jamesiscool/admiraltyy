import { mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ofetch } from 'ofetch'
import type { EpisodeSearchOptions, IndexerRelease, MovieSearchOptions } from '@/services/indexers'
import type { Indexer } from '@/services/settings'
import { getSettings } from '@/services/settings.server'

// Re-export types for convenience
export type { EpisodeSearchOptions, IndexerRelease, MovieSearchOptions } from '@/services/indexers'

// Temp directory for NZB downloads
const TEMP_DIR = join(tmpdir(), 'admiralty')

async function ensureTempDir(): Promise<void> {
	await mkdir(TEMP_DIR, { recursive: true })
}

export async function downloadNzb(downloadUrl: string, filename: string): Promise<string> {
	await ensureTempDir()

	const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
	const nzbPath = join(TEMP_DIR, `${sanitizedFilename}.nzb`)

	console.log(`[Indexer] Downloading NZB from: ${downloadUrl}`)

	const response = await fetch(downloadUrl)
	if (!response.ok) {
		throw new Error(`Failed to download NZB: ${response.status} ${response.statusText}`)
	}

	const content = await response.arrayBuffer()
	await Bun.write(nzbPath, content)

	console.log(`[Indexer] NZB saved to: ${nzbPath}`)
	return nzbPath
}

// Newznab JSON Response Types

interface NewznabAttr {
	'@attributes': {
		name: string
		value: string
	}
}

interface NewznabEnclosure {
	'@attributes': {
		url: string
		length?: string
		type?: string
	}
}

interface NewznabItem {
	title: string
	guid: string | { '#text': string }
	link: string
	pubDate: string
	description?: string
	enclosure?: NewznabEnclosure
	'newznab:attr'?: NewznabAttr | NewznabAttr[]
}

interface NewznabChannel {
	item?: NewznabItem | NewznabItem[]
}

interface NewznabResponse {
	rss?: {
		channel?: NewznabChannel
	}
	channel?: NewznabChannel
}

// Helper Functions

function getAttrValue(attrs: NewznabAttr | NewznabAttr[] | undefined, name: string): string | undefined {
	if (!attrs) return undefined

	const attrArray = Array.isArray(attrs) ? attrs : [attrs]
	const attr = attrArray.find((a) => a['@attributes']?.name?.toLowerCase() === name.toLowerCase())
	return attr?.['@attributes']?.value
}

function parseItems(response: NewznabResponse): NewznabItem[] {
	const channel = response.rss?.channel ?? response.channel
	if (!channel?.item) return []

	return Array.isArray(channel.item) ? channel.item : [channel.item]
}

function parseGuid(guid: string | { '#text': string }): string {
	return typeof guid === 'string' ? guid : guid['#text']
}

function normalizeRelease(item: NewznabItem, indexer: Indexer): IndexerRelease {
	const attrs = item['newznab:attr']

	// Get download URL from enclosure or link
	const downloadUrl = item.enclosure?.['@attributes']?.url ?? item.link

	// Get size from attrs or enclosure
	const sizeAttr = getAttrValue(attrs, 'size')
	const enclosureLength = item.enclosure?.['@attributes']?.length
	const size = Number.parseInt(sizeAttr ?? enclosureLength ?? '0', 10)

	// Parse IMDB ID (may come as number or string with/without tt prefix)
	let imdbId: string | undefined
	const imdbAttr = getAttrValue(attrs, 'imdb') ?? getAttrValue(attrs, 'imdbid')
	if (imdbAttr) {
		const imdbNum = Number.parseInt(imdbAttr.replace(/^tt/, ''), 10)
		if (!Number.isNaN(imdbNum) && imdbNum > 0) {
			imdbId = `tt${imdbNum.toString().padStart(7, '0')}`
		}
	}

	return {
		guid: parseGuid(item.guid),
		title: item.title,
		downloadUrl,
		infoUrl: item.link,
		size,
		publishDate: new Date(item.pubDate),
		indexerId: indexer.id,
		indexerName: indexer.name,
		tmdbId: Number.parseInt(getAttrValue(attrs, 'tmdbid') ?? '', 10) || undefined,
		imdbId,
		tvdbId: Number.parseInt(getAttrValue(attrs, 'tvdbid') ?? '', 10) || undefined,
		season: Number.parseInt(getAttrValue(attrs, 'season') ?? '', 10) || undefined,
		episode: Number.parseInt(getAttrValue(attrs, 'episode') ?? '', 10) || undefined,
	}
}

// Public Functions

export function listEnabledIndexers(): Indexer[] {
	const settings = getSettings()
	return settings.indexers.filter((i) => i.enabled).sort((a, b) => a.priority - b.priority)
}

interface SearchParams {
	t: 'movie' | 'tvsearch' | 'search'
	tmdbid?: number
	imdbid?: string
	tvdbid?: number
	season?: number
	ep?: number
	q?: string
}

async function searchIndexer(indexer: Indexer, params: SearchParams): Promise<IndexerRelease[]> {
	const url = new URL('/api', indexer.url)

	// Add all params
	url.searchParams.set('apikey', indexer.apiKey)
	url.searchParams.set('o', 'json')

	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined) {
			url.searchParams.set(key, String(value))
		}
	}

	// Log URL (redact API key)
	const logUrl = new URL(url.toString())
	logUrl.searchParams.set('apikey', '***')
	console.log(`[Indexer] ${indexer.name}: ${logUrl.toString()}`)

	try {
		const response = await ofetch<NewznabResponse>(url.toString(), {
			timeout: 30000,
		})

		const items = parseItems(response)
		return items.map((item) => normalizeRelease(item, indexer))
	} catch (error) {
		console.error(`Indexer search failed for ${indexer.name}:`, error)
		return []
	}
}

async function searchAllIndexers(params: SearchParams): Promise<IndexerRelease[]> {
	const indexers = listEnabledIndexers()
	if (indexers.length === 0) return []

	const results = await Promise.allSettled(indexers.map((indexer) => searchIndexer(indexer, params)))

	const releases: IndexerRelease[] = []
	for (const result of results) {
		if (result.status === 'fulfilled') {
			releases.push(...result.value)
		}
	}

	// Dedupe by guid and sort by publish date (newest first)
	const seen = new Set<string>()
	const deduped = releases.filter((r) => {
		if (seen.has(r.guid)) return false
		seen.add(r.guid)
		return true
	})

	return deduped.sort((a, b) => b.publishDate.getTime() - a.publishDate.getTime())
}

export async function searchMovieReleases(options: MovieSearchOptions): Promise<IndexerRelease[]> {
	// Tier 1: Search by IMDB ID (most indexers support this best)
	if (options.imdbId) {
		console.log(`[Indexer] Tier 1: Searching by IMDB ID ${options.imdbId}`)
		// Strip 'tt' prefix if present for the API
		const imdbNum = options.imdbId.replace(/^tt/, '')
		const releases = await searchAllIndexers({
			t: 'movie',
			imdbid: imdbNum,
		})

		if (releases.length > 0) {
			console.log(`[Indexer] Tier 1: Found ${releases.length} releases`)
			return releases
		}
		console.log('[Indexer] Tier 1: No results')
	}

	// Tier 2: Fallback to title search
	if (options.title) {
		const query = options.year ? `${options.title} ${options.year}` : options.title
		console.log(`[Indexer] Tier 2: Searching by title "${query}"`)
		const releases = await searchAllIndexers({
			t: 'movie',
			q: query,
		})
		console.log(`[Indexer] Tier 2: Found ${releases.length} releases`)
		return releases
	}

	return []
}

export async function searchEpisodeReleases(options: EpisodeSearchOptions): Promise<IndexerRelease[]> {
	// Tier 1: Search by TMDB ID with season/episode
	if (options.tmdbId) {
		const releases = await searchAllIndexers({
			t: 'tvsearch',
			tmdbid: options.tmdbId,
			season: options.season,
			ep: options.episode,
		})

		if (releases.length > 0) {
			return releases
		}
	}

	// Tier 2: Search by TVDB ID with season/episode
	if (options.tvdbId) {
		const releases = await searchAllIndexers({
			t: 'tvsearch',
			tvdbid: options.tvdbId,
			season: options.season,
			ep: options.episode,
		})

		if (releases.length > 0) {
			return releases
		}
	}

	// Tier 3: Fallback to title search with episode format
	if (options.title) {
		const seasonStr = options.season.toString().padStart(2, '0')
		const episodeStr = options.episode.toString().padStart(2, '0')
		const query = `${options.title} S${seasonStr}E${episodeStr}`

		return searchAllIndexers({
			t: 'tvsearch',
			q: query,
		})
	}

	return []
}
