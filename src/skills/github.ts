import { exec } from 'child_process'
import { readFile, mkdir, access, readdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { promisify } from 'util'

import type { SkillSource, DiscoveredSkill, SkillsIndexFile } from './types'

const execAsync = promisify(exec)
const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMP_DIR = join(__dirname, '../../.temp/skills')

export function parseGitHubSource(input: string): SkillSource {
  // Extract --path= option
  const pathMatch = input.match(/--path=(.+)$/)
  const rootPath = pathMatch ? pathMatch[1] : undefined
  const cleanInput = pathMatch ? input.replace(/--path=.+$/, '').trim() : input

  // Handle full GitHub URL
  const urlMatch = cleanInput.match(/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/[^/]+\/(.+))?/)
  if (urlMatch) {
    return {
      sourceType: 'github',
      owner: urlMatch[1],
      repo: urlMatch[2].replace('.git', ''),
      path: rootPath || urlMatch[3],
      url: input,
    }
  }

  // Handle shorthand owner/repo
  const shorthandMatch = cleanInput.match(/^([^/]+)\/([^/]+)$/)
  if (shorthandMatch) {
    const owner = shorthandMatch[1]
    const repo = shorthandMatch[2].replace('.git', '')
    return {
      sourceType: 'github',
      owner,
      repo,
      url: `https://github.com/${owner}/${repo}`,
      path: rootPath,
    }
  }

  throw new Error(`Invalid GitHub source: ${input}`)
}

export async function fetchGitHubSkills(source: SkillSource): Promise<DiscoveredSkill[]> {
  const tempPath = await cloneRepo(source)

  try {
    const skillDirs = await findSkillDirs(tempPath, source.path)
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

async function findSkillDirs(basePath: string, rootPath?: string): Promise<string[]> {
  // If rootPath is specified, check if SKILL.md exists directly at that path (no recursion)
  if (rootPath) {
    const skillPath = join(basePath, rootPath)
    const skillFile = join(skillPath, 'SKILL.md')
    try {
      await access(skillFile)
      return [skillPath]
    } catch {
      return []
    }
  }

  const skillsDir = join(basePath, 'skills')
  const indexFile = join(skillsDir, 'index.json')

  // Check if index.json exists
  try {
    const content = await readFile(indexFile, 'utf-8')
    const index: SkillsIndexFile = JSON.parse(content)
    const dirs: string[] = []

    for (const skillPath of index.skills) {
      const fullPath = join(skillsDir, skillPath)
      const skillFile = join(fullPath, 'SKILL.md')
      try {
        await access(skillFile)
        dirs.push(fullPath)
      } catch {
        // SKILL.md not found in this path, skip
      }
    }
    return dirs
  } catch {
    // index.json not found or invalid, fall back to scanning skills/* subdirectories
  }

  // Default: scan skills/* subdirectories with SKILL.md
  try {
    await access(skillsDir)
  } catch {
    return []
  }

  const entries = await readdir(skillsDir, { withFileTypes: true })
  const dirs: string[] = []

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const skillPath = join(skillsDir, entry.name)
      const skillFile = join(skillPath, 'SKILL.md')
      try {
        await access(skillFile)
        dirs.push(skillPath)
      } catch {
        // SKILL.md not found, skip
      }
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
