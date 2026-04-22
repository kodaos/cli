import { versionBump } from 'bumpp'

function main() {
  void versionBump({
    preid: 'beta',
    commit: true,
    tag: true,
    push: true,
    all: true,
    confirm: true,
    execute: 'pnpm build',
    files: ['./package.json', './skills/kodaos-cli/SKILL.md'],
  })
}

main()
