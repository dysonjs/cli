import { AbstractTask, BuildCommandConfig, runWorkspaceScript } from '@dysonic/dy-cli-core';

import { BuildBinBuilder } from '../builders';

export class BuildBinTask extends AbstractTask<BuildCommandConfig> {
  public async run(): Promise<void> {
    if (this.config.workspace) {
      await runWorkspaceScript(
        this.config.workspaceRoot ?? this.config.cwd ?? process.cwd(),
        'build:bin',
        [],
        this.config.workspaceConcurrency,
      );
      return;
    }

    const builder = new BuildBinBuilder(this.config.cwd ?? process.cwd(), this.config.bin);
    await builder.build();
  }

  protected getDefaultConfig(): BuildCommandConfig {
    return {
      cwd: process.cwd(),
      target: 'bin',
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
