export type SessionSource = 'claude' | 'codex'

export interface SessionRecord {
  id: string
  source: SessionSource
  title: string
  projectPath: string | null
  updatedAt: string
  resumable: boolean
  resumeCommand: string
}

export interface SessionQuery {
  source: SessionSource | 'all'
  from?: string
  to?: string
  limit?: number
}
