import { exec } from 'child_process'
import { access, readFile, unlink, writeFile } from 'fs/promises'
import { join } from 'path'
import { promisify } from 'util'

import { cloneRepoAtHead, fetchRepoAtRef } from './github'
import {
  updateLockEntry,
  fileExists,
  getSkillsDir,
  getClaudeSkillsDir,
  ensureDir,
  createSymlink,
} from './lock'
import type { DiscoveredSkill, SkillLockEntry } from './types'

const execAsync = promisify(exec)
const INSTALL_META_FILE = '.kodaos-skill.json'

export async function installSkill(
  skill: DiscoveredSkill,
  options: { global: boolean; copy: boolean },
): Promise<void> {
  const { global, copy } = options
  const skillsDir = getSkillsDir(global)
  const claudeDir = getClaudeSkillsDir(global)

  // Ensure directories exist
  await ensureDir(skillsDir)
  await ensureDir(claudeDir)

  const [owner, repo] = skill.source.split('/')
  const source = {
    sourceType: 'github' as const,
    owner,
    repo,
    path: skill.path,
    url: `https://github.com/${owner}/${repo}`,
  }
  const repoPath = await cloneRepoAtHead(source)

  try {
    const sourcePath = join(repoPath, skill.path)
    const targetSkillDir = join(skillsDir, skill.name)
    await installToTarget(sourcePath, targetSkillDir, { copy, commitHash: null })
    await ensureClaudeSymlink(skill.name, targetSkillDir, global)

    const commitHash = await getGitCommitHash(repoPath)
    await writeInstalledSkillCommitHash(targetSkillDir, commitHash)
    const lockEntry: SkillLockEntry = {
      sourceType: 'github',
      source: skill.source,
      path: skill.path,
      commitHash,
    }
    await updateLockEntry(skill.name, lockEntry, global)
  } finally {
    await cleanupPath(repoPath)
  }
}

export async function installSkillFromLockEntry(
  skillName: string,
  entry: SkillLockEntry,
  options: { global: boolean; copy: boolean },
): Promise<void> {
  const { global, copy } = options
  const skillsDir = getSkillsDir(global)
  const [owner, repo] = entry.source.split('/')
  const source = {
    sourceType: 'github' as const,
    owner,
    repo,
    path: entry.path,
    url: `https://github.com/${owner}/${repo}`,
  }
  const repoPath = await fetchRepoAtRef(source, entry.commitHash)

  try {
    const sourcePath = join(repoPath, entry.path)
    const targetSkillDir = join(skillsDir, skillName)
    await installToTarget(sourcePath, targetSkillDir, { copy, commitHash: entry.commitHash })
    await ensureClaudeSymlink(skillName, targetSkillDir, global)
  } finally {
    await cleanupPath(repoPath)
  }
}

export async function isSkillInstalled(skillName: string, global: boolean): Promise<boolean> {
  const skillPath = join(getSkillsDir(global), skillName)
  return fileExists(skillPath)
}

export async function readInstalledSkillCommitHash(
  skillName: string,
  global: boolean,
): Promise<string | null> {
  const skillPath = join(getSkillsDir(global), skillName)
  const metaPath = join(skillPath, INSTALL_META_FILE)
  try {
    const content = await readFile(metaPath, 'utf-8')
    const parsed = JSON.parse(content) as { commitHash?: string }
    return parsed.commitHash ?? null
  } catch {
    return null
  }
}

export async function uninstallSkill(
  skillName: string,
  options: { global: boolean },
): Promise<void> {
  const { global } = options
  const skillsDir = getSkillsDir(global)
  const claudeDir = getClaudeSkillsDir(global)

  // Remove from .agents/skills
  const skillPath = join(skillsDir, skillName)
  try {
    await access(skillPath)
    await execAsync(`rm -rf "${skillPath}"`)
  } catch {
    // Doesn't exist
  }

  // Remove symlink from .claude/skills
  const symlinkPath = join(claudeDir, skillName)
  try {
    await access(symlinkPath)
    await unlink(symlinkPath)
  } catch {
    // Doesn't exist
  }
}

async function installToTarget(
  sourcePath: string,
  targetSkillDir: string,
  options: { copy: boolean; commitHash: string | null },
): Promise<void> {
  const { copy, commitHash } = options
  try {
    await access(targetSkillDir)
    await execAsync(`rm -rf "${targetSkillDir}"`)
  } catch {
    // Doesn't exist
  }

  if (copy) {
    await execAsync(`cp -r "${sourcePath}" "${targetSkillDir}"`)
  } else {
    await execAsync(`cp -r "${sourcePath}" "${targetSkillDir}"`)
  }
  if (commitHash) {
    await writeInstalledSkillCommitHash(targetSkillDir, commitHash)
  }
}

async function ensureClaudeSymlink(
  skillName: string,
  targetSkillDir: string,
  global: boolean,
): Promise<void> {
  const claudeDir = getClaudeSkillsDir(global)
  await ensureDir(claudeDir)
  const symlinkPath = join(claudeDir, skillName)
  await createSymlink(targetSkillDir, symlinkPath)
}

async function getGitCommitHash(repoPath: string): Promise<string> {
  const { stdout } = await execAsync(`git -C "${repoPath}" rev-parse HEAD`)
  return stdout.trim()
}

async function cleanupPath(path: string): Promise<void> {
  await execAsync(`rm -rf "${path}"`)
}

export async function writeInstalledSkillCommitHash(
  skillDir: string,
  commitHash: string,
): Promise<void> {
  const metaPath = join(skillDir, INSTALL_META_FILE)
  await writeFile(metaPath, JSON.stringify({ commitHash }, null, 2), 'utf-8')
}
