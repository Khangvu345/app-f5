const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  expoConfig,
  // Runs Prettier as an ESLint rule and turns off formatting rules that conflict with it.
  prettierRecommended,
  {
    // Node/CommonJS config files
    files: ['*.config.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { __dirname: 'readonly', require: 'readonly', module: 'readonly' },
    },
  },
  {
    ignores: ['dist/**', '.expo/**', 'coverage/**', 'node_modules/**', 'android/**', 'ios/**'],
  },
  {
    // General rules (see CONVENTIONS.md)
    rules: {
      eqeqeq: ['error', 'always'],
      curly: ['error', 'multi-line'],
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'react-hooks/exhaustive-deps': 'error',
      // `axios.create(...)` / `axios.isAxiosError(...)` is the idiomatic way to use axios.
      'import/no-named-as-default-member': 'off',
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          pathGroups: [{ pattern: '@/**', group: 'internal' }],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
  {
    // TypeScript-only rules
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      // Typed linting: needed for the boolean naming rule and the promise rules below.
      parserOptions: { projectService: true, tsconfigRootDir: __dirname },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/naming-convention': [
        'error',
        // Default: camelCase (object keys like 'Content-Type' are exempt below).
        { selector: 'default', format: ['camelCase'], leadingUnderscore: 'allow' },
        // Constants are UPPER_CASE, React components and factories are PascalCase.
        { selector: 'variable', format: ['camelCase', 'UPPER_CASE', 'PascalCase'] },
        { selector: 'function', format: ['camelCase', 'PascalCase'] },
        { selector: 'parameter', format: ['camelCase', 'PascalCase'], leadingUnderscore: 'allow' },
        { selector: 'import', format: null },
        { selector: ['objectLiteralProperty', 'typeProperty'], format: null },
        // Types, interfaces, classes, enums: PascalCase, no `I` prefix.
        {
          selector: 'typeLike',
          format: ['PascalCase'],
          custom: { regex: '^I[A-Z]', match: false },
        },
        // Booleans read as a question: isLoading, hasError, canSubmit, shouldRetry...
        // (Component props that mirror React Native APIs, e.g. `disabled`, are exempt.)
        {
          selector: ['variable', 'classProperty'],
          types: ['boolean'],
          format: ['PascalCase'],
          prefix: ['is', 'has', 'can', 'should', 'will', 'did'],
        },
      ],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'jest.setup.ts'],
    rules: {
      'no-console': 'off',
    },
  },
]);
