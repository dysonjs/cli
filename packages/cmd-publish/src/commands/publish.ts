import {
  AbstractCommand,
  CommandOption,
  DyCliError,
  ExternalRunCommandsConfig,
  PublishAccess,
  PublishCommandArgs,
  PublishCommandConfig,
  getExternalConfigDir,
  loadNearestExternalRunCommandsConfig,
} from '@dysonic/dy-cli-core';

import { PublishProjectTask } from '../tasks/publish-project-task';
import { PublishWorkspaceTask } from '../tasks/publish-workspace-task';
import { VersionWorkspaceTask } from '../tasks/version-workspace-task';

export class PublishCommand extends AbstractCommand<PublishCommandConfig, PublishCommandArgs> {
  constructor() {
    super('publish');
    this.description('Publish a dy-cli project');
  }

  public getOptions(): CommandOption[] {
    return [
      ['--workspace', 'Run workspace build/test/publish orchestration with Changesets'],
      ['--version', 'Run workspace Changesets versioning'],
      ['--beta', 'Use the configured beta tag when publishing or versioning'],
      ['--beta-exit', 'Exit beta pre mode when running workspace versioning'],
      ['--dry-run', 'Run publish without uploading the package'],
      ['--tag <tag>', 'Specify the dist-tag for npm publish'],
      ['--access <access>', 'Specify npm access level: public or restricted'],
      ['--otp <otp>', 'Specify the npm one-time password'],
      ['--registry <registry>', 'Specify the npm registry URL'],
    ] satisfies CommandOption[];
  }

  protected loadExternalRunCommandsConfig(cwd: string): Partial<ExternalRunCommandsConfig> {
    return loadNearestExternalRunCommandsConfig(cwd);
  }

  public async execute(): Promise<void> {
    if (this.config.version) {
      await new VersionWorkspaceTask(this.config).run();
      return;
    }

    if (this.config.workspace) {
      await new PublishWorkspaceTask(this.config).run();
      return;
    }

    await new PublishProjectTask(this.config).run();
  }

  protected mergeConfigWithArgs(
    cwd: string,
    args: PublishCommandArgs,
    config: Partial<ExternalRunCommandsConfig>,
  ): PublishCommandConfig {
    const configDir = getExternalConfigDir(cwd, true);
    if (!configDir) {
      throw new DyCliError('CONFIG_NOT_FOUND', `No dy.config file found at '${cwd}'.`);
    }

    const publishConfig = config.commands?.publish;
    const access = this.resolveAccess(args.access ?? publishConfig?.access);
    const workspace = Boolean(args.workspace ?? false);
    const version = Boolean(args.version ?? false);
    const beta = Boolean(args.beta ?? false);
    const betaExit = Boolean(args.betaExit ?? false);

    this.validateModeArgs({
      workspace,
      version,
      betaExit,
      dryRun: Boolean(args.dryRun ?? publishConfig?.dryRun ?? false),
      tag: args.tag ?? publishConfig?.tag,
      access,
      otp: args.otp ?? publishConfig?.otp,
      registry: args.registry ?? publishConfig?.registry,
    });

    return {
      cwd,
      dryRun: Boolean(args.dryRun ?? publishConfig?.dryRun ?? false),
      tag: args.tag ?? publishConfig?.tag,
      access,
      otp: args.otp ?? publishConfig?.otp,
      registry: args.registry ?? publishConfig?.registry,
      beta,
      betaExit,
      workspace,
      version,
      betaTag: publishConfig?.betaTag ?? 'beta',
      workspaceRoot: configDir,
      workspaceConcurrency: publishConfig?.workspaceConcurrency ?? 8,
    };
  }

  private validateModeArgs(args: {
    workspace: boolean;
    version: boolean;
    betaExit: boolean;
    dryRun: boolean;
    tag?: string;
    access?: PublishAccess;
    otp?: string;
    registry?: string;
  }): void {
    if (args.workspace && args.version) {
      throw new DyCliError(
        'INVALID_ARGUMENT',
        'Only one publish orchestration mode can be specified at a time.',
      );
    }

    if (args.betaExit && !args.version) {
      throw new DyCliError(
        'INVALID_ARGUMENT',
        '--beta-exit can only be used together with --version.',
      );
    }

    if (args.version && (args.dryRun || args.tag || args.access || args.otp || args.registry)) {
      throw new DyCliError(
        'INVALID_ARGUMENT',
        'Package publish options cannot be used together with --version.',
      );
    }
  }

  private resolveAccess(access?: string): PublishAccess | undefined {
    if (!access) {
      return undefined;
    }

    if (access === 'public' || access === 'restricted') {
      return access;
    }

    throw new DyCliError(
      'INVALID_ARGUMENT',
      `Invalid publish access '${access}'. Expected 'public' or 'restricted'.`,
    );
  }
}

export const publish = new PublishCommand();
