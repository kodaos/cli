import { describe, it, expect } from 'vitest'

import {
  addOptionsSchema,
  removeOptionsSchema,
  updateOptionsSchema,
  migrateOptionsSchema,
} from '../../src/skills/schema.js'

describe('addOptionsSchema', () => {
  it('parses valid source', () => {
    const result = addOptionsSchema.safeParse({
      source: 'owner/repo',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty source', () => {
    const result = addOptionsSchema.safeParse({
      source: '',
    })
    expect(result.success).toBe(false)
  })

  it('applies defaults', () => {
    const result = addOptionsSchema.safeParse({
      source: 'owner/repo',
    })
    expect(result.success).toBe(true)
    expect(result.data?.list).toBe(false)
    expect(result.data?.yes).toBe(false)
    expect(result.data?.copy).toBe(false)
    expect(result.data?.global).toBe(false)
  })

  it('accepts all options', () => {
    const result = addOptionsSchema.safeParse({
      source: 'owner/repo',
      skill: ['skill1', 'skill2'],
      list: true,
      yes: true,
      copy: true,
      global: true,
    })
    expect(result.success).toBe(true)
  })
})

describe('removeOptionsSchema', () => {
  it('parses empty skills', () => {
    const result = removeOptionsSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('parses skills array', () => {
    const result = removeOptionsSchema.safeParse({
      skills: ['skill1', 'skill2'],
    })
    expect(result.success).toBe(true)
  })

  it('applies defaults', () => {
    const result = removeOptionsSchema.safeParse({})
    expect(result.data?.global).toBe(false)
    expect(result.data?.all).toBe(false)
    expect(result.data?.yes).toBe(false)
  })
})

describe('updateOptionsSchema', () => {
  it('parses empty input', () => {
    const result = updateOptionsSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('parses skills array', () => {
    const result = updateOptionsSchema.safeParse({
      skills: ['skill1', 'skill2'],
    })
    expect(result.success).toBe(true)
  })

  it('applies defaults', () => {
    const result = updateOptionsSchema.safeParse({})
    expect(result.data?.global).toBe(false)
    expect(result.data?.project).toBe(false)
    expect(result.data?.yes).toBe(false)
  })
})

describe('migrateOptionsSchema', () => {
  it('parses vercel platform', () => {
    const result = migrateOptionsSchema.safeParse({
      platform: 'vercel',
    })
    expect(result.success).toBe(true)
  })

  it('rejects unsupported platform', () => {
    const result = migrateOptionsSchema.safeParse({
      platform: 'unknown',
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional file path', () => {
    const result = migrateOptionsSchema.safeParse({
      platform: 'vercel',
      file: '/path/to/lock.json',
    })
    expect(result.success).toBe(true)
    expect(result.data?.file).toBe('/path/to/lock.json')
  })

  it('applies defaults', () => {
    const result = migrateOptionsSchema.safeParse({
      platform: 'vercel',
    })
    expect(result.success).toBe(true)
    expect(result.data?.global).toBe(false)
  })

  it('accepts global flag', () => {
    const result = migrateOptionsSchema.safeParse({
      platform: 'vercel',
      global: true,
    })
    expect(result.success).toBe(true)
    expect(result.data?.global).toBe(true)
  })
})
