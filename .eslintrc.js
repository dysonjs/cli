module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
    'import/extensions': ['.js', '.jsx', '.ts', '.tsx'],
  },
  extends: ['plugin:@typescript-eslint/recommended', 'prettier', 'plugin:prettier/recommended'],
  plugins: ['import'],
  rules: {
    'no-shadow': 'warn',
    // 是否禁止使用 console 语句
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    // 是否禁止使用 debugger 语句
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    // === 针对 ts 场景 ===
    // 是否要求所有的成员变量都带上访问修饰符，如：public、private、protected
    '@typescript-eslint/explicit-member-accessibility': [
      'off',
      { overrides: { constructors: 'no-public', accessors: 'off' } },
    ],
    // 是否禁止使用 any
    '@typescript-eslint/no-explicit-any': 'off',
    // 是否禁止使用 ! 非空断言
    '@typescript-eslint/no-non-null-assertion': 'error',
    // 是否禁止定义空实现函数
    '@typescript-eslint/no-empty-function': 'off',
    // 是否禁止引用一些不规范类型，如：封装类
    // https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/eslint-plugin/docs/rules/ban-types.md
    '@typescript-eslint/ban-types': 'off',
    // 是否禁止定义空实现接口
    '@typescript-eslint/no-empty-interface': 'off',
    // 是否禁止不明确的模块导出，如：export function(a: any) {} 没有明确指定返回值和参数类型
    // https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/eslint-plugin/docs/rules/explicit-module-boundary-types.md
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/no-this-alias': [
      'warn',
      {
        allowDestructuring: false, // Disallow `const { props, state } = this`; true by default
        allowedNames: ['self'], // Allow `const self = this`; `[]` by default
      },
    ],
    // === 针对 react 场景 ===
    // 类组件是否必须声明 displayName
    'react/display-name': 'off',
    // 是否必须声明 propTypes
    'react/prop-types': 'off',
    // === 针对模块导入场景 ===
    // 是否禁止重复导入包
    'no-duplicate-imports': 'error',
    // 是否禁止文件循环依赖（该规则性能开销较大）
    // 'import/no-cycle': ['warn', { maxDepth: process.env.NODE_ENV === 'production' ? 2 : 1 }],
    // 是否禁止导入当前包自身
    'import/no-self-import': 'error',
    // 是否禁止导入没有通过 dependencies 字段声明的包
    'import/no-extraneous-dependencies': [
      'error',
      {
        // 配置白名单
        devDependencies: [
          '**/scripts/**',
          '**/test/**',
          'tools/**',
          'jest.config.js',
          'jest.setup.js',
        ],
        peerDependencies: ['packages/*/src/**', '**/test/**', 'jest.config.js', 'jest.setup.js'],
      },
    ],
  },
  // eslint 规则覆盖
  overrides: [
    {
      files: ['tools/**', '**/scripts/**', '**/test/**', 'jest.config.js', 'jest.setup.js'],
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        'import/no-extra': 'off',
      },
    },
  ],
};
