import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist/**', 'release/**', 'node_modules/**', 'electron/**'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
)
