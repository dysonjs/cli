import fs from 'fs-extra';
import os from 'os';
import path from 'path';

import { CreateCommand } from '../src';

function createTempDir(name: string) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
}

describe('@dysonic/dy-cli-cmd-create', () => {
  test('should maintain filesystem templates for monorepo and single', async () => {
    expect(
      await fs.pathExists(path.join(__dirname, '../src/templates/monorepo/package.json.hbs')),
    ).toBe(true);
    expect(
      await fs.pathExists(path.join(__dirname, '../src/templates/single/package.json.hbs')),
    ).toBe(true);
  });

  test('should create a monorepo project when project and dest dir are provided', async () => {
    const workspace = createTempDir('dy-cli-create');
    const command = new CreateCommand();

    await command.parseAsync([
      'node',
      'test',
      '--project',
      'monorepo',
      '--dest-dir',
      './demo-app',
      '--cwd',
      workspace,
    ]);

    const projectDir = path.join(workspace, 'demo-app');
    const configContent = await fs.readFile(path.join(projectDir, 'dy.config.ts'), 'utf8');
    const packageJSON = await fs.readJSON(path.join(projectDir, 'package.json'));
    const packageInnerJSON = await fs.readJSON(
      path.join(projectDir, 'packages/demo-app/package.json'),
    );

    expect(await fs.pathExists(path.join(projectDir, 'pnpm-workspace.yaml'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, '.changeset/config.json'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, '.github/workflows/release.yml'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'tools/scripts/build.ts'))).toBe(false);
    expect(await fs.pathExists(path.join(projectDir, 'tools/scripts/build-types.ts'))).toBe(false);
    expect(await fs.pathExists(path.join(projectDir, 'tools/scripts/build-umd.ts'))).toBe(false);
    expect(await fs.pathExists(path.join(projectDir, 'tools/scripts/create.ts'))).toBe(false);
    expect(await fs.pathExists(path.join(projectDir, 'tools/scripts/build-cli.ts'))).toBe(false);
    expect(await fs.pathExists(path.join(projectDir, 'tools/scripts/grant.ts'))).toBe(false);
    expect(await fs.pathExists(path.join(projectDir, 'tools/scripts/utils.ts'))).toBe(false);
    expect(await fs.pathExists(path.join(projectDir, 'tools/__template__/package'))).toBe(false);
    expect(await fs.pathExists(path.join(projectDir, 'jest-runner.config.js'))).toBe(false);
    expect(await fs.pathExists(path.join(projectDir, 'jest-tsconfig.json'))).toBe(false);
    expect(await fs.pathExists(path.join(projectDir, 'packages/demo-app/package.json'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'packages/demo-app/test/index.test.ts'))).toBe(
      true,
    );
    expect(packageJSON.name).toBe('demo-app');
    expect(packageJSON.workspaces).toEqual(['packages/*']);
    expect(packageJSON.scripts.add).toBe('dy-cli add');
    expect(packageJSON.scripts.build).toBe('dy-cli build --workspace');
    expect(packageJSON.scripts['build:types']).toBe('dy-cli build --workspace --types');
    expect(packageJSON.scripts['build:umd']).toBe('dy-cli build --workspace --umd');
    expect(packageJSON.scripts.test).toBe('dy-cli test --workspace');
    expect(packageJSON.scripts['test:coverage']).toBe('dy-cli test --workspace --coverage');
    expect(packageJSON.scripts.release).toBe('dy-cli publish --workspace');
    expect(packageJSON.scripts['release:beta']).toBe('dy-cli publish --workspace --beta');
    expect(packageJSON.scripts.version).toBe('dy-cli publish --version');
    expect(packageJSON.scripts['version:beta']).toBe('dy-cli publish --version --beta');
    expect(packageJSON.scripts['version:beta:exit']).toBe('dy-cli publish --version --beta-exit');
    expect(packageJSON.scripts.grant).toBeUndefined();
    expect(packageJSON.scripts.publish).toBeUndefined();
    expect(packageJSON.scripts['publish:dry-run']).toBeUndefined();
    expect(packageJSON.scripts['publish:beta']).toBeUndefined();
    expect(packageJSON.scripts['publish:beta:dry-run']).toBeUndefined();
    expect(packageInnerJSON.name).toBe('@dysonic/demo-app');
    expect(packageInnerJSON.browser).toBe('dist/index.umd.js');
    expect(packageInnerJSON.scripts.build).toBe('dy-cli build');
    expect(packageInnerJSON.scripts['build:types']).toBe('dy-cli build --types');
    expect(packageInnerJSON.scripts['build:umd']).toBe('dy-cli build --umd');
    expect(packageInnerJSON.scripts.test).toBe('dy-cli test');
    expect(packageInnerJSON.scripts['test:coverage']).toBe('dy-cli test --coverage');
    expect(packageInnerJSON.scripts.publish).toBe('dy-cli publish');
    expect(packageInnerJSON.scripts['publish:dry-run']).toBe('dy-cli publish --dry-run');
    expect(packageInnerJSON.scripts['publish:beta']).toBe('dy-cli publish --tag beta');
    expect(packageInnerJSON.scripts['publish:beta:dry-run']).toBe(
      'dy-cli publish --tag beta --dry-run',
    );
    expect(configContent).toContain('commands: {');
    expect(configContent).toContain('create: {');
    expect(configContent).toContain("defaultTemplateType: 'monorepo'");
    expect(configContent).toContain('templates: {');
    expect(configContent).toContain('monorepo: {');
    expect(configContent).toContain('single: {');
    expect(configContent).toContain('add: {');
    expect(configContent).toContain("destDir: 'packages'");
    expect(configContent).toContain('build: {');
    expect(configContent).toContain('test: {');
    expect(configContent).toContain('publish: {');
    expect(configContent).toContain("access: 'public'");
    expect(configContent).toContain("betaTag: 'beta'");
    expect(configContent).toContain('workspaceConcurrency: 8');
    expect(packageJSON.devDependencies.execa).toBeUndefined();
    expect(packageJSON.devDependencies['fs-extra']).toBeUndefined();
    expect(packageJSON.devDependencies.lodash).toBeUndefined();
    expect(packageJSON.devDependencies['ts-node']).toBeUndefined();
    expect(packageJSON.devDependencies['@types/fs-extra']).toBeUndefined();
    expect(packageJSON.devDependencies['@types/lodash']).toBeUndefined();
  });

  test('should create a single package project when project is provided', async () => {
    const workspace = createTempDir('dy-cli-create-single');
    const command = new CreateCommand();

    await command.parseAsync([
      'node',
      'test',
      '--project',
      'single',
      '--dest-dir',
      './demo-app',
      '--cwd',
      workspace,
    ]);

    const projectDir = path.join(workspace, 'demo-app');
    const configContent = await fs.readFile(path.join(projectDir, 'dy.config.ts'), 'utf8');
    const packageJSON = await fs.readJSON(path.join(projectDir, 'package.json'));

    expect(await fs.pathExists(path.join(projectDir, 'src/index.ts'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'test/index.test.ts'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'jest.config.js'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'pnpm-workspace.yaml'))).toBe(false);
    expect(packageJSON.private).toBe(false);
    expect(packageJSON.scripts.test).toBe('dy-cli test');
    expect(packageJSON.scripts['test:coverage']).toBe('dy-cli test --coverage');
    expect(packageJSON.scripts.publish).toBe('dy-cli publish');
    expect(packageJSON.scripts['publish:dry-run']).toBe('dy-cli publish --dry-run');
    expect(packageJSON.scripts['publish:beta']).toBe('dy-cli publish --tag beta');
    expect(packageJSON.scripts['publish:beta:dry-run']).toBe('dy-cli publish --tag beta --dry-run');
    expect(configContent).toContain('commands: {');
    expect(configContent).toContain("defaultTemplateType: 'single'");
    expect(configContent).toContain('test: {');
    expect(configContent).toContain('publish: {');
    expect(configContent).toContain("access: 'public'");
  });

  test('should reject unsupported project types', async () => {
    const workspace = createTempDir('dy-cli-create-invalid-template');
    const command = new CreateCommand();

    await expect(
      command.parseAsync([
        'node',
        'test',
        '--dest-dir',
        './demo-app',
        '--cwd',
        workspace,
        '--project',
        'invalid',
      ]),
    ).rejects.toMatchObject({
      code: 'TEMPLATE_NOT_FOUND',
    });
  });

  test('should reject legacy singlerepo project type', async () => {
    const workspace = createTempDir('dy-cli-create-legacy-template');
    const command = new CreateCommand();

    await expect(
      command.parseAsync([
        'node',
        'test',
        '--dest-dir',
        './demo-app',
        '--cwd',
        workspace,
        '--project',
        'singlerepo',
      ]),
    ).rejects.toMatchObject({
      code: 'TEMPLATE_NOT_FOUND',
    });
  });

  test('should reject when target directory is not empty', async () => {
    const workspace = createTempDir('dy-cli-create-non-empty');
    const command = new CreateCommand();
    const targetDir = path.join(workspace, 'demo-app');

    await fs.ensureDir(targetDir);
    await fs.writeFile(path.join(targetDir, 'keep.txt'), 'hello');

    await expect(
      command.parseAsync([
        'node',
        'test',
        '--project',
        'monorepo',
        '--dest-dir',
        './demo-app',
        '--cwd',
        workspace,
      ]),
    ).rejects.toMatchObject({
      code: 'TARGET_DIR_NOT_EMPTY',
    });
  });
});
