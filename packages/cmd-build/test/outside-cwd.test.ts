/** @jest-environment node */

import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import ts from 'typescript';

jest.mock('rollup-plugin-esbuild', () => ({
  __esModule: true,
  default: () => ({
    name: 'rpt2',
    transform(code: string, id: string) {
      if (!id.endsWith('.ts') && !id.endsWith('.tsx')) {
        return null;
      }

      const result = ts.transpileModule(code, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2018,
          jsx: ts.JsxEmit.React,
          resolveJsonModule: true,
          esModuleInterop: true,
        },
        fileName: id,
      });

      return {
        code: result.outputText,
        map: result.sourceMapText ?? null,
      };
    },
  }),
}));

import { BuildCommand } from '../src';

function createTempDir(name: string) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
}

async function createOutsideCwdFixture(workspace: string, withBrowser = false) {
  await fs.writeJSON(path.join(workspace, 'package.json'), {
    name: 'demo-app',
    version: '0.0.0',
    main: 'dist/index.cjs.js',
    module: 'dist/index.esm.js',
    ...(withBrowser ? { browser: 'dist/index.umd.js' } : {}),
  });
  await fs.writeJSON(path.join(workspace, 'tsconfig.json'), {
    compilerOptions: {
      target: 'ES2019',
      module: 'ESNext',
      moduleResolution: 'Node',
      esModuleInterop: true,
      strict: false,
      skipLibCheck: true,
    },
    include: ['src'],
  });
  await fs.ensureDir(path.join(workspace, 'src'));
  await fs.writeFile(path.join(workspace, 'src/index.ts'), "export { run } from './engine';\n");
  await fs.writeFile(
    path.join(workspace, 'src/engine.ts'),
    [
      "export type EngineCommandName = 'select-node' | 'insert-node';",
      "export const run = (): EngineCommandName => 'select-node';",
    ].join('\n'),
  );
  await fs.writeFile(
    path.join(workspace, 'dy.config.ts'),
    ['export default {', '  commands: {', '    build: {},', '  },', '};'].join('\n'),
  );
}

describe('@dysonic/dy-cli-cmd-build outside cwd', () => {
  test('should build package output when invoked outside the target cwd', async () => {
    const workspace = createTempDir('dy-cli-build-outside-cwd');
    const command = new BuildCommand();
    const previousCwd = process.cwd();

    await createOutsideCwdFixture(workspace);
    process.chdir(os.tmpdir());

    try {
      await command.parseAsync(['node', 'test', '--cwd', workspace]);
    } finally {
      process.chdir(previousCwd);
    }

    await expect(fs.readFile(path.join(workspace, 'dist/index.esm.js'), 'utf8')).resolves.toContain(
      'select-node',
    );
    await expect(fs.readFile(path.join(workspace, 'dist/index.cjs.js'), 'utf8')).resolves.toContain(
      'select-node',
    );
  });

  test('should build umd output when invoked outside the target cwd', async () => {
    const workspace = createTempDir('dy-cli-build-umd-outside-cwd');
    const command = new BuildCommand();
    const previousCwd = process.cwd();

    await createOutsideCwdFixture(workspace, true);
    process.chdir(os.tmpdir());

    try {
      await command.parseAsync(['node', 'test', '--cwd', workspace, '--umd']);
    } finally {
      process.chdir(previousCwd);
    }

    await expect(fs.readFile(path.join(workspace, 'dist/index.umd.js'), 'utf8')).resolves.toContain(
      'select-node',
    );
  });
});
