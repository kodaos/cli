export interface Skill {
  name: string
  description: string
  source: string
  path: string
  installedPath?: string
}

export interface SkillSource {
  sourceType: 'github'
  owner: string
  repo: string
  path?: string
  url: string
}

export interface InstallOptions {
  global: boolean
  skill?: string[]
  copy: boolean
  yes: boolean
  list: boolean
}

export interface AgentConfig {
  skillsDir: string
}

export interface SkillLock {
  version: '1.0'
  agents: Record<string, AgentConfig>
  skills: Record<string, SkillLockEntry>
}

export interface SkillLockEntry {
  sourceType: 'github'
  source: string
  path: string
  commitHash: string
  agents?: string[]
}

export interface DiscoveredSkill {
  name: string
  description: string
  path: string
  source: string
  sourceType: 'github'
}

export interface SkillsIndexFile {
  skills: string[]
}
