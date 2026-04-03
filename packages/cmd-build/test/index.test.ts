/** @jest-environment node */

import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import ts from 'typescript';
// eslint-disable-next-line import/no-extraneous-dependencies
import execa from 'execa';

import { BuildCommand, shouldExternalizeModuleId } from '../src';

function createTempDir(name: string) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
}

jest.mock('rollup-plugin-esbuild', () => ({
  __esModule: true,
  default: () => ({
    name: 'test-esbuild',
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

jest.mock('execa', () => jest.fn(() => Promise.resolve()));

describe('@dysonic/dy-cli-cmd-build', () => {
  test('should build esm and cjs outputs without relying on package scripts', async () => {
    const workspace = createTempDir('dy-cli-build');
    const command = new BuildCommand();

    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-app',
      version: '0.0.0',
      main: 'dist/index.cjs.js',
      module: 'dist/index.esm.js',
      types: 'dist/index.d.ts',
    });
    await fs.writeJSON(path.join(workspace, 'tsconfig.json'), {
      compilerOptions: {
        target: 'ES2019',
        module: 'ESNext',
        moduleResolution: 'Node',
        declaration: true,
        esModuleInterop: true,
        strict: false,
        skipLibCheck: true,
      },
      include: ['src'],
    });
    await fs.ensureDir(path.join(workspace, 'src'));
    await fs.writeFile(
      path.join(workspace, 'src/index.ts'),
      "export const answer = () => 'build-success';\n",
    );
    await fs.writeFile(
      path.join(workspace, 'dy.config.ts'),
      ['export default {', '  commands: {', '    build: {},', '  },', '};'].join('\n'),
    );

    await command.parseAsync(['node', 'test', '--cwd', workspace]);

    await expect(fs.readFile(path.join(workspace, 'dist/index.cjs.js'), 'utf8')).resolves.toContain(
      'build-success',
    );
    await expect(fs.readFile(path.join(workspace, 'dist/index.esm.js'), 'utf8')).resolves.toContain(
      'build-success',
    );
  });

  test('should build declaration files when --types is provided', async () => {
    const workspace = createTempDir('dy-cli-build-types');
    const command = new BuildCommand();

    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-app',
      version: '0.0.0',
      main: 'dist/index.cjs.js',
      module: 'dist/index.esm.js',
      types: 'dist/index.d.ts',
    });
    await fs.writeJSON(path.join(workspace, 'tsconfig.json'), {
      compilerOptions: {
        target: 'ES2019',
        module: 'ESNext',
        moduleResolution: 'Node',
        declaration: true,
        esModuleInterop: true,
        strict: false,
        skipLibCheck: true,
      },
      include: ['src'],
    });
    await fs.ensureDir(path.join(workspace, 'src'));
    await fs.writeFile(
      path.join(workspace, 'src/index.ts'),
      'export interface BuildTypesResult { value: string; }\n',
    );
    await fs.writeFile(
      path.join(workspace, 'dy.config.ts'),
      ['export default {', '  commands: {', '    build: {},', '  },', '};'].join('\n'),
    );

    await command.parseAsync(['node', 'test', '--cwd', workspace, '--types']);

    await expect(fs.readFile(path.join(workspace, 'dist/index.d.ts'), 'utf8')).resolves.toContain(
      'BuildTypesResult',
    );
  });

  test('should build umd output when --umd is provided', async () => {
    const workspace = createTempDir('dy-cli-build-umd');
    const command = new BuildCommand();

    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-app',
      version: '0.0.0',
      main: 'dist/index.cjs.js',
      module: 'dist/index.esm.js',
      types: 'dist/index.d.ts',
      browser: 'dist/index.umd.js',
    });
    await fs.writeJSON(path.join(workspace, 'tsconfig.json'), {
      compilerOptions: {
        target: 'ES2019',
        module: 'ESNext',
        moduleResolution: 'Node',
        declaration: true,
        esModuleInterop: true,
        strict: false,
        skipLibCheck: true,
      },
      include: ['src'],
    });
    await fs.ensureDir(path.join(workspace, 'src'));
    await fs.writeFile(
      path.join(workspace, 'src/index.ts'),
      "export const buildUmdValue = 'umd-success';\n",
    );
    await fs.writeFile(
      path.join(workspace, 'dy.config.ts'),
      ['export default {', '  commands: {', '    build: {},', '  },', '};'].join('\n'),
    );

    await command.parseAsync(['node', 'test', '--cwd', workspace, '--umd']);

    await expect(fs.readFile(path.join(workspace, 'dist/index.umd.js'), 'utf8')).resolves.toContain(
      'umd-success',
    );
  });

  test('should build executable bin output when --bin is provided', async () => {
    const workspace = createTempDir('dy-cli-build-bin');
    const command = new BuildCommand();

    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-cli',
      version: '0.0.0',
      main: 'dist/index.cjs.js',
      module: 'dist/index.esm.js',
      types: 'dist/index.d.ts',
      bin: {
        'demo-cli': 'dist/cli.js',
      },
    });
    await fs.writeJSON(path.join(workspace, 'tsconfig.json'), {
      compilerOptions: {
        target: 'ES2019',
        module: 'ESNext',
        moduleResolution: 'Node',
        declaration: true,
        esModuleInterop: true,
        strict: false,
        skipLibCheck: true,
      },
      include: ['src'],
    });
    await fs.ensureDir(path.join(workspace, 'src'));
    await fs.writeFile(path.join(workspace, 'src/cli.ts'), "console.log('bin-success');\n");
    await fs.writeFile(
      path.join(workspace, 'dy.config.ts'),
      [
        'export default {',
        '  commands: {',
        '    build: {',
        '      bin: {},',
        '    },',
        '  },',
        '};',
      ].join('\n'),
    );

    await command.parseAsync(['node', 'test', '--cwd', workspace, '--bin']);

    await expect(fs.readFile(path.join(workspace, 'dist/cli.js'), 'utf8')).resolves.toContain(
      '#!/usr/bin/env node',
    );
    await expect(fs.readFile(path.join(workspace, 'dist/cli.js'), 'utf8')).resolves.toContain(
      'bin-success',
    );
  });

  test('should build executable bin output by default when the package declares bin', async () => {
    const workspace = createTempDir('dy-cli-build-default-bin');
    const command = new BuildCommand();

    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-cli',
      version: '0.0.0',
      main: 'dist/index.cjs.js',
      module: 'dist/index.esm.js',
      types: 'dist/index.d.ts',
      bin: {
        'demo-cli': 'dist/cli.js',
      },
    });
    await fs.writeJSON(path.join(workspace, 'tsconfig.json'), {
      compilerOptions: {
        target: 'ES2019',
        module: 'ESNext',
        moduleResolution: 'Node',
        declaration: true,
        esModuleInterop: true,
        strict: false,
        skipLibCheck: true,
      },
      include: ['src'],
    });
    await fs.ensureDir(path.join(workspace, 'src'));
    await fs.writeFile(
      path.join(workspace, 'src/index.ts'),
      "export const packageBuildValue = 'package-success';\n",
    );
    await fs.writeFile(path.join(workspace, 'src/cli.ts'), "console.log('bin-success');\n");
    await fs.writeFile(
      path.join(workspace, 'dy.config.ts'),
      ['export default {', '  commands: {', '    build: {},', '  },', '};'].join('\n'),
    );

    await command.parseAsync(['node', 'test', '--cwd', workspace]);

    await expect(fs.readFile(path.join(workspace, 'dist/index.cjs.js'), 'utf8')).resolves.toContain(
      'package-success',
    );
    await expect(fs.readFile(path.join(workspace, 'dist/cli.js'), 'utf8')).resolves.toContain(
      '#!/usr/bin/env node',
    );
    await expect(fs.readFile(path.join(workspace, 'dist/cli.js'), 'utf8')).resolves.toContain(
      'bin-success',
    );
  });

  test('should build executable bin output when invoked outside the target cwd', async () => {
    const workspace = createTempDir('dy-cli-build-bin-outside-cwd');
    const command = new BuildCommand();
    const previousCwd = process.cwd();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-cli',
      version: '0.0.0',
      main: 'dist/index.cjs.js',
      module: 'dist/index.esm.js',
      types: 'dist/index.d.ts',
      bin: {
        'demo-cli': 'dist/cli.js',
      },
    });
    await fs.writeJSON(path.join(workspace, 'tsconfig.json'), {
      compilerOptions: {
        target: 'ES2019',
        module: 'ESNext',
        moduleResolution: 'Node',
        declaration: true,
        esModuleInterop: true,
        strict: false,
        skipLibCheck: true,
      },
      include: ['src'],
    });
    await fs.ensureDir(path.join(workspace, 'src'));
    await fs.writeFile(
      path.join(workspace, 'src/cli.ts'),
      "import { runCLI } from './index';\nrunCLI(['node', 'demo-cli']);\n",
    );
    await fs.writeFile(
      path.join(workspace, 'src/index.ts'),
      [
        'export const runCLI = (argv?: string[]) => {',
        "  console.log(`outside-cwd:${argv?.join('|') ?? ''}`);",
        '};',
      ].join('\n'),
    );
    await fs.writeFile(
      path.join(workspace, 'dy.config.ts'),
      [
        'export default {',
        '  commands: {',
        '    build: {',
        '      bin: {},',
        '    },',
        '  },',
        '};',
      ].join('\n'),
    );

    process.chdir(os.tmpdir());

    try {
      await command.parseAsync(['node', 'test', '--cwd', workspace, '--bin']);
      expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('Generated an empty chunk'));
    } finally {
      process.chdir(previousCwd);
      warnSpy.mockRestore();
    }

    await expect(fs.readFile(path.join(workspace, 'dist/cli.js'), 'utf8')).resolves.toContain(
      '#!/usr/bin/env node',
    );
    await expect(fs.readFile(path.join(workspace, 'dist/cli.js'), 'utf8')).resolves.toContain(
      'outside-cwd',
    );
  });

  test('should load build config from monorepo root when executed in a child package', async () => {
    const workspace = createTempDir('dy-cli-build-monorepo');
    const packageDir = path.join(workspace, 'packages/button');
    const command = new BuildCommand();

    await fs.ensureDir(packageDir);
    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-workspace',
      private: true,
      workspaces: ['packages/*'],
    });
    await fs.writeJSON(path.join(packageDir, 'package.json'), {
      name: '@dysonic/button',
      version: '0.0.0',
      main: 'dist/index.cjs.js',
      module: 'dist/index.esm.js',
      types: 'dist/index.d.ts',
    });
    await fs.writeJSON(path.join(packageDir, 'tsconfig.json'), {
      compilerOptions: {
        target: 'ES2019',
        module: 'ESNext',
        moduleResolution: 'Node',
        declaration: true,
        esModuleInterop: true,
        strict: false,
        skipLibCheck: true,
      },
      include: ['src'],
    });
    await fs.ensureDir(path.join(packageDir, 'src'));
    await fs.writeFile(
      path.join(packageDir, 'src/index.ts'),
      "export const buttonName = 'button';\n",
    );
    await fs.writeFile(
      path.join(workspace, 'dy.config.ts'),
      ['export default {', '  commands: {', '    build: {},', '  },', '};'].join('\n'),
    );

    await command.parseAsync(['node', 'test', '--cwd', packageDir]);

    await expect(
      fs.readFile(path.join(packageDir, 'dist/index.esm.js'), 'utf8'),
    ).resolves.toContain('button');
  });

  test('should reject when multiple build targets are provided', async () => {
    const workspace = createTempDir('dy-cli-build-conflict');
    const command = new BuildCommand();

    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-app',
      private: true,
    });
    await fs.writeFile(
      path.join(workspace, 'dy.config.ts'),
      ['export default {', '  commands: {', '    build: {},', '  },', '};'].join('\n'),
    );

    await expect(
      command.parseAsync(['node', 'test', '--cwd', workspace, '--types', '--umd', '--bin']),
    ).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  test('should reject when dy.config.ts is missing', async () => {
    const workspace = createTempDir('dy-cli-build-missing-config');
    const command = new BuildCommand();

    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-app',
      private: true,
      scripts: {
        build: 'echo build',
      },
    });

    await expect(command.parseAsync(['node', 'test', '--cwd', workspace])).rejects.toMatchObject({
      code: 'CONFIG_NOT_FOUND',
    });
  });

  test('should reject when package.json is missing', async () => {
    const workspace = createTempDir('dy-cli-build-no-pkg');
    const command = new BuildCommand();

    await fs.writeFile(
      path.join(workspace, 'dy.config.ts'),
      ['export default { commands: { build: {} } };'].join('\n'),
    );

    await expect(command.parseAsync(['node', 'test', '--cwd', workspace])).rejects.toMatchObject({
      code: 'CONFIG_NOT_FOUND',
    });
  });

  test('should reject when no TypeScript entry exists', async () => {
    const workspace = createTempDir('dy-cli-build-no-entry');
    const command = new BuildCommand();

    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-app',
      version: '0.0.0',
      main: 'dist/index.cjs.js',
      module: 'dist/index.esm.js',
    });
    await fs.writeJSON(path.join(workspace, 'tsconfig.json'), {
      compilerOptions: { target: 'ES2019', module: 'ESNext', skipLibCheck: true },
      include: ['src'],
    });
    await fs.ensureDir(path.join(workspace, 'src'));
    await fs.writeFile(
      path.join(workspace, 'dy.config.ts'),
      ['export default { commands: { build: {} } };'].join('\n'),
    );

    await expect(command.parseAsync(['node', 'test', '--cwd', workspace])).rejects.toMatchObject({
      code: 'CONFIG_NOT_FOUND',
    });
  });

  test('should prefer src/index.tsx as entry when present', async () => {
    const workspace = createTempDir('dy-cli-build-tsx');
    const command = new BuildCommand();

    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-app',
      version: '0.0.0',
      main: 'dist/index.cjs.js',
      module: 'dist/index.esm.js',
    });
    await fs.writeJSON(path.join(workspace, 'tsconfig.json'), {
      compilerOptions: {
        target: 'ES2019',
        module: 'ESNext',
        moduleResolution: 'Node',
        jsx: 'react',
        esModuleInterop: true,
        strict: false,
        skipLibCheck: true,
      },
      include: ['src'],
    });
    await fs.ensureDir(path.join(workspace, 'src'));
    await fs.writeFile(
      path.join(workspace, 'src/index.tsx'),
      "export const tsxFlag = 'tsx-entry';\n",
    );
    await fs.writeFile(
      path.join(workspace, 'dy.config.ts'),
      ['export default { commands: { build: {} } };'].join('\n'),
    );

    await command.parseAsync(['node', 'test', '--cwd', workspace]);

    await expect(fs.readFile(path.join(workspace, 'dist/index.esm.js'), 'utf8')).resolves.toContain(
      'tsx-entry',
    );
  });

  test('should copy themes, locales, and templates folders into dist', async () => {
    const workspace = createTempDir('dy-cli-build-copy');
    const command = new BuildCommand();

    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-app',
      version: '0.0.0',
      main: 'dist/index.cjs.js',
      module: 'dist/index.esm.js',
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
    await fs.writeFile(path.join(workspace, 'src/index.ts'), "export const copied = 'yes';\n");
    await fs.outputFile(path.join(workspace, 'src/themes/a.css'), 'body{}');
    await fs.outputFile(path.join(workspace, 'src/locales/en.json'), '{}');
    await fs.outputFile(path.join(workspace, 'src/templates/note.txt'), 'hello');
    await fs.writeFile(
      path.join(workspace, 'dy.config.ts'),
      ['export default { commands: { build: {} } };'].join('\n'),
    );

    await command.parseAsync(['node', 'test', '--cwd', workspace]);

    expect(await fs.pathExists(path.join(workspace, 'dist/themes/a.css'))).toBe(true);
    expect(await fs.pathExists(path.join(workspace, 'dist/locales/en.json'))).toBe(true);
    expect(await fs.pathExists(path.join(workspace, 'dist/templates/note.txt'))).toBe(true);
  });

  test('should remove deleted template files from dist on rebuild', async () => {
    const workspace = createTempDir('dy-cli-build-clean-dist');
    const command = new BuildCommand();

    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-app',
      version: '0.0.0',
      main: 'dist/index.cjs.js',
      module: 'dist/index.esm.js',
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
    await fs.writeFile(path.join(workspace, 'src/index.ts'), "export const copied = 'yes';\n");
    await fs.outputFile(path.join(workspace, 'src/templates/stale.txt'), 'stale');
    await fs.writeFile(
      path.join(workspace, 'dy.config.ts'),
      ['export default { commands: { build: {} } };'].join('\n'),
    );

    await command.parseAsync(['node', 'test', '--cwd', workspace]);

    expect(await fs.pathExists(path.join(workspace, 'dist/templates/stale.txt'))).toBe(true);

    await fs.remove(path.join(workspace, 'src/templates/stale.txt'));
    await fs.outputFile(path.join(workspace, 'src/templates/fresh.txt'), 'fresh');

    await command.parseAsync(['node', 'test', '--cwd', workspace]);

    expect(await fs.pathExists(path.join(workspace, 'dist/templates/stale.txt'))).toBe(false);
    expect(await fs.pathExists(path.join(workspace, 'dist/templates/fresh.txt'))).toBe(true);
  });

  test('should parse externals and globals from CLI strings', async () => {
    const workspace = createTempDir('dy-cli-build-parse-cli');
    const command = new BuildCommand();

    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-app',
      version: '0.0.0',
      main: 'dist/index.cjs.js',
      module: 'dist/index.esm.js',
      browser: 'dist/index.umd.js',
      peerDependencies: { 'peer-dep': '1.0.0' },
    });
    await fs.writeFile(
      path.join(workspace, 'peer-shim.d.ts'),
      'declare module "peer-dep" { const v: unknown; export default v; }\n',
    );
    await fs.writeJSON(path.join(workspace, 'tsconfig.json'), {
      compilerOptions: {
        target: 'ES2019',
        module: 'ESNext',
        moduleResolution: 'Node',
        esModuleInterop: true,
        strict: false,
        skipLibCheck: true,
      },
      include: ['src', 'peer-shim.d.ts'],
    });
    await fs.ensureDir(path.join(workspace, 'src'));
    await fs.writeFile(
      path.join(workspace, 'src/index.ts'),
      "import p from 'peer-dep';\nexport const u = p;\n",
    );
    await fs.writeFile(
      path.join(workspace, 'dy.config.ts'),
      ['export default { commands: { build: {} } };'].join('\n'),
    );

    await command.parseAsync([
      'node',
      'test',
      '--cwd',
      workspace,
      '--umd',
      '--externals',
      'peer-dep, other',
      '--globals',
      'peer-dep:PeerDep, invalidSegment',
    ]);

    await expect(
      fs.readFile(path.join(workspace, 'dist/index.umd.js'), 'utf8'),
    ).resolves.toBeTruthy();
  });

  test('should preserve default import interop for external CommonJS modules in cjs output', async () => {
    const workspace = createTempDir('dy-cli-build-cjs-interop');
    const command = new BuildCommand();

    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-app',
      version: '0.0.0',
      main: 'dist/index.cjs.js',
      module: 'dist/index.esm.js',
      dependencies: {
        'demo-plugin': '1.0.0',
      },
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
      include: ['src', 'types'],
    });
    await fs.ensureDir(path.join(workspace, 'src'));
    await fs.ensureDir(path.join(workspace, 'types'));
    await fs.outputFile(
      path.join(workspace, 'src/index.ts'),
      ["import plugin from 'demo-plugin';", '', 'export const runPlugin = () => plugin();'].join(
        '\n',
      ),
    );
    await fs.outputFile(
      path.join(workspace, 'types/demo-plugin.d.ts'),
      "declare module 'demo-plugin' { const plugin: () => string; export default plugin; }\n",
    );
    await fs.outputFile(
      path.join(workspace, 'node_modules/demo-plugin/index.js'),
      [
        'module.exports = {',
        '  __esModule: true,',
        "  default: () => 'interop-success',",
        '};',
      ].join('\n'),
    );
    await fs.writeFile(
      path.join(workspace, 'dy.config.ts'),
      ['export default { commands: { build: {} } };'].join('\n'),
    );

    await command.parseAsync(['node', 'test', '--cwd', workspace]);

    const builtModule = require(path.join(workspace, 'dist/index.cjs.js'));
    expect(builtModule.runPlugin()).toBe('interop-success');
  });

  test('should use array externals and object globals from dy.config for umd', async () => {
    const workspace = createTempDir('dy-cli-build-parse-cfg');
    const command = new BuildCommand();

    await fs.writeJSON(path.join(workspace, 'package.json'), {
      version: '0.0.0',
      main: 'dist/index.cjs.js',
      module: 'dist/index.esm.js',
      browser: 'dist/index.umd.js',
      peerDependencies: { 'peer-dep': '1.0.0' },
    });
    await fs.writeFile(
      path.join(workspace, 'peer-shim.d.ts'),
      'declare module "peer-dep" { const v: unknown; export default v; }\n',
    );
    await fs.writeJSON(path.join(workspace, 'tsconfig.json'), {
      compilerOptions: {
        target: 'ES2019',
        module: 'ESNext',
        moduleResolution: 'Node',
        esModuleInterop: true,
        strict: false,
        skipLibCheck: true,
      },
      include: ['src', 'peer-shim.d.ts'],
    });
    await fs.ensureDir(path.join(workspace, 'src'));
    await fs.writeFile(
      path.join(workspace, 'src/index.ts'),
      "import p from 'peer-dep';\nexport const u = p;\n",
    );
    await fs.writeFile(
      path.join(workspace, 'dy.config.ts'),
      [
        'export default {',
        '  commands: {',
        '    build: {',
        '      umd: {',
        "        externals: ['peer-dep'],",
        '        globals: { "peer-dep": "PeerDep" },',
        "        name: 'ExplicitUmd',",
        '      },',
        '    },',
        '  },',
        '};',
      ].join('\n'),
    );

    await command.parseAsync(['node', 'test', '--cwd', workspace, '--umd']);

    const umd = await fs.readFile(path.join(workspace, 'dist/index.umd.js'), 'utf8');
    expect(umd).toBeTruthy();
    expect(umd).toContain('ExplicitUmd');
  });

  test('should externalize dy-cli workspace package imports before path alias resolution', () => {
    expect(shouldExternalizeModuleId('@dysonic/dy-cli-core')).toBe(true);
    expect(shouldExternalizeModuleId('@dysonic/dy-cli-cmd-build')).toBe(true);
    expect(shouldExternalizeModuleId('./local-module')).toBe(false);
    expect(shouldExternalizeModuleId('/abs/path/module')).toBe(false);
  });

  test('should only apply build.bin config when the bin target is selected', async () => {
    const workspace = createTempDir('dy-cli-build-bin-config-scope');
    const command = new BuildCommand() as unknown as {
      mergeConfigWithArgs: (
        cwd: string,
        args: Record<string, unknown>,
        config: {
          commands?: { build?: { bin?: { entry?: string; output?: string; banner?: string } } };
        },
      ) => { target: string; bin?: { entry?: string; output?: string; banner?: string } };
    };

    await fs.writeFile(
      path.join(workspace, 'dy.config.ts'),
      ['export default { commands: { build: { bin: { entry: "src/cli.ts" } } } };'].join('\n'),
    );

    const defaultConfig = command.mergeConfigWithArgs(
      workspace,
      {},
      {
        commands: {
          build: {
            bin: {
              entry: 'src/cli.ts',
              output: 'dist/cli.js',
              banner: '#!/usr/bin/env node',
            },
          },
        },
      },
    );
    const binConfig = command.mergeConfigWithArgs(
      workspace,
      { bin: true },
      {
        commands: {
          build: {
            bin: {
              entry: 'src/cli.ts',
              output: 'dist/cli.js',
              banner: '#!/usr/bin/env node',
            },
          },
        },
      },
    );

    expect(defaultConfig.target).toBe('default');
    expect(defaultConfig.bin).toBeUndefined();
    expect(binConfig.target).toBe('bin');
    expect(binConfig.bin).toEqual({
      entry: 'src/cli.ts',
      output: 'dist/cli.js',
      banner: '#!/usr/bin/env node',
    });
  });

  test('should run workspace builds from monorepo root when --workspace is provided', async () => {
    const workspace = createTempDir('dy-cli-build-workspace');
    const packageDir = path.join(workspace, 'packages/button');
    const command = new BuildCommand();

    await fs.ensureDir(packageDir);
    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-workspace',
      private: true,
      workspaces: ['packages/*'],
    });
    await fs.writeJSON(path.join(packageDir, 'package.json'), {
      name: '@dysonic/button',
      version: '0.0.0',
    });
    await fs.writeFile(
      path.join(workspace, 'dy.config.ts'),
      'export default { commands: { build: {} } };',
    );

    await command.parseAsync(['node', 'test', '--cwd', packageDir, '--workspace', '--types']);

    expect(execa).toHaveBeenCalledWith(
      'dy-cli',
      ['build', '--types'],
      expect.objectContaining({
        cwd: packageDir,
      }),
    );
  });

  test('should default to building all child packages when executed from monorepo root', async () => {
    const workspace = createTempDir('dy-cli-build-workspace-default');
    const packageDir = path.join(workspace, 'packages/button');
    const command = new BuildCommand();

    await fs.ensureDir(packageDir);
    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-workspace',
      private: true,
      workspaces: ['packages/*'],
    });
    await fs.writeJSON(path.join(packageDir, 'package.json'), {
      name: '@dysonic/button',
      version: '0.0.0',
    });
    await fs.writeFile(
      path.join(workspace, 'dy.config.ts'),
      "export default { project: { type: 'monorepo' }, commands: { build: {} } };",
    );

    await command.parseAsync(['node', 'test', '--cwd', workspace, '--types']);

    expect(execa).toHaveBeenCalledWith(
      'dy-cli',
      ['build', '--types'],
      expect.objectContaining({
        cwd: packageDir,
      }),
    );
  });
});
