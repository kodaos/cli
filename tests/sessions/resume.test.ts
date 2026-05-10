import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const spawnMock = vi.fn()

const mocks = vi.hoisted(() => ({
  resolveSessionRecord: vi.fn(),
  render: vi.fn(),
  exitWithError: vi.fn((_: unknown, __: unknown, message: string) => {
    throw new Error(message)
  }),
}))

vi.mock('../../src/sessions/service', () => ({
  resolveSessionRecord: mocks.resolveSessionRecord,
}))

vi.mock('child_process', () => ({
  spawn: (...args: unknown[]) => spawnMock(...args),
}))

vi.mock('ink', () => ({
  render: mocks.render,
}))

vi.mock('../../src/skills/prompts', () => ({
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

describe('createSessionsResumeCommand', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    spawnMock.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('prints dry-run command as json', async () => {
    mocks.resolveSessionRecord.mockResolvedValue({
      id: 'session-1',
      source: 'claude',
      title: 'test',
      projectPath: '/tmp/project',
      updatedAt: '2026-05-10T10:00:00.000Z',
      resumable: true,
      resumeCommand: 'claude --resume session-1',
    })
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const { createSessionsResumeCommand } = await import('../../src/commands/sessions/resume')
    const cmd = createSessionsResumeCommand()

    await cmd.parseAsync(['session-1', '--dry-run'], { from: 'user' })

    expect(spawnMock).not.toHaveBeenCalled()
    const result = JSON.parse(logSpy.mock.calls[0][0] as string)
    expect(result.command).toBe('claude --resume session-1')
    expect(result.cwd).toBe('/tmp/project')
  })

  it('spawns codex resume command when source is codex', async () => {
    mocks.resolveSessionRecord.mockResolvedValue({
      id: 'session-2',
      source: 'codex',
      title: 'test',
      projectPath: null,
      updatedAt: '2026-05-10T10:00:00.000Z',
      resumable: true,
      resumeCommand: 'codex resume session-2',
    })
    spawnMock.mockReturnValue({
      on: (event: string, cb: (code?: number) => void) => {
        if (event === 'exit') {
          cb(0)
        }
      },
    })
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)

    const { createSessionsResumeCommand } = await import('../../src/commands/sessions/resume')
    const cmd = createSessionsResumeCommand()
    await cmd.parseAsync(['session-2', '--source', 'codex'], { from: 'user' })

    expect(spawnMock).toHaveBeenCalledWith('codex', ['resume', 'session-2'], {
      stdio: 'inherit',
      cwd: undefined,
    })
    expect(exitSpy).toHaveBeenCalledWith(0)
  })

  it('fails when source cannot be resolved', async () => {
    mocks.resolveSessionRecord.mockResolvedValue(null)
    const { createSessionsResumeCommand } = await import('../../src/commands/sessions/resume')
    const cmd = createSessionsResumeCommand()
    await expect(cmd.parseAsync(['missing-session'], { from: 'user' })).rejects.toThrow(
      'Could not resolve a unique source',
    )
  })
})
