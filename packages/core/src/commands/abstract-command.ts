import { Command } from 'commander';

import {
  BaseCommandArgs,
  BaseCommandConfig,
  CommandOption,
  ExternalRunCommandsConfig,
  ICommand,
} from '../interfaces';
import { loadExternalRunCommandsConfig, log } from '../helpers';

export abstract class AbstractCommand<C extends BaseCommandConfig, T extends BaseCommandArgs>
  extends Command
  implements ICommand
{
  /** 命令配置项 */
  protected config!: C;

  constructor(name: string) {
    super(name);
    this.init();
  }

  protected init() {
    const args = this.getArguments();
    for (const [syntax, description] of args) {
      this.argument(syntax, description);
    }

    this.option(
      '--cwd <cwd>',
      'Specify the current work directory, it is an absolute directory path',
    );

    const options = this.getOptions();
    for (const [flags, description, defaultValue] of options) {
      this.option(flags, description, defaultValue);
    }

    this.action(async () => {
      const mergedArgs = this.getMergedCommandArgs();
      const cwd = mergedArgs.cwd ?? process.cwd();
      const config = this.loadExternalRunCommandsConfig(cwd);

      this.config = this.mergeConfigWithArgs(cwd, mergedArgs, config);
      log.debug(this.config);
      await this.execute();
    });
  }

  /** 获取位置参数 */
  protected getArguments(): [string, string?][] {
    return [];
  }

  /** 获取命令参数 */
  public abstract getOptions(): CommandOption[];

  /** 执行命令 */
  public abstract execute(): Promise<void>;

  /** 加载外部配置 */
  protected loadExternalRunCommandsConfig(cwd: string): Partial<ExternalRunCommandsConfig> {
    return loadExternalRunCommandsConfig(cwd);
  }

  /**
   * 合并外部配置和命令参数
   * - 优先级：【命令行参数】>【外部配置文件】
   */
  protected abstract mergeConfigWithArgs(
    cwd: string,
    args: T,
    config: Partial<ExternalRunCommandsConfig>,
  ): C;

  private getMergedCommandArgs(): T {
    const options = this.opts() as Record<string, unknown>;
    const args = this.getArguments();
    const merged = {
      ...options,
    } as Record<string, unknown>;

    args.forEach(([syntax], index) => {
      const value = this.args[index];
      const key = this.getArgumentName(syntax);

      if (typeof value !== 'undefined') {
        merged[key] = value;
      }
    });

    return merged as T;
  }

  private getArgumentName(syntax: string) {
    return syntax.replace(/[<>\[\]\.\.\.]/g, '');
  }
}
