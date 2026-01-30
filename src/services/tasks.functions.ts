import { createServerFn } from '@tanstack/react-start'
import { scanMoviesFilesImpl, scanSeriesFilesImpl } from './tasks.server'

export const scanMoviesFiles = createServerFn({ method: 'POST' }).handler(async () => scanMoviesFilesImpl())

export const scanSeriesFiles = createServerFn({ method: 'POST' }).handler(async () => scanSeriesFilesImpl())
