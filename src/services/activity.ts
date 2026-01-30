import { z } from 'zod'

export const deleteDownloadInput = z.object({ downloadId: z.string() })
export type DeleteDownloadInput = z.infer<typeof deleteDownloadInput>
