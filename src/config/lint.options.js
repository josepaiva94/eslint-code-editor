module.exports = {
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: false
    }
  },
  rules: {
    // enable additional rules
    indent: ['error', 2],
    'linebreak-style': ['error', 'unix'],
    quotes: ['error', 'double'],
    semi: ['error', 'always'],
    'no-unused-vars': ['error', { 'vars': 'all', 'args': 'after-used', 'ignoreRestSiblings': false }],

    // override default options for rules from base configurations
    'comma-dangle': ['error', 'always'],
    'no-cond-assign': ['error', 'always'],

    // disable rules from base configurations
    'no-console': 'off',
  },
};
