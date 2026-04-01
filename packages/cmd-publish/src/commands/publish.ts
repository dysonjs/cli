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
  resolveProjectContext,
} from '@dysonic/dy-cli-core';

import { PublishProjectTask } from '../tasks/publish-project-task';
import { PublishWorkspaceTask } from '../tasks/publish-workspace-task';

export class PublishCommand extends AbstractCommand<PublishCommandConfig, PublishCommandArgs> {
  constructor() {
    super('publish');
    this.description('Publish a dy-cli project');
  }

  public getOptions(): CommandOption[] {
    return [
      ['--workspace', 'Run workspace build/test/publish orchestration with Changesets'],
      ['--beta', 'Use the configured beta tag when publishing workspace releases'],
      ['--dry-run', 'Run publish without uploading the package'],
      ['--tag <tag>', 'Specify the dist-tag for the release'],
      ['--access <access>', 'Specify access level: public or restricted'],
      ['--otp <otp>', 'Specify the registry one-time password'],
      ['--registry <registry>', 'Specify the registry URL'],
    ] satisfies CommandOption[];
  }

  protected loadExternalRunCommandsConfig(cwd: string): Partial<ExternalRunCommandsConfig> {
    return loadNearestExternalRunCommandsConfig(cwd);
  }

  public async execute(): Promise<void> {
    if (this.shouldPublishWorkspace()) {
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
    const beta = Boolean(args.beta ?? false);
    const projectContext = resolveProjectContext(cwd, config);

    this.validateModeArgs({
      workspace,
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
      workspace,
      betaTag: publishConfig?.betaTag ?? 'beta',
      workspaceRoot: configDir,
      workspaceConcurrency: publishConfig?.workspaceConcurrency ?? 8,
      projectContext,
    };
  }

  private validateModeArgs(args: {
    workspace: boolean;
    dryRun: boolean;
    tag?: string;
    access?: PublishAccess;
    otp?: string;
    registry?: string;
  }): void {
    void args.workspace;
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

  private shouldPublishWorkspace() {
    return (
      this.config.workspace ||
      (this.config.projectContext.type === 'monorepo' && this.config.projectContext.isRoot)
    );
  }
}

export const publish = new PublishCommand();
