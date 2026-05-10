import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  listSessions: vi.fn(),
  render: vi.fn(),
  exitWithError: vi.fn((_: unknown, __: unknown, message: string) => {
    throw new Error(message)
  }),
}))

vi.mock('../../src/sessions/service', () => ({
  listSessions: mocks.listSessions,
}))

vi.mock('ink', () => ({
  Box: ({ children }: { children: unknown }) => children,
  Text: ({ children }: { children: unknown }) => children,
  Newline: () => '\n',
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

describe('createSessionsListCommand', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns sessions in json mode', async () => {
    mocks.listSessions.mockResolvedValue([
      {
        id: 'session-1',
        source: 'claude',
        title: 'Test session',
        projectPath: '/tmp/project',
        updatedAt: '2026-05-10T10:00:00.000Z',
        resumable: true,
        resumeCommand: 'claude --resume session-1',
      },
    ])

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { createSessionsListCommand } = await import('../../src/commands/sessions/list')
    const cmd = createSessionsListCommand()
    await cmd.parseAsync(['--output', 'json'], { from: 'user' })

    expect(mocks.listSessions).toHaveBeenCalledWith({
      source: 'all',
      from: undefined,
      to: undefined,
      limit: undefined,
    })
    const result = JSON.parse(logSpy.mock.calls[0][0] as string)
    expect(result.total).toBe(1)
    expect(result.sessions[0].id).toBe('session-1')
  })

  it('fails validation for invalid source', async () => {
    const { createSessionsListCommand } = await import('../../src/commands/sessions/list')
    const cmd = createSessionsListCommand()
    await expect(cmd.parseAsync(['--source', 'cursor'], { from: 'user' })).rejects.toThrow(
      'Validation error',
    )
  })
})
