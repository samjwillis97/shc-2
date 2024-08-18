const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');

module.exports = [
  ...[eslint.configs.recommended, ...tseslint.configs.recommended].map((conf) => ({
    ...conf,
    files: ['src/**/*.ts'],
    ignores: ['lib/*', '**/*.d.*', '**/*.js', '**/*.mjs', '**/*.cjs'],
  })),
];
