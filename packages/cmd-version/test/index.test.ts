import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import execa from 'execa';

import { VersionCommand } from '../src';

jest.mock('execa', () => jest.fn(() => Promise.resolve({})));

function createTempDir(name: string) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
}

describe('@dysonic/dy-cli-cmd-version', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should require an explicit bump flag for fixed monorepo versioning', async () => {
    const workspace = createTempDir('dy-cli-version-monorepo');
    const packageDir = path.join(workspace, 'packages/button');
    const command = new VersionCommand();

    await fs.ensureDir(packageDir);
    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-workspace',
      private: true,
      workspaces: ['packages/*'],
    });
    await fs.writeFile(
      path.join(workspace, 'dy.config.ts'),
      [
        'export default {',
        '  project: {',
        "    type: 'monorepo',",
        "    versionStrategy: 'fixed',",
        '  },',
        '  commands: {',
        '    version: {},',
        '  },',
        '};',
      ].join('\n'),
    );

    await expect(command.parseAsync(['node', 'test', '--cwd', packageDir])).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
      message: expect.stringContaining('--patch'),
    });
  });

  test('should version a fixed monorepo from the workspace root when --patch is provided', async () => {
    const workspace = createTempDir('dy-cli-version-fixed-sync');
    const packageDir = path.join(workspace, 'packages/button');
    const siblingPackageDir = path.join(workspace, 'packages/card');
    const command = new VersionCommand();

    await fs.ensureDir(packageDir);
    await fs.ensureDir(siblingPackageDir);
    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-workspace',
      private: true,
      workspaces: ['packages/*'],
    });
    await fs.writeJSON(path.join(packageDir, 'package.json'), {
      name: '@demo/button',
      version: '1.0.2',
    });
    await fs.writeJSON(path.join(siblingPackageDir, 'package.json'), {
      name: '@demo/card',
      version: '1.0.2',
    });
    await fs.writeFile(
      path.join(workspace, 'dy.config.ts'),
      [
        'export default {',
        '  project: {',
        "    type: 'monorepo',",
        "    versionStrategy: 'fixed',",
        '  },',
        '  commands: {',
        '    version: {},',
        '  },',
        '};',
      ].join('\n'),
    );

    await command.parseAsync(['node', 'test', '--cwd', packageDir, '--patch']);

    expect(await fs.readJSON(path.join(packageDir, 'package.json'))).toMatchObject({
      version: '1.0.3',
    });
    expect(await fs.readJSON(path.join(siblingPackageDir, 'package.json'))).toMatchObject({
      version: '1.0.3',
    });
    expect(await fs.readFile(path.join(packageDir, 'CHANGELOG.md'), 'utf8')).toContain('## 1.0.3');
    expect(await fs.pathExists(path.join(workspace, '.dy-cli/release/state.json'))).toBe(false);
    expect(execa as unknown as jest.Mock).not.toHaveBeenCalledWith(
      'npx',
      ['changeset', 'version'],
      expect.any(Object),
    );
  });

  test('should enter prerelease mode and persist dy-cli release state when --patch --beta is provided', async () => {
    const workspace = createTempDir('dy-cli-version-pre');
    const packageDir = path.join(workspace, 'packages/button');
    const command = new VersionCommand();

    await fs.ensureDir(packageDir);
    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-workspace',
      private: true,
      workspaces: ['packages/*'],
    });
    await fs.writeJSON(path.join(packageDir, 'package.json'), {
      name: '@demo/button',
      version: '1.0.2',
    });
    await fs.writeFile(
      path.join(workspace, 'dy.config.ts'),
      [
        'export default {',
        '  project: {',
        "    type: 'monorepo',",
        "    versionStrategy: 'fixed',",
        '  },',
        '  commands: {',
        '    version: {},',
        '  },',
        '};',
      ].join('\n'),
    );

    await command.parseAsync(['node', 'test', '--cwd', workspace, '--patch', '--beta']);

    expect(await fs.readJSON(path.join(packageDir, 'package.json'))).toMatchObject({
      version: '1.0.3-beta.0',
    });
    expect(await fs.readJSON(path.join(workspace, '.dy-cli/release/state.json'))).toMatchObject({
      mode: 'pre',
      tag: 'beta',
    });
  });

  test('should iterate the prerelease counter on a subsequent beta bump', async () => {
    const workspace = createTempDir('dy-cli-version-pre-iterate');
    const packageDir = path.join(workspace, 'packages/button');
    const command = new VersionCommand();

    await fs.ensureDir(packageDir);
    await fs.outputJSON(path.join(workspace, '.dy-cli/release/state.json'), {
      schemaVersion: 1,
      mode: 'pre',
      tag: 'beta',
    });
    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-workspace',
      private: true,
      workspaces: ['packages/*'],
    });
    await fs.writeJSON(path.join(packageDir, 'package.json'), {
      name: '@demo/button',
      version: '1.0.3-beta.0',
    });
    await fs.writeFile(
      path.join(workspace, 'dy.config.ts'),
      [
        'export default {',
        '  project: {',
        "    type: 'monorepo',",
        "    versionStrategy: 'fixed',",
        '  },',
        '  commands: {',
        '    version: {},',
        '  },',
        '};',
      ].join('\n'),
    );

    await command.parseAsync(['node', 'test', '--cwd', workspace, '--patch']);

    expect(await fs.readJSON(path.join(packageDir, 'package.json'))).toMatchObject({
      version: '1.0.3-beta.1',
    });
  });

  test('should set the current package version in a single project', async () => {
    const workspace = createTempDir('dy-cli-version-single');
    const command = new VersionCommand();

    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-single',
      version: '0.0.1',
    });
    await fs.writeFile(
      path.join(workspace, 'dy.config.ts'),
      "export default { project: { type: 'single' }, commands: { version: {} } };",
    );

    await command.parseAsync(['node', 'test', '--cwd', workspace, '--set', '1.2.3']);

    expect(await fs.readJSON(path.join(workspace, 'package.json'))).toMatchObject({
      version: '1.2.3',
    });
  });
});
