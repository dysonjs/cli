import path from 'path';

import {
  AbstractCommand,
  CommandOption,
  DyCliError,
  ExternalRunCommandsConfig,
  getExternalConfigDir,
  getNearestFilePath,
  loadNearestExternalRunCommandsConfig,
  TestCommandArgs,
  TestCommandConfig,
} from '@dysonic/dy-cli-core';

import { RunTestTask } from '../tasks/run-test-task';

const JEST_CONFIG_FILE_NAMES = ['jest.config.ts', 'jest.config.js', 'jest.config.cjs'];

export class TestCommand extends AbstractCommand<TestCommandConfig, TestCommandArgs> {
  constructor() {
    super('test');
    this.description('Run tests for a dy-cli project');
  }

  public getOptions(): CommandOption[] {
    return [
      ['--config <config>', 'Specify the Jest config path'],
      ['--coverage', 'Collect coverage'],
      ['--watch', 'Run tests in watch mode'],
      ['--update-snapshot', 'Update Jest snapshots'],
    ] satisfies CommandOption[];
  }

  protected loadExternalRunCommandsConfig(cwd: string): Partial<ExternalRunCommandsConfig> {
    return loadNearestExternalRunCommandsConfig(cwd);
  }

  public async execute(): Promise<void> {
    await new RunTestTask(this.config).run();
  }

  protected mergeConfigWithArgs(
    cwd: string,
    args: TestCommandArgs,
    config: Partial<ExternalRunCommandsConfig>,
  ): TestCommandConfig {
    const configDir = getExternalConfigDir(cwd, true);
    if (!configDir) {
      throw new DyCliError('CONFIG_NOT_FOUND', `No dy.config file found at '${cwd}'.`);
    }

    const testConfig = config.commands?.test;
    const resolvedConfig = args.config
      ? path.resolve(cwd, args.config)
      : testConfig?.config
      ? path.resolve(configDir, testConfig.config)
      : getNearestFilePath(cwd, JEST_CONFIG_FILE_NAMES, true);

    if (!resolvedConfig) {
      throw new DyCliError('CONFIG_NOT_FOUND', `No Jest config file found at '${cwd}'.`);
    }

    return {
      cwd,
      config: resolvedConfig,
      coverage: Boolean(args.coverage ?? testConfig?.coverage ?? false),
      watch: Boolean(args.watch ?? testConfig?.watch ?? false),
      updateSnapshot: Boolean(args.updateSnapshot ?? testConfig?.updateSnapshot ?? false),
    };
  }
}

export const test = new TestCommand();
