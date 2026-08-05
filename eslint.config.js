const expo = require('eslint-config-expo/flat');

module.exports = [
  ...expo,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'react/react-in-jsx-scope': 'off',
      // React Compiler is disabled in app.config.js; preserve the existing runtime behavior.
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      '.idea/**',
      '.vscode/**',
      'build-output/**',
      'dist/**',
      '.agents/**',
      '.codex/**',
      'plugins/**',
      '_workspace/**',
      'supabase/functions/**',
    ],
  },
];
