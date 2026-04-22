import { versionBump } from 'bumpp'

function main() {
  void versionBump({
    preid: 'beta',
    commit: false,
    tag: false,
    push: false,
    all: true,
    confirm: true,
    execute: 'pnpm build',
    files: ['./package.json', './skills/kodaos-cli/SKILL.md'],
  })
}

main()
