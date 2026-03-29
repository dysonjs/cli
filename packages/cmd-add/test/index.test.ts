import fs from 'fs-extra';
import * as inquirer from 'inquirer';
import os from 'os';
import path from 'path';
import execa from 'execa';

import { AddCommand } from '../src';

jest.mock('inquirer', () => ({
  prompt: jest.fn(),
}));

jest.mock('execa', () => jest.fn(() => Promise.resolve({})));

function createTempDir(name: string) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
}

describe('@dysonic/dy-cli-cmd-add', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create a child package in monorepo projects', async () => {
    const workspace = createTempDir('dy-cli-add');
    const command = new AddCommand();

    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-workspace',
      private: true,
      workspaces: ['packages/*'],
    });
    await fs.writeFile(path.join(workspace, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
    await fs.writeFile(
      path.join(workspace, 'dy.config.ts'),
      [
        'export default {',
        '  commands: {',
        '    add: {',
        "      destDir: 'packages',",
        '    },',
        '  },',
        '};',
      ].join('\n'),
    );

    (inquirer.prompt as unknown as jest.Mock).mockResolvedValue({
      private: false,
      description: '',
      sideEffects: false,
    });

    await command.parseAsync(['node', 'test', 'button', '--cwd', workspace]);

    const packageDir = path.join(workspace, 'packages/button');
    const packageJSON = await fs.readJSON(path.join(packageDir, 'package.json'));

    expect(await fs.pathExists(path.join(packageDir, 'src/index.ts'))).toBe(true);
    expect(await fs.pathExists(path.join(packageDir, 'test/index.test.ts'))).toBe(true);
    expect(await fs.pathExists(path.join(packageDir, 'tsconfig.json'))).toBe(true);
    expect(packageJSON.name).toBe('@dysonic/button');
    expect(packageJSON.browser).toBe('dist/index.umd.js');
    expect(packageJSON.private).toBe(false);
    expect(packageJSON.scripts.build).toBe('dy-cli build');
    expect(packageJSON.scripts['build:types']).toBe('dy-cli build --types');
    expect(packageJSON.scripts['build:umd']).toBe('dy-cli build --umd');
    expect(packageJSON.scripts.test).toBe('dy-cli test');
    expect(packageJSON.scripts['test:coverage']).toBe('dy-cli test --coverage');
    expect(packageJSON.scripts.publish).toBe('dy-cli publish');
    expect(packageJSON.scripts['publish:dry-run']).toBe('dy-cli publish --dry-run');
    expect(packageJSON.scripts['publish:beta']).toBe('dy-cli publish --tag beta');
    expect(packageJSON.scripts['publish:beta:dry-run']).toBe('dy-cli publish --tag beta --dry-run');
    expect(execa as unknown as jest.Mock).toHaveBeenCalledWith(
      'prettier',
      ['--write', packageDir],
      expect.objectContaining({
        cwd: workspace,
      }),
    );
  });

  test('should prompt for missing package metadata', async () => {
    const workspace = createTempDir('dy-cli-add-prompt');
    const command = new AddCommand();

    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-workspace',
      private: true,
      workspaces: ['packages/*'],
    });
    await fs.writeFile(path.join(workspace, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');

    (inquirer.prompt as unknown as jest.Mock).mockResolvedValue({
      packageName: 'card',
      private: true,
      description: 'Card component',
      sideEffects: true,
    });

    await command.parseAsync(['node', 'test', '--cwd', workspace]);

    const packageDir = path.join(workspace, 'packages/card');
    const packageJSON = await fs.readJSON(path.join(packageDir, 'package.json'));

    expect(inquirer.prompt as unknown as jest.Mock).toHaveBeenCalledTimes(1);
    expect(packageJSON.name).toBe('@dysonic/card');
    expect(packageJSON.private).toBe(true);
    expect(packageJSON.description).toBe('Card component');
    expect(packageJSON.sideEffects).toBe(true);
  });

  test('should reject add when workspace root is missing', async () => {
    const workspace = createTempDir('dy-cli-add-missing-workspace');
    const command = new AddCommand();

    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-single',
      private: true,
    });

    await expect(
      command.parseAsync(['node', 'test', 'button', '--cwd', workspace]),
    ).rejects.toMatchObject({
      code: 'CONFIG_NOT_FOUND',
    });
  });

  test('should merge add options from dy.config and normalize scoped package names', async () => {
    const workspace = createTempDir('dy-cli-add-config-merge');
    const command = new AddCommand();

    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-workspace',
      private: true,
      workspaces: ['packages/*'],
    });
    await fs.writeFile(path.join(workspace, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
    await fs.writeFile(
      path.join(workspace, 'dy.config.ts'),
      [
        'export default {',
        '  commands: {',
        '    add: {',
        "      destDir: 'pkgs',",
        "      description: 'From config',",
        '      private: true,',
        '      sideEffects: true,',
        "      packageName: 'ignored-when-cli-passed',",
        '    },',
        '  },',
        '};',
      ].join('\n'),
    );

    (inquirer.prompt as unknown as jest.Mock).mockResolvedValue({
      private: false,
      description: '',
      sideEffects: false,
    });

    await command.parseAsync([
      'node',
      'test',
      '--cwd',
      workspace,
      '--package-name',
      '@acme/widget',
    ]);

    const packageDir = path.join(workspace, 'pkgs/widget');
    expect(await fs.pathExists(packageDir)).toBe(true);
    const packageJSON = await fs.readJSON(path.join(packageDir, 'package.json'));
    expect(packageJSON.name).toBe('@dysonic/widget');
    expect(packageJSON.description).toBe('From config');
    expect(packageJSON.private).toBe(true);
    expect(packageJSON.sideEffects).toBe(true);
  });

  test('should reject when target package directory already exists', async () => {
    const workspace = createTempDir('dy-cli-add-dup');
    const command = new AddCommand();

    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-workspace',
      private: true,
      workspaces: ['packages/*'],
    });
    await fs.writeFile(path.join(workspace, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
    await fs.ensureDir(path.join(workspace, 'packages', 'dup'));

    (inquirer.prompt as unknown as jest.Mock).mockResolvedValue({
      private: false,
      description: '',
      sideEffects: false,
    });

    await expect(
      command.parseAsync(['node', 'test', 'dup', '--cwd', workspace]),
    ).rejects.toMatchObject({
      code: 'TARGET_DIR_NOT_EMPTY',
    });
  });

  test('should reject when package name cannot be resolved', async () => {
    const workspace = createTempDir('dy-cli-add-noname');
    const command = new AddCommand();

    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-workspace',
      private: true,
      workspaces: ['packages/*'],
    });
    await fs.writeFile(path.join(workspace, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');

    (inquirer.prompt as unknown as jest.Mock).mockResolvedValue({});

    await expect(command.parseAsync(['node', 'test', '--cwd', workspace])).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  test('should expose inquirer validators for package name', async () => {
    const workspace = createTempDir('dy-cli-add-validate');
    const command = new AddCommand();

    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-workspace',
      private: true,
      workspaces: ['packages/*'],
    });
    await fs.writeFile(path.join(workspace, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
    await fs.ensureDir(path.join(workspace, 'packages', 'taken'));

    const promptMock = inquirer.prompt as unknown as jest.Mock;
    promptMock.mockImplementation(
      async (questions: { validate?: (i: string) => true | string }[]) => {
        const nameQ = questions.find((q) => 'validate' in q && q.validate);
        expect(nameQ?.validate?.('')).toBe('Package name is required.');
        expect(nameQ?.validate?.('taken')).toBe('Folder is existing!');
        expect(nameQ?.validate?.('fresh')).toBe(true);

        return {
          packageName: 'fresh',
          private: false,
          description: '',
          sideEffects: false,
        };
      },
    );

    await command.parseAsync(['node', 'test', '--cwd', workspace]);

    expect(await fs.pathExists(path.join(workspace, 'packages/fresh'))).toBe(true);
  });
});
