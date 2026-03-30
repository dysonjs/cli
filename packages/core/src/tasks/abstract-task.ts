import { ITask } from '../interfaces';

export abstract class AbstractTask<C, R = any> implements ITask<R> {
  /** 任务配置项 */
  protected config: C;

  constructor(config: Partial<C>) {
    this.config = this.mergeConfig(config);
  }

  public abstract run(): Promise<R>;

  protected mergeConfig(config: Partial<C>): C {
    const defaultConfig = this.getDefaultConfig();
    return {
      ...defaultConfig,
      ...config,
    };
  }

  protected abstract getDefaultConfig(): C;
}
