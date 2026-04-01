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
    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-workspace',
      private: true,
      workspaces: ['packages/*'],
    });
    await fs.writeJSON(path.join(packageDir, 'package.json'), {
      name: '@dysonic/button',
      version: '0.0.1',
      private: false,
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
      'dy-cli',
      ['build'],
      expect.objectContaining({ cwd: packageDir }),
    );
    expect(execa as unknown as jest.Mock).toHaveBeenNthCalledWith(
      2,
      'dy-cli',
      ['test'],
      expect.objectContaining({
        cwd: packageDir,
        env: expect.objectContaining({ NODE_ENV: 'test' }),
      }),
    );
    expect(execa as unknown as jest.Mock).toHaveBeenNthCalledWith(
      3,
      'npx',
      ['changeset', 'publish'],
      expect.objectContaining({ cwd: workspace }),
    );
  });

  test('should publish workspace releases with beta tag when --workspace --beta is provided', async () => {
    const workspace = createTempDir('dy-cli-publish-workspace-beta');
    const packageDir = path.join(workspace, 'packages/button');
    const command = new PublishCommand();

    await fs.ensureDir(packageDir);
    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-workspace',
      private: true,
      workspaces: ['packages/*'],
    });
    await fs.writeJSON(path.join(packageDir, 'package.json'), {
      name: '@dysonic/button',
      version: '0.0.1',
      private: false,
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
      'dy-cli',
      ['build'],
      expect.objectContaining({ cwd: packageDir }),
    );
    expect(execa as unknown as jest.Mock).toHaveBeenNthCalledWith(
      2,
      'dy-cli',
      ['test'],
      expect.objectContaining({ cwd: packageDir }),
    );
    expect(execa as unknown as jest.Mock).toHaveBeenNthCalledWith(
      3,
      'npx',
      ['changeset', 'publish', '--tag', 'next'],
      expect.objectContaining({ cwd: workspace }),
    );
  });

  test('should reject prerelease workspace publishing when a target package has no stable release yet', async () => {
    const workspace = createTempDir('dy-cli-publish-workspace-pre-first-release');
    const packageDir = path.join(workspace, 'packages/install');
    const command = new PublishCommand();
    const execaMock = execa as unknown as jest.Mock;

    execaMock.mockImplementation((commandName: string, args?: string[]) => {
      if (commandName === 'npm' && args?.[0] === 'view') {
        return Promise.resolve({
          stdout: JSON.stringify(['1.0.0-beta.0']),
        });
      }

      return Promise.resolve({});
    });

    await fs.ensureDir(path.join(workspace, '.changeset'));
    await fs.ensureDir(packageDir);
    await fs.writeFile(
      path.join(workspace, '.changeset/pre.json'),
      JSON.stringify({
        mode: 'pre',
        tag: 'beta',
      }),
    );
    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-workspace',
      private: true,
      workspaces: ['packages/*'],
    });
    await fs.writeJSON(path.join(packageDir, 'package.json'), {
      name: '@dysonic/dy-cli-cmd-install',
      version: '1.0.0-beta.0',
      private: false,
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
        '    publish: {},',
        '  },',
        '};',
      ].join('\n'),
    );

    await expect(command.parseAsync(['node', 'test', '--cwd', workspace])).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
      message: expect.stringContaining('@dysonic/dy-cli-cmd-install'),
    });

    expect(execaMock).toHaveBeenCalledWith(
      'npm',
      ['view', '@dysonic/dy-cli-cmd-install', 'versions', '--json'],
      expect.any(Object),
    );
    expect(execaMock).not.toHaveBeenCalledWith('npx', ['changeset', 'publish'], expect.any(Object));
  });

  test('should allow prerelease workspace publishing when target packages already have stable releases', async () => {
    const workspace = createTempDir('dy-cli-publish-workspace-pre-stable');
    const packageDir = path.join(workspace, 'packages/button');
    const command = new PublishCommand();
    const execaMock = execa as unknown as jest.Mock;

    execaMock.mockImplementation((commandName: string, args?: string[]) => {
      if (commandName === 'npm' && args?.[0] === 'view') {
        return Promise.resolve({
          stdout: JSON.stringify(['0.0.5', '1.0.0-beta.0']),
        });
      }

      return Promise.resolve({});
    });

    await fs.ensureDir(path.join(workspace, '.changeset'));
    await fs.ensureDir(packageDir);
    await fs.writeFile(
      path.join(workspace, '.changeset/pre.json'),
      JSON.stringify({
        mode: 'pre',
        tag: 'beta',
      }),
    );
    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-workspace',
      private: true,
      workspaces: ['packages/*'],
    });
    await fs.writeJSON(path.join(packageDir, 'package.json'), {
      name: '@dysonic/button',
      version: '1.0.0-beta.0',
      private: false,
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
        '    publish: {},',
        '  },',
        '};',
      ].join('\n'),
    );

    await command.parseAsync(['node', 'test', '--cwd', workspace]);

    expect(execaMock).toHaveBeenCalledWith(
      'npm',
      ['view', '@dysonic/button', 'versions', '--json'],
      expect.any(Object),
    );
    expect(execaMock).toHaveBeenCalledWith(
      'npx',
      ['changeset', 'publish'],
      expect.objectContaining({ cwd: workspace }),
    );
  });

  test('should default to publishing the whole monorepo from the workspace root', async () => {
    const workspace = createTempDir('dy-cli-publish-workspace-default');
    const packageDir = path.join(workspace, 'packages/button');
    const command = new PublishCommand();

    await fs.ensureDir(packageDir);
    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-workspace',
      private: true,
      workspaces: ['packages/*'],
    });
    await fs.writeJSON(path.join(packageDir, 'package.json'), {
      name: '@dysonic/button',
      version: '0.0.1',
      private: false,
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
        '    publish: {},',
        '  },',
        '};',
      ].join('\n'),
    );

    await command.parseAsync(['node', 'test', '--cwd', workspace]);

    expect(execa as unknown as jest.Mock).toHaveBeenNthCalledWith(
      1,
      'dy-cli',
      ['build'],
      expect.objectContaining({ cwd: packageDir }),
    );
    expect(execa as unknown as jest.Mock).toHaveBeenNthCalledWith(
      2,
      'dy-cli',
      ['test'],
      expect.objectContaining({ cwd: packageDir }),
    );
    expect(execa as unknown as jest.Mock).toHaveBeenNthCalledWith(
      3,
      'npx',
      ['changeset', 'publish'],
      expect.objectContaining({ cwd: workspace }),
    );
  });

  test('should dry-run workspace publishes without invoking changeset publish', async () => {
    const workspace = createTempDir('dy-cli-publish-workspace-dry-run');
    const packageDir = path.join(workspace, 'packages/button');
    const command = new PublishCommand();

    await fs.ensureDir(packageDir);
    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-workspace',
      private: true,
      workspaces: ['packages/*'],
    });
    await fs.writeJSON(path.join(packageDir, 'package.json'), {
      name: '@dysonic/button',
      version: '0.0.1',
      private: false,
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
        '    publish: {',
        "      access: 'public',",
        '    },',
        '  },',
        '};',
      ].join('\n'),
    );

    await command.parseAsync(['node', 'test', '--cwd', workspace, '--dry-run']);

    expect(execa as unknown as jest.Mock).toHaveBeenNthCalledWith(
      1,
      'dy-cli',
      ['build'],
      expect.objectContaining({ cwd: packageDir }),
    );
    expect(execa as unknown as jest.Mock).toHaveBeenNthCalledWith(
      2,
      'dy-cli',
      ['test'],
      expect.objectContaining({ cwd: packageDir }),
    );
    expect(execa as unknown as jest.Mock).toHaveBeenNthCalledWith(
      3,
      'npm',
      ['publish', '--dry-run', '--access', 'public'],
      expect.objectContaining({ cwd: packageDir }),
    );
    expect(execa as unknown as jest.Mock).not.toHaveBeenCalledWith(
      'npx',
      ['changeset', 'publish'],
      expect.any(Object),
    );
  });

  test('should reject legacy version flags on publish', async () => {
    const workspace = createTempDir('dy-cli-publish-legacy-version');
    const command = new PublishCommand();
    command.exitOverride();

    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-single',
      version: '0.0.1',
      private: false,
    });
    await fs.writeFile(
      path.join(workspace, 'dy.config.ts'),
      "export default { project: { type: 'single' }, commands: { publish: {} } };",
    );

    await expect(
      command.parseAsync(['node', 'test', '--cwd', workspace, '--version']),
    ).rejects.toBeTruthy();
  });

  test.each(['prepublishOnly', 'publish', 'postpublish'])(
    'should reject publish when invoked from npm %s lifecycle',
    async (lifecycleEvent) => {
      const workspace = createTempDir(`dy-cli-publish-recursive-lifecycle-${lifecycleEvent}`);
      const command = new PublishCommand();
      const previousLifecycleEvent = process.env.npm_lifecycle_event;

      await fs.writeJSON(path.join(workspace, 'package.json'), {
        name: '@dysonic/demo-app',
        version: '0.0.1',
        private: false,
        scripts: {
          [lifecycleEvent]: 'dy-cli publish',
        },
      });
      await fs.writeFile(
        path.join(workspace, 'dy.config.ts'),
        "export default { project: { type: 'single' }, commands: { publish: {} } };",
      );

      process.env.npm_lifecycle_event = lifecycleEvent;

      try {
        await expect(
          command.parseAsync(['node', 'test', '--cwd', workspace]),
        ).rejects.toMatchObject({
          code: 'INVALID_ARGUMENT',
          message: expect.stringContaining('Rename the script'),
        });
      } finally {
        if (previousLifecycleEvent === undefined) {
          delete process.env.npm_lifecycle_event;
        } else {
          process.env.npm_lifecycle_event = previousLifecycleEvent;
        }
      }
    },
  );
});
