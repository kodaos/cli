import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

import { describe, it, expect } from 'vitest'

import { deepFindSkillDirs, parseGitHubSource } from '../../src/skills/github'
import type { SkillsIndexFile } from '../../src/skills/types'

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

describe('SkillsIndexFile', () => {
  it('validates index.json structure', () => {
    const index: SkillsIndexFile = {
      skills: ['zod', 'context7-mcp', 'browser-use'],
    }
    expect(index.skills).toHaveLength(3)
    expect(index.skills[0]).toBe('zod')
  })

  it('supports empty skills array', () => {
    const index: SkillsIndexFile = { skills: [] }
    expect(index.skills).toHaveLength(0)
  })
})

describe('deepFindSkillDirs', () => {
  it('includes current directory when it is a skill directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kodaos-skills-'))
    const skillDir = join(root, 'better-auth', 'best-practices')
    const skillContent = `---
name: better-auth-best-practices
description: Better Auth integration guide
---
`

    try {
      await mkdir(skillDir, { recursive: true })
      await writeFile(join(skillDir, 'SKILL.md'), skillContent, 'utf-8')

      const dirs = await deepFindSkillDirs(skillDir)

      expect(dirs).toContain(skillDir)
      expect(dirs).toHaveLength(1)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
