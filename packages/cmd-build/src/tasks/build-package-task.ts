import { AbstractTask, BuildCommandConfig, runWorkspaceScript } from '@dysonic/dy-cli-core';

import { BuildPackageBuilder } from '../builders';

export class BuildPackageTask extends AbstractTask<BuildCommandConfig> {
  public async run(): Promise<void> {
    if (this.config.workspace) {
      await runWorkspaceScript(
        this.config.workspaceRoot ?? this.config.cwd ?? process.cwd(),
        'build',
        [],
        this.config.workspaceConcurrency,
      );
      return;
    }

    const builder = new BuildPackageBuilder(this.config.cwd ?? process.cwd());
    await builder.build();
  }

  protected getDefaultConfig(): BuildCommandConfig {
    return {
      cwd: process.cwd(),
      target: 'default',
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
