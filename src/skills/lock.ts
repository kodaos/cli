import { createHash } from 'crypto'
import { readFile, writeFile, mkdir, access, symlink, unlink, readdir } from 'fs/promises'
import { homedir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

import type { SkillLock, SkillLockEntry } from './types'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = process.cwd()
const GLOBAL_ROOT = join(homedir(), '.kodaos')
const LOCK_FILE = 'skills-lock.json'

export async function getLockPath(global: boolean): Promise<string> {
  const base = global ? GLOBAL_ROOT : PROJECT_ROOT
  return join(base, LOCK_FILE)
}

export async function readLock(global: boolean = false): Promise<SkillLock | null> {
  const lockPath = await getLockPath(global)
  try {
    const content = await readFile(lockPath, 'utf-8')
    return JSON.parse(content) as SkillLock
  } catch {
    return null
  }
}

export async function writeLock(lock: SkillLock, global: boolean = false): Promise<void> {
  const lockPath = await getLockPath(global)
  const dir = dirname(lockPath)
  await mkdir(dir, { recursive: true })
  await writeFile(lockPath, JSON.stringify(lock, null, 2), 'utf-8')
}

export async function updateLockEntry(
  skillName: string,
  entry: SkillLockEntry,
  global: boolean = false,
): Promise<void> {
  let lock = await readLock(global)
  if (!lock) {
    lock = { version: '1.0', skills: {} }
  }
  lock.skills[skillName] = entry
  await writeLock(lock, global)
}

export async function removeLockEntry(skillName: string, global: boolean = false): Promise<void> {
  const lock = await readLock(global)
  if (!lock) return
  delete lock.skills[skillName]
  await writeLock(lock, global)
}

export async function computeFileHash(content: string): Promise<string> {
  return 'sha256:' + createHash('sha256').update(content).digest('hex')
}

export async function computeFileHashFromPath(filePath: string): Promise<string> {
  const content = await readFile(filePath, 'utf-8')
  return computeFileHash(content)
}

export function getSkillsDir(global: boolean): string {
  return join(global ? GLOBAL_ROOT : PROJECT_ROOT, '.agents', 'skills')
}

export function getClaudeSkillsDir(global: boolean): string {
  return join(global ? GLOBAL_ROOT : PROJECT_ROOT, '.claude', 'skills')
}

export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true })
}

export async function createSymlink(target: string, linkPath: string): Promise<void> {
  try {
    await access(linkPath)
    await unlink(linkPath)
  } catch {
    // Link doesn't exist, that's fine
  }
  await symlink(target, linkPath)
}

export async function removeSymlink(linkPath: string): Promise<void> {
  try {
    await access(linkPath)
    await unlink(linkPath)
  } catch {
    // Link doesn't exist, that's fine
  }
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

export async function listSkillDirs(skillsDir: string): Promise<string[]> {
  try {
    const entries = await readdir(skillsDir, { withFileTypes: true })
    return entries.filter((e) => e.isDirectory()).map((e) => join(skillsDir, e.name))
  } catch {
    return []
  }
}
