export default {
  project: {
    type: 'monorepo',
    packageDir: 'packages',
    versionStrategy: 'fixed',
  },
  commands: {
    add: {
      destDir: 'packages',
    },
    build: {
      workspaceConcurrency: 8,
    },
    test: {
      config: './jest.config.js',
      workspaceConcurrency: 8,
    },
    version: {
      betaTag: 'beta',
    },
    publish: {
      access: 'public',
      betaTag: 'beta',
      registry: 'https://registry.npmjs.org',
      workspaceConcurrency: 8,
    },
  },
};
