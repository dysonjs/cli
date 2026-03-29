import * as jestRunner from 'jest';

import { AbstractTask, TestCommandConfig } from '@dysonic/dy-cli-core';

export class RunTestTask extends AbstractTask<TestCommandConfig> {
  public async run(): Promise<void> {
    process.env.NODE_ENV = 'test';

    const argv = ['--rootDir', this.config.cwd ?? process.cwd(), '--config', this.config.config];

    if (this.config.coverage) {
      argv.push('--coverage');
    }

    if (this.config.watch) {
      argv.push('--watch');
    }

    if (this.config.updateSnapshot) {
      argv.push('--updateSnapshot');
    }

    await jestRunner.run(argv);
  }

  protected getDefaultConfig(): TestCommandConfig {
    return {
      cwd: process.cwd(),
      config: '',
      coverage: false,
      watch: false,
      updateSnapshot: false,
    };
  }
}
