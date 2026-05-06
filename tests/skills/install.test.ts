import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  readLock: vi.fn(),
  isSkillInstalled: vi.fn(),
  installSkillFromLockEntry: vi.fn(),
  readInstalledSkillCommitHash: vi.fn(),
  render: vi.fn(),
  exitWithError: vi.fn((_: unknown, __: unknown, message: string) => {
    throw new Error(message)
  }),
}))

vi.mock('../../src/skills/lock', () => ({
  readLock: mocks.readLock,
}))

vi.mock('../../src/skills/installer', () => ({
  isSkillInstalled: mocks.isSkillInstalled,
  installSkillFromLockEntry: mocks.installSkillFromLockEntry,
  readInstalledSkillCommitHash: mocks.readInstalledSkillCommitHash,
}))

vi.mock('ink', () => ({
  render: mocks.render,
}))

vi.mock('../../src/skills/prompts', () => ({
  renderSuccess: (message: string) => message,
  renderError: (message: string) => message,
}))

vi.mock('../../src/skills/output', async () => {
  const actual =
    await vi.importActual<typeof import('../../src/skills/output')>('../../src/skills/output')
  return {
    ...actual,
    exitWithError: mocks.exitWithError,
  }
})

describe('createInstallCommand', () => {
  const baseLock = {
    version: '0.1.0' as const,
    agents: {
      default: { skillsDir: '.agents/skills' },
      'claude-code': { skillsDir: '.claude/skills' },
    },
    skills: {
      alpha: {
        sourceType: 'github' as const,
        source: 'org/repo',
        path: 'skills/alpha',
        commitHash: '1111111111111111111111111111111111111111',
      },
      beta: {
        sourceType: 'github' as const,
        source: 'org/repo',
        path: 'skills/beta',
        commitHash: '2222222222222222222222222222222222222222',
      },
    },
  }

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('installs missing skills and skips installed ones', async () => {
    mocks.readLock.mockResolvedValue(baseLock)
    mocks.isSkillInstalled.mockImplementation(async (name: string) => name === 'alpha')
    mocks.readInstalledSkillCommitHash.mockResolvedValueOnce(
      '1111111111111111111111111111111111111111',
    )

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { createInstallCommand } = await import('../../src/commands/skills/install')
    const cmd = createInstallCommand()

    await cmd.parseAsync(['--output', 'json'], { from: 'user' })

    expect(mocks.installSkillFromLockEntry).toHaveBeenCalledTimes(1)
    expect(mocks.installSkillFromLockEntry).toHaveBeenCalledWith(
      'beta',
      baseLock.skills.beta,
      expect.objectContaining({ global: false, copy: false }),
    )
    const result = JSON.parse(logSpy.mock.calls[0][0] as string)
    expect(result.installed).toEqual([
      { name: 'beta', commitHash: '2222222222222222222222222222222222222222' },
    ])
    expect(result.alreadyInstalled).toEqual(['alpha'])
  })

  it('returns dry-run output without installing', async () => {
    mocks.readLock.mockResolvedValue(baseLock)
    mocks.isSkillInstalled.mockResolvedValue(false)
    mocks.readInstalledSkillCommitHash.mockResolvedValue(null)

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { createInstallCommand } = await import('../../src/commands/skills/install')
    const cmd = createInstallCommand()

    await cmd.parseAsync(['--dry-run', '--output', 'json'], { from: 'user' })

    expect(mocks.installSkillFromLockEntry).not.toHaveBeenCalled()
    const result = JSON.parse(logSpy.mock.calls[0][0] as string)
    expect(result.action).toBe('install')
    expect(result.wouldInstall).toEqual([
      { name: 'alpha', commitHash: '1111111111111111111111111111111111111111' },
      { name: 'beta', commitHash: '2222222222222222222222222222222222222222' },
    ])
  })

  it('reinstalls when installed skill commit does not match lock', async () => {
    mocks.readLock.mockResolvedValue(baseLock)
    mocks.isSkillInstalled.mockResolvedValue(true)
    mocks.readInstalledSkillCommitHash.mockResolvedValue('deadbeef')

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { createInstallCommand } = await import('../../src/commands/skills/install')
    const cmd = createInstallCommand()

    await cmd.parseAsync(['--output', 'json'], { from: 'user' })

    expect(mocks.installSkillFromLockEntry).toHaveBeenCalledTimes(2)
    const result = JSON.parse(logSpy.mock.calls[0][0] as string)
    expect(result.alreadyInstalled).toEqual([])
    expect(result.installed).toHaveLength(2)
  })

  it('fails with actionable error when lock entries are missing', async () => {
    mocks.readLock.mockResolvedValue(null)

    const { createInstallCommand } = await import('../../src/commands/skills/install')
    const cmd = createInstallCommand()

    await expect(cmd.parseAsync(['--output', 'json'], { from: 'user' })).rejects.toThrow(
      'No lock file entries found.',
    )
  })
})
