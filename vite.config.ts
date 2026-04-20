import { defineConfig } from 'vite-plus'

export default defineConfig({
  pack: {
    entry: ['./src/index.ts'],
    exe: {
      targets: [
        { platform: 'linux', arch: 'x64', nodeVersion: '25.7.0' },
        { platform: 'darwin', arch: 'arm64', nodeVersion: '25.7.0' },
        { platform: 'win', arch: 'x64', nodeVersion: '25.7.0' },
      ],
    },
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
    plugins: [
      'eslint',
      'typescript',
      'unicorn',
      'react',
      'react-perf',
      'oxc',
      'import',
      'jsx-a11y',
      'promise',
    ],
  },
  fmt: {
    semi: false,
    singleQuote: true,
    sortImports: true,
    sortPackageJson: true,
  },
  staged: {
    '*': 'vp check --fix',
  },
})
