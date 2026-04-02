import {
  AbstractCommand,
  CommandOption,
  CreateCommandArgs,
  CreateCommandConfig,
  DEFAULT_CREATE_TEMPLATE_TYPE,
  DEFAULT_CREATE_TEMPLATES,
  DyCliError,
  ExternalRunCommandsConfig,
  resolveProjectName,
  resolveTargetDir,
} from '@dysonic/dy-cli-core';

import { CreateProjectTask } from '../tasks/create-project-task';

export class CreateCommand extends AbstractCommand<CreateCommandConfig, CreateCommandArgs> {
  constructor() {
    super('create');
    this.description('Create a dy-cli project');
  }

  public getOptions(): CommandOption[] {
    return [
      ['--project <project>, --type <type>', 'Specify the project type to create'],
      ['--dest-dir <destDir>', 'Specify the destination directory, which relative to cwd'],
      ['--project-name <projectName>', 'Specify the project name'],
      ['--force', 'Overwrite target directory if it already exists'],
    ] satisfies CommandOption[];
  }

  public async execute(): Promise<void> {
    const task = new CreateProjectTask(this.config);
    await task.run();
  }

  protected mergeConfigWithArgs(
    cwd: string,
    args: CreateCommandArgs,
    config: Partial<ExternalRunCommandsConfig>,
  ): CreateCommandConfig {
    const createConfig = config.commands?.create;
    const destDir = args.destDir ?? '.';
    const absoluteTargetDir = resolveTargetDir(cwd, destDir);
    const projectName = args.projectName ?? resolveProjectName(absoluteTargetDir);
    const templates = {
      ...DEFAULT_CREATE_TEMPLATES,
      ...createConfig?.templates,
    };
    const templateType =
      args.project ?? createConfig?.defaultTemplateType ?? DEFAULT_CREATE_TEMPLATE_TYPE;

    if (!Object.prototype.hasOwnProperty.call(templates, templateType)) {
      throw new DyCliError(
        'TEMPLATE_NOT_FOUND',
        `Template type '${templateType}' is not supported.`,
      );
    }

    return {
      cwd,
      force: Boolean(args.force),
      destDir,
      projectName,
      templateType,
      templates,
    };
  }
}

export const create = new CreateCommand();
