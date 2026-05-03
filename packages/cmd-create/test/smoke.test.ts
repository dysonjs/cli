import fs from 'fs-extra';
import os from 'os';
import path from 'path';

import { CreateCommand } from '../src';

function createTempDir(name: string) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
}

async function createProject(workspace: string, project: 'single' | 'monorepo', destDir: string) {
  const command = new CreateCommand();

  await command.parseAsync([
    'node',
    'smoke',
    '--project',
    project,
    '--dest-dir',
    destDir,
    '--cwd',
    workspace,
  ]);
}

async function expectPathExists(filePath: string) {
  expect(await fs.pathExists(filePath)).toBe(true);
}

describe('@dysonic/dy-cli-cmd-create smoke', () => {
  test('should scaffold self-contained single and monorepo projects', async () => {
    const workspace = createTempDir('dy-cli-create-smoke');

    try {
      await createProject(workspace, 'single', './single-app');
      await createProject(workspace, 'monorepo', './mono-app');

      const createPackageJSON = await fs.readJSON(path.join(__dirname, '../package.json'));
      const singleDir = path.join(workspace, 'single-app');
      const monorepoDir = path.join(workspace, 'mono-app');
      const singlePackageJSON = await fs.readJSON(path.join(singleDir, 'package.json'));
      const monorepoPackageJSON = await fs.readJSON(path.join(monorepoDir, 'package.json'));

      expect(singlePackageJSON.packageManager).toBe(createPackageJSON.packageManager);
      expect(monorepoPackageJSON.packageManager).toBe(createPackageJSON.packageManager);
      expect(singlePackageJSON.devDependencies['@dysonic/dy-cli']).toBe(createPackageJSON.version);
      expect(monorepoPackageJSON.devDependencies['@dysonic/dy-cli']).toBe(
        createPackageJSON.version,
      );
      expect(singlePackageJSON.devDependencies['dy-cli']).toBeUndefined();
      expect(monorepoPackageJSON.devDependencies['dy-cli']).toBeUndefined();

      await expectPathExists(path.join(singleDir, '.editorconfig'));
      await expectPathExists(path.join(singleDir, '.eslintrc.js'));
      await expectPathExists(path.join(singleDir, '.github/workflows/release.yml'));
      await expectPathExists(path.join(singleDir, '.husky/_/husky.sh'));
      await expectPathExists(path.join(singleDir, '.npmrc'));
      await expectPathExists(path.join(singleDir, '.prettierrc'));
      await expectPathExists(path.join(monorepoDir, '.github/workflows/release.yml'));
      await expectPathExists(path.join(monorepoDir, '.husky/_/husky.sh'));
      await expectPathExists(path.join(monorepoDir, 'packages/mono-app/package.json'));

      expect(await fs.pathExists(path.join(singleDir, '.changeset'))).toBe(false);
      expect(await fs.pathExists(path.join(monorepoDir, '.changeset'))).toBe(false);
      expect(await fs.pathExists(path.join(monorepoDir, 'pnpm-workspace.yaml'))).toBe(false);
    } finally {
      await fs.remove(workspace);
    }
  });
});
