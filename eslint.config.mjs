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
)
