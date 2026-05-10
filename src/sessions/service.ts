import { listClaudeSessions } from './adapters/claude'
import { listCodexSessions } from './adapters/codex'
import type { SessionQuery, SessionRecord, SessionSource } from './types'

export async function listSessions(query: SessionQuery): Promise<SessionRecord[]> {
  let sessions: SessionRecord[] = []
  if (query.source === 'all' || query.source === 'claude') {
    sessions = sessions.concat(await listClaudeSessions())
  }
  if (query.source === 'all' || query.source === 'codex') {
    sessions = sessions.concat(await listCodexSessions())
  }

  const filtered = sessions.filter((session) => {
    const date = session.updatedAt.slice(0, 10)
    if (query.from && date < query.from) {
      return false
    }
    if (query.to && date > query.to) {
      return false
    }
    return true
  })

  filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  if (query.limit) {
    return filtered.slice(0, query.limit)
  }
  return filtered
}

export async function resolveSessionSource(
  id: string,
  explicitSource: SessionSource | 'auto',
): Promise<SessionSource | null> {
  if (explicitSource !== 'auto') {
    return explicitSource
  }

  const allSessions = await listSessions({ source: 'all' })
  const matched = allSessions.filter((session) => session.id === id)
  if (matched.length !== 1) {
    return null
  }
  return matched[0].source
}

export async function resolveSessionRecord(
  id: string,
  explicitSource: SessionSource | 'auto',
): Promise<SessionRecord | null> {
  const source = explicitSource === 'auto' ? 'all' : explicitSource
  const sessions = await listSessions({ source })
  const matched = sessions.filter((session) => session.id === id)
  if (matched.length !== 1) {
    return null
  }
  return matched[0]
}
