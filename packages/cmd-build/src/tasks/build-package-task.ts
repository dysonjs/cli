import fs from 'fs-extra';
import path from 'path';

import { AbstractTask, BuildCommandConfig, runProjectCommand } from '@dysonic/dy-cli-core';

import { BuildBinBuilder } from '../builders';
import { BuildPackageBuilder } from '../builders';

export class BuildPackageTask extends AbstractTask<BuildCommandConfig> {
  public async run(): Promise<void> {
    if (this.config.workspace || this.shouldRunWorkspaceByDefault()) {
      await runProjectCommand(this.config.projectContext, 'build');
      return;
    }

    const executionDir = this.resolveExecutionDir();
    const builder = new BuildPackageBuilder(executionDir);
    await builder.build();

    if (await this.shouldBuildBinOutputByDefault(executionDir)) {
      await new BuildBinBuilder(executionDir).build();
    }
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

  private async shouldBuildBinOutputByDefault(executionDir: string) {
    const packageJSONPath = path.join(executionDir, 'package.json');

    if (!(await fs.pathExists(packageJSONPath))) {
      return false;
    }

    const packageJSON = (await fs.readJSON(packageJSONPath)) as {
      bin?: string | Record<string, string>;
    };

    if (typeof packageJSON.bin === 'string') {
      return packageJSON.bin.trim().length > 0;
    }

    return Boolean(packageJSON.bin && Object.keys(packageJSON.bin).length > 0);
  }
}
