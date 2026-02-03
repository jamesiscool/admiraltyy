import { createServerFn } from '@tanstack/react-start'
import { scanMoviesFiles, scanSeriesFiles } from './fileScan.server'

export const scanMoviesFilesFn = createServerFn({ method: 'POST' }).handler(async () => scanMoviesFiles())

export const scanSeriesFilesFn = createServerFn({ method: 'POST' }).handler(async () => scanSeriesFiles())
