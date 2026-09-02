import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';

const NODE_GLOBALS = {
  process: 'readonly',
  console: 'readonly',
  Buffer: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  URL: 'readonly',
  fetch: 'readonly',
  FormData: 'readonly',
  Blob: 'readonly',
  AbortController: 'readonly',
};

const BROWSER_GLOBALS = {
  console: 'readonly',
  window: 'readonly',
  document: 'readonly',
  navigator: 'readonly',
  fetch: 'readonly',
  FormData: 'readonly',
  Blob: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  crypto: 'readonly',
  localStorage: 'readonly',
  sessionStorage: 'readonly',
  IntersectionObserver: 'readonly',
  MutationObserver: 'readonly',
  ResizeObserver: 'readonly',
  requestAnimationFrame: 'readonly',
  cancelAnimationFrame: 'readonly',
  performance: 'readonly',
  WebSocket: 'readonly',
  HTMLElement: 'readonly',
  AbortController: 'readonly',
};

const COMMONJS_GLOBALS = {
  require: 'readonly',
  module: 'readonly',
  exports: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  process: 'readonly',
  console: 'readonly',
};

const MOCHA_GLOBALS = {
  describe: 'readonly',
  it: 'readonly',
  before: 'readonly',
  beforeEach: 'readonly',
  after: 'readonly',
  afterEach: 'readonly',
};

export default [
  js.configs.recommended,
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      'contracts/cache/**',
      'contracts/artifacts/**',
      'contracts/typechain-types/**',
      'contracts/deployments/**',
      'weekly-work/**',
    ],
  },
  {
    files: ['**/*.js', '**/*.jsx'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: NODE_GLOBALS,
    },
    rules: {
      'no-var': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['apps/api/src/**/*.js', 'apps/worker/src/**/*.js'],
    ignores: [
      'apps/api/src/container.js',
      'apps/worker/src/worker.js',
      'apps/api/src/adapters/chain.adapter.js',
      'apps/api/src/repositories/**',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'pg', message: 'Only modules under repositories/ (or the composition root) may import pg (rule D3).' },
            { name: 'ethers', message: 'Only chain.adapter.js may import ethers (rule D4).' },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/web/src/**/*.jsx', 'apps/web/src/**/*.js'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: { globals: BROWSER_GLOBALS },
    rules: {
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'no-console': 'error',
    },
  },
  {
    files: ['contracts/**/*.js'],
    languageOptions: { sourceType: 'commonjs', globals: COMMONJS_GLOBALS },
  },
  {
    files: ['contracts/test/**/*.js'],
    languageOptions: { globals: { ...COMMONJS_GLOBALS, ...MOCHA_GLOBALS } },
  },
];
