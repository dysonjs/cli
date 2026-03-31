import {
  AbstractCommand,
  AddCommandArgs,
  AddCommandConfig,
  CommandOption,
  ExternalRunCommandsConfig,
  resolveProjectContext,
} from '@dysonic/dy-cli-core';

import { AddPackageTask } from '../tasks/add-package-task';

const DEFAULT_ADD_DEST_DIR = 'packages';

export class AddCommand extends AbstractCommand<AddCommandConfig, AddCommandArgs> {
  constructor() {
    super('add');
    this.description('Add a child package to the current monorepo project');
  }

  protected getArguments(): [string, string?][] {
    return [['[packageName]', 'Specify the package name']];
  }

  public getOptions(): CommandOption[] {
    return [
      ['--package-name <packageName>', 'Specify the package name'],
      ['--dest-dir <destDir>', 'Specify the destination directory, which relative to cwd'],
      ['--description <description>', 'Specify the description of package'],
      ['--private', 'Create a private package'],
      ['--side-effects', 'Mark the package as having side effects'],
    ] satisfies CommandOption[];
  }

  public async execute(): Promise<void> {
    const task = new AddPackageTask(this.config);
    await task.run();
  }

  protected mergeConfigWithArgs(
    cwd: string,
    args: AddCommandArgs,
    config: Partial<ExternalRunCommandsConfig>,
  ): AddCommandConfig {
    const addConfig = config.commands?.add;
    const packageName = this.normalizePackageName(args.packageName ?? addConfig?.packageName);

    return {
      cwd,
      destDir: args.destDir ?? addConfig?.destDir ?? DEFAULT_ADD_DEST_DIR,
      packageName,
      description: args.description ?? addConfig?.description,
      private: args.private ?? addConfig?.private,
      sideEffects: args.sideEffects ?? addConfig?.sideEffects,
      projectContext: resolveProjectContext(cwd, config),
    };
  }

  private normalizePackageName(packageName?: string) {
    if (!packageName) {
      return undefined;
    }

    return packageName.split('/').pop() ?? packageName;
  }
}

export const add = new AddCommand();
