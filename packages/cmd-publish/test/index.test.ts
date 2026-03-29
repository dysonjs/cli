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
});
