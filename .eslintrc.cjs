module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
  overrides: [
    {
      // TypeScript in this repo is the Playwright config and the test specs.
      // These were not linted at all before: the lint script covered js,jsx only.
      files: ['**/*.ts', '**/*.tsx'],
      parser: '@typescript-eslint/parser',
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
      plugins: ['@typescript-eslint', 'simple-import-sort'],
      env: { node: true },
      rules: {
        // TypeScript resolves identifiers itself, and eslint:recommended's
        // no-undef does not understand TS scoping. Leaving it on reports
        // `process` in playwright.config.ts as undefined.
        'no-undef': 'off',
        // Order of import statements relative to each other.
        'simple-import-sort/imports': 'error',
        'simple-import-sort/exports': 'error',
        // Order of members WITHIN a single import statement. simple-import-sort
        // does not check this, and a generated test is usually one import.
        'sort-imports': ['error', { ignoreDeclarationSort: true }],
        '@typescript-eslint/no-explicit-any': 'error',
      },
    },
  ],
}
