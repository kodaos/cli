import { describe, it, expect } from 'vitest'

import { parseGitHubSource } from '../../src/skills/github'

describe('parseGitHubSource', () => {
  it('parses shorthand owner/repo', () => {
    const result = parseGitHubSource('vercel-labs/agent-skills')
    expect(result.sourceType).toBe('github')
    expect(result.owner).toBe('vercel-labs')
    expect(result.repo).toBe('agent-skills')
    expect(result.url).toBe('https://github.com/vercel-labs/agent-skills')
  })

  it('parses full GitHub URL', () => {
    const result = parseGitHubSource('https://github.com/vercel-labs/agent-skills')
    expect(result.sourceType).toBe('github')
    expect(result.owner).toBe('vercel-labs')
    expect(result.repo).toBe('agent-skills')
  })

  it('parses GitHub URL with tree path', () => {
    const result = parseGitHubSource(
      'https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design',
    )
    expect(result.sourceType).toBe('github')
    expect(result.owner).toBe('vercel-labs')
    expect(result.repo).toBe('agent-skills')
    expect(result.path).toBe('skills/web-design')
  })

  it('parses GitHub URL with .git suffix', () => {
    const result = parseGitHubSource('https://github.com/owner/repo.git')
    expect(result.owner).toBe('owner')
    expect(result.repo).toBe('repo')
  })

  it('throws on invalid input', () => {
    expect(() => parseGitHubSource('')).toThrow()
    expect(() => parseGitHubSource('invalid')).toThrow()
  })
})
