import {
  AbstractCommand,
  CommandOption,
  DyCliError,
  ExternalRunCommandsConfig,
  loadNearestExternalRunCommandsConfig,
  resolveProjectContext,
  VersionCommandArgs,
  VersionCommandConfig,
} from '@dysonic/dy-cli-core';

import { VersionProjectTask } from '../tasks/version-project-task';

export class VersionCommand extends AbstractCommand<VersionCommandConfig, VersionCommandArgs> {
  constructor() {
    super('version');
    this.description('Manage package versions through dy-cli');
  }

  public getOptions(): CommandOption[] {
    return [
      ['--set <version>', 'Set the next version for a single-package project'],
      ['--beta', 'Enter beta pre mode before versioning a fixed monorepo'],
      ['--beta-exit', 'Exit beta pre mode before versioning a fixed monorepo'],
    ] satisfies CommandOption[];
  }

  protected loadExternalRunCommandsConfig(cwd: string): Partial<ExternalRunCommandsConfig> {
    return loadNearestExternalRunCommandsConfig(cwd);
  }

  public async execute(): Promise<void> {
    await new VersionProjectTask(this.config).run();
  }

  protected mergeConfigWithArgs(
    cwd: string,
    args: VersionCommandArgs,
    config: Partial<ExternalRunCommandsConfig>,
  ): VersionCommandConfig {
    const projectContext = resolveProjectContext(cwd, config);

    if (args.betaExit && projectContext.type === 'single') {
      throw new DyCliError(
        'INVALID_ARGUMENT',
        '--beta-exit is only supported for monorepo versioning.',
      );
    }

    return {
      cwd,
      beta: Boolean(args.beta ?? false),
      betaExit: Boolean(args.betaExit ?? false),
      betaTag: config.commands?.version?.betaTag ?? config.commands?.publish?.betaTag ?? 'beta',
      set: args.set,
      projectContext,
    };
  }
}

export const version = new VersionCommand();
