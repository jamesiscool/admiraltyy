import { desc, eq } from 'drizzle-orm'
import { db, schema } from '@/db'

export async function listDownloadsFromDb() {
	return db.select().from(schema.downloads).orderBy(desc(schema.downloads.queuedAt)).limit(100)
}

export async function deleteDownloadById(downloadId: string) {
	const numId = parseInt(downloadId, 10)
	if (Number.isNaN(numId)) {
		throw new Error('Invalid download ID')
	}
	const existing = await db.select().from(schema.downloads).where(eq(schema.downloads.id, numId))
	if (!existing.length) {
		throw new Error('Download not found')
	}
	await db.delete(schema.downloads).where(eq(schema.downloads.id, numId))
	return { success: true }
}
