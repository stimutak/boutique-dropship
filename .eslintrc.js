module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  extends: [
    'eslint:recommended',
    'plugin:node/recommended',
    'plugin:security/recommended',
    'plugin:jest/recommended'
  ],
  plugins: [
    'node',
    'security',
    'jest'
  ],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  settings: {
    node: {
      version: '>=14.0.0'  // Support spread operator and modern JS features
    }
  },
  rules: {
    // Error prevention
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    'no-undef': 'error',
    'no-unreachable': 'error',
    'no-duplicate-imports': 'error',
    
    // Code style
    'indent': ['error', 2, { SwitchCase: 1 }],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'space-before-function-paren': ['error', {
      anonymous: 'always',
      named: 'never',
      asyncArrow: 'always'
    }],
    
    // Best practices
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-return-assign': 'error',
    'no-self-compare': 'error',
    'no-throw-literal': 'error',
    'prefer-const': 'error',
    'prefer-arrow-callback': 'error',
    
    // Node.js specific
    'node/no-unpublished-require': 'off',
    'node/no-missing-require': 'error',
    'node/no-extraneous-require': 'error',
    'node/exports-style': ['error', 'module.exports'],
    'node/prefer-global/buffer': ['error', 'always'],
    'node/prefer-global/process': ['error', 'always'],
    'node/no-unsupported-features/es-syntax': ['error', {
      version: '>=14.0.0',
      ignores: []
    }],
    
    // Security
    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'warn',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-non-literal-fs-filename': 'warn',
    'security/detect-non-literal-require': 'warn',
    'security/detect-possible-timing-attacks': 'warn',
    'security/detect-pseudoRandomBytes': 'error',
    
    // Jest specific
    'jest/no-disabled-tests': 'warn',
    'jest/no-focused-tests': 'error',
    'jest/no-identical-title': 'error',
    'jest/prefer-to-have-length': 'warn',
    'jest/valid-expect': 'error',
    'jest/expect-expect': ['error', {
      assertFunctionNames: ['expect', 'validateErrorResponse']
    }]
  },
  overrides: [
    {
      files: ['test/**/*.js', '**/*.test.js'],
      env: {
        jest: true
      },
      rules: {
        'node/no-unpublished-require': 'off',
        'security/detect-non-literal-fs-filename': 'off',
        'security/detect-child-process': 'off'
      }
    },
    {
      files: ['scripts/**/*.js'],
      rules: {
        'no-console': 'off',
        'node/no-unpublished-require': 'off',
        'no-process-exit': 'off'
      }
    },
    {
      files: ['scripts/test-design-system.js'],
      env: {
        browser: true
      }
    },
    {
      files: ['*.config.js', 'ecosystem.config.js'],
      env: {
        node: true
      },
      rules: {
        'node/no-unpublished-require': 'off'
      }
    }
  ],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    'test-results/',
    'client/',  // Client has its own ESLint config
    'uploads/',
    'logs/',
    '*.min.js',
    '.jest-cache/',
    'public/',
    'mongo-init.js',  // MongoDB script, not Node.js
    'scripts/test-design-system.js'  // Requires puppeteer which is not installed
  ]
};