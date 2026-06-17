import { z } from 'zod'

export const localeSchema = z.object({ locale: z.enum(['fr', 'ar', 'es', 'en']) })

export const alertsQuerySchema = z.object({
  severity: z.enum(['critical', 'warning', 'info']).optional(),
  is_read: z.enum(['true', 'false']).optional(),
  source: z.string().max(30).optional(),
  q: z.string().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export const alertsPatchSchema = z.object({
  alert_id: z.number().int().positive().optional(),
  read_all: z.boolean().optional(),
}).refine(d => d.alert_id !== undefined || d.read_all === true, { message: 'alert_id ou read_all requis' })

export const pipelineRunSchema = z.object({
  country: z.enum(['MA', 'ES', 'EU']),
  storagePath: z.string().min(3).max(300),
})

export const profileUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  phone: z.string().max(30).optional(),
  country: z.string().max(5).optional(),
  language: z.enum(['fr', 'ar', 'es', 'en']).optional(),
  crops: z.string().max(2000).optional(),
  countries_watched: z.string().max(100).optional(),
  notify_channels: z.string().max(100).optional(),
  min_severity: z.enum(['info', 'warning', 'critical']).optional(),
})
