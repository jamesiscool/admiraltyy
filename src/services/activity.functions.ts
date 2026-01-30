import { createServerFn } from '@tanstack/react-start'
import { deleteDownloadInput } from './activity'
import { deleteDownloadById, listDownloadsFromDb } from './activity.server'

export const listDownloadsFn = createServerFn({ method: 'GET' }).handler(async () => listDownloadsFromDb())

export const deleteDownloadFn = createServerFn({ method: 'POST' })
	.inputValidator(deleteDownloadInput)
	.handler(async ({ data }) => deleteDownloadById(data.downloadId))
