import * as jestRunner from 'jest';

import { AbstractTask, TestCommandConfig, runWorkspaceScript } from '@dysonic/dy-cli-core';

export class RunTestTask extends AbstractTask<TestCommandConfig> {
  public async run(): Promise<void> {
    process.env.NODE_ENV = 'test';

    if (this.config.workspace) {
      const args: string[] = [];
      let scriptName = 'test';

      if (this.config.coverage && !this.config.watch && !this.config.updateSnapshot) {
        scriptName = 'test:coverage';
      } else {
        if (this.config.coverage) {
          args.push('--coverage');
        }

        if (this.config.watch) {
          args.push('--watch');
        }

        if (this.config.updateSnapshot) {
          args.push('--update-snapshot');
        }
      }

      await runWorkspaceScript(
        this.config.workspaceRoot ?? this.config.cwd ?? process.cwd(),
        scriptName,
        args,
        this.config.workspaceConcurrency,
        {
          NODE_ENV: 'test',
        },
      );
      return;
    }

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
      workspace: false,
      workspaceRoot: undefined,
      workspaceConcurrency: 8,
    };
  }
}
