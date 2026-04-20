import { access, constants } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'

export const PROJECT_ROOT = process.cwd()
export const GLOBAL_ROOT = join(homedir(), '.kodaos')

export function getProjectSkillsDir(): string {
  return join(PROJECT_ROOT, '.agents', 'skills')
}

export function getGlobalSkillsDir(): string {
  return join(GLOBAL_ROOT, '.agents', 'skills')
}

export function getProjectClaudeDir(): string {
  return join(PROJECT_ROOT, '.claude', 'skills')
}

export function getGlobalClaudeDir(): string {
  return join(GLOBAL_ROOT, '.claude', 'skills')
}

export async function isInProject(): Promise<boolean> {
  const lockPath = join(PROJECT_ROOT, 'skills-lock.json')
  try {
    await access(lockPath, constants.F_OK)
    return true
  } catch {
    return false
  }
}
