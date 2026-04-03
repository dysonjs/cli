import {
  AbstractCommand,
  CommandOption,
  ExternalRunCommandsConfig,
  InstallCommandArgs,
  InstallCommandConfig,
  loadNearestExternalRunCommandsConfig,
  resolveProjectContext,
} from '@dysonic/dy-cli-core';

import { InstallProjectTask } from '../tasks/install-project-task';

export class InstallCommand extends AbstractCommand<InstallCommandConfig, InstallCommandArgs> {
  constructor() {
    super('install');
    this.description('Install project dependencies through dy-cli');
  }

  public getOptions(): CommandOption[] {
    return [];
  }

  protected loadExternalRunCommandsConfig(cwd: string): Partial<ExternalRunCommandsConfig> {
    return loadNearestExternalRunCommandsConfig(cwd);
  }

  public async execute(): Promise<void> {
    await new InstallProjectTask(this.config).run();
  }

  protected mergeConfigWithArgs(
    cwd: string,
    _args: InstallCommandArgs,
    config: Partial<ExternalRunCommandsConfig>,
  ): InstallCommandConfig {
    return {
      cwd,
      npmClient: config.commands?.install?.npmClient,
      projectContext: resolveProjectContext(cwd, config),
    };
  }
}

export const install = new InstallCommand();
