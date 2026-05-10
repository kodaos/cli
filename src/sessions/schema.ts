import { z } from 'zod'

import { outputSchema } from '../skills/schema'

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .optional()

export const sessionsListOptionsSchema = z
  .object({
    source: z.enum(['claude', 'codex', 'all']).default('all'),
    from: dateSchema,
    to: dateSchema,
    limit: z.coerce.number().int().positive().max(500).optional(),
    output: outputSchema,
  })
  .refine(
    (data) => {
      if (!data.from || !data.to) {
        return true
      }
      return data.from <= data.to
    },
    {
      path: ['from'],
      message: '`from` must be less than or equal to `to`',
    },
  )

export const sessionsResumeOptionsSchema = z.object({
  id: z.string().min(1, 'Session id is required'),
  source: z.enum(['claude', 'codex', 'auto']).default('auto'),
  output: outputSchema,
  'dry-run': z.boolean().default(false),
})

export type SessionsListOptions = z.infer<typeof sessionsListOptionsSchema>
export type SessionsResumeOptions = z.infer<typeof sessionsResumeOptionsSchema>
