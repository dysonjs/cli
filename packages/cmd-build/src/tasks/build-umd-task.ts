import { AbstractTask, BuildCommandConfig, runWorkspaceScript } from '@dysonic/dy-cli-core';

import { BuildUmdBuilder } from '../builders';

export class BuildUmdTask extends AbstractTask<BuildCommandConfig> {
  public async run(): Promise<void> {
    if (this.config.workspace) {
      await runWorkspaceScript(
        this.config.workspaceRoot ?? this.config.cwd ?? process.cwd(),
        'build:umd',
        [],
        this.config.workspaceConcurrency,
      );
      return;
    }

    const builder = new BuildUmdBuilder(this.config.cwd ?? process.cwd(), {
      externals: this.config.externals,
      globals: this.config.globals,
      name: this.config.name,
    });
    await builder.build();
  }

  protected getDefaultConfig(): BuildCommandConfig {
    return {
      cwd: process.cwd(),
      target: 'umd',
      mode: undefined,
      workspace: false,
      workspaceRoot: undefined,
      workspaceConcurrency: 8,
      name: undefined,
      externals: undefined,
      globals: undefined,
      bin: undefined,
    };
  }
}
