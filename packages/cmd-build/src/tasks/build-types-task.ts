import { AbstractTask, BuildCommandConfig, runProjectCommand } from '@dysonic/dy-cli-core';

import { BuildTypesBuilder } from '../builders';

export class BuildTypesTask extends AbstractTask<BuildCommandConfig> {
  public async run(): Promise<void> {
    if (this.config.workspace || this.shouldRunWorkspaceByDefault()) {
      await runProjectCommand(this.config.projectContext, 'build', ['--types']);
      return;
    }

    const builder = new BuildTypesBuilder(this.resolveExecutionDir());
    await builder.build();
  }

  protected getDefaultConfig(): BuildCommandConfig {
    return {
      cwd: process.cwd(),
      target: 'types',
      mode: undefined,
      workspace: false,
      workspaceRoot: undefined,
      workspaceConcurrency: 8,
      name: undefined,
      externals: undefined,
      globals: undefined,
      bin: undefined,
      projectContext: {
        cwd: process.cwd(),
        rootDir: process.cwd(),
        type: 'single',
        packageDir: 'packages',
        versionStrategy: undefined,
        packageDirs: [],
        targetPackageDirs: [process.cwd()],
        currentPackageDir: process.cwd(),
        isRoot: true,
      },
    };
  }

  private shouldRunWorkspaceByDefault() {
    return this.config.projectContext.type === 'monorepo' && this.config.projectContext.isRoot;
  }

  private resolveExecutionDir() {
    if (this.config.projectContext.type === 'single') {
      return this.config.projectContext.rootDir;
    }

    return this.config.projectContext.currentPackageDir ?? (this.config.cwd ?? process.cwd());
  }
}
