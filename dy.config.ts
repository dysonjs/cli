export default {
  commands: {
    add: {
      destDir: 'packages',
    },
    test: {
      config: './jest.config.js',
    },
    publish: {
      access: 'public',
      betaTag: 'beta',
      registry: 'https://registry.npmjs.org',
      workspaceConcurrency: 8,
    },
  },
};
