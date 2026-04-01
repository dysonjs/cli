/** @jest-environment node */

// eslint-disable-next-line import/no-extraneous-dependencies
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import * as jestRunner from 'jest';
// eslint-disable-next-line import/no-extraneous-dependencies
import execa from 'execa';

import { TestCommand } from '../src';

jest.mock('jest', () => ({
  run: jest.fn(() => Promise.resolve()),
}));

jest.mock('execa', () => jest.fn(() => Promise.resolve()));

function createTempDir(name: string) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
}

describe('@dysonic/dy-cli-cmd-test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should run jest for the current package with nearest config in monorepo', async () => {
    const workspace = createTempDir('dy-cli-test-monorepo');
    const packageDir = path.join(workspace, 'packages/button');
    const command = new TestCommand();

    await fs.ensureDir(path.join(packageDir, 'src'));
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
      'export default { commands: { test: {} } };',
    );
    await fs.writeFile(path.join(workspace, 'jest.config.js'), 'module.exports = {};');

    await command.parseAsync(['node', 'test', '--cwd', packageDir]);

    expect(jestRunner.run).toHaveBeenCalledWith(
      expect.arrayContaining([
        '--rootDir',
        packageDir,
        '--config',
        path.join(workspace, 'jest.config.js'),
      ]),
    );
  });

  test('should support coverage, watch and update snapshot flags', async () => {
    const workspace = createTempDir('dy-cli-test-flags');
    const command = new TestCommand();

    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-single',
      version: '0.0.0',
    });
    await fs.writeFile(
      path.join(workspace, 'dy.config.ts'),
      'export default { commands: { test: {} } };',
    );
    await fs.writeFile(path.join(workspace, 'jest.config.js'), 'module.exports = {};');

    await command.parseAsync([
      'node',
      'test',
      '--cwd',
      workspace,
      '--coverage',
      '--watch',
      '--update-snapshot',
    ]);

    expect(jestRunner.run).toHaveBeenCalledWith(
      expect.arrayContaining(['--coverage', '--watch', '--updateSnapshot']),
    );
  });

  test('should use explicit test config from dy.config.ts when provided', async () => {
    const workspace = createTempDir('dy-cli-test-config');
    const command = new TestCommand();

    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-single',
      version: '0.0.0',
    });
    await fs.ensureDir(path.join(workspace, 'config'));
    await fs.writeFile(path.join(workspace, 'config/jest.custom.js'), 'module.exports = {};');
    await fs.writeFile(
      path.join(workspace, 'dy.config.ts'),
      [
        'export default {',
        '  commands: {',
        '    test: {',
        "      config: './config/jest.custom.js',",
        '    },',
        '  },',
        '};',
      ].join('\n'),
    );

    await command.parseAsync(['node', 'test', '--cwd', workspace]);

    expect(jestRunner.run).toHaveBeenCalledWith(
      expect.arrayContaining(['--config', path.join(workspace, 'config/jest.custom.js')]),
    );
  });

  test('should set NODE_ENV to test before running jest', async () => {
    const workspace = createTempDir('dy-cli-test-node-env');
    const command = new TestCommand();

    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-single',
      version: '0.0.0',
    });
    await fs.writeFile(
      path.join(workspace, 'dy.config.ts'),
      'export default { commands: { test: {} } };',
    );
    await fs.writeFile(path.join(workspace, 'jest.config.js'), 'module.exports = {};');

    process.env.NODE_ENV = 'development';

    await command.parseAsync(['node', 'test', '--cwd', workspace]);

    expect(process.env.NODE_ENV).toBe('test');
  });

  test('should reject when dy.config.ts is missing', async () => {
    const workspace = createTempDir('dy-cli-test-missing-config');
    const command = new TestCommand();

    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-single',
      version: '0.0.0',
    });

    await expect(command.parseAsync(['node', 'test', '--cwd', workspace])).rejects.toMatchObject({
      code: 'CONFIG_NOT_FOUND',
    });
  });

  test('should run workspace tests from monorepo root when --workspace is provided', async () => {
    const workspace = createTempDir('dy-cli-test-workspace');
    const packageDir = path.join(workspace, 'packages/button');
    const command = new TestCommand();

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
      'export default { commands: { test: {} } };',
    );
    await fs.writeFile(path.join(workspace, 'jest.config.js'), 'module.exports = {};');

    await command.parseAsync(['node', 'test', '--cwd', packageDir, '--workspace', '--coverage']);

    expect(execa).toHaveBeenCalledWith(
      'dy-cli',
      ['test', '--coverage'],
      expect.objectContaining({
        cwd: packageDir,
      }),
    );
    expect(jestRunner.run).not.toHaveBeenCalled();
  });

  test('should default to running child package tests from monorepo root', async () => {
    const workspace = createTempDir('dy-cli-test-workspace-default');
    const packageDir = path.join(workspace, 'packages/button');
    const command = new TestCommand();

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
      "export default { project: { type: 'monorepo' }, commands: { test: {} } };",
    );
    await fs.writeFile(path.join(workspace, 'jest.config.js'), 'module.exports = {};');

    await command.parseAsync(['node', 'test', '--cwd', workspace, '--coverage']);

    expect(execa).toHaveBeenCalledWith(
      'dy-cli',
      ['test', '--coverage'],
      expect.objectContaining({
        cwd: packageDir,
      }),
    );
    expect(jestRunner.run).not.toHaveBeenCalled();
  });
});
