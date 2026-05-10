import { describe, expect, it } from 'vitest'

import { sessionsListOptionsSchema, sessionsResumeOptionsSchema } from '../../src/sessions/schema'

describe('sessionsListOptionsSchema', () => {
  it('parses empty input with defaults', () => {
    const result = sessionsListOptionsSchema.safeParse({})
    expect(result.success).toBe(true)
    expect(result.data?.source).toBe('all')
    expect(result.data?.output).toBe('text')
  })

  it('rejects invalid source', () => {
    const result = sessionsListOptionsSchema.safeParse({ source: 'cursor' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid date format', () => {
    const result = sessionsListOptionsSchema.safeParse({ from: '2026/05/10' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid date range', () => {
    const result = sessionsListOptionsSchema.safeParse({ from: '2026-05-10', to: '2026-05-01' })
    expect(result.success).toBe(false)
  })
})

describe('sessionsResumeOptionsSchema', () => {
  it('parses required id and defaults', () => {
    const result = sessionsResumeOptionsSchema.safeParse({ id: 'abc' })
    expect(result.success).toBe(true)
    expect(result.data?.source).toBe('auto')
    expect(result.data?.['dry-run']).toBe(false)
  })

  it('rejects empty id', () => {
    const result = sessionsResumeOptionsSchema.safeParse({ id: '' })
    expect(result.success).toBe(false)
  })
})
