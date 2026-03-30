/** 公共命令参数 */
export interface BaseCommandArgs {
  /** 当前工作目录，默认为：process.cwd() */
  cwd?: string;
}

/** 公共命令配置项 */
export interface BaseCommandConfig extends BaseCommandArgs {}
