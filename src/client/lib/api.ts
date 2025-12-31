import { hc } from 'hono/client'
import type { AppType } from '@/server/index'

// Create typed Hono client
export const api = hc<AppType>('/')
