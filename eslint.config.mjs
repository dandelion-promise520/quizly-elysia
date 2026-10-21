import antfu from '@antfu/eslint-config'

export default antfu(
  {
    typescript: true,
    react: true,
    ignores: [
      '**/generated/**',
      // Drizzle Kit 生成的迁移文件与元数据
      '**/drizzle/**',
      '**/scripts/seed.sql',
      // Cloudflare Workers 本地状态
      '**/.wrangler/**',
    ],
  },
  {
    rules: {
      'no-console': 'off',
    },
  },
  {
    // beUI 原装组件（由 registry 直接落盘，保持上游实现，不按项目风格重写）
    files: [
      'apps/frontend/src/components/motion/**',
      'apps/frontend/src/lib/hooks/**',
      'apps/frontend/src/lib/presence-gate.tsx',
      'apps/frontend/src/lib/touch.ts',
    ],
    rules: {
      'ts/no-redeclare': 'off',
      'ts/no-use-before-define': 'off',
      'style/multiline-ternary': 'off',
      'react-refresh/only-export-components': 'off',
      'react-hooks/exhaustive-deps': 'off',
    },
  },
)
