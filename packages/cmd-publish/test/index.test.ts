import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import execa from 'execa';

import { PublishCommand } from '../src';

jest.mock('execa', () => jest.fn(() => Promise.resolve({})));

function createTempDir(name: string) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
}

describe('@dysonic/dy-cli-cmd-publish', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should publish the current package with nearest monorepo config defaults', async () => {
    const workspace = createTempDir('dy-cli-publish');
    const packageDir = path.join(workspace, 'packages/button');
    const command = new PublishCommand();

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
        '  commands: {',
        '    publish: {',
        "      tag: 'beta',",
        "      access: 'public',",
        "      registry: 'https://registry.example.com',",
        '    },',
        '  },',
        '};',
      ].join('\n'),
    );
    await fs.writeJSON(path.join(packageDir, 'package.json'), {
      name: '@dysonic/button',
      version: '0.0.1',
      private: false,
    });

    await command.parseAsync(['node', 'test', '--cwd', packageDir, '--dry-run']);

    expect(execa as unknown as jest.Mock).toHaveBeenCalledWith(
      'npm',
      [
        'publish',
        '--dry-run',
        '--tag',
        'beta',
        '--access',
        'public',
        '--registry',
        'https://registry.example.com',
      ],
      expect.objectContaining({
        cwd: packageDir,
      }),
    );
  });

  test('should prefer cli publish options over dy.config defaults', async () => {
    const workspace = createTempDir('dy-cli-publish-cli-overrides');
    const command = new PublishCommand();

    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: '@dysonic/demo-app',
      version: '0.0.1',
      private: false,
    });
    await fs.writeFile(
      path.join(workspace, 'dy.config.ts'),
      [
        'export default {',
        '  commands: {',
        '    publish: {',
        "      tag: 'latest',",
        "      access: 'restricted',",
        '    },',
        '  },',
        '};',
      ].join('\n'),
    );

    await command.parseAsync([
      'node',
      'test',
      '--cwd',
      workspace,
      '--tag',
      'next',
      '--access',
      'public',
      '--otp',
      '123456',
    ]);

    expect(execa as unknown as jest.Mock).toHaveBeenCalledWith(
      'npm',
      ['publish', '--tag', 'next', '--access', 'public', '--otp', '123456'],
      expect.objectContaining({
        cwd: workspace,
      }),
    );
  });

  test('should reject private packages', async () => {
    const workspace = createTempDir('dy-cli-publish-private');
    const command = new PublishCommand();

    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: '@dysonic/demo-app',
      version: '0.0.1',
      private: true,
    });
    await fs.writeFile(path.join(workspace, 'dy.config.ts'), 'export default { commands: {} };');

    await expect(command.parseAsync(['node', 'test', '--cwd', workspace])).rejects.toMatchObject({
      code: 'PACKAGE_PRIVATE',
    });
  });

  test('should reject when dy.config.ts is missing', async () => {
    const workspace = createTempDir('dy-cli-publish-missing-config');
    const command = new PublishCommand();

    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: '@dysonic/demo-app',
      version: '0.0.1',
      private: false,
    });

    await expect(command.parseAsync(['node', 'test', '--cwd', workspace])).rejects.toMatchObject({
      code: 'CONFIG_NOT_FOUND',
    });
  });

  test('should run workspace build, workspace test, and changeset publish when --workspace is provided', async () => {
    const workspace = createTempDir('dy-cli-publish-workspace');
    const packageDir = path.join(workspace, 'packages/button');
    const command = new PublishCommand();

    await fs.ensureDir(packageDir);
    await fs.writeFile(
      path.join(workspace, 'dy.config.ts'),
      [
        'export default {',
        '  commands: {',
        '    publish: {',
        "      betaTag: 'next',",
        '      workspaceConcurrency: 4,',
        '    },',
        '  },',
        '};',
      ].join('\n'),
    );

    await command.parseAsync(['node', 'test', '--cwd', packageDir, '--workspace']);

    expect(execa as unknown as jest.Mock).toHaveBeenNthCalledWith(
      1,
      'pnpm',
      ['-r', '--stream', '--workspace-concurrency', '4', 'run', 'build'],
      expect.objectContaining({ cwd: workspace }),
    );
    expect(execa as unknown as jest.Mock).toHaveBeenNthCalledWith(
      2,
      'pnpm',
      ['-r', '--stream', '--workspace-concurrency', '4', 'run', 'test'],
      expect.objectContaining({
        cwd: workspace,
        env: expect.objectContaining({ NODE_ENV: 'test' }),
      }),
    );
    expect(execa as unknown as jest.Mock).toHaveBeenNthCalledWith(
      3,
      'pnpm',
      ['changeset', 'publish'],
      expect.objectContaining({ cwd: workspace }),
    );
  });

  test('should publish workspace releases with beta tag when --workspace --beta is provided', async () => {
    const workspace = createTempDir('dy-cli-publish-workspace-beta');
    const command = new PublishCommand();

    await fs.writeFile(
      path.join(workspace, 'dy.config.ts'),
      [
        'export default {',
        '  commands: {',
        '    publish: {',
        "      betaTag: 'next',",
        '      workspaceConcurrency: 2,',
        '    },',
        '  },',
        '};',
      ].join('\n'),
    );

    await command.parseAsync(['node', 'test', '--cwd', workspace, '--workspace', '--beta']);

    expect(execa as unknown as jest.Mock).toHaveBeenNthCalledWith(
      1,
      'pnpm',
      ['-r', '--stream', '--workspace-concurrency', '2', 'run', 'build'],
      expect.objectContaining({ cwd: workspace }),
    );
    expect(execa as unknown as jest.Mock).toHaveBeenNthCalledWith(
      2,
      'pnpm',
      ['-r', '--stream', '--workspace-concurrency', '2', 'run', 'test'],
      expect.any(Object),
    );
    expect(execa as unknown as jest.Mock).toHaveBeenNthCalledWith(
      3,
      'pnpm',
      ['changeset', 'publish', '--tag', 'next'],
      expect.objectContaining({ cwd: workspace }),
    );
  });

  test('should version the workspace when --version is provided', async () => {
    const workspace = createTempDir('dy-cli-publish-version');
    const packageDir = path.join(workspace, 'packages/button');
    const command = new PublishCommand();

    await fs.ensureDir(packageDir);
    await fs.writeFile(path.join(workspace, 'dy.config.ts'), 'export default { commands: {} };');

    await command.parseAsync(['node', 'test', '--cwd', packageDir, '--version']);

    expect(execa as unknown as jest.Mock).toHaveBeenCalledWith(
      'pnpm',
      ['changeset', 'version'],
      expect.objectContaining({ cwd: workspace }),
    );
  });

  test('should enter beta pre mode before versioning when --version --beta is provided', async () => {
    const workspace = createTempDir('dy-cli-publish-version-beta');
    const command = new PublishCommand();

    await fs.writeFile(
      path.join(workspace, 'dy.config.ts'),
      [
        'export default {',
        '  commands: {',
        '    publish: {',
        "      betaTag: 'next',",
        '    },',
        '  },',
        '};',
      ].join('\n'),
    );

    await command.parseAsync(['node', 'test', '--cwd', workspace, '--version', '--beta']);

    expect(execa as unknown as jest.Mock).toHaveBeenNthCalledWith(
      1,
      'pnpm',
      ['changeset', 'pre', 'enter', 'next'],
      expect.objectContaining({ cwd: workspace }),
    );
    expect(execa as unknown as jest.Mock).toHaveBeenNthCalledWith(
      2,
      'pnpm',
      ['changeset', 'version'],
      expect.objectContaining({ cwd: workspace }),
    );
  });

  test('should exit beta pre mode when --version --beta-exit is provided', async () => {
    const workspace = createTempDir('dy-cli-publish-version-beta-exit');
    const command = new PublishCommand();

    await fs.writeFile(path.join(workspace, 'dy.config.ts'), 'export default { commands: {} };');

    await command.parseAsync(['node', 'test', '--cwd', workspace, '--version', '--beta-exit']);

    expect(execa as unknown as jest.Mock).toHaveBeenCalledWith(
      'pnpm',
      ['changeset', 'pre', 'exit'],
      expect.objectContaining({ cwd: workspace }),
    );
    expect(execa as unknown as jest.Mock).toHaveBeenCalledTimes(1);
  });

  test('should reject conflicting publish modes', async () => {
    const workspace = createTempDir('dy-cli-publish-conflict');
    const command = new PublishCommand();

    await fs.writeFile(path.join(workspace, 'dy.config.ts'), 'export default { commands: {} };');

    await expect(
      command.parseAsync(['node', 'test', '--cwd', workspace, '--workspace', '--version']),
    ).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  test('should reject beta-exit without version mode', async () => {
    const workspace = createTempDir('dy-cli-publish-beta-exit-invalid');
    const command = new PublishCommand();

    await fs.writeFile(path.join(workspace, 'dy.config.ts'), 'export default { commands: {} };');

    await expect(
      command.parseAsync(['node', 'test', '--cwd', workspace, '--beta-exit']),
    ).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });
});
