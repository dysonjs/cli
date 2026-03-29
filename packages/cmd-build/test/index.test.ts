/** @jest-environment node */

import fs from 'fs-extra';
import os from 'os';
import path from 'path';

import { BuildCommand } from '../src';

function createTempDir(name: string) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
}

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
      command.parseAsync(['node', 'test', '--cwd', workspace, '--types', '--umd']),
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
});
