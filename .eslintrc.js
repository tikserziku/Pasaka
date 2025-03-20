module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    // Отключаем предупреждения о зависимостях хуков для повышения читаемости кода
    'react-hooks/exhaustive-deps': 'off',
    
    // Другие полезные правила
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    'no-unused-vars': 'warn',
    'prefer-const': 'warn',
    
    // Правила для TypeScript
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
  },
};
