// Legacy eslintrc — совместим с ESLint 8 и встроенным ESLint-плагином IntelliJ.
// (ESLint 9 flat config ломал ESLint8Plugin в IDE: удалённая опция reportUnusedDisableDirectives.)
module.exports = {
  extends: 'expo',
  ignorePatterns: ['dist/*', 'node_modules/*', '.expo/*'],
};
