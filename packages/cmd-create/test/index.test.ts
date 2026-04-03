import fs from 'fs-extra';
import os from 'os';
import path from 'path';

import { CreateCommand, CreateProjectTask } from '../src';

function createTempDir(name: string) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
}

async function snapshotProjectTree(
  projectDir: string,
  relativeDir = '.',
  snapshot: Record<string, string> = {},
) {
  const currentDir = path.join(projectDir, relativeDir);
  const entries = (await fs.readdir(currentDir)).sort();

  for (const entry of entries) {
    if (['node_modules', '.git', 'coverage', 'dist'].includes(entry)) {
      continue;
    }

    const relativePath = relativeDir === '.' ? entry : path.posix.join(relativeDir, entry);
    const absolutePath = path.join(projectDir, relativePath);
    const stats = await fs.stat(absolutePath);

    if (stats.isDirectory()) {
      await snapshotProjectTree(projectDir, relativePath, snapshot);
      continue;
    }

    snapshot[relativePath] = (await fs.readFile(absolutePath, 'utf8')).replace(/\r\n/g, '\n');
  }

  return snapshot;
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

  test('should resolve templates from bundle dist layout', async () => {
    const runtimeDir = createTempDir('dy-cli-create-runtime');
    const bundleDir = path.join(runtimeDir, 'dist');
    const templateDir = path.join(bundleDir, 'templates/monorepo');
    const task = new CreateProjectTask({
      templateType: 'monorepo',
    }) as any;

    await fs.outputFile(path.join(templateDir, 'package.json.hbs'), '{}');

    await expect(task.resolveTemplateTypeDir(bundleDir)).resolves.toBe(templateDir);
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
    const eslintConfig = await fs.readFile(path.join(projectDir, '.eslintrc.js'), 'utf8');
    const releaseWorkflow = await fs.readFile(
      path.join(projectDir, '.github/workflows/release.yml'),
      'utf8',
    );
    const packageJSON = await fs.readJSON(path.join(projectDir, 'package.json'));
    const tsconfigContent = await fs.readFile(path.join(projectDir, 'tsconfig.json'), 'utf8');
    const packageInnerJSON = await fs.readJSON(
      path.join(projectDir, 'packages/demo-app/package.json'),
    );
    const packageInnerSource = await fs.readFile(
      path.join(projectDir, 'packages/demo-app/src/index.ts'),
      'utf8',
    );
    const projectSnapshot = await snapshotProjectTree(projectDir);

    expect(await fs.pathExists(path.join(projectDir, 'pnpm-workspace.yaml'))).toBe(false);
    expect(await fs.pathExists(path.join(projectDir, '.changeset'))).toBe(false);
    expect(await fs.pathExists(path.join(projectDir, '.github/workflows/release.yml'))).toBe(true);
    expect(releaseWorkflow).toContain('workflow_dispatch:');
    expect(releaseWorkflow).not.toContain('changesets/action');
    expect(releaseWorkflow).not.toContain('id: changesets');
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
    expect(packageInnerSource).toContain('export {}');
    expect(packageJSON.name).toBe('demo-app');
    expect(packageJSON.workspaces).toEqual(['packages/*']);
    expect(packageJSON.scripts.add).toBe('dy-cli add');
    expect(packageJSON.scripts.build).toBe('dy-cli build');
    expect(packageJSON.scripts['build:types']).toBe('dy-cli build --types');
    expect(packageJSON.scripts['build:umd']).toBe('dy-cli build --umd');
    expect(packageJSON.scripts.test).toBe('dy-cli test');
    expect(packageJSON.scripts['test:coverage']).toBe('dy-cli test --coverage');
    expect(packageJSON.scripts.release).toBe('dy-cli publish');
    expect(packageJSON.scripts['release:beta']).toBe('dy-cli publish --beta');
    expect(packageJSON.scripts.version).toBe('dy-cli version');
    expect(packageJSON.scripts['version:beta']).toBe('dy-cli version --beta');
    expect(packageJSON.scripts['version:beta:exit']).toBe('dy-cli version --beta-exit');
    expect(packageJSON.scripts.grant).toBeUndefined();
    expect(packageJSON.scripts.publish).toBeUndefined();
    expect(packageJSON.scripts['publish:dry-run']).toBeUndefined();
    expect(packageJSON.scripts['publish:beta']).toBeUndefined();
    expect(packageJSON.scripts['publish:beta:dry-run']).toBeUndefined();
    expect(packageInnerJSON.name).toBe('@dysonic/demo-app');
    expect(packageInnerJSON.license).toBe('MIT');
    expect(packageInnerJSON.browser).toBe('dist/index.umd.js');
    expect(packageInnerJSON.scripts.build).toBeUndefined();
    expect(packageInnerJSON.scripts['build:types']).toBeUndefined();
    expect(packageInnerJSON.scripts['build:umd']).toBeUndefined();
    expect(packageInnerJSON.scripts.test).toBeUndefined();
    expect(packageInnerJSON.scripts['test:coverage']).toBeUndefined();
    expect(packageInnerJSON.scripts.publish).toBeUndefined();
    expect(packageInnerJSON.scripts['publish:dry-run']).toBeUndefined();
    expect(packageInnerJSON.scripts['publish:beta']).toBeUndefined();
    expect(packageInnerJSON.scripts['publish:beta:dry-run']).toBeUndefined();
    expect(packageInnerJSON.scripts.clean).toBe(
      'rimraf dist && rimraf coverage && rimraf node_modules',
    );
    expect(packageInnerJSON.scripts.prebuild).toBe('rimraf dist');
    expect(configContent).toContain('project: {');
    expect(configContent).toContain("type: 'monorepo'");
    expect(configContent).toContain("packageDir: 'packages'");
    expect(configContent).toContain("versionStrategy: 'fixed'");
    expect(configContent).toContain('commands: {');
    expect(configContent).toContain('create: {');
    expect(configContent).toContain("defaultTemplateType: 'monorepo'");
    expect(configContent).toContain('templates: {');
    expect(configContent).toContain('monorepo: {');
    expect(configContent).toContain('single: {');
    expect(configContent).toContain('add: {');
    expect(configContent).toContain("destDir: 'packages'");
    expect(configContent).toContain('install: {');
    expect(configContent).toContain("npmClient: 'pnpm'");
    expect(configContent).toContain('build: {');
    expect(configContent).toContain('test: {');
    expect(configContent).toContain('version: {');
    expect(configContent).toContain('publish: {');
    expect(configContent).toContain("access: 'public'");
    expect(configContent).toContain("betaTag: 'beta'");
    expect(configContent).toContain('workspaceConcurrency: 8');
    expect(packageJSON.devDependencies['@changesets/cli']).toBeUndefined();
    expect(packageJSON.devDependencies['@dysonic/dy-cli']).toBeUndefined();
    expect(packageJSON.devDependencies['@dysonic/dy-cli-core']).toBeUndefined();
    expect(packageJSON.devDependencies.execa).toBeUndefined();
    expect(packageJSON.devDependencies['fs-extra']).toBeUndefined();
    expect(packageJSON.devDependencies.lodash).toBeUndefined();
    expect(packageJSON.devDependencies['ts-node']).toBeUndefined();
    expect(packageJSON.devDependencies['@types/fs-extra']).toBeUndefined();
    expect(packageJSON.devDependencies['@types/lodash']).toBeUndefined();
    expect(packageJSON.devDependencies['@rollup/plugin-commonjs']).toBeUndefined();
    expect(packageJSON.devDependencies['@rollup/plugin-inject']).toBeUndefined();
    expect(packageJSON.devDependencies['@rollup/plugin-json']).toBeUndefined();
    expect(packageJSON.devDependencies['@rollup/plugin-node-resolve']).toBeUndefined();
    expect(packageJSON.devDependencies['@rollup/plugin-replace']).toBeUndefined();
    expect(packageJSON.devDependencies['@types/glob']).toBeUndefined();
    expect(packageJSON.devDependencies['@types/postcss-import']).toBeUndefined();
    expect(packageJSON.devDependencies['@types/react']).toBeUndefined();
    expect(packageJSON.devDependencies['@types/react-dom']).toBeUndefined();
    expect(packageJSON.devDependencies['@types/resize-observer-browser']).toBeUndefined();
    expect(packageJSON.devDependencies['@types/rollup-plugin-progress']).toBeUndefined();
    expect(packageJSON.devDependencies['@types/svgo']).toBeUndefined();
    expect(packageJSON.devDependencies.autoprefixer).toBeUndefined();
    expect(packageJSON.devDependencies.chalk).toBeUndefined();
    expect(packageJSON.devDependencies['cpy-cli']).toBeUndefined();
    expect(packageJSON.devDependencies['eslint-plugin-react']).toBeUndefined();
    expect(packageJSON.devDependencies['http-server']).toBeUndefined();
    expect(packageJSON.devDependencies.less).toBeUndefined();
    expect(packageJSON.devDependencies['less-plugin-npm-import']).toBeUndefined();
    expect(packageJSON.devDependencies['postcss-import']).toBeUndefined();
    expect(packageJSON.devDependencies['ts-import-plugin']).toBeUndefined();
    expect(packageJSON.devDependencies.tslib).toBeUndefined();
    expect(packageJSON.resolutions).toBeUndefined();
    expect(eslintConfig).not.toContain('plugin:react/recommended');
    expect(eslintConfig).not.toContain('react:');
    expect(eslintConfig).not.toContain('react/display-name');
    expect(tsconfigContent).not.toContain('resize-observer-browser');
    expect(projectSnapshot).toMatchSnapshot('monorepo scaffold');
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
    const projectSnapshot = await snapshotProjectTree(projectDir);

    expect(await fs.pathExists(path.join(projectDir, 'src/index.ts'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'test/index.test.ts'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'jest.config.js'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'pnpm-workspace.yaml'))).toBe(false);
    expect(await fs.pathExists(path.join(projectDir, '.changeset'))).toBe(false);
    expect(packageJSON.private).toBe(false);
    expect(packageJSON.license).toBe('MIT');
    expect(packageJSON.scripts.test).toBe('dy-cli test');
    expect(packageJSON.scripts['test:coverage']).toBe('dy-cli test --coverage');
    expect(packageJSON.scripts.release).toBe('dy-cli publish');
    expect(packageJSON.scripts['release:dry-run']).toBe('dy-cli publish --dry-run');
    expect(packageJSON.scripts['release:beta']).toBe('dy-cli publish --tag beta');
    expect(packageJSON.scripts['release:beta:dry-run']).toBe('dy-cli publish --tag beta --dry-run');
    expect(packageJSON.scripts.publish).toBeUndefined();
    expect(packageJSON.scripts['publish:dry-run']).toBeUndefined();
    expect(packageJSON.scripts['publish:beta']).toBeUndefined();
    expect(packageJSON.scripts['publish:beta:dry-run']).toBeUndefined();
    expect(packageJSON.devDependencies['@changesets/cli']).toBeUndefined();
    expect(packageJSON.devDependencies.typescript).toBe('~5.8.3');
    expect(configContent).toContain('project: {');
    expect(configContent).toContain("type: 'single'");
    expect(configContent).toContain('commands: {');
    expect(configContent).toContain("defaultTemplateType: 'single'");
    expect(configContent).toContain('test: {');
    expect(configContent).toContain('version: {');
    expect(configContent).toContain('publish: {');
    expect(configContent).toContain("access: 'public'");
    expect(configContent).toContain("betaTag: 'beta'");
    expect(packageJSON.devDependencies['@dysonic/dy-cli']).toBeUndefined();
    expect(packageJSON.devDependencies['@dysonic/dy-cli-core']).toBeUndefined();
    expect(projectSnapshot).toMatchSnapshot('single scaffold');
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
