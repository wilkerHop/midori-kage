const globals = require("globals");
const js = require("@eslint/js");
const prettier = require("eslint-plugin-prettier/recommended");

module.exports = [
  js.configs.recommended,
  prettier,
  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        chrome: "readonly",
        SELECTORS: "readonly",
        module: "readonly"
      }
    },
    rules: {
      "no-unused-vars": ["warn", { "varsIgnorePattern": "^_" }],
      "no-console": "off"
    }
  }
];
