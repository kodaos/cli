import { exec } from 'child_process'
import { readFile, mkdir, access, readdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { promisify } from 'util'

import type { SkillSource, DiscoveredSkill } from './types'

const execAsync = promisify(exec)
const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMP_DIR = join(__dirname, '../../.temp/skills')

export function parseGitHubSource(input: string): SkillSource {
  // Handle full GitHub URL
  const urlMatch = input.match(/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/[^/]+\/(.+))?/)
  if (urlMatch) {
    return {
      sourceType: 'github',
      owner: urlMatch[1],
      repo: urlMatch[2].replace('.git', ''),
      path: urlMatch[3],
      url: input,
    }
  }

  // Handle shorthand owner/repo
  const shorthandMatch = input.match(/^([^/]+)\/([^/]+)$/)
  if (shorthandMatch) {
    return {
      sourceType: 'github',
      owner: shorthandMatch[1],
      repo: shorthandMatch[2].replace('.git', ''),
      url: `https://github.com/${shorthandMatch[1]}/${shorthandMatch[2]}`,
    }
  }

  throw new Error(`Invalid GitHub source: ${input}`)
}

export async function fetchGitHubSkills(source: SkillSource): Promise<DiscoveredSkill[]> {
  const tempPath = await cloneRepo(source)

  try {
    const skillDirs = await findSkillDirs(tempPath)
    const skills: DiscoveredSkill[] = []

    for (const dir of skillDirs) {
      const skillFile = join(dir, 'SKILL.md')
      try {
        await access(skillFile)
        const content = await readFile(skillFile, 'utf-8')
        const { name, description } = parseSkillFrontmatter(content)
        const relativePath = dir.slice(tempPath.length + 1)

        skills.push({
          name,
          description,
          path: relativePath,
          source: `${source.owner}/${source.repo}`,
          sourceType: 'github',
        })
      } catch {
        // SKILL.md not found in this directory
      }
    }

    return skills
  } finally {
    await cleanupTemp(tempPath)
  }
}

async function cloneRepo(source: SkillSource): Promise<string> {
  const destDir = join(TEMP_DIR, `${source.owner}-${source.repo}-${Date.now()}`)
  await mkdir(destDir, { recursive: true })

  const ref = source.path ? `${source.path}` : 'HEAD'
  const cloneUrl = `https://github.com/${source.owner}/${source.repo}`

  try {
    await execAsync(`git clone --depth 1 --filter=blob:none --sparse ${cloneUrl} "${destDir}"`)
    await execAsync(`cd "${destDir}" && git sparse-checkout set "${source.path || ''}"`)
  } catch {
    // Fallback: try full clone
    await execAsync(`git clone --depth 1 ${cloneUrl} "${destDir}"`)
  }

  return destDir
}

async function findSkillDirs(basePath: string): Promise<string[]> {
  const dirs: string[] = []
  const searchPaths = ['', 'skills', 'skills/.curated', 'skills/.experimental', 'skills/.system']

  for (const sp of searchPaths) {
    const fullPath = join(basePath, sp)
    try {
      await access(fullPath)
      const entries = await readdir(fullPath, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          dirs.push(join(fullPath, entry.name))
        }
      }
    } catch {
      // Path doesn't exist
    }
  }

  return dirs
}

function parseSkillFrontmatter(content: string): { name: string; description: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) {
    return { name: '', description: '' }
  }

  const fm = match[1]
  const nameMatch = fm.match(/name:\s*(.+)/)
  const descMatch = fm.match(/description:\s*(.+)/)

  return {
    name: nameMatch ? nameMatch[1].trim() : '',
    description: descMatch ? descMatch[1].trim() : '',
  }
}

async function cleanupTemp(path: string): Promise<void> {
  try {
    await execAsync(`rm -rf "${path}"`)
  } catch {
    // Cleanup failed, ignore
  }
}
