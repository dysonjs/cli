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

  test('should version a fixed monorepo from the workspace root by default', async () => {
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

    await command.parseAsync(['node', 'test', '--cwd', packageDir]);

    expect(execa).toHaveBeenCalledWith(
      'npx',
      ['changeset', 'version'],
      expect.objectContaining({
        cwd: workspace,
      }),
    );
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
