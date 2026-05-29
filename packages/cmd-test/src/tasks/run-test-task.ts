import * as jestRunner from 'jest';

import {
  AbstractTask,
  TestCommandConfig,
  createDefaultProjectContext,
  runProjectCommand,
} from '@dysonic/dy-cli-core';

export class RunTestTask extends AbstractTask<TestCommandConfig> {
  public async run(): Promise<void> {
    process.env.NODE_ENV = 'test';
    process.env.TS_JEST_DISABLE_VER_CHECKER = 'true';

    if (this.config.workspace || this.shouldRunWorkspaceByDefault()) {
      const args: string[] = [];
      if (this.config.coverage) {
        args.push('--coverage');
      }

      if (this.config.watch) {
        args.push('--watch');
      }

      if (this.config.updateSnapshot) {
        args.push('--update-snapshot');
      }

      await runProjectCommand(this.config.projectContext, 'test', args, {
        NODE_ENV: 'test',
        TS_JEST_DISABLE_VER_CHECKER: 'true',
      });
      return;
    }

    const argv = ['--rootDir', this.resolveExecutionDir(), '--config', this.config.config];

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
      projectContext: createDefaultProjectContext(),
    };
  }

  private shouldRunWorkspaceByDefault() {
    return this.config.projectContext.type === 'monorepo' && this.config.projectContext.isRoot;
  }

  private resolveExecutionDir() {
    if (this.config.projectContext.type === 'single') {
      return this.config.projectContext.rootDir;
    }

    return this.config.projectContext.currentPackageDir ?? this.config.cwd ?? process.cwd();
  }
}
