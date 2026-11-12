// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.dev/*', '.expo/*'],
  },
  {
    // Apostrophes in React Native <Text> need no HTML escaping.
    rules: { 'react/no-unescaped-entities': 'off' },
  },
  {
    // Dev-stack and screenshot scripts run in Node.
    files: ['tools/**/*.mjs'],
    languageOptions: {
      globals: { Buffer: 'readonly', process: 'readonly', console: 'readonly', fetch: 'readonly', WebSocket: 'readonly', setTimeout: 'readonly', URL: 'readonly', URLSearchParams: 'readonly' },
    },
  },
]);
