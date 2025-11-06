// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

// @ts-check

import eslint from '@eslint/js'
import next from 'eslint-config-next'
import tseslint from 'typescript-eslint'

export default tseslint.config(eslint.configs.recommended, ...next, ...tseslint.configs.recommended, {
  languageOptions: {
    parserOptions: {
      projectService: true,
      tsconfigRootDir: import.meta.dirname,
    },
  },
}, {
  files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
  rules: {
    // Custom rules can go here
  },
}, storybook.configs["flat/recommended"]);