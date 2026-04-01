import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import execa from 'execa';

import { InstallCommand } from '../src';

jest.mock('execa', () => jest.fn(() => Promise.resolve({})));

function createTempDir(name: string) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
}

describe('@dysonic/dy-cli-cmd-install', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should install dependencies from monorepo root with detected package manager', async () => {
    const workspace = createTempDir('dy-cli-install-monorepo');
    const packageDir = path.join(workspace, 'packages/button');
    const command = new InstallCommand();

    await fs.ensureDir(packageDir);
    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-workspace',
      private: true,
      workspaces: ['packages/*'],
    });
    await fs.writeFile(
      path.join(workspace, 'dy.config.ts'),
      "export default { project: { type: 'monorepo' }, commands: {} };",
    );
    await fs.writeFile(path.join(workspace, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0\n');

    await command.parseAsync(['node', 'test', '--cwd', packageDir]);

    expect(execa).toHaveBeenCalledWith(
      'pnpm',
      ['install'],
      expect.objectContaining({
        cwd: workspace,
      }),
    );
  });

  test('should install dependencies in a single project with npm by default', async () => {
    const workspace = createTempDir('dy-cli-install-single');
    const command = new InstallCommand();

    await fs.writeJSON(path.join(workspace, 'package.json'), {
      name: 'demo-single',
      version: '0.0.0',
    });
    await fs.writeFile(
      path.join(workspace, 'dy.config.ts'),
      "export default { project: { type: 'single' }, commands: {} };",
    );

    await command.parseAsync(['node', 'test', '--cwd', workspace]);

    expect(execa).toHaveBeenCalledWith(
      'npm',
      ['install', '--legacy-peer-deps'],
      expect.objectContaining({
        cwd: workspace,
      }),
    );
  });
});
