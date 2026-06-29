import antfu from '@antfu/eslint-config'

export default antfu(
  {
    typescript: true,
    react: true,
    ignores: [
      '**/generated/**',
      '**/prisma/migrations/**',
    ],
  },
  {
    rules: {
      'no-console': 'off',
    },
  },
)
