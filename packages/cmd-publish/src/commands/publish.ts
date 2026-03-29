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

export class PublishCommand extends AbstractCommand<PublishCommandConfig, PublishCommandArgs> {
  constructor() {
    super('publish');
    this.description('Publish a dy-cli project');
  }

  public getOptions(): CommandOption[] {
    return [
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
    const task = new PublishProjectTask(this.config);
    await task.run();
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

    return {
      cwd,
      dryRun: Boolean(args.dryRun ?? publishConfig?.dryRun ?? false),
      tag: args.tag ?? publishConfig?.tag,
      access,
      otp: args.otp ?? publishConfig?.otp,
      registry: args.registry ?? publishConfig?.registry,
    };
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
