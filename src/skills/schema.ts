import { z } from 'zod'

export const sourceSchema = z.string().min(1, 'Source is required')

export const addOptionsSchema = z.object({
  source: sourceSchema,
  skill: z.array(z.string()).optional(),
  list: z.boolean().default(false),
  yes: z.boolean().default(false),
  copy: z.boolean().default(false),
  global: z.boolean().default(false),
})

export const removeOptionsSchema = z.object({
  skills: z.array(z.string()).optional(),
  global: z.boolean().default(false),
  all: z.boolean().default(false),
  yes: z.boolean().default(false),
})

export const updateOptionsSchema = z.object({
  skills: z.array(z.string()).optional(),
  global: z.boolean().default(false),
  project: z.boolean().default(false),
  yes: z.boolean().default(false),
})

export const migrateOptionsSchema = z.object({
  platform: z.enum(['vercel']),
  file: z.string().optional(),
  global: z.boolean().default(false),
})

export type AddOptions = z.infer<typeof addOptionsSchema>
export type RemoveOptions = z.infer<typeof removeOptionsSchema>
export type UpdateOptions = z.infer<typeof updateOptionsSchema>
export type MigrateOptions = z.infer<typeof migrateOptionsSchema>
