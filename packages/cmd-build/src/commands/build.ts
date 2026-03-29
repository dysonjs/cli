import {
  AbstractCommand,
  BuildCommandArgs,
  BuildCommandConfig,
  BuildTarget,
  CommandOption,
  DyCliError,
  ExternalRunCommandsConfig,
  getExternalConfigDir,
  loadNearestExternalRunCommandsConfig,
} from '@dysonic/dy-cli-core';

import { BuildPackageTask } from '../tasks/build-package-task';
import { BuildTypesTask } from '../tasks/build-types-task';
import { BuildUmdTask } from '../tasks/build-umd-task';

export class BuildCommand extends AbstractCommand<BuildCommandConfig, BuildCommandArgs> {
  constructor() {
    super('build');
    this.description('Build a dy-cli project');
  }

  public getOptions(): CommandOption[] {
    return [
      ['--mode <mode>', 'Specify the build mode'],
      ['--types', 'Build declaration files'],
      ['--umd', 'Build UMD bundle'],
      ['--name <name>', 'Specify the global name for UMD bundle'],
      ['--externals <externals>', 'Specify external package names for UMD bundle'],
      ['--globals <globals>', 'Specify global aliases for UMD externals'],
    ] satisfies CommandOption[];
  }

  protected loadExternalRunCommandsConfig(cwd: string): Partial<ExternalRunCommandsConfig> {
    return loadNearestExternalRunCommandsConfig(cwd);
  }

  public async execute(): Promise<void> {
    if (this.config.target === 'types') {
      await new BuildTypesTask(this.config).run();
      return;
    }

    if (this.config.target === 'umd') {
      await new BuildUmdTask(this.config).run();
      return;
    }

    await new BuildPackageTask(this.config).run();
  }

  protected mergeConfigWithArgs(
    cwd: string,
    args: BuildCommandArgs,
    config: Partial<ExternalRunCommandsConfig>,
  ): BuildCommandConfig {
    this.validateTargetArgs(args);

    if (!getExternalConfigDir(cwd, true)) {
      throw new DyCliError('CONFIG_NOT_FOUND', `No dy.config file found at '${cwd}'.`);
    }

    const buildConfig = config.commands?.build;

    return {
      cwd,
      target: this.resolveBuildTarget(args),
      mode: args.mode ?? buildConfig?.mode,
      name: args.name ?? buildConfig?.umd?.name,
      externals: this.parseExternals(args.externals ?? buildConfig?.umd?.externals),
      globals: this.parseGlobals(
        typeof args.globals !== 'undefined' ? args.globals : buildConfig?.umd?.globals,
      ),
    };
  }

  private validateTargetArgs(args: BuildCommandArgs) {
    const selectedTargets = [args.types ? 'types' : null, args.umd ? 'umd' : null].filter(Boolean);

    if (selectedTargets.length > 1) {
      throw new DyCliError('INVALID_ARGUMENT', 'Only one build target can be specified at a time.');
    }
  }

  private resolveBuildTarget(args: BuildCommandArgs): BuildTarget {
    if (args.types) {
      return 'types';
    }

    if (args.umd) {
      return 'umd';
    }

    return 'default';
  }

  private parseExternals(externals?: string[] | string) {
    if (Array.isArray(externals)) {
      return externals;
    }

    if (!externals) {
      return undefined;
    }

    return externals
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private parseGlobals(
    globals?: Record<string, string> | string,
  ): Record<string, string> | undefined {
    if (!globals) {
      return undefined;
    }

    if (typeof globals === 'object') {
      return globals;
    }

    return globals.split(',').reduce<Record<string, string>>((acc, current) => {
      const [name, alias] = current.split(':').map((item) => item.trim());

      if (name && alias) {
        acc[name] = alias;
      }

      return acc;
    }, {});
  }
}

export const build = new BuildCommand();
