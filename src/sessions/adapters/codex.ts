import { readFile } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'

import type { SessionRecord } from '../types'

interface CodexSessionIndexEntry {
  id?: string
  thread_name?: string
  updated_at?: string
}

const CODEX_INDEX_PATH = join(homedir(), '.codex', 'session_index.jsonl')

export async function listCodexSessions(): Promise<SessionRecord[]> {
  let content: string
  try {
    content = await readFile(CODEX_INDEX_PATH, 'utf-8')
  } catch {
    return []
  }

  const lines = content.split('\n').filter(Boolean)
  const sessions: SessionRecord[] = []
  for (const line of lines) {
    let entry: CodexSessionIndexEntry
    try {
      entry = JSON.parse(line) as CodexSessionIndexEntry
    } catch {
      continue
    }

    if (!entry.id || !entry.updated_at) {
      continue
    }

    sessions.push({
      id: entry.id,
      source: 'codex',
      title: normalizeTitle(entry.thread_name),
      projectPath: null,
      updatedAt: entry.updated_at,
      resumable: true,
      resumeCommand: `codex resume ${entry.id}`,
    })
  }

  return sessions
}

function normalizeTitle(value?: string): string {
  if (!value || value.trim().length === 0) {
    return 'Untitled Codex session'
  }
  return value.trim()
}
