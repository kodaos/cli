import { readFile } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'

import type { SessionRecord } from '../types'

interface ClaudeHistoryEntry {
  display?: string
  timestamp?: number
  project?: string
  sessionId?: string
}

interface ClaudeSessionAggregate {
  id: string
  title: string
  projectPath: string | null
  updatedAtMs: number
}

const CLAUDE_HISTORY_PATH = join(homedir(), '.claude', 'history.jsonl')

export async function listClaudeSessions(): Promise<SessionRecord[]> {
  let content: string
  try {
    content = await readFile(CLAUDE_HISTORY_PATH, 'utf-8')
  } catch {
    return []
  }

  const aggregated = new Map<string, ClaudeSessionAggregate>()
  const lines = content.split('\n').filter(Boolean)

  for (const line of lines) {
    let entry: ClaudeHistoryEntry
    try {
      entry = JSON.parse(line) as ClaudeHistoryEntry
    } catch {
      continue
    }

    if (!entry.sessionId || !entry.timestamp) {
      continue
    }

    const title = normalizeTitle(entry.display)
    const current = aggregated.get(entry.sessionId)
    if (!current || entry.timestamp >= current.updatedAtMs) {
      aggregated.set(entry.sessionId, {
        id: entry.sessionId,
        title,
        projectPath: entry.project ?? null,
        updatedAtMs: entry.timestamp,
      })
    }
  }

  return Array.from(aggregated.values()).map((session) => ({
    id: session.id,
    source: 'claude',
    title: session.title,
    projectPath: session.projectPath,
    updatedAt: new Date(session.updatedAtMs).toISOString(),
    resumable: true,
    resumeCommand: `claude --resume ${session.id}`,
  }))
}

function normalizeTitle(value?: string): string {
  if (!value || value.trim().length === 0) {
    return 'Untitled Claude session'
  }
  return value.trim()
}
