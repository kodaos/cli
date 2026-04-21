import { exec } from 'child_process'
import { readFile, mkdir, access, unlink } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { promisify } from 'util'

import {
  updateLockEntry,
  computeFileHash,
  getSkillsDir,
  getClaudeSkillsDir,
  ensureDir,
  createSymlink,
} from './lock'
import type { DiscoveredSkill, SkillLockEntry } from './types'

const execAsync = promisify(exec)
const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMP_DIR = join(__dirname, '../../.temp/skills')

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

  // Clone the skill to skillsDir
  const sourcePath = await fetchSkillSource(skill)
  const targetSkillDir = join(skillsDir, skill.name)

  // Clean up existing installation
  try {
    await access(targetSkillDir)
    await execAsync(`rm -rf "${targetSkillDir}"`)
  } catch {
    // Doesn't exist
  }

  if (copy) {
    await execAsync(`cp -r "${sourcePath}" "${targetSkillDir}"`)
  } else {
    console.log(`Cloning ${skill.name}...`)
    await execAsync(`git clone --depth 1 "${sourcePath}" "${targetSkillDir}"`)
  }

  // Create symlink to .claude/skills
  const symlinkPath = join(claudeDir, skill.name)
  await createSymlink(targetSkillDir, symlinkPath)

  // Compute hash and update lock
  const skillFile = join(targetSkillDir, 'SKILL.md')
  const content = await readFile(skillFile, 'utf-8')
  const hash = await computeFileHash(content)

  const lockEntry: SkillLockEntry = {
    sourceType: 'github',
    source: skill.source,
    path: skill.path,
    commitHash: hash,
  }

  await updateLockEntry(skill.name, lockEntry, global)
}

async function fetchSkillSource(skill: DiscoveredSkill): Promise<string> {
  const [owner, repo] = skill.source.split('/')
  const destDir = join(TEMP_DIR, `${owner}-${repo}-${skill.name}-${Date.now()}`)
  await mkdir(destDir, { recursive: true })

  const cloneUrl = `https://github.com/${owner}/${repo}`
  console.log(`Cloning ${owner}/${repo}...`)
  await execAsync(`git clone --depth 1 ${cloneUrl} "${destDir}"`)

  const skillPath = join(destDir, skill.path)
  return skillPath
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
