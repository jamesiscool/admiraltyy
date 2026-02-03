import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { deleteDownloadById, listDownloadsFromDb } from './activity.server'

export const listDownloadsFn = createServerFn({ method: 'GET' }).handler(async () => listDownloadsFromDb())

export const deleteDownloadFn = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ downloadId: z.string() }))
	.handler(async ({ data }) => deleteDownloadById(data.downloadId))
