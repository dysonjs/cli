import fs from 'fs-extra';
import os from 'os';
import path from 'path';

import execa from 'execa';

import {
  AbstractCommand,
  AbstractTask,
  CommandOption,
  defineConfig,
  detectPackageManager,
  DyCliError,
  ExternalRunCommandsConfig,
  getExternalConfigDir,
  getExternalConfigFilePath,
  getNearestFilePath,
  loadNearestExternalRunCommandsConfig,
  log,
  resolveProjectName,
  resolveSelfCliInvocation,
  resolveTargetDir,
  runPackageScript,
  runProjectCommand,
} from '../src';

jest.mock('execa', () => jest.fn().mockResolvedValue(undefined));

function createTempDir(name: string) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
}

describe('@dysonic/dy-cli-core', () => {
  test('defineConfig should return the original config', () => {
    const config = {
      commands: {
        create: {
          defaultTemplateType: 'monorepo' as const,
          templates: {
            monorepo: {
              label: 'Monorepo',
              description: 'Create a monorepo project',
            },
            single: {
              label: 'Single repo',
              description: 'Create a single package project',
            },
          },
        },
        build: {
          mode: 'production',
          umd: {
            name: 'DemoApp',
          },
        },
        test: {
          config: './jest.config.js',
          coverage: true,
        },
        publish: { access: 'public' as const, tag: 'latest' },
      },
    };

    expect(defineConfig(config)).toBe(config);
  });

  test('DyCliError should expose code and cause', () => {
    const cause = new Error('boom');
    const error = new DyCliError('CONFIG_NOT_FOUND', 'Config missing', cause);

    expect(error.name).toBe('DyCliError');
    expect(error.code).toBe('CONFIG_NOT_FOUND');
    expect(error.message).toBe('Config missing');
    expect(error.cause).toBe(cause);
  });

  test('AbstractTask should merge default config', async () => {
    class DemoTask extends AbstractTask<
      { cwd: string; mode: string },
      { cwd: string; mode: string }
    > {
      protected getDefaultConfig() {
        return {
          cwd: '/tmp/default',
          mode: 'production',
        };
      }

      public async run() {
        return this.config;
      }
    }

    const task = new DemoTask({ cwd: '/tmp/custom' });

    await expect(task.run()).resolves.toEqual({
      cwd: '/tmp/custom',
      mode: 'production',
    });
  });

  test('AbstractCommand should merge command args with external config', async () => {
    const tmpDir = createTempDir('dy-cli-core-command');

    await fs.writeFile(
      path.join(tmpDir, 'dy.config.ts'),
      [
        'export default {',
        '  commands: {',
        '    build: {',
        "      mode: 'config-mode',",
        '      umd: {',
        "        name: 'DemoApp',",
        '      },',
        '    },',
        '  },',
        '};',
      ].join('\n'),
    );

    class DemoBuildCommand extends AbstractCommand<
      { cwd: string; target: 'default'; mode?: string; name?: string },
      { cwd?: string; mode?: string }
    > {
      public mergedConfig: { cwd: string; target: 'default'; mode?: string; name?: string } | null =
        null;

      constructor() {
        super('build');
      }

      public getOptions(): CommandOption[] {
        return [['--mode <mode>', 'Specify the build mode']] satisfies CommandOption[];
      }

      protected mergeConfigWithArgs(
        cwd: string,
        args: { cwd?: string; mode?: string },
        config: {
          commands?: {
            build?: {
              mode?: string;
              umd?: { name?: string };
            };
          };
        },
      ) {
        return {
          cwd,
          target: 'default' as const,
          mode: args.mode ?? config.commands?.build?.mode,
          name: config.commands?.build?.umd?.name,
        };
      }

      public async execute() {
        this.mergedConfig = this.config;
      }
    }

    const command = new DemoBuildCommand();

    await command.parseAsync(['node', 'test', '--cwd', tmpDir, '--mode', 'cli-mode']);

    expect(command.mergedConfig).toEqual({
      cwd: tmpDir,
      target: 'default',
      mode: 'cli-mode',
      name: 'DemoApp',
    });
  });

  test('AbstractCommand should register positional arguments and merge them into args', async () => {
    const tmpDir = createTempDir('dy-cli-core-args');

    await fs.writeFile(
      path.join(tmpDir, 'dy.config.ts'),
      ['export default { commands: { add: { destDir: "packages" } } };'].join('\n'),
    );

    class DemoAddCommand extends AbstractCommand<
      { cwd: string; target: 'default'; projectName?: string; destDir?: string },
      { cwd?: string; projectName?: string }
    > {
      public mergedConfig: {
        cwd: string;
        target: 'default';
        projectName?: string;
        destDir?: string;
      } | null = null;

      constructor() {
        super('add');
      }

      protected getArguments(): [string, string?][] {
        return [['<projectName>', 'Package name']];
      }

      public getOptions(): CommandOption[] {
        return [];
      }

      protected mergeConfigWithArgs(
        cwd: string,
        args: { cwd?: string; projectName?: string },
        config: Partial<ExternalRunCommandsConfig>,
      ) {
        return {
          cwd,
          target: 'default' as const,
          projectName: args.projectName,
          destDir: config.commands?.add?.destDir,
        };
      }

      public async execute() {
        this.mergedConfig = this.config;
      }
    }

    const command = new DemoAddCommand();
    await command.parseAsync(['node', 'test', '--cwd', tmpDir, 'my-lib']);

    expect(command.mergedConfig).toEqual({
      cwd: tmpDir,
      target: 'default',
      projectName: 'my-lib',
      destDir: 'packages',
    });
  });

  test('log helpers should call the right console methods', () => {
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    log.info('a');
    log.success('b');
    log.warn('c');
    log.error('d');

    expect(infoSpy).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();

    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    log.debug('e');
    expect(debugSpy).toHaveBeenCalled();

    debugSpy.mockClear();
    delete process.env.NODE_ENV;
    log.debug('silent-without-node-env');
    expect(debugSpy).not.toHaveBeenCalled();

    debugSpy.mockClear();
    process.env.NODE_ENV = 'test';
    log.debug('silent-in-test');
    expect(debugSpy).not.toHaveBeenCalled();

    debugSpy.mockClear();
    process.env.NODE_ENV = 'production';
    log.debug('silent');
    expect(debugSpy).not.toHaveBeenCalled();

    process.env.NODE_ENV = prev;
    debugSpy.mockRestore();
    infoSpy.mockRestore();
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test('getNearestFilePath walks up until root and respects searchUp=false', () => {
    const root = createTempDir('dy-cli-nearest-root');
    const nested = path.join(root, 'a', 'b');
    fs.mkdirpSync(nested);
    const marker = path.join(root, 'marker.txt');
    fs.writeFileSync(marker, 'x');

    expect(getNearestFilePath(nested, ['marker.txt'], true)).toBe(marker);
    expect(getNearestFilePath(nested, ['missing-only.txt'], true)).toBeNull();

    const leafOnly = createTempDir('dy-cli-nearest-leaf');
    expect(getNearestFilePath(leafOnly, ['nope.txt'], false)).toBeNull();
  });

  test('getExternalConfigFilePath and getExternalConfigDir resolve nearest config', () => {
    const root = createTempDir('dy-cli-ext-cfg');
    const cfgPath = path.join(root, 'dy.config.json');
    fs.writeJSONSync(cfgPath, { commands: {} });

    expect(getExternalConfigFilePath(root)).toBe(cfgPath);
    expect(getExternalConfigDir(root, false)).toBe(root);
    expect(getExternalConfigDir(path.join(root, 'child'), true)).toBe(root);
  });

  test('loadNearestExternalRunCommandsConfig loads config from a parent directory', () => {
    const root = createTempDir('dy-cli-nearest-load');
    fs.writeFileSync(
      path.join(root, 'dy.config.js'),
      'module.exports = { commands: { publish: { access: "public" } } };',
    );
    const nested = path.join(root, 'packages', 'app');
    fs.mkdirpSync(nested);

    expect(loadNearestExternalRunCommandsConfig(nested)).toEqual({
      commands: { publish: { access: 'public' } },
    });
  });

  test('resolveTargetDir and resolveProjectName', () => {
    const cwd = '/tmp/proj';
    expect(resolveTargetDir(cwd, './out')).toBe(path.resolve(cwd, 'out'));
    expect(resolveProjectName('/a/b/my-pkg')).toBe('my-pkg');
  });

  test('runPackageScript throws when package.json or script is missing', async () => {
    const empty = createTempDir('dy-cli-run-empty');
    await expect(runPackageScript(empty, 'build')).rejects.toMatchObject({
      code: 'CONFIG_NOT_FOUND',
    });

    const noScript = createTempDir('dy-cli-run-noscript');
    await fs.writeJSON(path.join(noScript, 'package.json'), { scripts: {} });
    await expect(runPackageScript(noScript, 'build')).rejects.toMatchObject({
      code: 'SCRIPT_NOT_DEFINED',
    });
  });

  test('runPackageScript runs npm when script exists', async () => {
    const dir = createTempDir('dy-cli-run-ok');
    await fs.writeJSON(path.join(dir, 'package.json'), {
      scripts: { build: 'echo ok' },
    });

    const mockedExeca = execa as unknown as jest.Mock;
    mockedExeca.mockClear();
    mockedExeca.mockResolvedValueOnce(undefined);

    await runPackageScript(dir, 'build', { FOO: 'bar' });

    expect(mockedExeca).toHaveBeenCalledWith(
      'npm',
      ['run', 'build'],
      expect.objectContaining({
        cwd: dir,
        env: expect.objectContaining({ FOO: 'bar' }),
      }),
    );
  });

  test('detectPackageManager should walk up to the workspace root', () => {
    const root = createTempDir('dy-cli-pm-root');
    const child = path.join(root, 'packages', 'demo-app');

    fs.mkdirpSync(child);
    fs.writeJSONSync(path.join(root, 'package.json'), {
      packageManager: 'pnpm@10.8.0',
    });
    fs.writeJSONSync(path.join(child, 'package.json'), {
      name: '@dysonic/demo-app',
    });

    expect(detectPackageManager(child)).toBe('pnpm');
  });

  test('detectPackageManager should respect a nearer packageManager declaration', () => {
    const root = createTempDir('dy-cli-pm-override');
    const child = path.join(root, 'packages', 'demo-app');

    fs.mkdirpSync(child);
    fs.writeJSONSync(path.join(root, 'package.json'), {
      packageManager: 'pnpm@10.8.0',
    });
    fs.writeJSONSync(path.join(child, 'package.json'), {
      packageManager: 'npm@10.0.0',
    });

    expect(detectPackageManager(child)).toBe('npm');
  });

  test('resolveSelfCliInvocation re-invokes the running process with an absolute entry', () => {
    const invocation = resolveSelfCliInvocation();

    expect(invocation.command).toBe(process.execPath);
    expect(invocation.baseArgs[invocation.baseArgs.length - 1]).toBe(path.resolve(process.argv[1]));
  });

  test('resolveSelfCliInvocation drops diagnostic exec flags that collide across child processes', () => {
    const originalExecArgv = process.execArgv;
    process.execArgv = ['--require', '/loader.js', '--inspect-brk=9229', '--cpu-prof'];

    try {
      const invocation = resolveSelfCliInvocation();

      expect(invocation.baseArgs).toEqual([
        '--require',
        '/loader.js',
        path.resolve(process.argv[1]),
      ]);
    } finally {
      process.execArgv = originalExecArgv;
    }
  });

  test('runProjectCommand should re-invoke the running dy-cli for each target package', async () => {
    const root = createTempDir('dy-cli-project-command');
    const child = path.join(root, 'packages', 'demo-app');
    const mockedExeca = execa as unknown as jest.Mock;

    fs.mkdirpSync(child);
    mockedExeca.mockClear();
    mockedExeca.mockResolvedValueOnce(undefined);

    await runProjectCommand(
      {
        cwd: child,
        rootDir: root,
        type: 'monorepo',
        packageDir: 'packages',
        versionStrategy: 'fixed',
        packageDirs: [child],
        targetPackageDirs: [child],
        currentPackageDir: child,
        isRoot: false,
      },
      'build',
      ['--types'],
      { NODE_ENV: 'production' },
    );

    const { command, baseArgs } = resolveSelfCliInvocation();

    expect(mockedExeca).toHaveBeenCalledWith(
      command,
      [...baseArgs, 'build', '--cwd', child, '--types'],
      expect.objectContaining({
        cwd: child,
        env: expect.objectContaining({
          NODE_ENV: 'production',
        }),
      }),
    );
  });
});
