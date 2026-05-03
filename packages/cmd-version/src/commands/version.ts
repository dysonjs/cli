import {
  AbstractCommand,
  CommandOption,
  DyCliError,
  ExternalRunCommandsConfig,
  loadNearestExternalRunCommandsConfig,
  resolveProjectContext,
  VersionCommandArgs,
  VersionCommandConfig,
  VersionReleaseType,
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
      ['--patch', 'Bump the fixed monorepo release by one patch version'],
      ['--minor', 'Bump the fixed monorepo release by one minor version'],
      ['--major', 'Bump the fixed monorepo release by one major version'],
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
    const releaseType = this.resolveReleaseType(args);

    if (args.betaExit && projectContext.type === 'single') {
      throw new DyCliError(
        'INVALID_ARGUMENT',
        '--beta-exit is only supported for monorepo versioning.',
      );
    }

    if (projectContext.type === 'single' && releaseType) {
      throw new DyCliError(
        'INVALID_ARGUMENT',
        '--patch, --minor, and --major are only supported for fixed monorepo versioning.',
      );
    }

    if (projectContext.type === 'monorepo' && !args.betaExit && !releaseType) {
      throw new DyCliError(
        'INVALID_ARGUMENT',
        'Specify one of --patch, --minor, or --major for fixed monorepo versioning.',
      );
    }

    return {
      cwd,
      beta: Boolean(args.beta ?? false),
      betaExit: Boolean(args.betaExit ?? false),
      betaTag: config.commands?.version?.betaTag ?? config.commands?.publish?.betaTag ?? 'beta',
      releaseType,
      set: args.set,
      projectContext,
    };
  }

  private resolveReleaseType(args: VersionCommandArgs): VersionReleaseType | undefined {
    const releaseTypes = (
      [
        ['patch', args.patch],
        ['minor', args.minor],
        ['major', args.major],
      ] as const
    )
      .filter(([, enabled]) => Boolean(enabled))
      .map(([type]) => type);

    if (releaseTypes.length > 1) {
      throw new DyCliError(
        'INVALID_ARGUMENT',
        'Only one of --patch, --minor, or --major can be used at a time.',
      );
    }

    return releaseTypes[0];
  }
}

export const version = new VersionCommand();
