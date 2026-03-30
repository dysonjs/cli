export default {
  commands: {
    build: {
      bin: {
        entry: 'src/cli.ts',
        output: 'dist/cli.js',
        banner: '#!/usr/bin/env node',
      },
    },
  },
};
